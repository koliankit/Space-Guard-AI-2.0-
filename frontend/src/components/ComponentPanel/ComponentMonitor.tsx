import { useState, useMemo } from 'react'
import type { ComponentOut, SubsystemStatus } from '../../types'

const DOT_COLOR: Record<string, string> = {
  safe: 'bg-[#168A5B]',
  monitor: 'bg-[#C58A00]',
  reject: 'bg-[#D9363E]',
  idle: 'bg-[#718292]',
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
    <div className="bg-[#FFFFFF] p-4 sm:p-5 flex flex-col h-full font-sans text-xs sm:text-sm min-h-[620px] select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="m-0 text-sm sm:text-base font-bold uppercase tracking-wider text-[#17212B] flex items-center gap-2 font-display">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0E88D3]" />
          Component Intelligence
        </h3>
        <span className="text-xs font-mono text-[#4F6170] bg-[#F8FAFC] px-2.5 py-1 rounded-md border border-[#D5DEE7] font-semibold">ISRO-INSTR-01</span>
      </div>

      {/* Clean Search Input */}
      <div className="relative mb-3.5">
        <span className="absolute left-3.5 top-3 text-[#718292] text-sm">🔍</span>
        <input
          className="w-full pl-9 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#D5DEE7] rounded-xl text-[#17212B] font-mono text-xs sm:text-sm focus:border-[#0E88D3] focus:bg-[#FFFFFF] outline-none transition-all placeholder:text-[#718292]"
          placeholder="Search Component ID or Lot..."
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Filter Mode Selector */}
      <div className="flex gap-2 mb-3.5">
        {['ALL', 'SAFE', 'MONITOR', 'REJECT'].map((f) => {
          const isActive = filter === f
          const activeClass =
            f === 'SAFE'
              ? 'border-[#168A5B] bg-[#168A5B] text-white font-bold shadow-sm'
              : f === 'REJECT'
              ? 'border-[#D9363E] bg-[#D9363E] text-white font-bold shadow-sm'
              : f === 'MONITOR'
              ? 'border-[#C58A00] bg-[#C58A00] text-white font-bold shadow-sm'
              : 'border-[#0E88D3] bg-[#0E88D3] text-white font-bold shadow-sm'

          return (
            <button
              key={f}
              type="button"
              className={`flex-1 py-2 px-2 text-xs font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                isActive ? activeClass : 'border-[#D5DEE7] bg-[#F8FAFC] text-[#4F6170] hover:text-[#17212B] hover:border-[#0E88D3]'
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
      <div className="flex items-center justify-between gap-2 mb-3 p-1.5 bg-[#F4F7FA] border border-[#D5DEE7] rounded-xl">
        <button
          type="button"
          onClick={() => {
            setClassificationMode('lots')
            setSelectedSubKey(null)
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 font-display cursor-pointer ${
            classificationMode === 'lots'
              ? 'bg-[#0E88D3] text-white shadow-sm'
              : 'text-[#4F6170] hover:text-[#17212B]'
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
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 font-display cursor-pointer ${
            classificationMode === 'subsystems'
              ? 'bg-[#0E88D3] text-white shadow-sm'
              : 'text-[#4F6170] hover:text-[#17212B]'
          }`}
        >
          <span>🛰️</span>
          <span>Subsystems ({subsystems.length})</span>
        </button>
      </div>

      {/* Classification Header Label */}
      <div className="text-xs uppercase font-bold text-[#4F6170] tracking-wider mb-2 flex justify-between items-center">
        <span>
          {classificationMode === 'lots' ? 'Select Flight Lot' : 'Subsystems'}
        </span>
        <span className="text-xs font-mono text-[#718292]">
          {classificationMode === 'lots' ? 'Lot-Wise Split' : 'Count'}
        </span>
      </div>

      {/* Dynamic Classification List: Lots or Subsystems (Generous Height Box) */}
      <div className="max-h-[380px] min-h-[160px] overflow-y-auto space-y-2 pr-1 mb-4">
        {classificationMode === 'lots' && (
          <>
            {lotGroups.length === 0 && (
              <div className="text-[#718292] text-xs py-4 text-center bg-[#F8FAFC] rounded-xl border border-[#D5DEE7]">
                No lots registered
              </div>
            )}
            {lotGroups.map((lot) => {
              const isSelected = selectedLot === lot.lot_id
              return (
                <div
                  key={lot.lot_id}
                  className={`flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer text-xs sm:text-sm transition-all border shadow-sm ${
                    isSelected
                      ? 'border-[#0E88D3] bg-[#0E88D3]/10 text-[#17212B] font-bold ring-1 ring-[#0E88D3]'
                      : lot.rejectCount > 0
                      ? 'border-[#D9363E]/40 bg-[#FFFFFF] hover:bg-[#FEF2F2]/60 text-[#17212B]'
                      : lot.monitorCount > 0
                      ? 'border-[#C58A00]/40 bg-[#FFFFFF] hover:bg-[#FFFBEB]/60 text-[#17212B]'
                      : 'border-[#D5DEE7] bg-[#FFFFFF] hover:bg-[#F8FAFC] hover:border-[#0E88D3]/50 text-[#17212B]'
                  }`}
                  onClick={() => {
                    if (selectedLot === lot.lot_id) {
                      setSelectedLot(null)
                    } else {
                      setSelectedLot(lot.lot_id)
                    }
                  }}
                  title={`Click to inspect components in ${lot.lot_id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${DOT_COLOR[lot.status] ?? DOT_COLOR.idle}`} />
                    <span className="font-mono text-xs sm:text-sm font-bold text-[#17212B] tracking-wide truncate">
                      {lot.lot_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lot.rejectCount > 0 ? (
                      <span className="font-mono text-[11px] bg-[#FEF2F2] text-[#D9363E] border border-[#D9363E]/50 px-2.5 py-1 rounded-md font-bold">
                        {lot.rejectCount} REJ
                      </span>
                    ) : lot.monitorCount > 0 ? (
                      <span className="font-mono text-[11px] bg-[#FFFBEB] text-[#C58A00] border border-[#C58A00]/50 px-2.5 py-1 rounded-md font-bold">
                        {lot.monitorCount} MON
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] bg-[#F0FDF4] text-[#168A5B] border border-[#168A5B]/40 px-2.5 py-1 rounded-md font-bold">
                        NOM
                      </span>
                    )}
                    <span className="font-mono text-[#4F6170] text-xs bg-[#F8FAFC] border border-[#D5DEE7] px-2.5 py-1 rounded-md font-semibold">
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
                  className={`flex items-center gap-2.5 py-2.5 px-3 rounded-xl cursor-pointer text-xs transition-all border ${
                    isSelected
                      ? 'border-[#0E88D3] bg-[#0E88D3]/10 text-[#17212B] font-semibold ring-1 ring-[#0E88D3]'
                      : 'border-[#D5DEE7] bg-[#FFFFFF] hover:bg-[#F8FAFC] hover:border-[#0E88D3]/50 text-[#17212B]'
                  }`}
                  onClick={() => {
                    const next = selectedSubKey === s.key ? null : s.key
                    setSelectedSubKey(next)
                    onSelectSubsystem(s.key)
                  }}
                >
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT_COLOR[s.status] ?? DOT_COLOR.idle}`} />
                  <span className="font-mono font-bold text-[#0E88D3] text-xs w-10">[{s.key}]</span>
                  <span className="flex-1 text-[#17212B] truncate font-medium text-xs">{s.name}</span>
                  <span className="font-mono text-[#4F6170] text-xs bg-[#F8FAFC] border border-[#D5DEE7] px-2 py-0.5 rounded font-semibold">{s.count}</span>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Active Lot/Subsystem Filter Status Indicator */}
      {(selectedLot || selectedSubKey) && (
        <div className="mb-3 p-2 rounded-xl bg-[#F0F7FD] border border-[#0E88D3]/30 flex items-center justify-between text-xs">
          <span className="text-[#0E88D3] font-mono truncate">
            {selectedLot ? (
              <>
                Filtered Lot: <b className="text-[#17212B]">{selectedLot}</b> ({displayedComponents.length} components)
              </>
            ) : (
              <>
                Subsystem: <b className="text-[#17212B]">[{selectedSubKey}]</b> ({displayedComponents.length} components)
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedLot(null)
              setSelectedSubKey(null)
            }}
            className="text-[#4F6170] hover:text-[#17212B] px-2 py-0.5 rounded-md text-xs bg-[#FFFFFF] border border-[#D5DEE7] hover:bg-[#F8FAFC] transition-colors ml-2 font-bold cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Flagged / Lot-Wise Components Feed (Generously Sized) */}
      <div className="pt-3.5 border-t border-[#D5DEE7] flex-1 flex flex-col min-h-[280px]">
        <div className="flex items-center justify-between text-xs uppercase font-bold text-[#4F6170] tracking-wider mb-2.5">
          <span>{selectedLot ? 'Lot Components' : 'Component Feed'}</span>
          <span className="font-mono text-[#168A5B] font-bold text-xs bg-[#F0FDF4] px-2.5 py-1 rounded-md border border-[#168A5B]/30">
            {displayedComponents.length} parts
          </span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {!analysisRun && (
            <div className="text-[#718292] text-xs sm:text-sm px-3 py-6 text-center bg-[#F8FAFC] rounded-xl border border-[#D5DEE7]">
              Awaiting AI Screening execution
            </div>
          )}
          {analysisRun && displayedComponents.length === 0 && (
            <div className="text-[#718292] text-xs sm:text-sm px-3 py-6 text-center bg-[#F8FAFC] rounded-xl border border-[#D5DEE7]">
              No matching components in this selection
            </div>
          )}
          {analysisRun &&
            displayedComponents.map((c) => (
              <div
                key={c.component_id}
                className={`flex justify-between items-center py-3 px-3.5 rounded-xl cursor-pointer text-xs sm:text-sm transition-all border shadow-sm ${
                  selectedId === c.component_id
                    ? 'border-[#0E88D3] bg-[#0E88D3]/10 text-[#17212B] font-bold ring-1 ring-[#0E88D3]'
                    : c.status === 'reject'
                    ? 'border-[#D9363E]/30 bg-[#FFFFFF] hover:border-[#D9363E] hover:bg-[#FEF2F2]/50 text-[#17212B]'
                    : c.status === 'monitor'
                    ? 'border-[#C58A00]/30 bg-[#FFFFFF] hover:border-[#C58A00] hover:bg-[#FFFBEB]/50 text-[#17212B]'
                    : 'border-[#D5DEE7] bg-[#FFFFFF] hover:border-[#0E88D3]/50 hover:bg-[#F8FAFC] text-[#17212B]'
                }`}
                onClick={() => onSelectComponent(c.component_id)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      c.status === 'safe'
                        ? 'bg-[#168A5B]'
                        : c.status === 'monitor'
                        ? 'bg-[#C58A00]'
                        : 'bg-[#D9363E]'
                    }`}
                  />
                  <div>
                    <span className="font-mono text-[#17212B] text-xs sm:text-sm font-bold block">{c.component_id}</span>
                    <span className="text-xs font-mono text-[#4F6170] block truncate max-w-[170px]">
                      {c.lot_id}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#0E88D3] font-mono font-bold bg-[#0E88D3]/10 px-2 py-0.5 rounded-md border border-[#0E88D3]/25">
                    [{c.subsystem}]
                  </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs sm:text-sm ${
                      c.status === 'safe'
                        ? 'text-[#168A5B] bg-[#F0FDF4] border border-[#168A5B]/30'
                        : c.status === 'monitor'
                        ? 'text-[#C58A00] bg-[#FFFBEB] border border-[#C58A00]/30'
                        : 'text-[#D9363E] bg-[#FEF2F2] border border-[#D9363E]/40'
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
