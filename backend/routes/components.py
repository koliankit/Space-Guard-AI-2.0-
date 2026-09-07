from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models.orm_models import ComponentRecord
from services.satellite_mapper import NAME_BY_KEY

router = APIRouter(prefix="/api", tags=["components"])


def _to_dict(r: ComponentRecord):
    return {
        "component_id": r.component_id, "lot_id": r.lot_id,
        "subsystem": r.subsystem, "subsystem_name": NAME_BY_KEY.get(r.subsystem, r.subsystem),
        "parameter": r.parameter or "Leakage Current (µA)",
        "v0": r.v0, "v24": r.v24, "v96": r.v96, "v168": r.v168, "limit_ua": r.limit_ua,
        "lot_mean": r.lot_mean, "lot_std": r.lot_std, "lot_pct_dev": r.lot_pct_dev,
        "ground_truth": r.ground_truth,
        "slope": r.slope, "drift168": r.drift168, "pct_drift": r.pct_drift,
        "drift_rate_early": r.drift_rate_early,
        "drift_trend": r.drift_trend,
        "drift_classification": r.drift_classification,
        "predicted168_from_early": r.predicted168_from_early,
        "prediction_error_168": r.prediction_error_168,
        "predicted_future": r.predicted_future,
        "margin_168": r.margin_168,
        "margin_future": r.margin_future,
        "z168": r.z168, "z_slope": r.z_slope, "iso_score": r.iso_score, "ml_prob": r.ml_prob,
        "risk_score": r.risk_score, "status": r.status,
        "traditional_decision": r.traditional_decision,
        "anomaly_category": r.anomaly_category,
        "reason": r.reason,
    }


@router.get("/components/{batch_id}")
def list_components(
    batch_id: int,
    status: Optional[str] = Query(None, description="safe | monitor | reject"),
    search: Optional[str] = Query(None),
    subsystem: Optional[str] = Query(None),
    limit: int = Query(60, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(ComponentRecord).filter(ComponentRecord.batch_id == batch_id)
    if status:
        q = q.filter(ComponentRecord.status == status)
    if subsystem:
        q = q.filter(ComponentRecord.subsystem == subsystem)
    if search:
        q = q.filter(ComponentRecord.component_id.ilike(f"%{search}%"))
    total = q.count()
    rows = q.order_by(ComponentRecord.risk_score.desc().nullslast()).offset(offset).limit(limit).all()
    return {"total": total, "components": [_to_dict(r) for r in rows]}


@router.get("/components/{batch_id}/{component_id}")
def component_detail(batch_id: int, component_id: str, db: Session = Depends(get_db)):
    row = (
        db.query(ComponentRecord)
        .filter(ComponentRecord.batch_id == batch_id, ComponentRecord.component_id == component_id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Component not found in this batch.")
    return _to_dict(row)
