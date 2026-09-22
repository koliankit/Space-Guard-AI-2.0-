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
    <div className="bg-[#FFFFFF] border border-[#D7E0EA] rounded-xl flex flex-col font-sans text-xs select-none shadow-sm overflow-hidden">
      {/* Action Notification Toast */}
      {actionNotif && (
        <div className="bg-[#005A9C]/10 border-b border-[#005A9C]/20 px-4 py-2 text-center text-[#0B1E36] text-xs font-semibold animate-fade-in flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#005A9C]" />
          <span dangerouslySetInnerHTML={{ __html: actionNotif }} />
        </div>
      )}

      {/* Top Header Bar */}
      <div className="px-4 py-3 border-b border-[#D7E0EA] flex flex-wrap items-center justify-between gap-2 bg-[#F8FAFD]">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#005A9C]" />
          <h3 className="m-0 font-bold text-xs tracking-wide uppercase text-[#0B1E36]">
            Spacecraft Subsystem Hardware &amp; Command Console
          </h3>
          {filterCategory === 'lot' ? (
            <span className="font-mono text-[11px] text-[#005A9C] bg-[#EBF5FB] px-2.5 py-0.5 rounded border border-[#BFD8E8] font-semibold">
              LOT CLASSIFICATION: {selectedLot || 'ALL FLIGHT LOTS'}
            </span>
          ) : activeSub ? (
            <span className="font-mono text-[11px] text-[#005A9C] bg-[#EBF5FB] px-2.5 py-0.5 rounded border border-[#BFD8E8] font-semibold">
              FILTER: [{activeSub.key}] {activeSub.name}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-[#475569] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#D7E0EA] font-medium">
              ALL 11 SUBSYSTEMS REGISTERED
            </span>
          )}
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg border border-[#D7E0EA]">
          <button
            type="button"
            onClick={() => setViewMode('components')}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
              viewMode === 'components'
                ? 'bg-[#FFFFFF] text-[#0B1E36] font-bold shadow-xs border border-[#CBD5E1]'
                : 'text-[#475569] hover:text-[#0B1E36]'
            }`}
          >
            Components ({displayedComponents.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('lifecycle')}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
              viewMode === 'lifecycle'
                ? 'bg-[#FFFFFF] text-[#0B1E36] font-bold shadow-xs border border-[#CBD5E1]'
                : 'text-[#475569] hover:text-[#0B1E36]'
            }`}
          >
            Operational Lifecycle
            {repairList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] text-[9.5px] font-bold font-mono">
                {repairList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Classification Mode & Filter Pills Row */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 bg-[#F8FAFD] border-b border-[#D7E0EA] text-xs">
        {/* Classification Selector: Subsystems vs Lots */}
        <div className="flex items-center bg-[#FFFFFF] border border-[#D7E0EA] rounded-md p-0.5 mr-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setFilterCategory('subsystem')}
            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
              filterCategory === 'subsystem'
                ? 'bg-[#005A9C] text-[#FFFFFF] shadow-xs font-bold'
                : 'text-[#475569] hover:text-[#0B1E36]'
            }`}
          >
            Subsystems
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('lot')}
            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
              filterCategory === 'lot'
                ? 'bg-[#005A9C] text-[#FFFFFF] shadow-xs font-bold'
                : 'text-[#475569] hover:text-[#0B1E36]'
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
                  ? 'bg-[#0B1E36] border-[#0B1E36] text-[#FFFFFF] font-bold shadow-xs'
                  : 'border-[#D7E0EA] bg-[#FFFFFF] text-[#475569] hover:text-[#0B1E36] hover:bg-[#F1F5F9]'
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
                    ? 'bg-[#0B1E36] border-[#0B1E36] text-[#FFFFFF] font-bold shadow-xs'
                    : s.status === 'reject'
                    ? 'border-[#FECACA] text-[#991B1B] bg-[#FEF2F2] hover:bg-[#FEE2E2]'
                    : s.status === 'monitor'
                    ? 'border-[#FDE68A] text-[#92400E] bg-[#FFFBEB] hover:bg-[#FEF3C7]'
                    : 'border-[#D7E0EA] bg-[#FFFFFF] text-[#475569] hover:text-[#0B1E36] hover:bg-[#F1F5F9]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    s.status === 'reject' ? 'bg-[#D9363E]' : s.status === 'monitor' ? 'bg-[#D97706]' : 'bg-[#168A5B]'
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
                  ? 'bg-[#0B1E36] border-[#0B1E36] text-[#FFFFFF] font-bold shadow-xs'
                  : 'border-[#D7E0EA] bg-[#FFFFFF] text-[#475569] hover:text-[#0B1E36] hover:bg-[#F1F5F9]'
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
                    ? 'bg-[#0B1E36] border-[#0B1E36] text-[#FFFFFF] font-bold shadow-xs'
                    : lot.status === 'reject'
                    ? 'border-[#FECACA] text-[#991B1B] bg-[#FEF2F2] hover:bg-[#FEE2E2]'
                    : lot.status === 'monitor'
                    ? 'border-[#FDE68A] text-[#92400E] bg-[#FFFBEB] hover:bg-[#FEF3C7]'
                    : 'border-[#D7E0EA] bg-[#FFFFFF] text-[#475569] hover:text-[#0B1E36] hover:bg-[#F1F5F9]'
                }`}
                title={`Filter components to lot ${lot.lot_id} (${lot.count} components)`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    lot.status === 'reject' ? 'bg-[#D9363E]' : lot.status === 'monitor' ? 'bg-[#D97706]' : 'bg-[#168A5B]'
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
                        ? 'bg-[#EBF5FB] border-[#005A9C] shadow-sm ring-1 ring-[#005A9C]/30'
                        : isIsolated
                        ? 'bg-[#FEF2F2] border-[#FECACA] opacity-80'
                        : 'bg-[#FFFFFF] border-[#D7E0EA] hover:border-[#005A9C] hover:bg-[#F8FAFD] shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isRej ? 'bg-[#D9363E]' : isMon ? 'bg-[#D97706]' : 'bg-[#168A5B]'
                            }`}
                          />
                          <span className="font-mono font-bold text-[#0B1E36] tracking-tight text-xs">
                            {c.component_id}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#475569] mt-0.5">
                          Lot: <span className="text-[#334E68] font-mono font-medium">{c.lot_id}</span> &bull;{' '}
                          <span className="text-[#475569] font-medium">{c.subsystem}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded border uppercase ${
                          isRej
                            ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                            : isMon
                            ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                            : 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    {/* Operational Telemetry Metrics */}
                    <div className="grid grid-cols-3 gap-1 bg-[#F8FAFD] p-2 rounded border border-[#E2E8F0] text-[10px]">
                      <div>
                        <div className="text-[#475569] text-[9px] font-medium">Drift &Delta;</div>
                        <div
                          className={`font-mono font-bold ${
                            Math.abs(c.pct_drift ?? 0) > 15 ? 'text-[#991B1B]' : 'text-[#065F46]'
                          }`}
                        >
                          {(c.pct_drift ?? 0) > 0 ? '+' : ''}
                          {(c.pct_drift ?? 0).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[#475569] text-[9px] font-medium">Measured</div>
                        <div className="font-mono font-bold text-[#0B1E36]">
                          {c.v168.toFixed(1)} &mu;A
                        </div>
                      </div>
                      <div>
                        <div className="text-[#475569] text-[9px] font-medium">Risk Score</div>
                        <div
                          className={`font-mono font-bold ${
                            c.risk_score > 60 ? 'text-[#991B1B]' : c.risk_score > 35 ? 'text-[#92400E]' : 'text-[#065F46]'
                          }`}
                        >
                          {Math.round(c.risk_score)}/100
                        </div>
                      </div>
                    </div>

                    {/* State Badges & Inspect Action */}
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#E2E8F0]">
                      <div>
                        {isIsolated && (
                          <span className="text-[#991B1B] font-medium text-[9px] px-1.5 py-0.5 rounded bg-[#FEF2F2] border border-[#FECACA]">
                            Bus Isolated
                          </span>
                        )}
                        {isFailover && (
                          <span className="text-[#005A9C] font-medium text-[9px] px-1.5 py-0.5 rounded bg-[#EBF5FB] border border-[#BFD8E8] ml-1">
                            Spare B Active
                          </span>
                        )}
                        {!isIsolated && !isFailover && (
                          <span className="text-[#64748B] text-[9.5px]">Link Nominal</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectComponent(c.component_id)
                        }}
                        className="text-[#005A9C] hover:text-[#0B1E36] font-semibold text-[10px] hover:underline"
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
          <div className="bg-[#FFFFFF] border border-[#D7E0EA] rounded-xl p-4 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#168A5B]" />
                <h4 className="m-0 font-bold text-xs uppercase text-[#0B1E36]">
                  Operational Flight Units
                </h4>
              </div>
              <span className="bg-[#ECFDF5] text-[#065F46] text-[10px] font-bold px-2 py-0.5 rounded border border-[#A7F3D0]">
                {operationalList.length} Units
              </span>
            </div>

            <div className="text-[11px] text-[#475569] leading-relaxed">
              Flight equipment operating nominally within qualified tolerance limits. All channels verified.
            </div>

            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
              {operationalList.slice(0, 10).map((item) => (
                <div
                  key={item.component_id}
                  onClick={() => onSelectComponent(item.component_id)}
                  className="p-2.5 rounded-lg bg-[#F8FAFD] border border-[#E2E8F0] hover:border-[#005A9C] hover:bg-[#FFFFFF] cursor-pointer flex items-center justify-between text-xs transition-all shadow-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-[#0B1E36] text-xs">{item.component_id}</div>
                    <div className="text-[10px] text-[#475569] mt-0.5 font-medium">
                      {item.subsystem} &bull; Lot {item.lot_id}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[#065F46] font-bold">{item.v168.toFixed(1)} &mu;A</div>
                    <div className="text-[9.5px] text-[#64748B] font-semibold">99.8% HEALTH</div>
                  </div>
                </div>
              ))}
              {operationalList.length > 10 && (
                <div className="text-center text-[#64748B] text-[10px] py-1 font-medium">
                  +{operationalList.length - 10} additional nominal flight units
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: UNDER EXAMINATION */}
          <div className="bg-[#FFFFFF] border border-[#D7E0EA] rounded-xl p-4 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                <h4 className="m-0 font-bold text-xs uppercase text-[#0B1E36]">
                  Under Examination
                </h4>
              </div>
              <span className="bg-[#FFFBEB] text-[#92400E] text-[10px] font-bold px-2 py-0.5 rounded border border-[#FDE68A]">
                {examinationList.length} Monitoring
              </span>
            </div>

            <div className="text-[11px] text-[#475569] leading-relaxed">
              Components undergoing MIL-STD-883 HTOL burn-in evaluation or exhibiting subtle drift trends.
            </div>

            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
              {examinationList.length === 0 ? (
                <div className="p-4 text-center text-[#64748B] text-xs border border-dashed border-[#D7E0EA] rounded-lg">
                  No components currently flagged for examination.
                </div>
              ) : (
                examinationList.map((item) => (
                  <div
                    key={item.component_id}
                    onClick={() => onSelectComponent(item.component_id)}
                    className="p-2.5 rounded-lg bg-[#FFFBEB]/40 border border-[#FDE68A] hover:border-[#D97706] cursor-pointer flex flex-col gap-1 text-xs transition-all shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#0B1E36] text-xs">{item.component_id}</span>
                      <span className="font-mono text-[#92400E] font-bold">
                        &Delta; {(item.pct_drift ?? 0) > 0 ? '+' : ''}
                        {(item.pct_drift ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#475569]">
                      <span className="font-medium">
                        {item.subsystem} &bull; Lot {item.lot_id}
                      </span>
                      <span className="font-mono font-bold text-[#92400E]">Risk {Math.round(item.risk_score)}/100</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: REPAIR & QUARANTINE SECTION */}
          <div className="bg-[#FFFFFF] border border-[#D7E0EA] rounded-xl p-4 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D9363E]" />
                <h4 className="m-0 font-bold text-xs uppercase text-[#0B1E36]">
                  Quarantine &amp; Mitigation
                </h4>
              </div>
              <span className="bg-[#FEF2F2] text-[#991B1B] text-[10px] font-bold px-2 py-0.5 rounded border border-[#FECACA]">
                {repairList.length} Critical
              </span>
            </div>

            <div className="text-[11px] text-[#475569] leading-relaxed">
              Components flagged with anomalous defect risk. Operators can execute bus isolation or cold spare failover.
            </div>

            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
              {repairList.length === 0 ? (
                <div className="p-4 text-center text-[#065F46] bg-[#ECFDF5] text-xs border border-dashed border-[#A7F3D0] rounded-lg font-medium">
                  &#10003; Spacecraft Nominal &mdash; Zero quarantined defects.
                </div>
              ) : (
                repairList.map((item) => {
                  const isIsolated = isolatedBuses[item.component_id]
                  const isFailover = failovers[item.component_id]

                  return (
                    <div
                      key={item.component_id}
                      className="p-2.5 rounded-lg bg-[#FEF2F2]/40 border border-[#FECACA] flex flex-col gap-2 text-xs shadow-xs"
                    >
                      <div
                        onClick={() => onSelectComponent(item.component_id)}
                        className="cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-[#0B1E36] flex items-center gap-2 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D9363E]" />
                            {item.component_id}
                          </div>
                          <div className="text-[10px] text-[#991B1B] mt-0.5 font-medium">
                            {item.subsystem} &bull; {item.reason || 'Critical parametric drift'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#991B1B] font-bold font-mono text-xs">
                            Risk {Math.round(item.risk_score)}
                          </div>
                          <div className="text-[9.5px] text-[#991B1B] uppercase font-bold">Quarantined</div>
                        </div>
                      </div>

                      {/* Mitigation Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#FECACA]/60">
                        <button
                          type="button"
                          onClick={() => handleToggleIsolate(item.component_id)}
                          className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all border cursor-pointer ${
                            isIsolated
                              ? 'bg-[#D9363E] text-white border-[#D9363E] font-bold shadow-xs'
                              : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA] hover:bg-[#D9363E] hover:text-white'
                          }`}
                        >
                          {isIsolated ? '✓ Bus Isolated' : 'Isolate Bus'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleFailover(item.component_id)}
                          className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all border cursor-pointer ${
                            isFailover
                              ? 'bg-[#005A9C] text-white border-[#005A9C] font-bold shadow-xs'
                              : 'bg-[#FFFFFF] text-[#0B1E36] border-[#D7E0EA] hover:bg-[#F1F5F9]'
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
