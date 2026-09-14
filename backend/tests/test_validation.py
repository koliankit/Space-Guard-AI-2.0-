import io
import pandas as pd
import pytest
from services import preprocessing


def test_auto_detect_mapping():
    headers = [
        "Component Serial",
        "Wafer Lot",
        "Part Type",
        "Parameter",
        "Unit",
        "0 hr (uA)",
        "24 hr (uA)",
        "96 hr (uA)",
        "168 hr (uA)",
        "Spec Min",
        "Spec Max",
        "HTOL Temp (C)",
    ]
    mapping = preprocessing.auto_detect_mapping(headers)
    assert mapping["component_id"] == "Component Serial"
    assert mapping["lot_id"] == "Wafer Lot"
    assert mapping["v0"] == "0 hr (uA)"
    assert mapping["v24"] == "24 hr (uA)"
    assert mapping["v96"] == "96 hr (uA)"
    assert mapping["v168"] == "168 hr (uA)"
    assert mapping["datasheet_min"] == "Spec Min"
    assert mapping["datasheet_max"] == "Spec Max"
    assert mapping["temperature_c"] == "HTOL Temp (C)"


def test_missing_required_detection():
    # Complete mapping
    complete_map = {
        "component_id": "c_id",
        "lot_id": "lot",
        "v0": "t0",
        "v24": "t24",
        "v168": "t168",
    }
    assert preprocessing.missing_required(complete_map) == []

    # Missing v168 and component_id
    incomplete_map = {"lot_id": "lot", "v0": "t0", "v24": "t24"}
    missing = preprocessing.missing_required(incomplete_map)
    assert "component_id" in missing
    assert "v168" in missing


def test_validation_clean_data():
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_min,datasheet_max,temperature_c
C-001,LOT-A,10.2,10.5,10.8,11.1,0.0,50.0,125.0
C-002,LOT-A,10.1,10.4,10.7,11.0,0.0,50.0,125.0
C-003,LOT-B,12.0,12.2,12.5,12.8,0.0,50.0,125.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean_df, meta = preprocessing.build_dataframe(df, mapping)

    assert meta["is_valid"] is True
    assert meta["valid"] == 3
    assert meta["lots"] == 2
    assert len(meta["validation_issues"]) == 0


def test_validation_duplicate_ids():
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_max
C-DUP,LOT-A,10.2,10.5,10.8,11.1,50.0
C-DUP,LOT-A,10.1,10.4,10.7,11.0,50.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean_df, meta = preprocessing.build_dataframe(df, mapping)

    assert meta["is_valid"] is False
    duplicate_errors = [i for i in meta["validation_issues"] if "duplicate" in i["message"].lower()]
    assert len(duplicate_errors) > 0


def test_validation_empty_lot_ids():
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_max
C-001,,10.2,10.5,10.8,11.1,50.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean_df, meta = preprocessing.build_dataframe(df, mapping)

    assert meta["is_valid"] is False
    empty_lot_errors = [i for i in meta["validation_issues"] if "empty" in i["message"].lower() or "lot" in i["message"].lower()]
    assert len(empty_lot_errors) > 0


def test_validation_inverted_datasheet_limits():
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_min,datasheet_max
C-001,LOT-A,10.2,10.5,10.8,11.1,60.0,20.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean_df, meta = preprocessing.build_dataframe(df, mapping)

    assert meta["is_valid"] is False
    inverted_errors = [i for i in meta["validation_issues"] if "exceeds" in i["message"].lower() or "inconsistency" in i["message"].lower()]
    assert len(inverted_errors) > 0


def test_validation_temperature_warning():
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_min,datasheet_max,temperature_c
C-001,LOT-A,10.2,10.5,10.8,11.1,0.0,50.0,280.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean_df, meta = preprocessing.build_dataframe(df, mapping)

    temp_warnings = [i for i in meta["validation_issues"] if "extreme" in i["message"].lower() or "temperature" in i["message"].lower()]
    assert len(temp_warnings) > 0


def test_validation_canonical_12_fields():
    csv_data = """component_id,lot_id,component_type,parameter,unit,value_0h,value_24h,value_96h,value_168h,datasheet_min,datasheet_max,temperature_c
ISRO-SAT-PWR-401,LOT-2026A,Power MOSFET,Leakage Current,µA,10.12,10.28,10.65,11.02,0.0,50.0,125.0
ISRO-SAT-PWR-402,LOT-2026A,Power MOSFET,Leakage Current,µA,9.85,10.05,10.42,10.88,0.0,50.0,125.0
ISRO-SAT-PWR-403,LOT-2026A,Power MOSFET,Leakage Current,µA,10.02,10.22,10.58,11.15,0.0,50.0,125.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    assert mapping["v0"] == "value_0h"
    assert mapping["v24"] == "value_24h"
    assert mapping["v96"] == "value_96h"
    assert mapping["v168"] == "value_168h"
    assert mapping["datasheet_min"] == "datasheet_min"
    assert mapping["datasheet_max"] == "datasheet_max"
    assert mapping["temperature_c"] == "temperature_c"

    clean_df, meta = preprocessing.build_dataframe(df, mapping)
    assert meta["is_valid"] is True
    assert meta["valid"] == 3
    assert len(meta["validation_issues"]) == 0
    assert "v0" in clean_df.columns
    assert "v168" in clean_df.columns
    assert clean_df["component_type"].iloc[0] == "Power MOSFET"
    assert clean_df["parameter"].iloc[0] == "Leakage Current"
    assert clean_df["unit"].iloc[0] == "µA"


def test_validation_non_numeric_readings():
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_max
C-001,LOT-A,10.2,CORRUPT_VALUE,10.8,11.1,50.0
C-002,LOT-A,10.1,10.4,10.7,11.0,50.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean_df, meta = preprocessing.build_dataframe(df, mapping)

    assert meta["is_valid"] is False
    numeric_issues = [i for i in meta["validation_issues"] if "non-numeric" in i["message"].lower()]
    assert len(numeric_issues) > 0
    assert numeric_issues[0]["column"] == "v24"
    assert numeric_issues[0]["row"] == 1


def test_validation_infinite_values():
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_max
C-001,LOT-A,10.2,10.4,10.8,inf,50.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean_df, meta = preprocessing.build_dataframe(df, mapping)

    assert meta["is_valid"] is False
    inf_issues = [i for i in meta["validation_issues"] if "infinite" in i["message"].lower()]
    assert len(inf_issues) > 0


def test_validation_single_component_warning():
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_max
C-SINGLE,LOT-A,10.2,10.4,10.8,11.0,50.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean_df, meta = preprocessing.build_dataframe(df, mapping)

    # Warnings do not block is_valid, but notify engineers
    assert meta["is_valid"] is True
    cohort_warn = [i for i in meta["validation_issues"] if "cohort" in i["message"].lower() or "1 component" in i["message"].lower()]
    assert len(cohort_warn) > 0

