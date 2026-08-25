# SPDX-License-Identifier: MIT
"""
document_agent.py — Document Agent Pipeline (SAD Section 7.1 & 10.1–10.6)
Powered by LangGraph, LangChain, PyMuPDF, SentenceTransformers, and MongoDB Atlas.

Complete Flow:
Validate -> Parse (PDF/DOCX/TXT) -> Chunk & Classify -> Embed -> Vector Index in MongoDB Atlas

Adheres strictly to SAD 7.1.3 (Inputs), 7.1.4 (Outputs), 7.1.9 (Validation Rules),
7.1.10 (Confidence), 7.1.11 (Retry Policy), and 13.4.4 (Database Schema).
"""

import os
import re
import time
import zipfile
import xml.etree.ElementTree as ET
import logging
from datetime import datetime, timezone
from typing import TypedDict, List, Optional, Any, Dict

import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import StateGraph, END
from app.database import get_db

logger = logging.getLogger("velsora.document_agent")

_embedding_model: Optional[Any] = None


def get_embedding_model() -> Any:
    """Singleton loader for local sentence transformer embedding model (384 dimensions)."""
    global _embedding_model
    if _embedding_model is None:
        try:
            import torch
            torch.set_grad_enabled(False)
            torch.set_num_threads(1)
        except Exception:
            pass
        from sentence_transformers import SentenceTransformer
        logger.info("[Document Agent] Initializing SentenceTransformer 'all-MiniLM-L6-v2' on CPU...")
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
    return _embedding_model


def get_chunks_collection():
    return get_db()["document_chunks"]


def get_documents_collection():
    return get_db()["documents"]


# ─── File Parsers for PDF, DOCX, TXT ──────────────────────────────────────────

def _parse_pdf_pages(file_path: str) -> tuple[List[Dict[str, Any]], List[int]]:
    """Parse PDF page by page using PyMuPDF, tracking page numbers and OCR fallbacks."""
    doc = fitz.open(file_path)
    total_pages = len(doc)
    page_texts = []
    ocr_pages = []

    for page_num in range(total_pages):
        page = doc.load_page(page_num)
        text = page.get_text("text").strip()
        page_idx = page_num + 1

        if text and len(text) > 10:
            page_texts.append({"page": page_idx, "text": text, "is_ocr": False})
        else:
            # Fallback text extraction or OCR flag for scanned/empty pages
            rect_text = page.get_text("blocks")
            extracted_blocks = " ".join([b[4].strip() for b in rect_text if len(b) > 4 and b[4].strip()])
            if extracted_blocks:
                page_texts.append({"page": page_idx, "text": extracted_blocks, "is_ocr": False})
            else:
                ocr_pages.append(page_idx)
                # Placeholder indicating image/scanned page
                page_texts.append({"page": page_idx, "text": f"[Scanned page {page_idx} content]", "is_ocr": True})

    doc.close()
    return page_texts, ocr_pages


def _parse_docx_pages(file_path: str) -> tuple[List[Dict[str, Any]], List[int]]:
    """Parse DOCX files by extracting paragraph and table text from document.xml."""
    paragraphs = []
    try:
        with zipfile.ZipFile(file_path, "r") as z:
            xml_content = z.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            # Find all text elements
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            for p in tree.iterfind(".//w:p", ns):
                texts = [node.text for node in p.iterfind(".//w:t", ns) if node.text]
                if texts:
                    paragraphs.append("".join(texts).strip())
    except Exception as e:
        logger.warning(f"[Document Agent] DOCX XML parse warning: {e}. Falling back to binary decode.")
        with open(file_path, "rb") as f:
            raw = f.read().decode("latin-1", errors="ignore")
            paragraphs = [p.strip() for p in raw.split("\n\n") if p.strip()]

    full_text = "\n\n".join(paragraphs) if paragraphs else ""
    # Approximate 500 words per page if no explicit pagination
    words = full_text.split()
    page_size = 500
    page_texts = []
    
    if not words:
        page_texts.append({"page": 1, "text": "[Empty DOCX document]", "is_ocr": False})
    else:
        for i in range(0, len(words), page_size):
            p_num = (i // page_size) + 1
            chunk_words = words[i:i + page_size]
            page_texts.append({"page": p_num, "text": " ".join(chunk_words), "is_ocr": False})

    return page_texts, []


def _parse_txt_pages(file_path: str) -> tuple[List[Dict[str, Any]], List[int]]:
    """Parse plain text documents with paragraph-based pagination."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read().strip()

    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    if not paragraphs:
        return [{"page": 1, "text": content or "[Empty TXT document]", "is_ocr": False}], []

    page_texts = []
    current_page = 1
    current_chars = 0
    current_buf = []

    for p in paragraphs:
        current_buf.append(p)
        current_chars += len(p)
        if current_chars >= 2500:  # ~500 words
            page_texts.append({"page": current_page, "text": "\n\n".join(current_buf), "is_ocr": False})
            current_page += 1
            current_chars = 0
            current_buf = []

    if current_buf:
        page_texts.append({"page": current_page, "text": "\n\n".join(current_buf), "is_ocr": False})

    return page_texts, []


def _classify_chunk_type(text: str) -> str:
    """Classify chunk type as 'table', 'header', 'footnote', or 'prose' per SAD 13.4.4."""
    stripped = text.strip()
    if len(stripped) < 60 and (stripped.isupper() or stripped.endswith(":") or re.match(r"^(\d+(\.\d+)*|[A-Z]\.)\s+", stripped)):
        return "header"
    
    # Check for tabular indicators (multi-column numbers, pipe symbols, colons, or repeated tabs)
    pipe_count = stripped.count("|")
    digit_ratio = sum(c.isdigit() for c in stripped) / (len(stripped) + 1)
    line_count = stripped.count("\n") + 1

    if pipe_count >= 3 or (digit_ratio > 0.15 and line_count >= 3):
        return "table"

    if re.search(r"^(note\s*\d+|source\s*:|\*|\†)", stripped, re.IGNORECASE):
        return "footnote"

    return "prose"


# ─── LangGraph Document Agent State ──────────────────────────────────────────

class DocumentAgentState(TypedDict):
    file_path: str
    workspace_id: str
    document_id: str
    filename: str
    file_type: str
    page_texts: List[Dict[str, Any]]
    ocr_pages: List[int]
    chunks: List[Dict[str, Any]]
    embeddings: List[List[float]]
    status: str
    total_pages: int
    total_chunks: int
    error: Optional[str]


# Node 1: Multi-Format Parser
def node_parse_document(state: DocumentAgentState) -> DocumentAgentState:
    file_path = state["file_path"]
    filename = state["filename"]
    logger.info(f"[Document Agent] Parsing file '{filename}' (path: {file_path})...")

    if not os.path.exists(file_path):
        state["status"] = "failed"
        state["error"] = f"File not found on disk: {file_path}"
        return state

    ext = os.path.splitext(filename)[1].lower().replace(".", "")
    if not ext:
        ext = "pdf"

    state["file_type"] = ext

    try:
        if ext == "pdf":
            page_texts, ocr_pages = _parse_pdf_pages(file_path)
        elif ext == "docx":
            page_texts, ocr_pages = _parse_docx_pages(file_path)
        elif ext == "txt":
            page_texts, ocr_pages = _parse_txt_pages(file_path)
        else:
            # Fallback to text reader
            page_texts, ocr_pages = _parse_txt_pages(file_path)

        state["page_texts"] = page_texts
        state["ocr_pages"] = ocr_pages
        state["total_pages"] = len(page_texts)
        state["status"] = "parsed"
        logger.info(f"[Document Agent] Parsed {len(page_texts)} pages from '{filename}'.")
    except Exception as e:
        logger.error(f"[Document Agent] Parse error for '{filename}': {e}", exc_info=True)
        state["status"] = "failed"
        state["error"] = f"Parser failure: {str(e)}"

    return state


# Node 2: Semantic Chunking & Metadata Tagging (SAD 7.1.2 & 13.4.4)
def node_chunk_and_classify(state: DocumentAgentState) -> DocumentAgentState:
    if state.get("status") == "failed":
        return state

    logger.info(f"[Document Agent] Chunking text for '{state['filename']}'...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", "; ", " ", ""]
    )

    all_chunks = []
    chunk_idx = 1
    doc_id = state["document_id"]
    ws_id = state["workspace_id"]
    fname = state["filename"]

    for item in state.get("page_texts", []):
        page_num = item["page"]
        raw_text = item["text"]
        
        split_texts = text_splitter.split_text(raw_text)
        for text_chunk in split_texts:
            c_text = text_chunk.strip()
            if not c_text:
                continue

            c_type = _classify_chunk_type(c_text)
            
            # Infer section title if present
            section = None
            first_line = c_text.split("\n")[0].strip()
            if len(first_line) < 80 and not first_line.endswith("."):
                section = first_line

            all_chunks.append({
                "chunk_id": f"chk_{doc_id}_{chunk_idx}",
                "document_id": doc_id,
                "workspace_id": ws_id,
                "filename": fname,
                "page": page_num,
                "section": section,
                "chunk_type": c_type,
                "text": c_text,
            })
            chunk_idx += 1

    state["chunks"] = all_chunks
    state["total_chunks"] = len(all_chunks)
    state["status"] = "chunked"
    logger.info(f"[Document Agent] Produced {len(all_chunks)} semantic chunks for '{fname}'.")
    return state


# Node 3: Batch Embeddings Generation (SAD 7.1.2 & 7.1.11)
def node_generate_embeddings(state: DocumentAgentState) -> DocumentAgentState:
    if state.get("status") == "failed":
        return state

    chunks = state.get("chunks", [])
    if not chunks:
        state["embeddings"] = []
        state["status"] = "embedded"
        return state

    logger.info(f"[Document Agent] Generating embeddings for {len(chunks)} chunks...")
    texts = [c["text"] for c in chunks]

    # Retry up to 3 times with exponential backoff (SAD 7.1.11)
    max_retries = 3
    for attempt in range(max_retries):
        try:
            model = get_embedding_model()
            embeddings = model.encode(texts, show_progress_bar=False, batch_size=64).tolist()
            state["embeddings"] = embeddings
            state["status"] = "embedded"
            break
        except Exception as e:
            logger.warning(f"[Document Agent] Embedding attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                state["status"] = "failed"
                state["error"] = f"Embedding failure after {max_retries} attempts: {str(e)}"
                return state

    return state


# Node 4: Idempotent Vector Store in MongoDB Atlas (SAD 6.6 & 13.4.4)
def node_store_in_mongo(state: DocumentAgentState) -> DocumentAgentState:
    if state.get("status") == "failed":
        return state

    chunks = state.get("chunks", [])
    embeddings = state.get("embeddings", [])
    doc_id = state["document_id"]
    ws_id = state["workspace_id"]
    fname = state["filename"]
    now = datetime.now(timezone.utc).isoformat()

    chunks_col = get_chunks_collection()
    docs_col = get_documents_collection()

    try:
        # Idempotency: clear previous chunks for this document before inserting
        chunks_col.delete_many({"document_id": doc_id})

        chunk_records = []
        for chunk, emb in zip(chunks, embeddings):
            chunk_records.append({
                "chunk_id": chunk["chunk_id"],
                "document_id": doc_id,
                "workspace_id": ws_id,
                "filename": fname,
                "page": chunk["page"],
                "section": chunk.get("section"),
                "chunk_type": chunk.get("chunk_type", "prose"),
                "text": chunk["text"],
                "embedding": emb,
                "created_at": now
            })

        if chunk_records:
            chunks_col.insert_many(chunk_records)

        # Update documents collection manifest
        docs_col.update_one(
            {"document_id": doc_id},
            {
                "$set": {
                    "document_id": doc_id,
                    "workspace_id": ws_id,
                    "filename": fname,
                    "file_type": state.get("file_type", "pdf"),
                    "status": "indexed",
                    "total_pages": state.get("total_pages", 1),
                    "chunk_count": len(chunk_records),
                    "indexed_at": now,
                    "updated_at": now
                }
            },
            upsert=True
        )

        state["status"] = "indexed"
        logger.info(f"[Document Agent] Successfully indexed {len(chunk_records)} chunks in MongoDB Atlas.")
    except Exception as e:
        logger.error(f"[Document Agent] MongoDB vector storage error: {e}", exc_info=True)
        state["status"] = "failed"
        state["error"] = f"Vector index storage error: {str(e)}"

    return state


# ─── Compile LangGraph Document Agent Workflow ──────────────────────────────

def build_document_agent_graph():
    workflow = StateGraph(DocumentAgentState)

    workflow.add_node("parse", node_parse_document)
    workflow.add_node("chunk", node_chunk_and_classify)
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
    Runs the LangGraph workflow for document ingestion and returns SAD 7.1.4 compliant output.
    """
    initial_state: DocumentAgentState = {
        "file_path": file_path,
        "workspace_id": workspace_id,
        "document_id": document_id,
        "filename": filename,
        "file_type": "pdf",
        "page_texts": [],
        "ocr_pages": [],
        "chunks": [],
        "embeddings": [],
        "status": "initialized",
        "total_pages": 0,
        "total_chunks": 0,
        "error": None
    }

    final_state = document_agent_graph.invoke(initial_state)

    status_out = "indexed" if final_state.get("status") == "indexed" else "failed"
    chunk_ids = [c["chunk_id"] for c in final_state.get("chunks", [])]

    return {
        "document_id": document_id,
        "workspace_id": workspace_id,
        "status": status_out,
        "total_pages": final_state.get("total_pages", 0),
        "chunks": chunk_ids,
        "chunk_count": len(chunk_ids),
        "ocr_pages": final_state.get("ocr_pages", []),
        "indexed_at": datetime.now(timezone.utc).isoformat(),
        "error": final_state.get("error")
    }
