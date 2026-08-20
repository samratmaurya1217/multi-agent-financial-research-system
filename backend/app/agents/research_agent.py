
import os
import re
import json
import uuid
import logging
import time
from datetime import datetime, timezone
from typing import TypedDict, List, Optional, Any, Dict, Tuple

from langgraph.graph import StateGraph, END

from app.database import get_db
from app.agents.rag import hybrid_search_chunks
from app.agents.llm_client import get_llm_client, LLMConfig, LLMResponse, sanitize_llm_output

logger = logging.getLogger("velsora.research_agent")

# ═══════════════════════════════════════════════════════════════════════════════
# VERSION-CONTROLLED PROMPT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

DECOMPOSE_PROMPT_V2 = """You are an elite financial query planner.
Decompose the user's financial research question into 1 to 4 distinct, atomic sub-questions.

Rules:
1. If the question is already atomic (single topic/lookup), return it as a single-element list.
2. For compound queries, separate each topic into an independent, search-friendly sub-question.
3. Return ONLY a valid JSON array of strings. No markdown, no commentary.

Examples:
- "What was the total revenue and what are the main risk factors?" -> ["What was the total revenue?", "What are the key risk factors mentioned in the report?"]
- "What is the operating margin trend?" -> ["What is the operating margin trend over recent periods?"]

User Question: {query}

JSON array of sub-questions:"""


REFORMULATE_PROMPT_V1 = """You are a financial search query reformulator.
The initial search for the following question did not find all required evidence in the document chunks:
Missing/Unsupported aspect: {missing_info}
Original query: {original_query}

Generate 2 to 3 alternative, highly targeted search phrases using financial synonyms, table headers, or alternative terminology (e.g. 'Segment Revenue', 'Notes to Financial Statements', 'Contingent Liabilities', 'MD&A').
Return ONLY a valid JSON array of search strings."""


RESEARCH_SYNTHESIS_PROMPT_V2 = """You are a Senior Financial Research Analyst assistant at Velsora.
Answer the user's financial research query using ONLY the verified document excerpts provided below.

═══ GROUNDING & INTEGRITY RULES ═══
1. Use ONLY the verified document excerpts provided below. Do NOT hallucinate or assume facts not present.
2. Every factual claim, figure, or statement must be directly traceable to the cited excerpts.
3. If information is not available in the excerpts, explicitly state: "This information is not available in the provided documents."
4. Do NOT output internal chain-of-thought, thinking tokens, or prompt references.

═══ REQUIRED RESPONSE STRUCTURE ═══
1. Direct Answer: Provide a clear, executive-level summary answering the question directly.
2. Logical Multi-Part Breakdown: For compound questions, address each part under a clear sub-heading:
   ### 1. [First Sub-Topic]
   [Detailed quantitative analysis with inline citations, e.g. (Zenith Report, p.26)]
   
   ### 2. [Second Sub-Topic]
   [Detailed quantitative analysis with inline citations]
3. Dedicated Sources & Citations Section: At the very end of your response, provide:
   ### Sources & Citations
   - List each cited document, exact page number, and chunk reference supporting the facts.

═══ SCOPE ═══
{scope_note}

═══ USER QUESTION ═══
{query}

═══ VERIFIED COMPACT EVIDENCE EXCERPTS ═══
{context}

Provide your structured financial analysis:"""


# ═══════════════════════════════════════════════════════════════════════════════
# LANGGRAPH STATE SCHEMA (SAD 7.5.3 & 7.5.4)
# ═══════════════════════════════════════════════════════════════════════════════

class ResearchAgentState(TypedDict):
    # Inputs
    workspace_id: str
    query: str
    session_id: str
    document_ids: List[str]
    conversation_history: List[Dict[str, Any]]

    # Internal state
    sub_questions: List[str]
    retrieved_chunks: List[Dict[str, Any]]
    reranked_chunks: List[Dict[str, Any]]
    reasoning_effort: str              # "low" | "high"
    reasoning_budget: int              # 1024 (low) | 4096 (high)
    reformulation_count: int           # Max 1 self-correction cycle
    missing_aspects: List[str]

    # Outputs
    raw_response: str
    conclusion: str
    citations: List[Dict[str, Any]]
    confidence: float
    grounding_status: str              # "grounded" | "partial" | "refused"
    status: str                        # "complete" | "failed"
    provider_used: str
    model_used: str
    elapsed_seconds: float
    error: str


# ═══════════════════════════════════════════════════════════════════════════════
# REASONING EFFORT CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════════

def determine_reasoning_effort(query: str, sub_questions: List[str]) -> Tuple[str, int]:
    """
    Computes dynamic reasoning effort and token budget for Nemotron 3 Ultra:
    - Normal single-lookup queries -> "low" effort (budget = 1024)
    - Multi-part, comparative, trend, or margin queries -> "high" effort (budget = 4096)
    """
    q_lower = query.lower()
    is_multi_part = len(sub_questions) > 1
    has_complex_intent = any(
        kw in q_lower for kw in [
            "compare", "comparison", "trend", "versus", "vs",
            "margin", "ratio", "why", "explain", "reconcile",
            "cash flow", "balance sheet", "ebitda", "risk factor"
        ]
    )

    if is_multi_part or has_complex_intent:
        logger.info(f"[Research Agent] High reasoning complexity detected (sub_qs={len(sub_questions)}). Budget = 4096 tokens.")
        return "high", 4096
    else:
        logger.info("[Research Agent] Standard reasoning complexity detected. Low effort budget = 1024 tokens.")
        return "low", 1024


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 1: DECOMPOSE QUERY & ASSESS COMPLEXITY
# ═══════════════════════════════════════════════════════════════════════════════

def decompose_query_node(state: ResearchAgentState) -> ResearchAgentState:
    query = state["query"].strip()
    logger.info(f"[Research Agent:Decompose] Processing query: '{query[:80]}...'")

    # Fast path for very short, single-lookup queries
    if len(query.split()) <= 8 and " and " not in query.lower():
        sub_questions = [query]
    else:
        try:
            client = get_llm_client()
            cfg = LLMConfig(temperature=0.0, max_tokens=256, reasoning_effort="low", reasoning_budget=512)
            prompt = DECOMPOSE_PROMPT_V2.format(query=query)
            resp = client.generate(prompt, config=cfg)
            raw = resp.content.strip()

            if raw.startswith("```"):
                raw = re.sub(r"^```(?:json)?\s*", "", raw)
                raw = re.sub(r"\s*```$", "", raw)

            parsed = json.loads(raw)
            sub_questions = parsed if isinstance(parsed, list) and len(parsed) > 0 else [query]
        except Exception as e:
            logger.warning(f"[Research Agent:Decompose] Fallback to original query: {e}")
            sub_questions = [query]

    sub_questions = sub_questions[:4] # Cap at 4
    effort, budget = determine_reasoning_effort(query, sub_questions)

    state["sub_questions"] = sub_questions
    state["reasoning_effort"] = effort
    state["reasoning_budget"] = budget
    logger.info(f"[Research Agent:Decompose] Sub-questions ({len(sub_questions)}): {sub_questions}")
    return state


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 2: RETRIEVE EVIDENCE (Strictly from Document Agent Chunks)
# ═══════════════════════════════════════════════════════════════════════════════

def retrieve_evidence_node(state: ResearchAgentState) -> ResearchAgentState:
    workspace_id = state["workspace_id"]
    document_ids = state.get("document_ids", [])
    sub_questions = state["sub_questions"]

    all_chunks: Dict[str, Dict[str, Any]] = {}

    for i, sub_q in enumerate(sub_questions):
        logger.info(f"[Research Agent:Retrieve] Hybrid retrieval for sub-q {i+1}/{len(sub_questions)}: '{sub_q[:50]}'")
        try:
            if document_ids:
                for doc_id in document_ids:
                    results = hybrid_search_chunks(
                        workspace_id=workspace_id,
                        query=sub_q,
                        top_k=15,
                        document_id=doc_id,
                    )
                    for r in results:
                        cid = r.get("chunk_id", f"chk_{uuid.uuid4().hex[:6]}")
                        all_chunks[cid] = r
            else:
                results = hybrid_search_chunks(
                    workspace_id=workspace_id,
                    query=sub_q,
                    top_k=15,
                )
                for r in results:
                    cid = r.get("chunk_id", f"chk_{uuid.uuid4().hex[:6]}")
                    all_chunks[cid] = r
        except Exception as e:
            logger.warning(f"[Research Agent:Retrieve] Error on sub-query '{sub_q}': {e}")

    retrieved = list(all_chunks.values())
    logger.info(f"[Research Agent:Retrieve] Total candidate chunks found: {len(retrieved)}")
    state["retrieved_chunks"] = retrieved
    return state


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 3: COMPACT RERANK & FILTER (Only Highest-Quality Evidence)
# ═══════════════════════════════════════════════════════════════════════════════

def rerank_compact_node(state: ResearchAgentState) -> ResearchAgentState:
    """
    Reranks and filters to a compact set of the top 4-6 highest quality chunks.
    Avoids context bloating while preserving exact table structures and sections.
    """
    retrieved = state.get("retrieved_chunks", [])
    if not retrieved:
        state["reranked_chunks"] = []
        return state

    for chunk in retrieved:
        score = chunk.get("rrf_score", 0.0)
        c_type = chunk.get("chunk_type", "prose")
        sec = (chunk.get("section") or "").lower()

        # Structure boost
        if c_type == "table":
            score *= 1.30
        elif any(k in sec for k in ["financial", "statement", "balance", "income", "profit", "cash"]):
            score *= 1.15

        chunk["rerank_score"] = score

    # Sort descending
    retrieved.sort(key=lambda c: c.get("rerank_score", 0.0), reverse=True)

    # Compact selection: top 6 maximum
    top_chunks = retrieved[:6]

    logger.info(f"[Research Agent:Rerank] Compact context selected {len(top_chunks)} top chunks:")
    for idx, c in enumerate(top_chunks):
        logger.info(f"  #{idx+1}: {c.get('filename')} p.{c.get('page')} (score={c.get('rerank_score', 0):.4f}, type={c.get('chunk_type')})")

    state["reranked_chunks"] = top_chunks
    return state


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 4: GENERATE STRUCTURED RESPONSE
# ═══════════════════════════════════════════════════════════════════════════════

def generate_answer_node(state: ResearchAgentState) -> ResearchAgentState:
    reranked = state.get("reranked_chunks", [])
    query = state["query"]
    sub_questions = state["sub_questions"]
    document_ids = state.get("document_ids", [])
    effort = state.get("reasoning_effort", "low")
    budget = state.get("reasoning_budget", 1024)

    # Grounding check: Refuse if no chunks
    if not reranked:
        state["conclusion"] = (
            "This information is not available in the provided documents. "
            "Please ensure the relevant financial reports are uploaded to your workspace."
        )
        state["citations"] = []
        state["confidence"] = 0.0
        state["grounding_status"] = "refused"
        state["status"] = "complete"
        return state

    # Build compact context blocks
    context_blocks = []
    for i, c in enumerate(reranked):
        fname = c.get("filename", "Document.pdf")
        page = c.get("page", 1)
        cid = c.get("chunk_id", f"chk_{i}")
        sec = f" | Section: {c.get('section')}" if c.get("section") else ""
        text = c.get("text", "").strip()
        context_blocks.append(f"[Excerpt {i+1} | Document: {fname} | Page {page}{sec} | ChunkID: {cid}]\n{text}")

    context_str = "\n\n────────────────────────\n\n".join(context_blocks)

    # Scope note
    scope_note = f"Filtered to: {', '.join(set(c.get('filename', '') for c in reranked))}" if document_ids else "All indexed workspace documents"

    prompt = RESEARCH_SYNTHESIS_PROMPT_V2.format(
        scope_note=scope_note,
        query=query,
        context=context_str,
    )

    client = get_llm_client()
    cfg = LLMConfig(
        temperature=0.1,
        max_tokens=2048,
        reasoning_effort=effort,
        reasoning_budget=budget,
        enable_thinking=True,
    )

    try:
        start_t = time.time()
        resp: LLMResponse = client.generate(prompt, config=cfg)
        elapsed = round(time.time() - start_t, 2)

        clean_text = sanitize_llm_output(resp.content)
        state["raw_response"] = clean_text
        state["conclusion"] = clean_text
        state["provider_used"] = resp.provider
        state["model_used"] = resp.model
        state["elapsed_seconds"] = elapsed

        # Build citations from top chunks
        citations = []
        for c in reranked:
            snippet = c.get("text", "")[:240] + "..." if len(c.get("text", "")) > 240 else c.get("text", "")
            citations.append({
                "document_id": c.get("document_id", ""),
                "document_name": c.get("filename", "Document.pdf"),
                "page": c.get("page", 1),
                "section": c.get("section", ""),
                "chunk_id": c.get("chunk_id", ""),
                "snippet": snippet,
                "score": round(c.get("rerank_score", 0.0), 4),
                "filename": c.get("filename", "Document.pdf"),
                "docName": c.get("filename", "Document.pdf"),
            })

        state["citations"] = citations
        state["status"] = "complete"

    except Exception as e:
        logger.error(f"[Research Agent:Generate] Generation failed: {e}", exc_info=True)
        state["conclusion"] = "Unable to process research synthesis due to service error. Please try again."
        state["citations"] = []
        state["confidence"] = 0.0
        state["grounding_status"] = "refused"
        state["status"] = "failed"
        state["error"] = str(e)

    return state


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 5: GROUNDING VALIDATION & REFORMULATION DECISION (SAD 5.9 & 7.5.9)
# ═══════════════════════════════════════════════════════════════════════════════

def validate_grounding_node(state: ResearchAgentState) -> ResearchAgentState:
    conclusion = state.get("conclusion", "")
    citations = state.get("citations", [])
    reranked = state.get("reranked_chunks", [])
    sub_questions = state.get("sub_questions", [])

    if state.get("grounding_status") == "refused":
        return state

    missing: List[str] = []
    c_lower = conclusion.lower()

    # Check if answer notes unavailable information for any sub-question
    for sq in sub_questions:
        # Check if sub-question topic was answered or marked unavailable
        if "not available" in c_lower or "not provided" in c_lower:
            missing.append(sq)

    state["missing_aspects"] = missing

    # Calculate Confidence (SAD 7.5.10)
    avg_score = sum(c.get("rerank_score", 0.0) for c in reranked) / max(len(reranked), 1)
    norm_score = min(1.0, avg_score * 80)
    citation_cov = 1.0 if citations else 0.0
    schema_ok = 1.0 if len(conclusion) > 20 else 0.0

    confidence = round((norm_score * 0.35) + (citation_cov * 0.40) + (schema_ok * 0.25), 3)
    state["confidence"] = confidence

    if confidence < 0.25 and not citations:
        state["grounding_status"] = "refused"
    elif missing:
        state["grounding_status"] = "partial"
    else:
        state["grounding_status"] = "grounded"

    logger.info(
        f"[Research Agent:Validate] Status={state['grounding_status']}, "
        f"Confidence={confidence}, Missing aspects={len(missing)}"
    )
    return state


def should_reformulate(state: ResearchAgentState) -> str:
    """
    Decides whether to perform 1x retrieval reformulation:
    - If grounding_status is 'partial' and reformulation_count == 0 -> reformulate
    - Otherwise -> end
    """
    reform_count = state.get("reformulation_count", 0)
    missing = state.get("missing_aspects", [])

    if reform_count == 0 and missing and state.get("status") == "complete":
        logger.info(f"[Research Agent] Triggering 1x self-correction retrieval reformulation for: {missing}")
        return "reformulate"
    return "end"


# ═══════════════════════════════════════════════════════════════════════════════
# NODE 6: SELF-CORRECTION RETRIEVAL REFORMULATION
# ═══════════════════════════════════════════════════════════════════════════════

def reformulate_query_node(state: ResearchAgentState) -> ResearchAgentState:
    missing = state.get("missing_aspects", [])
    orig_query = state.get("query", "")
    workspace_id = state.get("workspace_id")
    document_ids = state.get("document_ids", [])

    state["reformulation_count"] = state.get("reformulation_count", 0) + 1

    try:
        client = get_llm_client()
        cfg = LLMConfig(temperature=0.2, max_tokens=256, reasoning_effort="low", reasoning_budget=512)
        prompt = REFORMULATE_PROMPT_V1.format(
            missing_info="; ".join(missing),
            original_query=orig_query,
        )
        resp = client.generate(prompt, config=cfg)
        raw = resp.content.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

        new_queries = json.loads(raw)
        if not isinstance(new_queries, list):
            new_queries = missing
    except Exception as e:
        logger.warning(f"[Research Agent:Reformulate] Reformulation prompt error: {e}")
        new_queries = missing

    logger.info(f"[Research Agent:Reformulate] Executing targeted retrieval for reformulated queries: {new_queries}")

    # Retrieve additional chunks
    additional_chunks = []
    for nq in new_queries[:3]:
        try:
            res = hybrid_search_chunks(
                workspace_id=workspace_id,
                query=nq,
                top_k=10,
                document_id=document_ids[0] if document_ids else None,
            )
            additional_chunks.extend(res)
        except Exception as e:
            logger.warning(f"[Research Agent:Reformulate] Retrieval error: {e}")

    # Combine with existing candidate chunks
    existing = state.get("retrieved_chunks", [])
    chunk_map = {c.get("chunk_id", ""): c for c in existing}
    for ac in additional_chunks:
        cid = ac.get("chunk_id", f"chk_{uuid.uuid4().hex[:6]}")
        chunk_map[cid] = ac

    state["retrieved_chunks"] = list(chunk_map.values())
    return state


# ═══════════════════════════════════════════════════════════════════════════════
# LANGGRAPH STATE MACHINE WIRING
# ═══════════════════════════════════════════════════════════════════════════════

def _build_graph() -> StateGraph:
    graph = StateGraph(ResearchAgentState)

    graph.add_node("decompose", decompose_query_node)
    graph.add_node("retrieve", retrieve_evidence_node)
    graph.add_node("rerank", rerank_compact_node)
    graph.add_node("generate", generate_answer_node)
    graph.add_node("validate", validate_grounding_node)
    graph.add_node("reformulate", reformulate_query_node)

    graph.set_entry_point("decompose")
    graph.add_edge("decompose", "retrieve")
    graph.add_edge("retrieve", "rerank")
    graph.add_edge("rerank", "generate")
    graph.add_edge("generate", "validate")

    # Conditional edge for self-correction reformulation (at most once)
    graph.add_conditional_edges(
        "validate",
        should_reformulate,
        {
            "reformulate": "reformulate",
            "end": END,
        }
    )
    graph.add_edge("reformulate", "rerank")

    return graph


_GRAPH = None


def get_research_graph():
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = _build_graph().compile()
    return _GRAPH


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ═══════════════════════════════════════════════════════════════════════════════

def run_research_agent(
    workspace_id: str,
    query: str,
    session_id: Optional[str] = None,
    document_ids: Optional[List[str]] = None,
    conversation_history: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Public entry point for the Multi-Provider Research Agent.
    """
    logger.info(
        f"[Research Agent] Starting research query: '{query[:80]}'\n"
        f"  Workspace: {workspace_id} | Docs: {document_ids or 'ALL'} | Session: {session_id or 'new'}"
    )

    initial_state: ResearchAgentState = {
        "workspace_id": workspace_id,
        "query": query,
        "session_id": session_id or f"sess_{uuid.uuid4().hex[:8]}",
        "document_ids": document_ids or [],
        "conversation_history": conversation_history or [],
        "sub_questions": [],
        "retrieved_chunks": [],
        "reranked_chunks": [],
        "reasoning_effort": "low",
        "reasoning_budget": 1024,
        "reformulation_count": 0,
        "missing_aspects": [],
        "raw_response": "",
        "conclusion": "",
        "citations": [],
        "confidence": 0.0,
        "grounding_status": "pending",
        "status": "pending",
        "provider_used": "unknown",
        "model_used": "unknown",
        "elapsed_seconds": 0.0,
        "error": "",
    }

    start_time = time.time()
    try:
        graph = get_research_graph()
        final_state = graph.invoke(initial_state)
    except Exception as e:
        logger.error(f"[Research Agent] Graph execution failed: {e}", exc_info=True)
        final_state = initial_state
        final_state["conclusion"] = "A service error occurred while performing research synthesis. Please try again."
        final_state["status"] = "failed"
        final_state["error"] = str(e)

    total_elapsed = round(time.time() - start_time, 2)

    agent_traces = [
        {"agent": "ResearchAgent", "step": "decompose", "sub_questions": final_state.get("sub_questions", [])},
        {"agent": "ResearchAgent", "step": "retrieve", "chunks_found": len(final_state.get("retrieved_chunks", []))},
        {"agent": "ResearchAgent", "step": "rerank", "top_chunks": len(final_state.get("reranked_chunks", []))},
        {
            "agent": "ResearchAgent",
            "step": "generate",
            "provider": final_state.get("provider_used"),
            "model": final_state.get("model_used"),
            "reasoning_effort": final_state.get("reasoning_effort"),
            "reasoning_budget": final_state.get("reasoning_budget"),
        },
        {
            "agent": "ResearchAgent",
            "step": "validate",
            "confidence": final_state.get("confidence"),
            "grounding_status": final_state.get("grounding_status"),
            "reformulation_cycles": final_state.get("reformulation_count", 0),
        },
    ]

    return {
        "answer": {
            "conclusion": final_state.get("conclusion", ""),
            "citations": final_state.get("citations", []),
            "confidence": final_state.get("confidence", 0.0),
            "grounding_status": final_state.get("grounding_status", "refused"),
        },
        "status": final_state.get("status", "complete"),
        "response": final_state.get("conclusion", ""),
        "citations": final_state.get("citations", []),
        "agent_traces": agent_traces,
        "elapsed_seconds": total_elapsed,
    }
