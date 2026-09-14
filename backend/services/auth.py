"""
ASTRA VIGIL Security & Authentication Engine.

Implements Role-Based Access Control (RBAC), secure PBKDF2-HMAC-SHA256 password hashing,
cryptographic JWT session tokens (HMAC-SHA256), and automated audit logging for spaceflight
qualification environments.

Roles:
  - ADMIN: Full system administration, user management, and configuration.
  - ENGINEER: Can upload batches, execute AI screening pipelines, export qualification reports.
  - ANALYST: Can execute screening analysis, review components, and export reports.
  - VIEWER: Read-only inspection of flight components and qualification dashboards.
"""
import os
import time
import hmac
import base64
import hashlib
import json
from typing import Optional, List, Dict, Any
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from database import get_db
from models.orm_models import User, AuditLog

SECRET_KEY = os.environ.get("ASTRA_SECRET_KEY", "isro-astra-vigil-flight-qualification-key-2026-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 86400 * 7  # 7 days

ROLE_HIERARCHY = {
    "ADMIN": ["ADMIN", "ENGINEER", "ANALYST", "VIEWER"],
    "ENGINEER": ["ENGINEER", "ANALYST", "VIEWER"],
    "ANALYST": ["ANALYST", "VIEWER"],
    "VIEWER": ["VIEWER"],
}


# ==============================================================================
# Password Hashing & Verification (PBKDF2-HMAC-SHA256)
# ==============================================================================

def hash_password(password: str) -> str:
    """Generates a secure salt and hashes password via PBKDF2-HMAC-SHA256."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{salt.hex()}:{key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against stored salt:hash."""
    try:
        salt_hex, key_hex = hashed_password.split(":")
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(key, expected_key)
    except Exception:
        return False


# ==============================================================================
# JWT Generation & Decoding (Standard HMAC-SHA256)
# ==============================================================================

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (4 - len(data) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("utf-8"))


def create_access_token(data: Dict[str, Any], expires_delta_seconds: Optional[int] = None) -> str:
    """Creates a cryptographically signed JWT token."""
    now = int(time.time())
    expires = now + (expires_delta_seconds or ACCESS_TOKEN_EXPIRE_SECONDS)

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {**data, "iat": now, "exp": expires}

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))

    signature_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signature_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and verifies a JWT token signature and expiration."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Malformed token format")

        header_b64, payload_b64, sig_b64 = parts
        signature_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signature_input, hashlib.sha256).digest()
        provided_sig = _b64url_decode(sig_b64)

        if not hmac.compare_digest(provided_sig, expected_sig):
            raise ValueError("Invalid cryptographic signature")

        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if "exp" in payload and payload["exp"] < int(time.time()):
            raise ValueError("Token has expired")

        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ==============================================================================
# Dependency Resolvers & RBAC Enforcement
# ==============================================================================

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Extracts and verifies the user from the Bearer token."""
    if not authorization:
        # Default guest / fallback user for internal testing if unauthenticated
        guest = db.query(User).filter(User.username == "engineer").first()
        if guest:
            return guest
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing. Provide Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme. Must start with Bearer.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization[7:].strip()
    payload = decode_access_token(token)
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Token payload missing subject identifier")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User specified in token does not exist")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is deactivated")

    return user


def require_role(allowed_roles: List[str]):
    """Decorator / dependency returning an enforcement checker for specific RBAC roles."""
    def role_checker(current_user: User = Depends(get_current_user)):
        user_role = current_user.role.upper()
        # Admin can access everything
        if user_role == "ADMIN":
            return current_user
        if user_role in allowed_roles:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Role '{user_role}' is not authorized. Requires one of: {', '.join(allowed_roles)}"
        )
    return role_checker


# ==============================================================================
# Audit Logging Service
# ==============================================================================

def record_audit(
    db: Session,
    action: str,
    details: str,
    user: Optional[User] = None,
    username: Optional[str] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """Inserts an immutable audit record for traceability."""
    uname = username or (user.username if user else "SYSTEM")
    uid = user.id if user else None

    entry = AuditLog(
        user_id=uid,
        username=uname,
        action=action,
        details=details,
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


# ==============================================================================
# Default Spaceguard Qualification Accounts Initializer
# ==============================================================================

def init_default_users(db: Session):
    """Provisions default credentialed spaceflight accounts if database is fresh."""
    default_accounts = [
        ("admin", "admin@isro.gov.in", os.environ.get("ASTRA_ADMIN_PWD", "admin123"), "ADMIN"),
        ("engineer", "engineer@isro.gov.in", os.environ.get("ASTRA_ENG_PWD", "engineer123"), "ENGINEER"),
        ("analyst", "analyst@isro.gov.in", os.environ.get("ASTRA_ANALYST_PWD", "analyst123"), "ANALYST"),
        ("viewer", "viewer@isro.gov.in", os.environ.get("ASTRA_VIEWER_PWD", "viewer123"), "VIEWER"),
    ]

    for uname, email, pwd, role in default_accounts:
        existing = db.query(User).filter(User.username == uname).first()
        if not existing:
            u = User(
                username=uname,
                email=email,
                hashed_password=hash_password(pwd),
                role=role,
                is_active=True,
            )
            db.add(u)
    db.commit()
