"""
Orchestrates the full DETECT -> PREDICT -> LOCALIZE -> ASSESS -> DECIDE
pipeline over a cleaned dataframe, and persists the results onto a Batch's
ComponentRecord rows.
"""
import pandas as pd
from sqlalchemy.orm import Session

from services import feature_engineering, lot_analysis, anomaly_detector, risk_engine, satellite_mapper
from models.orm_models import Batch, ComponentRecord


def run_pipeline(df: pd.DataFrame):
    df = feature_engineering.add_features(df)
    df = lot_analysis.add_lot_relative_scores(df)
    df = anomaly_detector.run_isolation_forest(df)
    df, ml_meta = anomaly_detector.run_supervised_if_labeled(df)
    df = risk_engine.score_and_decide(df, has_ml=ml_meta is not None)
    df = satellite_mapper.add_subsystem(df)
    return df, ml_meta


def persist_components(db: Session, batch: Batch, df: pd.DataFrame):
    # clear any previous rows for this batch (re-analysis is idempotent)
    db.query(ComponentRecord).filter(ComponentRecord.batch_id == batch.id).delete()
    records = []
    for _, row in df.iterrows():
        records.append(ComponentRecord(
            batch_id=batch.id,
            component_id=row["component_id"], lot_id=row["lot_id"], subsystem=row.get("subsystem"),
            v0=row["v0"], v24=row["v24"],
            v96=(None if pd.isna(row.get("v96", None)) else row["v96"]),
            v168=row["v168"], limit_ua=row["limit"],
            ground_truth=(None if pd.isna(row.get("ground_truth", None)) else row["ground_truth"]),
            slope=row.get("slope"), drift168=row.get("drift168"), pct_drift=row.get("pct_drift"),
            predicted168_from_early=row.get("predicted168_from_early"),
            predicted_future=row.get("predicted_future"),
            z168=row.get("z168"), z_slope=row.get("z_slope"),
            iso_score=row.get("iso_score"), ml_prob=row.get("ml_prob"),
            risk_score=int(row.get("risk_score", 0)), status=row.get("status"),
            traditional_decision=row.get("traditional_decision"), reason=row.get("reason"),
        ))
    db.bulk_save_objects(records)
    db.commit()
