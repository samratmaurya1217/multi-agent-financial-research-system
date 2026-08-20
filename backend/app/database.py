"""
database.py — MongoDB Atlas connection for Velsora Multi-Agent Financial Research System
All credentials are loaded from the .env file via python-dotenv.
NEVER hardcode credentials in this file.
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.database import Database
from pymongo.collection import Collection

# Load .env from the backend directory (one level up from this file's package)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=False)

try:
    import dns.resolver
    resolver = dns.resolver.Resolver()
    resolver.nameservers = ['8.8.8.8', '1.1.1.1']
    dns.resolver.default_resolver = resolver
except Exception:
    pass

logger = logging.getLogger("velsora.database")

# ─── Connection URI — loaded from .env, never hardcoded ───────────────────────
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise EnvironmentError(
        "MONGO_URI is not set. "
        "Copy backend/.env.example to backend/.env and fill in your MongoDB Atlas URI."
    )
DB_NAME = os.getenv("MONGO_DB_NAME", "velsora")

# ─── Singleton client ─────────────────────────────────────────────────────────
_client: MongoClient | None = None
_db: Database | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
        logger.info("MongoDB: connected to Atlas cluster")
    return _client


def get_db() -> Database:
    global _db
    if _db is None:
        _db = get_client()[DB_NAME]
    return _db


# ─── Collection accessors ──────────────────────────────────────────────────────

def users_col() -> Collection:
    return get_db()["users"]

def workspaces_col() -> Collection:
    return get_db()["workspaces"]

def documents_col() -> Collection:
    return get_db()["documents"]

def conversations_col() -> Collection:
    return get_db()["conversations"]

def reports_col() -> Collection:
    return get_db()["reports"]

def jobs_col() -> Collection:
    return get_db()["jobs"]

def vector_chunks_col() -> Collection:
    """Collection prepared for MongoDB Atlas Vector Search embeddings & chunks."""
    return get_db()["document_chunks"]

def comparisons_col() -> Collection:
    return get_db()["comparisons"]

def audit_logs_col() -> Collection:
    return get_db()["audit_logs"]


# ─── Index Bootstrap ──────────────────────────────────────────────────────────

def ensure_indexes():
    """Create all required indexes on startup. Safe to call repeatedly."""
    db = get_db()

    db["users"].create_index([("email", ASCENDING)], unique=True, name="idx_users_email")

    db["workspaces"].create_index([("workspace_id", ASCENDING)], unique=True, name="idx_workspaces_id")
    db["workspaces"].create_index([("user_id", ASCENDING)], name="idx_workspaces_user")

    db["documents"].create_index([("document_id", ASCENDING)], unique=True, name="idx_docs_id")
    db["documents"].create_index([("workspace_id", ASCENDING)], name="idx_docs_workspace")

    db["conversations"].create_index([("conversation_id", ASCENDING)], unique=True, name="idx_conv_id")
    db["conversations"].create_index([("workspace_id", ASCENDING)], name="idx_conv_workspace")

    db["reports"].create_index([("report_id", ASCENDING)], unique=True, name="idx_reports_id")
    db["reports"].create_index([("workspace_id", ASCENDING)], name="idx_reports_workspace")

    db["comparisons"].create_index([("comparison_id", ASCENDING)], unique=True, name="idx_comparisons_id")
    db["comparisons"].create_index([("workspace_id", ASCENDING)], name="idx_comparisons_workspace")

    db["jobs"].create_index([("job_id", ASCENDING)], unique=True, name="idx_jobs_id")

    logger.info("MongoDB: all indexes ensured")


def ping() -> bool:
    """Verify connectivity. Returns True if connected, False otherwise."""
    try:
        get_client().admin.command("ping")
        return True
    except Exception as e:
        logger.error(f"MongoDB ping failed: {e}")
        return False
