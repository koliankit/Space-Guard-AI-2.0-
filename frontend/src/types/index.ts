export type Status = 'safe' | 'monitor' | 'reject' | 'idle'

export interface ValidationIssue {
  row: number | null
  column: string
  message: string
  severity: 'error' | 'warning'
}

export interface UploadResult {
  batch_id: number
  rows: number
  valid: number
  missing: number
  lots: number
  has_ground_truth: boolean
  columns_detected?: Record<string, string>
  error?: 'column_mapping_required' | 'validation_failed'
  message?: string
  validation_issues?: ValidationIssue[]
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

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface EvaluationMetrics {
  has_ground_truth: boolean
  precision?: number
  recall?: number
  f1?: number
  fpr?: number
  fnr?: number
  tp?: number
  tn?: number
  fp?: number
  fn?: number
  accuracy?: number
  mae_drift: number
  rmse_drift: number
  r2_drift?: number
  mean_error_pct?: number
  status_message?: string
}

export interface ComponentOut {
  component_id: string
  lot_id: string
  subsystem: string
  subsystem_name: string
  component_type?: string
  parameter?: string
  unit?: string
  v0: number
  v24: number
  v96: number | null
  v168: number
  limit_ua: number
  datasheet_min?: number
  datasheet_max?: number
  temperature_c?: number
  lot_mean?: number
  lot_median?: number
  lot_std?: number
  lot_mad?: number
  lot_pct_dev?: number
  lot_rank_percentile?: number
  lot_anomaly_score?: number
  is_latent_defect?: boolean
  ground_truth: number | null
  slope: number
  drift168: number
  pct_drift: number
  drift_rate_early?: number
  predicted_drift_168?: number
  predicted_drift_rate?: number
  safety_slope?: number
  safety_slope_exceeded?: boolean
  drift_trend?: DriftTrend
  drift_classification?: DriftClassification
  predicted168_from_early: number
  prediction_error_168?: number
  predicted_future: number
  margin_168?: number
  margin_future?: number
  future_limit_breach?: boolean
  breach_probability?: number
  z168: number
  robust_z168?: number
  z_slope: number
  iso_score: number
  ml_prob: number | null
  risk_score: number
  risk_level?: RiskLevel
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
  risk_distribution?: {
    LOW: number
    MEDIUM: number
    HIGH: number
    CRITICAL: number
  }
  mission_health: number
  ml_meta: Record<string, unknown> | null
  lot_summaries?: Record<string, any>
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

