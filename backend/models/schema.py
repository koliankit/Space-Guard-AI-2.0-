from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ValidationErrorItem(BaseModel):
    row: Optional[int] = None
    column: Optional[str] = None
    message: str
    severity: str = "error"  # error | warning


class ValidationSummary(BaseModel):
    is_valid: bool
    total_rows: int
    valid_rows: int
    error_count: int
    issues: List[ValidationErrorItem] = []


class UploadResponse(BaseModel):
    batch_id: int
    rows: int
    valid: int
    missing: int
    lots: int
    has_ground_truth: bool
    columns_detected: Dict[str, str]
    validation: Optional[ValidationSummary] = None


class MappingRequired(BaseModel):
    error: str = "column_mapping_required"
    detected_headers: List[str]
    auto_mapping: Dict[str, str]
    missing_fields: List[str]
    validation_issues: Optional[List[ValidationErrorItem]] = None


class ComponentOut(BaseModel):
    component_id: str
    lot_id: str
    subsystem: str
    subsystem_name: str
    component_type: Optional[str] = "Integrated Circuit"
    parameter: Optional[str] = "Leakage Current (µA)"
    unit: Optional[str] = "µA"
    v0: float
    v24: float
    v96: Optional[float] = None
    v168: float
    datasheet_min: Optional[float] = 0.0
    datasheet_max: Optional[float] = 50.0
    limit_ua: float
    temperature_c: Optional[float] = 125.0
    lot_mean: Optional[float] = None
    lot_median: Optional[float] = None
    lot_std: Optional[float] = None
    lot_mad: Optional[float] = None
    lot_pct_dev: Optional[float] = None
    lot_rank_percentile: Optional[float] = None
    lot_anomaly_score: Optional[float] = None
    ground_truth: Optional[float] = None
    slope: float
    drift168: float
    pct_drift: float
    drift_rate_early: Optional[float] = None
    predicted_drift_168: Optional[float] = None
    predicted_drift_rate: Optional[float] = None
    safety_slope: Optional[float] = None
    safety_slope_exceeded: Optional[bool] = False
    drift_trend: Optional[str] = None
    drift_classification: Optional[str] = None
    predicted168_from_early: float
    prediction_error_168: Optional[float] = None
    predicted_future: float
    margin_168: Optional[float] = None
    margin_future: Optional[float] = None
    future_limit_breach: Optional[bool] = False
    z168: float
    z_slope: float
    iso_score: float
    ml_prob: Optional[float] = None
    risk_score: int
    risk_level: Optional[str] = "LOW"
    status: str
    behavioral_health: Optional[str] = "NORMAL"
    traditional_decision: str
    anomaly_category: Optional[str] = None
    reason: str
    explanation_points: Optional[List[str]] = None

    class Config:
        from_attributes = True


class LotDetail(BaseModel):
    lot_id: str
    component_type: Optional[str] = "Integrated Circuit"
    count: int
    median: float
    mad: float
    mean: float
    std: float
    min_val: float
    max_val: float
    safe_count: int
    monitor_count: int
    reject_count: int
    anomaly_rate_pct: float
    status: str  # NOMINAL | CAUTION | ELEVATED_RISK


class AnalyzeResponse(BaseModel):
    batch_id: int
    safe: int
    monitor: int
    reject: int
    mission_health: int
    ml_meta: Optional[Dict[str, Any]] = None
    evaluation_metrics: Optional[Dict[str, Any]] = None
    top_flagged: Optional[ComponentOut] = None
    risk_distribution: Optional[Dict[str, int]] = None
    lot_summaries: Optional[List[LotDetail]] = None
    tee_security: Optional[Dict[str, Any]] = None


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
