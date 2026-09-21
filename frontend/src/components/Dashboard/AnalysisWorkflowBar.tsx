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
    <div className="w-full bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl p-2.5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs font-mono shadow-sm">
      <div className="flex items-center gap-2 text-[#5B6B7A] px-2 whitespace-nowrap">
        <span className="text-[#0E88D3] font-bold">ANALYSIS PIPELINE:</span>
        <span className="text-[11px] text-[#81909D] hidden xl:inline">
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
                    ? 'bg-[#F8FAFC] border-[#0E88D3] text-[#17212B] shadow-sm'
                    : isDone
                    ? 'bg-[#FFFFFF] border-[#168A5B]/50 text-[#5B6B7A] hover:text-[#17212B]'
                    : 'bg-[#FFFFFF] border-[#D9E2EA] text-[#5B6B7A] hover:text-[#17212B] hover:border-[#0E88D3]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                    isActive
                      ? 'bg-[#0E88D3] text-[#F4F7FA]'
                      : isDone
                      ? 'bg-[#168A5B]/20 text-[#168A5B]'
                      : 'bg-[#F8FAFC] text-[#5B6B7A]'
                  }`}
                >
                  {isDone ? '✓' : step.num}
                </span>

                <div className="text-left min-w-0">
                  <div
                    className={`font-bold tracking-wide truncate text-[11px] ${
                      isActive ? 'text-[#17212B]' : 'text-[#5B6B7A]'
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-[9.5px] text-[#81909D] truncate font-sans">
                    {step.subtitle}
                  </div>
                </div>
              </button>

              {idx < steps.length - 1 && (
                <span className="text-[#81909D] font-bold text-xs select-none hidden sm:inline">
                  &rarr;
                </span>
              )}
            </React.Fragment>
          )
        })}
      </div>

      <div className="hidden lg:flex items-center gap-2 text-[11px] text-[#5B6B7A] px-2">
        <span className="w-2 h-2 rounded-full bg-[#168A5B] animate-gentle-pulse" />
        <span>ARRHENIUS ENGINE READY</span>
      </div>
    </div>
  )
}
