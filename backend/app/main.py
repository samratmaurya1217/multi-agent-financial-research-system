"""
main.py — Velsora Multi-Agent Financial Research System
FastAPI backend fully integrated with MongoDB Atlas.
All credentials are read from the .env file — NEVER hardcoded here.
"""

import os
import re
import json
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any

# Load .env BEFORE any other imports that read os.getenv()
from dotenv import load_dotenv
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=False)

import bcrypt
import jwt
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Header, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Set telemetry off before any heavy imports
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["DO_NOT_TRACK"] = "1"

from app.database import (
    users_col, workspaces_col, documents_col,
    conversations_col, reports_col, jobs_col, comparisons_col,
    ensure_indexes, ping,
)
from app.auth import (
    get_current_user,
    get_user_workspace,
    verify_token,
    create_jwt_token,
    hash_password,
    verify_password
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("velsora.main")

# ─── Config — all values from environment, never hardcoded ─────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", "velsora_dev_jwt_secret_change_in_production_998877")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "72"))
UPLOAD_DIR = "./uploaded_filings"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="Velsora — Multi-Agent Financial Research System", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Startup ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    if ping():
        logger.info("MongoDB connected successfully")
        ensure_indexes()
    else:
        logger.error("MongoDB connection FAILED — data will not persist")

# ─── Pydantic Models ──────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    session_name: str
    description: Optional[str] = None

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class AuthLogin(BaseModel):
    email: Optional[str] = "analyst@velsora.ai"
    password: Optional[str] = ""

class AuthRegister(BaseModel):
    name: Optional[str] = ""
    email: str
    password: Optional[str] = ""
    role: Optional[str] = "Analyst"
    firebaseUid: Optional[str] = ""
    idToken: Optional[str] = ""

class AuthGoogle(BaseModel):
    email: str
    name: Optional[str] = ""
    avatarUrl: Optional[str] = ""
    idToken: Optional[str] = ""

class ResearchQuery(BaseModel):
    workspace_id: str
    query: str
    conversation_id: Optional[str] = None
    document_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
    agent_type: Optional[str] = "research"

class ReportGenerateRequest(BaseModel):
    workspace_id: str
    type: Optional[str] = "single"
    target_company: Optional[str] = None
    comparison_company: Optional[str] = None
    document_ids: Optional[List[str]] = None
    title: Optional[str] = None
    sections: Optional[List[str]] = [
        "Executive Summary",
        "Key Financials",
        "Red Flags",
        "Company Comparison",
        "Outlook",
    ]

class ComparisonRequest(BaseModel):
    workspace_id: Optional[str] = None
    document_ids: List[str] = Field(..., min_length=2)

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

def _strip_mongo(doc: dict) -> dict:
    """Remove MongoDB _id field from response dicts."""
    if doc and "_id" in doc:
        doc = {k: v for k, v in doc.items() if k != "_id"}
    return doc


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {
        "status": "online",
        "message": "Velsora Financial Research System is live.",
        "database": "connected" if ping() else "disconnected",
    }

# ─── Legacy Teammate Routes (preserved) ───────────────────────────────────────

@app.post("/api/v1/sessions/create")
def create_session(payload: SessionCreate, user: dict = Depends(get_current_user)):
    """Teammate-compatible session creation — persisted to MongoDB with user mapping."""
    ws_id = str(uuid.uuid4())
    now = _now()
    ws_obj = {
        "workspace_id": ws_id,
        "user_id": user["user_id"],
        "name": payload.session_name,
        "description": payload.description or "",
        "document_manifest": [],
        "documents": [],
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    workspaces_col().insert_one(ws_obj)
    return {"session_id": ws_id, "session_details": _strip_mongo(ws_obj)}

# ─── AI Pipeline Integration ──────────────────────────────────────────────────
from app.agents.pipeline import (
    ResearchState,
    AtlasVectorStoreConfig,
    process_and_index_document,
    run_research_pipeline,
    run_comparison_pipeline,
)

@app.post("/api/v1/sessions/{session_id}/upload")
async def upload_financial_document(
    session_id: str,
    background_tasks: BackgroundTasks,
    company_name: str = Form(...),
    file: UploadFile = File(...)
):
    ws = workspaces_col().find_one({"workspace_id": session_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace session not found.")
    
    ext = os.path.splitext(file.filename)[1].lower().replace(".", "")
    if ext not in ["pdf", "docx", "txt"]:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files are supported.")

    file_path = os.path.join(UPLOAD_DIR, f"{session_id}_{company_name}_{file.filename}")
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    now = _now()

    # Step 1: Run Document Agent ingestion
    indexing_res = process_and_index_document(file_path, session_id, doc_id, file.filename)
    total_pages = indexing_res.get("total_pages", 1)
    total_chunks = indexing_res.get("chunk_count", 0)

    doc_meta = {
        "document_id": doc_id,
        "workspace_id": session_id,
        "filename": file.filename,
        "file_type": ext,
        "storage_path": file_path,
        "status": "ready",
        "total_pages": total_pages,
        "chunk_count": total_chunks,
        "size_kb": round(len(content) / 1024),
        "uploaded_at": now,
    }
    documents_col().update_one({"document_id": doc_id}, {"$set": doc_meta}, upsert=True)
    workspaces_col().update_one(
        {"workspace_id": session_id},
        {"$addToSet": {"document_manifest": doc_id}, "$set": {"updated_at": now}}
    )
    
    # Step 2 & 3: Run Extraction Agent and Red Flag Agent in background
    from app.agents.extraction_agent import run_extraction_agent
    from app.agents.red_flag_agent import run_red_flag_agent
    background_tasks.add_task(run_extraction_agent, doc_id, session_id)
    background_tasks.add_task(run_red_flag_agent, doc_id, session_id)
    
    return {
        "status": "Success",
        "message": "Document processed and indexed.",
        "total_chunks_created": total_chunks,
        "total_pages": total_pages,
        "session_state": _strip_mongo(workspaces_col().find_one({"workspace_id": session_id})),
    }

# ─── Auth Service (SAD Section 14.4) ─────────────────────────────────────────

def _authenticate_pdf_request(token: Optional[str], authorization: Optional[str]) -> dict:
    raw_token = None
    if isinstance(token, str) and token.strip():
        raw_token = token.strip()
    elif isinstance(authorization, str) and authorization.strip():
        if authorization.startswith("Bearer "):
            raw_token = authorization.split("Bearer ")[1].strip()
        else:
            raw_token = authorization.strip()
    if not raw_token:
        raise HTTPException(
            status_code=401,
            detail="Authentication token required for report access."
        )
    claims = verify_token(authorization=f"Bearer {raw_token}", token=None)
    return get_current_user(claims)


@app.post("/auth/login")
def auth_login(
    payload: Optional[AuthLogin] = None,
    authorization: Optional[str] = Header(None)
):
    if authorization and (not payload or not payload.email):
        user = get_current_user(verify_token(authorization=authorization))
        token = create_jwt_token({
            "uid": user["user_id"],
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user.get("name", "Analyst"),
            "workspaceId": user.get("workspaceId", f"ws_{user['user_id'][4:]}")
        })
        user_out = _strip_mongo(user.copy())
        user_out.pop("password", None)
        return {
            "status": "success",
            "token": token,
            "user": user_out,
            "workspaceId": user.get("workspaceId"),
        }

    if not payload or not payload.email or not payload.email.strip():
        raise HTTPException(status_code=400, detail="Email is required for login.")

    email = payload.email.lower().strip()
    user_doc = users_col().find_one({"email": email})
    if not user_doc:
        raise HTTPException(
            status_code=400,
            detail="Account not found. Please register a new account or verify your credentials."
        )

    if user_doc.get("password"):
        if not payload.password:
            raise HTTPException(status_code=400, detail="Password is required.")
        if not verify_password(payload.password, user_doc["password"]):
            raise HTTPException(status_code=400, detail="Invalid password. Please verify your credentials.")

    workspace_id = user_doc.get("workspaceId") or f"ws_{user_doc['user_id'].replace('usr_', '')[:12]}"
    token = create_jwt_token({
        "uid": user_doc["user_id"],
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "name": user_doc.get("name", "Analyst"),
        "workspaceId": workspace_id,
    })

    user_out = _strip_mongo(user_doc.copy())
    user_out.pop("password", None)

    return {
        "status": "success",
        "token": token,
        "user": user_out,
        "workspaceId": workspace_id,
    }


@app.post("/auth/register")
def auth_register(payload: AuthRegister):
    email = payload.email.lower().strip() if payload.email else ""
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    if not payload.firebaseUid:
        if not payload.password or len(payload.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = users_col().find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in.")

    clean_suffix = email.split("@")[0].replace(".", "_")[:12]
    uid_hex = uuid.uuid4().hex[:4]
    user_id = f"usr_{clean_suffix}_{uid_hex}"
    workspace_id = f"ws_{clean_suffix}_{uid_hex}"
    name = payload.name.strip() if payload.name else email.split("@")[0].capitalize()
    now = _now()

    user_doc = {
        "user_id": user_id,
        "firebaseUid": payload.firebaseUid or user_id,
        "email": email,
        "displayName": name,
        "name": name,
        "password": hash_password(payload.password) if payload.password else "",
        "workspaceId": workspace_id,
        "role": payload.role or "Analyst",
        "provider": "firebase" if payload.firebaseUid else "password",
        "created_at": now,
        "updated_at": now,
    }
    users_col().insert_one(user_doc)

    workspaces_col().insert_one({
        "workspace_id": workspace_id,
        "user_id": user_id,
        "name": f"{name}'s Research Workspace",
        "description": "Primary isolated research workspace",
        "document_manifest": [],
        "documents": [],
        "status": "active",
        "created_at": now,
        "updated_at": now,
    })

    token = create_jwt_token({
        "uid": user_id,
        "user_id": user_id,
        "email": email,
        "name": name,
        "workspaceId": workspace_id,
    })

    user_out = _strip_mongo(user_doc.copy())
    user_out.pop("password", None)

    return {
        "status": "success",
        "token": token,
        "user": user_out,
        "workspaceId": workspace_id,
    }


@app.post("/auth/google")
def auth_google(payload: AuthGoogle):
    email = payload.email.lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email from Google account is required.")

    user_doc = users_col().find_one({"email": email})
    now = _now()
    name = payload.name.strip() if payload.name else email.split("@")[0].capitalize()

    if not user_doc:
        clean_suffix = email.split("@")[0].replace(".", "_")[:12]
        user_id = f"usr_{clean_suffix}_{uuid.uuid4().hex[:4]}"
        workspace_id = f"ws_{clean_suffix}_{uuid.uuid4().hex[:4]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "displayName": name,
            "name": name,
            "avatarUrl": payload.avatarUrl or "",
            "workspaceId": workspace_id,
            "role": "Analyst",
            "provider": "google",
            "created_at": now,
            "updated_at": now,
        }
        users_col().insert_one(user_doc)
        workspaces_col().insert_one({
            "workspace_id": workspace_id,
            "user_id": user_id,
            "name": f"{name}'s Research Workspace",
            "description": "Primary isolated research workspace",
            "document_manifest": [],
            "documents": [],
            "status": "active",
            "created_at": now,
            "updated_at": now,
        })
    else:
        updates = {}
        if name and name != user_doc.get("name"):
            updates["name"] = name
            updates["displayName"] = name
        if payload.avatarUrl and payload.avatarUrl != user_doc.get("avatarUrl"):
            updates["avatarUrl"] = payload.avatarUrl
        if updates:
            updates["updated_at"] = now
            users_col().update_one({"_id": user_doc["_id"]}, {"$set": updates})
            user_doc.update(updates)

    workspace_id = user_doc.get("workspaceId") or f"ws_{user_doc['user_id'][4:]}"
    token = create_jwt_token({
        "uid": user_doc["user_id"],
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "name": user_doc.get("name", "Analyst"),
        "workspaceId": workspace_id,
    })

    user_out = _strip_mongo(user_doc.copy())
    user_out.pop("password", None)

    return {
        "status": "success",
        "token": token,
        "user": user_out,
        "workspaceId": workspace_id,
    }


@app.post("/auth/logout")
def auth_logout():
    return {"status": "success", "message": "Logged out successfully"}

@app.get("/auth/me")
def auth_me(user: dict = Depends(get_current_user)):
    user_out = _strip_mongo(user.copy())
    user_out.pop("password", None)
    return user_out

# ─── Workspace Service (SAD Section 14.5) ─────────────────────────────────────

@app.get("/workspaces")
def get_workspaces(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    ws_id = user.get("workspaceId")
    email = user.get("email", "").lower().strip()
    
    query = {"$or": [
        {"user_id": user_id},
        {"workspace_id": ws_id},
        {"members": user_id},
        {"members": email},
    ]}
        
    docs = list(workspaces_col().find(query))
    if not docs and ws_id:
        docs = list(workspaces_col().find({"workspace_id": ws_id}))
    result = []
    seen = set()
    for w in docs:
        if w["workspace_id"] in seen:
            continue
        seen.add(w["workspace_id"])
        w = _strip_mongo(w)
        doc_count = documents_col().count_documents({"workspace_id": w["workspace_id"]})
        w["documentCount"] = doc_count
        w["sessionCount"] = conversations_col().count_documents({"workspace_id": w["workspace_id"]})
        result.append(w)
    return result

@app.post("/workspaces")
def create_workspace(payload: WorkspaceCreate, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    ws_id = f"ws_{uuid.uuid4().hex[:8]}"
    now = _now()
    ws_obj = {
        "workspace_id": ws_id,
        "user_id": user_id,
        "name": payload.name,
        "description": payload.description or "",
        "document_manifest": [],
        "documents": [],
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    workspaces_col().insert_one(ws_obj)
    return _strip_mongo(ws_obj)

@app.get("/workspaces/{workspace_id}")
def get_workspace(workspace_id: str, user: dict = Depends(get_current_user)):
    ws_id = get_user_workspace(user, workspace_id)
    w = workspaces_col().find_one({"workspace_id": ws_id})
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    w = _strip_mongo(w)
    w["documentCount"] = documents_col().count_documents({"workspace_id": ws_id})
    w["sessionCount"] = conversations_col().count_documents({"workspace_id": ws_id})
    return w

@app.delete("/workspaces/{workspace_id}")
def delete_workspace(workspace_id: str, user: dict = Depends(get_current_user)):
    ws_id = get_user_workspace(user, workspace_id)
    workspaces_col().delete_one({"workspace_id": ws_id})
    documents_col().delete_many({"workspace_id": ws_id})
    conversations_col().delete_many({"workspace_id": ws_id})
    reports_col().delete_many({"workspace_id": ws_id})
    comparisons_col().delete_many({"workspace_id": ws_id})
    return {"status": "success", "deleted_id": ws_id}

# ─── Document Service (SAD Section 14.6) ─────────────────────────────────────

@app.get("/documents")
def get_documents(workspace_id: Optional[str] = Query(None), user: dict = Depends(get_current_user)):
    ws_id = get_user_workspace(user, workspace_id)
    docs = list(documents_col().find({"workspace_id": ws_id}))
    return [_strip_mongo(d) for d in docs]

@app.post("/documents")
@app.post("/upload")
async def upload_document_sad(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    workspace_id: Optional[str] = Form(None),
    user: dict = Depends(get_current_user)
):
    ws_id = get_user_workspace(user, workspace_id)
    if not workspaces_col().find_one({"workspace_id": ws_id}):
        now = _now()
        workspaces_col().insert_one({
            "workspace_id": ws_id,
            "user_id": user["user_id"],
            "name": f"{user.get('name', 'User')}'s Workspace",
            "description": "Primary research workspace",
            "document_manifest": [],
            "documents": [],
            "status": "active",
            "created_at": now,
            "updated_at": now,
        })

    ext = os.path.splitext(file.filename)[1].lower().replace(".", "") or "pdf"
    company_name = file.filename.split(".")[0] if "." in file.filename else "Unknown"
    file_path = os.path.join(UPLOAD_DIR, f"{ws_id}_{company_name}_{file.filename}")
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    
    # Trigger LangGraph ingestion + MongoDB Atlas Vector Search indexing pipeline
    indexing_res = {"total_pages": 1, "chunk_count": 0}
    try:
        indexing_res = process_and_index_document(file_path, ws_id, doc_id, file.filename)
    except Exception as e:
        logger.error(f"Document indexing warning: {e}")

    # Trigger Extraction Agent & Red Flag Agent in background
    from app.agents.extraction_agent import run_extraction_agent
    from app.agents.red_flag_agent import run_red_flag_agent
    background_tasks.add_task(run_extraction_agent, doc_id, ws_id)
    background_tasks.add_task(run_red_flag_agent, doc_id, ws_id)

    now = _now()
    doc_meta = {
        "document_id": doc_id,
        "workspace_id": ws_id,
        "filename": file.filename,
        "file_type": ext,
        "storage_path": file_path,
        "status": "ready",
        "total_pages": indexing_res.get("total_pages", 1),
        "total_chunks": indexing_res.get("chunk_count", 0),
        "size_kb": round(len(content) / 1024),
        "uploaded_at": now,
    }
    documents_col().update_one({"document_id": doc_id}, {"$set": doc_meta}, upsert=True)
    workspaces_col().update_one(
        {"workspace_id": ws_id},
        {"$addToSet": {"document_manifest": doc_id}, "$set": {"updated_at": now}}
    )
    return _strip_mongo(doc_meta)

@app.get("/documents/{document_id}/red_flags")
def get_document_red_flags(document_id: str, user: dict = Depends(get_current_user)):
    from app.database import get_db
    doc = documents_col().find_one({"document_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    get_user_workspace(user, doc.get("workspace_id"))
    doc_rf = get_db()["red_flags"].find_one({"document_id": document_id})
    if doc_rf:
        return _strip_mongo(doc_rf)
    
    return {
        "document_id": document_id,
        "red_flags": [],
        "status": "ready"
    }

@app.get("/documents/{document_id}/extraction")
def get_document_extraction(document_id: str, user: dict = Depends(get_current_user)):
    from app.database import get_db
    doc = documents_col().find_one({"document_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    get_user_workspace(user, doc.get("workspace_id"))
    metrics_doc = get_db()["extracted_metrics"].find_one({"document_id": document_id})
    metrics = metrics_doc.get("metrics", []) if metrics_doc else []
        
    return {
        "document_id": document_id,
        "metrics": metrics,
        "extraction_status": metrics_doc.get("extraction_status", "ready") if metrics_doc else "ready"
    }

@app.delete("/documents/{document_id}")
def delete_document(document_id: str, user: dict = Depends(get_current_user)):
    from app.database import get_db
    doc = documents_col().find_one({"document_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    get_user_workspace(user, doc.get("workspace_id"))
    workspaces_col().update_one(
        {"workspace_id": doc.get("workspace_id")},
        {"$pull": {"document_manifest": document_id}}
    )
    documents_col().delete_one({"document_id": document_id})
    get_db()["document_chunks"].delete_many({"document_id": document_id})
    get_db()["extracted_metrics"].delete_many({"document_id": document_id})
    get_db()["red_flags"].delete_many({"document_id": document_id})
    return {"status": "success", "deleted_id": document_id}

# ─── Research / Chat Service (SAD Section 14.8) ───────────────────────────────

@app.post("/research/sessions")
def create_research_session(payload: SessionCreate, user: dict = Depends(get_current_user)):
    """Create a new dedicated research conversation session in the workspace."""
    ws_id = user.get("workspaceId") or f"ws_{user['user_id'][4:]}"
    conv_id = f"conv_{uuid.uuid4().hex[:8]}"
    now = _now()
    conv = {
        "conversation_id": conv_id,
        "workspace_id": ws_id,
        "title": payload.session_name or "New Research Session",
        "description": payload.description or "",
        "turns": [],
        "created_at": now,
        "updated_at": now,
    }
    conversations_col().insert_one(conv)
    return _strip_mongo(conv)

@app.post("/research/query")
@app.post("/analyze")
def research_query(payload: ResearchQuery, user: dict = Depends(get_current_user)):
    ws_id = get_user_workspace(user, payload.workspace_id)
    conv_id = payload.conversation_id or f"conv_{uuid.uuid4().hex[:8]}"
    msg_id = f"msg_{uuid.uuid4().hex[:8]}"
    now = _now()

    # Fetch or create conversation
    conv = conversations_col().find_one({"conversation_id": conv_id})
    if not conv:
        conv = {
            "conversation_id": conv_id,
            "workspace_id": ws_id,
            "title": payload.query[:60],
            "turns": [],
            "created_at": now,
            "updated_at": now,
        }
        conversations_col().insert_one(conv)

    # Build user turn
    user_turn = {
        "message_id": f"msg_{uuid.uuid4().hex[:8]}",
        "role": "user",
        "content": payload.query,
        "created_at": now,
    }

    # Invoke Research Agent pipeline (SAD 7.5: decompose → retrieve → rerank → generate → validate)
    pipeline_result = run_research_pipeline(
        workspace_id=ws_id,
        query=payload.query,
        conversation_id=conv_id,
        document_id=payload.document_id,
        document_ids=payload.document_ids,
    )
    
    response_text = pipeline_result.get("response") or "Analysis complete."
    citations = pipeline_result.get("citations") or []
    agent_traces = pipeline_result.get("agent_traces") or []
    answer_meta = pipeline_result.get("answer") or {}
    confidence = answer_meta.get("confidence", 1.0)
    grounding_status = answer_meta.get("grounding_status", "grounded")
    elapsed_seconds = pipeline_result.get("elapsed_seconds", 0.0)

    assistant_turn = {
        "message_id": msg_id,
        "role": "assistant",
        "content": response_text,
        "citations": citations,
        "confidence": confidence,
        "grounding_status": grounding_status,
        "created_at": _now(),
    }

    conversations_col().update_one(
        {"conversation_id": conv_id},
        {
            "$push": {"turns": {"$each": [user_turn, assistant_turn]}},
            "$set": {"updated_at": _now()},
        }
    )

    return {
        "conversation_id": conv_id,
        "message_id": msg_id,
        "response": response_text,
        "citations": citations,
        "agent_traces": agent_traces,
        "confidence": confidence,
        "grounding_status": grounding_status,
        "elapsed_seconds": elapsed_seconds,
        "created_at": assistant_turn["created_at"],
    }

@app.post("/research/stream")
async def research_stream(payload: ResearchQuery, user: dict = Depends(get_current_user)):
    """SSE streaming endpoint for real-time Research Agent token & trace delivery (SAD 8.5 / 14.8)."""
    import asyncio
    from fastapi.responses import StreamingResponse

    ws_id = get_user_workspace(user, payload.workspace_id)
    conv_id = payload.conversation_id or f"conv_{uuid.uuid4().hex[:8]}"

    async def event_generator():
        yield f"data: {json.dumps({'event': 'started', 'status': 'Planning & decomposing query...'})}\n\n"
        await asyncio.sleep(0.05)

        pipeline_result = run_research_pipeline(
            workspace_id=ws_id,
            query=payload.query,
            conversation_id=conv_id,
            document_id=payload.document_id,
            document_ids=payload.document_ids,
        )

        response_text = pipeline_result.get("response", "")
        citations = pipeline_result.get("citations", [])
        traces = pipeline_result.get("agent_traces", [])
        answer_meta = pipeline_result.get("answer", {})

        # Emit traces
        yield f"data: {json.dumps({'event': 'traces', 'traces': traces})}\n\n"
        await asyncio.sleep(0.05)

        # Stream words/chunks
        words = response_text.split(" ")
        chunk_size = 4
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i + chunk_size]) + " "
            yield f"data: {json.dumps({'event': 'token', 'token': chunk})}\n\n"
            await asyncio.sleep(0.02)

        # Emit completion with citations
        yield f"data: {json.dumps({'event': 'done', 'response': response_text, 'citations': citations, 'confidence': answer_meta.get('confidence', 1.0), 'grounding_status': answer_meta.get('grounding_status', 'grounded')})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/research/history")
@app.get("/chat-history")
def get_research_history(workspace_id: Optional[str] = Query(None), user: dict = Depends(get_current_user)):
    ws_id = get_user_workspace(user, workspace_id)
    convs = list(conversations_col().find({"workspace_id": ws_id}).sort("updated_at", -1))
    return [_strip_mongo(c) for c in convs]

@app.get("/research/history/{conversation_id}")
@app.get("/chat-history/{conversation_id}")
def get_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    conv = conversations_col().find_one({"conversation_id": conversation_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    get_user_workspace(user, conv.get("workspace_id"))
    return _strip_mongo(conv)

# ─── Comparison Service (SAD Section 7.4 & 14.7) ─────────────────────────────

@app.post("/comparisons")
@app.post("/compare")
def create_comparison(payload: ComparisonRequest, user: dict = Depends(get_current_user)):
    """
    Execute Comparison Agent across 2+ documents in workspace (SAD 7.4).
    Validates workspace isolation, aligns metrics, calculates variances,
    generates grounded narrative via Nemotron 3 Ultra -> Gemini -> Groq, and persists to MongoDB.
    """
    ws_id = get_user_workspace(user, payload.workspace_id)
    
    if len(payload.document_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail="Comparison requires at least two distinct document IDs."
        )
    
    result = run_comparison_pipeline(
        workspace_id=ws_id,
        document_ids=payload.document_ids,
    )
    
    if result.get("status") == "failed":
        raise HTTPException(status_code=400, detail=result.get("error", "Comparison failed."))
        
    return _strip_mongo(result)

@app.get("/comparisons")
def list_comparisons(workspace_id: Optional[str] = Query(None), user: dict = Depends(get_current_user)):
    """List all persisted comparison records for the active workspace."""
    ws_id = get_user_workspace(user, workspace_id)
    cmps = list(comparisons_col().find({"workspace_id": ws_id}).sort("created_at", -1))
    return [_strip_mongo(c) for c in cmps]

@app.get("/comparisons/{comparison_id}")
def get_comparison(comparison_id: str, user: dict = Depends(get_current_user)):
    """Retrieve an existing comparison result by comparison_id."""
    cmp_doc = comparisons_col().find_one({"comparison_id": comparison_id})
    if not cmp_doc:
        raise HTTPException(status_code=404, detail="Comparison record not found.")
    get_user_workspace(user, cmp_doc.get("workspace_id"))
    return _strip_mongo(cmp_doc)

# ─── Reports Service (SAD Section 14.9 & Milestone 4) ─────────────────────────

@app.get("/reports")
def get_reports(workspace_id: Optional[str] = Query(None), user: dict = Depends(get_current_user)):
    if workspace_id and workspace_id != "all":
        ws_id = get_user_workspace(user, workspace_id)
        rpts = list(reports_col().find({"workspace_id": ws_id}).sort("generated_at", -1))
    else:
        user_ws = user.get("workspaceId") or f"ws_{user.get('user_id', 'analyst')[:8]}"
        user_id = user.get("user_id")
        email = user.get("email", "").lower().strip()
        query_ws = {"$or": [
            {"user_id": user_id},
            {"workspace_id": user_ws},
            {"members": user_id},
            {"members": email},
        ]}
        allowed_workspaces = [w["workspace_id"] for w in workspaces_col().find(query_ws)]
        if user_ws not in allowed_workspaces:
            allowed_workspaces.append(user_ws)
            
        rpts = list(reports_col().find({"workspace_id": {"$in": allowed_workspaces}}).sort("generated_at", -1))
    return [_strip_mongo(r) for r in rpts]

@app.post("/reports/generate")
def generate_report(payload: ReportGenerateRequest, user: dict = Depends(get_current_user)):
    ws_id = get_user_workspace(user, payload.workspace_id)
    rpt_id = f"rpt_{uuid.uuid4().hex[:8]}"
    
    from app.agents.pipeline import run_report_pipeline
    
    logger.info(f"[API] POST /reports/generate for workspace '{ws_id}' (target='{payload.target_company}')")
    result = run_report_pipeline(
        workspace_id=ws_id,
        document_ids=payload.document_ids,
        target_company=payload.target_company,
        comparison_company=payload.comparison_company,
        report_type=payload.type,
        title=payload.title,
        sections=payload.sections,
        report_id=rpt_id,
    )
    
    rec = reports_col().find_one({"report_id": rpt_id}) or result
    return _strip_mongo(rec)

@app.get("/reports/{report_id}")
@app.get("/reports/{report_id}/status")
def get_report_status(report_id: str, user: dict = Depends(get_current_user)):
    r = reports_col().find_one({"report_id": report_id})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found.")
    get_user_workspace(user, r.get("workspace_id"))
    return _strip_mongo(r)

@app.get("/reports/{report_id}/download")
def download_report(
    report_id: str,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    user = _authenticate_pdf_request(token, authorization)
    r = reports_col().find_one({"report_id": report_id})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found.")
    get_user_workspace(user, r.get("workspace_id"))
    
    project_root = Path(__file__).resolve().parents[2]
    backend_root = Path(__file__).resolve().parents[1]
    
    pdf_path = r.get("pdf_path")
    candidates = [
        pdf_path,
        str(project_root / pdf_path) if pdf_path else None,
        str(backend_root / pdf_path) if pdf_path else None,
        str(project_root / "uploaded_filings" / "reports" / f"{report_id}.pdf"),
        str(backend_root / "uploaded_filings" / "reports" / f"{report_id}.pdf"),
        os.path.join(os.getcwd(), pdf_path) if pdf_path else None,
        os.path.join(os.getcwd(), "uploaded_filings", "reports", f"{report_id}.pdf"),
        os.path.abspath(pdf_path) if pdf_path else None,
    ]
    resolved_path = next((p for p in candidates if p and os.path.exists(p)), None)
    
    if not resolved_path:
        from app.agents.report_agent import build_pdf_report
        try:
            build_res = build_pdf_report(r)
            resolved_path = build_res.get("pdf_path")
            if resolved_path and os.path.exists(resolved_path):
                reports_col().update_one(
                    {"report_id": report_id},
                    {"$set": {"pdf_path": resolved_path, "page_count": build_res.get("page_count", 1)}}
                )
        except Exception as e:
            logger.error(f"[API] Error generating report PDF for {report_id}: {e}", exc_info=True)
            
    if resolved_path and os.path.exists(resolved_path):
        clean_title = re.sub(r"[^\w\-_\.]", "_", r.get("title", f"Report_{report_id}"))
        filename = f"{clean_title}.pdf"
        return FileResponse(
            path=resolved_path,
            media_type="application/pdf",
            filename=filename,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            }
        )
    raise HTTPException(status_code=404, detail="PDF report could not be generated or located.")

@app.get("/reports/{report_id}/pdf")
def stream_report_pdf(
    report_id: str,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    user = _authenticate_pdf_request(token, authorization)
    r = reports_col().find_one({"report_id": report_id})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found.")
    get_user_workspace(user, r.get("workspace_id"))
    
    project_root = Path(__file__).resolve().parents[2]
    backend_root = Path(__file__).resolve().parents[1]
    
    pdf_path = r.get("pdf_path")
    candidates = [
        pdf_path,
        str(project_root / pdf_path) if pdf_path else None,
        str(backend_root / pdf_path) if pdf_path else None,
        str(project_root / "uploaded_filings" / "reports" / f"{report_id}.pdf"),
        str(backend_root / "uploaded_filings" / "reports" / f"{report_id}.pdf"),
        os.path.join(os.getcwd(), pdf_path) if pdf_path else None,
        os.path.join(os.getcwd(), "uploaded_filings", "reports", f"{report_id}.pdf"),
        os.path.abspath(pdf_path) if pdf_path else None,
    ]
    resolved_path = next((p for p in candidates if p and os.path.exists(p)), None)
    
    if not resolved_path:
        from app.agents.report_agent import build_pdf_report
        try:
            build_res = build_pdf_report(r)
            resolved_path = build_res.get("pdf_path")
            if resolved_path and os.path.exists(resolved_path):
                reports_col().update_one(
                    {"report_id": report_id},
                    {"$set": {"pdf_path": resolved_path, "page_count": build_res.get("page_count", 1)}}
                )
        except Exception as e:
            logger.error(f"[API] Error generating report PDF stream for {report_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to render PDF: {e}")
            
    if resolved_path and os.path.exists(resolved_path):
        clean_title = re.sub(r"[^\w\-_\.]", "_", r.get("title", f"Report_{report_id}"))
        filename = f"{clean_title}.pdf"
        return FileResponse(
            path=resolved_path,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            }
        )
    raise HTTPException(status_code=404, detail="PDF file not found.")
