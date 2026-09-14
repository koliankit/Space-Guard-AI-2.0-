from typing import Optional, List
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models.orm_models import User, AuditLog
from services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_role,
    record_audit,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    role: Optional[str] = "ENGINEER"


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticates flight qualification personnel and issues a JWT token."""
    username = payload.username.strip()
    user = db.query(User).filter(User.username == username).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        record_audit(
            db,
            action="LOGIN_FAILED",
            details=f"Failed login attempt for username '{username}'",
            username=username,
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(401, "Invalid username or password.")

    if not user.is_active:
        raise HTTPException(403, "User account is disabled. Contact system administrator.")

    token = create_access_token({
        "sub": user.username,
        "user_id": user.id,
        "role": user.role,
    })

    record_audit(
        db,
        action="LOGIN_SUCCESS",
        details=f"User '{user.username}' logged in with role '{user.role}'",
        user=user,
        ip_address=request.client.host if request.client else None,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
        },
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile and RBAC permissions."""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }


@router.post("/register")
def register(
    payload: RegisterRequest,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    """Admin-only user provisioning endpoint."""
    username = payload.username.strip()
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(400, f"Username '{username}' already exists.")

    valid_roles = ["ADMIN", "ENGINEER", "ANALYST", "VIEWER"]
    role = (payload.role or "ENGINEER").upper()
    if role not in valid_roles:
        raise HTTPException(400, f"Invalid role '{role}'. Valid roles: {valid_roles}")

    new_user = User(
        username=username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    record_audit(
        db,
        action="USER_CREATED",
        details=f"Admin '{current_user.username}' provisioned user '{new_user.username}' with role '{role}'",
        user=current_user,
    )

    return {
        "message": f"User '{new_user.username}' created successfully.",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "role": new_user.role,
        }
    }


@router.get("/audit")
def get_audit_trail(
    limit: int = 50,
    current_user: User = Depends(require_role(["ADMIN", "ENGINEER"])),
    db: Session = Depends(get_db),
):
    """Fetches recent immutable audit log records for space screening traceability."""
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "username": l.username,
            "action": l.action,
            "details": l.details,
            "ip_address": l.ip_address,
        }
        for l in logs
    ]
