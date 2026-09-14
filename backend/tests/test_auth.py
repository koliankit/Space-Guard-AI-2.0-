import pytest
from starlette.testclient import TestClient
import main
from database import init_db, SessionLocal
from services.auth import hash_password, verify_password, create_access_token, decode_access_token, init_default_users

init_db()
with SessionLocal() as db:
    init_default_users(db)

client = TestClient(main.app)


def test_password_hashing_and_verification():
    pwd = "SpaceflightQualification#2026"
    h = hash_password(pwd)
    assert verify_password(pwd, h) is True
    assert verify_password("wrong_password", h) is False


def test_jwt_token_flow():
    payload = {"sub": "flight_lead", "role": "ENGINEER"}
    token = create_access_token(payload, expires_delta_seconds=3600)
    assert isinstance(token, str)

    decoded = decode_access_token(token)
    assert decoded["sub"] == "flight_lead"
    assert decoded["role"] == "ENGINEER"


def test_auth_login_success_and_me():
    # Login with default seeded engineer
    res = client.post("/api/auth/login", json={"username": "engineer", "password": "engineer123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    token = data["access_token"]
    assert data["user"]["username"] == "engineer"
    assert data["user"]["role"] == "ENGINEER"

    # Call /api/auth/me with Bearer token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["username"] == "engineer"
    assert me_data["role"] == "ENGINEER"


def test_auth_login_failure():
    res = client.post("/api/auth/login", json={"username": "engineer", "password": "wrong_password"})
    assert res.status_code == 401


def test_admin_register_and_audit():
    # 1. Login as admin
    admin_res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert admin_res.status_code == 200
    admin_token = admin_res.json()["access_token"]

    # 2. Register new analyst user
    import time
    new_uname = f"analyst_test_{int(time.time())}"
    reg_res = client.post(
        "/api/auth/register",
        json={"username": new_uname, "password": "password123", "role": "ANALYST"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert reg_res.status_code == 200
    assert reg_res.json()["user"]["username"] == new_uname

    # 3. Check audit log
    audit_res = client.get("/api/auth/audit", headers={"Authorization": f"Bearer {admin_token}"})
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0
    actions = [l["action"] for l in logs]
    assert "LOGIN_SUCCESS" in actions
    assert "USER_CREATED" in actions
