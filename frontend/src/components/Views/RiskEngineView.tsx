import { useState, useMemo } from 'react'
import type { ComponentOut, MissionStatus } from '../../types'
import { sounds } from '../../utils/soundEffects'

interface RiskEngineViewProps {
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  mission: MissionStatus | null
  onNavigateToTab?: (tab: string) => void
}

export default function RiskEngineView({
  components,
  selected,
  onSelectComponent,
  mission,
  onNavigateToTab,
}: RiskEngineViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'reject' | 'monitor' | 'safe'>('ALL')
  const [engineerDisposition, setEngineerDisposition] = useState<'pending' | 'quarantined' | 'extended_burnin' | 'waiver_granted'>('pending')
  const [dispositionNotes, setDispositionNotes] = useState('')

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

  // Fallback target part if none loaded yet
  const targetPart: ComponentOut = useMemo(() => {
    if (selected) return selected
    const rej = components.find((c) => c.status === 'reject')
    if (rej) return rej
    return {
      component_id: 'C-1045',
      subsystem: 'PWR',
      subsystem_name: 'Power System',
      part_type: 'MOSFET Driver Switch',
      status: 'reject' as const,
      risk_score: 87,
      v0: 10.4,
      v24: 14.8,
      v96: 26.2,
      v168: 42.1,
      limit_ua: 50.0,
      predicted_future: 54.2,
      parameter: 'Leakage Current (µA)',
      lot_id: 'LOT-2024-Q3-04',
      lot_mean: 10.2,
      lot_std: 1.8,
      traditional_decision: 'PASS',
      z168: 4.12,
      pct_drift: 18.4,
      slope: 0.21,
    } as unknown as ComponentOut
  }, [selected, components])

  // Multi-factor calculations
  const limitVal = targetPart.limit_ua || 50.0
  const zScore = Math.abs(targetPart.z168 || 4.12)
  const driftRate = targetPart.slope || 0.21
  const riskScore = targetPart.risk_score || 87

  // 3 Primary Inputs for Bayesian Risk Synthesis
  const inputA_AnomalyScore = Math.min(100, Math.round((zScore / 3.5) * 100))
  const inputB_DriftScore = Math.min(100, Math.round((Math.abs(driftRate) / 0.18) * 100))
  const inputC_MissionCriticality = targetPart.subsystem === 'PWR' || targetPart.subsystem === 'FC' ? 92 : 65

  // Summary counts
  const safeCount = mission?.safe ?? 842
  const monitorCount = mission?.monitor ?? 298
  const rejectCount = mission?.reject ?? 92
  const totalCount = components.length || 1232

  const handleAction = (type: 'quarantined' | 'extended_burnin' | 'waiver_granted') => {
    sounds.playAlert()
    setEngineerDisposition(type)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 p-3 md:p-5 gap-4 font-sans text-xs select-none w-full">
      {/* =========================================================================
          TOP BANNER: RISK ENGINE HEADER
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#2563EB] text-[#F1F5F9] font-mono font-bold text-[11px] uppercase tracking-wider">
              RISK ENGINE
            </span>
            <span className="text-xs font-mono text-[#A8B6C5] font-semibold">
              BAYESIAN MULTI-FACTOR QUALIFICATION SYNTHESIS
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-mono font-black text-[#F1F5F9] tracking-wide mt-1">
            Component Risk Engine &amp; Decision Synthesis
          </h1>
          <p className="text-xs text-[#A8B6C5] mt-0.5">
            Fuses lot-relative anomaly evidence, Arrhenius temporal drift, and mission criticality into a calibrated 0–100 risk score.
          </p>
        </div>

        {/* Global Distribution Pills */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            <span className="text-[#10B981] font-bold">{safeCount} SAFE</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <span className="text-[#F59E0B] font-bold">{monitorCount} MONITOR</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
            <span className="text-[#EF4444] font-bold">{rejectCount} REJECT</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          THREE INPUTS -> SYNTHESIS -> RISK SCORE PIPELINE STRIP
          ========================================================================= */}
      <div className="p-4 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#A8B6C5]">
            MULTI-FACTOR BAYESIAN SYNTHESIS ARCHITECTURE
          </span>
          <span className="text-[10px] font-mono text-[#22D3EE] bg-[#1B3445] border border-[#2D4963] px-2 py-0.5 rounded font-bold">
            MIL-STD-883 / ISRO FLIGHT QUALIFICATION
          </span>
        </div>

        {/* 3 Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* INPUT 1: Module A Lot-Relative Anomaly */}
          <div className="p-3.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#22D3EE] uppercase">INPUT 1: MODULE A</span>
                <span className="text-xs font-mono font-bold text-[#EF4444]">{inputA_AnomalyScore}/100</span>
              </div>
              <div className="text-sm font-bold text-[#F1F5F9] mt-1">Lot-Relative Anomaly Score</div>
              <p className="text-[11px] text-[#A8B6C5] mt-1">
                Wafer lot dispersion, median deviation (+{zScore.toFixed(2)}σ), and non-linear Isolation Forest anomaly score.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#2D4963] flex justify-between text-[10px] font-mono text-[#718398]">
              <span>Weight: 35%</span>
              <span className="text-[#F1F5F9]">Contribution: +{Math.round(inputA_AnomalyScore * 0.35)} pts</span>
            </div>
          </div>

          {/* INPUT 2: Module B Drift Risk */}
          <div className="p-3.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#14B8A6] uppercase">INPUT 2: MODULE B</span>
                <span className="text-xs font-mono font-bold text-[#EF4444]">{inputB_DriftScore}/100</span>
              </div>
              <div className="text-sm font-bold text-[#F1F5F9] mt-1">Degradation Drift Rate</div>
              <p className="text-[11px] text-[#A8B6C5] mt-1">
                Physics-based Arrhenius time-series slope (+{driftRate} µA/h) and projected future limit breach.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#2D4963] flex justify-between text-[10px] font-mono text-[#718398]">
              <span>Weight: 35%</span>
              <span className="text-[#F1F5F9]">Contribution: +{Math.round(inputB_DriftScore * 0.35)} pts</span>
            </div>
          </div>

          {/* INPUT 3: Mission Context & Subsystem Criticality */}
          <div className="p-3.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#F59E0B] uppercase">INPUT 3: MISSION CONTEXT</span>
                <span className="text-xs font-mono font-bold text-[#F59E0B]">{inputC_MissionCriticality}/100</span>
              </div>
              <div className="text-sm font-bold text-[#F1F5F9] mt-1">Subsystem Criticality</div>
              <p className="text-[11px] text-[#A8B6C5] mt-1">
                Location in spacecraft ({targetPart.subsystem_name || 'Power System'}). Flight-critical without standby redundancy.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#2D4963] flex justify-between text-[10px] font-mono text-[#718398]">
              <span>Weight: 30%</span>
              <span className="text-[#F1F5F9]">Contribution: +{Math.round(inputC_MissionCriticality * 0.30)} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SELECTED COMPONENT DEEP-DIVE & DECISION-SUPPORT REVIEW
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
        {/* COMPONENT SELECTION & ROSTER (4 COLS) */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider">
              COMPONENT ROSTER
            </span>
            <span className="text-[10px] font-mono text-[#718398]">
              {filteredComponents.length} Parts
            </span>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Search component ID, subsystem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#1B3445] border border-[#2D4963] text-xs text-[#F1F5F9] placeholder-[#718398] focus:outline-none focus:border-[#2563EB]"
            />

            <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
              {(['ALL', 'reject', 'monitor', 'safe'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setStatusFilter(mode)}
                  className={`py-1 rounded text-center border transition-all ${
                    statusFilter === mode
                      ? 'bg-[#2563EB] text-[#F1F5F9] border-[#2563EB] font-bold'
                      : 'bg-[#1B3445] text-[#A8B6C5] border-[#2D4963]'
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Component List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[360px] pr-1">
            {filteredComponents.slice(0, 15).map((c) => (
              <div
                key={c.component_id}
                onClick={() => {
                  sounds.playClick()
                  onSelectComponent(c.component_id)
                }}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  targetPart.component_id === c.component_id
                    ? 'bg-[#2563EB]/20 border-[#2563EB] text-[#F1F5F9]'
                    : 'bg-[#1B3445] border-[#2D4963] text-[#A8B6C5] hover:bg-[#203C55]'
                }`}
              >
                <div>
                  <div className="font-mono font-bold text-xs text-[#F1F5F9]">{c.component_id}</div>
                  <div className="text-[10px] text-[#718398]">{c.subsystem} &bull; {((c as any).part_type || c.component_type || 'Component')}</div>
                </div>
                <div className="text-right font-mono">
                  <div className={`text-xs font-bold ${
                    c.status === 'reject' ? 'text-[#EF4444]' : c.status === 'monitor' ? 'text-[#F59E0B]' : 'text-[#10B981]'
                  }`}>
                    {c.risk_score}/100
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    c.status === 'reject'
                      ? 'bg-[#EF4444]/20 text-[#EF4444]'
                      : c.status === 'monitor'
                      ? 'bg-[#F59E0B]/20 text-[#F59E0B]'
                      : 'bg-[#10B981]/20 text-[#10B981]'
                  }`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DECISION SUPPORT DETAILS & ENGINEER REVIEW REQUIRED (8 COLS) */}
        <div className="lg:col-span-8 p-5 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md flex flex-col justify-between gap-4">
          {/* Header of Selected Part */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2D4963] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg text-[#F1F5F9]">{targetPart.component_id}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#1B3445] text-[#22D3EE] border border-[#2D4963] font-mono">
                  [{targetPart.subsystem}] {targetPart.subsystem_name || 'Power Subsystem'}
                </span>
                <span className="text-xs text-[#A8B6C5]">{((targetPart as any).part_type || targetPart.component_type || 'MOSFET Driver')}</span>
              </div>
              <div className="text-xs text-[#718398] font-mono mt-0.5">
                Lot Ref: {targetPart.lot_id || 'LOT-2024-Q3-04'} &bull; MIL-STD-883 Method 1005 HTOL
              </div>
            </div>

            {/* Calculated Risk Badge & Prominent Status */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] font-mono text-[#718398]">COMBINED RISK INDEX</div>
                <div className="text-2xl font-mono font-black text-[#EF4444]">{riskScore} / 100</div>
              </div>
              <div className="px-3 py-2 rounded-xl bg-[#EF4444]/20 border border-[#EF4444]/50 text-center">
                <div className="text-[10px] font-mono text-[#EF4444] font-bold">VERDICT</div>
                <div className="text-xs font-mono font-black text-[#EF4444]">REJECT</div>
              </div>
            </div>
          </div>

          {/* Prominent Banner: "Engineer Review Required" */}
          <div className="p-3.5 rounded-lg bg-[#102337] border-l-4 border-l-[#EF4444] border border-[#2D4963] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#EF4444] animate-pulse" />
              <div>
                <div className="text-xs font-mono font-bold text-[#EF4444] tracking-wider uppercase">
                  ENGINEER REVIEW REQUIRED &bull; DECISION-SUPPORT SYSTEM
                </div>
                <p className="text-xs text-[#A8B6C5] mt-0.5">
                  ASTRA VIGIL does not execute autonomous flight rejections. The system provides decision-support telemetry recommendations to the certified Aerospace Reliability Engineer.
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-[11px] text-[#22D3EE]">
              Action Gate: <b className="text-[#F1F5F9]">Pending Engineer Disposition</b>
            </div>
          </div>

          {/* Parameter Metrics Breakdown */}
          <div className="grid grid-cols-4 gap-2.5 font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-[#1B3445] border border-[#2D4963]">
              <div className="text-[10px] text-[#718398]">168h MEASURED</div>
              <div className="text-sm font-bold text-[#EF4444] mt-0.5">{targetPart.v168.toFixed(1)} µA</div>
              <div className="text-[9px] text-[#718398]">Ceiling: {limitVal.toFixed(1)} µA</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#1B3445] border border-[#2D4963]">
              <div className="text-[10px] text-[#718398]">LOT MEDIAN</div>
              <div className="text-sm font-bold text-[#10B981] mt-0.5">{targetPart.lot_mean?.toFixed(1) || '10.2'} µA</div>
              <div className="text-[9px] text-[#718398]">Dispersion: ±1.8 µA</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#1B3445] border border-[#2D4963]">
              <div className="text-[10px] text-[#718398]">Z-SCORE</div>
              <div className="text-sm font-bold text-[#22D3EE] mt-0.5">+{zScore.toFixed(2)}σ</div>
              <div className="text-[9px] text-[#EF4444]">Exceeds 3.0σ Bound</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#1B3445] border border-[#2D4963]">
              <div className="text-[10px] text-[#718398]">DRIFT RATE</div>
              <div className="text-sm font-bold text-[#F59E0B] mt-0.5">+{driftRate} µA/h</div>
              <div className="text-[9px] text-[#EF4444]">Breach: T+198h</div>
            </div>
          </div>

          {/* Engineer Review Actions & Disposition Panel */}
          <div className="p-4 rounded-xl bg-[#1B3445] border border-[#2D4963] flex flex-col gap-3">
            <div className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center justify-between">
              <span>ENGINEER DISPOSITION &amp; SIGN-OFF</span>
              {engineerDisposition !== 'pending' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                  DISPOSITION RECORDED: {engineerDisposition.toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleAction('quarantined')}
                className="px-4 py-2 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-[#F1F5F9] font-mono font-bold text-xs transition-colors flex items-center gap-2 shadow-sm"
              >
                <span>🚫</span> Confirm Rejection &amp; Quarantine
              </button>

              <button
                type="button"
                onClick={() => handleAction('extended_burnin')}
                className="px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#102337] font-mono font-bold text-xs transition-colors flex items-center gap-2 shadow-sm"
              >
                <span>⏱️</span> Order Extended 264h Burn-In
              </button>

              <button
                type="button"
                onClick={() => handleAction('waiver_granted')}
                className="px-4 py-2 rounded-lg bg-[#102337] hover:bg-[#203C55] text-[#22D3EE] border border-[#2D4963] font-mono font-bold text-xs transition-colors flex items-center gap-2 shadow-sm"
              >
                <span>📋</span> Issue Mission Reliability Waiver
              </button>
            </div>

            <div className="pt-2">
              <input
                type="text"
                placeholder="Enter engineering justification / review sign-off notes..."
                value={dispositionNotes}
                onChange={(e) => setDispositionNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#102337] border border-[#2D4963] text-xs text-[#F1F5F9] placeholder-[#718398] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
