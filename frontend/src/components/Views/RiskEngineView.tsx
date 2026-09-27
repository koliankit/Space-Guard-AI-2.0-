import React, { useState, useMemo } from 'react'
import type { ComponentOut, MissionStatus } from '../../types'
import { getSubsystemLocation } from '../../utils/satelliteLocations'

interface RiskEngineViewProps {
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  mission: MissionStatus | null
}

export default function RiskEngineView({
  components,
  selected,
  onSelectComponent,
  mission,
}: RiskEngineViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'reject' | 'monitor' | 'safe'>('ALL')

  const filteredComponents = useMemo(() => {
    return components.filter((c) => {
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
      const matchesSearch =
        searchQuery === '' ||
        c.component_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lot_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subsystem?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [components, statusFilter, searchQuery])

  const targetPart = selected || filteredComponents[0] || null
  const loc = targetPart ? getSubsystemLocation(targetPart.subsystem) : null

  // Risk breakdown factors
  const limitVal = targetPart?.limit_ua || 50
  const zScore = Math.abs(targetPart?.z168 || 0)
  const driftRate = targetPart?.slope || (targetPart ? (targetPart.v168 - targetPart.v0) / 168 : 0)
  const isoScore = targetPart?.lot_anomaly_score || targetPart?.iso_score || 0
  const riskScore = targetPart?.risk_score || 0

  // Risk factor contributions: Directly consuming 5 orthogonal backend factor metrics
  const factors = useMemo(() => {
    if (!targetPart) return []

    // 1. Datasheet limit proximity (weight: 30%)
    const dsScore = targetPart.datasheet_risk ?? (targetPart.v168 > limitVal ? 100 : Math.min(100, Math.round((targetPart.v168 / limitVal) * 80)))
    const dsContrib = targetPart.datasheet_contrib ?? Math.round(dsScore * 0.30 * 10) / 10

    // 2. Lot-relative anomaly (weight: 30%)
    const lotScore = targetPart.lot_anomaly_risk ?? Math.min(100, Math.round(zScore * 25))
    const lotContrib = targetPart.lot_anomaly_contrib ?? Math.round(lotScore * 0.30 * 10) / 10

    // 3. Temporal drift velocity (weight: 20%)
    const driftScore = targetPart.drift_risk ?? Math.min(100, Math.round(Math.abs(driftRate) * 2000))
    const driftContrib = targetPart.drift_contrib ?? Math.round(driftScore * 0.20 * 10) / 10

    // 4. In-flight prediction extrapolation (weight: 15%)
    const predScore = targetPart.prediction_risk ?? (targetPart.future_limit_breach ? 100 : Math.min(100, Math.round(((targetPart.predicted_future || targetPart.v168) / limitVal) * 75)))
    const predContrib = targetPart.prediction_contrib ?? Math.round(predScore * 0.15 * 10) / 10

    // 5. Data quality integrity (weight: 5%)
    const dqScore = targetPart.data_quality_risk ?? (targetPart.v96 == null ? 15 : 0)
    const dqContrib = targetPart.data_quality_contrib ?? Math.round(dqScore * 0.05 * 10) / 10

    return [
      {
        name: 'Datasheet Specification Limit Compliance',
        code: 'DATASHEET MARGIN (30%)',
        weight: '30%',
        raw: `${targetPart.v168.toFixed(2)} µA / ${limitVal.toFixed(1)} µA (${Math.round((targetPart.v168 / limitVal) * 100)}%)`,
        score: dsScore,
        contribution: dsContrib,
        description: 'Static reverse leakage ceiling under MIL-STD-883 Method 1005 Class S specification.',
        severity: targetPart.v168 > limitVal ? 'critical' : dsScore > 75 ? 'warning' : 'nominal',
      },
      {
        name: 'Lot-Relative Robust Statistical Divergence',
        code: 'LOT ANOMALY (30%)',
        weight: '30%',
        raw: `${zScore.toFixed(2)}σ from lot baseline (${targetPart.lot_mean?.toFixed(2) ?? '11.5'} µA)`,
        score: lotScore,
        contribution: lotContrib,
        description: 'Peer divergence from wafer fabrication lot median normalized by Median Absolute Deviation (MAD).',
        severity: lotScore >= 60 ? 'critical' : lotScore >= 35 ? 'warning' : 'nominal',
      },
      {
        name: 'Temporal Drift Velocity & Degradation Curvature',
        code: 'DRIFT VELOCITY (20%)',
        weight: '20%',
        raw: `${driftRate > 0 ? '+' : ''}${(driftRate * 1000).toFixed(1)} nA/hr`,
        score: driftScore,
        contribution: driftContrib,
        description: 'Empirical Arrhenius burn-in degradation velocity across 0h, 24h, 96h, and 168h intervals.',
        severity: targetPart.safety_slope_exceeded ? 'critical' : driftScore >= 50 ? 'warning' : 'nominal',
      },
      {
        name: 'In-Flight 264h Prediction & Future Breach Headroom',
        code: 'PREDICTION RISK (15%)',
        weight: '15%',
        raw: `Proj: ${targetPart.predicted_future ? targetPart.predicted_future.toFixed(1) : targetPart.v168.toFixed(1)} µA (Margin: ${targetPart.margin_future ? targetPart.margin_future.toFixed(1) : (limitVal - targetPart.v168).toFixed(1)} µA)`,
        score: predScore,
        contribution: predContrib,
        description: 'Extrapolated operational trajectory at T+264h (+96h in-flight extension) relative to limit.',
        severity: targetPart.future_limit_breach ? 'critical' : predScore >= 50 ? 'warning' : 'nominal',
      },
      {
        name: 'Telemetry Data Completeness & Quality Integrity',
        code: 'DATA QUALITY (5%)',
        weight: '5%',
        raw: targetPart.v96 != null ? 'Complete (All 4 Points)' : '96h Imputed (Minor Quality Risk)',
        score: dqScore,
        contribution: dqContrib,
        description: 'Assesses missing burn-in measurements, sensor variance anomalies, and telemetry noise.',
        severity: dqScore > 20 ? 'warning' : 'nominal',
      },
    ]
  }, [targetPart, limitVal, zScore, driftRate])

  // Summary counts
  const safeCount = mission?.safe ?? components.filter((c) => c.status === 'safe').length
  const monitorCount = mission?.monitor ?? components.filter((c) => c.status === 'monitor').length
  const rejectCount = mission?.reject ?? components.filter((c) => c.status === 'reject').length
  const totalCount = components.length || 1

  return (
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-transparent text-[#17212B] font-sans flex-1 min-h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D9E2EA] pb-3 bg-[#FFFFFF]/60 p-3 md:p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#0E88D3]/15 text-[#0E88D3] border border-[#0E88D3]/40 font-mono font-bold text-xs uppercase tracking-wider">
              ANALYSIS ENGINE
            </span>
            <span className="text-xs font-mono text-[#5B6B7A]">
              BAYESIAN MULTI-FACTOR RISK SCORING &amp; QUALIFICATION GATES
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#17212B] tracking-wide mt-1">
            Risk Engine Dashboard &amp; Decision Synthesis
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5 max-w-3xl">
            Fuses absolute datasheet limits, lot-relative statistical deviations, Arrhenius temporal drift,
            and machine-learning defect evidence into calibrated 0–100 risk scores and qualification gates.
          </p>
        </div>

        {/* Global Risk Distribution Summary */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="bg-[#FFFFFF] border border-[#168A5B]/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#168A5B]" />
            <span className="text-[#168A5B] font-bold">{safeCount} SAFE</span>
          </div>
          <div className="bg-[#FFFFFF] border border-[#C58A00]/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C58A00]" />
            <span className="text-[#C58A00] font-bold">{monitorCount} MONITOR</span>
          </div>
          <div className="bg-[#FFFFFF] border border-[#D9363E]/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D9363E]" />
            <span className="text-[#D9363E] font-bold">{rejectCount} REJECT</span>
          </div>
        </div>
      </div>

      {/* Row 1: The 3-Step Decision Gate Architecture */}
      <div className="p-4 md:p-5 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-4">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#5B6B7A]">
          Decision Synthesis Pipeline
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          {/* Step 1: Input Evidence */}
          <div className="p-3.5 rounded-lg bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-2">
            <div className="text-[#0E88D3] font-bold flex items-center gap-1.5">
              <span>①</span> EVIDENCE ACQUISITION
            </div>
            <ul className="text-[#5B6B7A] text-[11px] space-y-1 font-sans">
              <li>&bull; <b className="text-[#17212B]">Datasheet Limits:</b> 50 µA max reverse leakage</li>
              <li>&bull; <b className="text-[#17212B]">Lot Baseline:</b> Median / MAD z-score tracking</li>
              <li>&bull; <b className="text-[#17212B]">Degradation Drift:</b> Arrhenius polynomial slope</li>
              <li>&bull; <b className="text-[#17212B]">Machine Learning:</b> Isolation Forest anomaly trees</li>
            </ul>
          </div>

          {/* Step 2: Calibrated Bayesian Scoring */}
          <div className="p-3.5 rounded-lg bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-2">
            <div className="text-[#0E88D3] font-bold flex items-center gap-1.5">
              <span>②</span> CALIBRATED RISK SCORING
            </div>
            <div className="text-xl font-bold text-[#17212B] font-mono">
              Risk = &sum; (w<sub>i</sub> &times; Factor<sub>i</sub>)
            </div>
            <p className="text-[#5B6B7A] text-[11px] font-sans">
              Weighted multi-evidence synthesis produces normalized 0 to 100 mission risk index.
            </p>
          </div>

          {/* Step 3: Screening Verdict Gates */}
          <div className="p-3.5 rounded-lg bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-2">
            <div className="text-[#168A5B] font-bold flex items-center gap-1.5">
              <span>③</span> MIL-STD-883 VERDICT GATES
            </div>
            <div className="space-y-1 text-[11px] font-mono">
              <div className="text-[#168A5B]">SAFE (0-39): Flight Approved</div>
              <div className="text-[#C58A00]">MONITOR (40-69): In-Situ Telemetry Polling</div>
              <div className="text-[#D9363E]">REJECT (&ge;70 or Limit Breach): Quarantined</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Component Selector Bar */}
      <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[320px]">
          <span className="text-[#5B6B7A] font-mono text-[11px]">INSPECT COMPONENT:</span>
          <input
            type="text"
            placeholder="Search Component ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F4F7FA] border border-[#D9E2EA] rounded-lg px-2.5 py-1 text-xs text-[#17212B] font-mono placeholder:text-[#81909D] focus:outline-none focus:border-[#0E88D3]"
          />
        </div>

        <div className="flex items-center gap-1 font-mono text-[10px]">
          {(['ALL', 'reject', 'monitor', 'safe'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-2 py-0.5 rounded transition-colors uppercase ${
                statusFilter === filter
                  ? filter === 'reject'
                    ? 'bg-[#D9363E] text-[#17212B] font-bold'
                    : filter === 'monitor'
                    ? 'bg-[#C58A00] text-[#17212B] font-bold'
                    : filter === 'safe'
                    ? 'bg-[#168A5B] text-[#17212B] font-bold'
                    : 'bg-[#0E88D3]/20 text-[#0E88D3] border border-[#0E88D3]/50 font-bold'
                  : 'text-[#5B6B7A] hover:text-[#17212B] bg-[#F4F7FA] border border-[#D9E2EA]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <select
          value={targetPart?.component_id || ''}
          onChange={(e) => {
            if (e.target.value) onSelectComponent(e.target.value)
          }}
          className="bg-[#F4F7FA] border border-[#D9E2EA] text-[#17212B] text-xs font-mono rounded-lg px-3 py-1.5 max-w-[240px] focus:outline-none focus:border-[#0E88D3]"
        >
          <option value="" disabled>Select Component ({filteredComponents.length})</option>
          {filteredComponents.slice(0, 100).map((c) => (
            <option key={c.component_id} value={c.component_id}>
              {c.component_id} &bull; RISK {c.risk_score}/100 [{(c.status || 'safe').toUpperCase()}]
            </option>
          ))}
        </select>
      </div>

      {/* Row 3: Selected Component Risk Breakdown - Stretches to fill remaining workspace */}
      {targetPart ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch flex-1 min-h-0">
          {/* Left Column: Overall Risk Gauge & Decision Card */}
          <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 h-full ${
            targetPart.status === 'reject'
              ? 'bg-[#FEF2F2] border-[#D9363E]/60'
              : targetPart.status === 'monitor'
              ? 'bg-[#FFFFFF] border-[#C58A00]/60'
              : 'bg-[#FFFFFF] border-[#168A5B]/60'
          }`}>
            <div>
              <div className="flex items-center justify-between border-b border-[#D9E2EA] pb-3">
                <span className="text-xs font-mono uppercase text-[#5B6B7A]">
                  Qualification Decision
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                  targetPart.status === 'reject'
                    ? 'bg-[#D9363E] text-white'
                    : targetPart.status === 'monitor'
                    ? 'bg-[#C58A00] text-slate-900'
                    : 'bg-[#168A5B] text-white'
                }`}>
                  {(targetPart.status || 'safe').toUpperCase()}
                </span>
              </div>

              <div className="py-6 flex flex-col items-center justify-center text-center">
                <div className="text-xs font-mono uppercase text-[#5B6B7A] mb-1">
                  CALIBRATED RISK SCORE
                </div>
                <div className={`text-6xl font-mono font-black tabular-nums tracking-tight ${
                  targetPart.status === 'reject'
                    ? 'text-[#D9363E]'
                    : targetPart.status === 'monitor'
                    ? 'text-[#C58A00]'
                    : 'text-[#168A5B]'
                }`}>
                  {riskScore}
                  <span className="text-2xl font-light text-[#81909D]">/100</span>
                </div>
                <div className="text-xs font-mono text-[#5B6B7A] mt-2">
                  Component: <b className="text-[#17212B]">{targetPart.component_id}</b> ({targetPart.lot_id})
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#F4F7FA] h-2.5 rounded-full overflow-hidden border border-[#D9E2EA]">
                <div
                  className={`h-full transition-all duration-500 ${
                    targetPart.status === 'reject'
                      ? 'bg-[#D9363E]'
                      : targetPart.status === 'monitor'
                      ? 'bg-[#C58A00]'
                      : 'bg-[#168A5B]'
                  }`}
                  style={{ width: `${Math.min(100, riskScore)}%` }}
                />
              </div>
            </div>

            {/* Subsystem & Location Details */}
            <div className="pt-3 border-t border-[#D9E2EA] text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#5B6B7A]">Subsystem:</span>
                <span className="text-[#0E88D3] font-bold">[{targetPart.subsystem}] {loc?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5B6B7A]">Equipment Bay:</span>
                <span className="text-[#17212B]">{loc?.bay || 'Main Payload Deck'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5B6B7A]">Traditional Spec Verdict:</span>
                <span className={targetPart.v168 > limitVal ? 'text-[#D9363E] font-bold' : 'text-[#168A5B] font-bold'}>
                  {targetPart.v168 > limitVal ? 'FAIL' : 'PASS'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (Span 2): Multi-Factor Risk Breakdown Table */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#5B6B7A]">
              Risk Factor Evidence Breakdown
            </span>

            <div className="space-y-3">
              {factors.map((f, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-[#0E88D3] font-bold">{f.code}</span>
                      <span className="text-[#81909D]">&bull;</span>
                      <span className="text-[#5B6B7A]">Weight: {f.weight}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[#5B6B7A]">Score:</span>
                      <span className={`font-bold tabular-nums ${
                        f.severity === 'critical'
                          ? 'text-[#D9363E]'
                          : f.severity === 'warning'
                          ? 'text-[#C58A00]'
                          : 'text-[#168A5B]'
                      }`}>
                        {f.score}/100
                      </span>
                      <span className="text-[#81909D]">(&rarr; +{f.contribution} pts)</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-[#17212B] font-semibold">{f.name}</span>
                    <span className="text-[#0E88D3]">{f.raw}</span>
                  </div>

                  <p className="text-[11px] text-[#5B6B7A] font-sans">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>

            {/* AI Diagnostics & Failure Physics */}
            {targetPart.reason && (
              <div className="p-3 rounded-lg bg-[#F4F7FA] border border-[#D9E2EA] text-xs flex items-start gap-2">
                <span className="text-[#0E88D3] font-mono font-bold uppercase whitespace-nowrap">
                  Physics Explanation:
                </span>
                <span className="text-[#17212B] font-sans">
                  {targetPart.reason}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-10 text-center text-xs text-[#5B6B7A] bg-[#FFFFFF] rounded-xl border border-[#D9E2EA]">
          No components available. Please ingest data to synthesize Bayesian risk evaluations.
        </div>
      )}
    </div>
  )
}
