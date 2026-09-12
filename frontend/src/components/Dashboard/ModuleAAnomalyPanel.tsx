import React, { useState, useMemo } from 'react'
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

  // Real-time rating and values derived from live oscilloscope sweep
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

  return (
    <div className="flex flex-col rounded-xl bg-[#090F1E] border border-slate-800 shadow-xl overflow-hidden min-h-[560px]">
      {/* Module A Top Bezel Bar */}
      <div className="bg-[#0D162A] border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-md bg-amber-500/25 text-amber-300 text-sm sm:text-base font-mono font-black border border-amber-500/70 shadow-isro tracking-wider uppercase whitespace-nowrap">
            MODULE A
          </span>
          <span className="text-xs sm:text-sm font-display font-bold text-white tracking-wider uppercase">
            Anomaly Detection &amp; Silicon Data Analysis
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${isSim ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 led'}`} />
          <span className="text-slate-400 text-[11px]">
            {isSim ? `LIVE SWEEP ACTIVE: T+${Math.round(simH)}H` : 'HTOL TELEMETRY DAQ'}
          </span>
        </div>
      </div>

      {/* Component Quick Selector & Search Bar */}
      <div className="p-3 bg-[#070D1A] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-[280px]">
          <span className="text-slate-400 font-mono text-[11px]">PART:</span>
          <input
            type="text"
            placeholder="Search Part / Lot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#050B16] border border-slate-700/80 rounded px-2.5 py-1 text-xs text-white font-mono placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          {(['ALL', 'reject', 'monitor', 'safe'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-2 py-0.5 rounded transition-all uppercase ${
                statusFilter === filter
                  ? filter === 'reject'
                    ? 'bg-rose-600 text-white font-bold'
                    : filter === 'monitor'
                    ? 'bg-amber-600 text-white font-bold'
                    : filter === 'safe'
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold'
                  : 'text-slate-400 hover:text-white bg-[#050B16] border border-slate-800'
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
          className="bg-[#050B16] border border-slate-700 text-slate-200 text-xs font-mono rounded px-2 py-1 max-w-[200px] focus:outline-none focus:border-amber-500"
        >
          <option value="" disabled>Select Component ({filteredComponents.length})</option>
          {filteredComponents.slice(0, 100).map((c) => (
            <option key={c.component_id} value={c.component_id}>
              {c.component_id} [{c.status.toUpperCase()}] ({c.v168.toFixed(1)} &mu;A)
            </option>
          ))}
        </select>
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 flex-1 flex flex-col gap-3">
        {/* Selected Component Header Profile */}
        {selected ? (
          <div className="p-3 rounded-lg bg-[#070D1A] border border-slate-800 flex flex-col gap-2.5">
            {/* Top Identity Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 font-mono">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-base md:text-lg font-bold text-white tracking-wide">{selected.component_id}</span>
                <span className="text-slate-400 text-sm">&bull;</span>
                <span className="text-amber-300 text-xs md:text-sm font-semibold">Lot: {selected.lot_id}</span>
                <span className="text-slate-400 text-sm">&bull;</span>
                <button
                  type="button"
                  onClick={() => onSelectSubsystem && onSelectSubsystem(selected.subsystem)}
                  className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold hover:bg-slate-700 transition-colors"
                  title="Filter and highlight subsystem in 3D"
                >
                  [{selected.subsystem}] {loc?.name || selected.subsystem}
                </button>
              </div>

              {/* Status & Decision Tags (Updating Live with Simulation) */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-md text-xs font-bold border transition-all ${
                    liveStatus === 'reject'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : liveStatus === 'monitor'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {isSim ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      LIVE DAQ &bull; RISK {liveRiskScore}/100
                    </span>
                  ) : (
                    `${selected.status.toUpperCase()} • RISK ${selected.risk_score}/100`
                  )}
                </span>

                {selected.traditional_decision === 'PASS' && liveStatus === 'reject' ? (
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/40">
                    PASS Spec &bull; REJECT AI
                  </span>
                ) : selected.traditional_decision === 'FAIL' ? (
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    FAIL SPEC
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    PASS SPEC &amp; AI
                  </span>
                )}
              </div>
            </div>

            {/* Satellite Equipment Bay & 3D Coordinates */}
            {loc && (
              <div className="text-xs md:text-sm text-slate-200 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800/90 flex flex-wrap items-center justify-between gap-2 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 uppercase text-xs font-semibold">Location:</span>
                  <span className="text-white font-sans font-bold">{loc.bay}</span>
                  <span className="text-slate-400 font-sans">({loc.deck})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs font-semibold">COORDINATES:</span>
                  <span className="text-amber-300 font-mono font-bold">{formatCoordinates(loc.pos)}</span>
                </div>
              </div>
            )}

            {/* HTOL Telemetry Reading Grid (Live Progressive illumination as line reaches hours) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#050B16] border border-emerald-500/30 flex flex-col">
                <span className="text-xs text-slate-400 uppercase font-semibold">0h Initial</span>
                <span className="text-base font-bold text-slate-100 mt-1 tabular-nums">{selected.v0.toFixed(1)} &mu;A</span>
              </div>

              <div className={`p-2.5 rounded-lg bg-[#050B16] border flex flex-col transition-all ${
                isSim && simH < 24
                  ? 'border-slate-800 opacity-60'
                  : 'border-emerald-500/40'
              }`}>
                <span className="text-xs text-slate-400 uppercase font-semibold">24h Early</span>
                <span className="text-base font-bold text-slate-100 mt-1 tabular-nums">
                  {isSim && simH < 24 ? '--' : `${selected.v24.toFixed(1)} \u00B5A`}
                </span>
              </div>

              <div className={`p-2.5 rounded-lg bg-[#050B16] border flex flex-col transition-all ${
                isSim && simH < 96
                  ? 'border-slate-800 opacity-60'
                  : 'border-emerald-500/40'
              }`}>
                <span className="text-xs text-slate-400 uppercase font-semibold">96h Mid-HTOL</span>
                <span className="text-base font-bold text-slate-100 mt-1 tabular-nums">
                  {isSim && simH < 96 ? '--' : selected.v96 != null ? `${selected.v96.toFixed(1)} \u00B5A` : '--'}
                </span>
              </div>

              <div className={`p-2.5 rounded-lg bg-[#050B16] border flex flex-col transition-all ${
                isSim && simH < 168
                  ? 'border-amber-500/40'
                  : selected.status === 'reject'
                  ? 'border-rose-500/40'
                  : 'border-emerald-500/40'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase font-semibold">168h Final</span>
                  {isSim && simH < 168 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  )}
                </div>
                <span className={`text-base font-bold mt-1 tabular-nums ${
                  isSim && simH < 168
                    ? 'text-amber-300'
                    : selected.status === 'reject'
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }`}>
                  {isSim && simH < 168 ? `${simVal.toFixed(1)} \u00B5A` : `${selected.v168.toFixed(1)} \u00B5A`}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#050B16] border border-slate-800 flex flex-col">
                <span className="text-xs text-slate-400 uppercase font-semibold">Spec Limit</span>
                <span className="text-base font-bold text-rose-400 mt-1 tabular-nums">{(selected.limit_ua || 50).toFixed(1)} &mu;A</span>
              </div>
            </div>

            {/* Outlier & Statistical Analysis Row (Live synchronized) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs md:text-sm font-mono text-slate-200 pt-1.5 border-t border-slate-800/80">
              <div className="flex justify-between bg-slate-900/60 px-3 py-1.5 rounded-lg">
                <span className="text-slate-400">Lot &mu; / &sigma;:</span>
                <span className="text-slate-100 font-bold tabular-nums">
                  {selected.lot_mean?.toFixed(1) ?? '--'} &mu;A &bull; {selected.lot_std?.toFixed(2) ?? '--'}
                </span>
              </div>
              <div className="flex justify-between bg-slate-900/60 px-3 py-1.5 rounded-lg">
                <span className="text-slate-400">Lot z-Score:</span>
                <span className={`font-bold tabular-nums ${
                  liveZ != null && Math.abs(liveZ) > 2 ? 'text-rose-400' : 'text-amber-300'
                }`}>
                  {liveZ != null ? `${liveZ > 0 ? '+' : ''}${liveZ.toFixed(2)}σ` : '--'}
                  {isSim && ' (live)'}
                </span>
              </div>
              <div className="flex justify-between bg-slate-900/60 px-3 py-1.5 rounded-lg">
                <span className="text-slate-400">Isolation Score:</span>
                <span className="text-purple-300 font-bold tabular-nums">
                  {selected.iso_score != null ? `${(selected.iso_score * 100).toFixed(1)}%` : '--'}
                </span>
              </div>
            </div>

            {/* AI Diagnostics & Failure Physics */}
            {selected.reason && (
              <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs md:text-sm text-slate-200 flex items-start gap-2.5">
                <span className="text-amber-400 font-bold font-mono text-xs md:text-sm uppercase whitespace-nowrap">
                  Physics Diagnosis:
                </span>
                <span className="text-xs md:text-[13.5px] text-slate-200 font-sans leading-relaxed">
                  {selected.reason}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 bg-[#070D1A] rounded-lg border border-slate-800">
            No component selected. Ingest data or pick a component above to inspect Module A Silicon Telemetry.
          </div>
        )}

        {/* Module A Dedicated Graph: Parametric Waveform Oscilloscope */}
        <div className="mt-1">
          <ModuleAAnomalyGraph component={selected} onSimUpdate={setSimData} />
        </div>
      </div>

      {/* Module A Bezel Bottom Bar */}
      <div className="bg-[#070D1A] border-t border-slate-800 px-4 py-2 text-xs text-slate-400 flex justify-between font-mono">
        <span>DAQ Sampling: 24-Bit Sigma-Delta ADC @ 125&deg;C HTOL</span>
        <span className="text-slate-300">
          Evaluated: {components.length} components
        </span>
      </div>
    </div>
  )
}

