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
  const [splitMode, setSplitMode] = useState<'sideBySide' | 'stacked'>('sideBySide')

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 bg-black/90 backdrop-blur-md animate-fade-in font-sans">
      {/* Modal Container: Enlarged to utilize the full viewport */}
      <div className="bg-[#060B16] border border-amber-500/50 rounded-xl w-[98vw] max-w-[1900px] h-[96vh] max-h-[96vh] flex flex-col shadow-2xl overflow-hidden reticle-corner">
        {/* Top Header Bar */}
        <div className="px-6 py-3.5 border-b border-line bg-[#091120] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-isro-amber led shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="m-0 text-base md:text-lg font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
                  <span>📦 FLIGHT QUALIFICATION LOTS CLASSIFICATION</span>
                </h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-isro-amber/20 text-isro-amber border border-isro-amber/40 font-bold">
                  {totalLots} FLIGHT LOTS &bull; {totalParts} TOTAL COMPONENTS
                </span>
              </div>
              <div className="text-xs text-slate-400 font-sans mt-0.5">
                MIL-STD-883 Method 1005 HTOL Burn-in Screening &bull; Lot-Wise Component Architecture &amp; Quarantine Breakdown
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* 50/50 Equal Halves Split Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#050914] p-1 rounded-lg border border-slate-800 font-mono text-xs">
              <button
                type="button"
                onClick={() => setSplitMode('sideBySide')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  splitMode === 'sideBySide'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Side-by-Side: 50% Left (Lots) + 50% Right (Components)"
              >
                ◫ 50/50 Split
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('stacked')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  splitMode === 'stacked'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Stacked: 50% Top (Lots) + 50% Bottom (Components)"
              >
                ⬒ 50/50 Stacked
              </button>
            </div>

            <span className="text-xs md:text-sm text-slate-300 font-mono hidden sm:inline-block bg-[#070D1A] px-3 py-1.5 rounded-lg border border-slate-800">
              🛰️ {activeMissionName}
            </span>
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                onClose()
              }}
              className="w-9 h-9 rounded-lg bg-[#070D1A] border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white flex items-center justify-center text-xl transition-colors cursor-pointer"
              title="Close window (Esc)"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Global Dataset Metric Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-5 py-2 bg-[#060B16] border-b border-slate-800/80 text-xs md:text-sm font-mono flex-shrink-0">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#0A1122] border border-slate-800">
            <span className="text-slate-400 text-xs font-sans">Total Lots:</span>
            <span className="text-white font-bold text-sm md:text-base">{totalLots} Lots</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#0A1122] border border-slate-800">
            <span className="text-slate-400 text-xs font-sans">Classified Parts:</span>
            <span className="text-slate-100 font-bold text-sm md:text-base">{totalParts} Pts</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#0A1122] border border-emerald-900/40">
            <span className="text-emerald-400 text-xs font-sans">Flight Safe:</span>
            <span className="text-emerald-300 font-bold text-sm md:text-base">{totalSafe}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#0A1122] border border-amber-900/40">
            <span className="text-amber-400 text-xs font-sans">Drift Monitor:</span>
            <span className="text-amber-300 font-bold text-sm md:text-base">{totalMonitor}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#0A1122] border border-rose-900/40 col-span-2 sm:col-span-1">
            <span className="text-rose-400 text-xs font-sans">Quarantined:</span>
            <span className="text-rose-300 font-bold text-sm md:text-base">{totalReject}</span>
          </div>
        </div>

        {/* Main Body: Divided into Two Equal Halves (50% / 50%) */}
        <div
          className={`flex-1 flex overflow-hidden ${
            splitMode === 'sideBySide' ? 'flex-col lg:flex-row' : 'flex-col'
          }`}
        >
          {/* Section 1 (50% Equal Half): Qualification Lots Matrix Selector */}
          <div
            className={`${
              splitMode === 'sideBySide'
                ? 'w-full lg:w-1/2 h-full border-b lg:border-b-0 lg:border-r'
                : 'w-full h-1/2 border-b'
            } border-slate-800 flex flex-col overflow-hidden bg-[#070D1A]`}
          >
            <div className="px-4 py-2 bg-[#091122] border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
                <span>📦</span> QUALIFICATION FLIGHT LOTS ({lotGroups.length}) &mdash;{' '}
                <span className="text-amber-400 font-normal hidden sm:inline">Select lot to inspect components</span>
              </span>
              <span className="text-xs text-slate-300 font-mono">
                Active: <b className="text-white bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">{activeLot?.lot_id || 'None'}</b>
              </span>
            </div>

            {/* Grid of Lot Cards in Section 1 */}
            <div
              className={`p-3 overflow-y-auto flex-1 grid ${
                splitMode === 'sideBySide'
                  ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
              } gap-2.5`}
            >
              {lotGroups.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs italic col-span-full">
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
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 shadow-md ring-2 ring-amber-400/60 scale-[1.01]'
                          : isRej
                          ? 'bg-[#180C14] border-rose-900/60 hover:border-rose-600 hover:bg-[#200E1A]'
                          : isMon
                          ? 'bg-[#19140B] border-amber-900/60 hover:border-amber-600 hover:bg-[#221B0F]'
                          : 'bg-[#0B1326] border-slate-800 hover:border-slate-600 hover:bg-[#0F1A33]'
                      }`}
                    >
                      {/* Lot Header: ID and Status */}
                      <div className="flex items-center justify-between mb-1 gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              isRej ? 'bg-rose-500 led' : isMon ? 'bg-amber-400 led' : 'bg-emerald-400'
                            }`}
                          />
                          <span className="font-mono font-bold text-xs text-white truncate">
                            {lot.lot_id}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-black uppercase flex-shrink-0 ${
                            isRej
                              ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50'
                              : isMon
                              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                              : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                          }`}
                        >
                          {isRej ? `${lot.rejectCount} REJ` : isMon ? `${lot.monitorCount} MON` : 'NOM'}
                        </span>
                      </div>

                      {/* Metrics: Part count & Baseline */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 mb-1.5">
                        <span>
                          <b className="text-white">{lot.total}</b> parts
                        </span>
                        <span className="text-slate-400">
                          &mu; = <b className="text-amber-300">{lot.mean.toFixed(1)}</b> &micro;A
                        </span>
                      </div>

                      {/* Visual Health Distribution Bar */}
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
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
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Section 2 (50% Equal Half): Selected Lot Deep Dive & Components Table */}
          <div
            className={`${
              splitMode === 'sideBySide' ? 'w-full lg:w-1/2 h-full' : 'w-full h-1/2'
            } bg-[#090F1E] flex flex-col overflow-hidden`}
          >
            {activeLot ? (
              <>
                {/* Active Lot Header Info Card */}
                <div className="p-3 border-b border-slate-800 bg-[#0C152B] flex-shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">
                          LOT: {activeLot.lot_id}
                        </span>
                        <span className="text-xs font-mono text-slate-300">
                          &bull; <b className="text-emerald-400 font-bold">{activeLot.total} flight parts</b> allocated
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-400 mt-0.5 font-sans">
                        HTOL 168h Baseline &mu; ={' '}
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
                        className="px-2.5 py-1 rounded-lg border border-slate-700 bg-[#070D1A] text-slate-200 hover:text-white hover:border-slate-500 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Download CSV report of components in this lot"
                      >
                        <span>📥</span> Export CSV
                      </button>
                    </div>
                  </div>

                  {/* Where Components Locate Breakdown Tags */}
                  <div className="bg-[#070D1A] p-1.5 rounded-lg border border-slate-800 flex flex-wrap items-center gap-1 my-1 max-h-[62px] overflow-y-auto">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mr-1">
                      Locate:
                    </span>
                    {Object.entries(activeLot.subsystemCounts).map(([subKey, count]) => {
                      const loc = getSubsystemLocation(subKey)
                      const isFiltered = subsystemFilter === subKey
                      return (
                        <button
                          key={subKey}
                          type="button"
                          onClick={() => setSubsystemFilter(isFiltered ? 'ALL' : subKey)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all border flex items-center gap-1 cursor-pointer ${
                            isFiltered
                              ? 'bg-isro-amber/30 border-isro-amber text-isro-amber font-bold'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-isro-amber hover:text-white'
                          }`}
                          title={`Click to filter by ${loc.name} (${loc.bay})`}
                        >
                          <span className="font-bold text-isro-amber">[{subKey}]</span>
                          <span>{count} in {loc.name}</span>
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
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
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
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
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
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">Subsystem:</span>
                      <select
                        value={subsystemFilter}
                        onChange={(e) => setSubsystemFilter(e.target.value)}
                        className="bg-[#060B16] border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-0.5 font-mono focus:border-white outline-none"
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
                    <div className="relative flex-1 min-w-[160px] max-w-xs">
                      <span className="absolute left-2.5 top-1 text-slate-500 text-xs">🔍</span>
                      <input
                        type="text"
                        placeholder="Search Component ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-2.5 py-0.5 bg-[#060B16] border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-white outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Components Table in Active Lot - Full Width */}
                <div className="flex-1 overflow-y-auto overflow-x-auto">
                  {displayedLotComponents.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm italic font-mono">
                      No components match the selected filter in Lot {activeLot.lot_id}.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs md:text-sm font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 bg-[#070D1A] text-xs text-slate-300 uppercase tracking-wider sticky top-0 z-10 font-mono">
                          <th className="py-3 px-4 font-bold">Component ID</th>
                          <th className="py-3 px-3 font-bold">Subsystem &amp; Bay Location</th>
                          <th className="py-3 px-3 font-bold">3D Pos [X, Y, Z]</th>
                          <th className="py-3 px-3 font-bold">0h (&mu;A)</th>
                          <th className="py-3 px-3 font-bold">24h (&mu;A)</th>
                          <th className="py-3 px-3 font-bold">168h (&mu;A)</th>
                          <th className="py-3 px-3 font-bold">&Delta; Drift</th>
                          <th className="py-3 px-3 font-bold">Z-Score</th>
                          <th className="py-3 px-3 font-bold">Classification</th>
                          <th className="py-3 px-4 text-right font-bold">Action</th>
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
                              className={`transition-colors hover:bg-slate-800/50 ${
                                isRej ? 'bg-rose-950/20' : isMon ? 'bg-amber-950/15' : ''
                              }`}
                            >
                              <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    isRej ? 'bg-rose-500 led' : isMon ? 'bg-amber-400 led' : 'bg-emerald-400'
                                  }`}
                                />
                                <span className="hover:text-amber-300 transition-colors font-bold">
                                  {c.component_id}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                                <span className="text-amber-400 font-bold mr-1">[{c.subsystem}]</span>
                                <span>{loc.name}</span> &bull; <span className="text-slate-300 font-sans font-normal">{loc.bay}</span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-300 text-xs whitespace-nowrap font-mono">
                                {formatCoordinates(loc.pos)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300 font-mono">
                                {c.v0?.toFixed(1) ?? '--'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300 font-mono">
                                {c.v24?.toFixed(1) ?? '--'}
                              </td>
                              <td
                                className={`py-2.5 px-3 font-mono font-bold ${
                                  isRej ? 'text-rose-400 text-sm' : isMon ? 'text-amber-300' : 'text-slate-100'
                                }`}
                              >
                                {c.v168?.toFixed(1) ?? '--'}&mu;A
                              </td>
                              <td
                                className={`py-2.5 px-3 font-mono font-semibold ${
                                  delta > 5 ? 'text-rose-400 font-bold' : delta > 2 ? 'text-amber-400' : 'text-slate-300'
                                }`}
                              >
                                {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                              </td>
                              <td
                                className={`py-2.5 px-3 font-mono ${
                                  Math.abs(c.z168 ?? 0) >= 3
                                    ? 'text-rose-400 font-black'
                                    : Math.abs(c.z168 ?? 0) >= 2
                                    ? 'text-amber-400 font-bold'
                                    : 'text-slate-300'
                                }`}
                              >
                                {c.z168 != null ? `${c.z168 > 0 ? '+' : ''}${c.z168.toFixed(2)}σ` : '--'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                                    isRej
                                      ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50'
                                      : isMon
                                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                                      : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                                  }`}
                                >
                                  {c.status ? c.status.toUpperCase() : 'INGESTED'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    sounds.playClick()
                                    onSelectComponent?.(c.component_id)
                                    onFocusSubsystem?.(c.subsystem)
                                    onClose()
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm"
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
