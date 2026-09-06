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

export interface ComponentOut {
  component_id: string
  lot_id: string
  subsystem: string
  subsystem_name: string
  v0: number
  v24: number
  v96: number | null
  v168: number
  limit_ua: number
  ground_truth: number | null
  slope: number
  drift168: number
  pct_drift: number
  predicted168_from_early: number
  predicted_future: number
  z168: number
  z_slope: number
  iso_score: number
  ml_prob: number | null
  risk_score: number
  status: Status
  traditional_decision: 'PASS' | 'FAIL'
  reason: string
}

export interface AnalyzeResult {
  batch_id: number
  safe: number
  monitor: number
  reject: number
  mission_health: number
  ml_meta: Record<string, unknown> | null
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
