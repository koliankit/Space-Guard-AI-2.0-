import pandas as pd
import numpy as np
import pytest
from services import lot_analysis


def test_module_a_robust_lot_statistics():
    # 10 components in LOT-1 with baseline around 10.0, and 1 latent outlier at 28.0 (spec limit = 50.0)
    data = []
    for i in range(1, 11):
        data.append({
            "component_id": f"COMP-NORMAL-{i:02d}",
            "lot_id": "LOT-1",
            "component_type": "Op-Amp",
            "v0": 10.0 + (i % 3) * 0.1,
            "v24": 10.2 + (i % 3) * 0.1,
            "v96": 10.5 + (i % 3) * 0.1,
            "v168": 10.8 + (i % 3) * 0.1,
            "limit": 50.0,
            "datasheet_min": 0.0,
            "datasheet_max": 50.0,
        })
    # Latent defect: Passes static 50.0 limit easily (168h is 28.0 uA), but far above LOT-1 median (10.9)
    data.append({
        "component_id": "COMP-LATENT-01",
        "lot_id": "LOT-1",
        "component_type": "Op-Amp",
        "v0": 20.0,
        "v24": 22.0,
        "v96": 25.0,
        "v168": 28.0,
        "limit": 50.0,
        "datasheet_min": 0.0,
        "datasheet_max": 50.0,
    })

    df = pd.DataFrame(data)
    result_df = lot_analysis.add_lot_relative_scores(df)

    # Verify columns generated
    assert "lot_mean" in result_df.columns
    assert "lot_median" in result_df.columns
    assert "lot_mad" in result_df.columns
    assert "robust_z168" in result_df.columns
    assert "is_latent_defect" in result_df.columns

    latent_row = result_df[result_df["component_id"] == "COMP-LATENT-01"].iloc[0]
    normal_row = result_df[result_df["component_id"] == "COMP-NORMAL-01"].iloc[0]

    # Normal row should have low z-scores and is_latent_defect == False
    assert abs(normal_row["robust_z168"]) < 2.0
    assert latent_row["is_latent_defect"] == True
    assert latent_row["robust_z168"] > 3.0
    assert latent_row["lot_pct_dev"] > 50.0


def test_lot_cohort_summaries():
    data = [
        {"component_id": "C1", "lot_id": "LOT-A", "component_type": "IC", "v0": 10, "v24": 11, "v168": 12, "limit": 50},
        {"component_id": "C2", "lot_id": "LOT-A", "component_type": "IC", "v0": 10.2, "v24": 11.1, "v168": 12.2, "limit": 50},
        {"component_id": "C3", "lot_id": "LOT-B", "component_type": "IC", "v0": 20, "v24": 21, "v168": 22, "limit": 50},
    ]
    df = pd.DataFrame(data)
    analyzed_df = lot_analysis.add_lot_relative_scores(df)
    analyzed_df["status"] = ["safe", "safe", "monitor"]

    summaries = lot_analysis.generate_lot_summaries(analyzed_df)
    assert len(summaries) == 2
    lot_ids = [s["lot_id"] for s in summaries]
    assert "LOT-A" in lot_ids
    assert "LOT-B" in lot_ids
    lot_a = next(s for s in summaries if s["lot_id"] == "LOT-A")
    assert lot_a["count"] == 2
    assert "median" in lot_a
    assert "mad" in lot_a
