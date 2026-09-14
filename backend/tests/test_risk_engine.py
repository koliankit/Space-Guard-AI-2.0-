import pandas as pd
import pytest
from services import risk_engine


def test_risk_engine_score_bounds_and_tiers():
    # 1. Very safe component
    safe_data = pd.DataFrame([{
        "component_id": "C-SAFE",
        "lot_id": "L1",
        "parameter": "Leakage Current",
        "unit": "uA",
        "v0": 10.0, "v24": 10.1, "v168": 10.3, "limit": 50.0,
        "lot_mean": 10.2, "lot_std": 0.2, "lot_median": 10.2, "lot_mad": 0.15,
        "lot_pct_dev": 1.0, "is_latent_defect": False,
        "z168": 0.5, "robust_z168": 0.5, "slope": 0.0018,
        "predicted168_from_early": 10.3, "prediction_error_168": 0.0,
        "predicted_future": 10.5, "future_limit_breach": False, "breach_probability": 0.0,
        "drift_trend": "NOMINAL / STABLE", "iso_score": 15.0, "ml_prob": 0.05,
        "subsystem": "PWR",
    }])
    safe_res = risk_engine.score_and_decide(safe_data).iloc[0]
    assert 0 <= safe_res["risk_score"] <= 100
    assert safe_res["risk_level"] == "LOW"
    assert safe_res["status"] == "safe"
    assert safe_res["traditional_decision"] == "PASS"

    # 2. Critical limit breach component
    breach_data = pd.DataFrame([{
        "component_id": "C-BREACH",
        "lot_id": "L1",
        "parameter": "Leakage Current",
        "unit": "uA",
        "v0": 30.0, "v24": 40.0, "v168": 58.0, "limit": 50.0,
        "lot_mean": 15.0, "lot_std": 2.0, "lot_median": 15.0, "lot_mad": 1.5,
        "lot_pct_dev": 286.0, "is_latent_defect": True,
        "z168": 21.5, "robust_z168": 28.6, "slope": 0.1667,
        "predicted168_from_early": 58.0, "prediction_error_168": 0.0,
        "predicted_future": 75.0, "future_limit_breach": True, "breach_probability": 1.0,
        "drift_trend": "ACCELERATING POSITIVE DRIFT", "iso_score": 95.0, "ml_prob": 0.98,
        "subsystem": "PWR",
    }])
    breach_res = risk_engine.score_and_decide(breach_data).iloc[0]
    assert breach_res["risk_score"] >= 80
    assert breach_res["risk_level"] == "CRITICAL"
    assert breach_res["status"] == "reject"
    assert breach_res["traditional_decision"] == "FAIL"

    # 3. Latent defect component: passes traditional limit (35 < 50) but abnormal relative to lot
    latent_data = pd.DataFrame([{
        "component_id": "C-LATENT",
        "lot_id": "L1",
        "parameter": "Leakage Current",
        "unit": "uA",
        "v0": 20.0, "v24": 25.0, "v168": 35.0, "limit": 50.0,
        "lot_mean": 10.0, "lot_std": 1.0, "lot_median": 10.0, "lot_mad": 0.8,
        "lot_pct_dev": 250.0, "is_latent_defect": True,
        "z168": 25.0, "robust_z168": 31.2, "slope": 0.089,
        "predicted168_from_early": 35.0, "prediction_error_168": 0.0,
        "predicted_future": 48.0, "future_limit_breach": False, "breach_probability": 0.4,
        "drift_trend": "LINEAR POSITIVE DRIFT", "iso_score": 75.0, "ml_prob": 0.85,
        "subsystem": "PWR",
    }])
    latent_res = risk_engine.score_and_decide(latent_data).iloc[0]
    assert latent_res["traditional_decision"] == "PASS"
    assert latent_res["status"] == "reject"
    assert latent_res["risk_score"] >= 60


def test_explainability_content():
    comp = pd.DataFrame([{
        "component_id": "C-TEST",
        "lot_id": "LOT-99",
        "parameter": "Leakage Current",
        "unit": "uA",
        "v0": 10.0, "v24": 15.0, "v168": 48.0, "limit": 50.0,
        "lot_mean": 12.0, "lot_std": 1.0, "lot_median": 12.0, "lot_mad": 0.8,
        "lot_pct_dev": 300.0, "is_latent_defect": True,
        "z168": 36.0, "robust_z168": 45.0, "slope": 0.226,
        "predicted168_from_early": 45.0, "prediction_error_168": 3.0,
        "predicted_future": 65.0, "future_limit_breach": True, "breach_probability": 0.95,
        "drift_trend": "ACCELERATING POSITIVE DRIFT", "iso_score": 90.0, "ml_prob": 0.92,
        "subsystem": "NAV",
    }])
    res = risk_engine.score_and_decide(comp).iloc[0]

    assert len(res["explanation_points"]) >= 3
    assert isinstance(res["reason"], str)
    assert len(res["reason"]) > 20
    # Ensure reason can be safely encoded to ASCII without UnicodeEncodeError
    res["reason"].encode("ascii")
    for pt in res["explanation_points"]:
        pt.encode("ascii")
