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

  const handleToggleFailover = (id: string) => {
    setFailovers((prev) => {
      const next = !prev[id]
      triggerNotif(next ? `[FAILOVER]: Redundant Cold Spare Unit B active for ${id}.` : `[FAILOVER]: Primary Unit A active for ${id}.`)
      return { ...prev, [id]: next }
    })
  }

  // Filtered components based on active subsystem focus
  const displayedComponents = useMemo(() => {
    if (!focusKey) return components.slice(0, 48)
    return components.filter((c) => c.subsystem === focusKey)
  }, [components, focusKey])

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
    <div className="bg-panel border-b border-line flex flex-col font-mono text-xs select-none">
      {/* Action Notification Toast */}
      {actionNotif && (
        <div className="bg-cyan/15 border-b border-cyan/40 px-3 py-1.5 text-center text-cyan text-[11px] font-bold animate-fade-in flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan led" />
          <span dangerouslySetInnerHTML={{ __html: actionNotif }} />
        </div>
      )}

      {/* Top Header Bar */}
      <div className="p-3 border-b border-line flex flex-wrap items-center justify-between gap-2 bg-[#041527]/70">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent led" />
          <h3 className="m-0 font-display font-bold text-xs tracking-wider uppercase text-white">
            Satellite Hardware &amp; Operational Command Hub
          </h3>
          {activeSub ? (
            <span className="font-mono text-[10px] text-accent bg-accent/15 px-2 py-0.5 rounded border border-accent/30">
              FILTER: [{activeSub.key}] {activeSub.name}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-muted bg-bg px-2 py-0.5 rounded border border-line">
              SHOWING ALL 11 SUBSYSTEMS
            </span>
          )}
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-bg p-0.5 rounded border border-line">
          <button
            type="button"
            onClick={() => setViewMode('components')}
            className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
              viewMode === 'components'
                ? 'bg-accent/20 text-accent border border-accent/40 shadow-neon-green'
                : 'text-muted hover:text-white border border-transparent'
            }`}
          >
            &#9638; SATELLITE COMPONENTS ({displayedComponents.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('lifecycle')}
            className={`px-3 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'lifecycle'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-neon-cyan'
                : 'text-muted hover:text-white border border-transparent'
            }`}
          >
            &#9881; OPERATIONAL &amp; REPAIR LIFECYCLE
            {repairList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-reject text-white text-[9px]">
                {repairList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Subsystem Quick Filter Pills */}
      <div className="flex items-center gap-1 overflow-x-auto px-3 py-1.5 bg-[#030F1C] border-b border-line text-[10px]">
        <span className="text-muted tracking-wider uppercase mr-1 whitespace-nowrap text-[9px]">
          SUBSYSTEM:
        </span>
        <button
          type="button"
          onClick={() => onSelectSubsystem('')}
          className={`px-2 py-0.5 rounded border transition-all whitespace-nowrap ${
            !focusKey
              ? 'bg-accent/20 border-accent text-accent font-bold shadow-neon-green'
              : 'border-line text-muted hover:text-white'
          }`}
        >
          ALL
        </button>
        {subsystems.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelectSubsystem(s.key)}
            className={`px-2 py-0.5 rounded border transition-all whitespace-nowrap flex items-center gap-1 ${
              focusKey === s.key
                ? 'bg-accent/20 border-accent text-accent font-bold shadow-neon-green'
                : s.status === 'reject'
                ? 'border-reject/40 text-reject hover:bg-reject/10'
                : 'border-line text-muted hover:text-white'
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor:
                  s.status === 'reject' ? '#FF334B' : s.status === 'monitor' ? '#FFB020' : '#00FF87',
              }}
            />
            <span>{s.key}</span>
          </button>
        ))}
      </div>

      {/* --- VIEW 1: SATELLITE COMPONENTS LIST --- */}
      {viewMode === 'components' && (
        <div className="p-3">
          {displayedComponents.length === 0 ? (
            <div className="p-8 text-center text-muted border border-dashed border-line rounded">
              No components registered for this subsystem. Load demo flight telemetry or upload dataset.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[360px] overflow-y-auto pr-1">
              {displayedComponents.map((c) => {
                const isSelected = selectedComponent?.component_id === c.component_id
                const isIsolated = isolatedBuses[c.component_id]
                const isFailover = failovers[c.component_id]
                const statusColor =
                  c.status === 'reject' ? '#FF334B' : c.status === 'monitor' ? '#FFB020' : '#00FF87'

                return (
                  <div
                    key={c.component_id}
                    onClick={() => onSelectComponent(c.component_id)}
                    className={`p-2.5 rounded border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-accent/15 border-accent shadow-neon-green'
                        : isIsolated
                        ? 'bg-reject/10 border-reject/50 opacity-75'
                        : 'bg-panel2 border-line hover:border-accent/40 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
                          />
                          <span className="font-bold text-white tracking-wider">
                            {c.component_id}
                          </span>
                        </div>
                        <div className="text-[9px] text-muted mt-0.5">
                          LOT: <span className="text-slate-300 font-bold">{c.lot_id}</span> &bull;{' '}
                          <span className="text-accent font-semibold">{c.subsystem}</span>
                        </div>
                      </div>

                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase"
                        style={{
                          backgroundColor: `${statusColor}15`,
                          color: statusColor,
                          borderColor: `${statusColor}50`,
                        }}
                      >
                        {c.status}
                      </span>
                    </div>

                    {/* Operational Telemetry Metrics */}
                    <div className="grid grid-cols-3 gap-1 bg-bg/80 p-1.5 rounded border border-line/60 text-[9px]">
                      <div>
                        <div className="text-muted text-[8px]">DRIFT &Delta;</div>
                        <div
                          className={`font-bold ${
                            Math.abs(c.pct_drift ?? 0) > 15 ? 'text-reject' : 'text-safe'
                          }`}
                        >
                          {(c.pct_drift ?? 0) > 0 ? '+' : ''}
                          {(c.pct_drift ?? 0).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted text-[8px]">CURRENT</div>
                        <div className="font-bold text-slate-200">
                          {c.v168.toFixed(1)} &mu;A
                        </div>
                      </div>
                      <div>
                        <div className="text-muted text-[8px]">RISK SCORE</div>
                        <div
                          className={`font-bold ${
                            c.risk_score > 60 ? 'text-reject' : c.risk_score > 35 ? 'text-monitor' : 'text-safe'
                          }`}
                        >
                          {Math.round(c.risk_score)}/100
                        </div>
                      </div>
                    </div>

                    {/* State Badges & Inspect Action */}
                    <div className="flex items-center justify-between text-[9px] pt-1 border-t border-line/40">
                      <div>
                        {isIsolated && (
                          <span className="text-reject font-bold text-[8.5px] px-1 rounded bg-reject/20 border border-reject/40">
                            BUS ISOLATED
                          </span>
                        )}
                        {isFailover && (
                          <span className="text-cyan font-bold text-[8.5px] px-1 rounded bg-cyan/20 border border-cyan/40 ml-1">
                            SPARE B ACTIVE
                          </span>
                        )}
                        {!isIsolated && !isFailover && (
                          <span className="text-muted text-[8.5px]">NOMINAL LINK</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectComponent(c.component_id)
                        }}
                        className="text-accent hover:text-white font-bold text-[9px] hover:underline"
                      >
                        INSPECT 3D &rarr;
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Diagnostic Deep-Dive (Cause, Reason, Satellite Impact & Improvement) */}
          {activeComponent && (
            <div className="mt-4 pt-3 border-t border-slate-800">
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
        <div className="p-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* COLUMN 1: OPERATIONAL TASK (Nominal & Active Flight Units) */}
          <div className="bg-[#021A10]/70 border border-safe/40 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-safe/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-safe led" />
                <h4 className="m-0 font-display font-bold text-xs uppercase text-safe">
                  Operational Units
                </h4>
              </div>
              <span className="bg-safe/20 text-safe text-[10px] font-bold px-2 py-0.5 rounded border border-safe/40">
                {operationalList.length} IN FLIGHT
              </span>
            </div>

            <div className="text-[10px] text-muted leading-relaxed">
              Flight equipment operating nominally within qualified tolerance limits. All thermal and power bus channels verified.
            </div>

            <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
              {operationalList.slice(0, 10).map((item) => (
                <div
                  key={item.component_id}
                  onClick={() => onSelectComponent(item.component_id)}
                  className="p-2 rounded bg-bg/80 border border-line/60 hover:border-safe cursor-pointer flex items-center justify-between text-[10px] transition-all"
                >
                  <div>
                    <div className="font-bold text-white">{item.component_id}</div>
                    <div className="text-[9px] text-muted">
                      {item.subsystem} &bull; LOT {item.lot_id}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-safe font-bold">{item.v168.toFixed(1)} &mu;A</div>
                    <div className="text-[9px] text-muted">99.8% HEALTH</div>
                  </div>
                </div>
              ))}
              {operationalList.length > 10 && (
                <div className="text-center text-muted text-[9px] py-1">
                  +{operationalList.length - 10} additional operational units active
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: UNDER EXAMINATION (Diagnostic & Burn-In Testing) */}
          <div className="bg-[#1A1202]/70 border border-monitor/40 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-monitor/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-monitor led" />
                <h4 className="m-0 font-display font-bold text-xs uppercase text-monitor">
                  Under Examination
                </h4>
              </div>
              <span className="bg-monitor/20 text-monitor text-[10px] font-bold px-2 py-0.5 rounded border border-monitor/40">
                {examinationList.length} MONITORING
              </span>
            </div>

            <div className="text-[10px] text-muted leading-relaxed">
              Components undergoing MIL-STD-883 HTOL burn-in stress evaluation or exhibiting subtle non-linear parametric drift trends.
            </div>

            <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
              {examinationList.length === 0 ? (
                <div className="p-4 text-center text-muted text-[10px] border border-dashed border-line rounded">
                  No components currently flagged for examination.
                </div>
              ) : (
                examinationList.map((item) => (
                  <div
                    key={item.component_id}
                    onClick={() => onSelectComponent(item.component_id)}
                    className="p-2 rounded bg-bg/80 border border-monitor/40 hover:border-monitor cursor-pointer flex flex-col gap-1 text-[10px] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{item.component_id}</span>
                      <span className="text-monitor font-bold">
                        &Delta; {(item.pct_drift ?? 0) > 0 ? '+' : ''}
                        {(item.pct_drift ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-muted">
                      <span>
                        {item.subsystem} &bull; LOT {item.lot_id}
                      </span>
                      <span>RISK {Math.round(item.risk_score)}/100</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: REPAIR & QUARANTINE SECTION (Mitigation & Failover) */}
          <div className="bg-[#24040A]/80 border border-reject/50 rounded-lg p-3 flex flex-col gap-2 shadow-neon-red">
            <div className="flex items-center justify-between pb-2 border-b border-reject/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-reject dot-pulse" />
                <h4 className="m-0 font-display font-bold text-xs uppercase text-reject">
                  Repair &amp; Quarantine
                </h4>
              </div>
              <span className="bg-reject/20 text-reject text-[10px] font-bold px-2 py-0.5 rounded border border-reject/40">
                {repairList.length} CRITICAL
              </span>
            </div>

            <div className="text-[10px] text-muted leading-relaxed">
              Components flagged with anomalous defect risk. Operators can execute redundant hardware failover, isolate power buses, or dispatch mitigation patches.
            </div>

            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
              {repairList.length === 0 ? (
                <div className="p-4 text-center text-safe text-[10px] border border-dashed border-safe/30 rounded">
                  &#10003; Spacecraft Nominal &mdash; Zero components in quarantine.
                </div>
              ) : (
                repairList.map((item) => {
                  const isIsolated = isolatedBuses[item.component_id]
                  const isFailover = failovers[item.component_id]

                  return (
                    <div
                      key={item.component_id}
                      className="p-2.5 rounded bg-bg/90 border border-reject/60 flex flex-col gap-2 text-[10px]"
                    >
                      <div
                        onClick={() => onSelectComponent(item.component_id)}
                        className="cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-reject led" />
                            {item.component_id}
                          </div>
                          <div className="text-[9px] text-rose-300">
                            {item.subsystem} &bull; {item.reason || 'Critical parametric drift'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-reject font-bold font-mono">
                            RISK {Math.round(item.risk_score)}
                          </div>
                          <div className="text-[8.5px] text-muted">REJECTED</div>
                        </div>
                      </div>

                      {/* Interactive Emergency Control Buttons */}
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-line">
                        <button
                          type="button"
                          onClick={() => handleToggleIsolate(item.component_id)}
                          className={`flex-1 py-1 px-1.5 rounded text-[9px] font-bold transition-all border ${
                            isIsolated
                              ? 'bg-reject/30 text-white border-reject font-bold'
                              : 'bg-bg text-reject border-reject/40 hover:bg-reject/20'
                          }`}
                        >
                          {isIsolated ? '&#10003; BUS ISOLATED' : 'ISOLATE BUS'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleFailover(item.component_id)}
                          className={`flex-1 py-1 px-1.5 rounded text-[9px] font-bold transition-all border ${
                            isFailover
                              ? 'bg-cyan/30 text-white border-cyan font-bold'
                              : 'bg-bg text-cyan border-cyan/40 hover:bg-cyan/20'
                          }`}
                        >
                          {isFailover ? '&#10003; SPARE B ACTIVE' : 'FAILOVER SPARE'}
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
            <div className="mt-4 pt-3 border-t border-slate-800 col-span-1 lg:col-span-3">
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
