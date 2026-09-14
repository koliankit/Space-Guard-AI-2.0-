"""
ASTRA VIGIL Core Pipeline Orchestrator.

Orchestrates the complete screening flow:
  Data Ingest & Mapping
    ↓
  Data Validation (preprocessing)
    ↓
  Feature Engineering & Temporal Drift (Module B)
    ↓
  Dynamic Lot-Relative Normalization (Module A)
    ↓
  Unsupervised Isolation Forest (Pure-NumPy)
    ↓
  Supervised XGBoost (Native DMatrix)
    ↓
  Unified Multi-Factor Risk Engine (0-100)
    ↓
  Component Localization (Satellite Subsystems)
    ↓
  Real Evaluation Metrics (Honest Procedure)
    ↓
  Idempotent Database Persistence
"""
import pandas as pd
from sqlalchemy.orm import Session

from services import feature_engineering, lot_analysis, anomaly_detector, risk_engine, satellite_mapper
from models.orm_models import Batch, ComponentRecord


def run_pipeline(df: pd.DataFrame):
    """
    Executes the end-to-end ASTRA VIGIL screening pipeline.
    Returns (result_df, ml_meta, eval_metrics, lot_summaries).
    """
    # 1. Module B: Drift and temporal behavior
    df = feature_engineering.add_features(df)
    # 2. Module A: Lot-relative statistics and peer normalization
    df = lot_analysis.add_lot_relative_scores(df)
    # 3. Isolation Forest: Unsupervised anomaly scoring
    df = anomaly_detector.run_isolation_forest(df)
    # 4. XGBoost: Supervised classification when ground-truth labels exist
    df, ml_meta = anomaly_detector.run_supervised_if_labeled(df)
    # 5. Risk Engine: Composite risk score, risk level, and contextual explainability
    df = risk_engine.score_and_decide(df, has_ml=ml_meta is not None)
    # 6. Localization: Map to physical spacecraft subsystems
    df = satellite_mapper.add_subsystem(df)
    # 7. Model Evaluation Metrics
    eval_metrics = anomaly_detector.compute_evaluation_metrics(df)
    # 8. Lot Cohort Summaries
    lot_summaries = lot_analysis.generate_lot_summaries(df)

    return df, ml_meta, eval_metrics, lot_summaries


def persist_components(db: Session, batch: Batch, df: pd.DataFrame, lot_summaries: list = None):
    """
    Persists analyzed components idempotently to the database.
    """
    db.query(ComponentRecord).filter(ComponentRecord.batch_id == batch.id).delete()
    records = []

    for _, row in df.iterrows():
        records.append(ComponentRecord(
            batch_id=batch.id,
            component_id=str(row["component_id"]),
            lot_id=str(row["lot_id"]),
            subsystem=row.get("subsystem"),
            component_type=str(row.get("component_type", "Integrated Circuit")),
            parameter=str(row.get("parameter", "Leakage Current (µA)")),
            unit=str(row.get("unit", "µA")),
            v0=float(row["v0"]),
            v24=float(row["v24"]),
            v96=(None if pd.isna(row.get("v96", None)) else float(row["v96"])),
            v168=float(row["v168"]),
            datasheet_min=float(row.get("datasheet_min", 0.0)),
            datasheet_max=float(row.get("datasheet_max", row.get("limit", 50.0))),
            limit_ua=float(row.get("limit", 50.0)),
            temperature_c=float(row.get("temperature_c", 125.0)),
            lot_mean=(None if pd.isna(row.get("lot_mean", None)) else float(row["lot_mean"])),
            lot_median=(None if pd.isna(row.get("lot_median", None)) else float(row["lot_median"])),
            lot_std=(None if pd.isna(row.get("lot_std", None)) else float(row["lot_std"])),
            lot_mad=(None if pd.isna(row.get("lot_mad", None)) else float(row["lot_mad"])),
            lot_pct_dev=(None if pd.isna(row.get("lot_pct_dev", None)) else float(row["lot_pct_dev"])),
            lot_rank_percentile=(None if pd.isna(row.get("lot_rank_percentile", None)) else float(row["lot_rank_percentile"])),
            lot_anomaly_score=(None if pd.isna(row.get("lot_anomaly_score", None)) else float(row["lot_anomaly_score"])),
            ground_truth=(None if pd.isna(row.get("ground_truth", None)) else float(row["ground_truth"])),
            slope=float(row.get("slope", 0.0)),
            drift168=float(row.get("drift168", 0.0)),
            pct_drift=float(row.get("pct_drift", 0.0)),
            drift_rate_early=float(row.get("drift_rate_early", 0.0)),
            predicted_drift_168=float(row.get("predicted_drift_168", 0.0)),
            predicted_drift_rate=float(row.get("predicted_drift_rate", 0.0)),
            safety_slope=float(row.get("safety_slope", 0.04)),
            safety_slope_exceeded=bool(row.get("safety_slope_exceeded", False)),
            drift_trend=str(row.get("drift_trend", "NOMINAL / STABLE")),
            drift_classification=str(row.get("drift_classification", "SAFE FUTURE TREND")),
            predicted168_from_early=float(row.get("predicted168_from_early", row["v168"])),
            prediction_error_168=(None if pd.isna(row.get("prediction_error_168", None)) else float(row["prediction_error_168"])),
            predicted_future=float(row.get("predicted_future", row["v168"])),
            margin_168=float(row.get("margin_168", 0.0)),
            margin_future=float(row.get("margin_future", 0.0)),
            future_limit_breach=bool(row.get("future_limit_breach", False)),
            z168=float(row.get("z168", 0.0)),
            z_slope=float(row.get("z_slope", 0.0)),
            iso_score=float(row.get("iso_score", 0.0)),
            ml_prob=(None if "ml_prob" not in row or pd.isna(row["ml_prob"]) else float(row["ml_prob"])),
            risk_score=int(row.get("risk_score", 0)),
            risk_level=str(row.get("risk_level", "LOW")),
            status=str(row.get("status", "safe")),
            behavioral_health=str(row.get("behavioral_health", "NORMAL")),
            traditional_decision=str(row.get("traditional_decision", "PASS")),
            anomaly_category=str(row.get("anomaly_category", "normal_within_spec")),
            reason=str(row.get("reason", "")),
            explanation_points=row.get("explanation_points"),
        ))

    db.bulk_save_objects(records)
    if lot_summaries:
        batch.lot_summary = lot_summaries
    db.commit()
