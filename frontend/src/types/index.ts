export type Status = 'safe' | 'monitor' | 'reject' | 'idle'

export interface UploadResult {
  batch_id: number
  rows: number
  valid: number
  missing: number
  lots: number
  has_ground_truth: boolean
  columns_detected?: Record<string, string>
  error?: 'column_mapping_required'
  detected_headers?: string[]
  auto_mapping?: Record<string, string>
  missing_fields?: string[]
}

export type AnomalyCategory =
  | 'normal_within_spec'
  | 'abnormal_within_spec'
  | 'approaching_limit'
  | 'predicted_exceedance'
  | 'outside_spec'

export type DriftTrend =
  | 'ACCELERATING POSITIVE DRIFT'
  | 'LINEAR POSITIVE DRIFT'
  | 'NOMINAL / STABLE'
  | 'NEGATIVE DRIFT'

export type DriftClassification =
  | 'SAFE FUTURE TREND'
  | 'MONITOR FUTURE TREND'
  | 'PREDICTED LIMIT EXCEEDANCE'

export type BehavioralHealth = 'NORMAL' | 'MONITOR' | 'DEGRADING' | 'CRITICAL'

export interface EvaluationMetrics {
  has_ground_truth: boolean
  precision?: number
  recall?: number
  f1?: number
  fpr?: number
  fnr?: number
  mae_drift: number
  rmse_drift: number
  mean_error_pct: number
  status_message?: string
}

export interface ComponentOut {
  component_id: string
  lot_id: string
  subsystem: string
  subsystem_name: string
  parameter?: string
  v0: number
  v24: number
  v96: number | null
  v168: number
  limit_ua: number
  lot_mean?: number
  lot_std?: number
  lot_pct_dev?: number
  ground_truth: number | null
  slope: number
  drift168: number
  pct_drift: number
  drift_rate_early?: number
  drift_trend?: DriftTrend
  drift_classification?: DriftClassification
  predicted168_from_early: number
  prediction_error_168?: number
  predicted_future: number
  margin_168?: number
  margin_future?: number
  future_limit_breach?: boolean
  z168: number
  z_slope: number
  iso_score: number
  ml_prob: number | null
  risk_score: number
  status: Status
  behavioral_health?: BehavioralHealth
  traditional_decision: 'PASS' | 'FAIL'
  anomaly_category?: AnomalyCategory
  reason: string
  explanation_points?: string[]
}

export interface AnalyzeResult {
  batch_id: number
  safe: number
  monitor: number
  reject: number
  mission_health: number
  ml_meta: Record<string, unknown> | null
  evaluation_metrics?: EvaluationMetrics
  top_flagged: ComponentOut | null
}

export interface SubsystemStatus {
  key: string
  name: string
  position: [number, number, number]
  count: number
  status: Status
  avg_risk: number
  top_component: string | null
}

export interface MissionStatus {
  batch_id: number
  mission_health: number
  safe: number
  monitor: number
  reject: number
  subsystems: SubsystemStatus[]
}

export interface MissionProfile {
  id: string
  name: string
  code: string
  targetOrbit: string
  centre: string
  lotsPrefix: string
  description: string
  highlightSubsystem: string
  icon: string
}

