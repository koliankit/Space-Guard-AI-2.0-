"""
SpaceGuard AI TEE Security Layer Test Suite.
Validates the 11 critical requirements:
  1. TEE disabled
  2. TEE simulation enabled
  3. TEE unavailable (fallback policy)
  4. Protected computation success
  5. Protected computation failure handling
  6. Invalid TEE response / signature verification
  7. Existing SAFE decision preservation
  8. Existing MONITOR decision preservation
  9. Existing REJECT decision preservation
  10. Existing CSV analysis pipeline integration
  11. Existing 3D localization subsystem mapping
"""
import pytest
import pandas as pd
import numpy as np
import hmac
import hashlib
import json

from security.tee_service import tee_service
from security.config import get_tee_config
from services import pipeline, risk_engine, satellite_mapper


@pytest.fixture(autouse=True)
def reset_tee_state():
    """Ensures each test starts with a clean TEE service state."""
    tee_service.reload()
    tee_service.set_simulated_failure(False)
    tee_service.set_simulated_unavailable(False)
    yield
    tee_service.reload()
    tee_service.set_simulated_failure(False)
    tee_service.set_simulated_unavailable(False)


def _make_sample_df(count: int = 5) -> pd.DataFrame:
    """Helper to generate valid synthetic screening rows."""
    return pd.DataFrame([
        {
            "component_id": f"PART-{i:03d}",
            "lot_id": f"LOT-{(i % 2) + 1}",
            "subsystem": "PWR" if i % 2 == 0 else "AOCS",
            "component_type": "Linear Voltage Regulator",
            "parameter": "Leakage Current (µA)",
            "unit": "µA",
            "v0": 10.0 + i * 0.1,
            "v24": 10.2 + i * 0.1,
            "v96": 10.4 + i * 0.1,
            "v168": 10.5 + i * 0.1,
            "limit": 50.0,
            "datasheet_min": 0.0,
            "datasheet_max": 50.0,
            "temperature_c": 125.0,
            "lot_mean": 10.5,
            "lot_median": 10.5,
            "lot_std": 0.3,
            "lot_mad": 0.2,
            "lot_pct_dev": 1.0,
            "z168": 0.2,
            "robust_z168": 0.2,
            "z_slope": 0.1,
            "slope": 0.003,
            "iso_score": 10.0,
            "predicted_future": 11.0,
            "breach_probability": 0.0,
            "safety_slope_exceeded": False,
            "is_latent_defect": False,
            "drift_trend": "NOMINAL / STABLE",
        }
        for i in range(count)
    ])


# ==============================================================================
# 1. TEE Disabled Test
# ==============================================================================
def test_1_tee_disabled():
    tee_service.config.enabled = False
    df = _make_sample_df(3)
    result_df, meta = tee_service.execute_protected_risk_computation(df)

    assert meta["tee_enabled"] is False
    assert meta["attested"] is False
    assert meta["status"] == "UNPROTECTED_STANDARD_EXECUTION"
    assert "risk_score" in result_df.columns
    assert "status" in result_df.columns
    assert len(result_df) == 3


# ==============================================================================
# 2. TEE Simulation Enabled Test
# ==============================================================================
def test_2_tee_simulation_enabled():
    tee_service.config.enabled = True
    tee_service.config.mode = "simulation"
    df = _make_sample_df(4)
    result_df, meta = tee_service.execute_protected_risk_computation(df)

    assert meta["tee_enabled"] is True
    assert meta["mode"] == "simulation"
    assert meta["hardware_backed"] is False
    assert meta["attested"] is True
    assert "execution_id" in meta
    assert "attestation_report" in meta
    assert result_df["tee_attested"].all() == True

    # Validate status response
    status = tee_service.get_status()
    assert status["enabled"] is True
    assert status["status"] == "SIMULATION"
    assert status["hardware_backed"] is False
    assert len(status["protected_operations"]) >= 4


# ==============================================================================
# 3. TEE Unavailable Test (Fallback Handling)
# ==============================================================================
def test_3_tee_unavailable_fallback():
    tee_service.config.enabled = True
    tee_service.config.fallback_allowed = True
    tee_service.set_simulated_unavailable(True)

    df = _make_sample_df(3)
    # Must NOT crash: fallback policy engages
    result_df, meta = tee_service.execute_protected_risk_computation(df)

    assert meta["fallback_used"] is True
    assert meta["attested"] is False
    assert meta["status"] == "FALLBACK_STANDARD_EXECUTION"
    assert "risk_score" in result_df.columns

    # Now verify with fallback DISALLOWED
    tee_service.config.fallback_allowed = False
    with pytest.raises(RuntimeError, match="fallback disallowed"):
        tee_service.execute_protected_risk_computation(df)


# ==============================================================================
# 4. Protected Computation Success Test
# ==============================================================================
def test_4_protected_computation_success():
    tee_service.config.enabled = True
    df = _make_sample_df(5)
    result_df, meta = tee_service.execute_protected_risk_computation(df)

    assert len(result_df) == 5
    assert meta["attested"] is True
    report = meta["attestation_report"]
    assert report["component_count"] == 5
    assert report["signature"] is not None
    assert report["status"] == "ATTESTED_VALID"
    assert all(0 <= s <= 100 for s in result_df["risk_score"])


# ==============================================================================
# 5. Protected Computation Failure Test
# ==============================================================================
def test_5_protected_computation_failure():
    tee_service.config.enabled = True
    tee_service.config.fallback_allowed = True
    tee_service.set_simulated_failure(True)

    df = _make_sample_df(2)
    # When enclave crashes, fallback should catch it gracefully
    result_df, meta = tee_service.execute_protected_risk_computation(df)

    assert meta["fallback_used"] is True
    assert "fault" in meta["fallback_reason"].lower() or "error" in meta["fallback_reason"].lower()
    assert len(result_df) == 2


# ==============================================================================
# 6. Invalid TEE Response / Attestation Tamper Test
# ==============================================================================
def test_6_invalid_tee_response_tamper_detection():
    tee_service.config.enabled = True
    df = _make_sample_df(3)
    _, meta = tee_service.execute_protected_risk_computation(df)
    report = dict(meta["attestation_report"])

    # Verify original valid signature
    secret = tee_service.config.attestation_secret
    expected_fields = {
        k: v for k, v in report.items()
        if k not in ("signature", "status", "verification", "protected_operations")
    }
    valid_sig = hmac.new(
        secret.encode("utf-8"),
        json.dumps(expected_fields, sort_keys=True).encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    assert hmac.compare_digest(report["signature"], valid_sig)

    # Tamper with output hash
    tampered_report = dict(report)
    tampered_report["output_hash"] = "deadbeef12345678deadbeef"
    tampered_fields = {
        k: v for k, v in tampered_report.items()
        if k not in ("signature", "status", "verification", "protected_operations")
    }
    tampered_sig = hmac.new(
        secret.encode("utf-8"),
        json.dumps(tampered_fields, sort_keys=True).encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    # The tampered fields DO NOT match the original signature
    assert not hmac.compare_digest(report["signature"], tampered_sig)


# ==============================================================================
# 7. Existing SAFE Decision Test
# ==============================================================================
def test_7_existing_safe_decision():
    safe_data = pd.DataFrame([{
        "component_id": "C-SAFE-01",
        "lot_id": "L1",
        "v0": 10.0, "v24": 10.1, "v168": 10.2, "limit": 50.0,
        "datasheet_min": 0.0, "datasheet_max": 50.0,
        "lot_mean": 10.2, "lot_std": 0.2, "lot_median": 10.2, "lot_mad": 0.15,
        "lot_pct_dev": 0.5, "is_latent_defect": False,
        "z168": 0.3, "robust_z168": 0.3, "z_slope": 0.1, "slope": 0.001,
        "predicted_future": 10.5, "future_limit_breach": False, "breach_probability": 0.0,
        "safety_slope_exceeded": False,
        "drift_trend": "NOMINAL / STABLE", "iso_score": 10.0,
        "subsystem": "PWR",
    }])

    result_df, _ = tee_service.execute_protected_risk_computation(safe_data)
    row = result_df.iloc[0]

    assert row["status"] == "safe"
    assert row["risk_level"] == "LOW"
    assert row["traditional_decision"] == "PASS"
    assert row["risk_score"] < 30


# ==============================================================================
# 8. Existing MONITOR Decision Test
# ==============================================================================
def test_8_existing_monitor_decision():
    monitor_data = pd.DataFrame([{
        "component_id": "C-MONITOR-01",
        "lot_id": "L1",
        "v0": 10.0, "v24": 20.0, "v168": 42.0, "limit": 50.0,  # 84% of limit (>= 80%)
        "datasheet_min": 0.0, "datasheet_max": 50.0,
        "lot_mean": 15.0, "lot_std": 4.0, "lot_median": 15.0, "lot_mad": 3.0,
        "lot_pct_dev": 180.0, "is_latent_defect": False,
        "z168": 2.2, "robust_z168": 2.2, "z_slope": 1.5, "slope": 0.019,
        "predicted_future": 46.0, "future_limit_breach": False, "breach_probability": 0.3,
        "safety_slope_exceeded": False,
        "drift_trend": "LINEAR POSITIVE DRIFT", "iso_score": 50.0,
        "subsystem": "TTC",
    }])

    result_df, _ = tee_service.execute_protected_risk_computation(monitor_data)
    row = result_df.iloc[0]

    assert row["status"] == "monitor"
    assert row["traditional_decision"] == "PASS"


# ==============================================================================
# 9. Existing REJECT Decision Test
# ==============================================================================
def test_9_existing_reject_decision():
    # A) Limit breach component -> traditional FAIL
    breach_data = pd.DataFrame([{
        "component_id": "C-REJECT-BREACH",
        "lot_id": "L1",
        "v0": 20.0, "v24": 35.0, "v168": 58.0, "limit": 50.0,
        "datasheet_min": 0.0, "datasheet_max": 50.0,
        "lot_mean": 15.0, "lot_std": 2.0, "lot_median": 15.0, "lot_mad": 1.5,
        "lot_pct_dev": 286.0, "is_latent_defect": True,
        "z168": 21.5, "robust_z168": 28.6, "z_slope": 10.0, "slope": 0.166,
        "predicted_future": 75.0, "future_limit_breach": True, "breach_probability": 1.0,
        "safety_slope_exceeded": True,
        "drift_trend": "ACCELERATING POSITIVE DRIFT", "iso_score": 95.0,
        "subsystem": "PWR",
    }])

    result_df, _ = tee_service.execute_protected_risk_computation(breach_data)
    row = result_df.iloc[0]

    assert row["status"] == "reject"
    assert row["risk_level"] == "CRITICAL"
    assert row["traditional_decision"] == "FAIL"
    assert row["risk_score"] >= 80

    # B) Latent defect: passes static limit (35 < 50) but abnormal relative to lot
    latent_data = pd.DataFrame([{
        "component_id": "C-REJECT-LATENT",
        "lot_id": "L1",
        "v0": 15.0, "v24": 22.0, "v168": 36.0, "limit": 50.0,
        "datasheet_min": 0.0, "datasheet_max": 50.0,
        "lot_mean": 12.0, "lot_std": 1.0, "lot_median": 12.0, "lot_mad": 0.8,
        "lot_pct_dev": 200.0, "is_latent_defect": True,
        "z168": 24.0, "robust_z168": 30.0, "z_slope": 5.0, "slope": 0.09,
        "predicted_future": 55.0, "future_limit_breach": True, "breach_probability": 0.9,
        "safety_slope_exceeded": False,
        "drift_trend": "ACCELERATING POSITIVE DRIFT", "iso_score": 85.0,
        "subsystem": "AOCS",
    }])

    res_latent, _ = tee_service.execute_protected_risk_computation(latent_data)
    row_latent = res_latent.iloc[0]

    assert row_latent["status"] == "reject"
    assert row_latent["traditional_decision"] == "PASS"


# ==============================================================================
# 10. Existing CSV Analysis Pipeline Integration Test
# ==============================================================================
def test_10_existing_csv_analysis_pipeline():
    raw_df = pd.DataFrame([
        {
            "component_id": f"COMP-{i:03d}",
            "lot_id": f"LOT-{(i % 3) + 1}",
            "v0": 10.0 + i * 0.2,
            "v24": 10.3 + i * 0.2,
            "v96": 10.6 + i * 0.2,
            "v168": 11.0 + (50.0 if i == 0 else i * 0.2),  # First component is an outlier
            "limit": 50.0,
            "datasheet_min": 0.0,
            "datasheet_max": 50.0,
            "subsystem": "PWR",
        }
        for i in range(15)
    ])

    result_df, ml_meta, eval_metrics, lot_summaries = pipeline.run_pipeline(raw_df)

    assert len(result_df) == 15
    assert "risk_score" in result_df.columns
    assert "status" in result_df.columns
    assert "tee_security" in eval_metrics
    assert eval_metrics["tee_security"]["tee_enabled"] is True
    assert eval_metrics["tee_security"]["attested"] is True
    assert len(lot_summaries) >= 1

    # First component should be rejected due to 61.0 uA breach
    first = result_df.iloc[0]
    assert first["status"] == "reject"
    assert first["traditional_decision"] == "FAIL"


# ==============================================================================
# 11. Existing 3D Localization Test
# ==============================================================================
def test_11_existing_3d_localization():
    df = _make_sample_df(10)
    localized_df = satellite_mapper.add_subsystem(df)

    assert "subsystem" in localized_df.columns
    valid_subsystems = set(satellite_mapper.SUBSYSTEM_KEYS)
    for sub in localized_df["subsystem"]:
        assert sub in valid_subsystems, f"Invalid subsystem mapped: {sub}"
