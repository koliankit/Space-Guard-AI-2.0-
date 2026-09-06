import React, { useState } from 'react'
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
  { key: 'PWR', name: 'Power System (PCDU)', position: [-2.5, 0, 0], count: 48, status: 'safe', avg_risk: 12, top_component: 'PWR-REG-104' },
  { key: 'FC', name: 'Flight Computer (OBC)', position: [0, 0.5, 0], count: 52, status: 'reject', avg_risk: 84, top_component: 'FC-ASIC-088' },
  { key: 'COMM', name: 'S/X Band RF Transponder', position: [0, -1.2, 0], count: 36, status: 'safe', avg_risk: 18, top_component: 'COMM-PA-302' },
  { key: 'AOCS', name: 'Attitude & Orbit Control', position: [0, 0, -1.5], count: 40, status: 'safe', avg_risk: 22, top_component: 'AOCS-GYRO-012' },
  { key: 'TCS', name: 'Thermal Control System', position: [1.8, 0, 0], count: 24, status: 'safe', avg_risk: 14, top_component: 'TCS-SENS-401' },
  { key: 'PL', name: 'Payload Instruments', position: [0, 1.5, 0], count: 32, status: 'safe', avg_risk: 16, top_component: 'PL-IMG-502' },
]

export default function MultiScreenWall({
  mission,
  components,
  selected,
  onSelectComponent,
  onSelectSubsystem,
  focusKey,
  running,
}: MultiScreenWallProps) {
  const rejected = components.filter((c) => c.status === 'reject')
  const monitored = components.filter((c) => c.status === 'monitor')
  const safe = components.filter((c) => c.status === 'safe')
  const [activeScreenTab, setActiveScreenTab] = useState<'all' | '1' | '2' | '3' | '4'>('all')

  const subsystems: SubsystemStatus[] = mission?.subsystems ?? DEFAULT_SUBSYSTEMS

  return (
    <div className="flex flex-col flex-1 bg-[#010A04] text-slate-100 font-mono select-none overflow-x-auto min-h-[calc(100vh-140px)]">
      {/* Wall Header Banner: ISRO Sriharikota Mission Control Display Wall */}
      <div className="bg-[#041A0B] border-b-2 border-line px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-cyan/15 border border-cyan/40 text-cyan text-[11px] font-display font-black tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan led" />
            SDSC SHAR // MCC PANORAMIC VIDEO WALL
          </div>
          <span className="text-slate-400 text-xs hidden md:inline">
            Sriharikota Range Operations Directorate &bull; Launch Control Centre (LCC)
          </span>
        </div>

        {/* Live Synchronized MCC Status Banner */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-[#062612] border border-line">
            <span className="w-1.5 h-1.5 rounded-full bg-safe led" />
            <span className="text-muted text-[10px]">RANGE SAFETY:</span>
            <span className="text-safe font-bold text-[11px]">ARMED &bull; GREEN</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-[#062612] border border-line">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan led" />
            <span className="text-muted text-[10px]">DOWNLINK:</span>
            <span className="text-cyan font-bold text-[11px]">ISTRAC S/X LOCKED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">BAY SELECT:</span>
            {(['all', '1', '2', '3', '4'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveScreenTab(mode)}
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all border ${
                  activeScreenTab === mode
                    ? 'bg-cyan text-bg border-cyan shadow-neon-cyan'
                    : 'bg-[#062612] text-slate-300 border-line hover:border-cyan/50'
                }`}
              >
                {mode === 'all' ? 'QUAD WALL' : `SCR ${mode}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Panoramic Multi-Screen Command Wall Grid */}
      <div className="p-3 flex-1 flex flex-col gap-3">
        <div
          className={`grid gap-3 flex-1 ${
            activeScreenTab === 'all'
              ? 'grid-cols-1 xl:grid-cols-4 lg:grid-cols-2'
              : 'grid-cols-1'
          }`}
        >
          {/* ================= SCREEN 01: FLIGHT DYNAMICS & RANGE SAFETY ================= */}
          {(activeScreenTab === 'all' || activeScreenTab === '1') && (
            <div className="flex flex-col rounded-lg bg-[#021408] border-2 border-[#0F4D22] shadow-panel overflow-hidden">
              {/* Bezel Top Bar */}
              <div className="bg-[#062612] border-b border-[#0F4D22] px-3 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-cyan/20 text-cyan text-[9.5px] font-bold border border-cyan/40">
                    SCREEN 01
                  </span>
                  <span className="text-[11px] font-display font-black text-white tracking-wider">
                    RANGE SAFETY &amp; ORBIT DYNAMICS
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-safe led" />
                  <span className="text-cyan font-bold">RSO CONSOLE</span>
                </div>
              </div>

              {/* Screen Content */}
              <div className="p-2.5 flex-1 flex flex-col gap-2.5">
                {/* Orbit Telemetry Strip */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="p-1.5 rounded bg-[#031709] border border-line">
                    <div className="text-[9px] text-muted uppercase">Altitude</div>
                    <div className="text-sm font-bold text-cyan font-mono">520.4 KM</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#031709] border border-line">
                    <div className="text-[9px] text-muted uppercase">Velocity</div>
                    <div className="text-sm font-bold text-safe font-mono">7.61 KM/S</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#031709] border border-line">
                    <div className="text-[9px] text-muted uppercase">Inclination</div>
                    <div className="text-sm font-bold text-slate-100 font-mono">97.42&deg;</div>
                  </div>
                </div>

                {/* Radar Map */}
                <div className="rounded border border-line overflow-hidden bg-[#021408] h-[220px]">
                  <MissionMap critical={rejected.length > 0} />
                </div>

                {/* Ground Tracking Network */}
                <div className="p-2 rounded bg-[#041F0C] border border-line text-[10px]">
                  <div className="flex justify-between items-center text-cyan font-bold uppercase mb-1">
                    <span>ISTRAC Ground Stations</span>
                    <span className="text-safe">5 OF 5 TRACKING</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-300">
                    <div className="flex justify-between">
                      <span>SHAR (SRIHARIKOTA):</span>
                      <span className="text-safe font-bold">AZ: 142&deg; EL: 68&deg;</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PORT BLAIR:</span>
                      <span className="text-safe font-bold">AZ: 210&deg; EL: 44&deg;</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BRUNEI STATION:</span>
                      <span className="text-safe font-bold">AZ: 098&deg; EL: 52&deg;</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BIAK (INDONESIA):</span>
                      <span className="text-cyan font-bold">AZ: 045&deg; EL: 31&deg;</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bezel Bottom Status */}
              <div className="bg-[#041A0B] border-t border-line px-3 py-1 text-[9px] text-slate-400 flex justify-between">
                <span>FEED: PRIMARY RADAR TEL-1</span>
                <span className="text-cyan">DOPPLER LOCK: +14.2 kHz</span>
              </div>
            </div>
          )}

          {/* ================= SCREEN 02: 3D SPACECRAFT DIGITAL TWIN ================= */}
          {(activeScreenTab === 'all' || activeScreenTab === '2') && (
            <div className="flex flex-col rounded-lg bg-[#021408] border-2 border-[#0F4D22] shadow-panel overflow-hidden">
              {/* Bezel Top Bar */}
              <div className="bg-[#062612] border-b border-[#0F4D22] px-3 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-cyan/20 text-cyan text-[9.5px] font-bold border border-cyan/40">
                    SCREEN 02
                  </span>
                  <span className="text-[11px] font-display font-black text-white tracking-wider">
                    SPACECRAFT 3D DIGITAL TWIN &amp; AOCS
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan led" />
                  <span className="text-cyan font-bold">VEHICLE CONSOLE</span>
                </div>
              </div>

              {/* Screen Content */}
              <div className="p-2.5 flex-1 flex flex-col gap-2.5">
                {/* 3D Viewport */}
                <div className="relative h-[250px] rounded border border-line bg-[radial-gradient(ellipse_at_50%_40%,#0C203E_0%,#060B14_85%)] overflow-hidden">
                  <SatelliteScene
                    subsystems={subsystems}
                    onSelect={onSelectSubsystem}
                    focusKey={focusKey}
                  />
                  {/* Overlay HUD indicators */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                    <div className="px-2 py-0.5 rounded bg-[#021408]/80 border border-cyan/40 text-[9px] text-cyan font-bold">
                      AOCS: 3-AXIS STABILIZED
                    </div>
                    <div className="px-2 py-0.5 rounded bg-[#021408]/80 border border-safe/40 text-[9px] text-safe font-bold">
                      SOLAR WING: SUN-TRACKING 99.4%
                    </div>
                  </div>
                </div>

                {/* Subsystem Quick Selector Cards */}
                <div className="grid grid-cols-3 gap-1 text-[9px]">
                  {subsystems.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => onSelectSubsystem(s.key)}
                      className={`p-1.5 rounded border text-left transition-all ${
                        focusKey === s.key
                          ? 'bg-cyan/20 border-cyan text-white shadow-neon-cyan'
                          : s.status === 'reject'
                          ? 'bg-reject/10 border-reject text-reject'
                          : 'bg-[#041F0C] border-line text-slate-300 hover:border-cyan/40'
                      }`}
                    >
                      <div className="font-bold flex justify-between">
                        <span>[{s.key}]</span>
                        <span className={s.status === 'reject' ? 'text-reject' : 'text-safe'}>
                          {Math.max(0, 100 - Math.round(s.avg_risk))}%
                        </span>
                      </div>
                      <div className="truncate text-[8px] text-muted">{s.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bezel Bottom Status */}
              <div className="bg-[#041A0B] border-t border-line px-3 py-1 text-[9px] text-slate-400 flex justify-between">
                <span>ATTITUDE: P: +0.02&deg; | R: -0.01&deg; | Y: +0.04&deg;</span>
                <span className="text-safe">BUS VOLTAGE: 28.12V</span>
              </div>
            </div>
          )}

          {/* ================= SCREEN 03: HTOL SILICON OSCILLOSCOPE ================= */}
          {(activeScreenTab === 'all' || activeScreenTab === '3') && (
            <div className="flex flex-col rounded-lg bg-[#021408] border-2 border-[#0F4D22] shadow-panel overflow-hidden">
              {/* Bezel Top Bar */}
              <div className="bg-[#062612] border-b border-[#0F4D22] px-3 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-cyan/20 text-cyan text-[9.5px] font-bold border border-cyan/40">
                    SCREEN 03
                  </span>
                  <span className="text-[11px] font-display font-black text-white tracking-wider">
                    HTOL 168H SILICON TELEMETRY &amp; DRIFT
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-reject led" />
                  <span className="text-reject font-bold">AI SCREENING</span>
                </div>
              </div>

              {/* Screen Content */}
              <div className="p-2.5 flex-1 flex flex-col gap-2.5">
                {/* Oscilloscope Panel */}
                <div className="rounded border border-line bg-[#021408] overflow-hidden">
                  <TelemetryChart component={selected} />
                </div>

                {/* Selected Component Quick Stats */}
                {selected ? (
                  <div className="p-2 rounded bg-[#041F0C] border border-line text-[10px] space-y-1">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-white">{selected.component_id}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          selected.status === 'reject'
                            ? 'bg-reject/20 text-reject border border-reject'
                            : selected.status === 'monitor'
                            ? 'bg-monitor/20 text-monitor border border-monitor'
                            : 'bg-safe/20 text-safe border border-safe'
                        }`}
                      >
                        {selected.status.toUpperCase()} (RISK: {selected.risk_score}/100)
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-[9px] text-slate-300">
                      <div>0h: <b className="text-slate-100">{selected.v0.toFixed(1)}&mu;A</b></div>
                      <div>24h: <b className="text-slate-100">{selected.v24.toFixed(1)}&mu;A</b></div>
                      <div>96h: <b className="text-slate-100">{selected.v96 != null ? selected.v96.toFixed(1) : '-'}&mu;A</b></div>
                      <div>168h: <b className="text-reject">{selected.v168.toFixed(1)}&mu;A</b></div>
                    </div>
                    <div className="text-[9px] text-muted pt-1 border-t border-line/60 flex justify-between">
                      <span>Lot z-Score: <b className="text-cyan">{selected.z168 > 0 ? '+' : ''}{selected.z168.toFixed(2)}&sigma;</b></span>
                      <span>Extrapolated (+96h): <b className="text-reject">{selected.predicted_future.toFixed(1)}&mu;A</b></span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-muted bg-[#041F0C] rounded border border-line">
                    Select a component from the matrix or 3D view to inspect oscilloscope telemetry.
                  </div>
                )}
              </div>

              {/* Bezel Bottom Status */}
              <div className="bg-[#041A0B] border-t border-line px-3 py-1 text-[9px] text-slate-400 flex justify-between">
                <span>SAMPLING: 24-BIT SIGMA-DELTA ADC</span>
                <span className="text-cyan">OVEN TEMP: 125.0&deg;C CONSTANT</span>
              </div>
            </div>
          )}

          {/* ================= SCREEN 04: SCREENING LEDGER & DEFECT QUARANTINE ================= */}
          {(activeScreenTab === 'all' || activeScreenTab === '4') && (
            <div className="flex flex-col rounded-lg bg-[#021408] border-2 border-[#0F4D22] shadow-panel overflow-hidden">
              {/* Bezel Top Bar */}
              <div className="bg-[#062612] border-b border-[#0F4D22] px-3 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-cyan/20 text-cyan text-[9.5px] font-bold border border-cyan/40">
                    SCREEN 04
                  </span>
                  <span className="text-[11px] font-display font-black text-white tracking-wider">
                    ANOMALY LEDGER &amp; QUARANTINE
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-safe led" />
                  <span className="text-safe font-bold">MD CONSOLE</span>
                </div>
              </div>

              {/* Screen Content */}
              <div className="p-2.5 flex-1 flex flex-col gap-2.5 overflow-hidden">
                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-3 gap-1 text-center text-xs">
                  <div className="p-1 rounded bg-[#031709] border border-line">
                    <div className="text-[9px] text-muted">SAFE</div>
                    <div className="text-sm font-bold text-safe">{safe.length}</div>
                  </div>
                  <div className="p-1 rounded bg-[#031709] border border-line">
                    <div className="text-[9px] text-muted">MONITOR</div>
                    <div className="text-sm font-bold text-monitor">{monitored.length}</div>
                  </div>
                  <div className="p-1 rounded bg-[#031709] border border-line">
                    <div className="text-[9px] text-muted">QUARANTINE</div>
                    <div className="text-sm font-bold text-reject">{rejected.length}</div>
                  </div>
                </div>

                {/* Quarantined Anomaly Ledger Table */}
                <div className="flex-1 overflow-y-auto rounded border border-line bg-[#021408] max-h-[260px]">
                  <table className="w-full text-left text-[10px] font-mono border-collapse">
                    <thead className="bg-[#062612] text-[8.5px] uppercase text-slate-400 sticky top-0 border-b border-line">
                      <tr>
                        <th className="py-1 px-2">Part ID</th>
                        <th className="py-1 px-2">Sub</th>
                        <th className="py-1 px-2">168h</th>
                        <th className="py-1 px-2">z-Score</th>
                        <th className="py-1 px-2">Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/40">
                      {rejected.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-slate-400 text-xs">
                            No quarantined defects. All nominal.
                          </td>
                        </tr>
                      )}
                      {rejected.map((c) => (
                        <tr
                          key={c.component_id}
                          onClick={() => onSelectComponent(c.component_id)}
                          className={`cursor-pointer transition-colors ${
                            selected?.component_id === c.component_id
                              ? 'bg-reject/25 text-white'
                              : 'hover:bg-reject/10'
                          }`}
                        >
                          <td className="py-1 px-2 font-bold text-slate-100">{c.component_id}</td>
                          <td className="py-1 px-2 text-cyan font-bold">[{c.subsystem}]</td>
                          <td className="py-1 px-2 text-reject font-bold">{c.v168.toFixed(1)}&mu;A</td>
                          <td className="py-1 px-2 text-reject font-bold">{c.z168 > 0 ? '+' : ''}{c.z168.toFixed(2)}&sigma;</td>
                          <td className="py-1 px-2 text-reject font-bold">{c.risk_score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Critical Quarantine Alert Box */}
                {rejected.length > 0 && (
                  <div className="p-2 rounded bg-reject/10 border border-reject text-[9.5px] space-y-1">
                    <div className="text-reject font-bold uppercase flex items-center gap-1">
                      <span>&#9888;</span> QUARANTINE PROTOCOL ENGAGED ({rejected.length} SILICON DEFECTS)
                    </div>
                    <div className="text-slate-200">
                      Root cause: Non-linear oxide trap breakdown identified in lot{' '}
                      <b className="text-white">{rejected[0].lot_id}</b>. RCA required prior to stage integration.
                    </div>
                  </div>
                )}
              </div>

              {/* Bezel Bottom Status */}
              <div className="bg-[#041A0B] border-t border-line px-3 py-1 text-[9px] text-slate-400 flex justify-between">
                <span>CLEARANCE: CONDITIONAL QUARANTINE</span>
                <span className="text-safe">MISSION DIRECTOR: GO FOR HTOL-2</span>
              </div>
            </div>
          )}
        </div>

        {/* Embedded Spacecraft Bus & HTOL Circuit Diagram Bar at bottom of Multi-Screen Wall */}
        <div className="bg-[#041A0B] rounded-lg border border-line p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan led" />
              <span className="text-xs font-display font-black text-cyan tracking-wider uppercase">
                ISRO SDSC SHAR COMPONENT ARCHITECTURE &amp; HTOL TELEMETRY DAQ SCHEMATICS
              </span>
            </div>
            <span className="text-[10px] text-muted">
              MIL-STD-883 METHOD 1005 TEST HARNESS
            </span>
          </div>
          <ComponentDiagram type="all" />
        </div>
      </div>
    </div>
  )
}
