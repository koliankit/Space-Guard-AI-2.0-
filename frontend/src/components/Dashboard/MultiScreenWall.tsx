import { useState } from 'react'
import type { ComponentOut, MissionStatus, SubsystemStatus } from '../../types'
import SatelliteScene from '../Satellite/SatelliteScene'
import TelemetryChart from '../Charts/TelemetryChart'
import MissionMap from '../MissionMap/MissionMap'
import ComponentDiagram from '../Diagrams/ComponentDiagram'

interface MultiScreenWallProps {
  mission: MissionStatus | null
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  onSelectSubsystem: (subKey: string) => void
  focusKey: string | null
  running: boolean
}

const DEFAULT_SUBSYSTEMS: SubsystemStatus[] = [
  { key: 'PWR', name: 'Power System', position: [0.55, 0.42, 0.62], count: 48, status: 'safe', avg_risk: 12, top_component: 'PWR-MOSFET-401' },
  { key: 'BAT', name: 'Battery Module', position: [0.55, -0.42, 0.62], count: 24, status: 'safe', avg_risk: 14, top_component: 'BAT-CELL-101' },
  { key: 'SOLAR', name: 'Solar Array', position: [2.55, 0.0, 0.0], count: 32, status: 'safe', avg_risk: 8, top_component: 'SOLAR-CELL-202' },
  { key: 'FC', name: 'Flight Computer', position: [0.55, 0.55, -0.20], count: 52, status: 'reject', avg_risk: 84, top_component: 'FC-ASIC-088' },
  { key: 'COM', name: 'Communication Module', position: [-0.20, 0.62, 0.55], count: 36, status: 'safe', avg_risk: 18, top_component: 'COM-LNA-501' },
  { key: 'TEL', name: 'Telemetry Module', position: [-0.20, 0.62, -0.55], count: 28, status: 'safe', avg_risk: 15, top_component: 'TEL-ENCODER-603' },
  { key: 'NAV', name: 'Navigation Unit', position: [0.0, 0.10, 0.95], count: 40, status: 'safe', avg_risk: 22, top_component: 'NAV-GYRO-701' },
  { key: 'THM', name: 'Thermal Control', position: [0.0, 0.0, -0.85], count: 24, status: 'safe', avg_risk: 14, top_component: 'THM-HEATER-801' },
  { key: 'SEN', name: 'Sensor Module', position: [-0.75, 0.30, 0.40], count: 30, status: 'safe', avg_risk: 16, top_component: 'SEN-MAG-901' },
  { key: 'PAY', name: 'Payload Instruments', position: [-0.85, -0.30, -0.10], count: 32, status: 'safe', avg_risk: 16, top_component: 'PAY-CCD-001' },
  { key: 'CTL', name: 'Control Electronics', position: [0.75, -0.55, -0.30], count: 26, status: 'safe', avg_risk: 19, top_component: 'CTL-RWHEEL-111' },
]

export default function MultiScreenWall({
  mission,
  components,
  selected,
  onSelectComponent,
  onSelectSubsystem,
  focusKey,
}: MultiScreenWallProps) {
  const rejected = components.filter((c) => c.status === 'reject')
  const monitored = components.filter((c) => c.status === 'monitor')
  const safe = components.filter((c) => c.status === 'safe')
  const [activeScreenTab, setActiveScreenTab] = useState<'all' | '1' | '2' | '3' | '4'>('all')
  const [showSchematics, setShowSchematics] = useState(false)

  const subsystems: SubsystemStatus[] = mission?.subsystems ?? DEFAULT_SUBSYSTEMS

  return (
    <div className="flex flex-col flex-1 bg-[#060913] text-slate-100 font-mono select-none overflow-x-auto min-h-[calc(100vh-140px)]">
      {/* Wall Header Banner: ISRO Sriharikota Mission Control Display Wall */}
      <div className="bg-[#090F1E] border-b border-slate-800 px-5 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-cyan/15 border border-cyan/40 text-cyan text-[11px] font-display font-black tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan led" />
            SDSC SHAR // MCC PANORAMIC 2x2 COMMAND WALL
          </div>
          <span className="text-slate-400 text-xs hidden md:inline">
            Range Operations Directorate &bull; Launch Control Centre (LCC)
          </span>
        </div>

        {/* Live Synchronized MCC Status Banner */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0D1527] border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 led" />
            <span className="text-slate-400 text-[10px]">RANGE:</span>
            <span className="text-emerald-400 font-bold text-[11px]">ARMED &bull; GREEN</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0D1527] border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan led" />
            <span className="text-slate-400 text-[10px]">DOWNLINK:</span>
            <span className="text-cyan font-bold text-[11px]">ISTRAC S/X LOCKED</span>
          </div>
          <div className="flex items-center gap-1 bg-[#0D1527] p-0.5 rounded border border-slate-800">
            <span className="text-slate-400 text-[10px] px-1.5">BAY:</span>
            {(['all', '1', '2', '3', '4'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveScreenTab(mode)}
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all border ${
                  activeScreenTab === mode
                    ? 'bg-cyan text-black border-cyan font-black'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-slate-800'
                }`}
              >
                {mode === 'all' ? '2x2 QUAD' : `SCR ${mode}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Panoramic Multi-Screen Command Wall Grid - Spacious 2x2 Layout */}
      <div className="p-4 flex-1 flex flex-col gap-4">
        <div
          className={`grid gap-4 flex-1 ${
            activeScreenTab === 'all'
              ? 'grid-cols-1 lg:grid-cols-2'
              : 'grid-cols-1'
          }`}
        >
          {/* ================= SCREEN 01: FLIGHT DYNAMICS & RANGE SAFETY ================= */}
          {(activeScreenTab === 'all' || activeScreenTab === '1') && (
            <div className="flex flex-col rounded-xl bg-[#090F1E] border border-slate-800 shadow-xl overflow-hidden min-h-[460px]">
              {/* Bezel Top Bar */}
              <div className="bg-[#0D162B] border-b border-slate-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-cyan/20 text-cyan text-[10px] font-bold border border-cyan/40">
                    SCREEN 01
                  </span>
                  <span className="text-xs font-display font-black text-white tracking-wider">
                    RANGE SAFETY &amp; ORBIT DYNAMICS
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 led" />
                  <span className="text-cyan font-bold">RSO CONSOLE</span>
                </div>
              </div>

              {/* Screen Content */}
              <div className="p-3 flex-1 flex flex-col gap-3">
                {/* Orbit Telemetry Strip */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-[#070D1A] border border-slate-800/80">
                    <div className="text-[9px] text-slate-400 uppercase tracking-wider">Altitude</div>
                    <div className="text-base font-bold text-cyan font-mono">520.4 KM</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#070D1A] border border-slate-800/80">
                    <div className="text-[9px] text-slate-400 uppercase tracking-wider">Velocity</div>
                    <div className="text-base font-bold text-emerald-400 font-mono">7.61 KM/S</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#070D1A] border border-slate-800/80">
                    <div className="text-[9px] text-slate-400 uppercase tracking-wider">Inclination</div>
                    <div className="text-base font-bold text-slate-100 font-mono">97.42&deg;</div>
                  </div>
                </div>

                {/* Radar Map */}
                <div className="rounded-lg border border-slate-800 overflow-hidden bg-[#070D1A] flex-1 min-h-[220px]">
                  <MissionMap critical={rejected.length > 0} />
                </div>

                {/* Ground Tracking Network */}
                <div className="p-2.5 rounded-lg bg-[#070D1A] border border-slate-800 text-[10px]">
                  <div className="flex justify-between items-center text-cyan font-bold uppercase mb-1.5">
                    <span>ISTRAC Ground Stations</span>
                    <span className="text-emerald-400">5 OF 5 TRACKING LOCKED</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[9.5px] text-slate-300">
                    <div className="flex justify-between bg-slate-900/50 p-1 rounded">
                      <span>SHAR (SRIHARIKOTA):</span>
                      <span className="text-emerald-400 font-bold">AZ: 142&deg; EL: 68&deg;</span>
                    </div>
                    <div className="flex justify-between bg-slate-900/50 p-1 rounded">
                      <span>PORT BLAIR:</span>
                      <span className="text-emerald-400 font-bold">AZ: 210&deg; EL: 44&deg;</span>
                    </div>
                    <div className="flex justify-between bg-slate-900/50 p-1 rounded">
                      <span>BRUNEI STATION:</span>
                      <span className="text-emerald-400 font-bold">AZ: 098&deg; EL: 52&deg;</span>
                    </div>
                    <div className="flex justify-between bg-slate-900/50 p-1 rounded">
                      <span>BIAK (INDONESIA):</span>
                      <span className="text-cyan font-bold">AZ: 045&deg; EL: 31&deg;</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bezel Bottom Status */}
              <div className="bg-[#070D1A] border-t border-slate-800 px-4 py-1.5 text-[10px] text-slate-400 flex justify-between">
                <span>FEED: PRIMARY RADAR TEL-1</span>
                <span className="text-cyan">DOPPLER LOCK: +14.2 kHz</span>
              </div>
            </div>
          )}

          {/* ================= SCREEN 02: 3D SPACECRAFT DIGITAL TWIN ================= */}
          {(activeScreenTab === 'all' || activeScreenTab === '2') && (
            <div className="flex flex-col rounded-xl bg-[#090F1E] border border-slate-800 shadow-xl overflow-hidden min-h-[460px]">
              {/* Bezel Top Bar */}
              <div className="bg-[#0D162B] border-b border-slate-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-cyan/20 text-cyan text-[10px] font-bold border border-cyan/40">
                    SCREEN 02
                  </span>
                  <span className="text-xs font-display font-black text-white tracking-wider">
                    SPACECRAFT 3D DIGITAL TWIN &amp; AOCS
                  </span>
                  {selected && (
                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border ${
                      selected.status === 'reject'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                        : selected.status === 'monitor'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    }`}>
                      TARGET: {selected.component_id} [{selected.subsystem}]
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan led" />
                  <span className="text-cyan font-bold">VEHICLE CONSOLE</span>
                </div>
              </div>

              {/* Screen Content */}
              <div className="p-3 flex-1 flex flex-col gap-3">
                {/* 3D Viewport with Target Component HUD */}
                <div className="relative flex-1 min-h-[290px] rounded-lg border border-slate-800 bg-[radial-gradient(ellipse_at_50%_40%,#0C203E_0%,#060B14_85%)] overflow-hidden">
                  <SatelliteScene
                    subsystems={subsystems}
                    onSelect={onSelectSubsystem}
                    focusKey={focusKey}
                    selectedComponent={selected}
                  />
                </div>

                {/* Subsystem Quick Selector Cards */}
                <div className="grid grid-cols-4 gap-1.5 text-[9.5px]">
                  {subsystems.slice(0, 8).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => onSelectSubsystem(s.key)}
                      className={`p-1.5 rounded border text-left transition-all ${
                        focusKey === s.key || selected?.subsystem === s.key
                          ? 'bg-cyan/20 border-cyan text-white shadow-neon-cyan'
                          : s.status === 'reject'
                          ? 'bg-rose-500/15 border-rose-500/50 text-rose-400'
                          : 'bg-[#070D1A] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold flex justify-between">
                        <span>[{s.key}]</span>
                        <span className={s.status === 'reject' ? 'text-rose-400 font-black' : 'text-emerald-400'}>
                          {Math.max(0, 100 - Math.round(s.avg_risk))}%
                        </span>
                      </div>
                      <div className="truncate text-[8.5px] text-slate-400">{s.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bezel Bottom Status */}
              <div className="bg-[#070D1A] border-t border-slate-800 px-4 py-1.5 text-[10px] text-slate-400 flex justify-between">
                <span>ATTITUDE: P: +0.02&deg; | R: -0.01&deg; | Y: +0.04&deg;</span>
                <span className="text-emerald-400">BUS VOLTAGE: 28.12V NOMINAL</span>
              </div>
            </div>
          )}

          {/* ================= SCREEN 03: HTOL SILICON OSCILLOSCOPE ================= */}
          {(activeScreenTab === 'all' || activeScreenTab === '3') && (
            <div className="flex flex-col rounded-xl bg-[#090F1E] border border-slate-800 shadow-xl overflow-hidden min-h-[460px]">
              {/* Bezel Top Bar */}
              <div className="bg-[#0D162B] border-b border-slate-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-cyan/20 text-cyan text-[10px] font-bold border border-cyan/40">
                    SCREEN 03
                  </span>
                  <span className="text-xs font-display font-black text-white tracking-wider">
                    HTOL 168H SILICON TELEMETRY &amp; DRIFT
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 led" />
                  <span className="text-rose-400 font-bold">AI SCREENING</span>
                </div>
              </div>

              {/* Screen Content */}
              <div className="p-3 flex-1 flex flex-col gap-3">
                {/* Oscilloscope Panel */}
                <div className="rounded-lg border border-slate-800 bg-[#070D1A] overflow-hidden flex-1 min-h-[220px]">
                  <TelemetryChart component={selected} />
                </div>

                {/* Selected Component Quick Stats */}
                {selected ? (
                  <div className="p-2.5 rounded-lg bg-[#070D1A] border border-slate-800 text-[10px] space-y-1.5">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-white text-xs">{selected.component_id}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                          selected.status === 'reject'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                            : selected.status === 'monitor'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                        }`}
                      >
                        {selected.status.toUpperCase()} (RISK: {selected.risk_score}/100)
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-[9.5px] text-slate-300 bg-slate-900/60 p-1.5 rounded">
                      <div>0h: <b className="text-slate-100">{selected.v0.toFixed(1)}&mu;A</b></div>
                      <div>24h: <b className="text-slate-100">{selected.v24.toFixed(1)}&mu;A</b></div>
                      <div>96h: <b className="text-slate-100">{selected.v96 != null ? selected.v96.toFixed(1) : '-'}&mu;A</b></div>
                      <div>168h: <b className="text-rose-400">{selected.v168.toFixed(1)}&mu;A</b></div>
                    </div>
                    <div className="text-[9.5px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
                      <span>Lot z-Score: <b className="text-cyan">{selected.z168 > 0 ? '+' : ''}{selected.z168.toFixed(2)}&sigma;</b></span>
                      <span>Extrapolated (+96h): <b className="text-rose-400">{selected.predicted_future.toFixed(1)}&mu;A</b></span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 bg-[#070D1A] rounded-lg border border-slate-800">
                    Select a component from the anomaly ledger or 3D view to inspect oscilloscope telemetry.
                  </div>
                )}
              </div>

              {/* Bezel Bottom Status */}
              <div className="bg-[#070D1A] border-t border-slate-800 px-4 py-1.5 text-[10px] text-slate-400 flex justify-between">
                <span>SAMPLING: 24-BIT SIGMA-DELTA ADC</span>
                <span className="text-cyan">OVEN TEMP: 125.0&deg;C CONSTANT</span>
              </div>
            </div>
          )}

          {/* ================= SCREEN 04: SCREENING LEDGER & DEFECT QUARANTINE ================= */}
          {(activeScreenTab === 'all' || activeScreenTab === '4') && (
            <div className="flex flex-col rounded-xl bg-[#090F1E] border border-slate-800 shadow-xl overflow-hidden min-h-[460px]">
              {/* Bezel Top Bar */}
              <div className="bg-[#0D162B] border-b border-slate-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-cyan/20 text-cyan text-[10px] font-bold border border-cyan/40">
                    SCREEN 04
                  </span>
                  <span className="text-xs font-display font-black text-white tracking-wider">
                    ANOMALY LEDGER &amp; QUARANTINE
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 led" />
                  <span className="text-emerald-400 font-bold">MD CONSOLE</span>
                </div>
              </div>

              {/* Screen Content */}
              <div className="p-3 flex-1 flex flex-col gap-3 overflow-hidden">
                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-[#070D1A] border border-slate-800">
                    <div className="text-[9px] text-slate-400">SAFE</div>
                    <div className="text-base font-bold text-emerald-400">{safe.length}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#070D1A] border border-slate-800">
                    <div className="text-[9px] text-slate-400">MONITOR</div>
                    <div className="text-base font-bold text-amber-400">{monitored.length}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#070D1A] border border-slate-800">
                    <div className="text-[9px] text-slate-400">QUARANTINE</div>
                    <div className="text-base font-bold text-rose-400">{rejected.length}</div>
                  </div>
                </div>

                {/* Quarantined Anomaly Ledger Table */}
                <div className="flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-[#070D1A] max-h-[220px]">
                  <table className="w-full text-left text-[10px] font-mono border-collapse">
                    <thead className="bg-[#0D162B] text-[8.5px] uppercase text-slate-400 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-1.5 px-2.5">Part ID</th>
                        <th className="py-1.5 px-2">Sub</th>
                        <th className="py-1.5 px-2">168h</th>
                        <th className="py-1.5 px-2">Lot &mu;</th>
                        <th className="py-1.5 px-2">z-Score</th>
                        <th className="py-1.5 px-2">Spec vs AI</th>
                        <th className="py-1.5 px-2">Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {rejected.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-slate-400 text-xs">
                            No quarantined defects. All nominal.
                          </td>
                        </tr>
                      )}
                      {rejected.map((c) => {
                        const isAbnormalInSpec = c.traditional_decision === 'PASS'
                        return (
                          <tr
                            key={c.component_id}
                            onClick={() => onSelectComponent(c.component_id)}
                            className={`cursor-pointer transition-colors ${
                              selected?.component_id === c.component_id
                                ? 'bg-rose-500/20 text-white font-bold'
                                : 'hover:bg-slate-800/40 text-slate-200'
                            }`}
                          >
                            <td className="py-1.5 px-2.5 font-bold text-white">{c.component_id}</td>
                            <td className="py-1.5 px-2 text-cyan font-bold">[{c.subsystem}]</td>
                            <td className="py-1.5 px-2 text-rose-400 font-bold">{c.v168.toFixed(1)}&mu;A</td>
                            <td className="py-1.5 px-2 text-slate-300">{c.lot_mean != null ? `${c.lot_mean.toFixed(1)}` : '--'}</td>
                            <td className="py-1.5 px-2 text-rose-400 font-bold">{c.z168 > 0 ? '+' : ''}{c.z168.toFixed(2)}&sigma;</td>
                            <td className="py-1.5 px-2 whitespace-nowrap">
                              {isAbnormalInSpec ? (
                                <span className="px-1.5 py-0.5 rounded text-[8.5px] bg-purple-500/20 text-purple-300 border border-purple-400/40 font-bold">
                                  PASS Spec &bull; REJECT AI
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[8.5px] bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold">
                                  FAIL SPEC
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-rose-400 font-bold">{c.risk_score}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Critical Quarantine Alert Box */}
                {rejected.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-[9.5px] space-y-1">
                    <div className="text-rose-400 font-bold uppercase flex items-center gap-1.5">
                      <span>&#9888;</span> QUARANTINE PROTOCOL ENGAGED ({rejected.length} DEFECTS)
                    </div>
                    <div className="text-slate-300">
                      Root cause: Latent oxide degradation &amp; lot-relative drift anomaly identified. Components remain within fixed datasheet limits (&le;50&mu;A) but drift abnormal relative to lot peers. Click any row above to inspect in 3D.
                    </div>
                  </div>
                )}
              </div>

              {/* Bezel Bottom Status */}
              <div className="bg-[#070D1A] border-t border-slate-800 px-4 py-1.5 text-[10px] text-slate-400 flex justify-between">
                <span>CLEARANCE: CONDITIONAL QUARANTINE</span>
                <span className="text-emerald-400">MISSION DIRECTOR: GO FOR HTOL-2</span>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Spacecraft Bus & HTOL Circuit Diagram Tray */}
        <div className="bg-[#090F1E] rounded-xl border border-slate-800 p-3.5">
          <button
            type="button"
            onClick={() => setShowSchematics((v) => !v)}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan led" />
              <span className="text-xs font-display font-black text-cyan tracking-wider uppercase">
                ISRO SDSC SHAR COMPONENT ARCHITECTURE &amp; HTOL TELEMETRY DAQ SCHEMATICS
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono hover:text-white transition-colors">
              {showSchematics ? '[-] HIDE SCHEMATICS' : '[+] EXPAND MIL-STD-883 TEST HARNESS'}
            </span>
          </button>
          {showSchematics && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <ComponentDiagram type="all" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
