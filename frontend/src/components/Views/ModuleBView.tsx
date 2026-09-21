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
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-[#07111C] text-[#F1F5F9] font-sans flex-1 min-h-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1D3A52] pb-3 bg-[#0B1928]/60 p-3 md:p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#0E88D3]/20 text-[#0E88D3] border border-[#0E88D3]/40 font-mono font-bold text-xs uppercase tracking-wider">
              STAGE 3
            </span>
            <span className="text-xs font-mono text-[#9AAFC0]">
              EARLY TEMPORAL DRIFT &amp; FUTURE RELIABILITY PREDICTION
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#F1F5F9] tracking-wide mt-1">
            Module B — Early Drift &amp; In-Flight Forecasting Dashboard
          </h1>
          <p className="text-xs text-[#9AAFC0] mt-0.5 max-w-3xl">
            Calculates degradation curvature velocity across 0h, 24h, 96h, and 168h milestones.
            Projects parametric drift to 264h (+96h in-flight extension) and flags early limit breaches.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectStage('risk_engine')}
            className="px-4 py-2.5 rounded-lg bg-[#F47216] hover:bg-[#FA8838] text-white font-mono font-bold text-xs md:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-none"
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
      <div className="p-3 rounded-xl bg-[#102337] border border-[#1D3A52] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[320px]">
          <span className="text-[#9AAFC0] font-mono text-[11px]">SELECT PART:</span>
          <input
            type="text"
            placeholder="Search Part / Subsystem..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#07111C] border border-[#1D3A52] rounded-lg px-2.5 py-1 text-xs text-[#F1F5F9] font-mono placeholder:text-[#6F8495] focus:outline-none focus:border-[#0E88D3]"
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
                    ? 'bg-[#E5484D] text-[#F1F5F9] font-bold'
                    : filter === 'monitor'
                    ? 'bg-[#F2B84B] text-[#F1F5F9] font-bold'
                    : filter === 'safe'
                    ? 'bg-[#22A06B] text-[#F1F5F9] font-bold'
                    : 'bg-[#0E88D3]/20 text-[#0E88D3] border border-[#0E88D3]/50 font-bold'
                  : 'text-[#9AAFC0] hover:text-[#F1F5F9] bg-[#07111C] border border-[#1D3A52]'
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
          className="bg-[#07111C] border border-[#1D3A52] text-[#F1F5F9] text-xs font-mono rounded-lg px-3 py-1.5 max-w-[240px] focus:outline-none focus:border-[#0E88D3]"
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
      <div className="w-full flex-1 min-h-0 flex flex-col">
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
