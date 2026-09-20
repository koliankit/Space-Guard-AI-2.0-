"""
SpaceGuard AI TEE Security Module.
Provides hardware-enforced and simulated Trusted Execution Environment boundaries
for sensitive AI inference, proprietary risk scoring parameters, and decision logic.
"""
from security.config import get_tee_config, TeeConfig
from security.tee_service import tee_service, TEEService

__all__ = ["get_tee_config", "TeeConfig", "tee_service", "TEEService"]
