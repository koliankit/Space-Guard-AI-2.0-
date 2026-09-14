import io
import pytest
from starlette.testclient import TestClient
import main
from database import init_db, SessionLocal
from services.auth import init_default_users

init_db()
with SessionLocal() as db:
    init_default_users(db)

client = TestClient(main.app)


def test_full_mission_e2e_workflow():
    # 1. Authenticate as Spaceflight Qualification Engineer
    login_res = client.post("/api/auth/login", json={"username": "engineer", "password": "engineer123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Ingest real ISRO flight screening CSV dataset
    with open("data/isro_standard_screening_sample.csv", "rb") as f:
        csv_bytes = f.read()

    files = {"file": ("flight_screening_e2e.csv", io.BytesIO(csv_bytes), "text/csv")}
    upload_res = client.post("/api/screening/upload", files=files, headers=headers)
    assert upload_res.status_code == 200
    up_data = upload_res.json()
    batch_id = up_data["batch_id"]
    assert batch_id > 0
    assert up_data["valid"] == 18
    assert up_data["lots"] == 4

    # 3. Execute Screening Analysis (Modules A, B, Risk, Explainability, Subsystem Localization)
    analyze_res = client.post(f"/api/screening/analyze/{batch_id}", headers=headers)
    assert analyze_res.status_code == 200
    analysis = analyze_res.json()
    assert analysis["batch_id"] == batch_id
    assert analysis["safe"] + analysis["monitor"] + analysis["reject"] == 18
    assert "risk_distribution" in analysis
    assert "lot_summaries" in analysis
    assert "evaluation_metrics" in analysis

    # 4. Fetch Mission Dashboard Status
    status_res = client.get(f"/api/mission/status/{batch_id}", headers=headers)
    assert status_res.status_code == 200
    m_status = status_res.json()
    assert m_status["batch_id"] == batch_id
    assert m_status["safe"] + m_status["monitor"] + m_status["reject"] == 18

    # 5. Fetch List of Components with Subsystem Localization
    comp_list_res = client.get(f"/api/screening/components/{batch_id}?limit=100", headers=headers)
    assert comp_list_res.status_code == 200
    comp_data = comp_list_res.json()
    assert len(comp_data["components"]) == 18

    # Verify that each component has subsystem localization for 3D satellite mapping
    for c in comp_data["components"]:
        assert c["subsystem"] is not None
        assert "risk_score" in c
        assert "risk_level" in c
        assert "v168" in c

    # 6. Deep Dive Component Detail Inspection
    target_comp = comp_data["components"][0]
    cid = target_comp["component_id"]
    detail_res = client.get(f"/api/screening/components/{batch_id}/{cid}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["component_id"] == cid
    assert "reason" in detail
    assert "explanation_points" in detail

    # 7. Query Lot-level statistical distribution
    lot_id = detail["lot_id"]
    lot_res = client.get(f"/api/screening/lot/{lot_id}?batch_id={batch_id}", headers=headers)
    assert lot_res.status_code == 200
    lot_info = lot_res.json()
    assert lot_info["lot_id"] == lot_id
    assert "cohort_stats" in lot_info

    # 8. Export Engineering Qualification CSV Report
    report_res = client.get(f"/api/screening/export/{batch_id}", headers=headers)
    assert report_res.status_code == 200
    assert "text/csv" in report_res.headers["content-type"]
    assert cid in report_res.text
