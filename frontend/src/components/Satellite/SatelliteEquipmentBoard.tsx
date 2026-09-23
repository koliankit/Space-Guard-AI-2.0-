import { useState, useMemo } from 'react'
import type { ComponentOut, SubsystemStatus } from '../../types'
import ComponentDeepDiveAnalysis from './ComponentDeepDiveAnalysis'

interface SatelliteEquipmentBoardProps {
  subsystems: SubsystemStatus[]
  components: ComponentOut[]
  selectedComponent: ComponentOut | null
  focusKey: string | null
  onSelectComponent: (id: string) => void
  onSelectSubsystem: (key: string) => void
}

export default function SatelliteEquipmentBoard({
  subsystems,
  components,
  selectedComponent,
  focusKey,
  onSelectComponent,
  onSelectSubsystem,
}: SatelliteEquipmentBoardProps) {
  const [viewMode, setViewMode] = useState<'components' | 'lifecycle'>('components')
  const [isolatedBuses, setIsolatedBuses] = useState<Record<string, boolean>>({})
  const [failovers, setFailovers] = useState<Record<string, boolean>>({})
  const [actionNotif, setActionNotif] = useState<string | null>(null)

  const triggerNotif = (msg: string) => {
    setActionNotif(msg)
    setTimeout(() => setActionNotif(null), 3500)
  }

  const handleToggleIsolate = (id: string) => {
    setIsolatedBuses((prev) => {
      const next = !prev[id]
      triggerNotif(next ? `[QUARANTINE]: Power bus isolated for ${id} &mdash; component offline.` : `[RESTORE]: Bus connection re-established for ${id}.`)
      return { ...prev, [id]: next }
    })
  }

  const [filterCategory, setFilterCategory] = useState<'subsystem' | 'lot'>('subsystem')
  const [selectedLot, setSelectedLot] = useState<string | null>(null)

  const handleToggleFailover = (id: string) => {
    setFailovers((prev) => {
      const next = !prev[id]
      triggerNotif(next ? `[FAILOVER]: Redundant Cold Spare Unit B active for ${id}.` : `[FAILOVER]: Primary Unit A active for ${id}.`)
      return { ...prev, [id]: next }
    })
  }

  // Unique qualification lots with part counts
  const lotList = useMemo(() => {
    const map = new Map<string, { lot_id: string; count: number; status: 'safe' | 'monitor' | 'reject' }>()
    components.forEach((c) => {
      const lot = c.lot_id || 'UNKNOWN'
      let item = map.get(lot)
      if (!item) {
        item = { lot_id: lot, count: 0, status: 'safe' }
        map.set(lot, item)
      }
      item.count++
      if (c.status === 'reject') item.status = 'reject'
      else if (c.status === 'monitor' && item.status !== 'reject') item.status = 'monitor'
    })
    return Array.from(map.values()).sort((a, b) => a.lot_id.localeCompare(b.lot_id))
  }, [components])

  // Filtered components based on active subsystem or lot focus
  const displayedComponents = useMemo(() => {
    if (filterCategory === 'lot') {
      if (!selectedLot) return components.slice(0, 48)
      return components.filter((c) => c.lot_id === selectedLot)
    }
    if (!focusKey) return components.slice(0, 48)
    return components.filter((c) => c.subsystem === focusKey)
  }, [components, focusKey, filterCategory, selectedLot])

  // Active component for Cause, Reason, Satellite Impact & Improvement Deep Dive
  const activeComponent = useMemo(() => {
    if (selectedComponent) return selectedComponent
    const rej = displayedComponents.find((c) => c.status === 'reject')
    if (rej) return rej
    const mon = displayedComponents.find((c) => c.status === 'monitor')
    if (mon) return mon
    return displayedComponents[0] || null
  }, [selectedComponent, displayedComponents])

  // Lifecycle buckets
  const operationalList = useMemo(
    () => components.filter((c) => c.status === 'safe'),
    [components],
  )
  const examinationList = useMemo(
    () => components.filter((c) => c.status === 'monitor'),
    [components],
  )
  const repairList = useMemo(
    () => components.filter((c) => c.status === 'reject'),
    [components],
  )

  const activeSub = subsystems.find((s) => s.key === focusKey)

  return (
    <div className="bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl flex flex-col font-sans text-xs select-none shadow-md overflow-hidden">
      {/* Action Notification Toast */}
      {actionNotif && (
        <div className="bg-white/10 border-b border-white/20 px-4 py-2 text-center text-[#17212B] text-xs font-semibold animate-fade-in flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white" />
          <span dangerouslySetInnerHTML={{ __html: actionNotif }} />
        </div>
      )}

      {/* Top Header Bar */}
      <div className="px-4 py-3 border-b border-[#D9E2EA] flex flex-wrap items-center justify-between gap-2 bg-[#F8FAFC]">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white" />
          <h3 className="m-0 font-bold text-xs tracking-wide uppercase text-[#17212B]">
            Spacecraft Subsystem Hardware &amp; Command Console
          </h3>
          {filterCategory === 'lot' ? (
            <span className="font-mono text-[11px] text-[#17212B] bg-white/10 px-2.5 py-0.5 rounded border border-white/20 font-medium">
              LOT CLASSIFICATION: {selectedLot || 'ALL FLIGHT LOTS'}
            </span>
          ) : activeSub ? (
            <span className="font-mono text-[11px] text-[#17212B] bg-white/10 px-2.5 py-0.5 rounded border border-white/20 font-medium">
              FILTER: [{activeSub.key}] {activeSub.name}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-[#5B6B7A] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#D9E2EA]">
              ALL 11 SUBSYSTEMS REGISTERED
            </span>
          )}
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-[#080D1A] p-1 rounded-lg border border-[#D9E2EA]">
          <button
            type="button"
            onClick={() => setViewMode('components')}
            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
              viewMode === 'components'
                ? 'bg-white text-slate-900 font-bold shadow-sm'
                : 'text-[#5B6B7A] hover:text-[#17212B]'
            }`}
          >
            Components ({displayedComponents.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('lifecycle')}
            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'lifecycle'
                ? 'bg-white text-slate-900 font-bold shadow-sm'
                : 'text-[#5B6B7A] hover:text-[#17212B]'
            }`}
          >
            Operational Lifecycle
            {repairList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-[#17212B] text-[9.5px] font-bold font-mono">
                {repairList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Classification Mode & Filter Pills Row */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 bg-[#080D1A] border-b border-[#D9E2EA]/80 text-xs">
        {/* Classification Selector: Subsystems vs Lots */}
        <div className="flex items-center bg-[#FFFFFF] border border-[#D9E2EA]/80 rounded-md p-0.5 mr-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setFilterCategory('subsystem')}
            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
              filterCategory === 'subsystem'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-[#5B6B7A] hover:text-[#17212B]'
            }`}
          >
            Subsystems
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('lot')}
            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
              filterCategory === 'lot'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-[#5B6B7A] hover:text-[#17212B]'
            }`}
          >
            Lots ({lotList.length})
          </button>
        </div>

        {filterCategory === 'subsystem' ? (
          <>
            <button
              type="button"
              onClick={() => onSelectSubsystem('')}
              className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap text-[11px] font-medium border ${
                !focusKey
                  ? 'bg-white border-white text-slate-900 font-bold'
                  : 'border-[#D9E2EA] text-[#5B6B7A] hover:text-[#17212B] hover:bg-[#F8FAFC]'
              }`}
            >
              ALL
            </button>
            {subsystems.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => onSelectSubsystem(s.key)}
                className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 text-[11px] font-medium border ${
                  focusKey === s.key
                    ? 'bg-white border-white text-slate-900 font-bold'
                    : s.status === 'reject'
                    ? 'border-rose-500/40 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20'
                    : 'border-[#D9E2EA] text-[#5B6B7A] hover:text-[#17212B] hover:bg-[#F8FAFC]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    s.status === 'reject' ? 'bg-rose-500' : s.status === 'monitor' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span>{s.key}</span>
              </button>
            ))}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setSelectedLot(null)}
              className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap text-[11px] font-medium border ${
                !selectedLot
                  ? 'bg-white border-white text-slate-900 font-bold'
                  : 'border-[#D9E2EA] text-[#5B6B7A] hover:text-[#17212B] hover:bg-[#F8FAFC]'
              }`}
            >
              ALL LOTS
            </button>
            {lotList.map((lot) => (
              <button
                key={lot.lot_id}
                type="button"
                onClick={() => setSelectedLot(lot.lot_id === selectedLot ? null : lot.lot_id)}
                className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 text-[11px] font-mono border ${
                  selectedLot === lot.lot_id
                    ? 'bg-white border-white text-slate-900 font-bold shadow-sm'
                    : lot.status === 'reject'
                    ? 'border-rose-500/40 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20'
                    : 'border-[#D9E2EA] text-[#5B6B7A] hover:text-[#17212B] hover:bg-[#F8FAFC]'
                }`}
                title={`Filter components to lot ${lot.lot_id} (${lot.count} components)`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    lot.status === 'reject' ? 'bg-rose-500' : lot.status === 'monitor' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span>{lot.lot_id}</span>
                <span className="text-[9.5px] opacity-75 font-sans">({lot.count})</span>
              </button>
            ))}
          </>
        )}
      </div>

      {/* --- VIEW 1: SATELLITE COMPONENTS LIST --- */}
      {viewMode === 'components' && (
        <div className="p-4">
          {displayedComponents.length === 0 ? (
            <div className="p-8 text-center text-[#5B6B7A] border border-dashed border-[#D9E2EA] rounded-lg">
              No components registered for this subsystem. Load demo flight telemetry or upload dataset.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {displayedComponents.map((c) => {
                const isSelected = selectedComponent?.component_id === c.component_id
                const isIsolated = isolatedBuses[c.component_id]
                const isFailover = failovers[c.component_id]
                const isRej = c.status === 'reject'
                const isMon = c.status === 'monitor'

                return (
                  <div
                    key={c.component_id}
                    onClick={() => onSelectComponent(c.component_id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-white/10 border-white shadow-md ring-1 ring-white/30'
                        : isIsolated
                        ? 'bg-rose-500/5 border-rose-500/40 opacity-75'
                        : 'bg-[#F8FAFC] border-[#D9E2EA] hover:border-[#D9E2EA] hover:bg-[#131D33]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isRej ? 'bg-rose-500' : isMon ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                          />
                          <span className="font-mono font-bold text-[#17212B] tracking-tight text-xs">
                            {c.component_id}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#5B6B7A] mt-0.5">
                          Lot: <span className="text-[#5B6B7A] font-mono">{c.lot_id}</span> &bull;{' '}
                          <span className="text-[#5B6B7A] font-medium">{c.subsystem}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded border uppercase ${
                          isRej
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : isMon
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    {/* Operational Telemetry Metrics */}
                    <div className="grid grid-cols-3 gap-1 bg-[#FFFFFF] p-2 rounded border border-[#D9E2EA] text-[10px]">
                      <div>
                        <div className="text-[#5B6B7A] text-[9px]">Drift &Delta;</div>
                        <div
                          className={`font-mono font-bold ${
                            Math.abs(c.pct_drift ?? 0) > 15 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {(c.pct_drift ?? 0) > 0 ? '+' : ''}
                          {(c.pct_drift ?? 0).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[#5B6B7A] text-[9px]">Measured</div>
                        <div className="font-mono font-bold text-[#17212B]">
                          {c.v168.toFixed(1)} &mu;A
                        </div>
                      </div>
                      <div>
                        <div className="text-[#5B6B7A] text-[9px]">Risk Score</div>
                        <div
                          className={`font-mono font-bold ${
                            c.risk_score > 60 ? 'text-rose-400' : c.risk_score > 35 ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {Math.round(c.risk_score)}/100
                        </div>
                      </div>
                    </div>

                    {/* State Badges & Inspect Action */}
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#D9E2EA]/80">
                      <div>
                        {isIsolated && (
                          <span className="text-rose-300 font-medium text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40">
                            Bus Isolated
                          </span>
                        )}
                        {isFailover && (
                          <span className="text-[#17212B] font-medium text-[9px] px-1.5 py-0.5 rounded bg-white/15 border border-white/30 ml-1">
                            Spare B Active
                          </span>
                        )}
                        {!isIsolated && !isFailover && (
                          <span className="text-[#81909D] text-[9.5px]">Link Nominal</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectComponent(c.component_id)
                        }}
                        className="text-[#17212B] hover:text-[#17212B] font-medium text-[10px] hover:underline"
                      >
                        Inspect &rarr;
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Diagnostic Deep-Dive (Cause, Reason, Satellite Impact & Improvement) */}
          {activeComponent && (
            <div className="mt-4 pt-3 border-t border-[#D9E2EA]">
              <ComponentDeepDiveAnalysis
                component={activeComponent}
                onIsolateBus={handleToggleIsolate}
                onFailover={handleToggleFailover}
                isIsolated={Boolean(isolatedBuses[activeComponent.component_id])}
                isFailover={Boolean(failovers[activeComponent.component_id])}
              />
            </div>
          )}
        </div>
      )}

      {/* --- VIEW 2: OPERATIONAL, EXAMINATION & REPAIR COMMAND HUB --- */}
      {viewMode === 'lifecycle' && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* COLUMN 1: OPERATIONAL UNITS */}
          <div className="bg-[#F8FAFC] border border-[#D9E2EA]/80 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#D9E2EA]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h4 className="m-0 font-bold text-xs uppercase text-[#17212B]">
                  Operational Flight Units
                </h4>
              </div>
              <span className="bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-500/30">
                {operationalList.length} Units
              </span>
            </div>

            <div className="text-[11px] text-[#5B6B7A] leading-relaxed">
              Flight equipment operating nominally within qualified tolerance limits. All channels verified.
            </div>

            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
              {operationalList.slice(0, 10).map((item) => (
                <div
                  key={item.component_id}
                  onClick={() => onSelectComponent(item.component_id)}
                  className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D9E2EA] hover:border-[#D9E2EA] cursor-pointer flex items-center justify-between text-xs transition-all"
                >
                  <div>
                    <div className="font-mono font-bold text-[#17212B] text-xs">{item.component_id}</div>
                    <div className="text-[10px] text-[#5B6B7A] mt-0.5">
                      {item.subsystem} &bull; Lot {item.lot_id}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-emerald-400 font-bold">{item.v168.toFixed(1)} &mu;A</div>
                    <div className="text-[9.5px] text-[#5B6B7A]">99.8% HEALTH</div>
                  </div>
                </div>
              ))}
              {operationalList.length > 10 && (
                <div className="text-center text-[#81909D] text-[10px] py-1 font-medium">
                  +{operationalList.length - 10} additional nominal flight units
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: UNDER EXAMINATION */}
          <div className="bg-[#F8FAFC] border border-[#D9E2EA]/80 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#D9E2EA]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h4 className="m-0 font-bold text-xs uppercase text-[#17212B]">
                  Under Examination
                </h4>
              </div>
              <span className="bg-amber-500/15 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-500/30">
                {examinationList.length} Monitoring
              </span>
            </div>

            <div className="text-[11px] text-[#5B6B7A] leading-relaxed">
              Components undergoing MIL-STD-883 HTOL burn-in evaluation or exhibiting subtle drift trends.
            </div>

            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
              {examinationList.length === 0 ? (
                <div className="p-4 text-center text-[#81909D] text-xs border border-dashed border-[#D9E2EA] rounded-lg">
                  No components currently flagged for examination.
                </div>
              ) : (
                examinationList.map((item) => (
                  <div
                    key={item.component_id}
                    onClick={() => onSelectComponent(item.component_id)}
                    className="p-2.5 rounded-lg bg-[#FFFFFF] border border-amber-500/30 hover:border-amber-500/60 cursor-pointer flex flex-col gap-1 text-xs transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#17212B] text-xs">{item.component_id}</span>
                      <span className="font-mono text-amber-400 font-bold">
                        &Delta; {(item.pct_drift ?? 0) > 0 ? '+' : ''}
                        {(item.pct_drift ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#5B6B7A]">
                      <span>
                        {item.subsystem} &bull; Lot {item.lot_id}
                      </span>
                      <span className="font-mono font-semibold text-[#5B6B7A]">Risk {Math.round(item.risk_score)}/100</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: REPAIR & QUARANTINE SECTION */}
          <div className="bg-[#F8FAFC] border border-[#D9E2EA]/80 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#D9E2EA]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h4 className="m-0 font-bold text-xs uppercase text-[#17212B]">
                  Quarantine &amp; Mitigation
                </h4>
              </div>
              <span className="bg-rose-500/15 text-rose-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-rose-500/30">
                {repairList.length} Critical
              </span>
            </div>

            <div className="text-[11px] text-[#5B6B7A] leading-relaxed">
              Components flagged with anomalous defect risk. Operators can execute bus isolation or cold spare failover.
            </div>

            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
              {repairList.length === 0 ? (
                <div className="p-4 text-center text-emerald-400 text-xs border border-dashed border-emerald-500/30 rounded-lg">
                  &#10003; Spacecraft Nominal &mdash; Zero quarantined defects.
                </div>
              ) : (
                repairList.map((item) => {
                  const isIsolated = isolatedBuses[item.component_id]
                  const isFailover = failovers[item.component_id]

                  return (
                    <div
                      key={item.component_id}
                      className="p-2.5 rounded-lg bg-[#FFFFFF] border border-rose-500/40 flex flex-col gap-2 text-xs"
                    >
                      <div
                        onClick={() => onSelectComponent(item.component_id)}
                        className="cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-[#17212B] flex items-center gap-2 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {item.component_id}
                          </div>
                          <div className="text-[10px] text-rose-300 mt-0.5">
                            {item.subsystem} &bull; {item.reason || 'Critical parametric drift'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-rose-400 font-bold font-mono text-xs">
                            Risk {Math.round(item.risk_score)}
                          </div>
                          <div className="text-[9.5px] text-rose-400/80 uppercase font-medium">Quarantined</div>
                        </div>
                      </div>

                      {/* Mitigation Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#D9E2EA]">
                        <button
                          type="button"
                          onClick={() => handleToggleIsolate(item.component_id)}
                          className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all border cursor-pointer ${
                            isIsolated
                              ? 'bg-[#D9363E] text-white border-[#D9363E] font-bold shadow-sm'
                              : 'bg-[#FEF2F2] text-[#D9363E] border-[#D9363E]/40 hover:bg-[#D9363E] hover:text-white'
                          }`}
                        >
                          {isIsolated ? '✓ Bus Isolated' : 'Isolate Bus'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleFailover(item.component_id)}
                          className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all border cursor-pointer ${
                            isFailover
                              ? 'bg-[#0E88D3] text-white border-[#0E88D3] font-bold shadow-sm'
                              : 'bg-[#F8FAFC] text-[#17212B] border-[#D5DEE7] hover:bg-[#E8F0F6]'
                          }`}
                        >
                          {isFailover ? '✓ Spare B Active' : 'Failover Spare'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Diagnostic Deep-Dive in Lifecycle View */}
          {activeComponent && (
            <div className="mt-4 pt-3 border-t border-[#D9E2EA] col-span-1 lg:col-span-3">
              <ComponentDeepDiveAnalysis
                component={activeComponent}
                onIsolateBus={handleToggleIsolate}
                onFailover={handleToggleFailover}
                isIsolated={Boolean(isolatedBuses[activeComponent.component_id])}
                isFailover={Boolean(failovers[activeComponent.component_id])}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
