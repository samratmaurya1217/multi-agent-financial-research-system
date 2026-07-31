"""
red_flag_agent.py — Red Flag Agent (Pure LLM Implementation)
Powered by LangGraph, Groq LLM, and MongoDB Atlas.

Flow:
Load metrics & chunks → LLM Scan (Quantitative & Qualitative) →
Validate citations → Deduplicate → Store

Categories: Liquidity | Profitability | Operational | Governance | Market
Severity: low | medium | high | critical
"""

import os
import re
import json
import uuid
import time
import logging
from datetime import datetime, timezone
from typing import TypedDict, List, Optional, Any, Dict

from langgraph.graph import StateGraph, END

from app.database import get_db

logger = logging.getLogger("velsora.red_flag_agent")

VALID_CATEGORIES = {"Liquidity", "Profitability", "Operational", "Governance", "Market"}
VALID_SEVERITIES = {"low", "medium", "high", "critical"}

RISK_KEYWORDS = [
    "debt", "borrowings", "leverage", "going concern", "auditor",
    "qualification", "litigation", "lawsuit", "legal proceedings",
    "restructuring", "impairment", "write-off", "default",
    "decline", "decreased", "negative", "loss", "headwind",
    "contingent", "related party", "promoter", "pledge",
    "margin", "deteriorat", "adverse", "risk", "concern",
    "receivable", "overdue", "provision", "fraud", "dscr",
]

# ─── Groq LLM Client ────────────────────────────────────────────────────────

# Simple in-memory cache to prevent redundant LLM calls during presentations
_LLM_CACHE = {}

def _call_groq_llm(prompt: str) -> str:
    """Call Groq LLM with multi-model failover to prevent 429 Rate Limit crashes."""
    import httpx
    import hashlib
    
    # Check Cache
    prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
    if prompt_hash in _LLM_CACHE:
        logger.info("[Red Flag Agent] Cache hit! Returning instant response.")
        return _LLM_CACHE[prompt_hash]

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set.")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Model failover list (put fastest model first for zero latency)
    models = [
        "llama-3.1-8b-instant",
        os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    ]
    
    last_error = None
    for model in models:
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are an elite, highly precise financial risk analyst AI. "
                        "Identify ONLY red flags that are explicitly supported by evidence in the source text or metrics. "
                        "Never speculate or infer risks that are not directly stated. "
                        "You must strictly output valid JSON only, without any markdown formatting."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.0,
            "max_tokens": 1500,
        }

        try:
            response = httpx.post(url, headers=headers, json=payload, timeout=60.0)
            response.raise_for_status()
            result = response.json()["choices"][0]["message"]["content"]
            
            # Save to cache on success
            _LLM_CACHE[prompt_hash] = result
            return result
            
        except httpx.HTTPStatusError as e:
            last_error = e
            if e.response.status_code == 429:
                logger.warning(f"[Red Flag Agent] Rate Limit (429) hit on {model}. Failing over...")
            else:
                logger.warning(f"[Red Flag Agent] HTTP Error {e.response.status_code} on {model}. Failing over...")
            continue
        except Exception as e:
            last_error = e
            logger.warning(f"[Red Flag Agent] Error on {model}: {e}. Failing over...")
            continue
            
    # If all Groq models fail, fallback to Gemini
    logger.warning("[Red Flag Agent] All Groq models failed. Engaging Gemini fallback...")
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={gemini_key}"
            # Convert system prompt to Gemini format by prepending it to the user text
            full_prompt = (
                "You are an elite, highly precise financial risk analyst AI. "
                "Identify ONLY red flags that are explicitly supported by evidence in the source text or metrics. "
                "Never speculate or infer risks that are not directly stated. "
                "You must strictly output valid JSON only, without any markdown formatting.\n\n"
                f"{prompt}"
            )
            gemini_payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {"temperature": 0.0}
            }
            g_response = httpx.post(gemini_url, json=gemini_payload, timeout=60.0)
            g_response.raise_for_status()
            result = g_response.json()["candidates"][0]["content"]["parts"][0]["text"]
            _LLM_CACHE[prompt_hash] = result
            return result
        except Exception as gemini_e:
            logger.error(f"[Red Flag Agent] Gemini fallback also failed: {gemini_e}")
            raise last_error
            
    raise last_error


# ─── Collections ─────────────────────────────────────────────────────────────

def get_chunks_collection():
    return get_db()["document_chunks"]

def get_metrics_collection():
    return get_db()["extracted_metrics"]

def get_red_flags_collection():
    return get_db()["red_flags"]


# ─── LangGraph Red Flag Agent State ──────────────────────────────────────────

class RedFlagAgentState(TypedDict):
    document_id: str
    workspace_id: str
    metrics: List[Dict[str, Any]]
    risk_chunks: List[Dict[str, Any]]
    llm_flags: List[Dict[str, Any]]
    validated_flags: List[Dict[str, Any]]
    status: str
    error: Optional[str]


# ─── Node 1: Load Metrics & Risk Chunks from MongoDB ────────────────────────

def node_load_inputs(state: RedFlagAgentState) -> RedFlagAgentState:
    logger.info(f"[Red Flag Agent] Loading inputs for document '{state['document_id']}'...")

    metrics_doc = get_metrics_collection().find_one(
        {"document_id": state["document_id"]},
        {"_id": 0},
    )
    state["metrics"] = metrics_doc["metrics"] if metrics_doc and metrics_doc.get("metrics") else []

    chunks_col = get_chunks_collection()
    all_chunks = list(chunks_col.find(
        {"document_id": state["document_id"]},
        {"embedding": 0, "_id": 0},
    ))

    risk_chunks = []
    for chunk in all_chunks:
        text_lower = chunk.get("text", "").lower()
        if any(kw in text_lower for kw in RISK_KEYWORDS):
            risk_chunks.append(chunk)

    if len(risk_chunks) < 3:
        risk_chunks = all_chunks[:15]

    state["risk_chunks"] = risk_chunks
    state["status"] = "loaded"
    return state


# ─── Node 2: LLM Comprehensive Scan (Replacing Heuristics) ──────────────────

def node_llm_scan(state: RedFlagAgentState) -> RedFlagAgentState:
    """Use pure LLM for both quantitative and qualitative red flag detection."""
    risk_chunks = state.get("risk_chunks", [])
    metrics = state.get("metrics", [])
    if not risk_chunks and not metrics:
        state["llm_flags"] = []
        return state

    logger.info("[Red Flag Agent] Sending data to LLM for comprehensive scan...")

    context_parts = []
    # Limit chunks to avoid exceeding context window (8192 tokens max)
    for c in risk_chunks[:20]:
        context_parts.append(f"[Page {c.get('page', '?')}] {c.get('text', '')}")
    text_context = "\n\n".join(context_parts)

    metrics_context = "\n".join(
        [f"- {m['name']}: {m['value']} {m['unit']} (Page {m['page']})" for m in metrics]
    )

    prompt = f"""Analyze the following financial metrics and document excerpts for explicitly stated red flags.

PAY VERY CLOSE ATTENTION TO BOTH QUALITATIVE AND QUANTITATIVE RISKS, INCLUDING BUT NOT LIMITED TO:
1. Significant increases in Debt or Leverage (e.g., Debt-to-Equity spikes)
2. Significant drops in coverage ratios or profitability (e.g., margins compressing severely)
3. Auditor qualifications, going concern opinions, or material weaknesses in controls
4. Inventory or Working Capital weaknesses (e.g., massive surges in receivables)
5. Unusual or risky Related Party transactions, litigation, or regulatory actions

CRITICAL INSTRUCTION TO MAXIMIZE PRECISION (>95%):
- DO NOT hallucinate. You must only report risks that are EXPLICITLY stated in the text.
- STRICT SEVERITY: Only report material, severe risks that would concern an investor. Ignore minor operational hiccups.
- CONSOLIDATE RELATED RISKS: If multiple data points point to the same root issue, combine them into ONE single flag. 
  - Example: If both "Debt" and "Debt-to-Equity" increase, output ONE "High Debt Growth" flag.
  - Example: If both "Inventory" and "Trade Receivables" surge, output ONE "Working Capital Stress" flag.
- DO NOT generate duplicate flags for the same category of risk.
- DO NOT invent or calculate numbers not in the text.
- If it says "+163.33%", mention it. If it says "-64.94%", mention it.

Return a JSON array of objects. Each object MUST have exactly these fields:
- "category": one of "Liquidity", "Profitability", "Operational", "Governance", "Market"
- "severity": one of "low", "medium", "high", "critical"
- "description": clear explanation of the consolidated risk (include % changes or specific values)
- "page": the page number where evidence was found (integer)
- "snippet": the exact supporting text from the source excerpts (max 200 chars)
- "trigger": what triggered this flag (e.g., "Debt ↑163%", "DSCR ↓64.94%", "Auditor Qualification")
- "confidence": a float between 0.0 and 1.0 representing how confident you are that this is a severe risk based on the explicit text.

Return ONLY the raw JSON array. NO markdown, NO formatting tags.

Extracted Metrics:
{metrics_context}

Document Excerpts:
{text_context}"""

    max_retries = 3
    for attempt in range(max_retries + 1):
        try:
            raw = _call_groq_llm(prompt)
            raw = raw.strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```(?:json)?\s*", "", raw)
                raw = re.sub(r"\s*```$", "", raw)

            parsed = json.loads(raw)
            if not isinstance(parsed, list):
                parsed = [parsed] if isinstance(parsed, dict) else []

            llm_flags = []
            for f in parsed:
                llm_flags.append({
                    "flag_id": f"rf_{uuid.uuid4().hex[:8]}",
                    "category": f.get("category", "Operational"),
                    "severity": f.get("severity", "medium"),
                    "description": f.get("description", ""),
                    "source_document_id": state["document_id"],
                    "page": f.get("page", 0),
                    "snippet": str(f.get("snippet", ""))[:200],
                    "confidence": float(f.get("confidence", 0.85)),
                    "trigger": f.get("trigger", "llm_qualitative_scan"),
                })

            state["llm_flags"] = llm_flags
            return state

        except Exception as e:
            logger.warning(f"[Red Flag Agent] LLM attempt {attempt + 1} failed: {e}")
            if attempt < max_retries:
                time.sleep(2 ** (attempt + 1))
            else:
                state["llm_flags"] = []
                state["status"] = "failed"
                state["error"] = str(e)
                return state

    state["llm_flags"] = []
    return state


# ─── Node 3: Validate, Deduplicate & Calculate Confidence ───────────────────

def node_validate_and_dedup(state: RedFlagAgentState) -> RedFlagAgentState:
    if state.get("status") == "failed":
        return state
        
    logger.info("[Red Flag Agent] Validating and deduplicating flags...")

    llm_flags = state.get("llm_flags", [])
    risk_chunks = state.get("risk_chunks", [])

    chunk_texts: Dict[int, str] = {}
    for c in risk_chunks:
        page = c.get("page", 0)
        chunk_texts.setdefault(page, "")
        chunk_texts[page] += " " + c.get("text", "")

    validated = []
    seen_signatures = set()

    for flag in llm_flags:
        if flag.get("category") not in VALID_CATEGORIES:
            flag["category"] = "Operational"
        if flag.get("severity") not in VALID_SEVERITIES:
            flag["severity"] = "medium"

        try:
            flag["page"] = int(flag.get("page", 0))
        except (ValueError, TypeError):
            flag["page"] = 0

        snippet = flag.get("snippet", "")
        citation_quality = 0.3
        if snippet:
            snippet_words = [w for w in snippet.split() if len(w) > 3][:6]
            for page_num, chunk_text in chunk_texts.items():
                if snippet_words and sum(1 for w in snippet_words if w.lower() in chunk_text.lower()) >= len(snippet_words) * 0.4:
                    citation_quality = 1.0
                    break

        # Confidence: Combine LLM's dynamic confidence with citation quality
        llm_confidence = flag.get("confidence", 0.85)
        confidence = round(llm_confidence * 0.8 + citation_quality * 0.2, 4)
        flag["confidence"] = confidence

        sig = f"{flag['page']}_{flag['category']}_{flag.get('trigger', '')[:20]}"
        if sig in seen_signatures:
            continue
        seen_signatures.add(sig)

        validated.append(flag)

    state["validated_flags"] = validated
    state["status"] = "complete" if validated else "partial"
    return state


# ─── Node 4: Store Red Flags in MongoDB ──────────────────────────────────────

def node_store_flags(state: RedFlagAgentState) -> RedFlagAgentState:
    flags = state.get("validated_flags", [])
    if not flags and state.get("status") != "failed":
        state["status"] = "complete"

    import json
    import os
    
    # Always update red_flag_validation.json for visibility
    try:
        output_data = []
        for f in flags:
            output_data.append({
                "Red Flag Output": f"{f.get('category', 'Unknown')} - {f.get('trigger', 'Risk')}",
                "Confidence": f"{f.get('confidence', 0.0) * 100:.1f}%",
                "Page": f.get("page", 0),
                "Reason": f.get("description", ""),
                "Severity": f.get("severity", "medium").upper()
            })
            
        json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "red_flag_validation.json")
        with open(json_path, "w") as f_out:
            json.dump(output_data, f_out, indent=4)
        logger.info(f"[Red Flag Agent] Results written to {json_path}")
    except Exception as e:
        logger.error(f"[Red Flag Agent] Failed to write validation JSON: {e}")

    doc = {
        "document_id": state["document_id"],
        "workspace_id": state["workspace_id"],
        "red_flags": flags,
        "status": state.get("status", "complete"),
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }

    get_red_flags_collection().update_one(
        {"document_id": state["document_id"]},
        {"$set": doc},
        upsert=True,
    )
    return state


# ─── Compile LangGraph Workflow ──────────────────────────────────────────────

def build_red_flag_agent_graph():
    workflow = StateGraph(RedFlagAgentState)

    workflow.add_node("load", node_load_inputs)
    workflow.add_node("llm_scan", node_llm_scan)
    workflow.add_node("validate", node_validate_and_dedup)
    workflow.add_node("store", node_store_flags)

    workflow.set_entry_point("load")
    workflow.add_edge("load", "llm_scan")
    workflow.add_edge("llm_scan", "validate")
    workflow.add_edge("validate", "store")
    workflow.add_edge("store", END)

    return workflow.compile()

red_flag_agent_graph = build_red_flag_agent_graph()

def run_red_flag_agent(document_id: str, workspace_id: str) -> Dict[str, Any]:
    initial_state: RedFlagAgentState = {
        "document_id": document_id,
        "workspace_id": workspace_id,
        "metrics": [],
        "risk_chunks": [],
        "llm_flags": [],
        "validated_flags": [],
        "status": "initialized",
        "error": None,
    }

    final_state = red_flag_agent_graph.invoke(initial_state)

    return {
        "document_id": document_id,
        "workspace_id": workspace_id,
        "status": final_state.get("status", "failed"),
        "red_flags": final_state.get("validated_flags", []),
        "flags_count": len(final_state.get("validated_flags", [])),
        "error": final_state.get("error"),
    }
