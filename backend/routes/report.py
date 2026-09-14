import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models.orm_models import Batch, ComponentRecord
from services.satellite_mapper import NAME_BY_KEY

router = APIRouter(prefix="/api", tags=["report"])

FIELDS = [
    "component_id",
    "lot_id",
    "component_type",
    "subsystem_name",
    "parameter",
    "unit",
    "v0",
    "v24",
    "v96",
    "v168",
    "limit_ua",
    "datasheet_min",
    "datasheet_max",
    "temperature_c",
    "lot_mean",
    "lot_median",
    "lot_mad",
    "lot_pct_dev",
    "is_latent_defect",
    "z168",
    "robust_z168",
    "slope",
    "predicted168_from_early",
    "predicted_future",
    "breach_probability",
    "drift_trend",
    "anomaly_category",
    "risk_score",
    "risk_level",
    "behavioral_health",
    "traditional_decision",
    "status",
    "reason",
]


def _get_target_batch(batch_id: Optional[int], db: Session) -> Batch:
    if batch_id is not None:
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
    else:
        batch = db.query(Batch).order_by(Batch.id.desc()).first()
    if not batch:
        raise HTTPException(404, "Batch not found.")
    return batch


@router.get("/report/{batch_id}")
@router.get("/report")
@router.get("/screening/export/{batch_id}")
@router.get("/screening/export")
def download_report(batch_id: Optional[int] = None, db: Session = Depends(get_db)):
    batch = _get_target_batch(batch_id, db)
    rows = (
        db.query(ComponentRecord)
        .filter(ComponentRecord.batch_id == batch.id, ComponentRecord.status != "safe")
        .order_by(ComponentRecord.risk_score.desc())
        .all()
    )
    if not rows:
        raise HTTPException(404, "No flagged components to report in this batch (or batch not analyzed yet).")

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=FIELDS)
    writer.writeheader()
    for r in rows:
        writer.writerow({
            "component_id": r.component_id,
            "lot_id": r.lot_id,
            "component_type": getattr(r, "component_type", "Integrated Circuit") or "Integrated Circuit",
            "subsystem_name": NAME_BY_KEY.get(r.subsystem, r.subsystem),
            "parameter": r.parameter or "Leakage Current (µA)",
            "unit": getattr(r, "unit", "µA") or "µA",
            "v0": r.v0,
            "v24": r.v24,
            "v96": r.v96 if r.v96 is not None else "",
            "v168": r.v168,
            "limit_ua": r.limit_ua,
            "datasheet_min": getattr(r, "datasheet_min", 0.0),
            "datasheet_max": getattr(r, "datasheet_max", r.limit_ua),
            "temperature_c": getattr(r, "temperature_c", 125.0),
            "lot_mean": round(r.lot_mean, 3) if r.lot_mean is not None else "",
            "lot_median": round(r.lot_median, 3) if getattr(r, "lot_median", None) is not None else "",
            "lot_mad": round(r.lot_mad, 3) if getattr(r, "lot_mad", None) is not None else "",
            "lot_pct_dev": round(r.lot_pct_dev, 2) if r.lot_pct_dev is not None else "",
            "is_latent_defect": "YES" if getattr(r, "is_latent_defect", False) else "NO",
            "z168": round(r.z168, 3) if r.z168 is not None else "",
            "robust_z168": round(r.robust_z168, 3) if getattr(r, "robust_z168", None) is not None else "",
            "slope": round(r.slope, 5) if r.slope is not None else "",
            "predicted168_from_early": round(r.predicted168_from_early, 2) if r.predicted168_from_early is not None else "",
            "predicted_future": round(r.predicted_future, 2) if r.predicted_future is not None else "",
            "breach_probability": round(r.breach_probability, 3) if getattr(r, "breach_probability", None) is not None else "",
            "drift_trend": r.drift_trend or "",
            "anomaly_category": r.anomaly_category or "",
            "risk_score": r.risk_score,
            "risk_level": getattr(r, "risk_level", "LOW") or "LOW",
            "behavioral_health": getattr(r, "behavioral_health", "NORMAL") or "NORMAL",
            "traditional_decision": r.traditional_decision,
            "status": r.status,
            "reason": r.reason,
        })
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=astra_vigil_screening_report_batch{batch.id}.csv"},
    )
