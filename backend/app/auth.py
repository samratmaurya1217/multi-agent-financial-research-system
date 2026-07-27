"""
auth.py — Firebase ID Token verification and user management.

Verifies Firebase ID tokens using Google's public RSA keys (no service account needed).
Falls back to dev_token_ prefix in non-production environments.
"""

import os
import time
import logging
from typing import Optional, Dict, Any

import jwt
import requests
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer

from app.database import users_col, workspaces_col

logger = logging.getLogger("velsora.auth")

# ─── Google Public Keys Cache ────────────────────────────────────────────────
# Firebase ID tokens are signed with RS256 using Google's rotating public keys.
# We cache them in memory and refresh when they expire.

_cached_keys: Dict[str, Any] = {}
_keys_expiry: float = 0.0

GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "velsora-29767")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def _fetch_google_public_keys() -> Dict[str, str]:
    """Fetch Google's public X.509 certificates for Firebase token verification."""
    global _cached_keys, _keys_expiry

    now = time.time()
    if _cached_keys and now < _keys_expiry:
        return _cached_keys

    try:
        resp = requests.get(GOOGLE_CERTS_URL, timeout=10)
        resp.raise_for_status()
        _cached_keys = resp.json()

        # Parse Cache-Control max-age for expiry
        cache_control = resp.headers.get("Cache-Control", "")
        max_age = 3600  # default 1 hour
        for part in cache_control.split(","):
            part = part.strip()
            if part.startswith("max-age="):
                try:
                    max_age = int(part.split("=")[1])
                except ValueError:
                    pass
        _keys_expiry = now + max_age
        logger.info(f"Fetched {len(_cached_keys)} Google public keys (expires in {max_age}s)")
        return _cached_keys
    except Exception as e:
        logger.error(f"Failed to fetch Google public keys: {e}")
        if _cached_keys:
            return _cached_keys
        raise


def _verify_firebase_token(id_token: str) -> Dict[str, Any]:
    """Verify a Firebase ID token using Google's public RSA keys.
    
    This does NOT require a service account or GOOGLE_APPLICATION_CREDENTIALS.
    It verifies the JWT signature using Google's published public certificates.
    """
    # Decode header to get the key ID (kid)
    try:
        unverified_header = jwt.get_unverified_header(id_token)
    except jwt.exceptions.DecodeError as e:
        raise ValueError(f"Invalid token format: {e}")

    kid = unverified_header.get("kid")
    if not kid:
        raise ValueError("Token header missing 'kid' (key ID)")

    # Fetch public keys
    public_keys = _fetch_google_public_keys()
    cert_str = public_keys.get(kid)
    if not cert_str:
        # Key might have rotated — force refresh
        global _keys_expiry
        _keys_expiry = 0
        public_keys = _fetch_google_public_keys()
        cert_str = public_keys.get(kid)
        if not cert_str:
            raise ValueError(f"No matching public key found for kid={kid}")

    # Verify and decode the token
    from cryptography.x509 import load_pem_x509_certificate

    cert = load_pem_x509_certificate(cert_str.encode("utf-8"))
    public_key = cert.public_key()

    decoded = jwt.decode(
        id_token,
        public_key,
        algorithms=["RS256"],
        audience=FIREBASE_PROJECT_ID,
        issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}",
        options={
            "verify_exp": True,
            "verify_iat": True,
            "verify_aud": True,
            "verify_iss": True,
        },
    )

    # Firebase tokens must have a non-empty 'sub' (subject = user UID)
    if not decoded.get("sub"):
        raise ValueError("Token missing 'sub' claim (user UID)")

    # Normalize: Firebase uses 'sub' as UID, map it to 'uid' for consistency
    decoded["uid"] = decoded["sub"]
    return decoded


def verify_token(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Depends(oauth2_scheme),
) -> Dict[str, Any]:
    """Verify Firebase ID Token from Authorization header or OAuth2 scheme."""
    raw_token = None
    if token:
        raw_token = token
    elif authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split("Bearer ")[1].strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        decoded_token = _verify_firebase_token(raw_token)
        logger.info(f"Token verified for user: {decoded_token.get('email', 'unknown')}")
        return decoded_token
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        # In development: allow dev_token_ prefix for local testing
        if os.getenv("ENVIRONMENT") != "production" and raw_token.startswith("dev_token_"):
            uid = raw_token.replace("dev_token_", "")
            return {
                "uid": uid,
                "sub": uid,
                "email": f"{uid}@velsora.ai",
                "name": uid.capitalize(),
                "provider_id": "password",
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(claims: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Retrieve or create user in MongoDB based on verified Firebase token claims."""
    uid = claims.get("uid") or claims.get("sub")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing user identity (UID).")

    email = claims.get("email", f"{uid}@velsora.ai")
    name = claims.get("name") or claims.get("displayName") or email.split("@")[0]
    provider = claims.get("provider_id") or claims.get("firebase", {}).get("sign_in_provider", "firebase")
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Look up user in MongoDB
    user_doc = users_col().find_one({"firebaseUid": uid})
    if not user_doc:
        # Check if legacy user exists with same email to link account
        user_doc = users_col().find_one({"email": email})
        if user_doc:
            workspace_id = user_doc.get("workspaceId") or f"ws_{uid[:8]}"
            users_col().update_one(
                {"_id": user_doc["_id"]},
                {"$set": {"firebaseUid": uid, "provider": provider, "workspaceId": workspace_id, "updated_at": now}}
            )
            user_doc["firebaseUid"] = uid
            user_doc["workspaceId"] = workspace_id
        else:
            # Create new user record with assigned workspace
            workspace_id = f"ws_{uid[:8]}"
            user_doc = {
                "user_id": f"usr_{uid[:8]}",
                "firebaseUid": uid,
                "email": email,
                "displayName": name,
                "name": name,
                "provider": provider,
                "workspaceId": workspace_id,
                "role": "Analyst",
                "created_at": now,
                "updated_at": now,
            }
            users_col().insert_one(user_doc)

            # Create their default isolated workspace if missing
            if not workspaces_col().find_one({"workspace_id": workspace_id}):
                workspaces_col().insert_one({
                    "workspace_id": workspace_id,
                    "user_id": user_doc["user_id"],
                    "name": f"{name}'s Research Workspace",
                    "description": "Primary isolated research workspace",
                    "document_manifest": [],
                    "documents": [],
                    "status": "active",
                    "created_at": now,
                    "updated_at": now,
                })
    else:
        # Update display name if it changed (e.g. user updated their Google profile)
        updates = {}
        if name and name != user_doc.get("name"):
            updates["name"] = name
            updates["displayName"] = name
        if "workspaceId" not in user_doc:
            updates["workspaceId"] = f"ws_{uid[:8]}"
        if updates:
            updates["updated_at"] = now
            users_col().update_one({"_id": user_doc["_id"]}, {"$set": updates})
            user_doc.update(updates)

    return user_doc


def get_user_workspace(user: Dict[str, Any] = Depends(get_current_user), workspace_id: Optional[str] = None) -> str:
    """Strict workspace isolation helper.
    Returns the verified workspace ID for the user.
    If a workspace_id is requested, checks that it belongs to the authenticated user.
    Raises 403 Forbidden if attempting to access another user's workspace.
    """
    allowed_ws = user.get("workspaceId") or f"ws_{user['firebaseUid'][:8]}"
    if workspace_id and workspace_id != allowed_ws and workspace_id != "ws_default":
        ws_doc = workspaces_col().find_one({"workspace_id": workspace_id, "user_id": user.get("user_id")})
        if not ws_doc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. You do not have permission to view or modify workspace '{workspace_id}'."
            )
        return workspace_id
    return allowed_ws
