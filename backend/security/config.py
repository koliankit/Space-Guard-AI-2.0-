"""
SpaceGuard AI TEE Configuration.
Reads environment variables for TEE deployment, simulation modes, and fallback policies.
"""
import os
from typing import Dict, Any


class TeeConfig:
    def __init__(self):
        # Master toggle: TEE_ENABLED (defaults to true so simulation is active out-of-the-box, but toggleable)
        raw_enabled = os.environ.get("TEE_ENABLED", "true").strip().lower()
        self.enabled: bool = raw_enabled in ("true", "1", "yes", "on")

        # TEE Execution Mode: "simulation" (development) | "production" (confidential hardware)
        self.mode: str = os.environ.get("TEE_MODE", "simulation").strip().lower()
        if self.mode not in ("simulation", "production"):
            self.mode = "simulation"

        # Hardware Enforcement: if true, simulation cannot substitute for real hardware
        raw_req_hw = os.environ.get("TEE_REQUIRE_HARDWARE", "false").strip().lower()
        self.require_hardware: bool = raw_req_hw in ("true", "1", "yes", "on")

        # Fallback Policy: whether standard (unprotected) execution is allowed if TEE fails/unavailable
        raw_fallback = os.environ.get("TEE_FALLBACK_ALLOWED", "true").strip().lower()
        self.fallback_allowed: bool = raw_fallback in ("true", "1", "yes", "on")

        # Enclave Identifier & Secrets
        self.enclave_id: str = os.environ.get("TEE_ENCLAVE_ID", "spaceguard-tee-enclave-sim-01")
        self.attestation_secret: str = os.environ.get(
            "TEE_ATTESTATION_SECRET",
            "spaceguard-tee-attestation-hmac-secret-v1"
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "mode": self.mode,
            "require_hardware": self.require_hardware,
            "fallback_allowed": self.fallback_allowed,
            "enclave_id": self.enclave_id,
            "hardware_backed": False if self.mode == "simulation" else not self.require_hardware,
        }


_config_instance = None


def get_tee_config() -> TeeConfig:
    global _config_instance
    if _config_instance is None:
        _config_instance = TeeConfig()
    return _config_instance


def reload_tee_config() -> TeeConfig:
    global _config_instance
    _config_instance = TeeConfig()
    return _config_instance
