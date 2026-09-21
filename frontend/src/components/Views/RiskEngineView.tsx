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

  // Risk factor contributions
  const factors = useMemo(() => {
    if (!targetPart) return []

    // 1. Datasheet limit proximity (weight: 35%)
    const limitRatio = targetPart.v168 / limitVal
    const limitScore = Math.min(100, Math.round(limitRatio * 100))
    const limitContrib = Math.round(limitScore * 0.35)

    // 2. Lot-relative anomaly (weight: 25%)
    const lotScore = Math.min(100, Math.round((zScore / 3.0) * 100))
    const lotContrib = Math.round(lotScore * 0.25)

    // 3. Temporal drift velocity (weight: 25%)
    const driftScore = Math.min(100, Math.round((Math.abs(driftRate) / 0.15) * 100))
    const driftContrib = Math.round(driftScore * 0.25)

    // 4. ML / Isolation Forest scoring (weight: 15%)
    const mlScore = Math.min(100, Math.round(isoScore))
    const mlContrib = Math.round(mlScore * 0.15)

    return [
      {
        name: 'Datasheet Specification Limit Analysis',
        code: 'PARAMETRIC LIMIT MARGIN',
        weight: '35%',
        raw: `${targetPart.v168.toFixed(2)} µA / ${limitVal.toFixed(1)} µA (${Math.round(limitRatio * 100)}%)`,
        score: limitScore,
        contribution: limitContrib,
        description: 'Proximity of 168h current leakage to absolute MIL-STD-883 flight ceiling.',
        severity: limitRatio > 0.9 ? 'critical' : limitRatio > 0.75 ? 'warning' : 'nominal',
      },
      {
        name: 'Lot-Relative Robust Statistical Divergence',
        code: 'MEDIAN / MAD NORMALIZATION',
        weight: '25%',
        raw: `${zScore.toFixed(2)}σ from lot baseline (${targetPart.lot_mean?.toFixed(2) ?? '11.5'} µA)`,
        score: lotScore,
        contribution: lotContrib,
        description: 'Deviation from wafer lot manufacturing median normalized by median absolute deviation.',
        severity: zScore > 2.5 ? 'critical' : zScore > 1.8 ? 'warning' : 'nominal',
      },
      {
        name: 'Temporal Drift Velocity & 264h Extrapolation',
        code: 'ARRHENIUS ACCELERATION',
        weight: '25%',
        raw: `${driftRate > 0 ? '+' : ''}${driftRate.toFixed(4)} µA/hr (Proj: ${targetPart.predicted_future ? targetPart.predicted_future.toFixed(1) : '--'} µA)`,
        score: driftScore,
        contribution: driftContrib,
        description: 'Empirical polynomial curvature and projected in-flight reading at T+264h.',
        severity: targetPart.future_limit_breach ? 'critical' : driftScore > 60 ? 'warning' : 'nominal',
      },
      {
        name: 'High-Dimensional ML Defect Evidence',
        code: 'ISOLATION FOREST & XGBOOST',
        weight: '15%',
        raw: `${isoScore.toFixed(1)}/100 Anomaly Confidence`,
        score: mlScore,
        contribution: mlContrib,
        description: 'Multi-feature isolation tree ensemble detecting non-linear parametric defect clusters.',
        severity: mlScore > 70 ? 'critical' : mlScore > 40 ? 'warning' : 'nominal',
      },
    ]
  }, [targetPart, limitVal, zScore, driftRate, isoScore])

  // Summary counts
  const safeCount = mission?.safe ?? components.filter((c) => c.status === 'safe').length
  const monitorCount = mission?.monitor ?? components.filter((c) => c.status === 'monitor').length
  const rejectCount = mission?.reject ?? components.filter((c) => c.status === 'reject').length
  const totalCount = components.length || 1

  return (
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-[#07111C] text-[#F1F5F9] font-sans flex-1 min-h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1D3A52] pb-3 bg-[#0B1928]/60 p-3 md:p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#0E88D3]/15 text-[#0E88D3] border border-[#0E88D3]/40 font-mono font-bold text-xs uppercase tracking-wider">
              ANALYSIS ENGINE
            </span>
            <span className="text-xs font-mono text-[#9AAFC0]">
              BAYESIAN MULTI-FACTOR RISK SCORING &amp; QUALIFICATION GATES
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#F1F5F9] tracking-wide mt-1">
            Risk Engine Dashboard &amp; Decision Synthesis
          </h1>
          <p className="text-xs text-[#9AAFC0] mt-0.5 max-w-3xl">
            Fuses absolute datasheet limits, lot-relative statistical deviations, Arrhenius temporal drift,
            and machine-learning defect evidence into calibrated 0–100 risk scores and qualification gates.
          </p>
        </div>

        {/* Global Risk Distribution Summary */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="bg-[#102337] border border-[#22A06B]/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22A06B]" />
            <span className="text-[#22A06B] font-bold">{safeCount} SAFE</span>
          </div>
          <div className="bg-[#102337] border border-[#F2B84B]/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F2B84B]" />
            <span className="text-[#F2B84B] font-bold">{monitorCount} MONITOR</span>
          </div>
          <div className="bg-[#102337] border border-[#E5484D]/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E5484D]" />
            <span className="text-[#E5484D] font-bold">{rejectCount} REJECT</span>
          </div>
        </div>
      </div>

      {/* Row 1: The 3-Step Decision Gate Architecture */}
      <div className="p-4 md:p-5 rounded-xl bg-[#102337] border border-[#1D3A52] flex flex-col gap-4">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#9AAFC0]">
          Decision Synthesis Pipeline
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          {/* Step 1: Input Evidence */}
          <div className="p-3.5 rounded-lg bg-[#0B1928] border border-[#1D3A52] flex flex-col gap-2">
            <div className="text-[#0E88D3] font-bold flex items-center gap-1.5">
              <span>①</span> EVIDENCE ACQUISITION
            </div>
            <ul className="text-[#9AAFC0] text-[11px] space-y-1 font-sans">
              <li>&bull; <b className="text-[#F1F5F9]">Datasheet Limits:</b> 50 µA max reverse leakage</li>
              <li>&bull; <b className="text-[#F1F5F9]">Lot Baseline:</b> Median / MAD z-score tracking</li>
              <li>&bull; <b className="text-[#F1F5F9]">Degradation Drift:</b> Arrhenius polynomial slope</li>
              <li>&bull; <b className="text-[#F1F5F9]">Machine Learning:</b> Isolation Forest anomaly trees</li>
            </ul>
          </div>

          {/* Step 2: Calibrated Bayesian Scoring */}
          <div className="p-3.5 rounded-lg bg-[#0B1928] border border-[#1D3A52] flex flex-col gap-2">
            <div className="text-[#0E88D3] font-bold flex items-center gap-1.5">
              <span>②</span> CALIBRATED RISK SCORING
            </div>
            <div className="text-xl font-bold text-[#F1F5F9] font-mono">
              Risk = &sum; (w<sub>i</sub> &times; Factor<sub>i</sub>)
            </div>
            <p className="text-[#9AAFC0] text-[11px] font-sans">
              Weighted multi-evidence synthesis produces normalized 0 to 100 mission risk index.
            </p>
          </div>

          {/* Step 3: Screening Verdict Gates */}
          <div className="p-3.5 rounded-lg bg-[#0B1928] border border-[#1D3A52] flex flex-col gap-2">
            <div className="text-[#22A06B] font-bold flex items-center gap-1.5">
              <span>③</span> MIL-STD-883 VERDICT GATES
            </div>
            <div className="space-y-1 text-[11px] font-mono">
              <div className="text-[#22A06B]">SAFE (0-39): Flight Approved</div>
              <div className="text-[#F2B84B]">MONITOR (40-69): In-Situ Telemetry Polling</div>
              <div className="text-[#E5484D]">REJECT (&ge;70 or Limit Breach): Quarantined</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Component Selector Bar */}
      <div className="p-3 rounded-xl bg-[#102337] border border-[#1D3A52] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[320px]">
          <span className="text-[#9AAFC0] font-mono text-[11px]">INSPECT COMPONENT:</span>
          <input
            type="text"
            placeholder="Search Component ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#07111C] border border-[#1D3A52] rounded-lg px-2.5 py-1 text-xs text-[#F1F5F9] font-mono placeholder:text-[#6F8495] focus:outline-none focus:border-[#0E88D3]"
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
                    ? 'bg-[#E5484D] text-[#F1F5F9] font-bold'
                    : filter === 'monitor'
                    ? 'bg-[#F2B84B] text-[#F1F5F9] font-bold'
                    : filter === 'safe'
                    ? 'bg-[#22A06B] text-[#F1F5F9] font-bold'
                    : 'bg-[#0E88D3]/20 text-[#0E88D3] border border-[#0E88D3]/50 font-bold'
                  : 'text-[#9AAFC0] hover:text-[#F1F5F9] bg-[#07111C] border border-[#1D3A52]'
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
          className="bg-[#07111C] border border-[#1D3A52] text-[#F1F5F9] text-xs font-mono rounded-lg px-3 py-1.5 max-w-[240px] focus:outline-none focus:border-[#0E88D3]"
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
              ? 'bg-[#24141E] border-[#E5484D]/60'
              : targetPart.status === 'monitor'
              ? 'bg-[#102337] border-[#F2B84B]/60'
              : 'bg-[#102337] border-[#22A06B]/60'
          }`}>
            <div>
              <div className="flex items-center justify-between border-b border-[#1D3A52] pb-3">
                <span className="text-xs font-mono uppercase text-[#9AAFC0]">
                  Qualification Decision
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                  targetPart.status === 'reject'
                    ? 'bg-[#E5484D] text-white'
                    : targetPart.status === 'monitor'
                    ? 'bg-[#F2B84B] text-slate-900'
                    : 'bg-[#22A06B] text-white'
                }`}>
                  {(targetPart.status || 'safe').toUpperCase()}
                </span>
              </div>

              <div className="py-6 flex flex-col items-center justify-center text-center">
                <div className="text-xs font-mono uppercase text-[#9AAFC0] mb-1">
                  CALIBRATED RISK SCORE
                </div>
                <div className={`text-6xl font-mono font-black tabular-nums tracking-tight ${
                  targetPart.status === 'reject'
                    ? 'text-[#E5484D]'
                    : targetPart.status === 'monitor'
                    ? 'text-[#F2B84B]'
                    : 'text-[#22A06B]'
                }`}>
                  {riskScore}
                  <span className="text-2xl font-light text-[#6F8495]">/100</span>
                </div>
                <div className="text-xs font-mono text-[#9AAFC0] mt-2">
                  Component: <b className="text-[#F1F5F9]">{targetPart.component_id}</b> ({targetPart.lot_id})
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#07111C] h-2.5 rounded-full overflow-hidden border border-[#1D3A52]">
                <div
                  className={`h-full transition-all duration-500 ${
                    targetPart.status === 'reject'
                      ? 'bg-[#E5484D]'
                      : targetPart.status === 'monitor'
                      ? 'bg-[#F2B84B]'
                      : 'bg-[#22A06B]'
                  }`}
                  style={{ width: `${Math.min(100, riskScore)}%` }}
                />
              </div>
            </div>

            {/* Subsystem & Location Details */}
            <div className="pt-3 border-t border-[#1D3A52] text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#9AAFC0]">Subsystem:</span>
                <span className="text-[#0E88D3] font-bold">[{targetPart.subsystem}] {loc?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AAFC0]">Equipment Bay:</span>
                <span className="text-[#F1F5F9]">{loc?.bay || 'Main Payload Deck'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AAFC0]">Traditional Spec Verdict:</span>
                <span className={targetPart.v168 > limitVal ? 'text-[#E5484D] font-bold' : 'text-[#22A06B] font-bold'}>
                  {targetPart.v168 > limitVal ? 'FAIL' : 'PASS'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (Span 2): Multi-Factor Risk Breakdown Table */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-[#102337] border border-[#1D3A52] flex flex-col gap-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#9AAFC0]">
              Risk Factor Evidence Breakdown
            </span>

            <div className="space-y-3">
              {factors.map((f, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-[#0B1928] border border-[#1D3A52] flex flex-col gap-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-[#0E88D3] font-bold">{f.code}</span>
                      <span className="text-[#6F8495]">&bull;</span>
                      <span className="text-[#9AAFC0]">Weight: {f.weight}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[#9AAFC0]">Score:</span>
                      <span className={`font-bold tabular-nums ${
                        f.severity === 'critical'
                          ? 'text-[#E5484D]'
                          : f.severity === 'warning'
                          ? 'text-[#F2B84B]'
                          : 'text-[#22A06B]'
                      }`}>
                        {f.score}/100
                      </span>
                      <span className="text-[#6F8495]">(&rarr; +{f.contribution} pts)</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-[#F1F5F9] font-semibold">{f.name}</span>
                    <span className="text-[#0E88D3]">{f.raw}</span>
                  </div>

                  <p className="text-[11px] text-[#9AAFC0] font-sans">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>

            {/* AI Diagnostics & Failure Physics */}
            {targetPart.reason && (
              <div className="p-3 rounded-lg bg-[#07111C] border border-[#1D3A52] text-xs flex items-start gap-2">
                <span className="text-[#0E88D3] font-mono font-bold uppercase whitespace-nowrap">
                  Physics Explanation:
                </span>
                <span className="text-[#F1F5F9] font-sans">
                  {targetPart.reason}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-10 text-center text-xs text-[#9AAFC0] bg-[#102337] rounded-xl border border-[#1D3A52]">
          No components available. Please ingest data to synthesize Bayesian risk evaluations.
        </div>
      )}
    </div>
  )
}
