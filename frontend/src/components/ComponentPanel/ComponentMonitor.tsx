import { useState, useMemo } from 'react'
import type { ComponentOut, SubsystemStatus } from '../../types'

const DOT_COLOR: Record<string, string> = {
  safe: 'bg-emerald-400',
  monitor: 'bg-amber-400',
  reject: 'bg-rose-500',
  idle: 'bg-slate-600',
}

export default function ComponentMonitor({
  subsystems,
  components,
  analysisRun,
  selectedId,
  onSelectSubsystem,
  onSelectComponent,
  onSearch,
  onFilter,
}: {
  subsystems: SubsystemStatus[]
  components: ComponentOut[]
  analysisRun: boolean
  selectedId: string | null
  onSelectSubsystem: (key: string) => void
  onSelectComponent: (id: string) => void
  onSearch: (term: string) => void
  onFilter: (mode: string) => void
}) {
  const [filter, setFilter] = useState('ALL')
  const [classificationMode, setClassificationMode] = useState<'subsystems' | 'lots'>('lots')
  const [selectedLot, setSelectedLot] = useState<string | null>(null)
  const [selectedSubKey, setSelectedSubKey] = useState<string | null>(null)

  // Compute unique lots and their aggregated metrics
  const lotGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        lot_id: string
        count: number
        status: 'safe' | 'monitor' | 'reject'
        mean: number
        rejectCount: number
        monitorCount: number
      }
    >()

    components.forEach((c) => {
      const lot = c.lot_id || 'UNKNOWN-LOT'
      let item = map.get(lot)
      if (!item) {
        item = {
          lot_id: lot,
          count: 0,
          status: 'safe',
          mean: c.lot_mean ?? 0,
          rejectCount: 0,
          monitorCount: 0,
        }
        map.set(lot, item)
      }
      item.count++
      if (c.status === 'reject') {
        item.status = 'reject'
        item.rejectCount++
      } else if (c.status === 'monitor') {
        item.monitorCount++
        if (item.status !== 'reject') item.status = 'monitor'
      }
    })

    return Array.from(map.values()).sort((a, b) => a.lot_id.localeCompare(b.lot_id))
  }, [components])

  // Filter components displayed in feed based on selected lot or subsystem
  const displayedComponents = useMemo(() => {
    let list = components
    if (selectedLot) {
      list = list.filter((c) => c.lot_id === selectedLot)
    } else if (selectedSubKey) {
      list = list.filter((c) => c.subsystem === selectedSubKey)
    }
    return list
  }, [components, selectedLot, selectedSubKey])

  return (
    <div className="bg-[#0B1120] p-4 sm:p-5 border-r border-slate-800 flex flex-col h-full overflow-hidden font-sans text-xs sm:text-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-sm sm:text-base font-bold uppercase tracking-wider text-white flex items-center gap-2 font-display">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          Component Intelligence
        </h3>
        <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">ISRO-INSTR-01</span>
      </div>

      {/* Clean Search Input */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
        <input
          className="w-full pl-9 pr-3 py-2 bg-[#070D1A] border border-slate-700 rounded-lg text-slate-100 font-mono text-xs sm:text-sm focus:border-amber-500 outline-none transition-all placeholder:text-slate-500"
          placeholder="Search Component ID..."
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Filter Mode Selector */}
      <div className="flex gap-2 mb-3">
        {['ALL', 'SAFE', 'MONITOR', 'REJECT'].map((f) => {
          const isActive = filter === f
          const activeClass =
            f === 'SAFE'
              ? 'border-emerald-500 bg-emerald-500/25 text-emerald-300 font-bold shadow-sm'
              : f === 'REJECT'
              ? 'border-rose-500 bg-rose-500/25 text-rose-300 font-bold shadow-sm'
              : f === 'MONITOR'
              ? 'border-amber-500 bg-amber-500/25 text-amber-300 font-bold shadow-sm'
              : 'border-amber-500 bg-amber-500/25 text-amber-300 font-bold shadow-sm'

          return (
            <button
              key={f}
              type="button"
              className={`flex-1 py-1.5 px-2 text-xs font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                isActive ? activeClass : 'border-slate-800 bg-[#070D1A] text-slate-400 hover:text-white hover:border-slate-700'
              }`}
              onClick={() => {
                setFilter(f)
                onFilter(f)
              }}
            >
              {f}
            </button>
          )
        })}
      </div>

      {/* Classification Mode Switcher: LOTS vs SUBSYSTEMS */}
      <div className="flex items-center justify-between gap-1.5 mb-2.5 p-1 bg-[#070D1A] border border-slate-800 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setClassificationMode('lots')
            setSelectedSubKey(null)
          }}
          className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 font-display cursor-pointer ${
            classificationMode === 'lots'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📦</span>
          <span>Qualification Lots ({lotGroups.length})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setClassificationMode('subsystems')
            setSelectedLot(null)
          }}
          className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 font-display cursor-pointer ${
            classificationMode === 'subsystems'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🛰️</span>
          <span>Subsystems ({subsystems.length})</span>
        </button>
      </div>

      {/* Classification Header Label */}
      <div className="text-xs uppercase font-bold text-slate-300 tracking-wider mb-2 flex justify-between items-center">
        <span>
          {classificationMode === 'lots' ? 'Select Flight Lot' : 'Subsystems'}
        </span>
        <span className="text-xs font-mono text-slate-400">
          {classificationMode === 'lots' ? 'Lot-Wise Split' : 'Count'}
        </span>
      </div>

      {/* Dynamic Classification List: Lots or Subsystems */}
      <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 mb-3">
        {classificationMode === 'lots' && (
          <>
            {lotGroups.length === 0 && (
              <div className="text-slate-500 text-xs py-3 text-center bg-[#070D1A] rounded-lg border border-slate-800">
                No lots registered
              </div>
            )}
            {lotGroups.map((lot) => {
              const isSelected = selectedLot === lot.lot_id
              return (
                <div
                  key={lot.lot_id}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer text-xs sm:text-sm transition-all border ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/20 text-white font-bold shadow-sm'
                      : 'border-slate-800/80 bg-[#070D1A] hover:bg-slate-800/60 hover:border-slate-700 text-slate-200'
                  }`}
                  onClick={() => {
                    if (selectedLot === lot.lot_id) {
                      setSelectedLot(null)
                    } else {
                      setSelectedLot(lot.lot_id)
                    }
                  }}
                  title={`Click to view components in ${lot.lot_id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT_COLOR[lot.status] ?? DOT_COLOR.idle}`} />
                    <span className="font-mono text-xs sm:text-sm font-bold text-amber-400 truncate">
                      {lot.lot_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lot.rejectCount > 0 && (
                      <span className="font-mono text-[10.5px] bg-rose-500/25 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded font-bold">
                        {lot.rejectCount} REJ
                      </span>
                    )}
                    <span className="font-mono text-slate-300 text-xs bg-slate-800 px-2 py-0.5 rounded font-semibold">
                      {lot.count} pts
                    </span>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {classificationMode === 'subsystems' && (
          <>
            {subsystems.map((s) => {
              const isSelected = selectedSubKey === s.key
              return (
                <div
                  key={s.key}
                  className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer text-xs transition-all border ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/20 text-white font-semibold'
                      : 'border-transparent hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                  onClick={() => {
                    const next = selectedSubKey === s.key ? null : s.key
                    setSelectedSubKey(next)
                    onSelectSubsystem(s.key)
                  }}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLOR[s.status] ?? DOT_COLOR.idle}`} />
                  <span className="font-mono font-bold text-amber-400 text-[11px] w-9">[{s.key}]</span>
                  <span className="flex-1 text-slate-200 truncate text-[11.5px]">{s.name}</span>
                  <span className="font-mono text-slate-400 text-[10.5px]">{s.count}</span>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Active Lot/Subsystem Filter Status Indicator */}
      {(selectedLot || selectedSubKey) && (
        <div className="mb-2 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[10.5px]">
          <span className="text-amber-300 font-mono truncate">
            {selectedLot ? (
              <>
                Lot: <b>{selectedLot}</b> ({displayedComponents.length} components)
              </>
            ) : (
              <>
                Subsystem: <b>[{selectedSubKey}]</b> ({displayedComponents.length} components)
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedLot(null)
              setSelectedSubKey(null)
            }}
            className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded text-[10px] bg-slate-800/80 hover:bg-slate-700 transition-colors ml-1 font-bold"
          >
            Clear
          </button>
        </div>
      )}

      {/* Flagged / Lot-Wise Components Feed */}
      <div className="pt-3 border-t border-slate-800 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-300 tracking-wider mb-2.5">
          <span>{selectedLot ? 'Lot Components' : 'Component Feed'}</span>
          <span className="font-mono text-emerald-400 font-bold text-xs sm:text-sm bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
            {displayedComponents.length} parts
          </span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {!analysisRun && (
            <div className="text-slate-400 text-xs sm:text-sm px-3 py-4 text-center bg-[#070D1A] rounded-lg border border-slate-800">
              Awaiting AI Screening execution
            </div>
          )}
          {analysisRun && displayedComponents.length === 0 && (
            <div className="text-slate-400 text-xs sm:text-sm px-3 py-4 text-center bg-[#070D1A] rounded-lg border border-slate-800">
              No matching components in this selection
            </div>
          )}
          {analysisRun &&
            displayedComponents.map((c) => (
              <div
                key={c.component_id}
                className={`flex justify-between items-center py-2.5 px-3 rounded-lg cursor-pointer text-xs sm:text-sm transition-all border ${
                  selectedId === c.component_id
                    ? 'border-amber-500 bg-amber-500/20 text-white font-bold shadow-sm'
                    : 'border-slate-800/80 bg-[#070D1A] hover:border-slate-700 hover:bg-slate-800/50'
                }`}
                onClick={() => onSelectComponent(c.component_id)}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      c.status === 'safe'
                        ? 'bg-emerald-400'
                        : c.status === 'monitor'
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                  />
                  <div>
                    <span className="font-mono text-slate-100 text-xs sm:text-sm font-bold block">{c.component_id}</span>
                    <span className="text-xs font-mono text-slate-400 block truncate max-w-[150px]">
                      {c.lot_id}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    [{c.subsystem}]
                  </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-xs sm:text-sm ${
                      c.status === 'safe'
                        ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                        : c.status === 'monitor'
                        ? 'text-amber-300 bg-amber-500/20 border border-amber-500/30'
                        : 'text-rose-300 bg-rose-500/25 border border-rose-500/40'
                    }`}
                  >
                    {c.risk_score}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
