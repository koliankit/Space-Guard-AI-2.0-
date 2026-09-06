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

    components = relationship("ComponentRecord", back_populates="batch", cascade="all, delete-orphan")


class ComponentRecord(Base):
    __tablename__ = "components"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), index=True)

    component_id = Column(String, index=True)
    lot_id = Column(String, index=True)
    subsystem = Column(String, index=True, nullable=True)

    v0 = Column(Float)
    v24 = Column(Float)
    v96 = Column(Float, nullable=True)
    v168 = Column(Float)
    limit_ua = Column(Float)
    ground_truth = Column(Float, nullable=True)

    slope = Column(Float, nullable=True)
    drift168 = Column(Float, nullable=True)
    pct_drift = Column(Float, nullable=True)
    predicted168_from_early = Column(Float, nullable=True)
    predicted_future = Column(Float, nullable=True)

    z168 = Column(Float, nullable=True)
    z_slope = Column(Float, nullable=True)
    iso_score = Column(Float, nullable=True)
    ml_prob = Column(Float, nullable=True)

    risk_score = Column(Integer, nullable=True)
    status = Column(String, nullable=True)  # safe | monitor | reject
    traditional_decision = Column(String, nullable=True)  # PASS | FAIL
    reason = Column(String, nullable=True)

    batch = relationship("Batch", back_populates="components")
