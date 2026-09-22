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
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-transparent text-[#17212B] font-sans flex-1 min-h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D7E0EA] pb-3 bg-[#FFFFFF] p-3 md:p-4 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#005A9C] text-[#FFFFFF] font-mono font-bold text-xs uppercase tracking-wider shadow-sm">
              ANALYSIS ENGINE
            </span>
            <span className="text-xs font-mono text-[#475569] font-bold">
              BAYESIAN MULTI-FACTOR RISK SCORING &amp; QUALIFICATION GATES
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-bold text-[#0B1E36] tracking-wide mt-1">
            Risk Engine Dashboard &amp; Decision Synthesis
          </h1>
          <p className="text-xs text-[#475569] mt-0.5 max-w-3xl">
            Fuses absolute datasheet limits, lot-relative statistical deviations, Arrhenius temporal drift,
            and machine-learning defect evidence into calibrated 0–100 risk scores and qualification gates.
          </p>
        </div>

        {/* Global Risk Distribution Summary */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#168A5B]" />
            <span className="text-[#065F46] font-bold">{safeCount} SAFE</span>
          </div>
          <div className="bg-[#FFFBEB] border border-[#FDE68A] px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
            <span className="text-[#92400E] font-bold">{monitorCount} MONITOR</span>
          </div>
          <div className="bg-[#FEF2F2] border border-[#FECACA] px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
            <span className="text-[#991B1B] font-bold">{rejectCount} REJECT</span>
          </div>
        </div>
      </div>

      {/* Prominent Decision Pipeline Banner */}
      <div className="p-4 md:p-5 rounded-xl bg-[#FFFFFF] border border-[#D7E0EA] flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#334E68]">
            DECISION SYNTHESIS PIPELINE ARCHITECTURE
          </span>
          <span className="text-[10px] font-mono text-[#005A9C] bg-[#F8FAFD] border border-[#D7E0EA] px-2 py-0.5 rounded font-bold">
            MIL-STD-883 / ISRO QUALIFICATION
          </span>
        </div>

        {/* Pipeline Formula Flow Strip */}
        <div className="p-3 bg-[#F8FAFD] border border-[#D7E0EA] rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded bg-[#FFFFFF] border border-[#D7E0EA] text-[#0B1E36] font-bold shadow-xs">
              DATASHEET LIMITS (35%)
            </span>
            <span className="text-[#005A9C] font-bold">+</span>
            <span className="px-2.5 py-1 rounded bg-[#FFFFFF] border border-[#D7E0EA] text-[#0B1E36] font-bold shadow-xs">
              LOT BEHAVIOUR (25%)
            </span>
            <span className="text-[#005A9C] font-bold">+</span>
            <span className="px-2.5 py-1 rounded bg-[#FFFFFF] border border-[#D7E0EA] text-[#0B1E36] font-bold shadow-xs">
              PREDICTED DRIFT (25%)
            </span>
            <span className="text-[#005A9C] font-bold">+</span>
            <span className="px-2.5 py-1 rounded bg-[#FFFFFF] border border-[#D7E0EA] text-[#0B1E36] font-bold shadow-xs">
              ML DEFECT (15%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#005A9C] font-bold text-sm">&rarr;</span>
            <span className="px-3 py-1 rounded bg-[#005A9C] text-[#FFFFFF] font-bold shadow-xs">
              RISK ENGINE (0-100)
            </span>
            <span className="text-[#005A9C] font-bold text-sm">&rarr;</span>
            <span className="px-3 py-1 rounded bg-[#0B1E36] text-[#FFFFFF] font-bold shadow-xs">
              DECISION VERDICT
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono pt-1">
          {/* Step 1: Input Evidence */}
          <div className="p-3.5 rounded-lg bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col gap-2">
            <div className="text-[#005A9C] font-bold flex items-center gap-1.5">
              <span>①</span> EVIDENCE ACQUISITION
            </div>
            <ul className="text-[#475569] text-[11px] space-y-1 font-sans">
              <li>&bull; <b className="text-[#0B1E36]">Datasheet Limits:</b> 50 µA max reverse leakage ceiling</li>
              <li>&bull; <b className="text-[#0B1E36]">Lot Baseline:</b> Median / MAD z-score tracking</li>
              <li>&bull; <b className="text-[#0B1E36]">Degradation Drift:</b> Arrhenius polynomial slope (+96h)</li>
              <li>&bull; <b className="text-[#0B1E36]">Machine Learning:</b> Isolation Forest anomaly trees</li>
            </ul>
          </div>

          {/* Step 2: Calibrated Bayesian Scoring */}
          <div className="p-3.5 rounded-lg bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col gap-2">
            <div className="text-[#005A9C] font-bold flex items-center gap-1.5">
              <span>②</span> CALIBRATED RISK SCORING
            </div>
            <div className="text-xl font-bold text-[#0B1E36] font-mono">
              Risk = &sum; (w<sub>i</sub> &times; Factor<sub>i</sub>)
            </div>
            <p className="text-[#475569] text-[11px] font-sans">
              Weighted multi-evidence synthesis produces calibrated 0 to 100 mission risk index.
            </p>
          </div>

          {/* Step 3: Screening Verdict Gates */}
          <div className="p-3.5 rounded-lg bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col gap-2">
            <div className="text-[#0B1E36] font-bold flex items-center gap-1.5">
              <span>③</span> MIL-STD-883 VERDICT GATES
            </div>
            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] font-bold">
                SAFE (0-39): Flight Approved
              </div>
              <div className="px-2 py-0.5 rounded bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-bold">
                MONITOR (40-69): In-Situ Telemetry Polling
              </div>
              <div className="px-2 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] font-bold">
                REJECT (&ge;70 or Limit Breach): Quarantined
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Component Selector Bar */}
      <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#D7E0EA] flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[320px]">
          <span className="text-[#475569] font-mono text-[11px] font-bold">INSPECT COMPONENT:</span>
          <input
            type="text"
            placeholder="Search Component ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAFD] border border-[#D7E0EA] rounded-lg px-2.5 py-1 text-xs text-[#0B1E36] font-mono placeholder:text-[#81909D] focus:outline-none focus:border-[#005A9C]"
          />
        </div>

        <div className="flex items-center gap-1 font-mono text-[10px]">
          {(['ALL', 'reject', 'monitor', 'safe'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-2.5 py-1 rounded font-bold uppercase transition-all cursor-pointer ${
                statusFilter === filter
                  ? filter === 'reject'
                    ? 'bg-[#DC2626] text-white shadow-sm'
                    : filter === 'monitor'
                    ? 'bg-[#C58A00] text-white shadow-sm'
                    : filter === 'safe'
                    ? 'bg-[#168A5B] text-white shadow-sm'
                    : 'bg-[#005A9C] text-white shadow-sm'
                  : 'bg-[#F8FAFD] text-[#334E68] hover:text-[#0B1E36] border border-[#D7E0EA]'
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
          className="bg-[#F8FAFD] border border-[#D7E0EA] text-[#0B1E36] text-xs font-mono font-bold rounded-lg px-3 py-1.5 max-w-[260px] focus:outline-none focus:border-[#005A9C] cursor-pointer"
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
          <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 h-full shadow-sm ${
            targetPart.status === 'reject'
              ? 'bg-[#FEF2F2] border-[#FECACA]'
              : targetPart.status === 'monitor'
              ? 'bg-[#FFFBEB] border-[#FDE68A]'
              : 'bg-[#ECFDF5] border-[#A7F3D0]'
          }`}>
            <div>
              <div className="flex items-center justify-between border-b border-[#D7E0EA] pb-3">
                <span className="text-xs font-mono uppercase text-[#334E68] font-bold">
                  Qualification Decision
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase border ${
                  targetPart.status === 'reject'
                    ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                    : targetPart.status === 'monitor'
                    ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                    : 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                }`}>
                  {(targetPart.status || 'safe').toUpperCase()}
                </span>
              </div>

              <div className="py-6 flex flex-col items-center justify-center text-center">
                <div className="text-xs font-mono uppercase text-[#475569] font-bold mb-1">
                  CALIBRATED RISK SCORE
                </div>
                <div className={`text-6xl font-mono font-black tabular-nums tracking-tight ${
                  targetPart.status === 'reject'
                    ? 'text-[#DC2626]'
                    : targetPart.status === 'monitor'
                    ? 'text-[#D97706]'
                    : 'text-[#168A5B]'
                }`}>
                  {riskScore}
                  <span className="text-2xl font-light text-[#64748B]">/100</span>
                </div>
                <div className="text-xs font-mono text-[#475569] mt-2 font-medium">
                  Component: <b className="text-[#0B1E36]">{targetPart.component_id}</b> ({targetPart.lot_id})
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full overflow-hidden border border-[#CBD5E1]">
                <div
                  className={`h-full transition-all duration-500 ${
                    targetPart.status === 'reject'
                      ? 'bg-[#DC2626]'
                      : targetPart.status === 'monitor'
                      ? 'bg-[#D97706]'
                      : 'bg-[#168A5B]'
                  }`}
                  style={{ width: `${Math.min(100, riskScore)}%` }}
                />
              </div>
            </div>

            {/* Subsystem & Location Details */}
            <div className="pt-3 border-t border-[#D7E0EA] text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#475569]">Subsystem:</span>
                <span className="text-[#005A9C] font-bold">[{targetPart.subsystem}] {loc?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569]">Equipment Bay:</span>
                <span className="text-[#0B1E36] font-semibold">{loc?.bay || 'Main Payload Deck'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569]">Traditional Spec Verdict:</span>
                <span className={targetPart.v168 > limitVal ? 'text-[#DC2626] font-bold' : 'text-[#168A5B] font-bold'}>
                  {targetPart.v168 > limitVal ? 'FAIL SPEC' : 'PASS SPEC'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (Span 2): Multi-Factor Risk Breakdown Table */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-[#FFFFFF] border border-[#D7E0EA] flex flex-col gap-4 shadow-sm">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#334E68]">
              Risk Factor Evidence Breakdown
            </span>

            <div className="space-y-3">
              {factors.map((f, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col gap-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-[#005A9C] font-bold">{f.code}</span>
                      <span className="text-[#81909D]">&bull;</span>
                      <span className="text-[#475569] font-medium">Weight: {f.weight}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[#475569]">Score:</span>
                      <span className={`font-bold tabular-nums ${
                        f.severity === 'critical'
                          ? 'text-[#DC2626]'
                          : f.severity === 'warning'
                          ? 'text-[#D97706]'
                          : 'text-[#168A5B]'
                      }`}>
                        {f.score}/100
                      </span>
                      <span className="text-[#64748B] font-semibold">(&rarr; +{f.contribution} pts)</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-[#0B1E36] font-bold">{f.name}</span>
                    <span className="text-[#005A9C] font-bold">{f.raw}</span>
                  </div>

                  <p className="text-[11px] text-[#475569] font-sans">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>

            {/* AI Diagnostics & Failure Physics */}
            {targetPart.reason && (
              <div className="p-3 rounded-lg bg-[#F8FAFD] border border-[#D7E0EA] text-xs flex items-start gap-2">
                <span className="text-[#005A9C] font-mono font-bold uppercase whitespace-nowrap">
                  Physics Explanation:
                </span>
                <span className="text-[#17212B] font-sans font-medium">
                  {targetPart.reason}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-10 text-center text-xs text-[#475569] bg-[#FFFFFF] rounded-xl border border-[#D7E0EA]">
          No components available. Please ingest data to synthesize Bayesian risk evaluations.
        </div>
      )}
    </div>
  )
}
