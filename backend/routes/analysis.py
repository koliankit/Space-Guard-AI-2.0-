from typing import Optional
from pydantic import BaseModel
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.orm_models import Batch, ComponentRecord
from services.pipeline import run_pipeline, persist_components

router = APIRouter(prefix="/api", tags=["analysis"])


class AnalyzeRequest(BaseModel):
    batch_id: Optional[int] = None


def _batch_or_404(db: Session, batch_id: int) -> Batch:
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(404, "Batch not found.")
    return batch


def _get_latest_batch(db: Session) -> Batch:
    batch = db.query(Batch).order_by(Batch.id.desc()).first()
    if not batch:
        raise HTTPException(404, "No screening batches found.")
    return batch


def _build_analysis_response(batch: Batch, result_df: pd.DataFrame, ml_meta: dict, eval_metrics: dict, lot_summaries: list = None) -> dict:
    safe = int((result_df["status"] == "safe").sum())
    monitor = int((result_df["status"] == "monitor").sum())
    reject = int((result_df["status"] == "reject").sum())
    mission_health = int(round(100 - result_df["risk_score"].mean())) if len(result_df) else 100

    risk_col = result_df["risk_level"] if "risk_level" in result_df.columns else pd.Series(["LOW"] * len(result_df))
    risk_distribution = {
        "LOW": int((risk_col == "LOW").sum()),
        "MEDIUM": int((risk_col == "MEDIUM").sum()),
        "HIGH": int((risk_col == "HIGH").sum()),
        "CRITICAL": int((risk_col == "CRITICAL").sum()),
    }

    top_flagged = None
    rejected = result_df[result_df["status"] == "reject"].sort_values("risk_score", ascending=False)
    if len(rejected):
        top = rejected.iloc[0]
        from services.satellite_mapper import NAME_BY_KEY
        top_flagged = {
            "component_id": top["component_id"],
            "lot_id": top["lot_id"],
            "component_type": top.get("component_type", "Integrated Circuit"),
            "subsystem": top["subsystem"],
            "subsystem_name": NAME_BY_KEY.get(top["subsystem"], top["subsystem"]),
            "parameter": top.get("parameter", "Leakage Current (µA)"),
            "unit": top.get("unit", "µA"),
            "v0": float(top["v0"]),
            "v24": float(top["v24"]),
            "v96": (None if pd.isna(top.get("v96")) else float(top["v96"])),
            "v168": float(top["v168"]),
            "limit_ua": float(top["limit"] if "limit" in top and pd.notna(top["limit"]) else (top.get("limit_ua") or top.get("datasheet_max") or 50.0)),
            "datasheet_min": (None if pd.isna(top.get("datasheet_min")) else float(top["datasheet_min"])),
            "datasheet_max": (None if pd.isna(top.get("datasheet_max")) else float(top["datasheet_max"])),
            "temperature_c": (None if pd.isna(top.get("temperature_c")) else float(top["temperature_c"])),
            "lot_mean": (None if pd.isna(top.get("lot_mean")) else float(top["lot_mean"])),
            "lot_std": (None if pd.isna(top.get("lot_std")) else float(top["lot_std"])),
            "lot_median": (None if pd.isna(top.get("lot_median")) else float(top["lot_median"])),
            "lot_mad": (None if pd.isna(top.get("lot_mad")) else float(top["lot_mad"])),
            "lot_pct_dev": (None if pd.isna(top.get("lot_pct_dev")) else float(top["lot_pct_dev"])),
            "is_latent_defect": bool(top.get("is_latent_defect", False)),
            "slope": float(top["slope"]),
            "drift168": float(top["drift168"]),
            "pct_drift": float(top["pct_drift"]),
            "drift_rate_early": (None if pd.isna(top.get("drift_rate_early")) else float(top["drift_rate_early"])),
            "drift_trend": top.get("drift_trend"),
            "drift_classification": top.get("drift_classification"),
            "predicted168_from_early": float(top["predicted168_from_early"]),
            "prediction_error_168": (None if pd.isna(top.get("prediction_error_168")) else float(top["prediction_error_168"])),
            "predicted_future": float(top["predicted_future"]),
            "margin_168": (None if pd.isna(top.get("margin_168")) else float(top["margin_168"])),
            "margin_future": (None if pd.isna(top.get("margin_future")) else float(top["margin_future"])),
            "future_limit_breach": bool(top.get("future_limit_breach", False)),
            "breach_probability": (None if pd.isna(top.get("breach_probability")) else float(top["breach_probability"])),
            "z168": float(top["z168"]),
            "robust_z168": (None if pd.isna(top.get("robust_z168")) else float(top["robust_z168"])),
            "z_slope": float(top["z_slope"]),
            "iso_score": float(top["iso_score"]),
            "ml_prob": (None if "ml_prob" not in top or pd.isna(top.get("ml_prob")) else float(top["ml_prob"])),
            "risk_score": int(top["risk_score"]),
            "risk_level": str(top.get("risk_level", "LOW")),
            "status": str(top["status"]),
            "behavioral_health": str(top.get("behavioral_health", "NORMAL")),
            "traditional_decision": str(top["traditional_decision"]),
            "anomaly_category": top.get("anomaly_category"),
            "reason": top["reason"],
            "explanation_points": top.get("explanation_points"),
            "ground_truth": (None if pd.isna(top.get("ground_truth")) else int(top["ground_truth"])),
        }

    return {
        "batch_id": batch.id,
        "safe": safe,
        "monitor": monitor,
        "reject": reject,
        "risk_distribution": risk_distribution,
        "mission_health": max(0, min(100, mission_health)),
        "ml_meta": ml_meta,
        "lot_summaries": lot_summaries if lot_summaries is not None else batch.lot_summary or [],
        "evaluation_metrics": eval_metrics,
        "top_flagged": top_flagged,
    }


def _execute_analysis(batch: Batch, db: Session) -> dict:
    rows = db.query(ComponentRecord).filter(ComponentRecord.batch_id == batch.id).all()
    if not rows:
        raise HTTPException(400, "Batch has no components to analyze.")

    df = pd.DataFrame([{
        "component_id": r.component_id,
        "lot_id": r.lot_id,
        "component_type": r.component_type or "Integrated Circuit",
        "parameter": r.parameter or "Leakage Current (µA)",
        "unit": r.unit or "µA",
        "v0": r.v0,
        "v24": r.v24,
        "v96": r.v96,
        "v168": r.v168,
        "limit": r.limit_ua,
        "datasheet_min": r.datasheet_min,
        "datasheet_max": r.datasheet_max or r.limit_ua,
        "temperature_c": r.temperature_c or 125.0,
        "ground_truth": r.ground_truth,
    } for r in rows])

    result_df, ml_meta, eval_metrics, lot_summaries = run_pipeline(df)
    persist_components(db, batch, result_df, lot_summaries)

    batch.analyzed = True
    batch.ml_meta = ml_meta
    batch.lot_summary = lot_summaries
    db.commit()

    return _build_analysis_response(batch, result_df, ml_meta, eval_metrics, lot_summaries)


@router.post("/analyze/{batch_id}")
@router.post("/screening/analyze/{batch_id}")
def analyze_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = _batch_or_404(db, batch_id)
    return _execute_analysis(batch, db)


@router.post("/analyze")
@router.post("/screening/analyze")
def analyze_latest_or_body(payload: Optional[AnalyzeRequest] = None, db: Session = Depends(get_db)):
    batch_id = payload.batch_id if payload else None
    if batch_id:
        batch = _batch_or_404(db, batch_id)
    else:
        batch = _get_latest_batch(db)
    return _execute_analysis(batch, db)


@router.get("/screening/results/{batch_id}")
def get_screening_results_by_id(batch_id: int, db: Session = Depends(get_db)):
    batch = _batch_or_404(db, batch_id)
    rows = db.query(ComponentRecord).filter(ComponentRecord.batch_id == batch.id).all()
    if not rows:
        raise HTTPException(400, "Batch has no component records.")
    df = pd.DataFrame([{c.name: getattr(r, c.name) for c in r.__table__.columns} for r in rows])
    ml_meta = batch.ml_meta or {}
    eval_metrics = ml_meta.get("evaluation_metrics", {})
    return _build_analysis_response(batch, df, ml_meta, eval_metrics, batch.lot_summary or [])


@router.get("/screening/results")
def get_screening_results_latest(db: Session = Depends(get_db)):
    batch = _get_latest_batch(db)
    return get_screening_results_by_id(batch.id, db)
