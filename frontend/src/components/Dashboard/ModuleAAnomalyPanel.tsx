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

  const isReject = selected?.status === 'reject' || selected?.behavioral_health === 'CRITICAL'

  return (
    <div className={`flex flex-col rounded-xl bg-[#111E30] border shadow-xl overflow-hidden h-full transition-colors ${
      isReject ? 'border-[#D94B5B]/60' : 'border-[#26384D]'
    }`}>
      {/* Module A Top Bezel Bar */}
      <div className="bg-[#0D1726] border-b border-[#26384D] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-md bg-[#C99A2E]/20 text-[#C99A2E] text-sm sm:text-base font-mono font-black border border-[#C99A2E]/60 shadow-isro tracking-wider uppercase whitespace-nowrap">
            MODULE A
          </span>
          <span className="text-xs sm:text-sm font-display font-bold text-[#E8EDF2] tracking-wider uppercase">
            Anomaly Detection &amp; Silicon Data Analysis
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${isReject ? 'bg-[#D94B5B] led' : 'bg-[#C99A2E] led'}`} />
          <span className="text-[#91A0B2] text-[11px]">
            {isSim ? `LIVE SWEEP ACTIVE: T+${Math.round(simH)}H` : 'HTOL TELEMETRY DAQ'}
          </span>
        </div>
      </div>

      {/* Component Quick Selector & Search Bar */}
      <div className="p-3 bg-[#0D1726] border-b border-[#26384D] flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-[280px]">
          <span className="text-[#91A0B2] font-mono text-[11px]">PART:</span>
          <input
            type="text"
            placeholder="Search Part / Lot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#070D18] border border-[#26384D] rounded px-2.5 py-1 text-xs text-[#E8EDF2] font-mono placeholder:text-[#5A6E85] focus:outline-none focus:border-[#3B82B6]"
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
                    ? 'bg-[#D94B5B] text-[#E8EDF2] font-bold'
                    : filter === 'monitor'
                    ? 'bg-[#D6A33A] text-[#E8EDF2] font-bold'
                    : filter === 'safe'
                    ? 'bg-[#3FA66B] text-[#E8EDF2] font-bold'
                    : 'bg-[#C99A2E]/30 text-[#C99A2E] border border-[#C99A2E]/50 font-bold'
                  : 'text-[#91A0B2] hover:text-[#E8EDF2] bg-[#070D18] border border-[#26384D]'
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
          className="bg-[#070D18] border border-[#26384D] text-[#E8EDF2] text-xs font-mono rounded px-2 py-1 max-w-[200px] focus:outline-none focus:border-[#C99A2E]"
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
            isReject ? 'bg-[#28131D] border-[#D94B5B]/50' : 'bg-[#16253A] border-[#26384D]'
          }`}>
            {/* Top Identity & Location Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base md:text-lg font-bold text-[#E8EDF2] tracking-wide">{selected.component_id}</span>
                <span className="text-[#5A6E85] text-xs">&bull;</span>
                <span className="text-[#C99A2E] text-xs font-semibold">Lot: {selected.lot_id}</span>
                <span className="text-[#5A6E85] text-xs">&bull;</span>
                <button
                  type="button"
                  onClick={() => onSelectSubsystem && onSelectSubsystem(selected.subsystem)}
                  className="px-2 py-0.5 rounded bg-[#111E30] border border-[#26384D] text-[#3B82B6] text-xs font-bold hover:border-[#3B82B6] transition-colors"
                  title="Filter and highlight subsystem in 3D"
                >
                  [{selected.subsystem}] {loc?.name || selected.subsystem}
                </button>
                {loc && (
                  <span className="text-[11px] text-[#91A0B2] bg-[#111E30] px-2 py-0.5 rounded border border-[#26384D]">
                    {loc.bay} &bull; <span className="text-[#C99A2E]">{formatCoordinates(loc.pos)}</span>
                  </span>
                )}
              </div>

              {/* Status & Decision Tags */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold border transition-colors ${
                    liveStatus === 'reject'
                      ? 'bg-[#D94B5B]/20 text-[#D94B5B] border-[#D94B5B]/50'
                      : liveStatus === 'monitor'
                      ? 'bg-[#D6A33A]/20 text-[#D6A33A] border-[#D6A33A]/50'
                      : 'bg-[#3FA66B]/20 text-[#3FA66B] border-[#3FA66B]/50'
                  }`}
                >
                  {isSim ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3FA66B] led" />
                      LIVE DAQ &bull; RISK {liveRiskScore}/100
                    </span>
                  ) : (
                    `${(selected.status || 'safe').toUpperCase()} • RISK ${selected.risk_score}/100`
                  )}
                </span>

                {selected.traditional_decision === 'PASS' && liveStatus === 'reject' ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#D94B5B]/20 text-[#D94B5B] border border-[#D94B5B]/40">
                    PASS Spec &bull; REJECT AI
                  </span>
                ) : selected.traditional_decision === 'FAIL' ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#D94B5B]/25 text-[#D94B5B] border border-[#D94B5B]/60">
                    FAIL SPEC
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#3FA66B]/15 text-[#3FA66B] border border-[#3FA66B]/40">
                    PASS SPEC &amp; AI
                  </span>
                )}
              </div>
            </div>

            {/* HTOL Telemetry Reading Grid (Row 1) */}
            <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
              <div className="p-1.5 rounded bg-[#070D18] border border-[#3FA66B]/30 flex flex-col">
                <span className="text-[10px] text-[#91A0B2] uppercase font-semibold">0h Initial</span>
                <span className="text-sm font-bold text-[#E8EDF2] mt-0.5 tabular-nums">{selected.v0.toFixed(1)} &mu;A</span>
              </div>

              <div className={`p-1.5 rounded bg-[#070D18] border flex flex-col transition-colors ${
                isSim && simH < 24
                  ? 'border-[#26384D] opacity-60'
                  : 'border-[#3FA66B]/40'
              }`}>
                <span className="text-[10px] text-[#91A0B2] uppercase font-semibold">24h Early</span>
                <span className="text-sm font-bold text-[#E8EDF2] mt-0.5 tabular-nums">
                  {isSim && simH < 24 ? '--' : `${selected.v24.toFixed(1)} \u00B5A`}
                </span>
              </div>

              <div className={`p-1.5 rounded bg-[#070D18] border flex flex-col transition-colors ${
                isSim && simH < 96
                  ? 'border-[#26384D] opacity-60'
                  : 'border-[#3FA66B]/40'
              }`}>
                <span className="text-[10px] text-[#91A0B2] uppercase font-semibold">96h Mid</span>
                <span className="text-sm font-bold text-[#E8EDF2] mt-0.5 tabular-nums">
                  {isSim && simH < 96 ? '--' : selected.v96 != null ? `${selected.v96.toFixed(1)} \u00B5A` : '--'}
                </span>
              </div>

              <div className={`p-1.5 rounded bg-[#070D18] border flex flex-col transition-colors ${
                isSim && simH < 168
                  ? 'border-[#D6A33A]/40'
                  : selected.status === 'reject'
                  ? 'border-[#D94B5B]/50'
                  : 'border-[#3FA66B]/40'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#91A0B2] uppercase font-semibold">168h Final</span>
                  {isSim && simH < 168 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D6A33A] led" />
                  )}
                </div>
                <span className={`text-sm font-bold mt-0.5 tabular-nums ${
                  isSim && simH < 168
                    ? 'text-[#D6A33A]'
                    : selected.status === 'reject'
                    ? 'text-[#D94B5B]'
                    : 'text-[#3FA66B]'
                }`}>
                  {isSim && simH < 168 ? `${simVal.toFixed(1)} \u00B5A` : `${selected.v168.toFixed(1)} \u00B5A`}
                </span>
              </div>

              <div className="p-1.5 rounded bg-[#070D18] border border-[#26384D] flex flex-col">
                <span className="text-[10px] text-[#91A0B2] uppercase font-semibold">Spec Limit</span>
                <span className="text-sm font-bold text-[#D94B5B] mt-0.5 tabular-nums">{(selected.limit_ua || 50).toFixed(1)} &mu;A</span>
              </div>
            </div>

            {/* Outlier & Statistical Analysis Row (Row 2) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-xs font-mono text-[#E8EDF2]">
              <div className="flex justify-between bg-[#111E30] px-2.5 py-1 rounded flex-col sm:flex-row items-center sm:items-start text-center sm:text-left border border-[#26384D]/60">
                <span className="text-[10px] text-[#91A0B2]">Median / MAD:</span>
                <span className="text-xs text-[#E8EDF2] font-bold tabular-nums">
                  {selected.lot_median?.toFixed(1) ?? selected.lot_mean?.toFixed(1) ?? '--'} &mu;A &bull; {selected.lot_mad?.toFixed(2) ?? selected.lot_std?.toFixed(2) ?? '--'}
                </span>
              </div>
              <div className="flex justify-between bg-[#111E30] px-2.5 py-1 rounded flex-col sm:flex-row items-center sm:items-start text-center sm:text-left border border-[#26384D]/60">
                <span className="text-[10px] text-[#91A0B2]">Lot z-Score:</span>
                <span className={`text-xs font-bold tabular-nums ${
                  liveZ != null && Math.abs(liveZ) > 2 ? 'text-[#D94B5B]' : 'text-[#C99A2E]'
                }`}>
                  {liveZ != null ? `${liveZ > 0 ? '+' : ''}${liveZ.toFixed(2)}σ` : '--'}
                </span>
              </div>
              <div className="flex justify-between bg-[#111E30] px-2.5 py-1 rounded flex-col sm:flex-row items-center sm:items-start text-center sm:text-left border border-[#26384D]/60">
                <span className="text-[10px] text-[#91A0B2]">Rank %ile:</span>
                <span className="text-xs text-[#C99A2E] font-bold tabular-nums">
                  {selected.lot_rank_percentile != null ? `${selected.lot_rank_percentile.toFixed(1)}%` : '--'}
                </span>
              </div>
              <div className="flex justify-between bg-[#111E30] px-2.5 py-1 rounded flex-col sm:flex-row items-center sm:items-start text-center sm:text-left border border-[#26384D]/60">
                <span className="text-[10px] text-[#91A0B2]">Anomaly Score:</span>
                <span className="text-xs text-[#3B82B6] font-bold tabular-nums">
                  {displayedScore.toFixed(1)}/100
                </span>
              </div>
            </div>

            {/* AI Diagnostics & Failure Physics */}
            {selected.reason && (
              <div className="p-2 rounded bg-[#111E30] border border-[#26384D] text-xs text-[#E8EDF2] flex items-start gap-2">
                <span className="text-[#C99A2E] font-bold font-mono text-[11px] uppercase whitespace-nowrap">
                  Diagnosis:
                </span>
                <span className="text-xs text-[#E8EDF2] font-sans leading-relaxed truncate" title={selected.reason}>
                  {selected.reason}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-[#91A0B2] bg-[#16253A] rounded-lg border border-[#26384D]">
            No component selected. Pick a component above to inspect Module A Silicon Telemetry.
          </div>
        )}

        {/* Module A Dedicated Graph: Parametric Waveform Oscilloscope */}
        <div className="mt-0.5 flex flex-col h-[260px] md:h-[280px] min-h-[240px] w-full">
          <ModuleAAnomalyGraph component={selected} onSimUpdate={setSimData} />
        </div>
      </div>

      {/* Module A Bezel Bottom Bar */}
      <div className="bg-[#0D1726] border-t border-[#26384D] px-4 py-2 text-xs text-[#91A0B2] flex justify-between font-mono">
        <span>DAQ Sampling: 24-Bit Sigma-Delta ADC @ 125&deg;C HTOL</span>
        <span className="text-[#E8EDF2]">
          Evaluated: {components.length} components
        </span>
      </div>
    </div>
  )
}
