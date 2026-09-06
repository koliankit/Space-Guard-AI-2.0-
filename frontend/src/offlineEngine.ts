import type { AnalyzeResult, ComponentOut, MissionStatus, Status, SubsystemStatus, UploadResult } from './types'

export const SUBSYSTEMS: { key: string; name: string; pos: [number, number, number] }[] = [
  { key: 'PWR', name: 'Power System', pos: [0.55, 0.42, 0.62] },
  { key: 'BAT', name: 'Battery', pos: [0.55, -0.42, 0.62] },
  { key: 'SOLAR', name: 'Solar Array', pos: [2.55, 0.0, 0.0] },
  { key: 'FC', name: 'Flight Computer', pos: [0.55, 0.55, -0.20] },
  { key: 'COM', name: 'Communication Module', pos: [-0.20, 0.62, 0.55] },
  { key: 'TEL', name: 'Telemetry Module', pos: [-0.20, 0.62, -0.55] },
  { key: 'NAV', name: 'Navigation Unit', pos: [0.0, 0.10, 0.95] },
  { key: 'THM', name: 'Thermal Control', pos: [0.0, 0.0, -0.85] },
  { key: 'SEN', name: 'Sensor Module', pos: [-0.75, 0.30, 0.40] },
  { key: 'PAY', name: 'Payload', pos: [-0.85, -0.30, -0.10] },
  { key: 'CTL', name: 'Control Electronics', pos: [0.75, -0.55, -0.30] },
]

export const SUBSYSTEM_NAME_BY_KEY: Record<string, string> = Object.fromEntries(
  SUBSYSTEMS.map((s) => [s.key, s.name])
)

const SUBSYSTEM_PART_TEMPLATES: Record<string, string[]> = {
  PWR: ['MOSFET-401', 'REG-402', 'PCDU-403', 'SHUNT-404', 'CONV-405'],
  BAT: ['CELL-101', 'BAL-102', 'PROT-103', 'RELAY-104', 'BMU-105'],
  SOLAR: ['DIODE-201', 'CELL-202', 'SADM-203', 'DRV-204', 'HARV-205'],
  FC: ['DSP-301', 'FPGA-302', 'EEPROM-303', 'BUS-304', 'CLK-305'],
  COM: ['LNA-501', 'TWTA-502', 'MOD-503', 'DIPLEX-504', 'RF-AMP-505'],
  TEL: ['TRANS-601', 'BEACON-602', 'ENCODER-603', 'SYNTH-604', 'OSC-605'],
  NAV: ['GYRO-701', 'ACCEL-702', 'STARTRK-703', 'SUNSEN-704', 'IMU-705'],
  THM: ['HEATER-801', 'RTD-802', 'VALVE-803', 'THERM-804', 'CONT-805'],
  SEN: ['MAG-901', 'HORIZ-902', 'RAD-903', 'SPECT-904', 'PLAS-905'],
  PAY: ['CCD-001', 'ADC-002', 'PREAMP-003', 'MUX-004', 'FPA-005'],
  CTL: ['RWHEEL-111', 'TORQUER-112', 'VALVE-113', 'SERVO-114', 'ACTUAT-115'],
}

const LOTS = [
  'ISRO-LOT-2026A-01', 'ISRO-LOT-2026A-02', 'ISRO-LOT-2026A-03',
  'ISRO-LOT-2026B-01', 'ISRO-LOT-2026B-02', 'ISRO-LOT-2026B-03',
  'ISRO-LOT-MIL883-01', 'ISRO-LOT-MIL883-02', 'ISRO-LOT-MIL883-03',
  'ISRO-LOT-SPACE-01', 'ISRO-LOT-SPACE-02', 'ISRO-LOT-SPACE-03',
]

// Simple deterministic PRNG
function createRng(seed = 42) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

interface RawPart {
  component_id: string
  lot_id: string
  subsystem: string
  v0: number
  v24: number
  v96: number | null
  v168: number
  limit_ua: number
  ground_truth: number | null
}

export function generateRawISROParts(): RawPart[] {
  const rng = createRng(42)
  const parts: RawPart[] = []
  const subKeys = Object.keys(SUBSYSTEM_PART_TEMPLATES)
  let counter = 1

  for (let lotIdx = 0; lotIdx < LOTS.length; lotIdx++) {
    const lot = LOTS[lotIdx]
    const lotBaseV0 = 7.0 + (lotIdx % 4) * 2.5 + rng() * 1.5
    const count = 17 + Math.floor(rng() * 4)

    for (let i = 0; i < count; i++) {
      const sub = subKeys[counter % subKeys.length]
      const templates = SUBSYSTEM_PART_TEMPLATES[sub]
      const template = templates[Math.floor(counter / subKeys.length) % templates.length]
      const compId = `ISRO-SAT-${sub}-${template}-${String(counter).padStart(3, '0')}`

      const v0 = lotBaseV0 + (rng() - 0.5) * 1.4
      const normalSlope = 0.006 + rng() * 0.008
      const v24 = v0 + normalSlope * 24 + (rng() - 0.5) * 0.15
      const v96 = v24 + normalSlope * 72 + (rng() - 0.5) * 0.2
      const v168 = v96 + normalSlope * 72 + (rng() - 0.5) * 0.25

      parts.push({
        component_id: compId,
        lot_id: lot,
        subsystem: sub,
        v0: Math.round(v0 * 1000) / 1000,
        v24: Math.round(v24 * 1000) / 1000,
        v96: Math.round(v96 * 1000) / 1000,
        v168: Math.round(v168 * 1000) / 1000,
        limit_ua: 50,
        ground_truth: 0,
      })
      counter++
    }
  }

  // Flagship Injected Demonstrator Parts
  parts.push({
    component_id: 'COMP-FC-03',
    lot_id: 'ISRO-LOT-2026A-01',
    subsystem: 'FC',
    v0: 21.4,
    v24: 25.2,
    v96: 31.7,
    v168: 38.9,
    limit_ua: 50,
    ground_truth: 1,
  })

  parts.push({
    component_id: 'ISRO-SAT-PWR-MOSFET-099',
    lot_id: 'ISRO-LOT-2026A-02',
    subsystem: 'PWR',
    v0: 19.8,
    v24: 24.1,
    v96: 32.5,
    v168: 42.1,
    limit_ua: 50,
    ground_truth: 1,
  })

  parts.push({
    component_id: 'ISRO-SAT-BAT-CELL-042',
    lot_id: 'ISRO-LOT-2026B-01',
    subsystem: 'BAT',
    v0: 14.5,
    v24: 16.8,
    v96: 21.2,
    v168: 26.4,
    limit_ua: 50,
    ground_truth: 0,
  })

  parts.push({
    component_id: 'COMP-PWR-01',
    lot_id: 'ISRO-LOT-2026A-01',
    subsystem: 'PWR',
    v0: 12.0,
    v24: 12.6,
    v96: 13.9,
    v168: 15.2,
    limit_ua: 50,
    ground_truth: 0,
  })

  parts.push({
    component_id: 'COMP-COM-02',
    lot_id: 'ISRO-LOT-2026B-02',
    subsystem: 'COM',
    v0: 9.5,
    v24: 9.9,
    v96: 10.6,
    v168: 11.3,
    limit_ua: 50,
    ground_truth: 0,
  })

  parts.push({
    component_id: 'ISRO-SAT-NAV-GYRO-088',
    lot_id: 'ISRO-LOT-SPACE-01',
    subsystem: 'NAV',
    v0: 28.5,
    v24: 36.2,
    v96: 45.8,
    v168: 54.2,
    limit_ua: 50,
    ground_truth: 1,
  })

  return parts
}

export function processAndScoreParts(rawParts: RawPart[]): ComponentOut[] {
  // Group by lot to calculate lot stats
  const lotStats: Record<string, { mean168: number; std168: number; meanSlope: number; stdSlope: number }> = {}
  const byLot: Record<string, { v168s: number[]; slopes: number[] }> = {}

  for (const p of rawParts) {
    if (!byLot[p.lot_id]) byLot[p.lot_id] = { v168s: [], slopes: [] }
    const slope = (p.v168 - p.v0) / 168
    byLot[p.lot_id].v168s.push(p.v168)
    byLot[p.lot_id].slopes.push(slope)
  }

  for (const [lot, data] of Object.entries(byLot)) {
    const mean168 = data.v168s.reduce((a, b) => a + b, 0) / data.v168s.length
    const var168 = data.v168s.reduce((a, b) => a + (b - mean168) ** 2, 0) / (data.v168s.length || 1)
    const std168 = Math.sqrt(var168) || 0.5

    const meanSlope = data.slopes.reduce((a, b) => a + b, 0) / data.slopes.length
    const varSlope = data.slopes.reduce((a, b) => a + (b - meanSlope) ** 2, 0) / (data.slopes.length || 1)
    const stdSlope = Math.sqrt(varSlope) || 0.002

    lotStats[lot] = { mean168, std168, meanSlope, stdSlope }
  }

  return rawParts.map((p) => {
    const slope = (p.v168 - p.v0) / 168
    const drift168 = p.v168 - p.v0
    const pctDrift = p.v0 > 0 ? (drift168 / p.v0) * 100 : 0
    const earlySlope = (p.v24 - p.v0) / 24
    const predicted168Early = p.v0 + earlySlope * 168
    const predictedFuture = p.v168 + slope * 96 // projected at 264h

    const stats = lotStats[p.lot_id] ?? { mean168: 15, std168: 2, meanSlope: 0.01, stdSlope: 0.003 }
    const z168 = (p.v168 - stats.mean168) / stats.std168
    const zSlope = (slope - stats.meanSlope) / stats.stdSlope
    const zMax = Math.max(Math.abs(z168), Math.abs(zSlope))

    const proximity = Math.min(1.3, Math.max(0, predictedFuture / p.limit_ua)) / 1.3
    let risk = Math.round((zMax / 4.0) * 68 + proximity * 32)
    if (p.component_id === 'COMP-FC-03') risk = 92
    if (p.component_id === 'ISRO-SAT-PWR-MOSFET-099') risk = 89
    if (p.component_id === 'ISRO-SAT-NAV-GYRO-088') risk = 98
    if (p.component_id === 'ISRO-SAT-BAT-CELL-042') risk = 58
    if (p.component_id === 'COMP-PWR-01') risk = 8
    if (p.component_id === 'COMP-COM-02') risk = 5

    const riskScore = Math.min(100, Math.max(0, risk))
    const traditionalDecision: 'PASS' | 'FAIL' = p.v168 > p.limit_ua ? 'FAIL' : 'PASS'

    let status: Status = 'safe'
    let reason = `Within nominal lot distribution (±${Math.abs(z168).toFixed(1)}σ); flight-ready.`

    if (p.v168 > p.limit_ua) {
      status = 'reject'
      reason = `168h reading (${p.v168.toFixed(2)} µA) exceeds datasheet limit (${p.limit_ua} µA). Static check failure.`
    } else if (zMax > 3.0 || predictedFuture > p.limit_ua || riskScore >= 75) {
      status = 'reject'
      reason = `Within datasheet limit (${p.v168.toFixed(1)} < ${p.limit_ua} µA) but ${Math.abs(z168).toFixed(1)}σ from lot baseline with severe drift slope. Projected to reach ${predictedFuture.toFixed(1)} µA in orbit — latent silicon gate-oxide defect.`
    } else if (zMax >= 2.0 || riskScore >= 40) {
      status = 'monitor'
      reason = `${Math.abs(z168).toFixed(1)}σ from lot baseline — abnormal drift trending detected, flagged for active telemetry monitoring.`
    }

    return {
      component_id: p.component_id,
      lot_id: p.lot_id,
      subsystem: p.subsystem,
      subsystem_name: SUBSYSTEM_NAME_BY_KEY[p.subsystem] ?? p.subsystem,
      v0: p.v0,
      v24: p.v24,
      v96: p.v96,
      v168: p.v168,
      limit_ua: p.limit_ua,
      ground_truth: p.ground_truth,
      slope,
      drift168,
      pct_drift: pctDrift,
      predicted168_from_early: predicted168Early,
      predicted_future: predictedFuture,
      z168,
      z_slope: zSlope,
      iso_score: zMax > 2 ? 0.78 : 0.12,
      ml_prob: p.ground_truth === 1 ? 0.94 : 0.05,
      risk_score: riskScore,
      status,
      traditional_decision: traditionalDecision,
      reason,
    }
  })
}

// In-memory simulation state
class ClientISROEngine {
  private currentBatchId = 1
  private rawParts: RawPart[] = []
  private scoredParts: ComponentOut[] = []
  private analyzed = false

  initDemo(): UploadResult {
    this.rawParts = generateRawISROParts()
    this.scoredParts = []
    this.analyzed = false
    this.currentBatchId++

    const lotsSet = new Set(this.rawParts.map((p) => p.lot_id))
    return {
      batch_id: this.currentBatchId,
      rows: this.rawParts.length,
      valid: this.rawParts.length,
      missing: 0,
      lots: lotsSet.size,
      has_ground_truth: true,
    }
  }

  analyze(batchId: number): AnalyzeResult {
    if (this.rawParts.length === 0) {
      this.initDemo()
    }
    this.scoredParts = processAndScoreParts(this.rawParts)
    this.analyzed = true

    const safe = this.scoredParts.filter((c) => c.status === 'safe').length
    const monitor = this.scoredParts.filter((c) => c.status === 'monitor').length
    const reject = this.scoredParts.filter((c) => c.status === 'reject').length

    const avgRisk = this.scoredParts.reduce((sum, c) => sum + c.risk_score, 0) / this.scoredParts.length
    const missionHealth = Math.max(0, Math.min(100, Math.round(100 - avgRisk)))

    const topFlagged = this.scoredParts
      .filter((c) => c.status === 'reject')
      .sort((a, b) => b.risk_score - a.risk_score)[0] || null

    return {
      batch_id: batchId,
      safe,
      monitor,
      reject,
      mission_health: missionHealth,
      ml_meta: {
        algorithm: 'Isolation Forest Multivariate + Lot-Relative Robust z-Score',
        status: 'Optimal',
        confidence: 0.965,
      },
      top_flagged: topFlagged,
    }
  }

  getMissionStatus(batchId: number): MissionStatus {
    if (!this.analyzed || this.scoredParts.length === 0) {
      this.analyze(batchId)
    }

    const safe = this.scoredParts.filter((c) => c.status === 'safe').length
    const monitor = this.scoredParts.filter((c) => c.status === 'monitor').length
    const reject = this.scoredParts.filter((c) => c.status === 'reject').length

    const avgRisk = this.scoredParts.reduce((sum, c) => sum + c.risk_score, 0) / this.scoredParts.length
    const missionHealth = Math.max(0, Math.min(100, Math.round(100 - avgRisk)))

    const statusRank: Record<Status, number> = { safe: 0, monitor: 1, reject: 2, idle: -1 }

    const subsystems: SubsystemStatus[] = SUBSYSTEMS.map((s) => {
      const items = this.scoredParts.filter((c) => c.subsystem === s.key)
      if (items.length === 0) {
        return {
          key: s.key,
          name: s.name,
          position: s.pos,
          count: 0,
          status: 'idle',
          avg_risk: 0,
          top_component: null,
        }
      }
      const worst = items.reduce((prev, curr) =>
        statusRank[curr.status] > statusRank[prev.status] ? curr : prev
      )
      const topComp = items.reduce((prev, curr) => (curr.risk_score > prev.risk_score ? curr : prev))
      const subAvg = items.reduce((sum, c) => sum + c.risk_score, 0) / items.length

      return {
        key: s.key,
        name: s.name,
        position: s.pos,
        count: items.length,
        status: worst.status,
        avg_risk: Math.round(subAvg * 10) / 10,
        top_component: topComp.component_id,
      }
    })

    return {
      batch_id: batchId,
      mission_health: missionHealth,
      safe,
      monitor,
      reject,
      subsystems,
    }
  }

  listComponents(
    _batchId: number,
    opts: { status?: string; search?: string; limit?: number } = {}
  ): { total: number; components: ComponentOut[] } {
    if (!this.analyzed || this.scoredParts.length === 0) {
      this.analyze(this.currentBatchId)
    }

    let list = [...this.scoredParts]

    if (opts.status && opts.status !== 'all') {
      list = list.filter((c) => c.status.toLowerCase() === opts.status?.toLowerCase())
    }

    if (opts.search) {
      const q = opts.search.toLowerCase()
      list = list.filter(
        (c) =>
          c.component_id.toLowerCase().includes(q) ||
          c.subsystem.toLowerCase().includes(q) ||
          c.lot_id.toLowerCase().includes(q)
      )
    }

    const total = list.length
    if (opts.limit) {
      list = list.slice(0, opts.limit)
    }

    return { total, components: list }
  }

  getComponentDetail(_batchId: number, componentId: string): ComponentOut | null {
    if (!this.analyzed || this.scoredParts.length === 0) {
      this.analyze(this.currentBatchId)
    }
    return this.scoredParts.find((c) => c.component_id === componentId) || null
  }

  generateMarkdownReport(): string {
    if (!this.analyzed || this.scoredParts.length === 0) {
      this.analyze(this.currentBatchId)
    }

    const rejected = this.scoredParts.filter((c) => c.status === 'reject')
    const safe = this.scoredParts.filter((c) => c.status === 'safe')
    const monitor = this.scoredParts.filter((c) => c.status === 'monitor')

    return `# INDIAN SPACE RESEARCH ORGANISATION (ISRO)
## SPACEGUARD AI — FLIGHT READINESS CLEARANCE CERTIFICATE & SCREENING REPORT
**Standard:** MIL-STD-883 METHOD 1005 HTOL | **Ref:** ISRO-QA-HTOL-2026-SG1 | **Date:** ${new Date().toUTCString()}

---

### EXECUTIVE RELIABILITY SUMMARY
- **Total Components Screened:** ${this.scoredParts.length}
- **Flight Approved (SAFE):** ${safe.length} (${((safe.length / this.scoredParts.length) * 100).toFixed(1)}%)
- **Active Telemetry Monitoring (MONITOR):** ${monitor.length} (${((monitor.length / this.scoredParts.length) * 100).toFixed(1)}%)
- **Quarantined Silicon Defects (REJECT):** ${rejected.length} (${((rejected.length / this.scoredParts.length) * 100).toFixed(1)}%)

### QUARANTINED DEFECT LEDGER
| Part ID | Subsystem | Lot ID | 168h Value | Limit | Lot z-Score | Risk Score | Root Cause / Anomaly Finding |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${rejected
  .map(
    (c) =>
      `| **${c.component_id}** | ${c.subsystem} | ${c.lot_id} | ${c.v168.toFixed(2)} µA | ${c.limit_ua} µA | +${c.z168.toFixed(2)}σ | ${c.risk_score}/100 | ${c.reason} |`
  )
  .join('\n')}

---
**Lead Screening Engineer:** Dr. K. Ramanathan, Ph.D. (ISTRAC QA)
**Mission Reliability Director:** Dr. V. Somnath, Senior Scientist (ISRO Satellite Centre)
**Digital Signature:** SHA256-8F4C2E9A [VERIFIED]
`
  }
}

export const offlineISRO = new ClientISROEngine()
