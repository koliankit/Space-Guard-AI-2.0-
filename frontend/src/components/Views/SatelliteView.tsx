import React from 'react'
import type { ComponentOut, MissionStatus } from '../../types'
import SatelliteScene from '../Satellite/SatelliteScene'
import SatelliteEquipmentBoard from '../Satellite/SatelliteEquipmentBoard'
import { ComponentOverviewCard } from '../ComponentPanel/IntelligencePanel'

interface SatelliteViewProps {
  subsystems: MissionStatus['subsystems']
  components: ComponentOut[]
  selected: ComponentOut | null
  focusKey: string | null
  onSelectComponent: (id: string) => void
  onSelectSubsystem: (subKey: string) => void
}

export default function SatelliteView({
  subsystems,
  components,
  selected,
  focusKey,
  onSelectComponent,
  onSelectSubsystem,
}: SatelliteViewProps) {
  const targetPart =
    selected ||
    components.find((c) => c.status === 'reject') ||
    components.find((c) => c.status === 'monitor') ||
    components[0] ||
    null

  return (
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-transparent text-[#17212B] font-sans flex-1 min-h-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#D7E0EA] pb-3 bg-[#FFFFFF] p-3 md:p-4 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#005A9C] text-[#FFFFFF] font-mono font-bold text-xs uppercase tracking-wider shadow-xs">
              HARDWARE VISUALIZATION
            </span>
            <span className="text-xs font-mono text-[#334E68] font-semibold">
              THREE.JS 3D SATELLITE CAD &amp; SUBSYSTEM LOCALIZATION
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#0B1E36] tracking-wide mt-1">
            3D Satellite &amp; Spacecraft Component Localization
          </h1>
          <p className="text-xs text-[#475569] mt-0.5 max-w-3xl">
            Interactive 3D model of the spacecraft with real-time MIL-STD-883 qualification status.
            Decks light up GREEN (Safe), AMBER (Monitor), or RED (Reject). Click parts or decks to locate hardware bays.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#ECFDF5] border border-[#A7F3D0]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#168A5B]" />
            <span className="text-[#065F46] font-bold">SAFE</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#FFFBEB] border border-[#FDE68A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
            <span className="text-[#92400E] font-bold">MONITOR</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#FEF2F2] border border-[#FECACA]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D9363E] animate-gentle-pulse" />
            <span className="text-[#991B1B] font-bold">REJECT</span>
          </div>
        </div>
      </div>

      {/* Row 1: 50/50 Split - Component Info (Left) & 3D Interactive Satellite (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch w-full">
        {/* Left: Component Overview & Selected Hardware Info */}
        <div className="flex flex-col h-full">
          <ComponentOverviewCard component={targetPart} />
        </div>

        {/* Right: 3D Interactive Satellite Viewport */}
        <div className="relative min-h-[500px] lg:min-h-[560px] rounded-xl border border-[#D7E0EA] bg-[linear-gradient(180deg,#F8FAFD_0%,#EDF3FA_50%,#E2ECF7_100%)] overflow-hidden shadow-sm flex flex-col flex-1 h-full ring-1 ring-[#005A9C]/10">
          <SatelliteScene
            subsystems={subsystems}
            onSelect={onSelectSubsystem}
            focusKey={focusKey}
            selectedComponent={targetPart}
          />
        </div>
      </div>

      {/* Row 2: Full-Width Spacecraft Subsystem Hardware & Command Console */}
      <div className="w-full">
        <SatelliteEquipmentBoard
          subsystems={subsystems}
          components={components}
          selectedComponent={targetPart}
          focusKey={focusKey}
          onSelectComponent={onSelectComponent}
          onSelectSubsystem={onSelectSubsystem}
        />
      </div>
    </div>
  )
}
