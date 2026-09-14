from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, default="")
    source = Column(String, default="upload")  # "upload" | "demo"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    rows = Column(Integer, default=0)
    valid = Column(Integer, default=0)
    missing = Column(Integer, default=0)
    lots = Column(Integer, default=0)
    has_ground_truth = Column(Boolean, default=False)
    analyzed = Column(Boolean, default=False)
    ml_meta = Column(JSON, nullable=True)  # supervised-model metadata, if trained
    validation_report = Column(JSON, nullable=True)  # detailed validation issues
    lot_summary = Column(JSON, nullable=True)  # per-lot aggregated statistics

    components = relationship("ComponentRecord", back_populates="batch", cascade="all, delete-orphan")


class ComponentRecord(Base):
    __tablename__ = "components"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), index=True)

    component_id = Column(String, index=True)
    lot_id = Column(String, index=True)
    subsystem = Column(String, index=True, nullable=True)
    component_type = Column(String, default="Integrated Circuit", nullable=True)
    parameter = Column(String, default="Leakage Current (µA)", nullable=True)
    unit = Column(String, default="µA", nullable=True)

    v0 = Column(Float)
    v24 = Column(Float)
    v96 = Column(Float, nullable=True)
    v168 = Column(Float)
    datasheet_min = Column(Float, default=0.0, nullable=True)
    datasheet_max = Column(Float, nullable=True)
    limit_ua = Column(Float)
    temperature_c = Column(Float, default=125.0, nullable=True)
    lot_mean = Column(Float, nullable=True)
    lot_median = Column(Float, nullable=True)
    lot_std = Column(Float, nullable=True)
    lot_mad = Column(Float, nullable=True)
    lot_pct_dev = Column(Float, nullable=True)
    lot_rank_percentile = Column(Float, nullable=True)
    lot_anomaly_score = Column(Float, nullable=True)
    ground_truth = Column(Float, nullable=True)

    slope = Column(Float, nullable=True)
    drift168 = Column(Float, nullable=True)
    pct_drift = Column(Float, nullable=True)
    drift_rate_early = Column(Float, nullable=True)
    predicted_drift_168 = Column(Float, nullable=True)
    predicted_drift_rate = Column(Float, nullable=True)
    safety_slope = Column(Float, nullable=True)
    safety_slope_exceeded = Column(Boolean, default=False)
    drift_trend = Column(String, nullable=True)
    drift_classification = Column(String, nullable=True)
    predicted168_from_early = Column(Float, nullable=True)
    prediction_error_168 = Column(Float, nullable=True)
    predicted_future = Column(Float, nullable=True)
    margin_168 = Column(Float, nullable=True)
    margin_future = Column(Float, nullable=True)
    future_limit_breach = Column(Boolean, default=False)

    z168 = Column(Float, nullable=True)
    z_slope = Column(Float, nullable=True)
    iso_score = Column(Float, nullable=True)
    ml_prob = Column(Float, nullable=True)

    risk_score = Column(Integer, nullable=True)
    risk_level = Column(String, default="LOW", nullable=True)  # LOW | MEDIUM | HIGH | CRITICAL
    status = Column(String, nullable=True)  # safe | monitor | reject
    behavioral_health = Column(String, default="NORMAL", nullable=True)  # NORMAL | MONITOR | DEGRADING | CRITICAL
    traditional_decision = Column(String, nullable=True)  # PASS | FAIL
    anomaly_category = Column(String, nullable=True)
    reason = Column(String, nullable=True)
    explanation_points = Column(JSON, nullable=True)

    batch = relationship("Batch", back_populates="components")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="ENGINEER", nullable=False)  # ADMIN | ENGINEER | ANALYST | VIEWER
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String, nullable=True)
    action = Column(String, nullable=False)  # UPLOAD | ANALYZE | EXPORT | LOGIN | CONFIG
    details = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)

