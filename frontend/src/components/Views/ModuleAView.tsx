import React from 'react'
import type { ComponentOut, MissionStatus } from '../../types'
import ModuleAAnomalyPanel from '../Dashboard/ModuleAAnomalyPanel'
import AnalysisWorkflowBar from '../Dashboard/AnalysisWorkflowBar'
import type { DashboardTab } from '../Dashboard/Header'

interface ModuleAViewProps {
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  onSelectSubsystem?: (subKey: string) => void
  onSelectStage: (stage: DashboardTab) => void
  mission: MissionStatus | null
}

export default function ModuleAView({
  components,
  selected,
  onSelectComponent,
  onSelectSubsystem,
  onSelectStage,
  mission,
}: ModuleAViewProps) {
  const hasData = components.length > 0
  const isScreened = mission !== null

  return (
    <div className="w-full flex flex-col gap-5 p-4 md:p-6 bg-[#070D18] text-[#E8EDF2] font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#26384D] pb-4 bg-[#0D1726]/60 -mx-4 -mt-4 p-4 md:-mx-6 md:-mt-6 md:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#C99A2E]/20 text-[#C99A2E] border border-[#C99A2E]/40 font-mono font-bold text-xs uppercase tracking-wider">
              STAGE 2
            </span>
            <span className="text-xs font-mono text-[#91A0B2]">
              DYNAMIC LOT-RELATIVE ANOMALY DETECTION
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#E8EDF2] tracking-wide mt-1">
            Module A — Lot-Relative Anomaly Detection Dashboard
          </h1>
          <p className="text-xs text-[#91A0B2] mt-0.5 max-w-3xl">
            Detects subtle silicon micro-defects and outliers that stay within absolute datasheet limits
            but exhibit abnormal variance relative to their production wafer lot baseline.
          </p>
        </div>

        {/* Quick Navigation to Next Stage */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectStage('module_b')}
            className="px-4 py-2.5 rounded-lg bg-[#C99A2E] hover:bg-[#D6A33A] text-[#070D18] font-mono font-bold text-xs md:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[#C99A2E]/10"
          >
            <span>Proceed to Module B: Future Drift</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* Horizontal Analysis Workflow Bar */}
      <AnalysisWorkflowBar
        currentStage="module_a"
        onSelectStage={onSelectStage}
        hasData={hasData}
        isScreened={isScreened}
      />

      {/* Complete Module A Dashboard Workspace */}
      <div className="w-full flex-1">
        <ModuleAAnomalyPanel
          components={components}
          selected={selected}
          onSelectComponent={onSelectComponent}
          onSelectSubsystem={onSelectSubsystem}
        />
      </div>
    </div>
  )
}
