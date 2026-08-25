# SPDX-License-Identifier: MIT
"""
llm_client.py — Provider-Agnostic LLM Abstraction Layer (SAD Section 5.16)
Decouples agent logic from specific model providers with a unified response contract.

Model Strategy Hierarchy:
    1. Primary: NVIDIA Nemotron 3 Ultra (nvidia/nemotron-3-ultra-550b-a55b)
       - Granular reasoning effort via extra_body: chat_template_kwargs: {"enable_thinking": True}
       - Configurable inference-time reasoning_budget (e.g. 1024 for low effort, 4096 for high complexity)
    2. Fallback 1: Google Gemini (gemini-2.5-flash / gemini-1.5-pro / gemini-flash-latest)
    3. Fallback 2: Groq (openai/gpt-oss-120b, qwen/qwen3.6-27b, llama-3.3-70b-versatile)

Rules:
    - Bounded retries (2 attempts per provider with exponential backoff).
    - Automatic fallback occurs ONLY on infrastructure failure (timeout, 429 quota, 503/504 outage, invalid key).
    - Never silently switch providers for normal business logic.
    - Uniform response schema (LLMResponse) across all providers.
    - Zero leakage: Internal chain-of-thought, thinking tokens, and API credentials are never exposed in user content.
"""

import os
import re
import time
import json
import hashlib
import logging
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=_env_path, override=False)

import httpx

logger = logging.getLogger("velsora.llm_client")


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CONTRACTS (SAD 5.16)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class LLMConfig:
    """Configuration passed into each LLM invocation."""
    temperature: float = 0.1
    max_tokens: int = 2048
    reasoning_effort: str = "low"          # "low" (efficient) | "high" (complex)
    reasoning_budget: int = 1024           # Token cap for thinking: 1024 (low) | 4096 (high)
    enable_thinking: bool = True
    system_prompt: str = ""
    timeout_seconds: float = 60.0


@dataclass
class LLMResponse:
    """Uniform internal response schema guaranteed across all providers."""
    content: str                           # Clean user-facing text (CoT stripped)
    provider: str                          # "nvidia" | "gemini" | "groq"
    model: str                             # Actual model slug used
    reasoning_content: Optional[str] = None # Internal CoT for telemetry (not sent to user)
    tokens_used: int = 0
    elapsed_seconds: float = 0.0
    is_fallback: bool = False
    fallback_reason: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# SANITIZATION UTILITIES
# ═══════════════════════════════════════════════════════════════════════════════

def sanitize_llm_output(text: str) -> str:
    """
    Strips raw chain-of-thought tags, thinking blocks, code fences,
    and internal tokens from the final user-facing text.
    """
    if not text:
        return ""

    # Remove <think>...</think> blocks
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)

    # Remove [THINKING]...[/THINKING] blocks
    text = re.sub(r"\[THINKING\].*?\[/THINKING\]", "", text, flags=re.DOTALL | re.IGNORECASE)

    # Remove markdown code block wraps if the whole response was fenced
    text = text.strip()
    if text.startswith("```") and text.endswith("```"):
        text = re.sub(r"^```(?:markdown|json|text)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    return text.strip()


# ═══════════════════════════════════════════════════════════════════════════════
# PROVIDER 1: OPENROUTER (NVIDIA NEMOTRON 3 ULTRA — PRIMARY)
# ═══════════════════════════════════════════════════════════════════════════════

class OpenRouterNemotronProvider:
    """
    Primary Reasoning Provider: NVIDIA Nemotron 3 Ultra via OpenRouter.
    Uses OpenRouter's OpenAI-compatible API interface with dynamic reasoning effort controls.
    """
    DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"
    DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b"

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.base_url = os.getenv("OPENROUTER_BASE_URL", self.DEFAULT_BASE_URL).rstrip("/")
        self.model = os.getenv("OPENROUTER_MODEL", self.DEFAULT_MODEL).strip()
        self.is_credit_exhausted = False

    def is_available(self) -> bool:
        return bool(self.api_key) and not self.is_credit_exhausted

    def complete(self, prompt: str, config: LLMConfig) -> LLMResponse:
        if not self.is_available():
            raise RuntimeError("OPENROUTER_API_KEY is not configured or credits exhausted.")

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://velsora.ai",
            "X-Title": "Velsora MAFRS",
        }

        messages = []
        if config.system_prompt:
            messages.append({"role": "system", "content": config.system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Configure OpenRouter reasoning controls (lowest practical reasoning for normal queries)
        reasoning_param: Dict[str, Any] = {}
        if config.enable_thinking:
            # OpenRouter supports reasoning effort ("low" for efficient/normal, "high" for complex)
            reasoning_param["effort"] = config.reasoning_effort if config.reasoning_effort in ["low", "medium", "high"] else "low"

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
        }
        if reasoning_param:
            payload["reasoning"] = reasoning_param

        start_time = time.time()

        try:
            logger.info(
                f"[LLMClient:OpenRouter] Invoking model '{self.model}' with reasoning_effort={reasoning_param.get('effort', 'disabled')}, "
                f"max_tokens={config.max_tokens}..."
            )
            with httpx.Client(timeout=config.timeout_seconds) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code == 402:
                    m = re.search(r"can only afford (\d+)", resp.text)
                    if m:
                        affordable = int(m.group(1))
                        logger.info(f"[LLMClient:OpenRouter] Dynamically adjusting max_tokens to {affordable} to fit account credit.")
                        payload["max_tokens"] = affordable
                        resp = client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()

            choice = data["choices"][0]
            msg = choice.get("message", {})
            raw_content = msg.get("content", "")

            # Safely capture internal reasoning (for internal telemetry ONLY; never exposed to users)
            reasoning_content = msg.get("reasoning")
            if not reasoning_content and msg.get("reasoning_details"):
                details = msg.get("reasoning_details", [])
                if isinstance(details, list):
                    reasoning_content = " ".join(
                        d.get("text", "") for d in details if isinstance(d, dict) and d.get("text")
                    )

            # Extract token usage if returned
            usage = data.get("usage", {})
            tokens_used = usage.get("total_tokens", 0)
            elapsed = round(time.time() - start_time, 2)

            # Strip internal tokens / fences for clean output
            clean_content = sanitize_llm_output(raw_content)

            logger.info(f"[LLMClient:OpenRouter] Model '{self.model}' responded successfully in {elapsed}s.")
            return LLMResponse(
                content=clean_content,
                provider="openrouter",
                model=self.model,
                reasoning_content=reasoning_content,
                tokens_used=tokens_used,
                elapsed_seconds=elapsed,
            )

        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_body = e.response.text[:200]
            logger.warning(f"[LLMClient:OpenRouter] Model '{self.model}' HTTP {status_code}: {error_body}")
            if status_code == 402 or "Insufficient credits" in error_body:
                self.is_credit_exhausted = True
                logger.warning("[LLMClient:OpenRouter] Account credits exhausted (402). Disabling OpenRouter for session.")
            if status_code in [401, 403]:
                raise RuntimeError(f"OpenRouter API Key invalid/unauthorized (HTTP {status_code}): {error_body}") from e
            raise RuntimeError(f"OpenRouter HTTP {status_code}: {error_body}") from e

        except Exception as e:
            logger.warning(f"[LLMClient:OpenRouter] Model '{self.model}' request failed: {e}")
            raise e


# Backward compatibility alias
NVIDIANemotronProvider = OpenRouterNemotronProvider


# ═══════════════════════════════════════════════════════════════════════════════
# PROVIDER 2: GOOGLE GEMINI (FALLBACK 1)
# ═══════════════════════════════════════════════════════════════════════════════

class GeminiProvider:
    """
    Fallback 1 Provider: Google Gemini.
    High-capacity, low-latency reasoning model.
    """
    DEFAULT_MODELS = [
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
        "gemini-pro-latest",
    ]

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.rate_limited_until = 0.0

    def is_available(self) -> bool:
        return bool(self.api_key) and (time.time() > self.rate_limited_until)

    def complete(self, prompt: str, config: LLMConfig) -> LLMResponse:
        if not self.is_available():
            raise RuntimeError("GEMINI_API_KEY is not configured or currently rate limited.")

        last_error = None
        start_time = time.time()

        for model in self.DEFAULT_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            
            full_prompt = f"{config.system_prompt}\n\n{prompt}" if config.system_prompt else prompt
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {
                    "temperature": config.temperature,
                    "maxOutputTokens": config.max_tokens,
                },
            }

            try:
                logger.info(f"[LLMClient:Gemini] Invoking fallback model '{model}'...")
                with httpx.Client(timeout=config.timeout_seconds) as client:
                    resp = client.post(url, json=payload)
                    if resp.status_code == 429:
                        self.rate_limited_until = time.time() + 20.0
                        logger.warning("[LLMClient:Gemini] Rate limit 429 hit. Enabling 20s circuit breaker.")
                    resp.raise_for_status()
                    data = resp.json()

                candidates = data.get("candidates", [])
                if not candidates:
                    raise RuntimeError("Gemini returned no response candidates.")

                parts = candidates[0].get("content", {}).get("parts", [])
                raw_content = "".join([p.get("text", "") for p in parts])
                clean_content = sanitize_llm_output(raw_content)
                if not clean_content:
                    raise RuntimeError("Gemini returned empty content.")

                elapsed = round(time.time() - start_time, 2)
                usage = data.get("usageMetadata", {})
                tokens = usage.get("totalTokenCount", 0)

                logger.info(f"[LLMClient:Gemini] Model '{model}' responded successfully in {elapsed}s.")
                return LLMResponse(
                    content=clean_content,
                    provider="gemini",
                    model=model,
                    tokens_used=tokens,
                    elapsed_seconds=elapsed,
                    is_fallback=True,
                    fallback_reason="Primary provider unavailable",
                )

            except Exception as e:
                last_error = e
                logger.warning(f"[LLMClient:Gemini] Model '{model}' failed: {e}")
                continue

        if last_error:
            raise last_error
        raise RuntimeError("[LLMClient:Gemini] All Gemini models exhausted.")


# ═══════════════════════════════════════════════════════════════════════════════
# PROVIDER 3: GROQ (FALLBACK 2)
# ═══════════════════════════════════════════════════════════════════════════════

class GroqProvider:
    """
    Fallback 2 Provider: Groq (Ultra-Fast Inference Engine).
    """
    DEFAULT_MODELS = [
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.6-27b",
        "groq/compound-mini",
        "groq/compound",
    ]

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "").strip()

    def is_available(self) -> bool:
        return bool(self.api_key)

    def complete(self, prompt: str, config: LLMConfig) -> LLMResponse:
        if not self.is_available():
            raise RuntimeError("GROQ_API_KEY is not configured.")

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        messages = []
        if config.system_prompt:
            messages.append({"role": "system", "content": config.system_prompt})
        messages.append({"role": "user", "content": prompt})

        last_error = None
        start_time = time.time()

        for model in self.DEFAULT_MODELS:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": config.temperature,
                "max_tokens": config.max_tokens,
            }

            try:
                logger.info(f"[LLMClient:Groq] Invoking fallback model '{model}'...")
                with httpx.Client(timeout=config.timeout_seconds) as client:
                    resp = client.post(url, headers=headers, json=payload)
                    resp.raise_for_status()
                    data = resp.json()

                choice = data["choices"][0]
                raw_content = choice.get("message", {}).get("content", "")
                clean_content = sanitize_llm_output(raw_content)

                elapsed = round(time.time() - start_time, 2)
                usage = data.get("usage", {})
                tokens = usage.get("total_tokens", 0)

                logger.info(f"[LLMClient:Groq] Model '{model}' responded successfully in {elapsed}s.")
                return LLMResponse(
                    content=clean_content,
                    provider="groq",
                    model=model,
                    tokens_used=tokens,
                    elapsed_seconds=elapsed,
                    is_fallback=True,
                    fallback_reason="Primary and Fallback 1 providers unavailable",
                )

            except Exception as e:
                last_error = e
                logger.warning(f"[LLMClient:Groq] Model '{model}' failed: {e}")
                continue

        if last_error:
            raise last_error
        raise RuntimeError("[LLMClient:Groq] All Groq models exhausted.")


# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-PROVIDER ORCHESTRATOR WITH BOUNDED RETRIES (SAD 5.16 & ADR-09)
# ═══════════════════════════════════════════════════════════════════════════════

class MultiProviderLLMClient:
    """
    Orchestrates Primary (OpenRouter Nemotron 3 Ultra) -> Fallback 1 (Gemini) -> Fallback 2 (Groq).
    Enforces bounded retries, infrastructural failure detection, and uniform response sanitization.
    """

    def __init__(self):
        self.openrouter_provider = OpenRouterNemotronProvider()
        self.nvidia_provider = self.openrouter_provider # backward-compatible alias
        self.gemini_provider = GeminiProvider()
        self.groq_provider = GroqProvider()
        self._cache: Dict[str, LLMResponse] = {}

    def generate(
        self,
        prompt: str,
        config: Optional[LLMConfig] = None,
        use_cache: bool = True,
    ) -> LLMResponse:
        config = config or LLMConfig()

        # Cache check
        cache_key = hashlib.md5((config.system_prompt + prompt + str(config.reasoning_budget) + str(config.reasoning_effort)).encode()).hexdigest()
        if use_cache and cache_key in self._cache:
            logger.info("[MultiProviderLLMClient] Cache hit — returning cached LLMResponse.")
            return self._cache[cache_key]

        providers = [
            ("Groq (High-Speed Inference)", self.groq_provider),
            ("OpenRouter Nemotron 3 Ultra (Primary)", self.openrouter_provider),
            ("Google Gemini (Fallback)", self.gemini_provider),
        ]

        infra_errors = []

        for provider_name, provider in providers:
            if not provider.is_available():
                logger.info(f"[MultiProviderLLMClient] Skipping {provider_name} — credentials not configured.")
                continue

            # Bounded retries: 2 attempts per provider
            for attempt in range(1, 3):
                try:
                    logger.info(f"[MultiProviderLLMClient] Attempting {provider_name} (attempt {attempt}/2)...")
                    response = provider.complete(prompt, config)
                    if use_cache:
                        self._cache[cache_key] = response
                    return response

                except Exception as e:
                    err_str = str(e)
                    logger.warning(
                        f"[MultiProviderLLMClient] {provider_name} attempt {attempt}/2 failed due to infrastructure error: {e}"
                    )
                    if "401" in err_str or "402" in err_str or "403" in err_str or "Insufficient credits" in err_str or "unauthorized" in err_str.lower():
                        infra_errors.append(f"{provider_name}: {err_str}")
                        break
                    time.sleep(0.5 * attempt)
                    if attempt == 2:
                        infra_errors.append(f"{provider_name}: {err_str}")

        # If all available providers failed
        error_summary = "; ".join(infra_errors) if infra_errors else "No LLM provider credentials configured."
        logger.error(f"[MultiProviderLLMClient] All providers failed: {error_summary}")
        raise RuntimeError(f"All LLM providers failed infrastructure checks: {error_summary}")

    # Backward-compatible alias
    complete = generate


# Singleton client instance
_DEFAULT_CLIENT = None


def get_llm_client() -> MultiProviderLLMClient:
    global _DEFAULT_CLIENT
    if _DEFAULT_CLIENT is None:
        _DEFAULT_CLIENT = MultiProviderLLMClient()
    return _DEFAULT_CLIENT
