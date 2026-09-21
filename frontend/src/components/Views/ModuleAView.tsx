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
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-[#F4F7FA] text-[#17212B] font-sans flex-1 min-h-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D9E2EA] pb-3 bg-[#FFFFFF]/60 p-3 md:p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#0E88D3]/15 text-[#0E88D3] border border-[#0E88D3]/40 font-mono font-bold text-xs uppercase tracking-wider">
              STAGE 2
            </span>
            <span className="text-xs font-mono text-[#5B6B7A]">
              DYNAMIC LOT-RELATIVE ANOMALY DETECTION
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#17212B] tracking-wide mt-1">
            Module A — Lot-Relative Anomaly Detection Dashboard
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5 max-w-3xl">
            Detects subtle silicon micro-defects and outliers that stay within absolute datasheet limits
            but exhibit abnormal variance relative to their production wafer lot baseline.
          </p>
        </div>

        {/* Quick Navigation to Next Stage */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectStage('module_b')}
            className="px-4 py-2.5 rounded-lg bg-[#F47216] hover:bg-[#FA8838] text-white font-mono font-bold text-xs md:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-none"
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
      <div className="w-full flex-1 min-h-0 flex flex-col">
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
