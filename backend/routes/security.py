"""
SpaceGuard AI Security & TEE API Routes.
Exposes TEE status, hardware isolation indicators, attestation verification,
and security audit telemetry.
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import hmac
import hashlib
import json

from security.tee_service import tee_service

router = APIRouter(tags=["security"])


class AttestationVerificationRequest(BaseModel):
    attestation_report: Dict[str, Any]


@router.get("/api/security/tee/status")
@router.get("/security/tee/status")
def get_tee_status():
    """
    Returns current TEE security layer status, operating mode,
    hardware isolation status, and protected operation catalog.
    """
    return tee_service.get_status()


@router.get("/api/security/tee/attestation/latest")
def get_latest_attestation():
    """
    Returns the latest cryptographic attestation report generated
    during protected risk engine execution.
    """
    status = tee_service.get_status()
    if not status["attestation_available"]:
        return {
            "attestation_available": False,
            "message": "No protected screening executions recorded yet."
        }
    return {
        "attestation_available": True,
        "attestation_report": status["latest_attestation"]
    }


@router.get("/api/security/tee/audit")
def get_tee_audit_log(limit: int = Query(default=50, le=100)):
    """Returns safe TEE security audit events."""
    logs = tee_service.get_audit_log()
    return {
        "total_entries": len(logs),
        "entries": logs[-limit:]
    }


@router.post("/api/security/tee/verify-token")
def verify_attestation_token(payload: AttestationVerificationRequest):
    """
    Cryptographically verifies an attestation report against the enclave's signature.
    """
    report = payload.attestation_report
    sig = report.get("signature")
    if not sig:
        raise HTTPException(400, "Missing signature in attestation report.")

    secret = tee_service.config.attestation_secret
    expected_fields = {
        k: v for k, v in report.items()
        if k not in ("signature", "status", "verification", "protected_operations")
    }

    try:
        payload_bytes = json.dumps(expected_fields, sort_keys=True).encode("utf-8")
        expected_sig = hmac.new(
            secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()

        is_valid = hmac.compare_digest(sig, expected_sig)
        return {
            "valid": is_valid,
            "execution_id": report.get("execution_id"),
            "enclave_id": report.get("enclave_id"),
            "mode": report.get("mode"),
            "hardware_backed": report.get("hardware_backed", False),
            "verification_status": "SIGNATURE_VALID" if is_valid else "SIGNATURE_MISMATCH"
        }
    except Exception as exc:
        raise HTTPException(400, f"Attestation verification error: {str(exc)}")
