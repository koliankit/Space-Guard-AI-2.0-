import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models.orm_models import ComponentRecord
from services.satellite_mapper import NAME_BY_KEY

router = APIRouter(prefix="/api", tags=["report"])

FIELDS = [
    "component_id", "lot_id", "subsystem_name", "parameter", "v0", "v24", "v96", "v168", "limit_ua",
    "lot_mean", "lot_pct_dev", "z168", "slope", "predicted168_from_early", "predicted_future",
    "drift_trend", "anomaly_category", "risk_score", "traditional_decision", "status", "reason",
]


@router.get("/report/{batch_id}")
def download_report(batch_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(ComponentRecord)
        .filter(ComponentRecord.batch_id == batch_id, ComponentRecord.status != "safe")
        .order_by(ComponentRecord.risk_score.desc())
        .all()
    )
    if not rows:
        raise HTTPException(404, "No flagged components to report (or batch not analyzed yet).")

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=FIELDS)
    writer.writeheader()
    for r in rows:
        writer.writerow({
            "component_id": r.component_id, "lot_id": r.lot_id,
            "subsystem_name": NAME_BY_KEY.get(r.subsystem, r.subsystem),
            "parameter": r.parameter or "Leakage Current (µA)",
            "v0": r.v0, "v24": r.v24, "v96": r.v96, "v168": r.v168, "limit_ua": r.limit_ua,
            "lot_mean": round(r.lot_mean, 2) if r.lot_mean is not None else "",
            "lot_pct_dev": round(r.lot_pct_dev, 1) if r.lot_pct_dev is not None else "",
            "z168": round(r.z168, 3) if r.z168 is not None else "",
            "slope": round(r.slope, 5) if r.slope is not None else "",
            "predicted168_from_early": round(r.predicted168_from_early, 2) if r.predicted168_from_early is not None else "",
            "predicted_future": round(r.predicted_future, 2) if r.predicted_future is not None else "",
            "drift_trend": r.drift_trend or "",
            "anomaly_category": r.anomaly_category or "",
            "risk_score": r.risk_score, "traditional_decision": r.traditional_decision,
            "status": r.status, "reason": r.reason,
        })
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=spaceguard_report_batch{batch_id}.csv"},
    )
