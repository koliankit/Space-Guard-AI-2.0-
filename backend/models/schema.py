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
    v0: float
    v24: float
    v96: Optional[float] = None
    v168: float
    limit_ua: float
    ground_truth: Optional[float] = None
    slope: float
    drift168: float
    pct_drift: float
    predicted168_from_early: float
    predicted_future: float
    z168: float
    z_slope: float
    iso_score: float
    ml_prob: Optional[float] = None
    risk_score: int
    status: str
    traditional_decision: str
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
