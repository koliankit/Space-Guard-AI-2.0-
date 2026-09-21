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
    <div className={`flex flex-col rounded-xl bg-[#FFFFFF] border shadow-xl overflow-hidden h-full transition-colors ${
      isReject ? 'border-[#D9363E]/60' : 'border-[#D9E2EA]'
    }`}>
      {/* Module A Top Bezel Bar */}
      <div className="bg-[#FFFFFF] border-b border-[#D9E2EA] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-md bg-[#0E88D3]/15 text-[#0E88D3] text-sm sm:text-base font-mono font-black border border-[#0E88D3]/60 shadow-isro tracking-wider uppercase whitespace-nowrap">
            MODULE A
          </span>
          <span className="text-xs sm:text-sm font-display font-bold text-[#17212B] tracking-wider uppercase">
            Anomaly Detection &amp; Silicon Data Analysis
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${isReject ? 'bg-[#D9363E] led' : 'bg-[#0E88D3] led'}`} />
          <span className="text-[#5B6B7A] text-[11px]">
            {isSim ? `LIVE SWEEP ACTIVE: T+${Math.round(simH)}H` : 'HTOL TELEMETRY DAQ'}
          </span>
        </div>
      </div>

      {/* Component Quick Selector & Search Bar */}
      <div className="p-3 bg-[#FFFFFF] border-b border-[#D9E2EA] flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-[280px]">
          <span className="text-[#5B6B7A] font-mono text-[11px]">PART:</span>
          <input
            type="text"
            placeholder="Search Part / Lot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F4F7FA] border border-[#D9E2EA] rounded px-2.5 py-1 text-xs text-[#17212B] font-mono placeholder:text-[#81909D] focus:outline-none focus:border-[#0E88D3]"
          />
        </div>

        {/* Filter Pills */}
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
                    : 'bg-[#0E88D3]/30 text-[#0E88D3] border border-[#0E88D3]/50 font-bold'
                  : 'text-[#5B6B7A] hover:text-[#17212B] bg-[#F4F7FA] border border-[#D9E2EA]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Quick Dropdown Picker */}
        <select
          value={selected?.component_id || ''}
          onChange={(e) => {
            if (e.target.value) onSelectComponent(e.target.value)
          }}
          className="bg-[#F4F7FA] border border-[#D9E2EA] text-[#17212B] text-xs font-mono rounded px-2 py-1 max-w-[200px] focus:outline-none focus:border-[#0E88D3]"
        >
          <option value="" disabled>Select Component ({filteredComponents.length})</option>
          {filteredComponents.slice(0, 100).map((c, idx) => (
            <option key={c.component_id} value={c.component_id}>
              {idx + 1}. {c.component_id} [{(c.status || 'safe').toUpperCase()}] ({c.v168.toFixed(1)} &mu;A)
            </option>
          ))}
        </select>
      </div>

      {/* Main Content Area */}
      {/* Main Content Area */}
      <div className="p-2.5 flex-1 flex flex-col gap-2.5">
        {/* Selected Component Header Profile */}
        {selected ? (
          <div className={`p-2.5 rounded-lg border flex flex-col gap-2 transition-colors ${
            isReject ? 'bg-[#FEF2F2] border-[#D9363E]/50' : 'bg-[#F8FAFC] border-[#D9E2EA]'
          }`}>
            {/* Top Identity & Location Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base md:text-lg font-bold text-[#17212B] tracking-wide">{selected.component_id}</span>
                <span className="text-[#81909D] text-xs">&bull;</span>
                <span className="text-[#0E88D3] text-xs font-semibold">Lot: {selected.lot_id}</span>
                <span className="text-[#81909D] text-xs">&bull;</span>
                <button
                  type="button"
                  onClick={() => onSelectSubsystem && onSelectSubsystem(selected.subsystem)}
                  className="px-2 py-0.5 rounded bg-[#FFFFFF] border border-[#D9E2EA] text-[#0E88D3] text-xs font-bold hover:border-[#0E88D3] transition-colors"
                  title="Filter and highlight subsystem in 3D"
                >
                  [{selected.subsystem}] {loc?.name || selected.subsystem}
                </button>
                {loc && (
                  <span className="text-[11px] text-[#5B6B7A] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#D9E2EA]">
                    {loc.bay} &bull; <span className="text-[#0E88D3]">{formatCoordinates(loc.pos)}</span>
                  </span>
                )}
              </div>

              {/* Status & Decision Tags */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold border transition-colors ${
                    liveStatus === 'reject'
                      ? 'bg-[#D9363E]/20 text-[#D9363E] border-[#D9363E]/50'
                      : liveStatus === 'monitor'
                      ? 'bg-[#C58A00]/20 text-[#C58A00] border-[#C58A00]/50'
                      : 'bg-[#168A5B]/20 text-[#168A5B] border-[#168A5B]/50'
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
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#D9363E]/20 text-[#D9363E] border border-[#D9363E]/40">
                    PASS Spec &bull; REJECT AI
                  </span>
                ) : selected.traditional_decision === 'FAIL' ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#D9363E]/25 text-[#D9363E] border border-[#D9363E]/60">
                    FAIL SPEC
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#168A5B]/15 text-[#168A5B] border border-[#168A5B]/40">
                    PASS SPEC &amp; AI
                  </span>
                )}
              </div>
            </div>

            {/* HTOL Telemetry Reading Grid (4-box harmonized with Module B) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-mono">
              <div className="p-1.5 rounded bg-[#F4F7FA] border border-[#168A5B]/30 flex flex-col">
                <span className="text-[10px] text-[#5B6B7A] uppercase font-semibold">0h Initial</span>
                <span className="text-sm font-bold text-[#17212B] mt-0.5 tabular-nums">{selected.v0.toFixed(1)} &mu;A</span>
                <span className="text-[9px] text-[#81909D] font-mono mt-0.5">T=0 Baseline</span>
              </div>

              <div className={`p-1.5 rounded bg-[#F4F7FA] border flex flex-col transition-colors ${
                isSim && simH < 24
                  ? 'border-[#D9E2EA] opacity-60'
                  : 'border-[#168A5B]/40'
              }`}>
                <span className="text-[10px] text-[#5B6B7A] uppercase font-semibold">24h Early</span>
                <span className="text-sm font-bold text-[#17212B] mt-0.5 tabular-nums">
                  {isSim && simH < 24 ? '--' : `${selected.v24.toFixed(1)} \u00B5A`}
                </span>
                <span className="text-[9px] text-[#0E88D3] font-mono mt-0.5">
                  &Delta; +{(selected.v24 - selected.v0).toFixed(2)} &mu;A
                </span>
              </div>

              <div className={`p-1.5 rounded bg-[#F4F7FA] border flex flex-col transition-colors ${
                isSim && simH < 96
                  ? 'border-[#D9E2EA] opacity-60'
                  : 'border-[#168A5B]/40'
              }`}>
                <span className="text-[10px] text-[#5B6B7A] uppercase font-semibold">96h Mid-HTOL</span>
                <span className="text-sm font-bold text-[#17212B] mt-0.5 tabular-nums">
                  {isSim && simH < 96 ? '--' : selected.v96 != null ? `${selected.v96.toFixed(1)} \u00B5A` : '--'}
                </span>
                <span className="text-[9px] text-[#81909D] font-mono mt-0.5">Midpoint Check</span>
              </div>

              <div className={`p-1.5 rounded bg-[#F4F7FA] border flex flex-col transition-colors ${
                isSim && simH < 168
                  ? 'border-[#C58A00]/40'
                  : selected.status === 'reject'
                  ? 'border-[#D9363E]/50'
                  : 'border-[#168A5B]/40'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#5B6B7A] uppercase font-semibold">168h Final</span>
                  {isSim && simH < 168 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C58A00] led" />
                  )}
                </div>
                <span className={`text-sm font-bold mt-0.5 tabular-nums ${
                  isSim && simH < 168
                    ? 'text-[#C58A00]'
                    : selected.status === 'reject'
                    ? 'text-[#D9363E]'
                    : 'text-[#168A5B]'
                }`}>
                  {isSim && simH < 168 ? `${simVal.toFixed(1)} \u00B5A` : `${selected.v168.toFixed(1)} \u00B5A`}
                </span>
                <span className={`text-[9px] font-mono mt-0.5 ${
                  liveZ != null && Math.abs(liveZ) > 2 ? 'text-[#D9363E]' : 'text-[#0E88D3]'
                }`}>
                  z: {liveZ != null ? `${liveZ > 0 ? '+' : ''}${liveZ.toFixed(2)}σ` : '--'}
                </span>
              </div>
            </div>

            {/* AI Diagnostics & Statistical Analysis Strip */}
            <div className="p-2 rounded bg-[#FFFFFF] border border-[#D9E2EA] text-xs text-[#17212B] flex flex-wrap items-center justify-between gap-2 font-mono">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[#0E88D3] font-bold text-[10px] uppercase whitespace-nowrap">
                  DIAGNOSIS:
                </span>
                <span className="text-xs text-[#17212B] truncate font-sans" title={selected.reason || 'Nominal component telemetry'}>
                  {selected.reason || 'Nominal HTOL burn-in curve within statistical bounds.'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[#5B6B7A] whitespace-nowrap">
                <span>&mu;: <b className="text-[#17212B]">{selected.lot_mean?.toFixed(1) ?? '--'}&mu;A</b></span>
                <span>Limit: <b className="text-[#D9363E]">{(selected.limit_ua || 50).toFixed(1)}&mu;A</b></span>
                <span>AI Score: <b className="text-[#0E88D3]">{displayedScore.toFixed(1)}/100</b></span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-[#5B6B7A] bg-[#F8FAFC] rounded-lg border border-[#D9E2EA]">
            No component selected. Pick a component above to inspect Module A Silicon Telemetry.
          </div>
        )}

        {/* Module A Dedicated Graph: Parametric Waveform Oscilloscope - Dynamically occupies full remaining height */}
        <div className="mt-0.5 flex flex-col flex-1 min-h-[280px] w-full">
          <ModuleAAnomalyGraph component={selected} onSimUpdate={setSimData} />
        </div>
      </div>

      {/* Module A Bezel Bottom Bar */}
      <div className="bg-[#FFFFFF] border-t border-[#D9E2EA] px-4 py-2 text-xs text-[#5B6B7A] flex justify-between font-mono">
        <span>DAQ Sampling: 24-Bit Sigma-Delta ADC @ 125&deg;C HTOL</span>
        <span className="text-[#17212B]">
          Evaluated: {components.length} components
        </span>
      </div>
    </div>
  )
}
