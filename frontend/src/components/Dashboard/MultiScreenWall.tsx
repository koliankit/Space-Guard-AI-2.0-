import { useState, useMemo } from 'react'
import type { ComponentOut, MissionStatus, SubsystemStatus } from '../../types'
import SatelliteScene from '../Satellite/SatelliteScene'
import TelemetryChart from '../Charts/TelemetryChart'
import MissionMap from '../MissionMap/MissionMap'
import ComponentDiagram from '../Diagrams/ComponentDiagram'
import ModuleAAnomalyPanel from './ModuleAAnomalyPanel'
import ModuleBFutureDriftPanel from './ModuleBFutureDriftPanel'
import { getSubsystemLocation } from '../../utils/satelliteLocations'

interface MultiScreenWallProps {
  mission: MissionStatus | null
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  onSelectSubsystem: (subKey: string) => void
  focusKey: string | null
  running: boolean
  onRunScreening?: () => void
  onUploadFile?: (file: File) => void
  onOpenLotsModal?: () => void
  onNavigateToLotsTab?: () => void
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
  running,
  onRunScreening,
  onUploadFile,
  onOpenLotsModal,
  onNavigateToLotsTab,
}: MultiScreenWallProps) {
  const rejected = useMemo(() => components.filter((c) => c.status === 'reject'), [components])
  const monitored = useMemo(() => components.filter((c) => c.status === 'monitor'), [components])
  const safe = useMemo(() => components.filter((c) => c.status === 'safe'), [components])

  // Console layout mode: 'dual' (Default: Module A on left, Module B on right with graphs below each)
  const [consoleLayout, setConsoleLayout] = useState<'dual' | 'moduleA' | 'moduleB' | 'quad'>('dual')
  const [activeQuadTab, setActiveQuadTab] = useState<'all' | '1' | '2' | '3' | '4'>('all')
  const [showSchematics, setShowSchematics] = useState(false)
  const [screen4Mode, setScreen4Mode] = useState<'quarantine' | 'lots'>('lots')
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null)
  const [wallSubsystemFilter, setWallSubsystemFilter] = useState<string>('ALL')

  // Auto-select first reject or first component if none selected
  const effectiveSelected = useMemo(() => {
    if (selected) return selected
    return rejected[0] || monitored[0] || components[0] || null
  }, [selected, rejected, monitored, components])

  const isScreened = useMemo(() => {
    return (
      components.some(
        (c) =>
          c.status === 'reject' ||
          c.status === 'monitor' ||
          (c.status === 'safe' && ((c.risk_score != null && c.risk_score > 0) || (c.z168 != null && c.z168 !== 0)))
      ) || mission !== null
    )
  }, [components, mission])

  // Compute unique lots and group their components with subsystem locations
  const lotGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        lot_id: string
        parts: ComponentOut[]
        rejects: number
        monitors: number
        safe: number
        mean: number
        std: number
        subsystems: string[]
        subsystemCounts: Record<string, number>
      }
    >()
    components.forEach((c) => {
      const lot = c.lot_id || 'UNKNOWN-LOT'
      let item = map.get(lot)
      if (!item) {
        item = {
          lot_id: lot,
          parts: [],
          rejects: 0,
          monitors: 0,
          safe: 0,
          mean: c.lot_mean ?? 0,
          std: c.lot_std ?? 0,
          subsystems: [],
          subsystemCounts: {},
        }
        map.set(lot, item)
      }
      item.parts.push(c)
      const sub = c.subsystem || 'FC'
      item.subsystemCounts[sub] = (item.subsystemCounts[sub] || 0) + 1
      if (!item.subsystems.includes(sub)) {
        item.subsystems.push(sub)
      }
      if (c.status === 'reject') item.rejects++
      else if (c.status === 'monitor') item.monitors++
      else if (c.status === 'safe') item.safe++
    })

    return Array.from(map.values())
      .map((lot) => {
        const mean =
          lot.mean ||
          (lot.parts.length > 0 ? lot.parts.reduce((a, b) => a + (b.v168 || 0), 0) / lot.parts.length : 0)
        return { ...lot, mean }
      })
      .sort((a, b) => a.lot_id.localeCompare(b.lot_id))
  }, [components])

  const activeWallLot = useMemo(() => {
    if (selectedLotId) {
      return lotGroups.find((l) => l.lot_id === selectedLotId) || lotGroups[0] || null
    }
    return lotGroups[0] || null
  }, [lotGroups, selectedLotId])

  const subsystems: SubsystemStatus[] = mission?.subsystems ?? DEFAULT_SUBSYSTEMS

  return (
    <div className="flex flex-col flex-1 bg-[#060B16] text-slate-100 font-sans select-none overflow-x-auto min-h-[calc(100vh-140px)] w-full">
      {/* Wall Header Banner: ISRO Sriharikota Mission Control Display Wall */}
      <div className="bg-[#091120] border-b border-slate-800/90 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/50 text-amber-300 text-xs md:text-sm font-display font-bold tracking-wider uppercase shadow-isro">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 led" />
            ISRO SDSC SHAR // Mission Operations Wall
          </div>
          <span className="text-slate-300 text-xs md:text-sm hidden lg:inline font-sans">
            Range Operations Directorate &bull; Launch Control Centre (LCC-01)
          </span>
        </div>

        {/* Live Synchronized MCC Status Banner & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs md:text-sm">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#070D1A] border border-slate-800 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400 text-[11px] font-display uppercase font-semibold">Flight Batch:</span>
            <span className="text-emerald-400 font-bold text-xs md:text-sm font-mono tabular-nums">{components.length} parts</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#070D1A] border border-slate-800 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-slate-400 text-[11px] font-display uppercase font-semibold">Lots:</span>
            <span className="text-amber-300 font-bold text-xs md:text-sm font-mono tabular-nums">{lotGroups.length} Qualification Lots</span>
          </div>

          {/* Primary View Mode Switcher with enlarged buttons */}
          <div className="flex items-center gap-1.5 bg-[#050914] p-1 rounded-xl border border-slate-800 shadow-sm">
            <span className="text-slate-400 text-[11px] font-display uppercase font-bold px-1.5">View:</span>
            <button
              type="button"
              onClick={() => setConsoleLayout('dual')}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-display tracking-wide transition-all border cursor-pointer ${
                consoleLayout === 'dual'
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/70 font-bold shadow-isro'
                  : 'bg-transparent text-slate-300 border-transparent hover:text-white hover:bg-slate-800/70'
              }`}
              title="Split View: Module A (Anomaly Analysis) on Left + Module B (Future Drift) on Right"
            >
              ⚡ Dual Split (A + B)
            </button>
            <button
              type="button"
              onClick={() => setConsoleLayout('moduleA')}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-display tracking-wide transition-all border cursor-pointer ${
                consoleLayout === 'moduleA'
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/70 font-bold shadow-isro'
                  : 'bg-transparent text-slate-300 border-transparent hover:text-white hover:bg-slate-800/70'
              }`}
              title="Focus on Module A: Silicon Anomaly Detection & HTOL Analysis"
            >
              Module A
            </button>
            <button
              type="button"
              onClick={() => setConsoleLayout('moduleB')}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-display tracking-wide transition-all border cursor-pointer ${
                consoleLayout === 'moduleB'
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/70 font-bold shadow-isro'
                  : 'bg-transparent text-slate-300 border-transparent hover:text-white hover:bg-slate-800/70'
              }`}
              title="Focus on Module B: Future Drift & In-Flight Reliability Forecasting"
            >
              Module B
            </button>
            <button
              type="button"
              onClick={() => setConsoleLayout('quad')}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-display tracking-wide transition-all border cursor-pointer ${
                consoleLayout === 'quad'
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/70 font-bold shadow-isro'
                  : 'bg-transparent text-slate-300 border-transparent hover:text-white hover:bg-slate-800/70'
              }`}
              title="Switch to 2x2 Command Wall (3D Digital Twin, Orbit Dynamics, HTOL Oscilloscope, Lot Architecture)"
            >
              2x2 Quad Wall
            </button>
          </div>
        </div>
      </div>

      {/* Lot Intelligence & Equipment Bay Quick Action Strip with enlarged boxes */}
      <div className="bg-[#070C18] border-b border-slate-800/90 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-xs text-slate-300 uppercase font-display font-bold tracking-wider whitespace-nowrap mr-1">
            FLIGHT LOTS:
          </span>
          {lotGroups.map((lot) => {
            const isLotSelected = activeWallLot?.lot_id === lot.lot_id
            return (
              <button
                key={lot.lot_id}
                type="button"
                onClick={() => {
                  setSelectedLotId(lot.lot_id)
                  // Select first part of lot
                  if (lot.parts.length > 0) {
                    onSelectComponent(lot.parts[0].component_id)
                    onSelectSubsystem(lot.parts[0].subsystem)
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-mono whitespace-nowrap transition-all border flex items-center gap-2 cursor-pointer shadow-sm ${
                  isLotSelected
                    ? 'bg-amber-500/25 border-amber-500/70 text-amber-300 font-bold shadow-isro'
                    : lot.rejects > 0
                    ? 'border-rose-500/50 text-rose-300 bg-rose-950/20 hover:bg-rose-500/20'
                    : 'border-slate-800 bg-[#070D1A] text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    lot.rejects > 0
                      ? 'bg-rose-500 led'
                      : lot.monitors > 0
                      ? 'bg-amber-400'
                      : isScreened
                      ? 'bg-emerald-400'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="font-semibold">{lot.lot_id}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/50 opacity-90 tabular-nums font-bold">
                  {lot.parts.length}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {onOpenLotsModal && (
            <button
              type="button"
              onClick={onOpenLotsModal}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs md:text-sm font-mono font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Open Lot-Wise Classification Modal"
            >
              <span>📦 Lots Modal</span>
            </button>
          )}

          <div className="text-xs md:text-sm font-mono text-slate-300 bg-[#0A1224] px-3 py-1.5 rounded-lg border border-slate-800">
            Selected Part: <b className="text-amber-300">{effectiveSelected?.component_id || 'None'}</b>
          </div>
        </div>
      </div>

      {/* Main Command Wall Content Area: Divided into Sector A and Sector B */}
      <div className="p-4 flex-1 flex flex-col gap-4">
        {/* ================= PRIMARY LAYOUT: TWO SECTORS (MODULE A & MODULE B WITH GRAPHS BELOW) ================= */}
        {consoleLayout === 'dual' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch flex-1">
            {/* ================= SECTOR 1: MODULE A ================= */}
            <div className="flex flex-col h-full flex-1">
              <ModuleAAnomalyPanel
                components={components}
                selected={effectiveSelected}
                onSelectComponent={onSelectComponent}
                onSelectSubsystem={onSelectSubsystem}
              />
            </div>

            {/* ================= SECTOR 2: MODULE B ================= */}
            <div className="flex flex-col h-full flex-1">
              <ModuleBFutureDriftPanel
                components={components}
                selected={effectiveSelected}
                onSelectComponent={onSelectComponent}
                onSelectSubsystem={onSelectSubsystem}
              />
            </div>
          </div>
        )}


        {/* ================= MODE 2: MODULE A ONLY ================= */}
        {consoleLayout === 'moduleA' && (
          <div className="w-full flex-1 flex flex-col">
            <ModuleAAnomalyPanel
              components={components}
              selected={effectiveSelected}
              onSelectComponent={onSelectComponent}
              onSelectSubsystem={onSelectSubsystem}
            />
          </div>
        )}

        {/* ================= MODE 3: MODULE B ONLY ================= */}
        {consoleLayout === 'moduleB' && (
          <div className="w-full flex-1 flex flex-col">
            <ModuleBFutureDriftPanel
              components={components}
              selected={effectiveSelected}
              onSelectComponent={onSelectComponent}
              onSelectSubsystem={onSelectSubsystem}
            />
          </div>
        )}

        {/* ================= MODE 4: 2x2 QUAD COMMAND WALL (3D DIGITAL TWIN + RADAR + LOTS) ================= */}
        {consoleLayout === 'quad' && (
          <div className="flex flex-col gap-4 flex-1">
            {/* Sub-bar for Quad mode selection */}
            <div className="flex items-center justify-between bg-[#0B1120] px-4 py-1.5 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400 font-mono text-[11px] uppercase">
                Console Viewport Selection:
              </span>
              <div className="flex items-center gap-1">
                {(['all', '1', '2', '3', '4'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setActiveQuadTab(mode)}
                    className={`px-2.5 py-0.5 rounded text-xs font-mono transition-all border ${
                      activeQuadTab === mode
                        ? 'bg-white text-slate-900 border-white font-bold shadow-sm'
                        : 'bg-transparent text-slate-400 border-transparent hover:text-white'
                    }`}
                  >
                    {mode === 'all' ? '2x2 Quad' : `Screen ${mode}`}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`grid gap-4 flex-1 ${
                activeQuadTab === 'all' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {/* SCREEN 01: FLIGHT DYNAMICS & RANGE SAFETY */}
              {(activeQuadTab === 'all' || activeQuadTab === '1') && (
                <div className="flex flex-col rounded-xl bg-[#090F1E] border border-slate-800 shadow-xl overflow-hidden min-h-[460px]">
                  <div className="bg-[#0F172A] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                        SCREEN 01
                      </span>
                      <span className="text-xs font-bold text-white tracking-wide">
                        Range Safety &amp; Orbit Dynamics
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-slate-300 font-medium text-[11px]">RSO Console</span>
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                      <div className="p-2.5 rounded-lg bg-[#070D1A] border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase font-medium">Altitude</div>
                        <div className="text-lg font-bold text-white font-mono mt-0.5">
                          520.4 <span className="text-xs font-normal text-slate-400">KM</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#070D1A] border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase font-medium">Velocity</div>
                        <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                          7.61 <span className="text-xs font-normal text-slate-400">KM/S</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#070D1A] border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase font-medium">Inclination</div>
                        <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">97.42&deg;</div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 overflow-hidden bg-[#070D1A] flex-1 min-h-[220px]">
                      <MissionMap critical={rejected.length > 0} />
                    </div>

                    <div className="p-3 rounded-lg bg-[#070D1A] border border-slate-800 text-xs">
                      <div className="flex justify-between items-center text-slate-300 font-semibold mb-2">
                        <span>ISTRAC Ground Stations</span>
                        <span className="text-emerald-400 font-mono text-[11px]">5 of 5 Locked</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                        <div className="flex justify-between bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                          <span>SHAR (Sriharikota):</span>
                          <span className="text-emerald-400 font-mono font-bold">AZ 142&deg; EL 68&deg;</span>
                        </div>
                        <div className="flex justify-between bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                          <span>Port Blair:</span>
                          <span className="text-emerald-400 font-mono font-bold">AZ 210&deg; EL 44&deg;</span>
                        </div>
                        <div className="flex justify-between bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                          <span>Brunei Station:</span>
                          <span className="text-emerald-400 font-mono font-bold">AZ 098&deg; EL 52&deg;</span>
                        </div>
                        <div className="flex justify-between bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                          <span>Biak (Indonesia):</span>
                          <span className="text-amber-400 font-mono font-bold">AZ 045&deg; EL 31&deg;</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#070D1A] border-t border-slate-800 px-4 py-2 text-xs text-slate-400 flex justify-between font-mono">
                    <span>Feed: Primary Radar TEL-1</span>
                    <span className="text-amber-400">Doppler Lock: +14.2 kHz</span>
                  </div>
                </div>
              )}

              {/* SCREEN 02: 3D SPACECRAFT DIGITAL TWIN */}
              {(activeQuadTab === 'all' || activeQuadTab === '2') && (
                <div className="flex flex-col rounded-xl bg-[#090F1E] border border-slate-800 shadow-xl overflow-hidden min-h-[460px]">
                  <div className="bg-[#0F172A] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                        SCREEN 02
                      </span>
                      <span className="text-xs font-bold text-white tracking-wide font-display">
                        Spacecraft 3D Digital Twin &amp; AOCS
                      </span>
                      {effectiveSelected && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            effectiveSelected.status === 'reject'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : effectiveSelected.status === 'monitor'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          Target: {effectiveSelected.component_id} [{effectiveSelected.subsystem}]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="text-slate-300 font-medium text-[11px]">Vehicle Console</span>
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col gap-3">
                    <div className="relative flex-1 min-h-[290px] rounded-lg border border-slate-800 bg-[radial-gradient(ellipse_at_50%_40%,#111C33_0%,#060B14_85%)] overflow-hidden">
                      <SatelliteScene
                        subsystems={subsystems}
                        onSelect={onSelectSubsystem}
                        focusKey={focusKey}
                        selectedComponent={effectiveSelected}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-xs">
                      {subsystems.slice(0, 8).map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => onSelectSubsystem(s.key)}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            focusKey === s.key || effectiveSelected?.subsystem === s.key
                              ? 'bg-amber-500/15 border-amber-500/70 text-white shadow-sm'
                              : s.status === 'reject'
                              ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                              : 'bg-[#070D1A] border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="font-semibold flex justify-between">
                            <span className="font-mono text-[11px]">[{s.key}]</span>
                            <span
                              className={`font-mono ${
                                s.status === 'reject' ? 'text-rose-400 font-bold' : 'text-emerald-400'
                              }`}
                            >
                              {Math.max(0, 100 - Math.round(s.avg_risk))}%
                            </span>
                          </div>
                          <div className="truncate text-[10px] text-slate-400 mt-0.5">{s.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#070D1A] border-t border-slate-800 px-4 py-1.5 text-[10px] text-slate-400 flex justify-between">
                    <span>ATTITUDE: P: +0.02&deg; | R: -0.01&deg; | Y: +0.04&deg;</span>
                    <span className="text-emerald-400">BUS VOLTAGE: 28.12V NOMINAL</span>
                  </div>
                </div>
              )}

              {/* SCREEN 03: HTOL SILICON OSCILLOSCOPE */}
              {(activeQuadTab === 'all' || activeQuadTab === '3') && (
                <div className="flex flex-col rounded-xl bg-[#090F1E] border border-slate-800 shadow-xl overflow-hidden min-h-[460px]">
                  <div className="bg-[#0D162B] border-b border-slate-800 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                        SCREEN 03
                      </span>
                      <span className="text-xs font-bold text-white tracking-wide font-display">
                        HTOL 168H Silicon Telemetry &amp; Parametric Drift
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span className="text-slate-300 font-medium text-[11px]">AI Screening</span>
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col gap-3">
                    <div className="rounded-lg border border-slate-800 bg-[#070D1A] overflow-hidden flex-1 min-h-[220px]">
                      <TelemetryChart component={effectiveSelected} />
                    </div>

                    {effectiveSelected ? (
                      <div className="p-3 rounded-lg bg-[#070D1A] border border-slate-800 text-xs space-y-2">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-white font-mono text-xs">{effectiveSelected.component_id}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                              effectiveSelected.status === 'reject'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : effectiveSelected.status === 'monitor'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {effectiveSelected.status.toUpperCase()} (Risk: {effectiveSelected.risk_score}/100)
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800/80 font-mono">
                          <div>0h: <b className="text-slate-100">{effectiveSelected.v0.toFixed(1)}&mu;A</b></div>
                          <div>24h: <b className="text-slate-100">{effectiveSelected.v24.toFixed(1)}&mu;A</b></div>
                          <div>96h: <b className="text-slate-100">{effectiveSelected.v96 != null ? effectiveSelected.v96.toFixed(1) : '-'}&mu;A</b></div>
                          <div>168h: <b className="text-rose-400 font-bold">{effectiveSelected.v168.toFixed(1)}&mu;A</b></div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400 bg-[#070D1A] rounded-lg border border-slate-800">
                        Select a component to inspect oscilloscope telemetry.
                      </div>
                    )}
                  </div>

                  <div className="bg-[#070D1A] border-t border-slate-800 px-4 py-2 text-xs text-slate-400 flex justify-between font-mono">
                    <span>Sampling: 24-Bit Sigma-Delta ADC</span>
                    <span className="text-amber-400">Oven Temp: 125.0&deg;C Constant</span>
                  </div>
                </div>
              )}

              {/* SCREEN 04: FLIGHT QUALIFICATION LOTS & SATELLITE LOCATION */}
              {(activeQuadTab === 'all' || activeQuadTab === '4') && (
                <div className="flex flex-col rounded-xl bg-[#090F1E] border border-slate-800 shadow-xl overflow-hidden min-h-[460px]">
                  <div className="bg-[#0F172A] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                        SCREEN 04
                      </span>
                      <span className="text-xs font-bold text-white tracking-wide font-display">
                        {screen4Mode === 'lots' ? 'Flight Qualification Lots & Satellite Locations' : 'Quarantined Anomaly Ledger'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-[#070D1A] p-0.5 rounded border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setScreen4Mode('lots')}
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
                            screen4Mode === 'lots' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          📦 Lots ({lotGroups.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setScreen4Mode('quarantine')}
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
                            screen4Mode === 'quarantine' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          ⚠️ Quarantine ({rejected.length})
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col gap-3 overflow-hidden">
                    {screen4Mode === 'lots' ? (
                      <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
                        {activeWallLot && (
                          <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 flex flex-col gap-2 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-200">
                              <span className="font-bold text-amber-300">{activeWallLot.lot_id}</span>
                              <span className="text-emerald-400 font-bold">{activeWallLot.parts.length} components</span>
                            </div>
                            <div className="pt-1.5 border-t border-amber-500/20 flex flex-wrap items-center gap-1.5">
                              {Object.entries(activeWallLot.subsystemCounts).map(([subKey, count]) => {
                                const loc = getSubsystemLocation(subKey)
                                return (
                                  <button
                                    key={subKey}
                                    type="button"
                                    onClick={() => {
                                      setWallSubsystemFilter(wallSubsystemFilter === subKey ? 'ALL' : subKey)
                                      onSelectSubsystem(subKey)
                                    }}
                                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#070D1A] border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1"
                                  >
                                    <span className="font-bold text-amber-400">[{subKey}]</span>
                                    <span>{count} in {loc.name}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-[#070D1A] max-h-[220px]">
                          <table className="w-full text-left text-xs font-sans border-collapse">
                            <thead className="bg-[#0F172A] text-[10px] uppercase font-semibold text-slate-400 sticky top-0 border-b border-slate-800">
                              <tr>
                                <th className="py-2 px-2.5">Part ID</th>
                                <th className="py-2 px-2">Subsystem</th>
                                <th className="py-2 px-2">Satellite Bay</th>
                                <th className="py-2 px-2">168h</th>
                                <th className="py-1.5 px-2">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {activeWallLot?.parts
                                .filter((c) => wallSubsystemFilter === 'ALL' || c.subsystem === wallSubsystemFilter)
                                .map((c) => {
                                  const loc = getSubsystemLocation(c.subsystem)
                                  const isSel = effectiveSelected?.component_id === c.component_id
                                  return (
                                    <tr
                                      key={c.component_id}
                                      onClick={() => {
                                        onSelectComponent(c.component_id)
                                        onSelectSubsystem(c.subsystem)
                                      }}
                                      className={`cursor-pointer transition-colors ${
                                        isSel ? 'bg-amber-500/20 text-white font-bold' : 'hover:bg-slate-800/40 text-slate-300'
                                      }`}
                                    >
                                      <td className="py-1.5 px-2.5 font-mono font-bold text-white">{c.component_id}</td>
                                      <td className="py-1.5 px-2 text-amber-400 font-bold font-mono">[{c.subsystem}]</td>
                                      <td className="py-1.5 px-2 text-slate-300">{loc.bay}</td>
                                      <td className="py-1.5 px-2 font-mono text-slate-200">{c.v168.toFixed(1)}&mu;A</td>
                                      <td className="py-1.5 px-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                                          c.status === 'reject'
                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                            : c.status === 'monitor'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        }`}>
                                          {c.status.toUpperCase()}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      /* Quarantine Mode Table */
                      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-[#070D1A] max-h-[220px]">
                        <table className="w-full text-left text-xs font-sans border-collapse">
                          <thead className="bg-[#0F172A] text-[10px] uppercase font-semibold text-slate-400 sticky top-0 border-b border-slate-800">
                            <tr>
                              <th className="py-2 px-3">Part ID</th>
                              <th className="py-2 px-2">Subsystem &amp; Bay Location</th>
                              <th className="py-2 px-2">168h</th>
                              <th className="py-2 px-2">z-Score</th>
                              <th className="py-1.5 px-2">Spec vs AI</th>
                              <th className="py-1.5 px-2">Risk</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {rejected.map((c) => {
                              const loc = getSubsystemLocation(c.subsystem)
                              const isSel = effectiveSelected?.component_id === c.component_id
                              return (
                                <tr
                                  key={c.component_id}
                                  onClick={() => {
                                    onSelectComponent(c.component_id)
                                    onSelectSubsystem(c.subsystem)
                                  }}
                                  className={`cursor-pointer transition-colors ${
                                    isSel ? 'bg-rose-500/20 text-white font-bold' : 'hover:bg-slate-800/40 text-slate-300'
                                  }`}
                                >
                                  <td className="py-1.5 px-2.5 font-bold font-mono text-white">{c.component_id}</td>
                                  <td className="py-1.5 px-2 text-amber-400 font-mono font-bold">[{c.subsystem}] {loc.name}</td>
                                  <td className="py-1.5 px-2 text-rose-400 font-bold font-mono">{c.v168.toFixed(1)}&mu;A</td>
                                  <td className="py-1.5 px-2 text-rose-400 font-mono">+{c.z168.toFixed(2)}&sigma;</td>
                                  <td className="py-1.5 px-2">
                                    <span className="px-1.5 py-0.5 rounded text-[8.5px] bg-purple-500/20 text-purple-300 border border-purple-400/40 font-bold">
                                      PASS Spec &bull; REJECT AI
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2 text-rose-400 font-bold font-mono">{c.risk_score}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#070D1A] border-t border-slate-800 px-4 py-1.5 text-[10px] text-slate-400 flex justify-between">
                    <span>STATUS: {isScreened ? 'AI SCREENING COMPLETED' : 'AWAITING AI SCREENING PIPELINE'}</span>
                    <span className="text-emerald-400 font-mono">{lotGroups.length} FLIGHT LOTS ACTIVE</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsible Spacecraft Bus & HTOL Circuit Diagram Tray */}
        <div className="bg-[#0B1120] rounded-xl border border-slate-800 p-4">
          <button
            type="button"
            onClick={() => setShowSchematics((v) => !v)}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-bold text-slate-200 tracking-wide uppercase font-display">
                ISRO SDSC SHAR Component Architecture &amp; HTOL Telemetry DAQ Schematics
              </span>
            </div>
            <span className="text-xs text-slate-400 hover:text-white transition-colors font-medium">
              {showSchematics ? '[-] Hide Schematics' : '[+] Expand Test Harness Schematics'}
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

