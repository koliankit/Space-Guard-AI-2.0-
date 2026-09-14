import io
import pytest
from starlette.testclient import TestClient
import main
from database import init_db

init_db()
client = TestClient(main.app)


def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "ASTRA VIGIL" in data["system"]


def test_demo_and_screening_pipeline():
    # 1. Ingest demo batch
    demo_res = client.post("/api/demo")
    assert demo_res.status_code == 200
    batch_data = demo_res.json()
    batch_id = batch_data["batch_id"]
    assert batch_id > 0
    assert batch_data["rows"] > 50

    # 2. Execute Screening Analysis
    analyze_res = client.post(f"/api/screening/analyze/{batch_id}")
    assert analyze_res.status_code == 200
    analysis = analyze_res.json()
    assert analysis["batch_id"] == batch_id
    assert analysis["safe"] + analysis["monitor"] + analysis["reject"] == batch_data["valid"]
    assert "risk_distribution" in analysis
    assert "lot_summaries" in analysis
    assert "evaluation_metrics" in analysis

    # 3. Fetch screening results
    results_res = client.get(f"/api/screening/results/{batch_id}")
    assert results_res.status_code == 200
    res_data = results_res.json()
    assert res_data["batch_id"] == batch_id

    # 4. Fetch components list
    comp_res = client.get(f"/api/screening/components/{batch_id}")
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert len(comp_data["components"]) > 0
    first_comp = comp_data["components"][0]
    assert "component_id" in first_comp
    assert "risk_score" in first_comp
    assert "risk_level" in first_comp
    assert "subsystem" in first_comp

    # 5. Fetch single component detail
    cid = first_comp["component_id"]
    detail_res = client.get(f"/api/screening/components/{batch_id}/{cid}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["component_id"] == cid
    assert "v168" in detail
    assert "slope" in detail

    # 6. Fetch Lot cohort details
    lot_id = first_comp["lot_id"]
    lot_res = client.get(f"/api/screening/lot/{lot_id}?batch_id={batch_id}")
    assert lot_res.status_code == 200
    lot_data = lot_res.json()
    assert lot_data["lot_id"] == lot_id
    assert "cohort_stats" in lot_data
    assert "pass_rate_pct" in lot_data

    # 7. Fetch system metrics
    metrics_res = client.get(f"/api/screening/metrics?batch_id={batch_id}")
    assert metrics_res.status_code == 200
    metrics_data = metrics_res.json()
    assert "evaluation_metrics" in metrics_data
    assert "feature_importances" in metrics_data
    assert metrics_data["total_components_screened"] > 0

    # 8. Export CSV report
    export_res = client.get(f"/api/screening/export/{batch_id}")
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers["content-type"]
    assert "component_id" in export_res.text


def test_api_upload_csv():
    csv_content = """component_id,lot_id,v0,v24,v96,v168,datasheet_min,datasheet_max,temperature_c
ISRO-TEST-001,LOT-TEST,10.0,10.2,10.5,10.8,0.0,50.0,125.0
ISRO-TEST-002,LOT-TEST,10.1,10.3,10.6,10.9,0.0,50.0,125.0
ISRO-TEST-003,LOT-TEST,25.0,28.0,32.0,42.0,0.0,50.0,125.0
"""
    files = {"file": ("test_screening.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    upload_res = client.post("/api/screening/upload", files=files)
    assert upload_res.status_code == 200
    up_data = upload_res.json()
    assert up_data["valid"] == 3
    assert up_data["lots"] == 1
