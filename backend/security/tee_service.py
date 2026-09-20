"""
SpaceGuard AI TEE Service Abstraction.
Coordinates Trusted Execution Environment operations, simulation boundaries,
hardware detection, attestation reports, and graceful fallback handling.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional, List
import pandas as pd

from security.config import get_tee_config, TeeConfig
from security.enclave_simulator import SimulationEnclave
from services import risk_engine

logger = logging.getLogger("spaceguard.security.tee")


class TEEService:
    """
    Main interface for the SpaceGuard AI TEE Security Layer.
    Provides defense-in-depth isolation for proprietary risk algorithms
    and flight qualification decisions.
    """

    def __init__(self):
        self.config: TeeConfig = get_tee_config()
        self._simulator: Optional[SimulationEnclave] = None
        self._audit_log: List[Dict[str, Any]] = []
        self._total_executions: int = 0
        self._successful_executions: int = 0
        self._fallback_executions: int = 0
        self._last_execution_time: Optional[str] = None
        self._latest_attestation: Optional[Dict[str, Any]] = None
        self._simulated_failure: bool = False
        self._simulated_unavailable: bool = False

        self._initialize_enclave()

    def _initialize_enclave(self):
        """Initializes the backend enclave (simulation or hardware driver)."""
        if self.config.enabled:
            self._simulator = SimulationEnclave(
                enclave_id=self.config.enclave_id,
                secret_key=self.config.attestation_secret
            )
            logger.info(
                f"[TEE Service] Initialized in {self.config.mode.upper()} mode "
                f"(Hardware Backed: {self.is_hardware_backed()})"
            )
        else:
            self._simulator = None
            logger.info("[TEE Service] TEE Security Layer is DISABLED.")

    def reload(self):
        """Reloads configuration and re-initializes service."""
        from security.config import reload_tee_config
        self.config = reload_tee_config()
        self._simulated_failure = False
        self._simulated_unavailable = False
        self._initialize_enclave()

    def is_enabled(self) -> bool:
        return self.config.enabled

    def is_hardware_backed(self) -> bool:
        if not self.config.enabled:
            return False
        # In simulation mode, hardware-backed is always explicitly False
        if self.config.mode == "simulation":
            return False
        return not self.config.require_hardware

    def get_status(self) -> Dict[str, Any]:
        """
        Returns real-time status of the TEE security layer.
        Exposed via GET /api/security/tee/status
        """
        is_active = self.is_enabled() and not self._simulated_unavailable

        if not self.is_enabled():
            state = "DISABLED"
            mode_display = "Disabled"
        elif self._simulated_unavailable:
            state = "UNAVAILABLE"
            mode_display = "Enclave Offline"
        elif self.config.mode == "simulation":
            state = "SIMULATION"
            mode_display = "Development / Simulation"
        else:
            state = "ENABLED"
            mode_display = "Secure Execution (Confidential)"

        return {
            "enabled": self.config.enabled,
            "status": state,
            "mode": self.config.mode,
            "mode_display": mode_display,
            "secure_execution": is_active,
            "hardware_backed": self.is_hardware_backed(),
            "enclave_id": self.config.enclave_id if self.config.enabled else None,
            "require_hardware": self.config.require_hardware,
            "fallback_allowed": self.config.fallback_allowed,
            "protected_operations": [
                "AI Inference Evaluation",
                "Sensitive Model Weights & Parameters",
                "Risk Score Multi-Factor Calculation",
                "Screening Decision Logic (SAFE/MONITOR/REJECT)",
                "Cryptographic Execution Attestation"
            ],
            "total_executions": self._total_executions,
            "successful_executions": self._successful_executions,
            "fallback_executions": self._fallback_executions,
            "last_execution_timestamp": self._last_execution_time,
            "attestation_available": self._latest_attestation is not None,
            "latest_attestation": self._latest_attestation,
            "disclaimer": (
                "TEE provides an optional hardware-backed isolation layer for selected sensitive computations. "
                "In simulation mode, execution is emulated for local development and is not hardware-protected."
            )
        }

    def execute_protected_risk_computation(
        self,
        df: pd.DataFrame,
        has_ml: bool = False,
        thresholds: Optional[Dict[str, int]] = None
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Routes the risk computation and decision logic through the TEE boundary.
        If TEE is disabled:
          Executes existing standard risk engine directly.
        If TEE is enabled:
          Executes inside enclave boundary and returns attested output.
        If TEE is unavailable / fails:
          Falls back gracefully if configured, or raises exception.
        """
        self._total_executions += 1
        now_iso = datetime.now(timezone.utc).isoformat()
        self._last_execution_time = now_iso

        # 1. TEE Disabled Path
        if not self.config.enabled:
            result_df = risk_engine.score_and_decide(df, has_ml=has_ml, thresholds=thresholds)
            self._successful_executions += 1
            meta = {
                "tee_enabled": False,
                "mode": "disabled",
                "attested": False,
                "status": "UNPROTECTED_STANDARD_EXECUTION"
            }
            self._record_audit(
                operation="RISK_SCORING",
                status="COMPLETED_UNPROTECTED",
                component_count=len(df),
                details="Standard pipeline execution (TEE disabled)."
            )
            return result_df, meta

        # 2. Check for simulated or real unavailability / hardware mismatch
        if self._simulated_unavailable or (self.config.require_hardware and not self.is_hardware_backed()):
            return self._handle_unavailable_or_failure(
                df, has_ml, thresholds,
                reason="TEE Enclave is offline or hardware attestation requirement not satisfied."
            )

        # 3. Protected Enclave Execution Path
        try:
            if self._simulated_failure:
                raise RuntimeError("Simulated enclave computation fault")

            if self._simulator is None:
                raise RuntimeError("Enclave simulator not initialized")

            result_df, attestation = self._simulator.execute_protected_computation(
                df, has_ml=has_ml, thresholds=thresholds
            )
            self._successful_executions += 1
            self._latest_attestation = attestation

            meta = {
                "tee_enabled": True,
                "mode": self.config.mode,
                "hardware_backed": self.is_hardware_backed(),
                "attested": True,
                "execution_id": attestation["execution_id"],
                "attestation_report": attestation,
                "status": "SECURE_EXECUTION_VERIFIED"
            }

            self._record_audit(
                operation="PROTECTED_RISK_COMPUTATION",
                status="SUCCESS",
                component_count=len(df),
                details=f"Attested execution {attestation['execution_id']} in {self.config.mode} mode."
            )

            return result_df, meta

        except Exception as exc:
            logger.warning(f"[TEE Service] Enclave execution failed: {exc}")
            return self._handle_unavailable_or_failure(
                df, has_ml, thresholds,
                reason=f"Enclave execution error: {str(exc)}"
            )

    def _handle_unavailable_or_failure(
        self,
        df: pd.DataFrame,
        has_ml: bool,
        thresholds: Optional[Dict[str, int]],
        reason: str
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Handles enclave failure according to configured fallback policy."""
        if not self.config.fallback_allowed:
            self._record_audit(
                operation="PROTECTED_RISK_COMPUTATION",
                status="FAILED_TERMINATED",
                component_count=len(df),
                details=f"Execution halted: {reason} (Fallback disallowed)."
            )
            raise RuntimeError(f"TEE security boundary failure and fallback disallowed: {reason}")

        # Fallback allowed: run standard risk engine without falsely claiming TEE protection
        self._fallback_executions += 1
        result_df = risk_engine.score_and_decide(df, has_ml=has_ml, thresholds=thresholds)

        # Tag DataFrame with explicit fallback indicator
        result_df = result_df.copy()
        result_df["tee_attested"] = False
        result_df["tee_fallback"] = True

        meta = {
            "tee_enabled": True,
            "mode": self.config.mode,
            "hardware_backed": False,
            "attested": False,
            "fallback_used": True,
            "fallback_reason": reason,
            "status": "FALLBACK_STANDARD_EXECUTION"
        }

        self._record_audit(
            operation="PROTECTED_RISK_COMPUTATION",
            status="FALLBACK_ENGAGED",
            component_count=len(df),
            details=f"Graceful fallback to standard risk engine: {reason}"
        )

        return result_df, meta

    def _record_audit(self, operation: str, status: str, component_count: int, details: str):
        """Records a safe audit event without logging proprietary weights or secrets."""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "operation": operation,
            "status": status,
            "mode": self.config.mode if self.config.enabled else "disabled",
            "hardware_backed": self.is_hardware_backed(),
            "component_count": component_count,
            "details": details
        }
        self._audit_log.append(entry)
        if len(self._audit_log) > 200:
            self._audit_log.pop(0)

    def get_audit_log(self) -> List[Dict[str, Any]]:
        return list(self._audit_log)

    def set_simulated_failure(self, value: bool):
        """Testing utility: simulates enclave runtime failure."""
        self._simulated_failure = value

    def set_simulated_unavailable(self, value: bool):
        """Testing utility: simulates enclave offline / unavailable state."""
        self._simulated_unavailable = value


# Singleton instance
tee_service = TEEService()
