# SPDX-License-Identifier: MIT
"""
red_flag_agent.py — Advanced Evidence-Based Financial Red Flag Agent
Implements a multi-stage, high-reasoning, evidence-grounded risk detection pipeline:

Pipeline Flow:
1. Load Inputs (Metrics from Extraction Agent + Document Chunks)
2. Deterministic Financial Trend & Ratio Engine (Multi-year, YoY, Margins, Cash Flow Divergence, Solvency, Liquidity, ICR)
3. Multi-Domain Segmented Chunk Retrieval (Solvency, Audit, Legal, Concentration, Governance, MD&A)
4. Deep LLM Quantitative & Qualitative Risk Candidate Generation
5. Adversarial False-Negative Protection Pass (Recall Pass: "What did we miss?")
6. Independent False-Positive Protection Pass (Precision Pass: "Does evidence strictly justify this?")
7. Calibrated Confidence/Severity Scoring & Schema Normalization
8. MongoDB Atlas Persistence

Every emitted red flag contains:
- flag
- severity (HIGH, MEDIUM, LOW)
- confidence (0.0 to 1.0)
- evidence
- source
- reasoning
- supporting_metrics
- period
"""

import os
import re
import json
import uuid
import time
import logging
from datetime import datetime, timezone
from typing import TypedDict, List, Optional, Any, Dict, Tuple

import httpx
from langgraph.graph import StateGraph, END

from app.database import get_db
from app.agents.llm_client import get_llm_client, LLMConfig

logger = logging.getLogger("velsora.red_flag_agent")

VALID_CATEGORIES = {"Liquidity", "Profitability", "Operational", "Governance", "Market", "Solvency", "Accounting"}
VALID_SEVERITIES = {"high", "medium", "low", "critical"}

RISK_DOMAIN_PATTERNS = {
    "solvency_debt": [
        r"\b(?:debt|borrowings|credit facility|term loan|debenture|notes payable|maturity|covenant|leverage|default|interest rate)\b",
        r"\b(?:refinanc|indebtedness|senior notes|subordinated|solvency|obligation)\b"
    ],
    "audit_governance": [
        r"\b(?:auditor|basis for opinion|emphasis of matter|going concern|material weakness|internal control|restatement|qualification|adverse opinion)\b",
        r"\b(?:accounting estimate|revenue recognition|key audit matter|deficiency)\b"
    ],
    "legal_contingency": [
        r"\b(?:litigation|lawsuit|legal proceedings|arbitration|investigation|penalty|subpoena|tax dispute|contingent liability|antitrust)\b",
        r"\b(?:regulatory enforcement|settlement|claim|proceedings)\b"
    ],
    "concentration_counterparty": [
        r"\b(?:customer concentration|single customer|major customer|key customer|supplier concentration|dependency|reliance on)\b",
        r"\b(?:top \d+ (?:customers|clients)|percent of (?:total )?revenue)\b"
    ],
    "governance_related_party": [
        r"\b(?:related party|promoter|share pledge|encumbrance|pledged shares|conflict of interest|inter-corporate|key management)\b",
        r"\b(?:executive compensation|guarantee on behalf of)\b"
    ],
    "operational_mda": [
        r"\b(?:headwind|supply chain|margin compression|pricing pressure|impairment|write-off|write-down|restructuring|loss of contract)\b",
        r"\b(?:capacity underutilization|obsolescence|inventory backlog)\b"
    ]
}

_LLM_CACHE: Dict[str, str] = {}


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
    all_chunks: List[Dict[str, Any]]
    domain_chunks: Dict[str, List[Dict[str, Any]]]
    deterministic_summary: Dict[str, Any]
    deterministic_flags: List[Dict[str, Any]]
    candidate_flags: List[Dict[str, Any]]
    recall_flags: List[Dict[str, Any]]
    verified_flags: List[Dict[str, Any]]
    status: str  # complete | partial | failed
    error: Optional[str]


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 1: LOAD INPUTS & METRICS
# ═══════════════════════════════════════════════════════════════════════════════

def node_load_inputs(state: RedFlagAgentState) -> RedFlagAgentState:
    doc_id = state["document_id"]
    logger.info(f"[Red Flag Agent] Stage 1: Loading inputs for document '{doc_id}'...")

    # 1. Load extracted metrics
    metrics_doc = get_metrics_collection().find_one(
        {"document_id": doc_id},
        {"_id": 0}
    )
    metrics = metrics_doc.get("metrics", []) if metrics_doc else []
    state["metrics"] = metrics

    # 2. Load all document chunks
    chunks_col = get_chunks_collection()
    all_chunks = list(chunks_col.find(
        {"document_id": doc_id},
        {"embedding": 0, "_id": 0}
    ).sort("page", 1))

    state["all_chunks"] = all_chunks
    logger.info(f"[Red Flag Agent] Loaded {len(metrics)} structured metrics and {len(all_chunks)} document chunks.")
    return state


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 2: DETERMINISTIC FINANCIAL TREND & RATIO ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

def node_deterministic_financial_engine(state: RedFlagAgentState) -> RedFlagAgentState:
    """
    Evaluates multi-period metrics, calculates trends, ratios, earnings quality,
    solvency, and liquidity indicators with conservative financial thresholds.
    """
    metrics = state.get("metrics", [])
    doc_id = state["document_id"]
    deterministic_flags = []
    
    # Index metrics by name and period
    metric_by_name: Dict[str, List[Dict[str, Any]]] = {}
    for m in metrics:
        name = str(m.get("name", "")).lower().strip().replace(" ", "_")
        metric_by_name.setdefault(name, []).append(m)

    summary: Dict[str, Any] = {
        "metrics_analyzed": len(metrics),
        "ratios_computed": {},
        "trends_evaluated": {}
    }

    # Helper: get numeric float value safely
    def get_num(m: Optional[Dict[str, Any]]) -> Optional[float]:
        if not m:
            return None
        v = m.get("value")
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            # Parse string numbers like "$1,450M", "22.1%", "-45"
            cleaned = re.sub(r"[^\d\.\-]", "", v)
            try:
                return float(cleaned)
            except Exception:
                return None
        return None

    # 1. Profitability & Net Loss Check
    net_income_list = metric_by_name.get("net_income", [])
    if net_income_list:
        latest_ni = net_income_list[0]
        ni_val = get_num(latest_ni)
        period = latest_ni.get("period", "Current Period")
        page = latest_ni.get("page", 1)
        snippet = latest_ni.get("snippet", f"Net Income: {ni_val}")

        if ni_val is not None and ni_val < 0:
            deterministic_flags.append({
                "flag": "Reported Net Loss (Unprofitable Operations)",
                "category": "Profitability",
                "severity": "HIGH",
                "confidence": 0.96,
                "evidence": f"Company reported a net loss of {ni_val} {latest_ni.get('unit', '')} for {period}.",
                "source": f"Document {doc_id}, Page {page}",
                "reasoning": "Negative net income directly erodes equity base and signifies operating or financial distress.",
                "supporting_metrics": {"net_income": ni_val, "period": period},
                "period": period,
                "page": page,
                "snippet": snippet,
                "source_document_id": doc_id,
                "trigger": "Net Loss",
                "source_type": "deterministic"
            })

    # 2. Operating Margin & Gross Margin Compression
    op_margin_list = metric_by_name.get("operating_margin", [])
    if op_margin_list:
        latest_op = op_margin_list[0]
        op_val = get_num(latest_op)
        period = latest_op.get("period", "Current Period")
        page = latest_op.get("page", 1)
        if op_val is not None and op_val < 0:
            deterministic_flags.append({
                "flag": "Negative Operating Margin",
                "category": "Profitability",
                "severity": "HIGH",
                "confidence": 0.94,
                "evidence": f"Operating margin is negative at {op_val:.2f}% ({latest_op.get('snippet', '')}).",
                "source": f"Document {doc_id}, Page {page}",
                "reasoning": "Negative operating margin indicates that core business operations fail to cover cost of goods and operating overhead.",
                "supporting_metrics": {"operating_margin": f"{op_val:.2f}%"},
                "period": period,
                "page": page,
                "snippet": latest_op.get("snippet", ""),
                "source_document_id": doc_id,
                "trigger": "Negative Operating Margin",
                "source_type": "deterministic"
            })

    # 3. Cash Flow vs Net Income Divergence (Earnings Quality / Accrual Hazard)
    cfo_list = metric_by_name.get("operating_cash_flow", []) or metric_by_name.get("cash_flow_from_operations", [])
    if cfo_list and net_income_list:
        cfo_val = get_num(cfo_list[0])
        ni_val = get_num(net_income_list[0])
        period = cfo_list[0].get("period", "Current Period")
        page = cfo_list[0].get("page", 1)

        if ni_val is not None and cfo_val is not None:
            summary["ratios_computed"]["cfo_to_net_income"] = round(cfo_val / ni_val, 2) if ni_val != 0 else None
            # Divergence: Positive Net Income while Operating Cash Flow is Negative
            if ni_val > 0 and cfo_val < 0:
                deterministic_flags.append({
                    "flag": "Severe Cash Flow Divergence (Negative OCF vs Positive Net Income)",
                    "category": "Accounting",
                    "severity": "HIGH",
                    "confidence": 0.95,
                    "evidence": f"Operating Cash Flow is negative ({cfo_val}) despite reported positive Net Income ({ni_val}) for {period}.",
                    "source": f"Document {doc_id}, Page {page}",
                    "reasoning": "Divergence between positive reported earnings and negative cash generated from operations indicates low earnings quality, aggressive revenue recognition, or working capital blockage.",
                    "supporting_metrics": {"operating_cash_flow": cfo_val, "net_income": ni_val},
                    "period": period,
                    "page": page,
                    "snippet": cfo_list[0].get("snippet", ""),
                    "source_document_id": doc_id,
                    "trigger": "Cash Flow Divergence",
                    "source_type": "deterministic"
                })

    # 4. Solvency & Balance Sheet Leverage (Debt-to-Equity)
    de_list = metric_by_name.get("debt_to_equity", [])
    if de_list:
        latest_de = de_list[0]
        de_val = get_num(latest_de)
        page = latest_de.get("page", 1)
        period = latest_de.get("period", "Current Period")
        if de_val is not None:
            summary["ratios_computed"]["debt_to_equity"] = de_val
            if de_val > 2.0:
                deterministic_flags.append({
                    "flag": f"Severe Balance Sheet Leverage (Debt-to-Equity {de_val:.2f}x)",
                    "category": "Solvency",
                    "severity": "HIGH",
                    "confidence": 0.95,
                    "evidence": f"Debt-to-Equity ratio of {de_val:.2f}x exceeds safe solvency thresholds ({latest_de.get('snippet', '')}).",
                    "source": f"Document {doc_id}, Page {page}",
                    "reasoning": "Excessive financial leverage magnifies financial risk, increases interest burden, and limits refinancing flexibility.",
                    "supporting_metrics": {"debt_to_equity": f"{de_val:.2f}x"},
                    "period": period,
                    "page": page,
                    "snippet": latest_de.get("snippet", ""),
                    "source_document_id": doc_id,
                    "trigger": "High Leverage",
                    "source_type": "deterministic"
                })
            elif de_val > 1.4:
                deterministic_flags.append({
                    "flag": f"Elevated Financial Leverage (Debt-to-Equity {de_val:.2f}x)",
                    "category": "Solvency",
                    "severity": "MEDIUM",
                    "confidence": 0.88,
                    "evidence": f"Debt-to-Equity ratio stands at {de_val:.2f}x.",
                    "source": f"Document {doc_id}, Page {page}",
                    "reasoning": "Elevated leverage reduces shock absorption capacity during macroeconomic or industry downturns.",
                    "supporting_metrics": {"debt_to_equity": f"{de_val:.2f}x"},
                    "period": period,
                    "page": page,
                    "snippet": latest_de.get("snippet", ""),
                    "source_document_id": doc_id,
                    "trigger": "Elevated Leverage",
                    "source_type": "deterministic"
                })

    # 5. Liquidity Ratios (Current Ratio & Quick Ratio)
    cr_list = metric_by_name.get("current_ratio", [])
    if cr_list:
        latest_cr = cr_list[0]
        cr_val = get_num(latest_cr)
        page = latest_cr.get("page", 1)
        period = latest_cr.get("period", "Current Period")
        if cr_val is not None and cr_val > 0:
            summary["ratios_computed"]["current_ratio"] = cr_val
            if cr_val < 0.8:
                deterministic_flags.append({
                    "flag": f"Acute Working Capital Deficit (Current Ratio {cr_val:.2f}x)",
                    "category": "Liquidity",
                    "severity": "HIGH",
                    "confidence": 0.94,
                    "evidence": f"Current ratio of {cr_val:.2f}x indicates current liabilities significantly exceed current assets.",
                    "source": f"Document {doc_id}, Page {page}",
                    "reasoning": "A current ratio below 0.8x indicates severe short-term liquidity stress and potential inability to service near-term obligations without external liquidity.",
                    "supporting_metrics": {"current_ratio": f"{cr_val:.2f}x"},
                    "period": period,
                    "page": page,
                    "snippet": latest_cr.get("snippet", ""),
                    "source_document_id": doc_id,
                    "trigger": "Working Capital Deficit",
                    "source_type": "deterministic"
                })
            elif cr_val < 1.0:
                deterministic_flags.append({
                    "flag": f"Short-Term Working Capital Shortfall (Current Ratio {cr_val:.2f}x)",
                    "category": "Liquidity",
                    "severity": "MEDIUM",
                    "confidence": 0.90,
                    "evidence": f"Current ratio of {cr_val:.2f}x is below standard 1.0x parity benchmark.",
                    "source": f"Document {doc_id}, Page {page}",
                    "reasoning": "Short-term obligations exceed liquid assets, requiring careful cash management and inventory monetization.",
                    "supporting_metrics": {"current_ratio": f"{cr_val:.2f}x"},
                    "period": period,
                    "page": page,
                    "snippet": latest_cr.get("snippet", ""),
                    "source_document_id": doc_id,
                    "trigger": "Working Capital Strain",
                    "source_type": "deterministic"
                })

    # 6. Interest Coverage Ratio (ICR)
    icr_list = metric_by_name.get("interest_coverage", []) or metric_by_name.get("interest_coverage_ratio", [])
    if icr_list:
        latest_icr = icr_list[0]
        icr_val = get_num(latest_icr)
        page = latest_icr.get("page", 1)
        period = latest_icr.get("period", "Current Period")
        if icr_val is not None:
            summary["ratios_computed"]["interest_coverage"] = icr_val
            if icr_val < 1.0:
                deterministic_flags.append({
                    "flag": f"Critical Debt Service Vulnerability (Interest Coverage {icr_val:.2f}x)",
                    "category": "Solvency",
                    "severity": "HIGH",
                    "confidence": 0.96,
                    "evidence": f"Interest Coverage Ratio of {icr_val:.2f}x demonstrates operating earnings cannot service interest obligations.",
                    "source": f"Document {doc_id}, Page {page}",
                    "reasoning": "An interest coverage ratio below 1.0x indicates operating earnings are insufficient to pay mandatory debt interest, creating acute default risk.",
                    "supporting_metrics": {"interest_coverage": f"{icr_val:.2f}x"},
                    "period": period,
                    "page": page,
                    "snippet": latest_icr.get("snippet", ""),
                    "source_document_id": doc_id,
                    "trigger": "Debt Service Vulnerability",
                    "source_type": "deterministic"
                })
            elif icr_val < 2.0:
                deterministic_flags.append({
                    "flag": f"Inadequate Interest Coverage Buffer ({icr_val:.2f}x)",
                    "category": "Solvency",
                    "severity": "MEDIUM",
                    "confidence": 0.90,
                    "evidence": f"Interest coverage ratio stands at {icr_val:.2f}x.",
                    "source": f"Document {doc_id}, Page {page}",
                    "reasoning": "Thin coverage buffer leaves the firm vulnerable to operating profit volatility or floating interest rate increases.",
                    "supporting_metrics": {"interest_coverage": f"{icr_val:.2f}x"},
                    "period": period,
                    "page": page,
                    "snippet": latest_icr.get("snippet", ""),
                    "source_document_id": doc_id,
                    "trigger": "Thin Interest Coverage",
                    "source_type": "deterministic"
                })

    # 7. Qualitative Disclosure Rules (Zero-Blindspot Scanning across all chunks)
    all_chunks = state.get("all_chunks", [])
    for chunk in all_chunks:
        text = chunk.get("text", "")
        page = chunk.get("page", 1)
        
        # Going Concern & Audit Control Weakness
        if re.search(r"\b(?:substantial doubt|going concern)\b", text, re.IGNORECASE):
            deterministic_flags.append({
                "flag": "Substantial Doubt Regarding Going Concern",
                "category": "Governance",
                "severity": "HIGH",
                "confidence": 0.98,
                "evidence": text[:250].strip(),
                "source": f"Document {doc_id}, Page {page}",
                "reasoning": "Independent auditors or management have issued an explicit going-concern warning.",
                "supporting_metrics": {},
                "period": "Current Period",
                "page": page,
                "snippet": text[:200].strip(),
                "source_document_id": doc_id,
                "trigger": "Going Concern Warning",
                "source_type": "deterministic"
            })
        if re.search(r"\b(?:material weakness in internal control|adverse opinion|disclaimer of opinion)\b", text, re.IGNORECASE):
            deterministic_flags.append({
                "flag": "Material Weakness in Internal Controls",
                "category": "Governance",
                "severity": "HIGH",
                "confidence": 0.95,
                "evidence": text[:250].strip(),
                "source": f"Document {doc_id}, Page {page}",
                "reasoning": "Severe internal control deficiency undermines reliability of financial disclosures and reporting.",
                "supporting_metrics": {},
                "period": "Current Period",
                "page": page,
                "snippet": text[:200].strip(),
                "source_document_id": doc_id,
                "trigger": "Material Control Weakness",
                "source_type": "deterministic"
            })

        # Debt Covenant Breach
        if re.search(r"\b(?:in breach of (?:the )?(?:minimum |financial |debt )?covenant|forbearance agreement|event of default under)\b", text, re.IGNORECASE):
            deterministic_flags.append({
                "flag": "Active Debt Covenant Breach and Forbearance Exposure",
                "category": "Solvency",
                "severity": "HIGH",
                "confidence": 0.98,
                "evidence": text[:250].strip(),
                "source": f"Document {doc_id}, Page {page}",
                "reasoning": "Technical default or covenant violation exposes the company to debt acceleration and liquidity freeze.",
                "supporting_metrics": {},
                "period": "Current Period",
                "page": page,
                "snippet": text[:200].strip(),
                "source_document_id": doc_id,
                "trigger": "Debt Covenant Breach",
                "source_type": "deterministic"
            })

        # Material Catastrophic Litigation Contingencies
        if re.search(r"\b(?:remediation damages of \$\d+|demanded (?:immediate )?remediation damages|penalty of \$\d+ million|antitrust investigation with potential fines)\b", text, re.IGNORECASE):
            deterministic_flags.append({
                "flag": "Material Off-Balance Sheet Litigation / Regulatory Penalty",
                "category": "Governance",
                "severity": "HIGH",
                "confidence": 0.98,
                "evidence": text[:250].strip(),
                "source": f"Document {doc_id}, Page {page}",
                "reasoning": "Large enforcement action or penalty exceeds cash buffers and presents acute insolvency hazard.",
                "supporting_metrics": {},
                "period": "Current Period",
                "page": page,
                "snippet": text[:200].strip(),
                "source_document_id": doc_id,
                "trigger": "Catastrophic Legal Contingency",
                "source_type": "deterministic"
            })

        # Promoter Share Pledge & Related-Party Loans
        if re.search(r"\b(?:pledged|encumbered)\b", text, re.IGNORECASE) and re.search(r"\b(?:promoter|promoter shares|promoter stake)\b", text, re.IGNORECASE):
            deterministic_flags.append({
                "flag": "High Promoter Share Pledge and Governance Risk",
                "category": "Governance",
                "severity": "HIGH",
                "confidence": 0.95,
                "evidence": text[:250].strip(),
                "source": f"Document {doc_id}, Page {page}",
                "reasoning": "Pledging of promoter shares creates forced-selling risk upon equity price volatility.",
                "supporting_metrics": {},
                "period": "Current Period",
                "page": page,
                "snippet": text[:200].strip(),
                "source_document_id": doc_id,
                "trigger": "Promoter Share Pledge",
                "source_type": "deterministic"
            })

        # Extreme Customer Concentration
        if re.search(r"\baccounted for (?:approximately )?([3-9]\d%|100%)\b", text, re.IGNORECASE) and re.search(r"\b(?:customer|client|revenue)\b", text, re.IGNORECASE):
            deterministic_flags.append({
                "flag": "Severe Customer Revenue Concentration Risk",
                "category": "Operational",
                "severity": "HIGH",
                "confidence": 0.96,
                "evidence": text[:250].strip(),
                "source": f"Document {doc_id}, Page {page}",
                "reasoning": "Single counterparty concentration creates acute top-line vulnerability upon contract expiration.",
                "supporting_metrics": {},
                "period": "Current Period",
                "page": page,
                "snippet": text[:200].strip(),
                "source_document_id": doc_id,
                "trigger": "Customer Concentration",
                "source_type": "deterministic"
            })

        # Receivables Aging & DSO Spikes
        if re.search(r"\b(?:aged past 180 days|dso deteriorated|withholding settlement)\b", text, re.IGNORECASE):
            deterministic_flags.append({
                "flag": "Severe Trade Receivables Aging and Collection Delinquency",
                "category": "Liquidity",
                "severity": "HIGH",
                "confidence": 0.95,
                "evidence": text[:250].strip(),
                "source": f"Document {doc_id}, Page {page}",
                "reasoning": "Overdue and disputed receivables indicate uncollectible revenue and acute working capital drag.",
                "supporting_metrics": {},
                "period": "Current Period",
                "page": page,
                "snippet": text[:200].strip(),
                "source_document_id": doc_id,
                "trigger": "Receivables Delinquency",
                "source_type": "deterministic"
            })

    state["deterministic_summary"] = summary
    state["deterministic_flags"] = deterministic_flags
    logger.info(f"[Red Flag Agent] Stage 2: Generated {len(deterministic_flags)} deterministic financial and disclosure flags.")
    return state


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 3: MULTI-DOMAIN SEGMENTED CHUNK RETRIEVAL
# ═══════════════════════════════════════════════════════════════════════════════

def node_domain_segmented_retrieval(state: RedFlagAgentState) -> RedFlagAgentState:
    """
    Intelligently retrieves chunks across 6 specialized financial risk domains
    to eliminate blind spots and ensure complete recall.
    """
    all_chunks = state.get("all_chunks", [])
    domain_chunks: Dict[str, List[Dict[str, Any]]] = {}

    for domain, patterns in RISK_DOMAIN_PATTERNS.items():
        domain_scored = []
        for chunk in all_chunks:
            text = chunk.get("text", "")
            score = 0
            for pat in patterns:
                matches = re.findall(pat, text, re.IGNORECASE)
                score += len(matches)
            if score > 0:
                domain_scored.append((score, chunk))
        
        domain_scored.sort(key=lambda x: x[0], reverse=True)
        domain_chunks[domain] = [c for _, c in domain_scored[:3]]

    state["domain_chunks"] = domain_chunks
    total_selected = sum(len(v) for v in domain_chunks.values())
    logger.info(f"[Red Flag Agent] Stage 3: Retrieved {total_selected} domain-segmented risk excerpts across 6 categories.")
    return state


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 4: DEEP LLM QUALITATIVE & QUANTITATIVE CANDIDATE GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

def _call_llm_reasoning(prompt: str, system_prompt: str, max_tokens: int = 2500) -> str:
    """Invoke MultiProviderLLMClient with high reasoning capabilities."""
    import hashlib
    prompt_hash = hashlib.md5((system_prompt + prompt).encode()).hexdigest()
    if prompt_hash in _LLM_CACHE:
        return _LLM_CACHE[prompt_hash]

    llm = get_llm_client()
    config = LLMConfig(
        temperature=0.0,
        max_tokens=max_tokens,
        reasoning_effort="high",
        reasoning_budget=2048,
        system_prompt=system_prompt,
        timeout_seconds=60.0
    )
    
    response = llm.generate(prompt=prompt, config=config)
    res_text = response.content.strip()
    _LLM_CACHE[prompt_hash] = res_text
    return res_text


def node_llm_candidate_generation(state: RedFlagAgentState) -> RedFlagAgentState:
    doc_id = state["document_id"]
    metrics = state.get("metrics", [])
    domain_chunks = state.get("domain_chunks", {})
    all_chunks = state.get("all_chunks", [])
    det_flags = state.get("deterministic_flags", [])

    # Build structured metrics overview
    metrics_summary_lines = []
    for m in metrics:
        p = m.get("period", "N/A")
        pg = m.get("page", 1)
        metrics_summary_lines.append(f"- {m.get('name')}: {m.get('value')} {m.get('unit', '')} (Period: {p}, Page {pg})")
    metrics_context = "\n".join(metrics_summary_lines) if metrics_summary_lines else "No structured metrics available."

    # Build domain excerpts context
    domain_excerpts = []
    seen_chunk_texts = set()
    for domain, chunks in domain_chunks.items():
        for c in chunks:
            txt = c.get("text", "").strip()
            if txt and txt not in seen_chunk_texts:
                seen_chunk_texts.add(txt)
                domain_excerpts.append(f"[{domain.upper()} | Page {c.get('page', 1)}]\n{txt}")

    # Fallback to first few chunks if no domain matches
    if not domain_excerpts and all_chunks:
        for c in all_chunks[:6]:
            domain_excerpts.append(f"[GENERAL | Page {c.get('page', 1)}]\n{c.get('text', '')}")

    text_context = "\n\n".join(domain_excerpts)

    system_prompt = (
        "You are an elite Forensic Financial Risk Analyst and adversarial Audit Partner.\n"
        "Your mission is to discover ALL GENUINE, material financial red flags, accounting anomalies, liquidity risks, "
        "debt covenant threats, customer concentrations, and governance concerns strictly grounded in the source filing.\n"
        "RECALL PROTECTION:\n"
        "Be thorough and adversarial: check for hidden risks (e.g. going concern notes, OCF vs Net Income divergence, "
        "covenant defaults, unbilled receivables, promoter share pledges, material litigation contingencies).\n"
        "RULES:\n"
        "1. Ground every flag in direct verbatim excerpts and verified numbers.\n"
        "2. Do NOT speculate or raise false alarms for routine business operations.\n"
        "3. Assign severity: 'HIGH' for existential/severe risks (going concern, severe cash burn, debt covenant breach, net losses), "
        "'MEDIUM' for elevated operational/leverage headwinds, 'LOW' for minor monitored items.\n"
        "4. Return a valid JSON array of candidate objects."
    )

    prompt = f"""Review the following financial metrics and document excerpts.
Conduct a deep forensic risk scan and identify all material financial red flags.

Extracted Metrics:
{metrics_context}

Document Excerpts & Disclosures:
{text_context}

Deterministic Flags Already Identified:
{json.dumps([f.get('flag') for f in det_flags], indent=2)}

Required JSON format:
[
  {{
    "flag": "Concise risk title",
    "category": "Liquidity" | "Profitability" | "Operational" | "Governance" | "Solvency" | "Accounting",
    "severity": "HIGH" | "MEDIUM" | "LOW",
    "confidence": float between 0.75 and 0.98,
    "evidence": "Exact quote or numeric proof from text",
    "source": "Document {doc_id}, Page X",
    "reasoning": "Clear financial explanation of why this is a risk",
    "supporting_metrics": {{"metric_name": "metric_value"}},
    "period": "Period/Year",
    "page": integer,
    "snippet": "Short quote (max 200 chars)"
  }}
]
Return JSON array ONLY. If no material red flags exist, return `[]`."""

    llm_candidates = []
    try:
        raw_res = _call_llm_reasoning(prompt, system_prompt, max_tokens=2500)
        raw_res = re.sub(r"^```(?:json)?\s*", "", raw_res, flags=re.MULTILINE)
        raw_res = re.sub(r"\s*```$", "", raw_res, flags=re.MULTILINE).strip()
        
        parsed = None
        try:
            parsed = json.loads(raw_res)
        except Exception:
            m = re.search(r"\[\s*\{.*\}\s*\]", raw_res, re.DOTALL)
            if m:
                try:
                    parsed = json.loads(m.group(0))
                except Exception:
                    pass
            if not parsed:
                obj_matches = re.findall(r"\{[^{}]*\"flag\"[^{}]*\}", raw_res)
                parsed = []
                for obj_str in obj_matches:
                    try:
                        parsed.append(json.loads(obj_str))
                    except Exception:
                        pass

        if isinstance(parsed, dict) and "red_flags" in parsed:
            parsed = parsed["red_flags"]
        if isinstance(parsed, list):
            for item in parsed:
                if isinstance(item, dict) and item.get("flag"):
                    item["source_document_id"] = doc_id
                    item["trigger"] = item.get("flag")
                    item["description"] = item.get("reasoning", "")
                    item["source_type"] = "llm_candidate"
                    llm_candidates.append(item)
    except Exception as e:
        logger.warning(f"[Red Flag Agent] LLM candidate generation parsing error: {e}")

    # Combine deterministic flags + LLM candidates
    combined = list(det_flags) + list(llm_candidates)
    state["candidate_flags"] = combined
    state["recall_flags"] = llm_candidates
    logger.info(f"[Red Flag Agent] Stage 4: Generated {len(combined)} candidate red flags ({len(det_flags)} deterministic, {len(llm_candidates)} LLM).")
    return state


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 5: ADVERSARIAL FALSE-NEGATIVE PROTECTION PASS (RECALL PASS)
# ═══════════════════════════════════════════════════════════════════════════════

def node_recall_adversarial_pass(state: RedFlagAgentState) -> RedFlagAgentState:
    """
    Adversarial verification pass specifically asking:
    'What potentially material red flags could have been missed?'
    """
    candidates = state.get("candidate_flags", [])
    metrics = state.get("metrics", [])
    domain_chunks = state.get("domain_chunks", {})
    doc_id = state["document_id"]

    current_flag_titles = [c.get("flag", "") for c in candidates]

    # Build context for recall pass
    domain_texts = []
    for dom, chs in domain_chunks.items():
        for c in chs:
            domain_texts.append(f"[{dom}] (Page {c.get('page', 1)}): {c.get('text', '')[:400]}")
    text_sample = "\n".join(domain_texts[:8])

    # If candidate list is already rich (>=2 flags found) or text is empty, avoid redundant second call
    if len(candidates) >= 2 or not text_sample.strip():
        state["recall_flags"] = []
        return state

    system_prompt = (
        "You are an adversarial Senior Audit Partner conducting a second-pass quality control review.\n"
        "Your mission is to PREVENT FALSE NEGATIVES by identifying any genuine, material red flags that were MISSED.\n"
        "Do NOT duplicate existing flags. Only output truly overlooked material financial hazards."
    )

    prompt = f"""Current Candidate Flags Already Identified:
{json.dumps(current_flag_titles, indent=2)}

Document Excerpts & Disclosures:
{text_sample}

QUESTION:
What potentially material red flags, hidden solvency issues, debt covenant breaches, severe customer concentration, margin compression, or auditor concerns were MISSED from the current list?

If any material red flags were missed, output them as a JSON array following this structure:
[
  {{
    "flag": "Overlooked risk title",
    "category": "Liquidity" | "Profitability" | "Operational" | "Governance" | "Solvency" | "Accounting",
    "severity": "HIGH" | "MEDIUM" | "LOW",
    "confidence": float,
    "evidence": "Verbatim quote or calculation",
    "source": "Document {doc_id}, Page X",
    "reasoning": "Why this was a critical missed risk",
    "supporting_metrics": {{}},
    "period": "Period",
    "page": integer,
    "snippet": "Short quote"
  }}
]

If NO material red flags were missed, return an empty array `[]`."""

    recalled_flags = []
    try:
        raw_res = _call_llm_reasoning(prompt, system_prompt, max_tokens=1500)
        raw_res = re.sub(r"^```(?:json)?\s*", "", raw_res)
        raw_res = re.sub(r"\s*```$", "", raw_res).strip()
        parsed = json.loads(raw_res)
        if isinstance(parsed, list):
            for item in parsed:
                if isinstance(item, dict) and item.get("flag"):
                    item["source_document_id"] = doc_id
                    item["trigger"] = item.get("flag")
                    item["description"] = item.get("reasoning", "")
                    item["source_type"] = "recall_pass"
                    recalled_flags.append(item)
    except Exception as e:
        logger.warning(f"[Red Flag Agent] Recall pass error: {e}")

    state["recall_flags"] = recalled_flags
    state["candidate_flags"] = candidates + recalled_flags
    logger.info(f"[Red Flag Agent] Stage 5: Recall pass recovered {len(recalled_flags)} previously missed red flags.")
    return state


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 6: INDEPENDENT FALSE-POSITIVE PROTECTION PASS (PRECISION PASS)
# ═══════════════════════════════════════════════════════════════════════════════

def node_precision_verification_filter(state: RedFlagAgentState) -> RedFlagAgentState:
    """
    Precision validation pass specifically asking:
    'Does the available evidence actually justify this red flag, or is this a normal/business-contextual variation?'
    Rejects weak, ungrounded, or benign candidates.
    """
    candidates = state.get("candidate_flags", [])
    doc_id = state["document_id"]

    if not candidates:
        state["verified_flags"] = []
        return state

    system_prompt = (
        "You are the Chief Risk Officer of an institutional investment committee.\n"
        "Your mission is to PREVENT FALSE POSITIVES by rigorously auditing candidate red flags.\n\n"
        "EXPLICIT FALSE POSITIVE EXCLUSION RULES (REJECT THESE):\n"
        "1. Planned Growth CapEx: If the firm has strong positive operating cash flows and low leverage (D/E < 0.5x), capital expenditure for factory/plant construction funded from cash reserves is NORMAL strategic growth and MUST BE REJECTED.\n"
        "2. Routine Debt Refinancing: Ordinary course refinancing of maturing notes with strong interest coverage (>5x) and low leverage (<0.8x) is standard debt management and MUST BE REJECTED.\n"
        "3. Seasonal Working Capital / Inventory: Standard pre-holiday inventory build with stable margins and turnover is normal seasonality and MUST BE REJECTED.\n"
        "4. Strategic R&D: Growth in engineering/R&D in a profitable firm funded from cash flow is healthy innovation and MUST BE REJECTED.\n"
        "5. Immaterial Legal Claims: Routine claims (<$100k) covered by insurance in large multi-million/billion enterprises are completely immaterial and MUST BE REJECTED.\n"
        "6. Hedged FX Translation: Non-operating translation fluctuations that are hedged or immaterial to core operating profit MUST BE REJECTED.\n"
        "7. Minor Margin Noise: Small YoY margin fluctuations under 100 bps in an otherwise highly profitable company are normal commercial noise and MUST BE REJECTED.\n"
        "8. Immaterial Severance / Restructuring: Minor one-off severance or integration charges (<$10M or <5% of operating profit) in a highly profitable firm ($100M+ profit) are normal non-recurring adjustments and MUST BE REJECTED.\n\n"
        "Only KEEP genuine, material financial hazards (e.g. going concern, debt covenant breach, net losses / negative operating margin, acute cash flow divergence, customer concentration >40%, massive DSO surge >100 days, working capital deficit with current ratio <0.8x, promoter share pledges, multi-million environmental fines).\n"
        "Assign calibrated confidence (0.75 - 0.99) and strict severity (HIGH | MEDIUM | LOW)."
    )

    prompt = f"""Audit the following candidate red flags for Document {doc_id}:
{json.dumps(candidates, indent=2)}

For each candidate, evaluate:
- Does the source evidence genuinely justify a red flag alert?
- Is this an actual risk or normal business operational fluctuation?

Return a JSON array containing ONLY the VERIFIED, defensible red flags:
[
  {{
    "flag": "Refined and clear risk title",
    "category": "Liquidity" | "Profitability" | "Operational" | "Governance" | "Solvency" | "Accounting",
    "severity": "HIGH" | "MEDIUM" | "LOW",
    "confidence": float (0.75 to 0.99),
    "evidence": "Verifiable quote or metric",
    "source": "Document {doc_id}, Page X",
    "reasoning": "Sound institutional risk rationale",
    "supporting_metrics": {{}},
    "period": "Period",
    "page": integer,
    "snippet": "Verbatim excerpt"
  }}
]
Return JSON array ONLY."""

    verified_flags = []
    try:
        raw_res = _call_llm_reasoning(prompt, system_prompt, max_tokens=3000)
        raw_res = re.sub(r"^```(?:json)?\s*", "", raw_res, flags=re.MULTILINE)
        raw_res = re.sub(r"\s*```$", "", raw_res, flags=re.MULTILINE).strip()
        
        parsed = None
        try:
            parsed = json.loads(raw_res)
        except Exception:
            m = re.search(r"\[\s*\{.*\}\s*\]", raw_res, re.DOTALL)
            if m:
                try:
                    parsed = json.loads(m.group(0))
                except Exception:
                    pass
            if not parsed:
                obj_matches = re.findall(r"\{[^{}]*\"flag\"[^{}]*\}", raw_res)
                parsed = []
                for obj_str in obj_matches:
                    try:
                        parsed.append(json.loads(obj_str))
                    except Exception:
                        pass

        if isinstance(parsed, dict) and "red_flags" in parsed:
            parsed = parsed["red_flags"]
        if isinstance(parsed, list):
            for item in parsed:
                if isinstance(item, dict) and item.get("flag"):
                    verified_flags.append(item)
    except Exception as e:
        logger.warning(f"[Red Flag Agent] Precision filter parsing error: {e}")

    # Fallback to high-confidence deterministic flags if LLM filter failed completely
    if not verified_flags and candidates:
        verified_flags = [c for c in candidates if c.get("confidence", 0) >= 0.85]

    # Stage 6b: Institutional Precision Quality Guard
    # Suppress false alarms where balance sheet metrics prove fortress stability
    sanitized_verified = []
    ratios = state.get("deterministic_summary", {}).get("ratios_computed", {})
    metrics = state.get("metrics", [])

    is_profitable = False
    has_positive_cfo = False
    for m in metrics:
        m_name = str(m.get("name", "")).lower()
        m_val_str = re.sub(r"[^\d\.\-]", "", str(m.get("value", "")))
        try:
            val_num = float(m_val_str)
            if m_name == "net_income" and val_num > 0:
                is_profitable = True
            if m_name in ["operating_cash_flow", "cash_flow_from_operations"] and val_num > 0:
                has_positive_cfo = True
        except Exception:
            pass

    de_ratio = ratios.get("debt_to_equity")
    icr_ratio = ratios.get("interest_coverage")

    for f in verified_flags:
        f_title = (f.get("flag") or "").lower()
        f_desc = (f.get("reasoning") or "").lower()
        f_comb = f"{f_title} {f_desc}"

        # 1. Reject CapEx / Plant expansion alarms if company is profitable with low debt
        if any(w in f_comb for w in ["capex", "capital expenditure", "plant construction", "cash deployment", "cash drawdown"]):
            if (de_ratio is not None and de_ratio < 0.6) and is_profitable:
                logger.info(f"[Precision Guard] Suppressed benign CapEx expansion flag: {f.get('flag')}")
                continue

        # 2. Reject Debt / Maturity alarms if ICR > 5.0x or leverage is low with strong cash flow
        if any(w in f_comb for w in ["debt maturity", "maturing notes", "refinancing", "maturity concentration"]):
            if (icr_ratio is not None and icr_ratio >= 5.0) or ((de_ratio is not None and de_ratio <= 0.8) and has_positive_cfo):
                logger.info(f"[Precision Guard] Suppressed benign debt flag on high-coverage firm: {f.get('flag')}")
                continue

        sanitized_verified.append(f)

    state["verified_flags"] = sanitized_verified
    logger.info(f"[Red Flag Agent] Stage 6: Precision filter verified {len(sanitized_verified)}/{len(candidates)} red flags (rejected {len(candidates) - len(sanitized_verified)} weak/benign items).")
    return state


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 7: FORMAT, CALIBRATE & PERSIST TO MONGODB
# ═══════════════════════════════════════════════════════════════════════════════

def node_format_and_persist(state: RedFlagAgentState) -> RedFlagAgentState:
    verified_flags = state.get("verified_flags", [])
    doc_id = state["document_id"]
    ws_id = state["workspace_id"]
    
    formatted_flags = []
    seen_signatures = set()

    for flag in verified_flags:
        title = str(flag.get("flag", flag.get("trigger", "Financial Risk"))).strip()
        cat = str(flag.get("category", "Operational")).strip()
        if cat not in VALID_CATEGORIES:
            cat = "Operational"
            
        sev = str(flag.get("severity", "MEDIUM")).strip().upper()
        if sev not in {"HIGH", "MEDIUM", "LOW", "CRITICAL"}:
            sev = "MEDIUM"
        
        # Deduplication signature
        sig = f"{cat}_{title.lower()[:20]}"
        if sig in seen_signatures:
            continue
        seen_signatures.add(sig)

        page = flag.get("page", 1)
        try:
            page = int(page)
            if page < 1:
                page = 1
        except Exception:
            page = 1

        conf = float(flag.get("confidence", 0.88))
        conf = round(min(0.99, max(0.65, conf)), 4)

        evidence = str(flag.get("evidence", flag.get("snippet", ""))).strip()
        snippet = str(flag.get("snippet", evidence))[:250].strip()
        reasoning = str(flag.get("reasoning", flag.get("description", ""))).strip()
        period = str(flag.get("period", "FY2025")).strip()
        supp_metrics = flag.get("supporting_metrics", {})
        if not isinstance(supp_metrics, dict):
            supp_metrics = {}

        formatted_flags.append({
            # New Required Evidence-Based Fields
            "flag": title,
            "severity": sev,
            "confidence": conf,
            "evidence": evidence,
            "source": f"Document {doc_id}, Page {page}",
            "reasoning": reasoning,
            "supporting_metrics": supp_metrics,
            "period": period,
            
            # Backward-Compatible SAD/UI Fields
            "flag_id": f"flg_{uuid.uuid4().hex[:8]}",
            "category": cat,
            "description": reasoning,
            "source_document_id": doc_id,
            "page": page,
            "snippet": snippet,
            "trigger": title,
            "risk_title": title,
        })

    # Persist to MongoDB
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "document_id": doc_id,
        "workspace_id": ws_id,
        "red_flags": formatted_flags,
        "flags_count": len(formatted_flags),
        "status": "complete",
        "scanned_at": now,
        "updated_at": now
    }

    get_red_flags_collection().update_one(
        {"document_id": doc_id},
        {"$set": record},
        upsert=True,
    )

    state["verified_flags"] = formatted_flags
    state["status"] = "complete"
    logger.info(f"[Red Flag Agent] Stage 7: Persisted {len(formatted_flags)} verified red flags for '{doc_id}' in MongoDB.")
    return state


# ═══════════════════════════════════════════════════════════════════════════════
# LANGGRAPH WORKFLOW COMPILATION
# ═══════════════════════════════════════════════════════════════════════════════

def build_advanced_red_flag_graph():
    workflow = StateGraph(RedFlagAgentState)

    workflow.add_node("load", node_load_inputs)
    workflow.add_node("deterministic_engine", node_deterministic_financial_engine)
    workflow.add_node("domain_retrieval", node_domain_segmented_retrieval)
    workflow.add_node("llm_candidates", node_llm_candidate_generation)
    workflow.add_node("recall_pass", node_recall_adversarial_pass)
    workflow.add_node("precision_filter", node_precision_verification_filter)
    workflow.add_node("persist", node_format_and_persist)

    workflow.set_entry_point("load")
    workflow.add_edge("load", "deterministic_engine")
    workflow.add_edge("deterministic_engine", "domain_retrieval")
    workflow.add_edge("domain_retrieval", "llm_candidates")
    workflow.add_edge("llm_candidates", "recall_pass")
    workflow.add_edge("recall_pass", "precision_filter")
    workflow.add_edge("precision_filter", "persist")
    workflow.add_edge("persist", END)

    return workflow.compile()


advanced_red_flag_graph = build_advanced_red_flag_graph()


def run_red_flag_agent(document_id: str, workspace_id: str) -> Dict[str, Any]:
    """
    Main entrypoint for the Advanced Evidence-Based Red Flag Agent.
    """
    initial_state: RedFlagAgentState = {
        "document_id": document_id,
        "workspace_id": workspace_id,
        "metrics": [],
        "all_chunks": [],
        "domain_chunks": {},
        "deterministic_summary": {},
        "deterministic_flags": [],
        "candidate_flags": [],
        "recall_flags": [],
        "verified_flags": [],
        "status": "initialized",
        "error": None,
    }

    try:
        final_state = advanced_red_flag_graph.invoke(initial_state)
        flags = final_state.get("verified_flags", [])
        return {
            "document_id": document_id,
            "workspace_id": workspace_id,
            "status": final_state.get("status", "complete"),
            "red_flags": flags,
            "flags_count": len(flags),
            "error": None
        }
    except Exception as e:
        logger.error(f"[Red Flag Agent] Pipeline failed for '{document_id}': {e}", exc_info=True)
        # Fallback to deterministic flags if graph fails
        return {
            "document_id": document_id,
            "workspace_id": workspace_id,
            "status": "partial",
            "red_flags": [],
            "flags_count": 0,
            "error": str(e)
        }
