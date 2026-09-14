from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models.orm_models import Batch, ComponentRecord
from services.satellite_mapper import NAME_BY_KEY

router = APIRouter(prefix="/api", tags=["components"])


def _to_dict(r: ComponentRecord):
    return {
        "component_id": r.component_id,
        "lot_id": r.lot_id,
        "component_type": getattr(r, "component_type", "Integrated Circuit") or "Integrated Circuit",
        "subsystem": r.subsystem,
        "subsystem_name": NAME_BY_KEY.get(r.subsystem, r.subsystem),
        "parameter": r.parameter or "Leakage Current (µA)",
        "unit": getattr(r, "unit", "µA") or "µA",
        "v0": r.v0,
        "v24": r.v24,
        "v96": r.v96,
        "v168": r.v168,
        "datasheet_min": getattr(r, "datasheet_min", 0.0),
        "datasheet_max": getattr(r, "datasheet_max", r.limit_ua),
        "limit_ua": r.limit_ua,
        "temperature_c": getattr(r, "temperature_c", 125.0),
        "lot_mean": r.lot_mean,
        "lot_std": r.lot_std,
        "lot_median": getattr(r, "lot_median", None),
        "lot_mad": getattr(r, "lot_mad", None),
        "lot_pct_dev": r.lot_pct_dev,
        "is_latent_defect": getattr(r, "is_latent_defect", False),
        "ground_truth": r.ground_truth,
        "slope": r.slope,
        "drift168": r.drift168,
        "pct_drift": r.pct_drift,
        "drift_rate_early": r.drift_rate_early,
        "drift_trend": r.drift_trend,
        "drift_classification": r.drift_classification,
        "predicted168_from_early": r.predicted168_from_early,
        "prediction_error_168": r.prediction_error_168,
        "predicted_future": r.predicted_future,
        "margin_168": r.margin_168,
        "margin_future": r.margin_future,
        "future_limit_breach": getattr(r, "future_limit_breach", False) or (r.predicted_future > r.limit_ua if r.predicted_future and r.limit_ua else False),
        "breach_probability": getattr(r, "breach_probability", None),
        "z168": r.z168,
        "robust_z168": getattr(r, "robust_z168", None),
        "z_slope": r.z_slope,
        "iso_score": r.iso_score,
        "ml_prob": r.ml_prob,
        "risk_score": r.risk_score,
        "risk_level": getattr(r, "risk_level", "LOW") or "LOW",
        "status": r.status,
        "behavioral_health": getattr(r, "behavioral_health", "NORMAL") or "NORMAL",
        "traditional_decision": r.traditional_decision,
        "anomaly_category": r.anomaly_category,
        "reason": r.reason,
        "explanation_points": getattr(r, "explanation_points", None),
    }


def _get_active_batch_id(batch_id: Optional[int], db: Session) -> int:
    if batch_id is not None:
        return batch_id
    latest = db.query(Batch).order_by(Batch.id.desc()).first()
    if not latest:
        raise HTTPException(404, "No batches found in database.")
    return latest.id


@router.get("/components")
@router.get("/screening/components")
@router.get("/components/{batch_id}")
@router.get("/screening/components/{batch_id}")
def list_components(
    batch_id: Optional[int] = None,
    status: Optional[str] = Query(None, description="safe | monitor | reject"),
    risk_level: Optional[str] = Query(None, description="LOW | MEDIUM | HIGH | CRITICAL"),
    lot_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    subsystem: Optional[str] = Query(None),
    limit: int = Query(60, le=5000),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    target_batch_id = _get_active_batch_id(batch_id, db)
    q = db.query(ComponentRecord).filter(ComponentRecord.batch_id == target_batch_id)
    if status:
        q = q.filter(ComponentRecord.status == status)
    if risk_level:
        q = q.filter(ComponentRecord.risk_level == risk_level)
    if lot_id:
        q = q.filter(ComponentRecord.lot_id == lot_id)
    if subsystem:
        q = q.filter(ComponentRecord.subsystem == subsystem)
    if search:
        q = q.filter(ComponentRecord.component_id.ilike(f"%{search}%"))
    total = q.count()
    rows = q.order_by(ComponentRecord.risk_score.desc().nullslast()).offset(offset).limit(limit).all()
    return {"batch_id": target_batch_id, "total": total, "components": [_to_dict(r) for r in rows]}


@router.get("/components/{batch_id}/{component_id}")
@router.get("/screening/components/{batch_id}/{component_id}")
def component_detail(batch_id: int, component_id: str, db: Session = Depends(get_db)):
    row = (
        db.query(ComponentRecord)
        .filter(ComponentRecord.batch_id == batch_id, ComponentRecord.component_id == component_id)
        .first()
    )
    if not row:
        raise HTTPException(404, f"Component {component_id} not found in batch {batch_id}.")
    return _to_dict(row)


@router.get("/components/{component_id}")
@router.get("/screening/component/{component_id}")
def component_detail_latest(component_id: str, db: Session = Depends(get_db)):
    row = (
        db.query(ComponentRecord)
        .filter(ComponentRecord.component_id == component_id)
        .order_by(ComponentRecord.id.desc())
        .first()
    )
    if not row:
        raise HTTPException(404, f"Component {component_id} not found.")
    return _to_dict(row)


@router.get("/lots/{batch_id}/{lot_id}")
@router.get("/lots/{lot_id}")
@router.get("/screening/lot/{lot_id}")
def get_lot_cohort(
    lot_id: str,
    batch_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    target_batch_id = _get_active_batch_id(batch_id, db)
    batch = db.query(Batch).filter(Batch.id == target_batch_id).first()
    rows = (
        db.query(ComponentRecord)
        .filter(ComponentRecord.batch_id == target_batch_id, ComponentRecord.lot_id == lot_id)
        .all()
    )
    if not rows:
        raise HTTPException(404, f"Lot '{lot_id}' not found in batch {target_batch_id}.")

    lot_summary_meta = {}
    if batch and batch.lot_summary:
        if isinstance(batch.lot_summary, list):
            for item in batch.lot_summary:
                if isinstance(item, dict) and item.get("lot_id") == lot_id:
                    lot_summary_meta = item
                    break
        elif isinstance(batch.lot_summary, dict):
            lot_summary_meta = batch.lot_summary.get(lot_id, {})
    safe_count = sum(1 for r in rows if r.status == "safe")
    monitor_count = sum(1 for r in rows if r.status == "monitor")
    reject_count = sum(1 for r in rows if r.status == "reject")
    latent_defects = sum(1 for r in rows if getattr(r, "is_latent_defect", False))

    return {
        "lot_id": lot_id,
        "batch_id": target_batch_id,
        "count": len(rows),
        "cohort_stats": lot_summary_meta,
        "safe_count": safe_count,
        "monitor_count": monitor_count,
        "reject_count": reject_count,
        "latent_defect_count": latent_defects,
        "pass_rate_pct": round(safe_count / len(rows) * 100, 2) if rows else 100.0,
        "components": [_to_dict(r) for r in rows],
    }


@router.get("/metrics")
@router.get("/screening/metrics")
def get_metrics(batch_id: Optional[int] = None, db: Session = Depends(get_db)):
    target_batch_id = _get_active_batch_id(batch_id, db)
    batch = db.query(Batch).filter(Batch.id == target_batch_id).first()
    if not batch:
        raise HTTPException(404, "Batch not found.")

    ml_meta = batch.ml_meta or {}
    eval_metrics = ml_meta.get("evaluation_metrics", {})
    total_components = db.query(ComponentRecord).filter(ComponentRecord.batch_id == target_batch_id).count()
    rejected_components = db.query(ComponentRecord).filter(
        ComponentRecord.batch_id == target_batch_id,
        ComponentRecord.status == "reject"
    ).count()

    return {
        "batch_id": target_batch_id,
        "analyzed": batch.analyzed,
        "total_components_screened": total_components,
        "rejected_count": rejected_components,
        "anomaly_rate_pct": round(rejected_components / total_components * 100, 2) if total_components else 0.0,
        "feature_importances": ml_meta.get("feature_importances", {}),
        "trained_on_rows": ml_meta.get("trained_on", 0),
        "features_used": ml_meta.get("features_used", []),
        "evaluation_metrics": eval_metrics,
        "lot_summaries": batch.lot_summary or ml_meta.get("lot_summaries", {}),
    }
