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
    <div className="bg-[#0B1120] p-4 border-r border-slate-800 flex flex-col h-full overflow-hidden font-sans text-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          Component Intelligence
        </h3>
        <span className="text-[10px] font-mono text-slate-400">ISRO-INSTR-01</span>
      </div>

      {/* Clean Search Input */}
      <div className="relative mb-2.5">
        <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
        <input
          className="w-full pl-8 pr-3 py-1.5 bg-[#070D1A] border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:border-sky-500 outline-none transition-all placeholder:text-slate-500"
          placeholder="Search Component ID..."
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Filter Mode Selector */}
      <div className="flex gap-1.5 mb-3">
        {['ALL', 'SAFE', 'MONITOR', 'REJECT'].map((f) => {
          const isActive = filter === f
          const activeClass =
            f === 'SAFE'
              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-semibold'
              : f === 'REJECT'
              ? 'border-rose-500 bg-rose-500/20 text-rose-300 font-semibold'
              : f === 'MONITOR'
              ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-semibold'
              : 'border-sky-500 bg-sky-500/20 text-sky-300 font-semibold'

          return (
            <button
              key={f}
              type="button"
              className={`flex-1 py-1 px-1 text-[10px] font-medium uppercase rounded-md border transition-all ${
                isActive ? activeClass : 'border-slate-800 bg-[#070D1A] text-slate-400 hover:text-white'
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
      <div className="flex items-center justify-between gap-1 mb-2 p-1 bg-[#070D1A] border border-slate-800 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setClassificationMode('lots')
            setSelectedSubKey(null)
          }}
          className={`flex-1 py-1 px-2 rounded text-[10.5px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
            classificationMode === 'lots'
              ? 'bg-sky-600 text-white shadow-sm'
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
          className={`flex-1 py-1 px-2 rounded text-[10.5px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
            classificationMode === 'subsystems'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🛰️</span>
          <span>Subsystems ({subsystems.length})</span>
        </button>
      </div>

      {/* Classification Header Label */}
      <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5 flex justify-between items-center">
        <span>
          {classificationMode === 'lots' ? 'Select Flight Lot' : 'Subsystems'}
        </span>
        <span className="text-[9.5px] font-mono text-slate-500">
          {classificationMode === 'lots' ? 'Lot-Wise Split' : 'Count'}
        </span>
      </div>

      {/* Dynamic Classification List: Lots or Subsystems */}
      <div className="max-h-[165px] overflow-y-auto space-y-1 pr-1 mb-2.5">
        {classificationMode === 'lots' && (
          <>
            {lotGroups.length === 0 && (
              <div className="text-slate-500 text-[11px] py-3 text-center bg-[#070D1A] rounded border border-slate-800">
                No lots registered
              </div>
            )}
            {lotGroups.map((lot) => {
              const isSelected = selectedLot === lot.lot_id
              return (
                <div
                  key={lot.lot_id}
                  className={`flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer text-xs transition-all border ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/20 text-white font-semibold shadow-sm'
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
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLOR[lot.status] ?? DOT_COLOR.idle}`} />
                    <span className="font-mono text-[11px] font-bold text-sky-400 truncate">
                      {lot.lot_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {lot.rejectCount > 0 && (
                      <span className="font-mono text-[9.5px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1 py-0.2 rounded font-bold">
                        {lot.rejectCount} REJ
                      </span>
                    )}
                    <span className="font-mono text-slate-400 text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded">
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
                      ? 'border-sky-500 bg-sky-500/20 text-white font-semibold'
                      : 'border-transparent hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                  onClick={() => {
                    const next = selectedSubKey === s.key ? null : s.key
                    setSelectedSubKey(next)
                    onSelectSubsystem(s.key)
                  }}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLOR[s.status] ?? DOT_COLOR.idle}`} />
                  <span className="font-mono font-bold text-sky-400 text-[11px] w-9">[{s.key}]</span>
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
        <div className="mb-2 p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-between text-[10.5px]">
          <span className="text-sky-300 font-mono truncate">
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
      <div className="pt-2.5 border-t border-slate-800 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-2">
          <span>{selectedLot ? 'Lot Components' : 'Component Feed'}</span>
          <span className="font-mono text-emerald-400 font-bold">{displayedComponents.length} parts</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {!analysisRun && (
            <div className="text-slate-400 text-xs px-2 py-3 text-center bg-[#070D1A] rounded-lg border border-slate-800">
              Awaiting AI Screening execution
            </div>
          )}
          {analysisRun && displayedComponents.length === 0 && (
            <div className="text-slate-400 text-xs px-2 py-3 text-center bg-[#070D1A] rounded-lg border border-slate-800">
              No matching components in this selection
            </div>
          )}
          {analysisRun &&
            displayedComponents.map((c) => (
              <div
                key={c.component_id}
                className={`flex justify-between items-center py-2 px-2.5 rounded-lg cursor-pointer text-xs transition-all border ${
                  selectedId === c.component_id
                    ? 'border-sky-500 bg-sky-500/15 text-white font-semibold shadow-sm'
                    : 'border-slate-800/80 bg-[#070D1A] hover:border-slate-700 hover:bg-slate-800/40'
                }`}
                onClick={() => onSelectComponent(c.component_id)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      c.status === 'safe'
                        ? 'bg-emerald-400'
                        : c.status === 'monitor'
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                  />
                  <div>
                    <span className="font-mono text-slate-100 text-xs block">{c.component_id}</span>
                    <span className="text-[9.5px] font-mono text-slate-500 block truncate max-w-[130px]">
                      {c.lot_id}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">[{c.subsystem}]</span>
                  <span
                    className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10.5px] ${
                      c.status === 'safe'
                        ? 'text-emerald-300 bg-emerald-500/15'
                        : c.status === 'monitor'
                        ? 'text-amber-300 bg-amber-500/15'
                        : 'text-rose-300 bg-rose-500/20'
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
