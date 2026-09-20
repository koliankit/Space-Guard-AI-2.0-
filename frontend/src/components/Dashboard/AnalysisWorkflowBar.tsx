import React from 'react'
import type { DashboardTab } from './Header'
import { sounds } from '../../utils/soundEffects'

interface AnalysisWorkflowBarProps {
  currentStage: 'validation' | 'module_a' | 'module_b'
  onSelectStage: (stage: DashboardTab) => void
  hasData?: boolean
  isScreened?: boolean
}

export default function AnalysisWorkflowBar({
  currentStage,
  onSelectStage,
  hasData = true,
  isScreened = true,
}: AnalysisWorkflowBarProps) {
  const steps: {
    id: 'validation' | 'module_a' | 'module_b'
    num: string
    title: string
    subtitle: string
  }[] = [
    {
      id: 'validation',
      num: '①',
      title: 'VALIDATION',
      subtitle: 'Preprocessing & Audit',
    },
    {
      id: 'module_a',
      num: '②',
      title: 'MODULE A',
      subtitle: 'Lot-Relative Anomaly',
    },
    {
      id: 'module_b',
      num: '③',
      title: 'MODULE B',
      subtitle: '264h Future Drift',
    },
  ]

  const handleClick = (id: DashboardTab) => {
    sounds.playClick()
    onSelectStage(id)
  }

  return (
    <div className="w-full bg-[#0D1726] border border-[#26384D] rounded-xl p-2.5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs font-mono shadow-sm">
      <div className="flex items-center gap-2 text-[#91A0B2] px-2 whitespace-nowrap">
        <span className="text-[#C99A2E] font-bold">ANALYSIS PIPELINE:</span>
        <span className="text-[11px] text-[#5A6E85] hidden xl:inline">
          MIL-STD-883 Sequential Qualification
        </span>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-2xl justify-center">
        {steps.map((step, idx) => {
          const isActive = currentStage === step.id
          const isDone =
            (step.id === 'validation' && (currentStage === 'module_a' || currentStage === 'module_b')) ||
            (step.id === 'module_a' && currentStage === 'module_b')

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => handleClick(step.id)}
                className={`flex-1 flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#16253A] border-[#C99A2E] text-[#E8EDF2] shadow-sm'
                    : isDone
                    ? 'bg-[#111E30] border-[#3FA66B]/50 text-[#91A0B2] hover:text-[#E8EDF2]'
                    : 'bg-[#111E30] border-[#26384D] text-[#91A0B2] hover:text-[#E8EDF2] hover:border-[#3B82B6]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                    isActive
                      ? 'bg-[#C99A2E] text-[#070D18]'
                      : isDone
                      ? 'bg-[#3FA66B]/20 text-[#3FA66B]'
                      : 'bg-[#16253A] text-[#91A0B2]'
                  }`}
                >
                  {isDone ? '✓' : step.num}
                </span>

                <div className="text-left min-w-0">
                  <div
                    className={`font-bold tracking-wide truncate text-[11px] ${
                      isActive ? 'text-[#E8EDF2]' : 'text-[#91A0B2]'
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-[9.5px] text-[#5A6E85] truncate font-sans">
                    {step.subtitle}
                  </div>
                </div>
              </button>

              {idx < steps.length - 1 && (
                <span className="text-[#5A6E85] font-bold text-xs select-none hidden sm:inline">
                  &rarr;
                </span>
              )}
            </React.Fragment>
          )
        })}
      </div>

      <div className="hidden lg:flex items-center gap-2 text-[11px] text-[#91A0B2] px-2">
        <span className="w-2 h-2 rounded-full bg-[#3FA66B] animate-gentle-pulse" />
        <span>ARRHENIUS ENGINE READY</span>
      </div>
    </div>
  )
}
