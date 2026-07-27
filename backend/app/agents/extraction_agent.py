"""
extraction_agent.py — Extraction Agent (SAD Section 7.2)
Powered by LangGraph, Groq LLM, and MongoDB Atlas.

Flow:
Retrieve indexed chunks → Filter financial chunks → LLM structured extraction →
Validate schema & citations → Store metrics in MongoDB

Target Metrics (SAD FR-EXT-01):
revenue, net_income, ebitda, eps, debt_to_equity, current_ratio,
gross_margin, operating_margin, roe, roa
"""

import os
import re
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import TypedDict, List, Optional, Any, Dict

from langgraph.graph import StateGraph, END

from app.database import get_db

logger = logging.getLogger("velsora.extraction_agent")

# ─── Target Metrics (SAD FR-EXT-01) ──────────────────────────────────────────

TARGET_METRICS = [
    "revenue", "net_income", "ebitda", "eps",
    "debt_to_equity", "current_ratio",
    "gross_margin", "operating_margin", "roe", "roa",
]

FINANCIAL_KEYWORDS = [
    "revenue", "net income", "ebitda", "eps", "earnings per share",
    "debt", "equity", "current ratio", "gross margin", "operating margin",
    "roe", "roa", "return on equity", "return on assets",
    "profit", "sales", "borrowings", "total expenses",
    "net sales", "total revenue", "finance cost",
]


# ─── Groq LLM Client ────────────────────────────────────────────────────────

# Simple in-memory cache to prevent redundant LLM calls during presentations
_LLM_CACHE = {}

def _call_groq_llm(prompt: str) -> str:
    """Call Groq LLM API for structured metric extraction with multi-model failover."""
    import httpx
    import hashlib
    
    # Check Cache
    prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
    if prompt_hash in _LLM_CACHE:
        logger.info("[Extraction Agent] Cache hit! Returning instant response.")
        return _LLM_CACHE[prompt_hash]

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set.")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    models = [
        os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"), 
        "mixtral-8x7b-32768", 
        "llama3-8b-8192", 
        "gemma2-9b-it"
    ]
    
    last_error = None
    for model in models:
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a conservative financial data extractor. "
                        "Extract ONLY metrics that are explicitly stated in the source text. "
                        "Never infer, estimate, or calculate values that are not directly present. "
                        "If a metric is not present in the text, omit it entirely. "
                        "Return valid JSON only, no markdown fences."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.0,
            "max_tokens": 2048,
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
                logger.warning(f"[Extraction Agent] Rate Limit (429) hit on {model}. Failing over...")
            else:
                logger.warning(f"[Extraction Agent] HTTP Error {e.response.status_code} on {model}. Failing over...")
            continue
        except Exception as e:
            last_error = e
            logger.warning(f"[Extraction Agent] Error on {model}: {e}. Failing over...")
            continue
            
    # If all Groq models fail, fallback to Gemini
    logger.warning("[Extraction Agent] All Groq models failed. Engaging Gemini fallback...")
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={gemini_key}"
            full_prompt = (
                "You are a conservative financial data extractor. "
                "Extract ONLY metrics that are explicitly stated in the source text. "
                "Never infer, estimate, or calculate values that are not directly present. "
                "If a metric is not present in the text, omit it entirely. "
                "Return valid JSON only, no markdown fences.\n\n"
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
            logger.error(f"[Extraction Agent] Gemini fallback also failed: {gemini_e}")
            raise last_error
            
    raise last_error


# ─── Collections ─────────────────────────────────────────────────────────────

def get_chunks_collection():
    return get_db()["document_chunks"]


def get_metrics_collection():
    return get_db()["extracted_metrics"]


# ─── LangGraph Extraction Agent State (SAD 7.2.3 / 7.2.4) ───────────────────

class ExtractionAgentState(TypedDict):
    document_id: str
    workspace_id: str
    # Retrieved from Document Agent output in MongoDB
    financial_chunks: List[Dict[str, Any]]
    # LLM-extracted metrics
    raw_llm_output: str
    parsed_metrics: List[Dict[str, Any]]
    # Validated final output
    validated_metrics: List[Dict[str, Any]]
    extraction_status: str  # complete | partial | failed
    error: Optional[str]


# ─── Node 1: Retrieve Financial Chunks from MongoDB ─────────────────────────

def node_retrieve_chunks(state: ExtractionAgentState) -> ExtractionAgentState:
    """Retrieve chunks from the Document Agent's indexed output in MongoDB."""
    logger.info(f"[Extraction Agent] Retrieving chunks for document '{state['document_id']}'...")

    chunks_col = get_chunks_collection()
    all_chunks = list(chunks_col.find(
        {"document_id": state["document_id"]},
        {"embedding": 0, "_id": 0},
    ))

    if not all_chunks:
        logger.warning(f"[Extraction Agent] No indexed chunks found for {state['document_id']}")
        state["financial_chunks"] = []
        state["extraction_status"] = "failed"
        state["error"] = "No indexed chunks found. Run Document Agent first."
        return state

    # Filter to chunks containing financial keywords
    financial_chunks = []
    for chunk in all_chunks:
        text_lower = chunk.get("text", "").lower()
        if any(kw in text_lower for kw in FINANCIAL_KEYWORDS):
            financial_chunks.append(chunk)

    # If keyword filter is too strict, include top chunks by page order
    if len(financial_chunks) < 3:
        financial_chunks = all_chunks[:20]

    state["financial_chunks"] = financial_chunks
    state["extraction_status"] = "retrieved"
    logger.info(f"[Extraction Agent] Found {len(financial_chunks)} financial chunks.")
    return state


# ─── Node 2: LLM Structured Extraction ──────────────────────────────────────

def node_extract_metrics(state: ExtractionAgentState) -> ExtractionAgentState:
    """Use Groq LLM to extract structured financial metrics from chunks."""
    if state.get("extraction_status") == "failed":
        return state

    chunks = state.get("financial_chunks", [])
    if not chunks:
        state["extraction_status"] = "failed"
        state["error"] = "No financial chunks to process."
        return state

    logger.info(f"[Extraction Agent] Sending {len(chunks)} chunks to LLM for extraction...")

    # Build context from chunks, preserving page references
    context_parts = []
    for c in chunks[:20]:  # Cap at 20 chunks to stay within token limits
        context_parts.append(
            f"[Page {c.get('page', '?')}] {c.get('text', '')}"
        )
    context = "\n\n".join(context_parts)

    prompt = f"""From the following financial document excerpts, extract these specific metrics where explicitly stated:
- revenue (total revenue or net sales)
- net_income (net income or net earnings)
- ebitda
- eps (earnings per share, basic)
- debt_to_equity (debt-to-equity ratio)
- current_ratio
- gross_margin (gross margin percentage)
- operating_margin (operating margin percentage)
- roe (return on equity)
- roa (return on assets)

Return a JSON array of objects. Each object must have exactly these fields:
- "name": one of the metric names above
- "value": the numeric value (number only, no currency symbols)
- "unit": the unit (e.g. "₹ Lakh", "₹ Crore", "%", "x", "₹")
- "period": the fiscal period (e.g. "FY 2025-26", "Q3 2025")
- "page": the page number where this metric was found (integer)
- "snippet": the exact sentence or line from the source text that contains this value (max 200 chars)

Rules:
- If a metric is NOT explicitly present in the text, do NOT include it.
- Do NOT calculate or infer values.
- For ratios expressed as "0.79x", set value to 0.79 and unit to "x".
- For percentages like "14.05%", set value to 14.05 and unit to "%".
- Return ONLY the JSON array, no markdown, no explanation.

Document excerpts:
{context}"""

    # Retry up to 2 times on failure (SAD 7.2.11)
    max_retries = 2
    raw_output = ""
    for attempt in range(max_retries + 1):
        try:
            raw_output = _call_groq_llm(prompt)
            state["raw_llm_output"] = raw_output
            state["extraction_status"] = "extracted"
            break
        except Exception as e:
            logger.warning(f"[Extraction Agent] LLM attempt {attempt + 1} failed: {e}")
            if attempt == max_retries:
                state["extraction_status"] = "failed"
                state["error"] = f"LLM extraction failed after {max_retries + 1} attempts: {str(e)}"
                return state

    return state


# ─── Node 3: Parse & Validate Output Schema (SAD 7.2.9) ─────────────────────

REQUIRED_FIELDS = {"name", "value", "unit", "period", "page", "snippet"}

def node_validate_output(state: ExtractionAgentState) -> ExtractionAgentState:
    """Parse LLM JSON output and validate each metric against the schema."""
    if state.get("extraction_status") == "failed":
        return state

    raw = state.get("raw_llm_output", "")
    logger.info("[Extraction Agent] Validating extraction output schema...")

    # Strip markdown fences if present
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        state["extraction_status"] = "failed"
        state["error"] = f"LLM returned invalid JSON: {str(e)}"
        state["parsed_metrics"] = []
        state["validated_metrics"] = []
        return state

    if not isinstance(parsed, list):
        parsed = [parsed] if isinstance(parsed, dict) else []

    state["parsed_metrics"] = parsed

    # Validate each metric
    validated = []
    chunk_texts = {c.get("page", 0): c.get("text", "") for c in state.get("financial_chunks", [])}

    for metric in parsed:
        # Check required fields
        if not REQUIRED_FIELDS.issubset(metric.keys()):
            logger.warning(f"[Extraction Agent] Skipping metric with missing fields: {metric.get('name', '?')}")
            continue

        # Check metric name is in target list
        if metric["name"] not in TARGET_METRICS:
            logger.warning(f"[Extraction Agent] Skipping unknown metric: {metric['name']}")
            continue

        # Validate value is numeric
        try:
            metric["value"] = float(metric["value"])
        except (ValueError, TypeError):
            logger.warning(f"[Extraction Agent] Non-numeric value for {metric['name']}: {metric['value']}")
            continue

        # Validate page is integer
        try:
            metric["page"] = int(metric["page"])
        except (ValueError, TypeError):
            continue

        # Verify snippet text exists in a source chunk (SAD 7.2.9)
        snippet = metric.get("snippet", "")
        snippet_verified = False
        for page_num, chunk_text in chunk_texts.items():
            # Check if key parts of the snippet appear in any chunk
            snippet_words = [w for w in snippet.split() if len(w) > 3][:5]
            if snippet_words and sum(1 for w in snippet_words if w.lower() in chunk_text.lower()) >= len(snippet_words) * 0.5:
                snippet_verified = True
                break

        # Calculate confidence (SAD 7.2.10)
        retrieval_score = 0.8
        schema_match = 1.0
        llm_confidence = 0.85 if snippet_verified else 0.5
        confidence = round(retrieval_score * 0.3 + llm_confidence * 0.5 + schema_match * 0.2, 4)

        validated.append({
            "metric_id": f"met_{uuid.uuid4().hex[:8]}",
            "name": metric["name"],
            "value": metric["value"],
            "unit": metric["unit"],
            "period": metric["period"],
            "source_document_id": state["document_id"],
            "page": metric["page"],
            "snippet": snippet[:200],
            "confidence": confidence,
        })

    state["validated_metrics"] = validated
    state["extraction_status"] = "complete" if validated else "partial"
    logger.info(f"[Extraction Agent] Validated {len(validated)} metrics out of {len(parsed)} parsed.")
    return state


# ─── Node 4: Store Metrics in MongoDB ────────────────────────────────────────

def node_store_metrics(state: ExtractionAgentState) -> ExtractionAgentState:
    """Persist validated metrics to MongoDB 'extracted_metrics' collection."""
    if state.get("extraction_status") == "failed":
        return state

    metrics = state.get("validated_metrics", [])
    if not metrics:
        logger.warning("[Extraction Agent] No validated metrics to store.")
        return state

    logger.info(f"[Extraction Agent] Storing {len(metrics)} metrics in MongoDB...")

    metrics_col = get_metrics_collection()
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "document_id": state["document_id"],
        "workspace_id": state["workspace_id"],
        "metrics": metrics,
        "extraction_status": state["extraction_status"],
        "extracted_at": now,
    }

    # Upsert: replace previous extraction for same document
    metrics_col.update_one(
        {"document_id": state["document_id"]},
        {"$set": doc},
        upsert=True,
    )

    logger.info(f"[Extraction Agent] Successfully stored metrics for '{state['document_id']}'.")
    return state


# ─── Compile LangGraph Extraction Agent Workflow ─────────────────────────────

def build_extraction_agent_graph():
    workflow = StateGraph(ExtractionAgentState)

    workflow.add_node("retrieve", node_retrieve_chunks)
    workflow.add_node("extract", node_extract_metrics)
    workflow.add_node("validate", node_validate_output)
    workflow.add_node("store", node_store_metrics)

    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "extract")
    workflow.add_edge("extract", "validate")
    workflow.add_edge("validate", "store")
    workflow.add_edge("store", END)

    return workflow.compile()


extraction_agent_graph = build_extraction_agent_graph()


def run_extraction_agent(document_id: str, workspace_id: str) -> Dict[str, Any]:
    """
    Entry point for the Extraction Agent.
    Runs the LangGraph workflow on an already-indexed document.
    """
    initial_state: ExtractionAgentState = {
        "document_id": document_id,
        "workspace_id": workspace_id,
        "financial_chunks": [],
        "raw_llm_output": "",
        "parsed_metrics": [],
        "validated_metrics": [],
        "extraction_status": "initialized",
        "error": None,
    }

    final_state = extraction_agent_graph.invoke(initial_state)

    return {
        "document_id": document_id,
        "workspace_id": workspace_id,
        "extraction_status": final_state.get("extraction_status", "failed"),
        "metrics": final_state.get("validated_metrics", []),
        "metrics_count": len(final_state.get("validated_metrics", [])),
        "error": final_state.get("error"),
    }
