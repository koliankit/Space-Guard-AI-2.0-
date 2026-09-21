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
  onNavigateToTab?: (tab: string) => void
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
  onNavigateToTab,
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
    <div className="flex flex-col flex-1 min-h-0 bg-[#07111C] text-[#F1F5F9] font-sans select-none w-full">
      {/* Wall Header Banner: ISRO Sriharikota Mission Control Display Wall */}
      <div className="bg-[#0B1928] border-b border-[#1D3A52] px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#142B40] border border-[#0E88D3]/50 text-[#0E88D3] text-xs md:text-sm font-display font-bold tracking-wider uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0E88D3] animate-gentle-pulse" />
            ISRO SDSC SHAR // Mission Operations Wall
          </div>
          <span className="text-[#9AAFC0] text-xs md:text-sm hidden lg:inline font-sans">
            Range Operations Directorate &bull; Launch Control Centre (LCC-01)
          </span>
        </div>

        {/* Live Synchronized MCC Status Banner & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs md:text-sm">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#102337] border border-[#1D3A52] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#22A06B] animate-gentle-pulse" />
            <span className="text-[#9AAFC0] text-[11px] font-display uppercase font-semibold">Flight Batch:</span>
            <span className="text-[#22A06B] font-bold text-xs md:text-sm font-mono tabular-nums">{components.length} parts</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#102337] border border-[#1D3A52] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#0E88D3] animate-gentle-pulse" />
            <span className="text-[#9AAFC0] text-[11px] font-display uppercase font-semibold">Lots:</span>
            <span className="text-[#0E88D3] font-bold text-xs md:text-sm font-mono tabular-nums">{lotGroups.length} Qualification Lots</span>
          </div>

          {/* Primary View Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-[#07111C] p-1 rounded-xl border border-[#1D3A52] shadow-sm">
            <span className="text-[#9AAFC0] text-[11px] font-display uppercase font-bold px-1.5">View:</span>
            <button
              type="button"
              onClick={() => setConsoleLayout('dual')}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-display tracking-wide transition-all border cursor-pointer ${
                consoleLayout === 'dual'
                  ? 'bg-[#0E88D3]/20 text-[#0E88D3] border-[#0E88D3]/60 font-bold'
                  : 'bg-transparent text-[#9AAFC0] border-transparent hover:text-[#F1F5F9] hover:bg-[#142B40]'
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
                  ? 'bg-[#0E88D3]/20 text-[#0E88D3] border-[#0E88D3]/60 font-bold'
                  : 'bg-transparent text-[#9AAFC0] border-transparent hover:text-[#F1F5F9] hover:bg-[#142B40]'
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
                  ? 'bg-[#0E88D3]/20 text-[#0E88D3] border-[#0E88D3]/60 font-bold'
                  : 'bg-transparent text-[#9AAFC0] border-transparent hover:text-[#F1F5F9] hover:bg-[#142B40]'
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
                  ? 'bg-[#0E88D3]/20 text-[#0E88D3] border-[#0E88D3]/60 font-bold'
                  : 'bg-transparent text-[#9AAFC0] border-transparent hover:text-[#F1F5F9] hover:bg-[#142B40]'
              }`}
              title="Switch to 2x2 Command Wall (3D Digital Twin, Orbit Dynamics, HTOL Oscilloscope, Lot Architecture)"
            >
              2x2 Quad Wall
            </button>
          </div>
        </div>
      </div>

      {/* 4 Important Overview Elements arranged together in one clean horizontal row */}
      <div className="bg-[#0B1928]/70 border-b border-[#1D3A52] px-4 md:px-6 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Overview 1: Command Wall (Module A & B) */}
          <div
            onClick={() => setConsoleLayout('dual')}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 shadow-sm ${
              consoleLayout === 'dual'
                ? 'bg-[#142B40] border-[#0E88D3]/70 ring-1 ring-[#0E88D3]/30'
                : 'bg-[#102337] border-[#1D3A52] hover:border-[#0E88D3]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#0E88D3] font-bold flex items-center gap-1.5">
                <span>⚡</span> [00] COMMAND WALL
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#07111C] text-[#9AAFC0]">DUAL A+B</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-[#F1F5F9]">{components.length}</span>
              <span className="text-[11px] font-mono text-[#9AAFC0]">
                <span className="text-[#22A06B] font-bold">{safe.length}S</span> &bull;{' '}
                <span className="text-[#F2B84B] font-bold">{monitored.length}M</span> &bull;{' '}
                <span className="text-[#E5484D] font-bold">{rejected.length}R</span>
              </span>
            </div>
            <div className="text-[10px] text-[#9AAFC0] truncate font-sans">
              Lot-relative anomalies &amp; 264h drift forecasts
            </div>
          </div>

          {/* Overview 2: Lot Architecture & Locations */}
          <div
            onClick={() => onNavigateToLotsTab ? onNavigateToLotsTab() : onOpenLotsModal?.()}
            className="p-3 rounded-xl bg-[#102337] border border-[#1D3A52] hover:border-[#0E88D3] transition-all cursor-pointer flex flex-col justify-between gap-1.5 shadow-sm group"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#0E88D3] font-bold flex items-center gap-1.5">
                <span>📦</span> [01] LOT ARCHITECTURE
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#07111C] text-[#9AAFC0] group-hover:text-[#0E88D3]">OPEN &rarr;</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-[#F1F5F9]">{lotGroups.length} <span className="text-xs text-[#9AAFC0] font-normal">Lots</span></span>
              <span className="text-[11px] font-mono text-[#9AAFC0]">
                {subsystems.length} Subsystems
              </span>
            </div>
            <div className="text-[10px] text-[#9AAFC0] truncate font-sans">
              HTOL lot statistics &amp; placement hierarchy
            </div>
          </div>

          {/* Overview 3: 3D Satellite & Telemetry */}
          <div
            onClick={() => onNavigateToTab ? onNavigateToTab('satellite') : setConsoleLayout('quad')}
            className="p-3 rounded-xl bg-[#102337] border border-[#1D3A52] hover:border-[#0E88D3] transition-all cursor-pointer flex flex-col justify-between gap-1.5 shadow-sm group"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#0E88D3] font-bold flex items-center gap-1.5">
                <span>🛰️</span> [02] 3D SATELLITE
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#07111C] text-[#9AAFC0] group-hover:text-[#0E88D3]">3D &rarr;</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-[#F1F5F9]">{subsystems.length} <span className="text-xs text-[#9AAFC0] font-normal">Bays</span></span>
              <span className="text-[11px] font-mono text-[#22A06B] font-bold">
                ● HARDWARE TWIN
              </span>
            </div>
            <div className="text-[10px] text-[#9AAFC0] truncate font-sans">
              Interactive 3D component localization
            </div>
          </div>

          {/* Overview 4: AI Screening Matrix */}
          <div
            onClick={() => onNavigateToTab ? onNavigateToTab('matrix') : undefined}
            className="p-3 rounded-xl bg-[#102337] border border-[#1D3A52] hover:border-[#0E88D3] transition-all cursor-pointer flex flex-col justify-between gap-1.5 shadow-sm group"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#0E88D3] font-bold flex items-center gap-1.5">
                <span>▦</span> [03] AI MATRIX
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#07111C] text-[#9AAFC0] group-hover:text-[#0E88D3]">GRID &rarr;</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-[#F1F5F9]">{rejected.length} <span className="text-xs text-[#E5484D] font-bold">Rejections</span></span>
              <span className="text-[11px] font-mono text-[#9AAFC0]">
                {isScreened ? '100% Evaluated' : 'Awaiting Run'}
              </span>
            </div>
            <div className="text-[10px] text-[#9AAFC0] truncate font-sans">
              Full qualification matrix &amp; Bayesian risk
            </div>
          </div>
        </div>
      </div>

      {/* Lot Intelligence & Equipment Bay Quick Action Strip */}
      <div className="bg-[#07111C] border-b border-[#1D3A52] px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-xs text-[#9AAFC0] uppercase font-display font-bold tracking-wider whitespace-nowrap mr-1">
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
                    ? 'bg-[#0E88D3]/20 border-[#0E88D3]/70 text-[#0E88D3] font-bold'
                    : lot.rejects > 0
                    ? 'border-[#E5484D]/50 text-[#E5484D] bg-[#24141E] hover:bg-[#24141E]/80'
                    : 'border-[#1D3A52] bg-[#102337] text-[#9AAFC0] hover:text-[#F1F5F9] hover:bg-[#142B40]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    lot.rejects > 0
                      ? 'bg-[#E5484D] animate-alert-once'
                      : lot.monitors > 0
                      ? 'bg-[#F2B84B]'
                      : isScreened
                      ? 'bg-[#22A06B]'
                      : 'bg-[#9AAFC0]'
                  }`}
                />
                <span className="font-semibold">{lot.lot_id}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/40 opacity-90 tabular-nums font-bold">
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
              className="px-3.5 py-1.5 rounded-lg bg-[#142B40] hover:bg-[#1D3A52] text-[#F1F5F9] text-xs md:text-sm font-mono font-bold border border-[#1D3A52] flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Open Lot-Wise Classification Modal"
            >
              <span>📦 Lots Modal</span>
            </button>
          )}

          <div className="text-xs md:text-sm font-mono text-[#9AAFC0] bg-[#102337] px-3 py-1.5 rounded-lg border border-[#1D3A52]">
            Selected Part: <b className="text-[#0E88D3]">{effectiveSelected?.component_id || 'None'}</b>
          </div>
        </div>
      </div>

      {/* Main Command Wall Content Area: Divided into Sector A and Sector B */}
      <div className="p-3 flex-1 flex flex-col gap-3">
        {/* ================= PRIMARY LAYOUT: TWO SECTORS (MODULE A & MODULE B WITH GRAPHS BELOW) ================= */}
        {consoleLayout === 'dual' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch flex-1 w-full">
            {/* ================= SECTOR 1: MODULE A ================= */}
            <div className="flex flex-col h-full flex-1 min-w-0">
              <ModuleAAnomalyPanel
                components={components}
                selected={effectiveSelected}
                onSelectComponent={onSelectComponent}
                onSelectSubsystem={onSelectSubsystem}
              />
            </div>

            {/* ================= SECTOR 2: MODULE B ================= */}
            <div className="flex flex-col h-full flex-1 min-w-0">
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
            <div className="flex items-center justify-between bg-[#102337] px-4 py-1.5 rounded-lg border border-[#1D3A52] text-xs">
              <span className="text-[#9AAFC0] font-mono text-[11px] uppercase">
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
                        ? 'bg-[#142B40] text-[#0E88D3] border-[#0E88D3]/70 font-bold shadow-sm'
                        : 'bg-transparent text-[#9AAFC0] border-transparent hover:text-[#F1F5F9]'
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
                <div className="flex flex-col rounded-xl bg-[#102337] border border-[#1D3A52] shadow-xl overflow-hidden min-h-[460px]">
                  <div className="bg-[#0B1928] border-b border-[#1D3A52] px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-[#142B40] text-[#9AAFC0] text-[10px] font-semibold border border-[#1D3A52]">
                        SCREEN 01
                      </span>
                      <span className="text-xs font-bold text-[#F1F5F9] tracking-wide">
                        Range Safety &amp; Orbit Dynamics
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#9AAFC0]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-gentle-pulse" />
                      <span className="text-[#F1F5F9] font-medium text-[11px]">RSO Console</span>
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                      <div className="p-2.5 rounded-lg bg-[#142B40] border border-[#1D3A52]">
                        <div className="text-[10px] text-[#9AAFC0] uppercase font-medium">Altitude</div>
                        <div className="text-lg font-bold text-[#F1F5F9] font-mono mt-0.5">
                          520.4 <span className="text-xs font-normal text-[#9AAFC0]">KM</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#142B40] border border-[#1D3A52]">
                        <div className="text-[10px] text-[#9AAFC0] uppercase font-medium">Velocity</div>
                        <div className="text-lg font-bold text-[#22A06B] font-mono mt-0.5">
                          7.61 <span className="text-xs font-normal text-[#9AAFC0]">KM/S</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#142B40] border border-[#1D3A52]">
                        <div className="text-[10px] text-[#9AAFC0] uppercase font-medium">Inclination</div>
                        <div className="text-lg font-bold text-[#F1F5F9] font-mono mt-0.5">97.42&deg;</div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#1D3A52] overflow-hidden bg-[#07111C] flex-1 min-h-[220px]">
                      <MissionMap critical={rejected.length > 0} />
                    </div>

                    <div className="p-3 rounded-lg bg-[#142B40] border border-[#1D3A52] text-xs">
                      <div className="flex justify-between items-center text-[#F1F5F9] font-semibold mb-2">
                        <span>ISTRAC Ground Stations</span>
                        <span className="text-[#22A06B] font-mono text-[11px]">5 of 5 Locked</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-[#9AAFC0]">
                        <div className="flex justify-between bg-[#102337] p-1.5 rounded border border-[#1D3A52]">
                          <span>SHAR (Sriharikota):</span>
                          <span className="text-[#22A06B] font-mono font-bold">AZ 142&deg; EL 68&deg;</span>
                        </div>
                        <div className="flex justify-between bg-[#102337] p-1.5 rounded border border-[#1D3A52]">
                          <span>Port Blair:</span>
                          <span className="text-[#22A06B] font-mono font-bold">AZ 210&deg; EL 44&deg;</span>
                        </div>
                        <div className="flex justify-between bg-[#102337] p-1.5 rounded border border-[#1D3A52]">
                          <span>Brunei Station:</span>
                          <span className="text-[#22A06B] font-mono font-bold">AZ 098&deg; EL 52&deg;</span>
                        </div>
                        <div className="flex justify-between bg-[#102337] p-1.5 rounded border border-[#1D3A52]">
                          <span>Biak (Indonesia):</span>
                          <span className="text-[#F2B84B] font-mono font-bold">AZ 045&deg; EL 31&deg;</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0B1928] border-t border-[#1D3A52] px-4 py-2 text-xs text-[#9AAFC0] flex justify-between font-mono">
                    <span>Feed: Primary Radar TEL-1</span>
                    <span className="text-[#0E88D3]">Doppler Lock: +14.2 kHz</span>
                  </div>
                </div>
              )}

              {/* SCREEN 02: 3D SPACECRAFT DIGITAL TWIN */}
              {(activeQuadTab === 'all' || activeQuadTab === '2') && (
                <div className="flex flex-col rounded-xl bg-[#102337] border border-[#1D3A52] shadow-xl overflow-hidden min-h-[460px]">
                  <div className="bg-[#0B1928] border-b border-[#1D3A52] px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-[#142B40] text-[#9AAFC0] text-[10px] font-semibold border border-[#1D3A52]">
                        SCREEN 02
                      </span>
                      <span className="text-xs font-bold text-[#F1F5F9] tracking-wide font-display">
                        Spacecraft 3D Digital Twin &amp; AOCS
                      </span>
                      {effectiveSelected && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            effectiveSelected.status === 'reject'
                              ? 'bg-[#24141E] text-[#E5484D] border-[#E5484D]/50'
                              : effectiveSelected.status === 'monitor'
                              ? 'bg-[#F2B84B]/15 text-[#F2B84B] border-[#F2B84B]/40'
                              : 'bg-[#22A06B]/15 text-[#22A06B] border-[#22A06B]/40'
                          }`}
                        >
                          Target: {effectiveSelected.component_id} [{effectiveSelected.subsystem}]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#9AAFC0]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0E88D3] animate-gentle-pulse" />
                      <span className="text-[#F1F5F9] font-medium text-[11px]">Vehicle Console</span>
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col gap-3">
                    <div className="relative flex-1 min-h-[290px] rounded-lg border border-[#1D3A52] bg-[#07111C] overflow-hidden">
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
                              ? 'bg-[#0E88D3]/15 border-[#0E88D3]/70 text-[#F1F5F9] shadow-sm'
                              : s.status === 'reject'
                              ? 'bg-[#24141E] border-[#E5484D]/50 text-[#E5484D]'
                              : 'bg-[#142B40] border-[#1D3A52] text-[#9AAFC0] hover:border-[#1D3A52]'
                          }`}
                        >
                          <div className="font-semibold flex justify-between">
                            <span className="font-mono text-[11px]">[{s.key}]</span>
                            <span
                              className={`font-mono ${
                                s.status === 'reject' ? 'text-[#E5484D] font-bold' : 'text-[#22A06B]'
                              }`}
                            >
                              {Math.max(0, 100 - Math.round(s.avg_risk))}%
                            </span>
                          </div>
                          <div className="truncate text-[10px] text-[#9AAFC0] mt-0.5">{s.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0B1928] border-t border-[#1D3A52] px-4 py-1.5 text-[10px] text-[#9AAFC0] flex justify-between">
                    <span>ATTITUDE: P: +0.02&deg; | R: -0.01&deg; | Y: +0.04&deg;</span>
                    <span className="text-[#22A06B]">BUS VOLTAGE: 28.12V NOMINAL</span>
                  </div>
                </div>
              )}

              {/* SCREEN 03: HTOL SILICON OSCILLOSCOPE */}
              {(activeQuadTab === 'all' || activeQuadTab === '3') && (
                <div className="flex flex-col rounded-xl bg-[#102337] border border-[#1D3A52] shadow-xl overflow-hidden min-h-[460px]">
                  <div className="bg-[#0B1928] border-b border-[#1D3A52] px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-[#142B40] text-[#9AAFC0] text-[10px] font-semibold border border-[#1D3A52]">
                        SCREEN 03
                      </span>
                      <span className="text-xs font-bold text-[#F1F5F9] tracking-wide font-display">
                        HTOL 168H Silicon Telemetry &amp; Parametric Drift
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#9AAFC0]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E5484D] animate-alert-once" />
                      <span className="text-[#F1F5F9] font-medium text-[11px]">AI Screening</span>
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col gap-3">
                    <div className="rounded-lg border border-[#1D3A52] bg-[#07111C] overflow-hidden flex-1 min-h-[220px]">
                      <TelemetryChart component={effectiveSelected} />
                    </div>

                    {effectiveSelected ? (
                      <div className="p-3 rounded-lg bg-[#142B40] border border-[#1D3A52] text-xs space-y-2">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-[#F1F5F9] font-mono text-xs">{effectiveSelected.component_id}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                              effectiveSelected.status === 'reject'
                                ? 'bg-[#24141E] text-[#E5484D] border-[#E5484D]/50'
                                : effectiveSelected.status === 'monitor'
                                ? 'bg-[#F2B84B]/15 text-[#F2B84B] border-[#F2B84B]/40'
                                : 'bg-[#22A06B]/15 text-[#22A06B] border-[#22A06B]/40'
                            }`}
                          >
                            {(effectiveSelected.status || 'safe').toUpperCase()} (Risk: {effectiveSelected.risk_score}/100)
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs text-[#9AAFC0] bg-[#102337] p-2 rounded border border-[#1D3A52] font-mono">
                          <div>0h: <b className="text-[#F1F5F9]">{effectiveSelected.v0.toFixed(1)}&mu;A</b></div>
                          <div>24h: <b className="text-[#F1F5F9]">{effectiveSelected.v24.toFixed(1)}&mu;A</b></div>
                          <div>96h: <b className="text-[#F1F5F9]">{effectiveSelected.v96 != null ? effectiveSelected.v96.toFixed(1) : '-'}&mu;A</b></div>
                          <div>168h: <b className="text-[#E5484D] font-bold">{effectiveSelected.v168.toFixed(1)}&mu;A</b></div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-[#9AAFC0] bg-[#142B40] rounded-lg border border-[#1D3A52]">
                        Select a component to inspect oscilloscope telemetry.
                      </div>
                    )}
                  </div>

                  <div className="bg-[#0B1928] border-t border-[#1D3A52] px-4 py-2 text-xs text-[#9AAFC0] flex justify-between font-mono">
                    <span>Sampling: 24-Bit Sigma-Delta ADC</span>
                    <span className="text-[#0E88D3]">Oven Temp: 125.0&deg;C Constant</span>
                  </div>
                </div>
              )}

              {/* SCREEN 04: FLIGHT QUALIFICATION LOTS & SATELLITE LOCATION */}
              {(activeQuadTab === 'all' || activeQuadTab === '4') && (
                <div className="flex flex-col rounded-xl bg-[#102337] border border-[#1D3A52] shadow-xl overflow-hidden min-h-[460px]">
                  <div className="bg-[#0B1928] border-b border-[#1D3A52] px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-[#142B40] text-[#9AAFC0] text-[10px] font-semibold border border-[#1D3A52]">
                        SCREEN 04
                      </span>
                      <span className="text-xs font-bold text-[#F1F5F9] tracking-wide font-display">
                        {screen4Mode === 'lots' ? 'Flight Qualification Lots & Satellite Locations' : 'Quarantined Anomaly Ledger'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-[#07111C] p-0.5 rounded border border-[#1D3A52]">
                        <button
                          type="button"
                          onClick={() => setScreen4Mode('lots')}
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
                            screen4Mode === 'lots' ? 'bg-[#0E88D3] text-white shadow-sm' : 'text-[#9AAFC0] hover:text-[#F1F5F9]'
                          }`}
                        >
                          📦 Lots ({lotGroups.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setScreen4Mode('quarantine')}
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
                            screen4Mode === 'quarantine' ? 'bg-[#E5484D] text-white shadow-sm' : 'text-[#9AAFC0] hover:text-[#F1F5F9]'
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
                          <div className="p-2.5 rounded-lg bg-[#142B40] border border-[#0E88D3]/30 flex flex-col gap-2 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#F1F5F9]">
                              <span className="font-bold text-[#0E88D3]">{activeWallLot.lot_id}</span>
                              <span className="text-[#22A06B] font-bold">{activeWallLot.parts.length} components</span>
                            </div>
                            <div className="pt-1.5 border-t border-[#1D3A52] flex flex-wrap items-center gap-1.5">
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
                                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#102337] border border-[#1D3A52] text-[#9AAFC0] hover:text-[#F1F5F9] flex items-center gap-1"
                                  >
                                    <span className="font-bold text-[#0E88D3]">[{subKey}]</span>
                                    <span>{count} in {loc.name}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex-1 overflow-y-auto rounded-lg border border-[#1D3A52] bg-[#07111C] max-h-[220px]">
                          <table className="w-full text-left text-xs font-sans border-collapse">
                            <thead className="bg-[#0B1928] text-[10px] uppercase font-semibold text-[#9AAFC0] sticky top-0 border-b border-[#1D3A52]">
                              <tr>
                                <th className="py-2 px-2.5">Part ID</th>
                                <th className="py-2 px-2">Subsystem</th>
                                <th className="py-2 px-2">Satellite Bay</th>
                                <th className="py-2 px-2">168h</th>
                                <th className="py-1.5 px-2">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1D3A52]/60">
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
                                        isSel ? 'bg-[#142B40] text-[#F1F5F9] font-bold' : 'hover:bg-[#142B40]/50 text-[#9AAFC0]'
                                      }`}
                                    >
                                      <td className="py-1.5 px-2.5 font-mono font-bold text-[#F1F5F9]">{c.component_id}</td>
                                      <td className="py-1.5 px-2 text-[#0E88D3] font-bold font-mono">[{c.subsystem}]</td>
                                      <td className="py-1.5 px-2 text-[#9AAFC0]">{loc.bay}</td>
                                      <td className="py-1.5 px-2 font-mono text-[#F1F5F9]">{c.v168.toFixed(1)}&mu;A</td>
                                      <td className="py-1.5 px-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                                          c.status === 'reject'
                                            ? 'bg-[#24141E] text-[#E5484D] border border-[#E5484D]/50'
                                            : c.status === 'monitor'
                                            ? 'bg-[#F2B84B]/15 text-[#F2B84B] border border-[#F2B84B]/40'
                                            : 'bg-[#22A06B]/15 text-[#22A06B] border border-[#22A06B]/40'
                                        }`}>
                                          {(c.status || 'safe').toUpperCase()}
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
                      <div className="flex-1 overflow-y-auto rounded-lg border border-[#1D3A52] bg-[#07111C] max-h-[220px]">
                        <table className="w-full text-left text-xs font-sans border-collapse">
                          <thead className="bg-[#0B1928] text-[10px] uppercase font-semibold text-[#9AAFC0] sticky top-0 border-b border-[#1D3A52]">
                            <tr>
                              <th className="py-2 px-3">Part ID</th>
                              <th className="py-2 px-2">Subsystem &amp; Bay Location</th>
                              <th className="py-2 px-2">168h</th>
                              <th className="py-2 px-2">z-Score</th>
                              <th className="py-1.5 px-2">Spec vs AI</th>
                              <th className="py-1.5 px-2">Risk</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1D3A52]/60">
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
                                    isSel ? 'bg-[#24141E] text-[#E5484D] font-bold' : 'hover:bg-[#142B40]/50 text-[#9AAFC0]'
                                  }`}
                                >
                                  <td className="py-1.5 px-2.5 font-bold font-mono text-[#F1F5F9]">{c.component_id}</td>
                                  <td className="py-1.5 px-2 text-[#0E88D3] font-mono font-bold">[{c.subsystem}] {loc.name}</td>
                                  <td className="py-1.5 px-2 text-[#E5484D] font-bold font-mono">{c.v168.toFixed(1)}&mu;A</td>
                                  <td className="py-1.5 px-2 text-[#E5484D] font-mono">+{c.z168.toFixed(2)}&sigma;</td>
                                  <td className="py-1.5 px-2">
                                    <span className="px-1.5 py-0.5 rounded text-[8.5px] bg-[#24141E] text-[#E5484D] border border-[#E5484D]/50 font-bold">
                                      PASS Spec &bull; REJECT AI
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2 text-[#E5484D] font-bold font-mono">{c.risk_score}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#0B1928] border-t border-[#1D3A52] px-4 py-1.5 text-[10px] text-[#9AAFC0] flex justify-between">
                    <span>STATUS: {isScreened ? 'AI SCREENING COMPLETED' : 'AWAITING AI SCREENING PIPELINE'}</span>
                    <span className="text-[#22A06B] font-mono">{lotGroups.length} FLIGHT LOTS ACTIVE</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsible Spacecraft Bus & HTOL Circuit Diagram Tray */}
        <div className="bg-[#102337] rounded-xl border border-[#1D3A52] p-4">
          <button
            type="button"
            onClick={() => setShowSchematics((v) => !v)}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#0E88D3] animate-gentle-pulse" />
              <span className="text-xs font-bold text-[#F1F5F9] tracking-wide uppercase font-display">
                ISRO SDSC SHAR Component Architecture &amp; HTOL Telemetry DAQ Schematics
              </span>
            </div>
            <span className="text-xs text-[#9AAFC0] hover:text-[#F1F5F9] transition-colors font-medium">
              {showSchematics ? '[-] Hide Schematics' : '[+] Expand Test Harness Schematics'}
            </span>
          </button>
          {showSchematics && (
            <div className="mt-3 pt-3 border-t border-[#1D3A52]">
              <ComponentDiagram type="all" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

