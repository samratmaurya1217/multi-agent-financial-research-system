"""
red_flag_agent.py — Red Flag Agent (SAD Section 7.3 & FR-RFL-01/02/03)
Powered by LangGraph, Rule-Based Heuristics, Groq/Gemini LLMs, and MongoDB Atlas.

Complete Flow:
Load Extracted Metrics & Risk Chunks -> Evaluate Quantitative Heuristics ->
Run Qualitative LLM Risk Scan -> Validate Citations & Deduplicate ->
Store Results in MongoDB 'red_flags'.

Categories (SAD 7.3.4): Liquidity | Profitability | Operational | Governance | Market
Severity (SAD 7.3.4): low | medium | high | critical
"""

import os
import re
import json
import uuid
import time
import logging
from datetime import datetime, timezone
from typing import TypedDict, List, Optional, Any, Dict

import httpx
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
    "receivable", "overdue", "provision", "fraud", "dscr", "penalty",
]

_LLM_CACHE: Dict[str, str] = {}


# ─── LLM Client for Qualitative Risk Detection ───────────────────────────────

def _call_red_flag_llm(prompt: str) -> str:
    """Call LLM with exponential backoff and failover for qualitative risk detection."""
    import hashlib

    prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
    if prompt_hash in _LLM_CACHE:
        logger.info("[Red Flag Agent] Cache hit! Returning cached risk analysis.")
        return _LLM_CACHE[prompt_hash]

    api_key = os.getenv("GROQ_API_KEY")
    models = [
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b",
        "qwen/qwen3.6-27b",
        "groq/compound-mini",
        "groq/compound",
    ]

    last_error = None

    if api_key:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        for model in models:
            payload = {
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a rigorous, highly conservative financial risk analyst AI. "
                            "Detect ONLY red flags, anomalies, and material risk factors that are explicitly grounded in the source text. "
                            "Do not speculate. Consolidate overlapping risks. "
                            "Return valid JSON array only."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.0,
                "max_tokens": 4096,
            }

            try:
                resp = httpx.post(url, headers=headers, json=payload, timeout=60.0)
                resp.raise_for_status()
                res_content = resp.json()["choices"][0]["message"]["content"]
                _LLM_CACHE[prompt_hash] = res_content
                return res_content
            except httpx.HTTPStatusError as e:
                last_error = e
                logger.warning(f"[Red Flag Agent] Groq {model} HTTP error {e.response.status_code}. Retrying next model...")
                continue
            except Exception as e:
                last_error = e
                logger.warning(f"[Red Flag Agent] Groq {model} error: {e}. Retrying next model...")
                continue

    # Fallback to Gemini
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            logger.info("[Red Flag Agent] Engaging Gemini fallback for risk analysis...")
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={gemini_key}"
            gemini_payload = {
                "contents": [{
                    "parts": [{
                        "text": (
                            "You are a rigorous financial risk analyst AI.\n"
                            "Identify explicitly grounded financial risks.\n"
                            "Return raw JSON array only.\n\n"
                            f"{prompt}"
                        )
                    }]
                }],
                "generationConfig": {"temperature": 0.0}
            }
            g_resp = httpx.post(gemini_url, json=gemini_payload, timeout=60.0)
            g_resp.raise_for_status()
            res_content = g_resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            _LLM_CACHE[prompt_hash] = res_content
            return res_content
        except Exception as gemini_err:
            logger.error(f"[Red Flag Agent] Gemini fallback failed: {gemini_err}")
            if last_error:
                raise last_error
            raise gemini_err

    if last_error:
        raise last_error
    raise RuntimeError("No LLM API keys configured for Red Flag Agent.")


# ─── Collections ─────────────────────────────────────────────────────────────

def get_chunks_collection():
    return get_db()["document_chunks"]


def get_metrics_collection():
    return get_db()["extracted_metrics"]


def get_red_flags_collection():
    return get_db()["red_flags"]


# ─── LangGraph Red Flag Agent State (SAD 7.3.3 & 7.3.4) ──────────────────────

class RedFlagAgentState(TypedDict):
    document_id: str
    workspace_id: str
    metrics: List[Dict[str, Any]]
    risk_chunks: List[Dict[str, Any]]
    heuristic_flags: List[Dict[str, Any]]
    llm_flags: List[Dict[str, Any]]
    validated_flags: List[Dict[str, Any]]
    status: str  # complete | partial | failed
    error: Optional[str]


# Node 1: Load Inputs (Metrics from Extraction Agent + Risk Chunks)
def node_load_inputs(state: RedFlagAgentState) -> RedFlagAgentState:
    doc_id = state["document_id"]
    logger.info(f"[Red Flag Agent] Loading inputs for document '{doc_id}'...")

    # Load extracted metrics
    metrics_doc = get_metrics_collection().find_one(
        {"document_id": doc_id},
        {"_id": 0}
    )
    metrics = metrics_doc.get("metrics", []) if metrics_doc else []
    state["metrics"] = metrics

    # Load risk-related chunks
    chunks_col = get_chunks_collection()
    all_chunks = list(chunks_col.find(
        {"document_id": doc_id},
        {"embedding": 0, "_id": 0}
    ).sort("page", 1))

    scored_risk = []
    for chunk in all_chunks:
        text_lower = chunk.get("text", "").lower()
        score = sum(1 for kw in RISK_KEYWORDS if kw in text_lower)
        if score > 0:
            scored_risk.append((score, chunk))

    scored_risk.sort(key=lambda x: x[0], reverse=True)
    risk_chunks = [c for _, c in scored_risk[:6]]

    if len(risk_chunks) < 2:
        risk_chunks = all_chunks[:6]

    state["risk_chunks"] = risk_chunks
    state["status"] = "loaded"
    logger.info(f"[Red Flag Agent] Loaded {len(metrics)} metrics and {len(risk_chunks)} prioritized risk chunks.")
    return state


# Node 2: Rule-Based Quantitative Heuristic Triggers (SAD 7.3.2 & 7.3.18)
def node_evaluate_heuristics(state: RedFlagAgentState) -> RedFlagAgentState:
    metrics = state.get("metrics", [])
    doc_id = state["document_id"]
    heuristic_flags = []

    metric_map = {m["name"]: m for m in metrics}

    # 1. Debt-to-Equity Trigger (D/E > 1.5 is High/Critical)
    if "debt_to_equity" in metric_map:
        m = metric_map["debt_to_equity"]
        val = m.get("value", 0)
        if val > 2.0:
            heuristic_flags.append({
                "flag_id": f"flg_{uuid.uuid4().hex[:8]}",
                "category": "Liquidity",
                "severity": "critical",
                "description": f"Debt-to-Equity ratio of {val:.2f}x indicates severe balance sheet leverage.",
                "source_document_id": doc_id,
                "page": m.get("page", 1),
                "snippet": m.get("snippet", f"Debt-to-equity ratio at {val}"),
                "confidence": 0.95,
                "trigger": f"Extreme Debt-to-Equity ({val:.2f}x)",
                "source": "heuristic"
            })
        elif val > 1.5:
            heuristic_flags.append({
                "flag_id": f"flg_{uuid.uuid4().hex[:8]}",
                "category": "Liquidity",
                "severity": "high",
                "description": f"Elevated Debt-to-Equity ratio of {val:.2f}x exceeds conservative financial safety benchmarks.",
                "source_document_id": doc_id,
                "page": m.get("page", 1),
                "snippet": m.get("snippet", f"Debt-to-equity ratio at {val}"),
                "confidence": 0.90,
                "trigger": f"Elevated Debt-to-Equity ({val:.2f}x)",
                "source": "heuristic"
            })

    # 2. Current Ratio Trigger (Current Ratio < 1.0 is Liquidity Stress)
    if "current_ratio" in metric_map:
        m = metric_map["current_ratio"]
        val = m.get("value", 0)
        if val < 1.0 and val > 0:
            heuristic_flags.append({
                "flag_id": f"flg_{uuid.uuid4().hex[:8]}",
                "category": "Liquidity",
                "severity": "high" if val < 0.8 else "medium",
                "description": f"Current ratio of {val:.2f}x is below 1.0, indicating short-term working capital shortfall.",
                "source_document_id": doc_id,
                "page": m.get("page", 1),
                "snippet": m.get("snippet", f"Current ratio at {val}"),
                "confidence": 0.92,
                "trigger": f"Working Capital Deficit (Current Ratio {val:.2f}x)",
                "source": "heuristic"
            })

    # 3. Negative Net Income / Profitability
    if "net_income" in metric_map:
        m = metric_map["net_income"]
        val = m.get("value", 0)
        if val < 0:
            heuristic_flags.append({
                "flag_id": f"flg_{uuid.uuid4().hex[:8]}",
                "category": "Profitability",
                "severity": "high",
                "description": f"Company reported net loss of {val} {m.get('unit', '')} for {m.get('period', 'the period')}.",
                "source_document_id": doc_id,
                "page": m.get("page", 1),
                "snippet": m.get("snippet", f"Net loss of {val}"),
                "confidence": 0.95,
                "trigger": "Negative Net Income (Net Loss)",
                "source": "heuristic"
            })

    # 4. Operating Margin Compression
    if "operating_margin" in metric_map:
        m = metric_map["operating_margin"]
        val = m.get("value", 0)
        if val < 0:
            heuristic_flags.append({
                "flag_id": f"flg_{uuid.uuid4().hex[:8]}",
                "category": "Profitability",
                "severity": "high",
                "description": f"Operating margin is negative at {val:.2f}%, indicating operational unprofitability.",
                "source_document_id": doc_id,
                "page": m.get("page", 1),
                "snippet": m.get("snippet", f"Operating margin at {val}%"),
                "confidence": 0.90,
                "trigger": "Negative Operating Margin",
                "source": "heuristic"
            })

    state["heuristic_flags"] = heuristic_flags
    logger.info(f"[Red Flag Agent] Generated {len(heuristic_flags)} quantitative heuristic flags.")
    return state


# Node 3: Qualitative LLM Risk Scan (SAD 7.3.2 & 7.3.6)
def node_llm_qualitative_scan(state: RedFlagAgentState) -> RedFlagAgentState:
    risk_chunks = state.get("risk_chunks", [])
    metrics = state.get("metrics", [])
    doc_id = state["document_id"]

    if not risk_chunks and not metrics:
        state["llm_flags"] = []
        return state

    context_parts = []
    for c in risk_chunks:
        context_parts.append(f"[Page {c.get('page', 1)}] {c.get('text', '')}")
    text_context = "\n\n".join(context_parts)

    metrics_context = "\n".join(
        [f"- {m['name']}: {m['value']} {m['unit']} (Page {m['page']})" for m in metrics]
    )

    prompt = f"""You are an elite, highly precise financial risk analyst.
Analyze the following financial metrics and document excerpts for explicitly stated red flags.

Focus on:
1. Significant increases in Debt, borrowings, or leverage ratios
2. Auditor qualifications, going concern warnings, or internal control weaknesses
3. Material litigation, pending lawsuits, or regulatory penalties
4. Related party transactions, promoter pledges, or governance issues
5. Inventory / Receivables spikes or working capital stress
6. Impairments, asset write-downs, or restructuring charges

RULES:
- Extract ONLY risks explicitly stated in the text. Do NOT speculate or extrapolate.
- Consolidate related data points into ONE clear flag.
- Assign:
  - "category": EXACTLY one of ["Liquidity", "Profitability", "Operational", "Governance", "Market"]
  - "severity": EXACTLY one of ["low", "medium", "high", "critical"]
  - "trigger": short title (e.g., "Auditor Qualification on Receivables", "High Promoter Share Pledge")
  - "description": clear explanation citing exact figures or context
  - "page": page number (integer >= 1)
  - "snippet": exact supporting sentence from the excerpt (max 200 chars)
  - "confidence": float between 0.70 and 0.98

Return a JSON array of objects only. No markdown fences.

Extracted Metrics:
{metrics_context}

Document Excerpts:
{text_context}"""

    max_retries = 2
    llm_flags = []

    for attempt in range(max_retries + 1):
        try:
            raw = _call_red_flag_llm(prompt).strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```(?:json)?\s*", "", raw)
                raw = re.sub(r"\s*```$", "", raw)

            parsed = []
            try:
                parsed = json.loads(raw)
            except Exception:
                obj_matches = re.findall(r"\{[^{}]*\"trigger\"[^{}]*\}", raw)
                for obj_str in obj_matches:
                    try:
                        parsed.append(json.loads(obj_str))
                    except Exception:
                        pass

            if isinstance(parsed, dict):
                parsed = parsed.get("red_flags", [parsed])
            elif not isinstance(parsed, list):
                parsed = []

            for f in parsed:
                if not isinstance(f, dict):
                    continue
                cat = str(f.get("category", "Operational")).strip()
                if cat not in VALID_CATEGORIES:
                    cat = "Operational"
                sev = str(f.get("severity", "medium")).strip().lower()
                if sev not in VALID_SEVERITIES:
                    sev = "medium"

                try:
                    p = int(f.get("page", 1))
                    if p < 1:
                        p = 1
                except (ValueError, TypeError):
                    p = 1

                llm_flags.append({
                    "flag_id": f"flg_{uuid.uuid4().hex[:8]}",
                    "category": cat,
                    "severity": sev,
                    "description": str(f.get("description", "")).strip(),
                    "source_document_id": doc_id,
                    "page": p,
                    "snippet": str(f.get("snippet", "")).strip()[:250],
                    "confidence": float(f.get("confidence", 0.85)),
                    "trigger": str(f.get("trigger", "Financial Risk Factor")).strip(),
                    "source": "llm_scan"
                })

            state["llm_flags"] = llm_flags
            return state
        except Exception as e:
            logger.warning(f"[Red Flag Agent] LLM attempt {attempt + 1} failed: {e}")
            if attempt < max_retries:
                time.sleep(2 ** attempt)
            else:
                state["llm_flags"] = []
                return state

    state["llm_flags"] = llm_flags
    return state


# Node 4: Citation Validation, Grounding & Deduplication (SAD 7.3.9 & 7.3.10)
def node_validate_and_dedup(state: RedFlagAgentState) -> RedFlagAgentState:
    logger.info("[Red Flag Agent] Validating citations and deduplicating risk flags...")

    heuristic_flags = state.get("heuristic_flags", [])
    llm_flags = state.get("llm_flags", [])
    risk_chunks = state.get("risk_chunks", [])

    chunk_texts: Dict[int, str] = {}
    for c in risk_chunks:
        p = c.get("page", 1)
        chunk_texts.setdefault(p, "")
        chunk_texts[p] += " " + c.get("text", "")

    all_candidate_flags = heuristic_flags + llm_flags
    validated = []
    seen_triggers = set()

    for flag in all_candidate_flags:
        trigger = flag.get("trigger", "").lower().strip()
        page = flag.get("page", 1)
        category = flag.get("category", "Operational")

        # Create signature to deduplicate identical risks on same page
        sig = f"{category}_{page}_{trigger[:15]}"
        if sig in seen_triggers:
            continue

        snippet = flag.get("snippet", "")
        citation_quality = 0.5
        if snippet:
            words = [w for w in re.findall(r"\w+", snippet) if len(w) > 3][:6]
            for p_num, c_text in chunk_texts.items():
                if words and sum(1 for w in words if w.lower() in c_text.lower()) >= max(1, len(words) * 0.4):
                    citation_quality = 1.0
                    break

        # Calculate confidence per SAD 7.3.10:
        # confidence = heuristic_strength * 0.4 + llm_confidence * 0.4 + citation_quality * 0.2
        is_heuristic = flag.get("source") == "heuristic"
        heuristic_strength = 0.95 if is_heuristic else 0.70
        llm_conf = flag.get("confidence", 0.85)
        
        confidence = round(heuristic_strength * 0.4 + llm_conf * 0.4 + citation_quality * 0.2, 4)
        flag["confidence"] = min(0.98, max(0.60, confidence))

        validated.append({
            "flag_id": flag.get("flag_id") or f"flg_{uuid.uuid4().hex[:8]}",
            "category": category,
            "severity": flag["severity"],
            "description": flag["description"],
            "source_document_id": flag["source_document_id"],
            "page": page,
            "snippet": snippet,
            "confidence": flag["confidence"],
            "trigger": flag["trigger"],
        })
        seen_triggers.add(sig)

    if not validated:
        logger.info("[Red Flag Agent] Running structured rule-based risk factor extraction fallback...")
        validated = extract_red_flags_rule_based(state.get("risk_chunks", []), state.get("metrics", []), state["document_id"])

    state["validated_flags"] = validated
    state["status"] = "complete" if validated else "partial"
    logger.info(f"[Red Flag Agent] Validated and deduplicated {len(validated)} flags.")
    return state


def extract_red_flags_rule_based(chunks: List[Dict[str, Any]], metrics: List[Dict[str, Any]], doc_id: str) -> List[Dict[str, Any]]:
    """Grounded heuristic & rule-based risk scanner across report chunks."""
    flags = []
    seen = set()

    # Scan metrics first
    for m in metrics:
        name = m.get("name")
        val = m.get("value", 0)
        page = m.get("page", 1)
        snippet = m.get("snippet", "")

        if name == "debt_to_equity" and val > 0.7:
            flags.append({
                "flag_id": f"flg_{uuid.uuid4().hex[:8]}",
                "category": "Liquidity",
                "severity": "high" if val > 1.5 else "medium",
                "description": f"Debt-to-Equity ratio of {val:.2f}x reflects elevated balance sheet financial obligations.",
                "source_document_id": doc_id,
                "page": page,
                "snippet": snippet or f"Debt to Equity: {val}",
                "confidence": 0.92,
                "trigger": "Elevated Debt-to-Equity Ratio",
            })
            seen.add("debt")

    # Scan chunks for qualitative risk disclosures
    for c in chunks:
        text = c.get("text", "")
        page = c.get("page", 1)

        # 1. Borrowing / Leverage
        if "debt" not in seen and re.search(r"(?:borrowing|term loan|working capital facility|debt burden)", text, re.IGNORECASE):
            flags.append({
                "flag_id": f"flg_{uuid.uuid4().hex[:8]}",
                "category": "Liquidity",
                "severity": "medium",
                "description": "Substantial financial liabilities and debt servicing commitments identified in notes to accounts.",
                "source_document_id": doc_id,
                "page": page,
                "snippet": text[:200].strip(),
                "confidence": 0.86,
                "trigger": "Substantial Borrowings and Debt Exposure",
            })
            seen.add("debt")

        # 2. Auditor Attention / Controls
        if "auditor" not in seen and re.search(r"(?:internal financial control|auditor|basis for opinion|emphasis of matter)", text, re.IGNORECASE):
            flags.append({
                "flag_id": f"flg_{uuid.uuid4().hex[:8]}",
                "category": "Governance",
                "severity": "medium",
                "description": "Internal financial controls and auditor observations require continuous supervisory monitoring.",
                "source_document_id": doc_id,
                "page": page,
                "snippet": text[:200].strip(),
                "confidence": 0.84,
                "trigger": "Internal Controls and Auditor Disclosures",
            })
            seen.add("auditor")

        # 3. Working Capital & Receivables
        if "receivables" not in seen and re.search(r"(?:trade receivable|inventory|working capital requirement|aging of receivables)", text, re.IGNORECASE):
            flags.append({
                "flag_id": f"flg_{uuid.uuid4().hex[:8]}",
                "category": "Liquidity",
                "severity": "high",
                "description": "Concentration of trade receivables and inventory elongation impacting operating cash conversion cycles.",
                "source_document_id": doc_id,
                "page": page,
                "snippet": text[:200].strip(),
                "confidence": 0.88,
                "trigger": "Working Capital & Trade Receivables Concentration",
            })
            seen.add("receivables")

        # 4. Related Party Disclosures
        if "related_party" not in seen and re.search(r"(?:related party|promoter|key managerial personnel transaction)", text, re.IGNORECASE):
            flags.append({
                "flag_id": f"flg_{uuid.uuid4().hex[:8]}",
                "category": "Governance",
                "severity": "medium",
                "description": "Material related party transactions reported under corporate governance and accounting disclosures.",
                "source_document_id": doc_id,
                "page": page,
                "snippet": text[:200].strip(),
                "confidence": 0.82,
                "trigger": "Related Party Transactions",
            })
            seen.add("related_party")

        # 5. Contingent Liabilities & Legal
        if "litigation" not in seen and re.search(r"(?:contingent liability|litigation|tax demand|disputed liability)", text, re.IGNORECASE):
            flags.append({
                "flag_id": f"flg_{uuid.uuid4().hex[:8]}",
                "category": "Governance",
                "severity": "low",
                "description": "Pending tax proceedings and contingent liabilities disclosed in notes to financial statements.",
                "source_document_id": doc_id,
                "page": page,
                "snippet": text[:200].strip(),
                "confidence": 0.80,
                "trigger": "Contingent Liabilities & Legal Disclosures",
            })
            seen.add("litigation")

    return flags


# Node 5: Persist Red Flags to MongoDB (SAD 7.3.4 & 13.4.6)
def node_store_flags(state: RedFlagAgentState) -> RedFlagAgentState:
    flags = state.get("validated_flags", [])
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "document_id": state["document_id"],
        "workspace_id": state["workspace_id"],
        "red_flags": flags,
        "flags_count": len(flags),
        "status": state.get("status", "complete"),
        "scanned_at": now,
        "updated_at": now
    }

    get_red_flags_collection().update_one(
        {"document_id": state["document_id"]},
        {"$set": doc},
        upsert=True,
    )

    logger.info(f"[Red Flag Agent] Persisted {len(flags)} red flags for '{state['document_id']}' in MongoDB.")
    return state


# ─── Compile LangGraph Red Flag Agent Workflow ──────────────────────────────

def build_red_flag_agent_graph():
    workflow = StateGraph(RedFlagAgentState)

    workflow.add_node("load", node_load_inputs)
    workflow.add_node("heuristics", node_evaluate_heuristics)
    workflow.add_node("llm_scan", node_llm_qualitative_scan)
    workflow.add_node("validate", node_validate_and_dedup)
    workflow.add_node("store", node_store_flags)

    workflow.set_entry_point("load")
    workflow.add_edge("load", "heuristics")
    workflow.add_edge("heuristics", "llm_scan")
    workflow.add_edge("llm_scan", "validate")
    workflow.add_edge("validate", "store")
    workflow.add_edge("store", END)

    return workflow.compile()


red_flag_agent_graph = build_red_flag_agent_graph()


def run_red_flag_agent(document_id: str, workspace_id: str) -> Dict[str, Any]:
    """
    Entry point for the Red Flag Agent.
    Runs after Extraction Agent. Returns SAD 7.3.4 compliant schema.
    """
    initial_state: RedFlagAgentState = {
        "document_id": document_id,
        "workspace_id": workspace_id,
        "metrics": [],
        "risk_chunks": [],
        "heuristic_flags": [],
        "llm_flags": [],
        "validated_flags": [],
        "status": "initialized",
        "error": None,
    }

    final_state = red_flag_agent_graph.invoke(initial_state)

    return {
        "document_id": document_id,
        "workspace_id": workspace_id,
        "status": final_state.get("status", "complete"),
        "red_flags": final_state.get("validated_flags", []),
        "flags_count": len(final_state.get("validated_flags", [])),
        "error": final_state.get("error"),
    }
