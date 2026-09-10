import React, { useState, useMemo, useEffect } from 'react'
import type { ComponentOut } from '../../types'
import { sounds } from '../../utils/soundEffects'
import * as api from '../../api'
import { getSubsystemLocation, formatCoordinates } from '../../utils/satelliteLocations'

interface LotClassificationModalProps {
  isOpen: boolean
  onClose: () => void
  components: ComponentOut[]
  batchId?: number | null
  activeMissionName?: string
  initialLotId?: string | null
  onSelectComponent?: (id: string) => void
  onFocusSubsystem?: (key: string) => void
}

interface LotSummary {
  lot_id: string
  parts: ComponentOut[]
  total: number
  safeCount: number
  monitorCount: number
  rejectCount: number
  mean: number
  std: number
  subsystems: string[]
  subsystemCounts: Record<string, number>
  status: 'safe' | 'monitor' | 'reject'
}

export default function LotClassificationModal({
  isOpen,
  onClose,
  components: initialComponents,
  batchId,
  activeMissionName = 'Gaganyaan Flight Batch',
  initialLotId,
  onSelectComponent,
  onFocusSubsystem,
}: LotClassificationModalProps) {
  const [components, setComponents] = useState<ComponentOut[]>(initialComponents)
  const [selectedLotId, setSelectedLotId] = useState<string | null>(initialLotId || null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SAFE' | 'MONITOR' | 'REJECT'>('ALL')
  const [subsystemFilter, setSubsystemFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedLotId, setCopiedLotId] = useState<string | null>(null)

  // Sync components from props
  useEffect(() => {
    if (initialComponents && initialComponents.length > 0) {
      setComponents(initialComponents)
    }
  }, [initialComponents])

  // Fallback: If components list is empty but batchId exists, fetch components directly
  useEffect(() => {
    if (isOpen && (!components || components.length === 0) && batchId) {
      api.listComponents(batchId, { limit: 1000 }).then((res) => {
        if (res?.components?.length) {
          setComponents(res.components)
        }
      }).catch((e) => {
        console.warn('Could not fetch components for lot modal:', e)
      })
    }
  }, [isOpen, batchId, components])

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Group all components by qualification lot
  const lotGroups = useMemo<LotSummary[]>(() => {
    const map = new Map<string, ComponentOut[]>()
    components.forEach((c) => {
      const lot = c.lot_id || 'UNKNOWN-LOT'
      if (!map.has(lot)) map.set(lot, [])
      map.get(lot)!.push(c)
    })

    return Array.from(map.entries())
      .map(([lot_id, parts]) => {
        const safeCount = parts.filter((p) => p.status === 'safe').length
        const monitorCount = parts.filter((p) => p.status === 'monitor').length
        const rejectCount = parts.filter((p) => p.status === 'reject').length
        const mean =
          parts[0]?.lot_mean ??
          (parts.length > 0 ? parts.reduce((acc, p) => acc + (p.v168 ?? 0), 0) / parts.length : 0)
        const std =
          parts[0]?.lot_std ??
          (parts.length > 1
            ? Math.sqrt(
                parts.reduce((acc, p) => acc + Math.pow((p.v168 ?? 0) - mean, 2), 0) /
                  (parts.length - 1),
              )
            : 0)
        const subsystemCounts: Record<string, number> = {}
        parts.forEach((p) => {
          const sub = p.subsystem || 'FC'
          subsystemCounts[sub] = (subsystemCounts[sub] || 0) + 1
        })
        const subsystems = Object.keys(subsystemCounts)
        const status: 'safe' | 'monitor' | 'reject' =
          rejectCount > 0 ? 'reject' : monitorCount > 0 ? 'monitor' : 'safe'

        return {
          lot_id,
          parts,
          total: parts.length,
          safeCount,
          monitorCount,
          rejectCount,
          mean,
          std,
          subsystems,
          subsystemCounts,
          status,
        }
      })
      .sort((a, b) => a.lot_id.localeCompare(b.lot_id))
  }, [components])

  // Auto-select first lot if none selected
  useEffect(() => {
    if (lotGroups.length > 0 && !selectedLotId) {
      setSelectedLotId(lotGroups[0].lot_id)
    }
  }, [lotGroups, selectedLotId])

  // Active selected lot
  const activeLot = useMemo(() => {
    if (!selectedLotId && lotGroups.length > 0) return lotGroups[0]
    return lotGroups.find((l) => l.lot_id === selectedLotId) || lotGroups[0] || null
  }, [lotGroups, selectedLotId])

  // Filter components in active lot
  const displayedLotComponents = useMemo(() => {
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
          p.subsystem_name?.toLowerCase().includes(q),
      )
    }

    return list
  }, [activeLot, statusFilter, subsystemFilter, searchQuery])

  // Overall totals across all lots
  const totalParts = components.length
  const totalLots = lotGroups.length
  const totalSafe = lotGroups.reduce((acc, l) => acc + l.safeCount, 0)
  const totalMonitor = lotGroups.reduce((acc, l) => acc + l.monitorCount, 0)
  const totalReject = lotGroups.reduce((acc, l) => acc + l.rejectCount, 0)

  // Export Active Lot CSV
  const handleExportLotCSV = () => {
    if (!activeLot) return
    sounds.playSuccess()
    const headers = [
      'Component ID',
      'Qualification Lot',
      'Subsystem',
      '0h (uA)',
      '24h (uA)',
      '168h (uA)',
      'Delta Drift (uA)',
      'Lot Mean (uA)',
      'Z-Score (sigma)',
      'Status',
    ]
    const rows = activeLot.parts.map((p) => [
      p.component_id,
      p.lot_id,
      p.subsystem,
      p.v0?.toFixed(2) ?? '',
      p.v24?.toFixed(2) ?? '',
      p.v168?.toFixed(2) ?? '',
      ((p.v168 ?? 0) - (p.v0 ?? 0)).toFixed(2),
      p.lot_mean?.toFixed(2) ?? activeLot.mean.toFixed(2),
      p.z168?.toFixed(2) ?? '',
      p.status ? p.status.toUpperCase() : 'INGESTED',
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Lot_${activeLot.lot_id}_Components.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      {/* Modal Container */}
      <div className="bg-[#060B16] border border-isro-amber/40 rounded-lg w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden reticle-corner">
        {/* Top Header Bar */}
        <div className="px-6 py-3.5 border-b border-line bg-[#091120] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-isro-amber led shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="m-0 text-base font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
                  <span>📦 FLIGHT QUALIFICATION LOTS CLASSIFICATION</span>
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-isro-amber/20 text-isro-amber border border-isro-amber/40 font-bold">
                  {totalLots} FLIGHT LOTS &bull; {totalParts} TOTAL COMPONENTS
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                MIL-STD-883 Method 1005 HTOL Burn-in Screening &bull; Lot-Wise Component Architecture &amp; Quarantine Breakdown
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300 font-mono hidden sm:inline-block bg-[#070D1A] px-2.5 py-1 rounded border border-slate-800">
              🛰️ {activeMissionName}
            </span>
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                onClose()
              }}
              className="w-8 h-8 rounded-lg bg-[#070D1A] border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white flex items-center justify-center text-lg transition-colors cursor-pointer"
              title="Close window (Esc)"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Global Dataset Metric Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-6 py-2.5 bg-[#060B16] border-b border-slate-800/80 text-xs font-mono">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#0A1122] border border-slate-800">
            <span className="text-slate-400 text-[11px] font-sans">Total Lots:</span>
            <span className="text-white font-bold text-sm">{totalLots} Lots</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#0A1122] border border-slate-800">
            <span className="text-slate-400 text-[11px] font-sans">Classified Parts:</span>
            <span className="text-slate-100 font-bold text-sm">{totalParts} Pts</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#0A1122] border border-emerald-900/40">
            <span className="text-emerald-400 text-[11px] font-sans">Flight Safe:</span>
            <span className="text-emerald-300 font-bold text-sm">{totalSafe}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#0A1122] border border-amber-900/40">
            <span className="text-amber-400 text-[11px] font-sans">Drift Monitor:</span>
            <span className="text-amber-300 font-bold text-sm">{totalMonitor}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#0A1122] border border-rose-900/40 col-span-2 sm:col-span-1">
            <span className="text-rose-400 text-[11px] font-sans">Quarantined:</span>
            <span className="text-rose-300 font-bold text-sm">{totalReject}</span>
          </div>
        </div>

        {/* Main Body: 2-Panel Master-Detail Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Lots List & Selector */}
          <div className="w-full md:w-[320px] lg:w-[360px] border-b md:border-b-0 md:border-r border-slate-800 bg-[#070D1A] flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-800 bg-[#0A1224] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
                <span>📦</span> QUALIFICATION LOTS ({lotGroups.length})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Select to inspect</span>
            </div>

            {/* Lots Scroll List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {lotGroups.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs italic">
                  No qualification lots found in current telemetry dataset.
                </div>
              ) : (
                lotGroups.map((lot) => {
                  const isSelected = activeLot?.lot_id === lot.lot_id
                  const isRej = lot.rejectCount > 0
                  const isMon = lot.monitorCount > 0

                  return (
                    <div
                      key={lot.lot_id}
                      onClick={() => {
                        sounds.playClick()
                        setSelectedLotId(lot.lot_id)
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-white/10 border-white shadow-md ring-1 ring-white/30'
                          : isRej
                          ? 'bg-[#150A10] border-rose-900/50 hover:border-rose-700 hover:bg-[#1A0C14]'
                          : 'bg-[#0B1326] border-slate-800 hover:border-slate-700 hover:bg-[#0F1A33]'
                      }`}
                    >
                      {/* Lot Header: ID and Status */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isRej ? 'bg-rose-500' : isMon ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                          />
                          <span className="font-mono font-bold text-xs text-white">
                            {lot.lot_id}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            isRej
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isMon
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {isRej ? `${lot.rejectCount} REJECT` : isMon ? `${lot.monitorCount} MONITOR` : 'ALL SAFE'}
                        </span>
                      </div>

                      {/* Metrics: Part count & Baseline */}
                      <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-300 mb-2">
                        <span>
                          Total: <b className="text-white">{lot.total} components</b>
                        </span>
                        <span className="text-slate-400">
                          Mean: <b className="text-slate-100">{lot.mean.toFixed(1)} &mu;A</b>
                        </span>
                      </div>

                      {/* Visual Health Distribution Bar */}
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden flex mb-1.5">
                        <div
                          style={{ width: `${(lot.safeCount / (lot.total || 1)) * 100}%` }}
                          className="bg-emerald-500 h-full"
                          title={`${lot.safeCount} Safe`}
                        />
                        <div
                          style={{ width: `${(lot.monitorCount / (lot.total || 1)) * 100}%` }}
                          className="bg-amber-500 h-full"
                          title={`${lot.monitorCount} Monitor`}
                        />
                        <div
                          style={{ width: `${(lot.rejectCount / (lot.total || 1)) * 100}%` }}
                          className="bg-rose-500 h-full"
                          title={`${lot.rejectCount} Reject`}
                        />
                      </div>

                      {/* Breakdown Text */}
                      <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400">
                        <span className="text-emerald-400">{lot.safeCount} Safe</span>
                        <span className="text-amber-400">{lot.monitorCount} Mon</span>
                        <span className="text-rose-400">{lot.rejectCount} Rej</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Panel: Selected Lot Deep Dive & Components Table */}
          <div className="flex-1 bg-[#090F1E] flex flex-col overflow-hidden">
            {activeLot ? (
              <>
                {/* Active Lot Header Info Card */}
                <div className="p-4 border-b border-slate-800 bg-[#0C152B]">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-mono font-bold text-white bg-white/10 px-2.5 py-0.5 rounded border border-white/20">
                          QUALIFICATION LOT: {activeLot.lot_id}
                        </span>
                        <span className="text-xs font-mono text-slate-300">
                          &bull; <b className="text-emerald-400 font-bold">{activeLot.total} flight parts</b> allocated
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 font-sans">
                        MIL-STD-883 HTOL 168h Burn-In Baseline &mu; ={' '}
                        <b className="text-isro-amber font-mono">{activeLot.mean.toFixed(2)} &micro;A</b> &bull; &sigma; ={' '}
                        <b className="text-slate-300 font-mono">{activeLot.std.toFixed(2)}</b> &bull; Subsystems:{' '}
                        <span className="text-white font-mono font-semibold">
                          {activeLot.subsystems.map((s) => `[${s}]`).join(' ')}
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

                  {/* Where Components Locate Breakdown Tags */}
                  <div className="bg-[#070D1A] p-2 rounded-lg border border-slate-800 flex flex-wrap items-center gap-1.5 my-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mr-1">
                      Where Parts Locate:
                    </span>
                    {Object.entries(activeLot.subsystemCounts).map(([subKey, count]) => {
                      const loc = getSubsystemLocation(subKey)
                      const isFiltered = subsystemFilter === subKey
                      return (
                        <button
                          key={subKey}
                          type="button"
                          onClick={() => setSubsystemFilter(isFiltered ? 'ALL' : subKey)}
                          className={`px-2 py-0.5 rounded text-[10.5px] font-mono transition-all border flex items-center gap-1 cursor-pointer ${
                            isFiltered
                              ? 'bg-isro-amber/30 border-isro-amber text-isro-amber font-bold'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-isro-amber hover:text-white'
                          }`}
                          title={`Click to filter by ${loc.name} (${loc.bay})`}
                        >
                          <span className="font-bold text-isro-amber">[{subKey}]</span>
                          <span>{count} in {loc.name}</span>
                          <span className="text-[9px] text-slate-400">({loc.bay})</span>
                        </button>
                      )
                    })}
                    {subsystemFilter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setSubsystemFilter('ALL')}
                        className="text-[10px] text-slate-200 hover:text-white hover:underline px-1"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>

                  {/* Component Filter Tools Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80">
                    {/* Status Filter Pills */}
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
                                  : 'bg-white/20 text-white border border-white/50'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Subsystem Filter Dropdown */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">Subsystem:</span>
                      <select
                        value={subsystemFilter}
                        onChange={(e) => setSubsystemFilter(e.target.value)}
                        className="bg-[#060B16] border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 font-mono focus:border-white outline-none"
                      >
                        <option value="ALL">All Subsystems</option>
                        {activeLot.subsystems.map((s) => (
                          <option key={s} value={s}>
                            [{s}] {getSubsystemLocation(s).name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Component Search Input */}
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                      <span className="absolute left-2.5 top-1.5 text-slate-500 text-xs">🔍</span>
                      <input
                        type="text"
                        placeholder="Search Component ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-3 py-1 bg-[#060B16] border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-white outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Components Table in Active Lot */}
                <div className="flex-1 overflow-y-auto">
                  {displayedLotComponents.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-xs italic font-mono">
                      No components match the selected filter in Lot {activeLot.lot_id}.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 bg-[#070D1A] text-[10px] text-slate-400 uppercase tracking-wider sticky top-0 z-10 font-mono">
                          <th className="py-2 px-3 font-semibold">Component ID</th>
                          <th className="py-2 px-2 font-semibold">Subsystem &amp; Bay Location</th>
                          <th className="py-2 px-2 font-semibold">3D Pos</th>
                          <th className="py-2 px-2 font-semibold">0h (&mu;A)</th>
                          <th className="py-2 px-2 font-semibold">24h (&mu;A)</th>
                          <th className="py-2 px-2 font-semibold">168h (&mu;A)</th>
                          <th className="py-2 px-2 font-semibold">&Delta; Drift</th>
                          <th className="py-2 px-2 font-semibold">Z-Score</th>
                          <th className="py-2 px-2 font-semibold">Classification</th>
                          <th className="py-2 px-3 text-right font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {displayedLotComponents.map((c) => {
                          const isRej = c.status === 'reject'
                          const isMon = c.status === 'monitor'
                          const delta = (c.v168 ?? 0) - (c.v0 ?? 0)
                          const loc = getSubsystemLocation(c.subsystem)

                          return (
                            <tr
                              key={c.component_id}
                              className={`transition-colors hover:bg-slate-800/40 ${
                                isRej ? 'bg-rose-950/15' : isMon ? 'bg-amber-950/10' : ''
                              }`}
                            >
                              <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    isRej ? 'bg-rose-500' : isMon ? 'bg-amber-400' : 'bg-emerald-400'
                                  }`}
                                />
                                <span className="hover:text-white transition-colors">
                                  {c.component_id}
                                </span>
                              </td>
                              <td className="py-2 px-2 font-bold text-white whitespace-nowrap">
                                [{c.subsystem}] {loc.name} &bull; <span className="text-slate-300 font-sans font-normal">{loc.bay}</span>
                              </td>
                              <td className="py-2 px-2 text-slate-400 text-[10px] whitespace-nowrap">
                                {formatCoordinates(loc.pos)}
                              </td>
                              <td className="py-2 px-2.5 text-slate-300">
                                {c.v0?.toFixed(1) ?? '--'}
                              </td>
                              <td className="py-2 px-2.5 text-slate-300">
                                {c.v24?.toFixed(1) ?? '--'}
                              </td>
                              <td
                                className={`py-2 px-2.5 font-bold ${
                                  isRej ? 'text-rose-400' : isMon ? 'text-amber-400' : 'text-slate-100'
                                }`}
                              >
                                {c.v168?.toFixed(1) ?? '--'}&mu;A
                              </td>
                              <td
                                className={`py-2 px-2.5 font-semibold ${
                                  delta > 5 ? 'text-rose-400' : delta > 2 ? 'text-amber-400' : 'text-slate-300'
                                }`}
                              >
                                {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                              </td>
                              <td
                                className={`py-2 px-2.5 ${
                                  Math.abs(c.z168 ?? 0) >= 3
                                    ? 'text-rose-400 font-bold'
                                    : Math.abs(c.z168 ?? 0) >= 2
                                    ? 'text-amber-400 font-bold'
                                    : 'text-slate-300'
                                }`}
                              >
                                {c.z168 != null ? `${c.z168 > 0 ? '+' : ''}${c.z168.toFixed(2)}σ` : '--'}
                              </td>
                              <td className="py-2 px-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    isRej
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      : isMon
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  }`}
                                >
                                  {c.status ? c.status.toUpperCase() : 'INGESTED'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    sounds.playClick()
                                    onSelectComponent?.(c.component_id)
                                    onFocusSubsystem?.(c.subsystem)
                                    onClose()
                                  }}
                                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white hover:text-white border border-white/20 text-[10px] font-medium transition-colors"
                                  title="Focus component in 3D satellite and telemetry oscilloscope"
                                >
                                  Inspect 3D &rarr;
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs italic font-mono">
                Select a qualification lot on the left to inspect constituent components.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#070D1A] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-sans">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold font-mono">● MIL-STD-883 HTOL 168H SPEC</span>
            <span className="text-slate-500">&bull;</span>
            <span>Continuous Statistical Outlier Screening Across Flight Lots</span>
          </div>
          <button
            type="button"
            onClick={() => {
              sounds.playClick()
              onClose()
            }}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
