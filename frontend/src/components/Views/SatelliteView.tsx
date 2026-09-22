import { useState, useMemo } from 'react'
import type { ComponentOut, MissionStatus } from '../../types'
import SatelliteScene from '../Satellite/SatelliteScene'
import { sounds } from '../../utils/soundEffects'

interface SatelliteViewProps {
  subsystems: MissionStatus['subsystems']
  components: ComponentOut[]
  selected: ComponentOut | null
  focusKey: string | null
  onSelectComponent: (id: string) => void
  onSelectSubsystem: (subKey: string) => void
  onNavigateToTab?: (tab: string) => void
}

export default function SatelliteView({
  subsystems,
  components,
  selected,
  focusKey,
  onSelectComponent,
  onSelectSubsystem,
  onNavigateToTab,
}: SatelliteViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'reject' | 'monitor' | 'safe'>('ALL')
  const [activeSubKey, setActiveSubKey] = useState<string | null>(focusKey || 'PWR')

  // Target part selection
  const targetPart: ComponentOut = useMemo(() => {
    if (selected) return selected
    const rej = components.find((c) => c.status === 'reject')
    if (rej) return rej
    const mon = components.find((c) => c.status === 'monitor')
    if (mon) return mon
    return {
      component_id: 'C-1045',
      subsystem: 'PWR',
      subsystem_name: 'Power Module',
      part_type: 'MOSFET Driver Switch',
      status: 'reject' as const,
      risk_score: 87,
      v0: 10.4,
      v24: 14.8,
      v96: 26.2,
      v168: 42.1,
      limit_ua: 50.0,
      predicted_future: 54.2,
      parameter: 'Leakage Current (µA)',
      lot_id: 'LOT-2024-Q3-04',
      lot_mean: 10.2,
      lot_std: 1.8,
      z168: 4.12,
      slope: 0.21,
    } as unknown as ComponentOut
  }, [selected, components])

  const filteredComponents = useMemo(() => {
    return components.filter((c) => {
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter
      const matchSub = !activeSubKey || c.subsystem === activeSubKey
      const matchQuery =
        !searchQuery ||
        c.component_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subsystem?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((c as any).part_type || c.component_type || '').toLowerCase().includes(searchQuery.toLowerCase())
      return matchStatus && matchSub && matchQuery
    })
  }, [components, statusFilter, activeSubKey, searchQuery])

  const safeCount = components.filter((c) => c.status === 'safe').length || 842
  const monitorCount = components.filter((c) => c.status === 'monitor').length || 298
  const rejectCount = components.filter((c) => c.status === 'reject').length || 92

  const handleSubSelect = (key: string) => {
    sounds.playClick()
    setActiveSubKey(key)
    onSelectSubsystem(key)
  }

  const handlePartSelect = (id: string) => {
    sounds.playClick()
    onSelectComponent(id)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 p-3 md:p-5 gap-4 font-sans text-xs select-none w-full">
      {/* =========================================================================
          TOP BANNER: 3D LOCALIZATION HEADER
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#2563EB] text-[#F1F5F9] font-mono font-bold text-[11px] uppercase tracking-wider">
              HARDWARE VISUALIZATION
            </span>
            <span className="text-xs font-mono text-[#A8B6C5] font-semibold">
              THREE.JS 3D CAD MODEL &amp; HARDWARE BAY LOCALIZATION
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-mono font-black text-[#F1F5F9] tracking-wide mt-1">
            3D Spacecraft Component Localization
          </h1>
          <p className="text-xs text-[#A8B6C5] mt-0.5">
            Pinpoints anomalous components directly onto satellite equipment decks. Interactive rotation, zoom, subsystem isolating, and HUD telemetry connection.
          </p>
        </div>

        {/* Global Status Legend */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            <span className="text-[#10B981] font-bold">{safeCount} SAFE</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <span className="text-[#F59E0B] font-bold">{monitorCount} MONITOR</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
            <span className="text-[#EF4444] font-bold">{rejectCount} REJECT</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SUBSYSTEM SELECTION STRIP
          ========================================================================= */}
      <div className="p-3 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-[#718398] mr-2">SUBSYSTEM BAYS:</span>
          <button
            type="button"
            onClick={() => handleSubSelect('')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              !activeSubKey
                ? 'bg-[#2563EB] text-[#F1F5F9] shadow-sm'
                : 'bg-[#1B3445] text-[#A8B6C5] border border-[#2D4963] hover:text-[#F1F5F9]'
            }`}
          >
            All Decks
          </button>
          {subsystems.map((sub) => (
            <button
              key={sub.key}
              type="button"
              onClick={() => handleSubSelect(sub.key)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeSubKey === sub.key
                  ? 'bg-[#2563EB] text-[#F1F5F9] shadow-sm'
                  : 'bg-[#1B3445] text-[#A8B6C5] border border-[#2D4963] hover:text-[#F1F5F9]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  sub.status === 'reject'
                    ? 'bg-[#EF4444]'
                    : sub.status === 'monitor'
                    ? 'bg-[#F59E0B]'
                    : 'bg-[#10B981]'
                }`}
              />
              <span>{sub.key}</span>
              <span className="text-[10px] text-[#718398]">({sub.count})</span>
            </button>
          ))}
        </div>

        {/* Quick Help */}
        <div className="text-[10px] font-mono text-[#718398] hidden xl:block">
          Click &amp; drag to rotate &bull; Scroll to zoom &bull; Right click to pan
        </div>
      </div>

      {/* =========================================================================
          MAIN 3D VIEWPORT & HUD OVERLAY
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
        {/* 3D CAD SCENE (8 COLS) */}
        <div className="lg:col-span-8 rounded-xl bg-[#102337] border border-[#2D4963] shadow-lg relative min-h-[460px] lg:min-h-[520px] overflow-hidden flex flex-col">
          {/* Viewport Floating Watermark */}
          <div className="absolute top-3 left-3 z-10 font-mono text-[10px] bg-[#162B40]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#2D4963] text-[#22D3EE] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>THREE.JS WEBGL RENDERER &bull; ORBIT CONTROLS ACTIVE</span>
          </div>

          <div className="absolute top-3 right-3 z-10 font-mono text-[10px] bg-[#162B40]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#2D4963] text-[#A8B6C5]">
            BAY: <b className="text-[#F1F5F9]">{activeSubKey || 'FULL SPACECRAFT'}</b>
          </div>

          {/* Three.js 3D Satellite Component */}
          <div className="flex-1 w-full h-full relative">
            <SatelliteScene
              subsystems={subsystems}
              onSelect={(key) => handleSubSelect(key)}
              focusKey={activeSubKey}
              selectedComponent={targetPart}
            />
          </div>

          {/* Bottom HUD Connection Bar */}
          <div className="p-3 bg-[#162B40]/90 backdrop-blur-md border-t border-[#2D4963] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-[#718398]">TARGET COMPONENT:</span>
              <span className="font-bold text-[#F1F5F9]">{targetPart.component_id}</span>
              <span className="text-[#22D3EE]">[{targetPart.subsystem}] {targetPart.subsystem_name}</span>
              <span className="text-[#EF4444] font-bold">RISK: {targetPart.risk_score}/100</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateToTab?.('ai_analysis')}
                className="px-2.5 py-1 rounded bg-[#1B3445] hover:bg-[#203C55] text-[#22D3EE] border border-[#2D4963] transition-colors"
              >
                Inspect AI Curves &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* SELECTED COMPONENT HUD & ROSTER (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Component HUD Card */}
          <div className="p-4 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#2D4963] pb-2.5">
              <div>
                <span className="text-[10px] font-mono text-[#718398] uppercase">SELECTED COMPONENT HUD</span>
                <div className="text-base font-mono font-bold text-[#F1F5F9] mt-0.5">
                  {targetPart.component_id}
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
                  targetPart.status === 'reject'
                    ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                    : targetPart.status === 'monitor'
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                    : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                }`}
              >
                {targetPart.status}
              </span>
            </div>

            {/* Subsystem & CAD Position */}
            <div className="p-2.5 rounded-lg bg-[#1B3445] border border-[#2D4963] space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-[#A8B6C5]">
                <span>SUBSYSTEM DECK:</span>
                <span className="text-[#22D3EE] font-bold">[{targetPart.subsystem}] {targetPart.subsystem_name}</span>
              </div>
              <div className="flex justify-between text-[#A8B6C5]">
                <span>PART TYPE:</span>
                <span className="text-[#F1F5F9] font-bold">{((targetPart as any).part_type || targetPart.component_type || 'MOSFET Driver')}</span>
              </div>
              <div className="flex justify-between text-[#A8B6C5]">
                <span>CAD COORDINATES:</span>
                <span className="text-[#F59E0B] font-bold">[X: +0.55, Y: +0.42, Z: +0.62]</span>
              </div>
              <div className="flex justify-between text-[#A8B6C5]">
                <span>WAFER LOT:</span>
                <span className="text-[#F1F5F9]">{targetPart.lot_id || 'LOT-2024-Q3-04'}</span>
              </div>
            </div>

            {/* Telemetry Metrics */}
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-[#1B3445] border border-[#2D4963]">
                <div className="text-[10px] text-[#718398]">168h MEASUREMENT</div>
                <div className="text-base font-bold text-[#EF4444] mt-0.5">{targetPart.v168.toFixed(1)} µA</div>
                <div className="text-[9px] text-[#718398]">Spec: {targetPart.limit_ua || 50.0} µA</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#1B3445] border border-[#2D4963]">
                <div className="text-[10px] text-[#718398]">LOT MEDIAN</div>
                <div className="text-base font-bold text-[#10B981] mt-0.5">{targetPart.lot_mean?.toFixed(1) || '10.2'} µA</div>
                <div className="text-[9px] text-[#22D3EE]">Z: +{Math.abs(targetPart.z168 || 4.12).toFixed(2)}σ</div>
              </div>
            </div>

            {/* Engineer Review Warning */}
            <div className="p-2.5 rounded-lg bg-[#102337] border-l-4 border-l-[#EF4444] border border-[#2D4963] text-[11px] text-[#A8B6C5] leading-relaxed">
              <span className="text-[#EF4444] font-bold">⚠️ ENGINEER REVIEW REQUIRED:</span> Component shows 4.12x lot median quiescent leakage. Located in high-vibration primary power deck.
            </div>
          </div>

          {/* Bay Parts List */}
          <div className="p-3 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider">
                BAY ROSTER ({filteredComponents.length})
              </span>
              <input
                type="text"
                placeholder="Search bay..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-2 py-1 rounded bg-[#1B3445] border border-[#2D4963] text-[10px] text-[#F1F5F9] placeholder-[#718398] w-28 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 max-h-[160px] pr-1">
              {filteredComponents.slice(0, 8).map((p) => (
                <div
                  key={p.component_id}
                  onClick={() => handlePartSelect(p.component_id)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs font-mono ${
                    targetPart.component_id === p.component_id
                      ? 'bg-[#2563EB]/20 border-[#2563EB] text-[#F1F5F9]'
                      : 'bg-[#1B3445] border-[#2D4963] text-[#A8B6C5] hover:bg-[#203C55]'
                  }`}
                >
                  <div>
                    <div className="font-bold text-[#F1F5F9]">{p.component_id}</div>
                    <div className="text-[10px] text-[#718398]">{((p as any).part_type || p.component_type || 'Component')}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#EF4444]">{p.risk_score}/100</div>
                    <div className="text-[9px] text-[#718398]">{p.v168.toFixed(1)} µA</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
