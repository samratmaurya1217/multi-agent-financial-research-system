"""
auth.py — Production Authentication & User Identity Management.
Supports Native HS256 JWTs, Secure Bcrypt Password Hashing, Google Firebase ID Tokens,
and Strict Workspace Isolation in MongoDB Atlas.
"""

import os
import time
import hashlib
import logging
from typing import Optional, Dict, Any
from pathlib import Path

from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=False)

import bcrypt
import jwt
import requests
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer

from app.database import users_col, workspaces_col

logger = logging.getLogger("velsora.auth")

JWT_SECRET = os.getenv("JWT_SECRET", "velsora_dev_jwt_secret_change_in_production_998877")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "72"))
JWT_EXPIRE_SECONDS = JWT_EXPIRE_HOURS * 3600

GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "velsora-29767")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

_cached_keys: Dict[str, Any] = {}
_keys_expiry: float = 0.0


# ─── Password & Token Helpers ────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash password securely using bcrypt with automatic salt."""
    if not password:
        return ""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify plain password against hashed password.
    Supports standard bcrypt hashes as well as legacy SHA-256 hashes.
    """
    if not plain_password or not hashed_password:
        return False

    # Check for bcrypt hash prefix
    if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$") or hashed_password.startswith("$2y$"):
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception as e:
            logger.warning(f"Bcrypt verification failed: {e}")
            return False

    # Backward-compatible check for legacy SHA-256 with project salt
    salt = "velsora_fintech_secure_salt"
    legacy_hash = hashlib.sha256(f"{salt}:{plain_password}".encode("utf-8")).hexdigest()
    return legacy_hash == hashed_password


def create_jwt_token(data: Dict[str, Any], expires_hours: Optional[int] = None) -> str:
    """Create a signed HS256 JWT access token with standard exp/iat/iss claims."""
    to_encode = data.copy()
    now = int(time.time())
    expire_seconds = (expires_hours * 3600) if expires_hours else JWT_EXPIRE_SECONDS
    
    # Never place password hashes or raw secrets inside JWT payload
    to_encode.pop("password", None)
    to_encode.pop("_id", None)

    to_encode.update({
        "iat": now,
        "exp": now + expire_seconds,
        "iss": "velsora.ai",
    })
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ─── Firebase RSA Public Keys ────────────────────────────────────────────────

def _fetch_google_public_keys() -> Dict[str, str]:
    global _cached_keys, _keys_expiry
    now = time.time()
    if _cached_keys and now < _keys_expiry:
        return _cached_keys

    try:
        resp = requests.get(GOOGLE_CERTS_URL, timeout=10)
        resp.raise_for_status()
        _cached_keys = resp.json()
        _keys_expiry = now + 3600
        return _cached_keys
    except Exception as e:
        logger.warning(f"Failed to fetch Google public keys: {e}")
        return _cached_keys


def _verify_firebase_token(id_token: str) -> Dict[str, Any]:
    """Verify Firebase ID token using Google public certs."""
    try:
        unverified_header = jwt.get_unverified_header(id_token)
    except Exception as e:
        raise ValueError(f"Invalid token header: {e}")

    kid = unverified_header.get("kid")
    if not kid:
        raise ValueError("Token header missing 'kid'")

    public_keys = _fetch_google_public_keys()
    cert_str = public_keys.get(kid)
    if not cert_str:
        raise ValueError(f"Public key not found for kid={kid}")

    from cryptography.x509 import load_pem_x509_certificate
    cert = load_pem_x509_certificate(cert_str.encode("utf-8"))
    public_key = cert.public_key()

    decoded = jwt.decode(
        id_token,
        public_key,
        algorithms=["RS256"],
        audience=FIREBASE_PROJECT_ID,
        issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}",
        options={"verify_exp": True},
    )
    decoded["uid"] = decoded.get("sub", "")
    return decoded


# ─── Unified Token Verification ──────────────────────────────────────────────

def verify_token(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Depends(oauth2_scheme),
) -> Dict[str, Any]:
    """
    Unified Token Verification:
    Strictly enforces valid HS256 JWT or RS256 Firebase token.
    Rejects missing, expired, tampered, or invalid tokens with HTTP 401.
    """
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
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Try Native HS256 JWT decode
    try:
        decoded = jwt.decode(
            raw_token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"verify_exp": True, "verify_signature": True}
        )
        decoded["uid"] = decoded.get("uid") or decoded.get("user_id") or decoded.get("sub", "")
        if not decoded["uid"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims: missing user identifier.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return decoded
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, jwt.DecodeError) as e:
        logger.debug(f"Native HS256 JWT decode failed: {e}")

    # 2. Try Firebase RS256 Token decode
    try:
        return _verify_firebase_token(raw_token)
    except Exception as e:
        logger.debug(f"Firebase RS256 token decode failed: {e}")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ─── Current User Resolver ───────────────────────────────────────────────────

def get_current_user(claims: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Retrieve or create user in MongoDB based on verified token claims."""
    email = claims.get("email", "").lower().strip()
    uid = claims.get("uid") or claims.get("sub") or (f"usr_{email.split('@')[0]}" if email else "usr_analyst")
    name = claims.get("name") or claims.get("displayName") or (email.split("@")[0].capitalize() if email else "Analyst")
    provider = claims.get("provider_id") or "password"
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Look up user in MongoDB by email, firebaseUid, or user_id
    query_conditions = [{"firebaseUid": uid}, {"user_id": uid}]
    if email:
        query_conditions.append({"email": email})
    user_doc = users_col().find_one({"$or": query_conditions})
    
    if not user_doc:
        clean_suffix = uid.replace("usr_", "").replace("@", "_").replace(".", "_")[:12]
        workspace_id = claims.get("workspaceId") or f"ws_{clean_suffix}"
        user_id = f"usr_{clean_suffix}"
        
        user_doc = {
            "user_id": user_id,
            "firebaseUid": uid,
            "email": email or f"{user_id}@velsora.ai",
            "displayName": name,
            "name": name,
            "provider": provider,
            "workspaceId": workspace_id,
            "role": "Analyst",
            "created_at": now,
            "updated_at": now,
        }
        users_col().insert_one(user_doc)

        # Create isolated workspace in MongoDB
        if not workspaces_col().find_one({"workspace_id": workspace_id}):
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
        # Ensure user has workspaceId
        if "workspaceId" not in user_doc or not user_doc["workspaceId"]:
            clean_suffix = user_doc["user_id"].replace("usr_", "")[:12]
            ws_id = f"ws_{clean_suffix}"
            users_col().update_one({"_id": user_doc["_id"]}, {"$set": {"workspaceId": ws_id, "updated_at": now}})
            user_doc["workspaceId"] = ws_id
            if not workspaces_col().find_one({"workspace_id": ws_id}):
                workspaces_col().insert_one({
                    "workspace_id": ws_id,
                    "user_id": user_doc["user_id"],
                    "name": f"{user_doc.get('name', 'Analyst')}'s Research Workspace",
                    "description": "Primary isolated research workspace",
                    "document_manifest": [],
                    "documents": [],
                    "status": "active",
                    "created_at": now,
                    "updated_at": now,
                })

    # Sanitize password out of returned user object
    user_doc.pop("password", None)
    return user_doc


# ─── Strict Workspace Isolation Helper ───────────────────────────────────────

def get_user_workspace(user: Dict[str, Any] = Depends(get_current_user), workspace_id: Optional[str] = None) -> str:
    """
    Return user's verified isolated workspace ID.
    If workspace_id is provided, strictly enforces ownership in MongoDB Atlas.
    Raises 403 Forbidden if the authenticated user is not authorized for the workspace.
    """
    user_id = user.get("user_id")
    allowed_ws = user.get("workspaceId") or f"ws_{user_id.replace('usr_', '')[:12]}"

    if not workspace_id or workspace_id in ["ws_default", "default", ""]:
        return allowed_ws

    ws_doc = workspaces_col().find_one({"workspace_id": workspace_id})
    if not ws_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace '{workspace_id}' not found."
        )

    # Verify authorization: user owns the workspace or it matches their assigned default
    if ws_doc.get("user_id") == user_id or ws_doc.get("workspace_id") == allowed_ws:
        return workspace_id

    # Check multi-tenant membership if workspace has a members list
    members = ws_doc.get("members", [])
    if user_id in members or user.get("email") in members:
        return workspace_id

    logger.warning(f"Unauthorized workspace access blocked: user '{user_id}' requested workspace '{workspace_id}' owned by '{ws_doc.get('user_id')}'")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Access forbidden: you do not have permission to access workspace '{workspace_id}'."
    )
