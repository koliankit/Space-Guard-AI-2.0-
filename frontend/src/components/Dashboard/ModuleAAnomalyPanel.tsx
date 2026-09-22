import React, { useState, useMemo, useEffect } from 'react'
import type { ComponentOut } from '../../types'
import ModuleAAnomalyGraph from '../Charts/ModuleAAnomalyGraph'
import { getSubsystemLocation, formatCoordinates } from '../../utils/satelliteLocations'

interface ModuleAAnomalyPanelProps {
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  onSelectSubsystem?: (subKey: string) => void
}

export default function ModuleAAnomalyPanel({
  components,
  selected,
  onSelectComponent,
  onSelectSubsystem,
}: ModuleAAnomalyPanelProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'reject' | 'monitor' | 'safe'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

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

  const counts = useMemo(() => {
    return {
      ALL: components.length,
      reject: components.filter((c) => c.status === 'reject').length,
      monitor: components.filter((c) => c.status === 'monitor').length,
      safe: components.filter((c) => c.status === 'safe').length,
    }
  }, [components])

  const [simData, setSimData] = useState<{
    progress: number
    simHour: number
    simVal: number
    isSimulating: boolean
  } | null>(null)

  const loc = selected ? getSubsystemLocation(selected.subsystem) : null

  // Real-time values derived from live oscilloscope sweep
  const isSim = simData?.isSimulating && (simData.progress ?? 1) < 1
  const simH = isSim ? (simData?.simHour ?? 168) : 168
  const simVal = isSim ? (simData?.simVal ?? selected?.v168 ?? 0) : selected?.v168 ?? 0

  const liveRiskScore = selected
    ? isSim
      ? Math.round((selected.risk_score || 20) * Math.min(1, (simH / 168) * 1.05))
      : selected.risk_score
    : 0

  const liveStatus = selected
    ? !isSim
      ? selected.status
      : simH < 24
      ? 'safe'
      : simH < 96
      ? selected.status === 'safe'
        ? 'safe'
        : 'monitor'
      : selected.status
    : 'safe'

  const liveZ = selected
    ? isSim
      ? ((simVal - (selected.lot_mean ?? 11.5)) / (selected.lot_std || 1.8))
      : selected.z168
    : null

  // Anomaly score counts smoothly from 0 -> final value
  const targetScore = selected ? (selected.lot_anomaly_score ?? (selected.iso_score != null ? selected.iso_score : 0)) : 0
  const [displayedScore, setDisplayedScore] = useState<number>(0)

  useEffect(() => {
    let startTimestamp: number | null = null
    const duration = 650 // ms
    let rafId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setDisplayedScore(Math.round(targetScore * easeOut * 10) / 10)
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      }
    }

    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [targetScore, selected?.component_id])

  // Automatically select first component if none is selected
  useEffect(() => {
    if (!selected && components.length > 0) {
      onSelectComponent(components[0].component_id)
    }
  }, [selected, components, onSelectComponent])

  const isReject = selected?.status === 'reject' || selected?.behavioral_health === 'CRITICAL'

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl shadow-sm text-center my-auto min-h-[360px]">
        <div className="w-14 h-14 rounded-full bg-[#0E88D3]/10 border border-[#0E88D3]/30 flex items-center justify-center text-[#0E88D3] font-mono text-2xl font-black mb-3">
          &bull;
        </div>
        <h2 className="text-base font-mono font-bold text-[#17212B] uppercase tracking-wider mb-1">
          NO DATASET LOADED FOR SCREENING
        </h2>
        <p className="text-xs text-[#5B6B7A] max-w-md font-sans mb-4">
          Please upload a flight qualification telemetry CSV in Stage 0 (CSV Intake) and run the validation gate to inspect Module A Silicon Telemetry.
        </p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col rounded-xl bg-[#FFFFFF] border shadow-sm transition-colors w-full flex-1 ${
      isReject ? 'border-[#DC2626]/60' : 'border-[#D7E0EA]'
    }`}>
      {/* Module A Top Bezel Bar */}
      <div className="bg-[#FFFFFF] border-b border-[#D7E0EA] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-md bg-[#005A9C] text-[#FFFFFF] text-sm sm:text-base font-mono font-bold border border-[#005A9C] shadow-sm tracking-wider uppercase whitespace-nowrap">
            MODULE A
          </span>
          <span className="text-xs sm:text-sm font-display font-bold text-[#0B1E36] tracking-wider uppercase">
            Anomaly Detection &amp; Silicon Data Analysis
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${isReject ? 'bg-[#DC2626] led' : 'bg-[#005A9C] led'}`} />
          <span className="text-[#475569] text-[11px] font-semibold">
            {isSim ? `LIVE SWEEP ACTIVE: T+${Math.round(simH)}H` : 'HTOL TELEMETRY DAQ'}
          </span>
        </div>
      </div>

      {/* Component Quick Selector & Search Bar */}
      <div className="p-3 bg-[#FFFFFF] border-b border-[#D7E0EA] flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-[280px]">
          <span className="text-[#475569] font-mono text-[11px] font-bold">PART:</span>
          <input
            type="text"
            placeholder="Search Part / Lot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAFD] border border-[#D7E0EA] rounded px-2.5 py-1 text-xs text-[#0B1E36] font-mono placeholder:text-[#81909D] focus:outline-none focus:border-[#005A9C]"
          />
        </div>

        {/* Filter Pills */}
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
              {filter} ({counts[filter]})
            </button>
          ))}
        </div>

        {/* Component Selector Dropdown */}
        <select
          value={selected?.component_id || ''}
          onChange={(e) => onSelectComponent(e.target.value)}
          className="bg-[#F8FAFD] border border-[#D7E0EA] rounded px-2.5 py-1 text-xs text-[#0B1E36] font-mono font-bold focus:outline-none focus:border-[#005A9C] cursor-pointer"
        >
          {filteredComponents.map((c, idx) => (
            <option key={c.component_id} value={c.component_id}>
              {idx + 1}. {c.component_id} [{(c.status || 'safe').toUpperCase()}] ({c.v168.toFixed(1)} &mu;A)
            </option>
          ))}
        </select>
      </div>

      {/* Main Content Area */}
      <div className="p-3 flex-1 flex flex-col gap-3">
        {/* MAIN GRAPH: HTOL 168H OSCILLOSCOPE (Section 6 layout) */}
        <div className="flex flex-col flex-1 min-h-[380px] md:min-h-[440px] w-full">
          <ModuleAAnomalyGraph component={selected} onSimUpdate={setSimData} />
        </div>

        {/* LOT STATISTICS | COMPONENT ANALYSIS | DECISION (Section 6 layout) */}
        {selected ? (
          <div className={`p-3 rounded-xl border flex flex-col gap-2.5 transition-colors shadow-sm ${
            isReject ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#F8FAFD] border-[#D7E0EA]'
          }`}>
            {/* Top Identity & Location Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base md:text-lg font-bold text-[#0B1E36] tracking-wide">{selected.component_id}</span>
                <span className="text-[#81909D] text-xs">&bull;</span>
                <span className="text-[#005A9C] text-xs font-bold">Lot: {selected.lot_id}</span>
                <span className="text-[#81909D] text-xs">&bull;</span>
                <button
                  type="button"
                  onClick={() => onSelectSubsystem && onSelectSubsystem(selected.subsystem)}
                  className="px-2 py-0.5 rounded bg-[#FFFFFF] border border-[#D7E0EA] text-[#005A9C] text-xs font-bold hover:border-[#005A9C] transition-colors"
                  title="Filter and highlight subsystem in 3D"
                >
                  [{selected.subsystem}] {loc?.name || selected.subsystem}
                </button>
                {loc && (
                  <span className="text-[11px] text-[#475569] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#D7E0EA] font-semibold">
                    {loc.bay} &bull; <span className="text-[#005A9C]">{formatCoordinates(loc.pos)}</span>
                  </span>
                )}
              </div>

              {/* Status & Decision Tags */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold border transition-colors ${
                    liveStatus === 'reject'
                      ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                      : liveStatus === 'monitor'
                      ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                      : 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                  }`}
                >
                  {isSim ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#168A5B] led" />
                      LIVE DAQ &bull; RISK {liveRiskScore}/100
                    </span>
                  ) : (
                    `${(selected.status || 'safe').toUpperCase()} • RISK ${selected.risk_score}/100`
                  )}
                </span>

                {selected.traditional_decision === 'PASS' && liveStatus === 'reject' ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                    PASS Spec &bull; REJECT AI
                  </span>
                ) : selected.traditional_decision === 'FAIL' ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                    FAIL SPEC
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                    PASS SPEC &amp; AI
                  </span>
                )}
              </div>
            </div>

            {/* HTOL Telemetry Reading Grid (Lot Statistics - 4-box) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D7E0EA] flex flex-col shadow-xs">
                <span className="text-[10px] text-[#475569] uppercase font-bold">0h Initial</span>
                <span className="text-sm font-bold text-[#0B1E36] mt-0.5 tabular-nums">{selected.v0.toFixed(1)} &mu;A</span>
                <span className="text-[9px] text-[#64748B] font-mono mt-0.5 font-semibold">T=0 Baseline</span>
              </div>

              <div className={`p-2.5 rounded-lg bg-[#FFFFFF] border flex flex-col shadow-xs transition-colors ${
                isSim && simH < 24
                  ? 'border-[#D7E0EA] opacity-60'
                  : 'border-[#D7E0EA]'
              }`}>
                <span className="text-[10px] text-[#475569] uppercase font-bold">24h Early</span>
                <span className="text-sm font-bold text-[#0B1E36] mt-0.5 tabular-nums">
                  {isSim && simH < 24 ? '--' : `${selected.v24.toFixed(1)} \u00B5A`}
                </span>
                <span className="text-[9px] text-[#005A9C] font-mono mt-0.5 font-bold">
                  &Delta; +{(selected.v24 - selected.v0).toFixed(2)} &mu;A
                </span>
              </div>

              <div className={`p-2.5 rounded-lg bg-[#FFFFFF] border flex flex-col shadow-xs transition-colors ${
                isSim && simH < 96
                  ? 'border-[#D7E0EA] opacity-60'
                  : 'border-[#D7E0EA]'
              }`}>
                <span className="text-[10px] text-[#475569] uppercase font-bold">96h Mid-HTOL</span>
                <span className="text-sm font-bold text-[#0B1E36] mt-0.5 tabular-nums">
                  {isSim && simH < 96 ? '--' : selected.v96 != null ? `${selected.v96.toFixed(1)} \u00B5A` : '--'}
                </span>
                <span className="text-[9px] text-[#64748B] font-mono mt-0.5 font-semibold">Midpoint Check</span>
              </div>

              <div className={`p-2.5 rounded-lg bg-[#FFFFFF] border flex flex-col shadow-xs transition-colors ${
                isSim && simH < 168
                  ? 'border-[#FDE68A]'
                  : selected.status === 'reject'
                  ? 'border-[#FECACA]'
                  : 'border-[#A7F3D0]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#475569] uppercase font-bold">168h Final</span>
                  {isSim && simH < 168 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C58A00] led" />
                  )}
                </div>
                <span className={`text-sm font-bold mt-0.5 tabular-nums ${
                  isSim && simH < 168
                    ? 'text-[#C58A00]'
                    : selected.status === 'reject'
                    ? 'text-[#DC2626]'
                    : 'text-[#168A5B]'
                }`}>
                  {isSim && simH < 168 ? `${simVal.toFixed(1)} \u00B5A` : `${selected.v168.toFixed(1)} \u00B5A`}
                </span>
                <span className={`text-[9px] font-mono mt-0.5 font-bold ${
                  liveZ != null && Math.abs(liveZ) > 2 ? 'text-[#DC2626]' : 'text-[#005A9C]'
                }`}>
                  z: {liveZ != null ? `${liveZ > 0 ? '+' : ''}${liveZ.toFixed(2)}σ` : '--'}
                </span>
              </div>
            </div>

            {/* AI Diagnostics & Statistical Analysis Strip */}
            <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D7E0EA] text-xs text-[#0B1E36] flex flex-wrap items-center justify-between gap-2 font-mono shadow-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[#005A9C] font-bold text-[10px] uppercase whitespace-nowrap">
                  DIAGNOSIS:
                </span>
                <span className="text-xs text-[#0B1E36] truncate font-sans font-semibold" title={selected.reason || 'Nominal component telemetry'}>
                  {selected.reason || 'Nominal HTOL burn-in curve within statistical bounds.'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[#475569] whitespace-nowrap font-medium">
                <span>&mu;: <b className="text-[#0B1E36]">{selected.lot_mean?.toFixed(1) ?? '--'}&mu;A</b></span>
                <span>Limit: <b className="text-[#DC2626]">{(selected.limit_ua || 50).toFixed(1)}&mu;A</b></span>
                <span>AI Score: <b className="text-[#005A9C]">{displayedScore.toFixed(1)}/100</b></span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-[#475569] bg-[#F8FAFD] rounded-lg border border-[#D7E0EA]">
            No component selected. Pick a component above to inspect Module A Silicon Telemetry.
          </div>
        )}
      </div>

      {/* Module A Bezel Bottom Bar */}
      <div className="bg-[#F8FAFD] border-t border-[#D7E0EA] px-4 py-2 text-xs text-[#475569] flex justify-between font-mono font-medium rounded-b-xl">
        <span>DAQ Sampling: 24-Bit Sigma-Delta ADC @ 125&deg;C HTOL</span>
        <span className="text-[#0B1E36] font-bold">
          Evaluated: {components.length} components
        </span>
      </div>
    </div>
  )
}
