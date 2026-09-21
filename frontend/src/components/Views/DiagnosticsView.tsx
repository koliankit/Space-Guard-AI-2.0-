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
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-[#07111C] text-[#F1F5F9] font-sans flex-1 min-h-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1D3A52] pb-3 bg-[#0B1928]/60 p-3 md:p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#0E88D3]/15 text-[#0E88D3] border border-[#0E88D3]/40 font-mono font-bold text-xs uppercase tracking-wider">
              DIAGNOSTICS &amp; ACTIONS
            </span>
            <span className="text-xs font-mono text-[#9AAFC0]">
              PHYSICS OF FAILURE &amp; HARDWARE MITIGATION
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#F1F5F9] tracking-wide mt-1">
            Component Diagnostics &amp; Prescriptive Controls
          </h1>
          <p className="text-xs text-[#9AAFC0] mt-0.5 max-w-3xl">
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
                ? 'bg-[#142B40] border-[#0E88D3] text-[#F1F5F9] font-bold shadow-sm'
                : 'bg-[#102337] border-[#1D3A52] text-[#9AAFC0] hover:text-[#F1F5F9]'
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
                ? 'bg-[#142B40] border-[#0E88D3] text-[#F1F5F9] font-bold shadow-sm'
                : 'bg-[#102337] border-[#1D3A52] text-[#9AAFC0] hover:text-[#F1F5F9]'
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
