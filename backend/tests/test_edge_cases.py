import io
import pandas as pd
import numpy as np
import pytest
from services import preprocessing, lot_analysis, feature_engineering, pipeline


def test_edge_case_empty_csv():
    df_empty = pd.DataFrame()
    is_valid, issues = preprocessing.validate_raw_dataset(df_empty, {})
    assert is_valid is False
    assert any("empty" in i["message"].lower() for i in issues)


def test_edge_case_single_component_batch():
    df = pd.DataFrame([{
        "component_id": "SOLO-001",
        "lot_id": "LOT-SINGLE",
        "component_type": "Diode",
        "v0": 10.0,
        "v24": 10.2,
        "v96": 10.5,
        "v168": 10.8,
        "datasheet_min": 0.0,
        "datasheet_max": 50.0,
        "temperature_c": 125.0,
    }])
    # Pipeline should complete gracefully without division by zero
    result_df, ml_meta, eval_metrics, lot_summaries = pipeline.run_pipeline(df)
    assert len(result_df) == 1
    assert result_df["status"].iloc[0] == "safe"
    assert len(lot_summaries) == 1
    assert lot_summaries[0]["count"] == 1


def test_edge_case_identical_values():
    # All components have identical measurements (zero variance, MAD = 0)
    data = [
        {
            "component_id": f"IDEN-{i:02d}",
            "lot_id": "LOT-FLAT",
            "v0": 10.0,
            "v24": 10.0,
            "v96": 10.0,
            "v168": 10.0,
            "limit": 50.0,
        }
        for i in range(12)
    ]
    df = pd.DataFrame(data)
    result = lot_analysis.add_lot_relative_scores(df)

    # Should handle zero MAD without crashing or producing NaNs
    assert result["lot_mad"].iloc[0] >= 0.0
    assert not result["robust_z168"].isna().any()
    assert (result["robust_z168"] == 0.0).all()


def test_edge_case_missing_intermediate_time_point():
    # Missing 96h reading
    data = [
        {
            "component_id": f"NO96-{i}",
            "lot_id": "LOT-NO96",
            "v0": 10.0,
            "v24": 11.0,
            "v96": np.nan,
            "v168": 13.0,
            "limit": 50.0,
        }
        for i in range(5)
    ]
    df = pd.DataFrame(data)
    preprocessed = preprocessing.preprocess_screening_data(df)
    assert not preprocessed["v96"].isna().any()
    # Interpolated value should be exactly midpoint: 11.0 + 0.5 * (13.0 - 11.0) = 12.0
    assert np.allclose(preprocessed["v96"], 12.0)


def test_edge_case_extreme_outlier_divergence():
    # 20 normal parts at 10uA, 1 part at 49.5uA (near 50uA limit)
    data = [
        {
            "component_id": f"NORM-{i}",
            "lot_id": "LOT-OUTLIER",
            "v0": 10.0,
            "v24": 10.2,
            "v96": 10.5,
            "v168": 10.8,
            "limit": 50.0,
        }
        for i in range(20)
    ]
    data.append({
        "component_id": "EXTREME-OUTLIER",
        "lot_id": "LOT-OUTLIER",
        "v0": 15.0,
        "v24": 22.0,
        "v96": 34.0,
        "v168": 49.5,
        "limit": 50.0,
    })
    df = pd.DataFrame(data)
    result_df, ml_meta, eval_metrics, lot_summaries = pipeline.run_pipeline(df)

    outlier = result_df[result_df["component_id"] == "EXTREME-OUTLIER"].iloc[0]
    assert outlier["status"] == "reject"
    assert outlier["risk_score"] >= 80
    assert outlier["risk_level"] == "CRITICAL"


def test_edge_case_large_batch_processing():
    # Synthesize 500 components across 10 lots
    np.random.seed(42)
    rows = []
    for lot_idx in range(10):
        lot_id = f"LOT-STRESS-{lot_idx}"
        base = 8.0 + lot_idx * 1.2
        for c in range(50):
            v0 = base + np.random.normal(0, 0.2)
            v24 = v0 + 0.15 + np.random.normal(0, 0.05)
            v96 = v24 + 0.35 + np.random.normal(0, 0.05)
            v168 = v96 + 0.45 + np.random.normal(0, 0.05)
            rows.append({
                "component_id": f"COMP-{lot_idx}-{c:03d}",
                "lot_id": lot_id,
                "v0": round(float(v0), 3),
                "v24": round(float(v24), 3),
                "v96": round(float(v96), 3),
                "v168": round(float(v168), 3),
                "limit": 50.0,
            })
    df = pd.DataFrame(rows)
    assert len(df) == 500

    # Run complete pipeline
    result_df, ml_meta, eval_metrics, lot_summaries = pipeline.run_pipeline(df)
    assert len(result_df) == 500
    assert len(lot_summaries) == 10
    assert not result_df["risk_score"].isna().any()
