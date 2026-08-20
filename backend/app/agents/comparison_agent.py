"""
comparison_agent.py — Comparison Agent (SAD Section 7.4 & FR-CMP-01/02/03)
Powered by LangGraph, MultiProviderLLMClient (Nemotron 3 Ultra -> Gemini -> Groq), and MongoDB Atlas.

Complete Flow:
Selected Document IDs -> Load Extraction + Red Flag Results -> Normalize/Align Metrics & Benchmark ->
Generate Grounded Narrative -> Validate Schema, Citations & Numbers -> Persist to MongoDB 'comparisons'.

Adheres strictly to:
- SAD 7.4.3 (Inputs)
- SAD 7.4.4 (Outputs)
- SAD 7.4.9 (Validation Rules)
- SAD 7.4.10 (Confidence Calculation)
- SAD 7.4.11 (Retry & Provider Fallback)
"""

import os
import re
import json
import uuid
import time
import logging
from datetime import datetime, timezone
from typing import TypedDict, List, Optional, Any, Dict, Set

from langgraph.graph import StateGraph, END
from app.database import get_db, comparisons_col, documents_col
from app.agents.llm_client import get_llm_client, LLMConfig, LLMResponse

logger = logging.getLogger("velsora.comparison_agent")

# Canonical financial metrics with standard display metadata and optimization direction
STANDARD_METRIC_CONFIG = {
    "revenue": {"label": "Total Revenue", "category": "Income", "higher_is_better": True},
    "net_income": {"label": "Net Income (PAT)", "category": "Income", "higher_is_better": True},
    "ebitda": {"label": "EBITDA", "category": "Income", "higher_is_better": True},
    "eps": {"label": "Earnings Per Share (EPS)", "category": "Per Share", "higher_is_better": True},
    "gross_margin": {"label": "Gross Margin", "category": "Profitability", "higher_is_better": True},
    "operating_margin": {"label": "Operating Margin", "category": "Profitability", "higher_is_better": True},
    "roe": {"label": "Return on Equity (ROE)", "category": "Returns", "higher_is_better": True},
    "roa": {"label": "Return on Assets (ROA)", "category": "Returns", "higher_is_better": True},
    "current_ratio": {"label": "Current Ratio", "category": "Liquidity", "higher_is_better": True},
    "debt_to_equity": {"label": "Debt-to-Equity Ratio", "category": "Leverage", "higher_is_better": False},
}

METRIC_ALIASES: Dict[str, str] = {
    "total_revenue": "revenue",
    "total revenue": "revenue",
    "revenue from operations": "revenue",
    "revenue_from_operations": "revenue",
    "sales": "revenue",
    "net_sales": "revenue",
    "net sales": "revenue",
    "topline": "revenue",
    "net_profit": "net_income",
    "net profit": "net_income",
    "pat": "net_income",
    "profit for the year": "net_income",
    "profit_for_the_year": "net_income",
    "profit after tax": "net_income",
    "profit_after_tax": "net_income",
    "operating_profit": "ebitda",
    "operating profit": "ebitda",
    "operating_income": "ebitda",
    "operating income": "ebitda",
    "earnings_per_share": "eps",
    "earnings per share": "eps",
    "basic_eps": "eps",
    "diluted_eps": "eps",
    "debt_equity": "debt_to_equity",
    "debt/equity": "debt_to_equity",
    "debt to equity": "debt_to_equity",
    "debt_to_equity_ratio": "debt_to_equity",
    "current ratio": "current_ratio",
    "gross margin": "gross_margin",
    "operating margin": "operating_margin",
    "return on equity": "roe",
    "return on assets": "roa",
    "return_on_equity": "roe",
    "return_on_assets": "roa",
    "roce": "roe",
}


def normalize_metric_name(raw_name: Any) -> str:
    """Normalizes financial metric names to canonical keys using aliases."""
    if not raw_name:
        return ""
    clean = str(raw_name).strip().lower().replace("-", "_").replace(" ", "_")
    return METRIC_ALIASES.get(clean, METRIC_ALIASES.get(str(raw_name).strip().lower(), clean))


# ─── LangGraph State (SAD 7.4.3 & 7.4.4) ─────────────────────────────────────

class ComparisonAgentState(TypedDict):
    comparison_id: str
    workspace_id: str
    document_ids: List[str]
    loaded_documents: List[Dict[str, Any]]
    extracted_metrics_by_doc: Dict[str, List[Dict[str, Any]]]
    red_flags_by_doc: Dict[str, List[Dict[str, Any]]]
    aligned_table: List[Dict[str, Any]]
    red_flags_summary: List[Dict[str, Any]]
    citations: List[Dict[str, Any]]
    narrative: str
    llm_metadata: Dict[str, Any]
    confidence: float
    grounding_status: str
    status: str
    error: Optional[str]


# ─── Node 1: Load Inputs & Enforce Workspace Isolation (SAD 7.4.3 & FR-CMP-01) ──

def node_load_inputs(state: ComparisonAgentState) -> ComparisonAgentState:
    workspace_id = state["workspace_id"]
    raw_doc_ids = state.get("document_ids", [])

    # Deduplicate document IDs preserving order
    seen_ids: Set[str] = set()
    doc_ids: List[str] = []
    for d_id in raw_doc_ids:
        if d_id and d_id not in seen_ids:
            seen_ids.add(d_id)
            doc_ids.append(d_id)

    state["document_ids"] = doc_ids

    # SAD 7.4.9: At least 2 documents required
    if len(doc_ids) < 2:
        error_msg = f"Comparison requires at least 2 unique documents (provided: {len(doc_ids)})."
        logger.warning(f"[Comparison Agent] {error_msg}")
        state["status"] = "failed"
        state["error"] = error_msg
        return state

    db = get_db()
    docs_col = db["documents"]
    metrics_col = db["extracted_metrics"]
    red_flags_col = db["red_flags"]

    # Verify all documents exist and belong to the authenticated user's workspace (SAD 7.4.14)
    db_docs = list(docs_col.find({"document_id": {"$in": doc_ids}, "workspace_id": workspace_id}))
    found_doc_ids = {d["document_id"] for d in db_docs}

    missing_or_unauthorized = [d_id for d_id in doc_ids if d_id not in found_doc_ids]
    if missing_or_unauthorized:
        error_msg = (
            f"The following document IDs were not found in workspace '{workspace_id}': "
            f"{', '.join(missing_or_unauthorized)}"
        )
        logger.warning(f"[Comparison Agent] {error_msg}")
        state["status"] = "failed"
        state["error"] = error_msg
        return state

    # Maintain original document order
    ordered_docs = sorted(db_docs, key=lambda d: doc_ids.index(d["document_id"]))
    state["loaded_documents"] = ordered_docs

    # Load stored extraction metrics from Extraction Agent
    ext_metrics_map: Dict[str, List[Dict[str, Any]]] = {}
    for d_id in doc_ids:
        rec = metrics_col.find_one({"document_id": d_id})
        ext_metrics_map[d_id] = rec.get("metrics", []) if rec else []

    state["extracted_metrics_by_doc"] = ext_metrics_map

    # Load stored red flag risk findings from Red Flag Agent
    rf_map: Dict[str, List[Dict[str, Any]]] = {}
    for d_id in doc_ids:
        rec = red_flags_col.find_one({"document_id": d_id})
        rf_map[d_id] = rec.get("red_flags", []) if rec else []

    state["red_flags_by_doc"] = rf_map
    state["status"] = "inputs_loaded"
    logger.info(
        f"[Comparison Agent] Successfully loaded {len(ordered_docs)} documents, "
        f"{sum(len(v) for v in ext_metrics_map.values())} extracted metrics, and "
        f"{sum(len(v) for v in rf_map.values())} red flags."
    )
    return state


# ─── Node 2: Align Metrics, Benchmark & Aggregate Red Flags (SAD 7.4.2 & FR-CMP-02) ─

def node_align_and_benchmark(state: ComparisonAgentState) -> ComparisonAgentState:
    if state.get("status") == "failed":
        return state

    doc_ids = state["document_ids"]
    docs_by_id = {d["document_id"]: d for d in state["loaded_documents"]}
    metrics_by_doc = state["extracted_metrics_by_doc"]
    red_flags_by_doc = state["red_flags_by_doc"]

    # 1. Align Financial Metrics across documents using canonical aliases
    all_metric_keys_ordered: List[str] = []
    seen_metric_keys: Set[str] = set()

    # Collect standard metrics first in canonical order
    for sm_key in STANDARD_METRIC_CONFIG:
        for d_id in doc_ids:
            if any(normalize_metric_name(m.get("name", "")) == sm_key for m in metrics_by_doc.get(d_id, [])):
                if sm_key not in seen_metric_keys:
                    seen_metric_keys.add(sm_key)
                    all_metric_keys_ordered.append(sm_key)
                break

    # Append any dynamic non-standard metrics discovered in extractions
    for d_id in doc_ids:
        for m in metrics_by_doc.get(d_id, []):
            norm_k = normalize_metric_name(m.get("name", ""))
            if norm_k and norm_k not in seen_metric_keys:
                seen_metric_keys.add(norm_k)
                all_metric_keys_ordered.append(norm_k)

    aligned_table: List[Dict[str, Any]] = []
    all_citations: List[Dict[str, Any]] = []

    for metric_key in all_metric_keys_ordered:
        config = STANDARD_METRIC_CONFIG.get(metric_key, {
            "label": metric_key.replace("_", " ").title(),
            "category": "Other Metrics",
            "higher_is_better": True
        })

        metric_values: Dict[str, Optional[float]] = {}
        metric_details: Dict[str, Any] = {}
        numeric_candidates: List[tuple] = []  # (doc_id, float_val)
        unit = ""
        period = ""

        for d_id in doc_ids:
            doc_metrics = metrics_by_doc.get(d_id, [])
            candidates = [
                m for m in doc_metrics
                if normalize_metric_name(m.get("name", "")) == metric_key and m.get("value") is not None
            ]

            if candidates:
                # If multiple entries exist, prefer highest confidence or latest reporting period
                matching = max(candidates, key=lambda m: (m.get("confidence", 0.0), str(m.get("period", ""))))
                val = matching.get("value")
                try:
                    val_float = float(val)
                    metric_values[d_id] = val_float
                    numeric_candidates.append((d_id, val_float))
                except (ValueError, TypeError):
                    metric_values[d_id] = None

                unit = unit or matching.get("unit", "")
                period = period or matching.get("period", "")

                detail = {
                    "document_id": d_id,
                    "filename": docs_by_id.get(d_id, {}).get("filename", ""),
                    "value": matching.get("value"),
                    "unit": matching.get("unit", ""),
                    "period": matching.get("period", ""),
                    "page": matching.get("page", 1),
                    "snippet": matching.get("snippet", ""),
                    "confidence": matching.get("confidence", 1.0),
                }
                metric_details[d_id] = detail

                all_citations.append({
                    "document_id": d_id,
                    "filename": docs_by_id.get(d_id, {}).get("filename", ""),
                    "page": matching.get("page", 1),
                    "snippet": matching.get("snippet", "")[:250],
                    "metric": metric_key,
                })
            else:
                metric_values[d_id] = None
                metric_details[d_id] = None

        # Compute Best & Worst Performers and Variance
        best_performer = None
        worst_performer = None
        variance_str = None

        if len(numeric_candidates) >= 2:
            higher_is_better = config.get("higher_is_better", True)
            sorted_candidates = sorted(numeric_candidates, key=lambda x: x[1], reverse=higher_is_better)
            best_performer = sorted_candidates[0][0]
            worst_performer = sorted_candidates[-1][0]

            val_best = sorted_candidates[0][1]
            val_worst = sorted_candidates[-1][1]
            if val_worst != 0:
                diff_pct = ((val_best - val_worst) / abs(val_worst)) * 100
                variance_str = f"{diff_pct:+.1f}%"

        aligned_table.append({
            "metric": metric_key,
            "metric_label": config["label"],
            "category": config["category"],
            "unit": unit,
            "period": period,
            "values": metric_values,
            "details": metric_details,
            "best_performer": best_performer,
            "worst_performer": worst_performer,
            "variance": variance_str,
        })

    # 2. Aggregate Red Flags across companies by Category
    categories = ["Liquidity", "Profitability", "Operational", "Governance", "Market"]
    red_flags_summary: List[Dict[str, Any]] = []

    for cat in categories:
        flags_by_doc: Dict[str, List[Dict[str, Any]]] = {}
        total_cat_flags = 0

        for d_id in doc_ids:
            doc_rfs = [rf for rf in red_flags_by_doc.get(d_id, []) if str(rf.get("category", "")).strip().title() == cat]
            flags_by_doc[d_id] = doc_rfs
            total_cat_flags += len(doc_rfs)

            for rf in doc_rfs:
                if rf.get("page"):
                    all_citations.append({
                        "document_id": d_id,
                        "filename": docs_by_id.get(d_id, {}).get("filename", ""),
                        "page": rf.get("page", 1),
                        "snippet": rf.get("snippet", "")[:250],
                        "category": cat,
                    })

        if total_cat_flags > 0:
            red_flags_summary.append({
                "category": cat,
                "total_count": total_cat_flags,
                "flags_by_document": flags_by_doc,
            })

    state["aligned_table"] = aligned_table
    state["red_flags_summary"] = red_flags_summary
    state["citations"] = all_citations
    state["status"] = "aligned"
    logger.info(f"[Comparison Agent] Aligned {len(aligned_table)} metrics and {len(red_flags_summary)} risk categories.")
    return state


# ─── Node 3: Generate Grounded Comparative Narrative (SAD 7.4.6 & FR-CMP-03) ───

def node_generate_narrative(state: ComparisonAgentState) -> ComparisonAgentState:
    if state.get("status") == "failed":
        return state

    docs_by_id = {d["document_id"]: d for d in state["loaded_documents"]}
    aligned_table = state["aligned_table"]
    red_flags_summary = state["red_flags_summary"]
    doc_ids = state["document_ids"]

    # Build concise, grounded structured prompt context
    doc_manifest_lines = []
    for d_id in doc_ids:
        d = docs_by_id.get(d_id, {})
        fname = d.get("filename", d_id)
        doc_manifest_lines.append(f"- **{fname}** (ID: `{d_id}`)")

    table_lines = []
    for row in aligned_table:
        vals_str = []
        for d_id in doc_ids:
            v = row["values"].get(d_id)
            d_name = docs_by_id.get(d_id, {}).get("filename", d_id).split(".")[0]
            det = row["details"].get(d_id)
            p_str = f" (p.{det.get('page')})" if det and det.get("page") else ""
            vals_str.append(f"{d_name}: {v if v is not None else 'N/A'}{row['unit']}{p_str}")

        table_lines.append(f"- **{row['metric_label']}** [{row['category']}]: " + " | ".join(vals_str))

    risk_lines = []
    for rf_cat in red_flags_summary:
        risk_lines.append(f"### {rf_cat['category']} Risks:")
        for d_id, flags in rf_cat["flags_by_document"].items():
            d_name = docs_by_id.get(d_id, {}).get("filename", d_id).split(".")[0]
            if flags:
                for f in flags:
                    p_str = f" (p.{f.get('page')})" if f.get("page") else ""
                    risk_lines.append(f"  - [{d_name}] {f.get('title', 'Risk')} [{f.get('severity', 'medium').upper()}]: {f.get('description', '')}{p_str}")

    prompt = f"""You are a senior financial analyst and multi-agent synthesis agent.
Synthesize a comprehensive, executive-level comparative financial research report comparing the following companies based strictly on the verified metrics and red flags provided below.

### Compared Companies:
{chr(10).join(doc_manifest_lines)}

### Verified Extracted Financial Metrics:
{chr(10).join(table_lines) if table_lines else "No standard metrics extracted."}

### Verified Red Flags & Risk Disclosures:
{chr(10).join(risk_lines) if risk_lines else "No critical red flags detected."}

### STRICT GROUNDING RULES:
1. Base all statements, comparisons, and assessments ONLY on the data above.
2. DO NOT fabricate, guess, or assume metrics, numbers, or facts not present in the excerpts.
3. Highlight key financial divergences (Revenue scale, Margins, Leverage/Solvency, Returns).
4. Contrast the risk profile between the companies using the provided Red Flags.
5. Provide actionable synthesis for equity / credit analysts.
6. Format cleanly using markdown headers, bullet points, and exact source references.

Write a structured comparative synthesis (Executive Summary, Financial & Operating Performance Benchmark, Risk & Governance Assessment, Strategic Conclusion):"""

    llm_client = get_llm_client()
    config = LLMConfig(
        temperature=0.1,
        max_tokens=2048,
        reasoning_effort="low",
        reasoning_budget=1024,
        system_prompt=(
            "You are a conservative financial analyst performing multi-company benchmarking. "
            "You must strictly ground every claim in the provided verified data without hallucination."
        ),
    )

    try:
        logger.info("[Comparison Agent] Invoking multi-provider LLM chain for comparative narrative...")
        start_time = time.time()
        response: LLMResponse = llm_client.generate(prompt, config=config, use_cache=True)
        elapsed = time.time() - start_time

        state["narrative"] = response.content
        state["llm_metadata"] = {
            "provider": response.provider,
            "model": response.model,
            "tokens_used": response.tokens_used,
            "elapsed_seconds": round(elapsed, 3),
            "is_fallback": response.is_fallback,
            "fallback_reason": response.fallback_reason,
        }
        state["status"] = "narrative_generated"
        logger.info(
            f"[Comparison Agent] Narrative generated via {response.provider} ({response.model}) "
            f"in {elapsed:.2f}s."
        )
    except Exception as e:
        logger.warning(f"[Comparison Agent] LLM narrative generation failed: {e}. Generating deterministic summary.")
        # Fallback to code-driven narrative per SAD 7.4.13
        fallback_narrative = (
            f"### Side-by-Side Financial Benchmark Summary\n\n"
            f"Comparing {len(doc_ids)} corporate filings across {len(aligned_table)} financial dimensions.\n\n"
            f"- **Metrics Aligned:** {len(aligned_table)} verified financial metrics.\n"
            f"- **Risk Disclosures:** {len(red_flags_summary)} risk categories evaluated.\n\n"
            f"Please refer to the structured benchmark table below for detailed itemized metric comparisons."
        )
        state["narrative"] = fallback_narrative
        state["llm_metadata"] = {
            "provider": "deterministic_fallback",
            "model": "rule_based_synthesis",
            "tokens_used": 0,
            "elapsed_seconds": 0.0,
            "is_fallback": True,
            "fallback_reason": str(e),
        }
        state["status"] = "narrative_generated"

    return state


# ─── Node 4: Validate Grounding, Schema & Confidence Score (SAD 7.4.9 & 7.4.10) ─

def node_validate_and_score(state: ComparisonAgentState) -> ComparisonAgentState:
    if state.get("status") == "failed":
        return state

    aligned_table = state["aligned_table"]
    doc_ids = state["document_ids"]
    citations = state["citations"]

    # 1. Schema Validation (SAD 7.4.4)
    required_table_keys = {"metric", "metric_label", "category", "values", "details"}
    for idx, row in enumerate(aligned_table):
        missing_keys = required_table_keys - set(row.keys())
        if missing_keys:
            logger.warning(f"[Comparison Agent] Row {idx} missing table keys: {missing_keys}")

    # 2. Numerical Consistency Validation
    for row in aligned_table:
        m_vals = [v for v in row["values"].values() if v is not None]
        if len(m_vals) >= 2 and row.get("best_performer") and row.get("worst_performer"):
            best_val = row["values"].get(row["best_performer"])
            worst_val = row["values"].get(row["worst_performer"])
            higher_is_better = STANDARD_METRIC_CONFIG.get(row["metric"], {}).get("higher_is_better", True)
            if higher_is_better and best_val is not None and worst_val is not None:
                if best_val < worst_val:
                    logger.warning(f"[Comparison Agent] Inconsistent best/worst values for {row['metric']}")

    # 3. Citation Validity Verification
    valid_citations = [c for c in citations if c.get("document_id") in doc_ids and c.get("snippet")]

    # 4. Data Completeness Calculation (SAD 7.4.10)
    total_cells = max(1, len(aligned_table) * len(doc_ids))
    filled_cells = sum(
        1 for row in aligned_table for d_id in doc_ids if row["values"].get(d_id) is not None
    )
    data_completeness = min(1.0, filled_cells / total_cells)

    # 5. Citation Coverage Calculation
    citation_coverage = 1.0 if len(valid_citations) >= len(aligned_table) else (len(valid_citations) / max(1, len(aligned_table)))
    citation_coverage = min(1.0, max(0.5, citation_coverage))

    # 6. Final Grounding Confidence Score per SAD 7.4.10:
    # confidence = data_completeness * 0.5 + narrative_citation_coverage * 0.5
    confidence = round(data_completeness * 0.5 + citation_coverage * 0.5, 4)

    state["confidence"] = confidence
    state["grounding_status"] = "grounded" if confidence >= 0.70 else "partially_grounded"
    state["status"] = "validated"

    logger.info(
        f"[Comparison Agent] Validation complete — Completeness: {data_completeness:.2%}, "
        f"Citation Coverage: {citation_coverage:.2%}, Confidence: {confidence:.2%}, "
        f"Status: {state['grounding_status']}"
    )
    return state


# ─── Node 5: Persist Comparison to MongoDB (SAD 7.4.4 & 13.4.7) ───────────────

def node_persist_results(state: ComparisonAgentState) -> ComparisonAgentState:
    if state.get("status") == "failed":
        return state

    now = datetime.now(timezone.utc).isoformat()
    db_doc = {
        "comparison_id": state["comparison_id"],
        "workspace_id": state["workspace_id"],
        "document_ids": state["document_ids"],
        "documents": [
            {
                "document_id": d["document_id"],
                "filename": d.get("filename", ""),
                "file_type": d.get("file_type", "pdf"),
                "total_pages": d.get("total_pages", 1),
                "size_kb": d.get("size_kb", 0),
            }
            for d in state["loaded_documents"]
        ],
        "table": state["aligned_table"],
        "narrative": state["narrative"],
        "red_flags_summary": state["red_flags_summary"],
        "citations": state["citations"],
        "confidence": state["confidence"],
        "grounding_status": state["grounding_status"],
        "llm_metadata": state["llm_metadata"],
        "created_at": now,
        "updated_at": now,
    }

    try:
        comparisons_col().update_one(
            {"comparison_id": state["comparison_id"]},
            {"$set": db_doc},
            upsert=True,
        )
        logger.info(f"[Comparison Agent] Persisted comparison record '{state['comparison_id']}' in MongoDB.")
    except Exception as e:
        logger.error(f"[Comparison Agent] Failed to persist comparison to MongoDB: {e}")

    state["status"] = "complete"
    return state


# ─── Build LangGraph Workflow ────────────────────────────────────────────────

def build_comparison_agent_graph():
    workflow = StateGraph(ComparisonAgentState)

    workflow.add_node("load_inputs", node_load_inputs)
    workflow.add_node("align_and_benchmark", node_align_and_benchmark)
    workflow.add_node("generate_narrative", node_generate_narrative)
    workflow.add_node("validate_and_score", node_validate_and_score)
    workflow.add_node("persist_results", node_persist_results)

    workflow.set_entry_point("load_inputs")
    workflow.add_edge("load_inputs", "align_and_benchmark")
    workflow.add_edge("align_and_benchmark", "generate_narrative")
    workflow.add_edge("generate_narrative", "validate_and_score")
    workflow.add_edge("validate_and_score", "persist_results")
    workflow.add_edge("persist_results", END)

    return workflow.compile()


comparison_agent_graph = build_comparison_agent_graph()


# ─── Public API Entry Point (SAD 7.4.3 & 7.4.4) ──────────────────────────────

def run_comparison_agent(
    workspace_id: str,
    document_ids: List[str],
    comparison_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes the Comparison Agent (SAD 7.4).
    Cross-references extracted financial metrics and red flags from 2+ documents,
    computes best/worst performers, generates a grounded narrative, and persists to MongoDB.
    """
    cmp_id = comparison_id or f"cmp_{uuid.uuid4().hex[:10]}"

    initial_state: ComparisonAgentState = {
        "comparison_id": cmp_id,
        "workspace_id": workspace_id,
        "document_ids": document_ids,
        "loaded_documents": [],
        "extracted_metrics_by_doc": {},
        "red_flags_by_doc": {},
        "aligned_table": [],
        "red_flags_summary": [],
        "citations": [],
        "narrative": "",
        "llm_metadata": {},
        "confidence": 0.0,
        "grounding_status": "unverified",
        "status": "initialized",
        "error": None,
    }

    logger.info(f"[Comparison Agent] Starting execution for comparison '{cmp_id}' ({len(document_ids)} docs)...")
    final_state = comparison_agent_graph.invoke(initial_state)

    if final_state.get("error"):
        return {
            "comparison_id": cmp_id,
            "workspace_id": workspace_id,
            "document_ids": document_ids,
            "status": "failed",
            "error": final_state.get("error"),
            "table": [],
            "narrative": "",
            "citations": [],
            "confidence": 0.0,
            "grounding_status": "unverified",
        }

    return {
        "comparison_id": cmp_id,
        "workspace_id": workspace_id,
        "document_ids": final_state["document_ids"],
        "documents": [
            {
                "document_id": d["document_id"],
                "filename": d.get("filename", ""),
                "file_type": d.get("file_type", "pdf"),
                "total_pages": d.get("total_pages", 1),
                "size_kb": d.get("size_kb", 0),
            }
            for d in final_state.get("loaded_documents", [])
        ],
        "table": final_state.get("aligned_table", []),
        "narrative": final_state.get("narrative", ""),
        "red_flags_summary": final_state.get("red_flags_summary", []),
        "citations": final_state.get("citations", []),
        "confidence": final_state.get("confidence", 1.0),
        "grounding_status": final_state.get("grounding_status", "grounded"),
        "llm_metadata": final_state.get("llm_metadata", {}),
        "status": "completed",
    }
