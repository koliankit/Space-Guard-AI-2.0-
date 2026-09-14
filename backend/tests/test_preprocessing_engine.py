import pandas as pd
import numpy as np
import pytest
from services.preprocessing import PreprocessingEngine, preprocess_screening_data


def test_preserve_raw_measurements():
    data = {
        "component_id": ["C-001", "C-002"],
        "lot_id": ["LOT-1", "LOT-1"],
        "component_type": ["MOSFET", "MOSFET"],
        "parameter": ["Leakage Current", "Leakage Current"],
        "unit": ["µA", "µA"],
        "v0": [10.0, 12.0],
        "v24": [10.5, 12.6],
        "v96": [11.0, 13.8],
        "v168": [11.5, 15.0],
        "datasheet_min": [0.0, 0.0],
        "datasheet_max": [50.0, 50.0],
        "temperature_c": [125.0, 125.0],
    }
    df = pd.DataFrame(data)
    processed = PreprocessingEngine.process(df)

    # Verify raw values are preserved intact
    assert "raw_v0" in processed.columns
    assert "raw_v24" in processed.columns
    assert "raw_v96" in processed.columns
    assert "raw_v168" in processed.columns
    assert np.allclose(processed["raw_v0"], [10.0, 12.0])
    assert np.allclose(processed["raw_v168"], [11.5, 15.0])


def test_missing_time_point_imputation():
    # v96 is NaN
    data = {
        "component_id": ["C-MISSING-96"],
        "lot_id": ["LOT-1"],
        "v0": [10.0],
        "v24": [12.0],
        "v96": [np.nan],
        "v168": [16.0],
        "datasheet_max": [50.0],
    }
    df = pd.DataFrame(data)
    processed = PreprocessingEngine.process(df)

    assert processed["v96_imputed"].iloc[0] == True
    # Linear interpolation: 12.0 + 0.5 * (16.0 - 12.0) = 14.0
    assert processed["v96"].iloc[0] == 14.0
    # Original raw_v96 should remain NaN (uncorrupted raw history)
    assert pd.isna(processed["raw_v96"].iloc[0])


def test_temporal_deltas_percentages_and_slopes():
    data = {
        "component_id": ["C-ACCEL"],
        "lot_id": ["LOT-X"],
        "v0": [10.0],
        "v24": [11.2],
        "v96": [14.8],
        "v168": [22.0],
        "datasheet_max": [50.0],
    }
    df = pd.DataFrame(data)
    processed = PreprocessingEngine.process(df)

    # 1. Absolute Changes
    assert processed["delta_0_24"].iloc[0] == round(11.2 - 10.0, 4)
    assert processed["delta_24_96"].iloc[0] == round(14.8 - 11.2, 4)
    assert processed["delta_96_168"].iloc[0] == round(22.0 - 14.8, 4)
    assert processed["delta_0_168"].iloc[0] == round(22.0 - 10.0, 4)

    # 2. Percentage Changes
    assert processed["pct_change_0_24"].iloc[0] == round(((11.2 - 10.0) / 10.0) * 100.0, 2)
    assert processed["pct_change_0_168"].iloc[0] == round(((22.0 - 10.0) / 10.0) * 100.0, 2)

    # 3. Temporal Slopes (rate/hour)
    assert processed["slope_0_24"].iloc[0] == round((11.2 - 10.0) / 24.0, 6)
    assert processed["slope_24_96"].iloc[0] == round((14.8 - 11.2) / 72.0, 6)
    assert processed["slope_96_168"].iloc[0] == round((22.0 - 14.8) / 72.0, 6)
    assert processed["slope_0_168"].iloc[0] == round((22.0 - 10.0) / 168.0, 6)

    # 4. Limit Ratios
    assert processed["v0_ratio"].iloc[0] == round(10.0 / 50.0, 4)
    assert processed["v168_ratio"].iloc[0] == round(22.0 / 50.0, 4)


def test_raw_and_processed_separation_and_traceability():
    data = {
        "component_id": ["ISRO-COMP-999"],
        "lot_id": ["ISRO-LOT-SPACE-01"],
        "subsystem": ["PWR"],
        "component_type": ["Space-Grade MOSFET"],
        "parameter": ["Leakage Current (µA)"],
        "unit": ["µA"],
        "v0": [8.5],
        "v24": [8.9],
        "v96": [9.7],
        "v168": [10.6],
        "datasheet_min": [0.0],
        "datasheet_max": [50.0],
        "temperature_c": [125.0],
    }
    df = pd.DataFrame(data)
    datasets = PreprocessingEngine.get_raw_and_processed(df)

    assert "raw" in datasets
    assert "processed" in datasets

    raw_df = datasets["raw"]
    processed_df = datasets["processed"]

    # Traceability check
    assert raw_df["component_id"].iloc[0] == "ISRO-COMP-999"
    assert processed_df["component_id"].iloc[0] == "ISRO-COMP-999"
    assert raw_df["lot_id"].iloc[0] == "ISRO-LOT-SPACE-01"
    assert processed_df["lot_id"].iloc[0] == "ISRO-LOT-SPACE-01"

    # Raw dataframe contains raw measurements and units
    assert "raw_v0" in raw_df.columns
    assert "raw_v168" in raw_df.columns
    assert raw_df["unit"].iloc[0] == "µA"

    # Processed dataframe contains derived features
    assert "delta_0_168" in processed_df.columns
    assert "slope_0_168" in processed_df.columns
    assert "pct_change_0_168" in processed_df.columns
