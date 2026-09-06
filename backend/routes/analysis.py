import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.orm_models import Batch, ComponentRecord
from services.pipeline import run_pipeline, persist_components

router = APIRouter(prefix="/api", tags=["analysis"])


def _batch_or_404(db: Session, batch_id: int) -> Batch:
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(404, "Batch not found.")
    return batch


@router.post("/analyze/{batch_id}")
def analyze_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = _batch_or_404(db, batch_id)
    rows = db.query(ComponentRecord).filter(ComponentRecord.batch_id == batch_id).all()
    if not rows:
        raise HTTPException(400, "Batch has no components to analyze.")

    df = pd.DataFrame([{
        "component_id": r.component_id, "lot_id": r.lot_id,
        "v0": r.v0, "v24": r.v24, "v96": r.v96, "v168": r.v168,
        "limit": r.limit_ua, "ground_truth": r.ground_truth,
    } for r in rows])

    result_df, ml_meta = run_pipeline(df)
    persist_components(db, batch, result_df)

    batch.analyzed = True
    batch.ml_meta = ml_meta
    db.commit()

    safe = int((result_df["status"] == "safe").sum())
    monitor = int((result_df["status"] == "monitor").sum())
    reject = int((result_df["status"] == "reject").sum())
    mission_health = int(round(100 - result_df["risk_score"].mean())) if len(result_df) else 100

    top_flagged = None
    rejected = result_df[result_df["status"] == "reject"].sort_values("risk_score", ascending=False)
    if len(rejected):
        top = rejected.iloc[0]
        from services.satellite_mapper import NAME_BY_KEY
        top_flagged = {
            "component_id": top["component_id"], "lot_id": top["lot_id"],
            "subsystem": top["subsystem"], "subsystem_name": NAME_BY_KEY.get(top["subsystem"], top["subsystem"]),
            "v0": top["v0"], "v24": top["v24"], "v96": (None if pd.isna(top.get("v96")) else top["v96"]),
            "v168": top["v168"], "limit_ua": top["limit"],
            "slope": top["slope"], "drift168": top["drift168"], "pct_drift": top["pct_drift"],
            "predicted168_from_early": top["predicted168_from_early"], "predicted_future": top["predicted_future"],
            "z168": top["z168"], "z_slope": top["z_slope"], "iso_score": top["iso_score"],
            "ml_prob": (None if "ml_prob" not in top or pd.isna(top.get("ml_prob")) else top["ml_prob"]),
            "risk_score": int(top["risk_score"]), "status": top["status"],
            "traditional_decision": top["traditional_decision"], "reason": top["reason"],
            "ground_truth": (None if pd.isna(top.get("ground_truth")) else top["ground_truth"]),
        }

    return {
        "batch_id": batch_id, "safe": safe, "monitor": monitor, "reject": reject,
        "mission_health": max(0, min(100, mission_health)),
        "ml_meta": ml_meta, "top_flagged": top_flagged,
    }
