import React, { useState } from 'react'
import type { ComponentOut, MissionStatus } from '../../types'
import AIRecommendationSystem from '../Satellite/AIRecommendationSystem'
import SubsystemsView from './SubsystemsView'
import { sounds } from '../../utils/soundEffects'

interface DiagnosticsViewProps {
  subsystems: MissionStatus['subsystems']
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  onFocusSubsystem?: (subKey: string) => void
}

export default function DiagnosticsView({
  subsystems,
  components,
  selected,
  onSelectComponent,
  onFocusSubsystem,
}: DiagnosticsViewProps) {
  const [activeTab, setActiveTab] = useState<'subsystems' | 'prescriptive'>('prescriptive')

  const worstPart =
    selected ||
    components.find((c) => c.status === 'reject') ||
    components.find((c) => c.status === 'monitor') ||
    components[0] ||
    null

  return (
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-[#070D18] text-[#E8EDF2] font-sans flex-1 min-h-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#26384D] pb-3 bg-[#0D1726]/60 p-3 md:p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#C99A2E]/20 text-[#C99A2E] border border-[#C99A2E]/40 font-mono font-bold text-xs uppercase tracking-wider">
              DIAGNOSTICS &amp; ACTIONS
            </span>
            <span className="text-xs font-mono text-[#91A0B2]">
              PHYSICS OF FAILURE &amp; HARDWARE MITIGATION
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#E8EDF2] tracking-wide mt-1">
            Component Diagnostics &amp; Prescriptive Controls
          </h1>
          <p className="text-xs text-[#91A0B2] mt-0.5 max-w-3xl">
            Examine underlying semiconductor failure modes, Arrhenius thermal degradation profiles,
            and execute spacecraft command directives such as bus isolation and cold standby failover.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              sounds.playClick()
              setActiveTab('prescriptive')
            }}
            className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              activeTab === 'prescriptive'
                ? 'bg-[#16253A] border-[#C99A2E] text-[#E8EDF2] font-bold shadow-sm'
                : 'bg-[#111E30] border-[#26384D] text-[#91A0B2] hover:text-[#E8EDF2]'
            }`}
          >
            Prescriptive Actions &amp; Root Cause
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick()
              setActiveTab('subsystems')
            }}
            className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              activeTab === 'subsystems'
                ? 'bg-[#16253A] border-[#C99A2E] text-[#E8EDF2] font-bold shadow-sm'
                : 'bg-[#111E30] border-[#26384D] text-[#91A0B2] hover:text-[#E8EDF2]'
            }`}
          >
            Subsystems Hardware Health
          </button>
        </div>
      </div>

      {/* View Content */}
      {activeTab === 'prescriptive' ? (
        <div className="flex flex-col gap-5 w-full flex-1 min-h-0">
          {/* AI Recommendation & Prescriptive Actions */}
          <AIRecommendationSystem
            component={worstPart}
            onIsolateBus={(id) => {
              sounds.playAlert()
            }}
            onFailover={(id) => {
              sounds.playSuccess()
            }}
          />
        </div>
      ) : (
        <div className="w-full flex-1 min-h-0 flex flex-col">
          <SubsystemsView
            subsystems={subsystems}
            components={components}
            onFocusSubsystem={onFocusSubsystem || (() => {})}
            onSelectComponent={onSelectComponent}
          />
        </div>
      )}
    </div>
  )
}
