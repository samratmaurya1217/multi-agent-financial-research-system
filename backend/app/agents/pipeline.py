"""
pipeline.py — AI Agents Pipeline Re-export
Importing Document Agent from document_agent.py.
"""

from typing import TypedDict, Optional, Dict, Any
from app.agents.document_agent import (
    process_and_index_document,
    AtlasVectorStoreConfig,
    DocumentAgentState,
    document_agent_graph
)

__all__ = [
    "process_and_index_document",
    "AtlasVectorStoreConfig",
    "DocumentAgentState",
    "document_agent_graph",
    "ResearchState",
    "run_research_pipeline",
]

class ResearchState(TypedDict):
    pass

def run_research_pipeline(workspace_id: str, query: str, conversation_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Stubbed to satisfy existing API endpoints without implementing Research Agent.
    """
    return {
        "workspace_id": workspace_id,
        "query": query,
        "response": "Research Agent is not implemented in this phase.",
        "citations": [],
        "extracted_metrics": {},
        "red_flags": [],
        "agent_traces": []
    }
