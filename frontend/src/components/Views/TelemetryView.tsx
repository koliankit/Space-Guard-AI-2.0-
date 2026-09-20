import React, { useState } from 'react'
import type { ComponentOut, MissionStatus } from '../../types'
import TelemetryChart from '../Charts/TelemetryChart'
import ComponentMonitor from '../ComponentPanel/ComponentMonitor'
import { MathematicalReadingsPanel } from '../ComponentPanel/IntelligencePanel'

interface TelemetryViewProps {
  subsystems: MissionStatus['subsystems']
  components: ComponentOut[]
  analysisRun: boolean
  selected: ComponentOut | null
  onSelectSubsystem: (subKey: string) => void
  onSelectComponent: (id: string) => void
}

export default function TelemetryView({
  subsystems,
  components,
  analysisRun,
  selected,
  onSelectSubsystem,
  onSelectComponent,
}: TelemetryViewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('ALL')

  const targetPart =
    selected ||
    components.find((c) => c.status === 'reject') ||
    components[0] ||
    null

  return (
    <div className="w-full flex flex-col gap-5 p-4 md:p-6 bg-[#070D18] text-[#E8EDF2] font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#26384D] pb-4 bg-[#0D1726]/60 -mx-4 -mt-4 p-4 md:-mx-6 md:-mt-6 md:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#3B82B6]/20 text-[#3B82B6] border border-[#3B82B6]/40 font-mono font-bold text-xs uppercase tracking-wider">
              TELEMETRY DAQ
            </span>
            <span className="text-xs font-mono text-[#91A0B2]">
              24-BIT PARAMETRIC WAVEFORM OSCILLOSCOPE
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#E8EDF2] tracking-wide mt-1">
            Flight Telemetry Waveform Dashboard
          </h1>
          <p className="text-xs text-[#91A0B2] mt-0.5 max-w-3xl">
            Real-time parametric waveform oscilloscope tracking reverse leakage drift across burn-in milestones.
            Features reticle probe inspections, interactive timebase scaling, and multi-channel HUD readouts.
          </p>
        </div>

        {/* Oscilloscope status */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-[#3FA66B] animate-gentle-pulse" />
          <span className="text-[#91A0B2]">SAMPLING: 24-BIT SIGMA-DELTA @ 125°C</span>
        </div>
      </div>

      {/* Main Content Layout: Pinned Sidebar Component Monitor + Full Telemetry Chart */}
      <div className="flex flex-col xl:flex-row gap-5 items-start w-full">
        {/* Component Monitor Selector */}
        <div className="w-full xl:w-[360px] 2xl:w-[400px] flex-shrink-0 xl:sticky xl:top-4 flex flex-col rounded-xl overflow-hidden border border-[#26384D] bg-[#111E30] shadow-md">
          <ComponentMonitor
            subsystems={subsystems}
            components={components}
            analysisRun={analysisRun}
            selectedId={selected?.component_id ?? null}
            onSelectSubsystem={onSelectSubsystem}
            onSelectComponent={onSelectComponent}
            onSearch={setSearchTerm}
            onFilter={setFilterMode}
          />
        </div>

        {/* Right Flow: Oscilloscope Waveforms + Mathematical Readings Panel */}
        <div className="flex-1 min-w-0 flex flex-col gap-5 w-full">
          {/* Waveform Telemetry Chart */}
          <div className="w-full">
            <TelemetryChart component={targetPart} />
          </div>

          {/* Mathematical Telemetry Metrics Review */}
          <div className="w-full">
            <MathematicalReadingsPanel component={targetPart} />
          </div>
        </div>
      </div>
    </div>
  )
}
