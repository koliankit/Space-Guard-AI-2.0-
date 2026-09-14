import pandas as pd
import pytest
from services import feature_engineering


def test_module_b_drift_and_prediction():
    # Linear drift component: v0 = 10, v24 = 11, v168 = 17 (drift = 7/168 = 0.04167 uA/h)
    # Early slope = (11 - 10) / 24 = 0.04167 uA/h. Predicted 168h = 10 + 0.04167 * 168 = 17.0
    data = [{
        "component_id": "COMP-LIN-01",
        "lot_id": "LOT-1",
        "v0": 10.0,
        "v24": 11.0,
        "v96": 14.0,
        "v168": 17.0,
        "limit": 50.0,
        "datasheet_max": 50.0,
    }]
    df = pd.DataFrame(data)
    result = feature_engineering.add_features(df)

    row = result.iloc[0]
    assert abs(row["drift168"] - 7.0) < 1e-4
    assert abs(row["pct_drift"] - 70.0) < 1e-2
    assert abs(row["predicted168_from_early"] - 17.0) < 1e-2
    assert abs(row["prediction_error_168"]) < 1e-2
    assert row["drift_trend"] == "LINEAR POSITIVE DRIFT"


def test_module_b_late_acceleration():
    # Accelerating drift component:
    # 0h to 24h: 10.0 -> 10.2 (slope = 0.0083 uA/h)
    # 96h to 168h: 12.0 -> 24.0 (slope = 12 / 72 = 0.1667 uA/h -> accelerating > 1.3x)
    data = [{
        "component_id": "COMP-ACC-01",
        "lot_id": "LOT-1",
        "v0": 10.0,
        "v24": 10.2,
        "v96": 12.0,
        "v168": 24.0,
        "limit": 50.0,
        "datasheet_max": 50.0,
    }]
    df = pd.DataFrame(data)
    result = feature_engineering.add_features(df)

    row = result.iloc[0]
    assert row["drift_trend"] == "ACCELERATING POSITIVE DRIFT"
    assert row["prediction_error_168"] > 10.0


def test_future_operational_breach():
    # Component with high slope that will breach limit at 264h+
    # v0 = 35.0, v24 = 37.0, v96 = 43.0, v168 = 49.0 (limit = 50.0)
    data = [{
        "component_id": "COMP-BREACH-01",
        "lot_id": "LOT-1",
        "v0": 35.0,
        "v24": 37.0,
        "v96": 43.0,
        "v168": 49.0,
        "limit": 50.0,
        "datasheet_max": 50.0,
    }]
    df = pd.DataFrame(data)
    result = feature_engineering.add_features(df)

    row = result.iloc[0]
    assert row["future_limit_breach"] == True
    assert row["predicted_future"] > 50.0
    assert row["breach_probability"] > 0.5
    assert row["drift_classification"] == "PREDICTED LIMIT EXCEEDANCE"
