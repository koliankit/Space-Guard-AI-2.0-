from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class UploadResponse(BaseModel):
    batch_id: int
    rows: int
    valid: int
    missing: int
    lots: int
    has_ground_truth: bool
    columns_detected: Dict[str, str]


class MappingRequired(BaseModel):
    error: str = "column_mapping_required"
    detected_headers: List[str]
    auto_mapping: Dict[str, str]
    missing_fields: List[str]


class ComponentOut(BaseModel):
    component_id: str
    lot_id: str
    subsystem: str
    subsystem_name: str
    parameter: Optional[str] = "Leakage Current (µA)"
    v0: float
    v24: float
    v96: Optional[float] = None
    v168: float
    limit_ua: float
    lot_mean: Optional[float] = None
    lot_std: Optional[float] = None
    lot_pct_dev: Optional[float] = None
    ground_truth: Optional[float] = None
    slope: float
    drift168: float
    pct_drift: float
    drift_rate_early: Optional[float] = None
    drift_trend: Optional[str] = None
    drift_classification: Optional[str] = None
    predicted168_from_early: float
    prediction_error_168: Optional[float] = None
    predicted_future: float
    margin_168: Optional[float] = None
    margin_future: Optional[float] = None
    z168: float
    z_slope: float
    iso_score: float
    ml_prob: Optional[float] = None
    risk_score: int
    status: str
    traditional_decision: str
    anomaly_category: Optional[str] = None
    reason: str

    class Config:
        from_attributes = True


class AnalyzeResponse(BaseModel):
    batch_id: int
    safe: int
    monitor: int
    reject: int
    mission_health: int
    ml_meta: Optional[Dict[str, Any]] = None
    evaluation_metrics: Optional[Dict[str, Any]] = None
    top_flagged: Optional[ComponentOut] = None


class SubsystemStatus(BaseModel):
    key: str
    name: str
    position: List[float]
    count: int
    status: str
    avg_risk: float
    top_component: Optional[str] = None


class MissionStatusResponse(BaseModel):
    batch_id: int
    mission_health: int
    safe: int
    monitor: int
    reject: int
    subsystems: List[SubsystemStatus]
