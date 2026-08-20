"""
pipeline.py — Multi-Agent Orchestration & Pipeline Engine (SAD Chapter 6 & Section 6.8/6.9)
Coordinates Document Agent, Extraction Agent, and Red Flag Agent in strict sequence.

Ingestion Flow:
1. Document Agent: upload -> parse -> chunk & classify -> embed -> vector index
2. Extraction Agent: retrieve financial chunks -> LLM extract metrics -> schema/citation validate -> store metrics
3. Red Flag Agent: load metrics & risk chunks -> quantitative heuristics + qualitative scan -> validate/dedup -> store flags
"""

import time
import uuid
import logging
from datetime import datetime, timezone
from typing import TypedDict, Optional, Dict, Any, List

import numpy as np
from app.database import get_db
from app.agents.document_agent import (
    process_and_index_document,
    DocumentAgentState,
    document_agent_graph,
    get_embedding_model,
)
from app.agents.extraction_agent import run_extraction_agent
from app.agents.red_flag_agent import run_red_flag_agent

from app.agents.comparison_agent import run_comparison_agent
from app.agents.report_agent import run_report_agent

logger = logging.getLogger("velsora.pipeline")

class AtlasVectorStoreConfig:
    collection_name: str = "document_chunks"
    index_name: str = "vector_index"
    embedding_key: str = "embedding"
    text_key: str = "text"

class ResearchState(TypedDict):
    workspace_id: str
    query: str
    conversation_id: Optional[str]
    retrieved_chunks: List[Dict[str, Any]]
    response: str
    citations: List[Dict[str, Any]]
    agent_traces: List[Dict[str, Any]]

__all__ = [
    "process_and_index_document",
    "run_extraction_agent",
    "run_red_flag_agent",
    "run_comparison_agent",
    "run_comparison_pipeline",
    "run_report_agent",
    "run_report_pipeline",
    "run_ingestion_pipeline",
    "run_research_pipeline",
    "search_similar_chunks",
    "get_embedding_model",
    "ResearchState",
    "AtlasVectorStoreConfig",
]


# ─── Full Ingestion Pipeline (SAD 6.2, 6.8, 6.9) ──────────────────────────────

def run_ingestion_pipeline(
    file_path: str,
    workspace_id: str,
    document_id: str,
    filename: str,
    job_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes the SAD Ingestion Orchestration Flow:
    Document Agent -> Extraction Agent -> Red Flag Agent

    Implements:
    - Sequential execution with intermediate checkpointing
    - Partial failure resilience (preserves completed agent outputs)
    - Job status and audit logging
    """
    job_id = job_id or f"job_{uuid.uuid4().hex[:10]}"
    jobs_col = get_db()["jobs"]
    now = datetime.now(timezone.utc).isoformat()

    logger.info(f"[Orchestrator] Starting ingestion pipeline for document '{document_id}' (job: {job_id})...")

    # Initialize Job Record (SAD 13.4.8)
    job_record = {
        "job_id": job_id,
        "workspace_id": workspace_id,
        "document_id": document_id,
        "job_type": "document_ingestion",
        "status": "processing",
        "steps": {
            "document_agent": {"status": "pending"},
            "extraction_agent": {"status": "pending"},
            "red_flag_agent": {"status": "pending"}
        },
        "created_at": now,
        "updated_at": now
    }
    jobs_col.update_one({"job_id": job_id}, {"$set": job_record}, upsert=True)

    result_summary: Dict[str, Any] = {
        "job_id": job_id,
        "document_id": document_id,
        "workspace_id": workspace_id,
        "status": "in_progress",
        "document_agent": None,
        "extraction_agent": None,
        "red_flag_agent": None,
    }

    # ─── Step 1: Document Agent (Parse -> Chunk -> Embed -> Index) ────────────
    try:
        logger.info(f"[Orchestrator] Step 1/3: Invoking Document Agent...")
        doc_res = process_and_index_document(file_path, workspace_id, document_id, filename)
        result_summary["document_agent"] = doc_res

        if doc_res.get("status") == "failed":
            raise RuntimeError(f"Document Agent failed: {doc_res.get('error', 'Unknown parser/embedding error')}")

        jobs_col.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "steps.document_agent": {"status": "completed", "chunks": doc_res.get("chunk_count", 0)},
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    except Exception as e:
        logger.error(f"[Orchestrator] Document Agent failed: {e}", exc_info=True)
        jobs_col.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "failed",
                    "error": str(e),
                    "steps.document_agent": {"status": "failed", "error": str(e)},
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        result_summary["status"] = "failed"
        result_summary["error"] = str(e)
        return result_summary

    # ─── Step 2: Extraction Agent (Extract Grounded Metrics) ──────────────────
    try:
        logger.info(f"[Orchestrator] Step 2/3: Invoking Extraction Agent...")
        ext_res = run_extraction_agent(document_id, workspace_id)
        result_summary["extraction_agent"] = ext_res

        ext_status = ext_res.get("extraction_status", "completed")
        jobs_col.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "steps.extraction_agent": {
                        "status": ext_status,
                        "metrics_extracted": ext_res.get("metrics_count", 0)
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    except Exception as e:
        logger.warning(f"[Orchestrator] Extraction Agent encountered error: {e}. Preserving document chunks and continuing...")
        result_summary["extraction_agent"] = {"extraction_status": "partial", "error": str(e), "metrics": []}
        jobs_col.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "steps.extraction_agent": {"status": "partial", "error": str(e)},
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

    # ─── Step 3: Red Flag Agent (Quantitative + Qualitative Risks) ───────────
    try:
        time.sleep(1.5)
        logger.info(f"[Orchestrator] Step 3/3: Invoking Red Flag Agent...")
        rf_res = run_red_flag_agent(document_id, workspace_id)
        result_summary["red_flag_agent"] = rf_res

        rf_status = rf_res.get("status", "complete")
        jobs_col.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "steps.red_flag_agent": {
                        "status": rf_status,
                        "flags_identified": rf_res.get("flags_count", 0)
                    },
                    "status": "completed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        result_summary["status"] = "completed"
    except Exception as e:
        logger.warning(f"[Orchestrator] Red Flag Agent encountered error: {e}. Preserving previous agent outputs...")
        result_summary["red_flag_agent"] = {"status": "partial", "error": str(e), "red_flags": []}
        jobs_col.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "steps.red_flag_agent": {"status": "partial", "error": str(e)},
                    "status": "partial",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        result_summary["status"] = "partial"

    logger.info(f"[Orchestrator] Ingestion pipeline for document '{document_id}' finished with status: {result_summary['status']}.")
    return result_summary


# ─── Vector Search and Research Pipeline ─────────────────────────────────────

def search_similar_chunks(
    workspace_id: str,
    query: str,
    top_k: int = 4,
    document_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Search for most relevant chunks using Hybrid Dense Vector + Sparse BM25 RRF Search."""
    from app.agents.rag import hybrid_search_chunks
    try:
        results = hybrid_search_chunks(
            workspace_id=workspace_id,
            query=query,
            top_k=top_k,
            document_id=document_id
        )
        if results:
            for r in results:
                r["score"] = r.get("rrf_score", 0.0)
            return results
    except Exception as e:
        logger.warning(f"[Pipeline] Hybrid search warning: {e}")

    # Fallback to direct DB scan
    chunks_col = get_db()["document_chunks"]
    filter_q: Dict[str, Any] = {"workspace_id": workspace_id}
    if document_id:
        filter_q["document_id"] = document_id
    chunks = list(chunks_col.find(filter_q))[:top_k]
    return [{
        "chunk_id": c.get("chunk_id", ""),
        "document_id": c.get("document_id", ""),
        "filename": c.get("filename", "document.pdf"),
        "page": c.get("page", 1),
        "text": c.get("text", ""),
        "score": 1.0,
    } for c in chunks]


def run_research_pipeline(
    workspace_id: str,
    query: str,
    conversation_id: Optional[str] = None,
    document_id: Optional[str] = None,
    document_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Execute the Research Agent pipeline (SAD 7.5).
    Delegates to the full LangGraph Research Agent with multi-step query planning,
    hybrid retrieval, reranking, grounded LLM synthesis, and validation.
    """
    from app.agents.research_agent import run_research_agent

    # Build document_ids list from either single doc_id or list
    effective_doc_ids: List[str] = []
    if document_ids:
        effective_doc_ids = document_ids
    elif document_id:
        effective_doc_ids = [document_id]

    logger.info(
        f"[Pipeline] Invoking Research Agent for query: '{query[:80]}' "
        f"(workspace={workspace_id}, docs={effective_doc_ids or 'ALL'})"
    )

    result = run_research_agent(
        workspace_id=workspace_id,
        query=query,
        session_id=conversation_id,
        document_ids=effective_doc_ids,
    )

    return result


def run_comparison_pipeline(
    workspace_id: str,
    document_ids: List[str],
    comparison_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Execute the Comparison Agent pipeline branch (SAD 7.4).
    Cross-references extracted metrics & red flags from 2+ documents in workspace.
    """
    logger.info(
        f"[Pipeline] Invoking Comparison Agent for {len(document_ids)} documents "
        f"in workspace '{workspace_id}'..."
    )
    return run_comparison_agent(
        workspace_id=workspace_id,
        document_ids=document_ids,
        comparison_id=comparison_id
    )


def run_report_pipeline(
    workspace_id: str,
    document_ids: Optional[List[str]] = None,
    target_company: Optional[str] = None,
    comparison_company: Optional[str] = None,
    report_type: Optional[str] = None,
    title: Optional[str] = None,
    sections: Optional[List[str]] = None,
    report_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Execute the Report Agent pipeline branch (SAD 7.6 & Milestone 4).
    Compiles extracted metrics, red flags, comparisons, and research insights into a structured PDF report.
    """
    logger.info(
        f"[Pipeline] Invoking Report Agent for workspace '{workspace_id}' "
        f"(target='{target_company or 'auto'}', docs={document_ids or 'ALL'})..."
    )
    return run_report_agent(
        workspace_id=workspace_id,
        document_ids=document_ids,
        target_company=target_company,
        comparison_company=comparison_company,
        report_type=report_type,
        title=title,
        sections=sections,
        report_id=report_id,
    )

