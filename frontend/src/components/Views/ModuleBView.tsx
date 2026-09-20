import React, { useState, useMemo } from 'react'
import type { ComponentOut, MissionStatus } from '../../types'
import ModuleBFutureDriftPanel from '../Dashboard/ModuleBFutureDriftPanel'
import AnalysisWorkflowBar from '../Dashboard/AnalysisWorkflowBar'
import type { DashboardTab } from '../Dashboard/Header'

interface ModuleBViewProps {
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  onSelectSubsystem?: (subKey: string) => void
  onSelectStage: (stage: DashboardTab) => void
  mission: MissionStatus | null
}

export default function ModuleBView({
  components,
  selected,
  onSelectComponent,
  onSelectSubsystem,
  onSelectStage,
  mission,
}: ModuleBViewProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'reject' | 'monitor' | 'safe'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredComponents = useMemo(() => {
    return components.filter((c) => {
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
      const matchesSearch =
        searchQuery === '' ||
        c.component_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lot_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subsystem?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [components, statusFilter, searchQuery])

  const hasData = components.length > 0
  const isScreened = mission !== null

  return (
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-[#070D18] text-[#E8EDF2] font-sans flex-1">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#26384D] pb-3 bg-[#0D1726]/60 p-3 md:p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#3B82B6]/20 text-[#3B82B6] border border-[#3B82B6]/40 font-mono font-bold text-xs uppercase tracking-wider">
              STAGE 3
            </span>
            <span className="text-xs font-mono text-[#91A0B2]">
              EARLY TEMPORAL DRIFT &amp; FUTURE RELIABILITY PREDICTION
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#E8EDF2] tracking-wide mt-1">
            Module B — Early Drift &amp; In-Flight Forecasting Dashboard
          </h1>
          <p className="text-xs text-[#91A0B2] mt-0.5 max-w-3xl">
            Calculates degradation curvature velocity across 0h, 24h, 96h, and 168h milestones.
            Projects parametric drift to 264h (+96h in-flight extension) and flags early limit breaches.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectStage('risk_engine')}
            className="px-4 py-2.5 rounded-lg bg-[#C99A2E] hover:bg-[#D6A33A] text-[#070D18] font-mono font-bold text-xs md:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[#C99A2E]/10"
          >
            <span>Proceed to Risk Engine</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* Horizontal Analysis Workflow Bar */}
      <AnalysisWorkflowBar
        currentStage="module_b"
        onSelectStage={onSelectStage}
        hasData={hasData}
        isScreened={isScreened}
      />

      {/* Component Quick Selector Bar for Module B */}
      <div className="p-3 rounded-xl bg-[#111E30] border border-[#26384D] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[320px]">
          <span className="text-[#91A0B2] font-mono text-[11px]">SELECT PART:</span>
          <input
            type="text"
            placeholder="Search Part / Subsystem..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#070D18] border border-[#26384D] rounded-lg px-2.5 py-1 text-xs text-[#E8EDF2] font-mono placeholder:text-[#5A6E85] focus:outline-none focus:border-[#3B82B6]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          {(['ALL', 'reject', 'monitor', 'safe'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-2 py-0.5 rounded transition-colors uppercase ${
                statusFilter === filter
                  ? filter === 'reject'
                    ? 'bg-[#D94B5B] text-[#E8EDF2] font-bold'
                    : filter === 'monitor'
                    ? 'bg-[#D6A33A] text-[#E8EDF2] font-bold'
                    : filter === 'safe'
                    ? 'bg-[#3FA66B] text-[#E8EDF2] font-bold'
                    : 'bg-[#C99A2E]/30 text-[#C99A2E] border border-[#C99A2E]/50 font-bold'
                  : 'text-[#91A0B2] hover:text-[#E8EDF2] bg-[#070D18] border border-[#26384D]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Dropdown */}
        <select
          value={selected?.component_id || ''}
          onChange={(e) => {
            if (e.target.value) onSelectComponent(e.target.value)
          }}
          className="bg-[#070D18] border border-[#26384D] text-[#E8EDF2] text-xs font-mono rounded-lg px-3 py-1.5 max-w-[240px] focus:outline-none focus:border-[#C99A2E]"
        >
          <option value="" disabled>Pick Component ({filteredComponents.length})</option>
          {filteredComponents.slice(0, 100).map((c, idx) => (
            <option key={c.component_id} value={c.component_id}>
              {idx + 1}. {c.component_id} [{(c.status || 'safe').toUpperCase()}] ({c.predicted_future ? `${c.predicted_future.toFixed(1)} µA proj` : `${c.v168.toFixed(1)} µA`})
            </option>
          ))}
        </select>
      </div>

      {/* Complete Module B Dashboard Workspace */}
      <div className="w-full flex-1">
        <ModuleBFutureDriftPanel
          components={components}
          selected={selected}
          onSelectComponent={onSelectComponent}
          onSelectSubsystem={onSelectSubsystem}
        />
      </div>
    </div>
  )
}
