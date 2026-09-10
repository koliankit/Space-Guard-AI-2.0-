import React, { useState, useMemo } from 'react'
import type { ComponentOut, SubsystemStatus } from '../../types'
import { getSubsystemLocation, formatCoordinates } from '../../utils/satelliteLocations'
import { sounds } from '../../utils/soundEffects'

interface LotArchitectureViewProps {
  components: ComponentOut[]
  subsystems?: SubsystemStatus[]
  onSelectComponent: (id: string) => void
  onFocusSubsystem: (subKey: string) => void
  onFocusIn3D?: (comp: ComponentOut) => void
  onRunScreening?: () => void
  running?: boolean
  selectedId?: string | null
}

export default function LotArchitectureView({
  components,
  onSelectComponent,
  onFocusSubsystem,
  onFocusIn3D,
  onRunScreening,
  running = false,
  selectedId,
}: LotArchitectureViewProps) {
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SAFE' | 'MONITOR' | 'REJECT'>('ALL')
  const [subsystemFilter, setSubsystemFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const isScreened = useMemo(() => {
    return components.some(
      (c) => c.status === 'reject' || c.status === 'monitor' || (c.status === 'safe' && (c.risk_score > 0 || c.z168 !== 0))
    )
  }, [components])

  // Group components by qualification lot
  const lotGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        lot_id: string
        parts: ComponentOut[]
        total: number
        safeCount: number
        monitorCount: number
        rejectCount: number
        mean: number
        std: number
        subsystemCounts: Record<string, number>
        subsystems: string[]
      }
    >()

    components.forEach((c) => {
      const lot = c.lot_id || 'UNKNOWN-LOT'
      let item = map.get(lot)
      if (!item) {
        item = {
          lot_id: lot,
          parts: [],
          total: 0,
          safeCount: 0,
          monitorCount: 0,
          rejectCount: 0,
          mean: c.lot_mean ?? 0,
          std: c.lot_std ?? 0,
          subsystemCounts: {},
          subsystems: [],
        }
        map.set(lot, item)
      }
      item.parts.push(c)
      item.total++
      const sub = c.subsystem || 'FC'
      item.subsystemCounts[sub] = (item.subsystemCounts[sub] || 0) + 1
      if (!item.subsystems.includes(sub)) {
        item.subsystems.push(sub)
      }
      if (c.status === 'reject') item.rejectCount++
      else if (c.status === 'monitor') item.monitorCount++
      else if (c.status === 'safe') item.safeCount++
    })

    return Array.from(map.values())
      .map((lot) => {
        const mean =
          lot.mean ||
          (lot.parts.length > 0 ? lot.parts.reduce((a, b) => a + (b.v168 || 0), 0) / lot.parts.length : 0)
        return { ...lot, mean }
      })
      .sort((a, b) => a.lot_id.localeCompare(b.lot_id))
  }, [components])

  // Select first lot by default if none selected
  const activeLot = useMemo(() => {
    if (selectedLotId) {
      return lotGroups.find((l) => l.lot_id === selectedLotId) || lotGroups[0] || null
    }
    return lotGroups[0] || null
  }, [lotGroups, selectedLotId])

  // Filter components in active lot
  const displayedComponents = useMemo(() => {
    if (!activeLot) return []
    let list = activeLot.parts

    if (statusFilter !== 'ALL') {
      const target = statusFilter.toLowerCase()
      list = list.filter((p) => p.status === target)
    }

    if (subsystemFilter !== 'ALL') {
      list = list.filter((p) => p.subsystem === subsystemFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (p) =>
          p.component_id.toLowerCase().includes(q) ||
          p.subsystem?.toLowerCase().includes(q) ||
          p.subsystem_name?.toLowerCase().includes(q) ||
          getSubsystemLocation(p.subsystem).bay.toLowerCase().includes(q)
      )
    }

    return list
  }, [activeLot, statusFilter, subsystemFilter, searchQuery])

  // Overall totals across entire dataset
  const totalComponents = components.length
  const totalLots = lotGroups.length
  const totalRejects = lotGroups.reduce((acc, l) => acc + l.rejectCount, 0)
  const totalMonitors = lotGroups.reduce((acc, l) => acc + l.monitorCount, 0)
  const totalSafe = lotGroups.reduce((acc, l) => acc + l.safeCount, 0)

  // Export Active Lot CSV
  const handleExportLotCSV = () => {
    if (!activeLot) return
    sounds.playSuccess()
    const headers = [
      'Component ID',
      'Qualification Lot',
      'Subsystem Key',
      'Subsystem Name',
      'Equipment Bay',
      'Chassis Deck',
      '3D Coordinates',
      '0h (uA)',
      '24h (uA)',
      '168h (uA)',
      'Lot Mean (uA)',
      'Z-Score',
      'AI Status',
      'Risk Score',
    ]
    const rows = activeLot.parts.map((p) => {
      const loc = getSubsystemLocation(p.subsystem)
      return [
        p.component_id,
        p.lot_id,
        p.subsystem,
        loc.name,
        loc.bay,
        loc.deck,
        formatCoordinates(loc.pos),
        p.v0?.toFixed(2) ?? '',
        p.v24?.toFixed(2) ?? '',
        p.v168?.toFixed(2) ?? '',
        p.lot_mean?.toFixed(2) ?? activeLot.mean.toFixed(2),
        p.z168?.toFixed(2) ?? '',
        p.status ? p.status.toUpperCase() : 'PENDING_SCREENING',
        p.risk_score ?? '',
      ]
    })
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Lot_${activeLot.lot_id}_Components_Locations.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col flex-1 bg-[#060913] text-slate-100 font-sans p-4 gap-4 select-none min-h-[calc(100vh-140px)]">
      {/* Top Banner: Header and Key Metrics */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-xl text-sky-400 shadow-inner">
            📦
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-white tracking-wide uppercase font-mono m-0">
                Lot-Wise Component Architecture &amp; Physical Spacecraft Allocation
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                {totalLots} QUALIFICATION LOTS &bull; {totalComponents} COMPONENTS
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0 mt-0.5">
              Tracks the number of components per qualification lot, their physical equipment bay, equipment deck, and 3D satellite chassis coordinates.
            </p>
          </div>
        </div>

        {/* Global Summary Metric Cards */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-lg bg-[#070D1A] border border-slate-800 text-center min-w-[100px]">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Lots</div>
            <div className="text-base font-bold font-mono text-sky-400 mt-0.5">{totalLots}</div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#070D1A] border border-slate-800 text-center min-w-[110px]">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Parts</div>
            <div className="text-base font-bold font-mono text-white mt-0.5">{totalComponents}</div>
          </div>
          {isScreened ? (
            <>
              <div className="px-3 py-1.5 rounded-lg bg-[#070D1A] border border-emerald-500/30 text-center min-w-[90px]">
                <div className="text-[10px] text-emerald-400 uppercase font-semibold">Flight Safe</div>
                <div className="text-base font-bold font-mono text-emerald-300 mt-0.5">{totalSafe}</div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#070D1A] border border-amber-500/30 text-center min-w-[90px]">
                <div className="text-[10px] text-amber-400 uppercase font-semibold">Monitor</div>
                <div className="text-base font-bold font-mono text-amber-300 mt-0.5">{totalMonitors}</div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#070D1A] border border-rose-500/30 text-center min-w-[100px]">
                <div className="text-[10px] text-rose-400 uppercase font-semibold">Quarantine</div>
                <div className="text-base font-bold font-mono text-rose-400 mt-0.5">{totalRejects}</div>
              </div>
            </>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-sky-950/40 border border-sky-500/40 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 led" />
              <div className="text-left">
                <div className="text-[10px] text-sky-300 uppercase font-bold">Awaiting AI Screening</div>
                <div className="text-[11px] text-slate-300">100% components localized to satellite bays</div>
              </div>
              {onRunScreening && (
                <button
                  type="button"
                  disabled={running}
                  onClick={() => {
                    sounds.playPing()
                    onRunScreening()
                  }}
                  className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase shadow-sm transition-all ml-1 cursor-pointer"
                >
                  {running ? 'Screening...' : '⚡ Execute AI Screening'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main 2-Column Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 flex-1">
        {/* Left Column: Qualification Lots Selector Cards */}
        <div className="flex flex-col bg-[#090F1E] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="bg-[#0F172A] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
              <span>📦</span> Qualification Lots ({lotGroups.length})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Select lot to inspect</span>
          </div>

          <div className="p-3 overflow-y-auto flex-1 space-y-2.5 max-h-[calc(100vh-280px)]">
            {lotGroups.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No qualification lots loaded. Upload a CSV file or load an ISRO flight batch to inspect.
              </div>
            ) : (
              lotGroups.map((lot) => {
                const isSelected = activeLot?.lot_id === lot.lot_id
                const pctOfTotal = ((lot.total / (totalComponents || 1)) * 100).toFixed(1)
                const isRej = lot.rejectCount > 0
                const isMon = lot.monitorCount > 0

                return (
                  <div
                    key={lot.lot_id}
                    onClick={() => {
                      sounds.playClick()
                      setSelectedLotId(lot.lot_id)
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-400 shadow-md ring-1 ring-sky-400/50'
                        : isRej
                        ? 'bg-[#150A10] border-rose-900/50 hover:border-rose-700 hover:bg-[#1A0C14]'
                        : 'bg-[#070D1A] border-slate-800 hover:border-slate-700 hover:bg-[#0D162B]'
                    }`}
                  >
                    {/* Header: Lot ID and Status Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isRej ? 'bg-rose-500 led' : isMon ? 'bg-amber-400' : isScreened ? 'bg-emerald-400' : 'bg-sky-400'
                          }`}
                        />
                        <span className="font-mono font-bold text-xs text-white tracking-wide">
                          {lot.lot_id}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          isRej
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isMon
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : isScreened
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {isRej
                          ? `${lot.rejectCount} REJECT`
                          : isMon
                          ? `${lot.monitorCount} MONITOR`
                          : isScreened
                          ? 'ALL NOMINAL'
                          : 'INGESTED'}
                      </span>
                    </div>

                    {/* Lot Stats: Total Components and Baseline */}
                    <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-2">
                      <span>
                        Size: <b className="text-white font-bold">{lot.total} parts</b> ({pctOfTotal}%)
                      </span>
                      <span className="text-slate-400">
                        Baseline &mu;: <b className="text-sky-300 font-bold">{lot.mean.toFixed(1)} &mu;A</b>
                      </span>
                    </div>

                    {/* Subsystem Location Distribution Tag Pills */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1 flex justify-between">
                        <span>Allocated Subsystems:</span>
                        <span className="text-slate-300 font-mono">{lot.subsystems.length} bays</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(lot.subsystemCounts).map(([sub, count]) => {
                          const loc = getSubsystemLocation(sub)
                          return (
                            <span
                              key={sub}
                              className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-slate-900 border border-slate-700/80 text-slate-300 flex items-center gap-1"
                              title={`${count} components in ${loc.name} (${loc.bay})`}
                            >
                              <b className="text-cyan font-bold">[{sub}]</b>
                              <span>{count}</span>
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    {/* Health Distribution Bar (if screened) */}
                    {isScreened && (
                      <div className="mt-2.5">
                        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden flex mb-1">
                          <div
                            style={{ width: `${(lot.safeCount / (lot.total || 1)) * 100}%` }}
                            className="bg-emerald-500 h-full"
                          />
                          <div
                            style={{ width: `${(lot.monitorCount / (lot.total || 1)) * 100}%` }}
                            className="bg-amber-500 h-full"
                          />
                          <div
                            style={{ width: `${(lot.rejectCount / (lot.total || 1)) * 100}%` }}
                            className="bg-rose-500 h-full"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                          <span className="text-emerald-400">{lot.safeCount} Safe</span>
                          <span className="text-amber-400">{lot.monitorCount} Monitor</span>
                          <span className="text-rose-400 font-bold">{lot.rejectCount} Quarantine</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Lot Deep Dive & Component Location Table */}
        <div className="flex flex-col bg-[#090F1E] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          {activeLot ? (
            <>
              {/* Active Lot Header & Location Allocation Summary */}
              <div className="bg-[#0F172A] p-4 border-b border-slate-800 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-mono font-bold text-white bg-sky-500/20 px-2.5 py-0.5 rounded border border-sky-500/40">
                        ACTIVE QUALIFICATION LOT: {activeLot.lot_id}
                      </span>
                      <span className="text-xs font-mono text-slate-300">
                        &bull; <b className="text-emerald-400 font-bold">{activeLot.total} components</b> across{' '}
                        <b className="text-sky-300">{activeLot.subsystems.length} equipment bays</b>
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-sans">
                      MIL-STD-883 HTOL 168h Burn-In Baseline &mu; ={' '}
                      <b className="text-cyan font-mono">{activeLot.mean.toFixed(2)} &micro;A</b> &bull; &sigma; ={' '}
                      <b className="text-slate-300 font-mono">{activeLot.std.toFixed(2)}</b> &bull; Status:{' '}
                      <span className="font-mono font-bold text-white">
                        {activeLot.rejectCount > 0
                          ? `⚠️ ${activeLot.rejectCount} DEFECTS QUARANTINED`
                          : activeLot.monitorCount > 0
                          ? '🟡 DRIFT MONITORING ACTIVE'
                          : isScreened
                          ? '🟢 100% FLIGHT NOMINAL'
                          : '🔵 AWAITING AI SCREENING'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportLotCSV}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 bg-[#070D1A] text-slate-200 hover:text-white hover:border-slate-500 text-xs font-medium transition-colors flex items-center gap-1.5"
                      title="Download CSV report of components in this lot"
                    >
                      <span>📥</span> Export Lot CSV
                    </button>
                  </div>
                </div>

                {/* Subsystem Location Allocation Breakdown Pills */}
                <div className="bg-[#070D1A] p-2.5 rounded-lg border border-slate-800 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Where Components Locate:
                  </span>
                  {Object.entries(activeLot.subsystemCounts).map(([subKey, count]) => {
                    const loc = getSubsystemLocation(subKey)
                    const isFiltered = subsystemFilter === subKey
                    return (
                      <button
                        key={subKey}
                        type="button"
                        onClick={() => {
                          sounds.playClick()
                          setSubsystemFilter(isFiltered ? 'ALL' : subKey)
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all border flex items-center gap-1.5 cursor-pointer ${
                          isFiltered
                            ? 'bg-sky-600 border-sky-400 text-white font-bold shadow-sm'
                            : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                        title={`Click to filter by ${loc.name} (${loc.bay})`}
                      >
                        <span className="font-bold text-cyan">[{subKey}]</span>
                        <span className="text-white font-semibold">{count} in {loc.name}</span>
                        <span className="text-[10px] text-slate-400 hidden xl:inline">({loc.bay})</span>
                      </button>
                    )
                  })}
                  {subsystemFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setSubsystemFilter('ALL')}
                      className="text-[10px] text-sky-400 hover:underline px-1"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {/* Status Filters (if screened) */}
                  {isScreened && (
                    <div className="flex items-center gap-1 bg-[#060B16] p-0.5 rounded-lg border border-slate-800 text-xs font-mono">
                      {[
                        { id: 'ALL', label: `ALL (${activeLot.total})` },
                        { id: 'SAFE', label: `SAFE (${activeLot.safeCount})` },
                        { id: 'MONITOR', label: `MON (${activeLot.monitorCount})` },
                        { id: 'REJECT', label: `REJ (${activeLot.rejectCount})` },
                      ].map((tab) => {
                        const isTabActive = statusFilter === tab.id
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              sounds.playClick()
                              setStatusFilter(tab.id as any)
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                              isTabActive
                                ? tab.id === 'SAFE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                                  : tab.id === 'REJECT'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                                  : tab.id === 'MONITOR'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Component Search Input */}
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <span className="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
                    <input
                      type="text"
                      placeholder="Search Part ID or Location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#060B16] border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-sky-500 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Components Table with Full Satellite Location Columns */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead className="bg-[#070D1A] text-[10px] text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Part ID</th>
                      <th className="py-2.5 px-2 font-semibold">Subsystem</th>
                      <th className="py-2.5 px-2 font-semibold">Physical Equipment Bay</th>
                      <th className="py-2.5 px-2 font-semibold">Satellite Deck</th>
                      <th className="py-2.5 px-2 font-semibold">3D Pos [X, Y, Z]</th>
                      <th className="py-2.5 px-2 font-semibold">168h Telemetry</th>
                      <th className="py-2.5 px-2 font-semibold">Lot &mu;</th>
                      <th className="py-2.5 px-2 font-semibold">Z-Score</th>
                      <th className="py-2.5 px-2 font-semibold">Status</th>
                      <th className="py-2.5 px-2 font-semibold">Risk</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {displayedComponents.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-400 text-xs italic font-sans">
                          No components match the selected filter in Lot {activeLot.lot_id}.
                        </td>
                      </tr>
                    ) : (
                      displayedComponents.map((c) => {
                        const isSelected = selectedId === c.component_id
                        const loc = getSubsystemLocation(c.subsystem)
                        const isRej = c.status === 'reject'
                        const isMon = c.status === 'monitor'

                        return (
                          <tr
                            key={c.component_id}
                            onClick={() => onSelectComponent(c.component_id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-sky-500/20 text-white font-bold'
                                : isRej
                                ? 'bg-rose-950/15 hover:bg-rose-950/30'
                                : isMon
                                ? 'bg-amber-950/10 hover:bg-amber-950/20'
                                : 'hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  isRej
                                    ? 'bg-rose-500 led'
                                    : isMon
                                    ? 'bg-amber-400'
                                    : isScreened
                                    ? 'bg-emerald-400'
                                    : 'bg-sky-400'
                                }`}
                              />
                              <span className="font-mono">{c.component_id}</span>
                            </td>
                            <td className="py-2 px-2 text-cyan font-bold whitespace-nowrap">
                              [{c.subsystem}] {loc.name}
                            </td>
                            <td className="py-2 px-2 text-slate-200 font-sans font-medium whitespace-nowrap">
                              {loc.bay}
                            </td>
                            <td className="py-2 px-2 text-slate-400 font-sans whitespace-nowrap">
                              {loc.deck}
                            </td>
                            <td className="py-2 px-2 text-slate-400 text-[11px] whitespace-nowrap font-mono">
                              {formatCoordinates(loc.pos)}
                            </td>
                            <td
                              className={`py-2 px-2 font-mono ${
                                isRej ? 'text-rose-400 font-bold' : isMon ? 'text-amber-400' : 'text-slate-200'
                              }`}
                            >
                              {c.v168?.toFixed(1) ?? '--'}&mu;A
                            </td>
                            <td className="py-2 px-2 text-slate-400 font-mono">
                              {c.lot_mean != null ? `${c.lot_mean.toFixed(1)}` : `${activeLot.mean.toFixed(1)}`}
                            </td>
                            <td
                              className={`py-2 px-2 font-mono ${
                                isRej ? 'text-rose-400 font-bold' : 'text-slate-300'
                              }`}
                            >
                              {c.z168 != null ? `${c.z168 > 0 ? '+' : ''}${c.z168.toFixed(2)}σ` : '--'}
                            </td>
                            <td className="py-2 px-2">
                              {c.status ? (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    isRej
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      : isMon
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  }`}
                                >
                                  {c.status}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                  INGESTED
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 font-mono font-bold text-white">
                              {c.risk_score ?? '--'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  sounds.playPing()
                                  onSelectComponent(c.component_id)
                                  if (onFocusIn3D) onFocusIn3D(c)
                                  else onFocusSubsystem(c.subsystem)
                                }}
                                className="px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 hover:text-white border border-sky-500/30 text-[10px] font-semibold transition-all cursor-pointer"
                                title="Locate in 3D Spacecraft View"
                              >
                                🎯 Locate in 3D
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs italic">
              Select a qualification lot to view component locations and flight allocations.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
