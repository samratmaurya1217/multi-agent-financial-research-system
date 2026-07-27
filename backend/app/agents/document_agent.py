"""
document_agent.py — Document Agent Pipeline
Powered by LangGraph, LangChain, PyMuPDF and MongoDB Atlas.

Flow:
Upload PDF -> Parse with PyMuPDF -> Clean & Chunk Text -> Generate Embeddings -> Store in MongoDB Atlas Vector Search
"""

import os
import fitz
import logging
from datetime import datetime, timezone
from typing import TypedDict, List, Optional, Any, Dict

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import StateGraph, END
from sentence_transformers import SentenceTransformer

from app.database import get_db

logger = logging.getLogger("velsora.document_agent")

_embedding_model: Optional[SentenceTransformer] = None

class AtlasVectorStoreConfig:
    collection_name: str = "document_chunks"
    index_name: str = "vector_index"
    embedding_key: str = "embedding"
    text_key: str = "text"

def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        logger.info("[Document Agent] Loading SentenceTransformer 'all-MiniLM-L6-v2'...")
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model

def get_chunks_collection():
    return get_db()["document_chunks"]

# ─── LangGraph Document Agent State ──────────────────────────────────────────

class DocumentAgentState(TypedDict):
    file_path: str
    workspace_id: str
    document_id: str
    filename: str
    page_texts: List[Dict[str, Any]]
    chunks: List[Dict[str, Any]]
    embeddings: List[List[float]]
    status: str
    total_pages: int
    total_chunks: int

# Node 1: Parse with PyMuPDF
def node_parse_pdf(state: DocumentAgentState) -> DocumentAgentState:
    logger.info(f"[Document Agent] Parsing PDF: {state['filename']}")
    file_path = state["file_path"]
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    doc = fitz.open(file_path)
    total_pages = len(doc)
    page_texts = []
    
    for page_num in range(total_pages):
        page = doc.load_page(page_num)
        text = page.get_text("text").strip()
        if text:
            page_texts.append({"page": page_num + 1, "text": text})
            
    doc.close()
    
    state["page_texts"] = page_texts
    state["total_pages"] = total_pages
    state["status"] = "parsed"
    return state

# Node 2: Clean & Chunk Text
def node_chunk_text(state: DocumentAgentState) -> DocumentAgentState:
    logger.info("[Document Agent] Chunking text...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    all_chunks = []
    for item in state.get("page_texts", []):
        chunks = text_splitter.split_text(item["text"])
        for chunk in chunks:
            all_chunks.append({
                "page": item["page"],
                "text": chunk
            })
            
    state["chunks"] = all_chunks
    state["total_chunks"] = len(all_chunks)
    state["status"] = "chunked"
    return state

# Node 3: Generate Embeddings
def node_generate_embeddings(state: DocumentAgentState) -> DocumentAgentState:
    logger.info("[Document Agent] Generating embeddings...")
    chunks = state.get("chunks", [])
    if not chunks:
        state["embeddings"] = []
        state["status"] = "embedded"
        return state
        
    model = get_embedding_model()
    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=False).tolist()
    
    state["embeddings"] = embeddings
    state["status"] = "embedded"
    return state

# Node 4: Store in MongoDB Atlas Vector Search
def node_store_in_mongo(state: DocumentAgentState) -> DocumentAgentState:
    logger.info("[Document Agent] Storing chunks in MongoDB Atlas Vector Search...")
    chunks = state.get("chunks", [])
    embeddings = state.get("embeddings", [])
    
    if not chunks:
        logger.warning(f"[Document Agent] No chunks to store for {state['filename']}")
        state["status"] = "indexed"
        return state
        
    chunks_col = get_chunks_collection()
    now = datetime.now(timezone.utc).isoformat()
    
    chunk_docs = []
    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        chunk_docs.append({
            "chunk_id": f"chk_{state['document_id']}_{i+1}",
            "document_id": state["document_id"],
            "workspace_id": state["workspace_id"],
            "filename": state["filename"],
            "page": chunk["page"],
            "text": chunk["text"],
            "embedding": emb,
            "created_at": now
        })

    if chunk_docs:
        chunks_col.insert_many(chunk_docs)
        
    logger.info(f"[Document Agent] Successfully indexed {len(chunk_docs)} chunks.")
    state["status"] = "indexed"
    return state

# ─── Compile LangGraph Document Agent Workflow ──────────────────────────────

def build_document_agent_graph():
    workflow = StateGraph(DocumentAgentState)
    
    workflow.add_node("parse", node_parse_pdf)
    workflow.add_node("chunk", node_chunk_text)
    workflow.add_node("embed", node_generate_embeddings)
    workflow.add_node("store", node_store_in_mongo)
    
    workflow.set_entry_point("parse")
    workflow.add_edge("parse", "chunk")
    workflow.add_edge("chunk", "embed")
    workflow.add_edge("embed", "store")
    workflow.add_edge("store", END)
    
    return workflow.compile()

document_agent_graph = build_document_agent_graph()

def process_and_index_document(file_path: str, workspace_id: str, document_id: str, filename: str) -> Dict[str, Any]:
    """
    Entry point for the Document Agent.
    Runs the LangGraph workflow for document ingestion.
    """
    initial_state: DocumentAgentState = {
        "file_path": file_path,
        "workspace_id": workspace_id,
        "document_id": document_id,
        "filename": filename,
        "page_texts": [],
        "chunks": [],
        "embeddings": [],
        "status": "initialized",
        "total_pages": 0,
        "total_chunks": 0
    }
    
    final_state = document_agent_graph.invoke(initial_state)
    
    return {
        "document_id": document_id,
        "status": "Success",
        "total_pages": final_state.get("total_pages", 0),
        "total_chunks": final_state.get("total_chunks", 0)
    }
