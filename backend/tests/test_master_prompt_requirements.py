import io
import pytest
import pandas as pd
from starlette.testclient import TestClient
import main
from database import init_db
from services import preprocessing, pipeline, lot_analysis, feature_engineering, risk_engine

init_db()
client = TestClient(main.app)


def test_01_valid_csv_full_pipeline():
    """TEST 01: Valid CSV -> Full pipeline runs."""
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_min,datasheet_max,temperature_c
COMP-01,LOT-01,10.0,10.3,10.7,11.0,0.0,50.0,125.0
COMP-02,LOT-01,10.1,10.4,10.8,11.1,0.0,50.0,125.0
COMP-03,LOT-01,10.2,10.5,10.9,11.2,0.0,50.0,125.0
COMP-04,LOT-01,10.0,10.3,10.6,10.9,0.0,50.0,125.0
"""
    files = {"file": ("valid_test.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    res = client.post("/api/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] == 4
    assert data.get("error") is None

    # Run analysis
    batch_id = data["batch_id"]
    analyze_res = client.post(f"/api/screening/analyze/{batch_id}")
    assert analyze_res.status_code == 200
    res_data = analyze_res.json()
    assert res_data["safe"] + res_data["monitor"] + res_data["reject"] == 4


def test_02_wrong_file_format():
    """TEST 02: Wrong file format -> Upload blocked."""
    files = {"file": ("unsupported_image.png", io.BytesIO(b"\x89PNG\r\n\x1a\n"), "image/png")}
    res = client.post("/api/upload", files=files)
    assert res.status_code == 400
    assert "csv" in res.json()["detail"].lower()


def test_03_missing_component_id():
    """TEST 03: Missing component_id -> Critical validation error and AI screening blocked."""
    csv_data = """lot_id,v0,v24,v96,v168,datasheet_max
LOT-01,10.0,10.3,10.7,11.0,50.0
LOT-01,10.1,10.4,10.8,11.1,50.0
"""
    files = {"file": ("missing_cid.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    res = client.post("/api/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data.get("error") in ("column_mapping_required", "validation_failed")
    assert data.get("validation_report", {}).get("status") == "BLOCKED"
    assert "component_id" in data.get("missing_fields", [])


def test_04_missing_lot_id():
    """TEST 04: Missing lot_id -> Critical validation error and AI screening blocked."""
    csv_data = """component_id,v0,v24,v96,v168,datasheet_max
COMP-01,10.0,10.3,10.7,11.0,50.0
COMP-02,10.1,10.4,10.8,11.1,50.0
"""
    files = {"file": ("missing_lot.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    res = client.post("/api/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data.get("error") in ("column_mapping_required", "validation_failed")
    assert data.get("validation_report", {}).get("status") == "BLOCKED"
    assert "lot_id" in data.get("missing_fields", [])


def test_05_invalid_component_id():
    """TEST 05: Invalid component ID (e.g. COMP-???) -> Critical validation error."""
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_max
COMP-???,LOT-01,10.0,10.3,10.7,11.0,50.0
COMP-02,LOT-01,10.1,10.4,10.8,11.1,50.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean, meta = preprocessing.build_dataframe(df, mapping)
    assert meta["is_valid"] is False
    assert any("malformed" in i["message"].lower() or "comp-???" in i.get("detected_value", "").lower() for i in meta["validation_issues"])


def test_06_wrong_lot_relationship():
    """TEST 06: Same component assigned to conflicting lots -> Critical validation error."""
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_max
COMP-SHARED,LOT-01,10.0,10.3,10.7,11.0,50.0
COMP-SHARED,LOT-02,10.1,10.4,10.8,11.1,50.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean, meta = preprocessing.build_dataframe(df, mapping)
    assert meta["is_valid"] is False
    assert any("conflicting lots" in i["message"].lower() or "multiple conflicting" in i["message"].lower() for i in meta["validation_issues"])


def test_07_invalid_numeric_value():
    """TEST 07: Invalid numeric value (e.g. 'abc') -> Critical validation error."""
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_max
COMP-01,LOT-01,10.0,abc,10.7,11.0,50.0
COMP-02,LOT-01,10.1,10.4,10.8,11.1,50.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean, meta = preprocessing.build_dataframe(df, mapping)
    assert meta["is_valid"] is False
    assert any("non-numeric" in i["message"].lower() for i in meta["validation_issues"])


def test_08_empty_required_cell():
    """TEST 08: Empty required cell -> Critical validation error."""
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_max
COMP-01,,10.0,10.3,10.7,11.0,50.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean, meta = preprocessing.build_dataframe(df, mapping)
    assert meta["is_valid"] is False
    assert any("empty" in i["message"].lower() or "missing" in i["message"].lower() for i in meta["validation_issues"])


def test_09_duplicate_component():
    """TEST 09: Duplicate component -> Duplicate error."""
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_max
COMP-01,LOT-01,10.0,10.3,10.7,11.0,50.0
COMP-01,LOT-01,10.0,10.3,10.7,11.0,50.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean, meta = preprocessing.build_dataframe(df, mapping)
    assert meta["is_valid"] is False
    assert any("duplicate" in i["message"].lower() for i in meta["validation_issues"])


def test_10_invalid_unit():
    """TEST 10: Invalid unit (e.g. 'kV') -> Unit validation error."""
    csv_data = """component_id,lot_id,unit,v0,v24,v96,v168,datasheet_max
COMP-01,LOT-01,kV,10.0,10.3,10.7,11.0,50.0
COMP-02,LOT-01,kV,10.1,10.4,10.8,11.1,50.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean, meta = preprocessing.build_dataframe(df, mapping)
    assert meta["is_valid"] is False
    assert any("unit" in i["message"].lower() for i in meta["validation_issues"])


def test_11_invalid_datasheet_range():
    """TEST 11: Invalid datasheet range (min >= max) -> Critical validation error."""
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_min,datasheet_max
COMP-01,LOT-01,10.0,10.3,10.7,11.0,50.0,10.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean, meta = preprocessing.build_dataframe(df, mapping)
    assert meta["is_valid"] is False
    assert any("inconsistency" in i["message"].lower() or "exceeds" in i["message"].lower() for i in meta["validation_issues"])


def test_12_missing_24h_value():
    """TEST 12: Missing 24h value -> Module B early drift prediction blocked."""
    csv_data = """component_id,lot_id,v0,v168,datasheet_max
COMP-01,LOT-01,10.0,11.0,50.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    missing = preprocessing.missing_required(mapping)
    assert "v24" in missing


def test_13_insufficient_lot_data_warning():
    """TEST 13: Insufficient lot data -> Module A flags small lot warning on large batch."""
    csv_data = """component_id,lot_id,v0,v24,v96,v168,datasheet_max
C-1,LOT-LARGE,10.0,10.3,10.7,11.0,50.0
C-2,LOT-LARGE,10.1,10.4,10.8,11.1,50.0
C-3,LOT-LARGE,10.2,10.5,10.9,11.2,50.0
C-4,LOT-LARGE,10.0,10.3,10.7,11.0,50.0
C-5,LOT-LARGE,10.1,10.4,10.8,11.1,50.0
C-6,LOT-TINY,10.2,10.5,10.9,11.2,50.0
"""
    df = pd.read_csv(io.StringIO(csv_data))
    mapping = preprocessing.auto_detect_mapping(df.columns.tolist())
    clean, meta = preprocessing.build_dataframe(df, mapping)
    # Warnings do not block is_valid
    assert meta["is_valid"] is True
    assert any("LOT-TINY" in i["message"] for i in meta["validation_issues"])


def test_14_lot_relative_outlier_flagged():
    """TEST 14: Valid lot-relative outlier -> Module A flags component."""
    df = pd.DataFrame({
        "component_id": [f"C-{i}" for i in range(10)],
        "lot_id": ["LOT-A"] * 10,
        "v0": [10.0] * 9 + [10.0],
        "v24": [10.2] * 9 + [10.2],
        "v96": [10.5] * 9 + [10.5],
        "v168": [11.0] * 9 + [48.0],  # Within 50 µA datasheet limit, but huge lot outlier!
        "limit": [50.0] * 10,
        "datasheet_min": [0.0] * 10,
        "datasheet_max": [50.0] * 10,
    })
    df = preprocessing.preprocess_screening_data(df)
    df = feature_engineering.add_features(df)
    df = lot_analysis.add_lot_relative_scores(df)

    outlier = df[df["component_id"] == "C-9"].iloc[0]
    assert outlier["lot_pct_dev"] > 200.0
    assert abs(outlier["z168"]) > 3.0


def test_15_latent_drift_detected():
    """TEST 15: Latent drift -> Module B detects elevated predicted drift."""
    df = pd.DataFrame({
        "component_id": ["C-NOMINAL", "C-DRIFT"],
        "lot_id": ["LOT-A", "LOT-A"],
        "v0": [10.0, 10.0],
        "v24": [10.1, 14.5],  # Very sharp early drift!
        "v96": [10.5, 18.0],
        "v168": [11.0, 25.0],
        "limit": [50.0, 50.0],
    })
    df = preprocessing.preprocess_screening_data(df)
    df = feature_engineering.add_features(df)

    drift_part = df[df["component_id"] == "C-DRIFT"].iloc[0]
    assert drift_part["predicted_future"] > 25.0
    assert drift_part["drift_rate_early"] > 0.15


def test_16_hard_datasheet_failure():
    """TEST 16: Hard datasheet failure -> Risk Engine detects breach and assigns >= 92 risk."""
    df = pd.DataFrame({
        "component_id": ["C-BREACH"],
        "lot_id": ["LOT-A"],
        "v0": [10.0],
        "v24": [20.0],
        "v96": [40.0],
        "v168": [58.0],  # Hard breach: 58.0 > 50.0
        "limit": [50.0],
        "datasheet_max": [50.0],
        "datasheet_min": [0.0],
    })
    df = preprocessing.preprocess_screening_data(df)
    df = feature_engineering.add_features(df)
    df = lot_analysis.add_lot_relative_scores(df)
    df = risk_engine.score_and_decide(df)

    breached = df.iloc[0]
    assert breached["status"] == "reject"
    assert breached["risk_score"] >= 92
    assert "datasheet_risk" in breached
    assert breached["datasheet_risk"] == 100.0


def test_qa_review_and_slope_recalculation_endpoints():
    """Verify human QA review update and what-if safety slope recalculation API endpoints."""
    # Ingest demo batch
    demo_res = client.post("/api/demo")
    assert demo_res.status_code == 200
    batch_id = demo_res.json()["batch_id"]

    analyze_res = client.post(f"/api/screening/analyze/{batch_id}")
    assert analyze_res.status_code == 200

    comps = client.get(f"/api/screening/components/{batch_id}").json()["components"]
    cid = comps[0]["component_id"]

    # 1. Update QA review
    qa_payload = {
        "qa_decision": "APPROVED",
        "qa_notes": "All parametric drift trends verified within mission safety margins.",
        "qa_reviewer": "Lead QA Flight Inspector",
    }
    qa_res = client.post(f"/api/components/{batch_id}/{cid}/qa-review", json=qa_payload)
    assert qa_res.status_code == 200
    updated_qa = qa_res.json()
    assert updated_qa["qa_decision"] == "APPROVED"
    assert updated_qa["qa_notes"] == qa_payload["qa_notes"]
    assert updated_qa["qa_reviewer"] == qa_payload["qa_reviewer"]
    assert updated_qa["qa_timestamp"] is not None

    # 2. What-If Safety Slope recalculation
    slope_payload = {
        "component_id": cid,
        "batch_id": batch_id,
        "safety_slope": 0.010,  # Very strict slope threshold
    }
    recalc_res = client.post("/api/screening/recalculate-slope", json=slope_payload)
    assert recalc_res.status_code == 200
    recalculated = recalc_res.json()
    assert recalculated["safety_slope"] == 0.010
    assert "drift_risk" in recalculated
    assert "drift_contrib" in recalculated
    assert "risk_score" in recalculated
    assert "explanation_points" in recalculated
