import React, { useState, useMemo } from 'react'
import type { ComponentOut, MissionStatus } from '../../types'
import { getSubsystemLocation } from '../../utils/satelliteLocations'
import { sounds } from '../../utils/soundEffects'

interface ComponentPassportViewProps {
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  mission: MissionStatus | null
  onNavigateToTab?: (tab: string) => void
}

export default function ComponentPassportView({
  components,
  selected,
  onSelectComponent,
  mission,
  onNavigateToTab,
}: ComponentPassportViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'reject' | 'monitor' | 'safe'>('ALL')

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

  const targetPart = selected || filteredComponents[0] || null
  const loc = targetPart ? getSubsystemLocation(targetPart.subsystem) : null

  if (!components || components.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-8 bg-transparent text-center font-mono">
        <div className="w-16 h-16 rounded-full bg-[#0E88D3]/10 border border-[#0E88D3]/30 flex items-center justify-center text-[#0E88D3] text-2xl font-bold mb-4 shadow-sm">
          📋
        </div>
        <h2 className="text-xl font-black text-[#17212B] uppercase tracking-wider mb-2">
          NO COMPONENT PASSPORT AVAILABLE
        </h2>
        <p className="text-xs text-[#5B6B7A] max-w-md font-sans mb-4">
          Upload and validate a burn-in telemetry dataset to generate canonical Component Reliability Passports for flight screening.
        </p>
        {onNavigateToTab && (
          <button
            type="button"
            onClick={() => onNavigateToTab('csv_intake')}
            className="px-4 py-2 rounded-lg bg-[#0E88D3] hover:bg-[#0c74b4] text-white text-xs font-bold font-mono transition-colors shadow-sm"
          >
            Go to CSV Intake &rarr;
          </button>
        )}
      </div>
    )
  }

  if (!targetPart) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-8 bg-transparent text-center font-mono">
        <h2 className="text-base font-bold text-[#17212B] uppercase">NO COMPONENT SELECTED</h2>
        <p className="text-xs text-[#5B6B7A] mt-1">Select a component from the list to view its reliability passport.</p>
      </div>
    )
  }

  const limitVal = targetPart.limit_ua || 50.0
  const v168 = targetPart.v168
  const isBreached = v168 > limitVal
  const driftRate = targetPart.slope ?? (targetPart.v168 - targetPart.v0) / 168

  return (
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-transparent text-[#17212B] font-sans flex-1 min-h-full">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#D5DEE7] bg-[#FFFFFF] p-4 md:p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#0E88D3]/15 text-[#0E88D3] border border-[#0E88D3]/40 font-mono font-bold text-xs uppercase tracking-wider">
              OFFICIAL PASSPORT
            </span>
            <span className="text-xs font-mono font-semibold text-[#4F6170]">
              CANONICAL COMPONENT RELIABILITY DOSSIER
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#17212B] tracking-wide mt-1">
            Component Reliability Passport
          </h1>
          <p className="text-xs text-[#4F6170] mt-0.5 max-w-3xl leading-relaxed">
            Single source of truth for component qualification under MIL-STD-883. Unifies raw HTOL measurements, lot-relative cohort analytics, temporal drift predictions, 5-factor risk synthesis, and human QA clearance.
          </p>
        </div>

        {/* Quick Component Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              type="text"
              placeholder="Search component ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#D5DEE7] text-xs font-mono bg-[#F8FAFC] text-[#17212B] focus:outline-none focus:border-[#0E88D3] w-48"
            />
          </div>
          <select
            value={targetPart.component_id}
            onChange={(e) => onSelectComponent(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#0E88D3]/50 text-xs font-mono font-bold bg-[#FFFFFF] text-[#0E88D3] focus:outline-none focus:ring-1 focus:ring-[#0E88D3] cursor-pointer"
          >
            {filteredComponents.map((c) => (
              <option key={c.component_id} value={c.component_id}>
                {c.component_id} ({c.status.toUpperCase()} - {c.risk_score}/100)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Passport Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Core Identity, Location & Decision Banner */}
        <div className="flex flex-col gap-4">
          {/* Decision Status Card */}
          <div className={`p-5 rounded-xl border flex flex-col gap-3 font-mono shadow-sm ${
            targetPart.status === 'reject'
              ? 'bg-[#FEF2F2] border-[#D9363E]/40'
              : targetPart.status === 'monitor'
              ? 'bg-[#FFFBEB] border-[#C58A00]/40'
              : 'bg-[#F0FDF4] border-[#168A5B]/40'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-[#5B6B7A]">QUALIFICATION STATUS</span>
              <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider ${
                targetPart.status === 'reject'
                  ? 'bg-[#D9363E] text-white'
                  : targetPart.status === 'monitor'
                  ? 'bg-[#C58A00] text-white'
                  : 'bg-[#168A5B] text-white'
              }`}>
                {targetPart.status}
              </span>
            </div>

            <div className="flex items-baseline justify-between border-t border-b py-2.5 my-1 border-current/15">
              <div>
                <div className="text-2xl md:text-3xl font-black text-[#17212B] tracking-tight">
                  {targetPart.component_id}
                </div>
                <div className="text-xs text-[#5B6B7A] mt-0.5">Lot: <b className="text-[#17212B]">{targetPart.lot_id}</b></div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#5B6B7A] uppercase font-bold">Reliability Risk</div>
                <div className={`text-2xl font-black ${
                  targetPart.risk_score >= 80 ? 'text-[#D9363E]' : targetPart.risk_score >= 50 ? 'text-[#C58A00]' : 'text-[#168A5B]'
                }`}>
                  {targetPart.risk_score}<span className="text-sm font-normal text-[#5B6B7A]">/100</span>
                </div>
              </div>
            </div>

            <div className="text-xs flex flex-col gap-1 text-[#5B6B7A]">
              <div className="flex justify-between">
                <span>Traditional Spec:</span>
                <span className={`font-bold ${targetPart.traditional_decision === 'FAIL' ? 'text-[#D9363E]' : 'text-[#168A5B]'}`}>
                  {targetPart.traditional_decision}
                </span>
              </div>
              <div className="flex justify-between">
                <span>QA Human Sign-off:</span>
                <span className="font-bold text-[#0E88D3]">{targetPart.qa_decision || 'PENDING'}</span>
              </div>
              <div className="flex justify-between">
                <span>Anomaly Category:</span>
                <span className="font-semibold text-[#17212B] capitalize">{targetPart.anomaly_category?.replace(/_/g, ' ') || 'Normal'}</span>
              </div>
            </div>

            {/* Quick Link Buttons */}
            {onNavigateToTab && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-current/15">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('satellite')}
                  className="px-2.5 py-1.5 rounded-lg border border-[#0E88D3] bg-[#0E88D3]/10 hover:bg-[#0E88D3]/20 text-[#0E88D3] text-xs font-bold text-center transition-colors"
                >
                  Locate in 3D &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('qa_review')}
                  className="px-2.5 py-1.5 rounded-lg border border-[#D5DEE7] bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#17212B] text-xs font-bold text-center transition-colors"
                >
                  QA Sign-off &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Physical Parameters Card */}
          <div className="p-4 rounded-xl border border-[#D5DEE7] bg-[#FFFFFF] flex flex-col gap-3 font-mono shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-[#0E88D3] border-b border-[#D5DEE7] pb-2">
              PHYSICAL &amp; SPECIFICATION LIMITS
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                <div className="text-[10px] text-[#718292] uppercase">Component Type</div>
                <div className="font-bold text-[#17212B] mt-0.5 truncate">{targetPart.component_type || 'Integrated Circuit'}</div>
              </div>
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                <div className="text-[10px] text-[#718292] uppercase">Parameter</div>
                <div className="font-bold text-[#17212B] mt-0.5 truncate">{targetPart.parameter || 'Leakage Current (µA)'}</div>
              </div>
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                <div className="text-[10px] text-[#718292] uppercase">Unit</div>
                <div className="font-bold text-[#17212B] mt-0.5">{targetPart.unit || 'µA'}</div>
              </div>
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                <div className="text-[10px] text-[#718292] uppercase">HTOL Temp</div>
                <div className="font-bold text-[#17212B] mt-0.5">{targetPart.temperature_c ?? 125}°C</div>
              </div>
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                <div className="text-[10px] text-[#718292] uppercase">Datasheet Min</div>
                <div className="font-bold text-[#17212B] mt-0.5">{targetPart.datasheet_min ?? 0.0} {targetPart.unit || 'µA'}</div>
              </div>
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                <div className="text-[10px] text-[#718292] uppercase">Datasheet Max</div>
                <div className="font-bold text-[#17212B] mt-0.5">{limitVal} {targetPart.unit || 'µA'}</div>
              </div>
            </div>

            {/* Hardware Location */}
            <div className="p-3 rounded-lg bg-[#EBF5FB] border border-[#0E88D3]/30 flex flex-col gap-1 text-xs">
              <div className="text-[10px] uppercase font-bold text-[#0E88D3]">3D Spacecraft Hardware Bay</div>
              <div className="font-bold text-[#17212B]">
                [{targetPart.subsystem}] {targetPart.subsystem_name || loc?.name || targetPart.subsystem}
              </div>
              <div className="text-[11px] text-[#5B6B7A]">
                Location: {targetPart.subsystem ? `Bay Deck ${targetPart.subsystem}` : 'PHYSICAL LOCATION UNAVAILABLE'}
              </div>
            </div>
          </div>
        </div>

        {/* Center & Right Columns: Measurements, Module A, Module B & Factor Breakdown */}
        <div className="lg:col-span-2 flex flex-col gap-4 font-mono">
          {/* Burn-in Timeline Card */}
          <div className="p-4 rounded-xl border border-[#D5DEE7] bg-[#FFFFFF] shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#D5DEE7] pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0E88D3]">
                MIL-STD-883 METHOD 1005 BURN-IN TIMELINE
              </span>
              <span className="text-xs text-[#5B6B7A]">HTOL Screening Intervals</span>
            </div>

            {/* Step Timeline Graphic */}
            <div className="grid grid-cols-4 gap-2 text-center my-1">
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E7EEF5] flex flex-col items-center">
                <span className="text-[10px] text-[#718292] uppercase font-bold">0h (Baseline)</span>
                <span className="text-lg font-black text-[#17212B] mt-1">{targetPart.v0.toFixed(2)}</span>
                <span className="text-[10px] text-[#168A5B] font-bold mt-0.5">✓ Measured</span>
              </div>
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E7EEF5] flex flex-col items-center">
                <span className="text-[10px] text-[#718292] uppercase font-bold">24h (Early Drift)</span>
                <span className="text-lg font-black text-[#17212B] mt-1">{targetPart.v24.toFixed(2)}</span>
                <span className="text-[10px] text-[#168A5B] font-bold mt-0.5">✓ Measured</span>
              </div>
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E7EEF5] flex flex-col items-center">
                <span className="text-[10px] text-[#718292] uppercase font-bold">96h (Intermediate)</span>
                <span className="text-lg font-black text-[#17212B] mt-1">
                  {targetPart.v96 != null ? targetPart.v96.toFixed(2) : '--'}
                </span>
                <span className={`text-[10px] font-bold mt-0.5 ${targetPart.v96 != null ? 'text-[#168A5B]' : 'text-[#C58A00]'}`}>
                  {targetPart.v96 != null ? '✓ Measured' : '○ Imputed'}
                </span>
              </div>
              <div className={`p-3 rounded-lg border flex flex-col items-center ${
                isBreached ? 'bg-[#FEF2F2] border-[#D9363E]/50' : 'bg-[#F8FAFC] border-[#E7EEF5]'
              }`}>
                <span className="text-[10px] text-[#718292] uppercase font-bold">168h (Final)</span>
                <span className={`text-lg font-black mt-1 ${isBreached ? 'text-[#D9363E]' : 'text-[#17212B]'}`}>
                  {targetPart.v168.toFixed(2)}
                </span>
                <span className={`text-[10px] font-bold mt-0.5 ${isBreached ? 'text-[#D9363E]' : 'text-[#168A5B]'}`}>
                  {isBreached ? '✕ Limit Breach' : '✓ Measured'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-[#5B6B7A] bg-[#F8FAFC] p-2 rounded-lg border border-[#E7EEF5]">
              <span>Net Measured Drift: <b className="text-[#17212B]">{(targetPart.v168 - targetPart.v0).toFixed(2)} {targetPart.unit || 'µA'}</b> ({targetPart.pct_drift?.toFixed(1) ?? '0.0'}%)</span>
              <span>Burn-in Slope: <b className="text-[#17212B]">{(driftRate * 1000).toFixed(2)} nA/hr</b></span>
              <span>Datasheet Headroom: <b className={limitVal - targetPart.v168 < 5 ? 'text-[#D9363E]' : 'text-[#168A5B]'}>{(limitVal - targetPart.v168).toFixed(2)} {targetPart.unit || 'µA'}</b></span>
            </div>
          </div>

          {/* Side-by-Side: Module A vs Module B */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Module A: Lot-Relative Analytics */}
            <div className="p-4 rounded-xl border border-[#D5DEE7] bg-[#FFFFFF] shadow-sm flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-[#D5DEE7] pb-2">
                <span className="text-xs font-bold uppercase text-[#0E88D3]">MODULE A: LOT RELATIVE</span>
                <span className="text-[10px] text-[#5B6B7A]">Wafer Cohort: {targetPart.lot_id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                  <div className="text-[10px] text-[#718292]">Lot Mean</div>
                  <div className="font-bold text-[#17212B] mt-0.5">{targetPart.lot_mean?.toFixed(2) ?? 'N/A'} µA</div>
                </div>
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                  <div className="text-[10px] text-[#718292]">Lot Median</div>
                  <div className="font-bold text-[#17212B] mt-0.5">{targetPart.lot_median?.toFixed(2) ?? targetPart.lot_mean?.toFixed(2) ?? 'N/A'} µA</div>
                </div>
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                  <div className="text-[10px] text-[#718292]">Lot Standard Dev (&sigma;)</div>
                  <div className="font-bold text-[#17212B] mt-0.5">{targetPart.lot_std?.toFixed(2) ?? 'N/A'} µA</div>
                </div>
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                  <div className="text-[10px] text-[#718292]">Robust MAD</div>
                  <div className="font-bold text-[#17212B] mt-0.5">{targetPart.lot_mad?.toFixed(2) ?? 'N/A'} µA</div>
                </div>
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                  <div className="text-[10px] text-[#718292]">Robust Z-Score</div>
                  <div className={`font-bold mt-0.5 ${Math.abs(targetPart.z168 || 0) >= 3 ? 'text-[#D9363E]' : 'text-[#17212B]'}`}>
                    {targetPart.z168?.toFixed(2) ?? '0.00'}&sigma;
                  </div>
                </div>
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                  <div className="text-[10px] text-[#718292]">Lot Percentile Rank</div>
                  <div className="font-bold text-[#17212B] mt-0.5">{targetPart.lot_rank_percentile?.toFixed(1) ?? '50.0'}%</div>
                </div>
              </div>
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5] text-xs flex justify-between">
                <span className="text-[#718292]">Module A Anomaly Score:</span>
                <span className="font-bold text-[#0E88D3]">{targetPart.lot_anomaly_score?.toFixed(1) ?? '0.0'}/100</span>
              </div>
            </div>

            {/* Module B: Early Drift Forecasting */}
            <div className="p-4 rounded-xl border border-[#D5DEE7] bg-[#FFFFFF] shadow-sm flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-[#D5DEE7] pb-2">
                <span className="text-xs font-bold uppercase text-[#F47216]">MODULE B: DRIFT FORECAST</span>
                <span className="text-[10px] text-[#5B6B7A]">Horizon: 264h (+96h)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                  <div className="text-[10px] text-[#718292]">Early Drift (0h&rarr;24h)</div>
                  <div className="font-bold text-[#17212B] mt-0.5">{((targetPart.drift_rate_early ?? driftRate) * 1000).toFixed(2)} nA/hr</div>
                </div>
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                  <div className="text-[10px] text-[#718292]">Predicted 168h</div>
                  <div className="font-bold text-[#17212B] mt-0.5">{targetPart.predicted168_from_early?.toFixed(2) ?? targetPart.v168.toFixed(2)} µA</div>
                </div>
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                  <div className="text-[10px] text-[#718292]">Prediction Error</div>
                  <div className="font-bold text-[#0E88D3] mt-0.5">&plusmn;{(targetPart.prediction_error_168 ?? 0.0).toFixed(2)} µA</div>
                </div>
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                  <div className="text-[10px] text-[#718292]">Projected 264h</div>
                  <div className={`font-bold mt-0.5 ${targetPart.future_limit_breach ? 'text-[#D9363E]' : 'text-[#17212B]'}`}>
                    {targetPart.predicted_future?.toFixed(2) ?? targetPart.v168.toFixed(2)} µA
                  </div>
                </div>
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                  <div className="text-[10px] text-[#718292]">Safety Slope</div>
                  <div className="font-bold text-[#17212B] mt-0.5">{((targetPart.safety_slope ?? 0.04) * 1000).toFixed(1)} nA/hr</div>
                </div>
                <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5]">
                  <div className="text-[10px] text-[#718292]">Slope Status</div>
                  <div className={`font-bold mt-0.5 ${targetPart.safety_slope_exceeded ? 'text-[#D9363E]' : 'text-[#168A5B]'}`}>
                    {targetPart.safety_slope_exceeded ? 'EXCEEDED' : 'WITHIN SPEC'}
                  </div>
                </div>
              </div>
              <div className="p-2 rounded bg-[#F8FAFC] border border-[#E7EEF5] text-xs flex justify-between">
                <span className="text-[#718292]">Safety Headroom at 264h:</span>
                <span className={`font-bold ${(targetPart.margin_future ?? limitVal - targetPart.v168) < 5 ? 'text-[#D9363E]' : 'text-[#168A5B]'}`}>
                  {(targetPart.margin_future ?? limitVal - targetPart.v168).toFixed(2)} µA
                </span>
              </div>
            </div>
          </div>

          {/* 5-Factor Risk Engine Breakdown Card */}
          <div className="p-4 rounded-xl border border-[#D5DEE7] bg-[#FFFFFF] shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#D5DEE7] pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0E88D3]">
                SYNTHESIZED 5-FACTOR RELIABILITY RISK BREAKDOWN
              </span>
              <span className="text-xs font-bold text-[#17212B]">
                Total Risk Score: <span className={targetPart.risk_score >= 80 ? 'text-[#D9363E]' : targetPart.risk_score >= 50 ? 'text-[#C58A00]' : 'text-[#168A5B]'}>{targetPart.risk_score}/100</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E7EEF5]">
                <div className="text-[10px] text-[#718292] uppercase">Datasheet Risk (30%)</div>
                <div className="text-base font-bold text-[#17212B] mt-0.5">{targetPart.datasheet_risk ?? 0}/100</div>
                <div className="text-[10px] text-[#0E88D3] font-semibold mt-0.5">+{targetPart.datasheet_contrib ?? 0} pts</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E7EEF5]">
                <div className="text-[10px] text-[#718292] uppercase">Lot Anomaly (30%)</div>
                <div className="text-base font-bold text-[#17212B] mt-0.5">{targetPart.lot_anomaly_risk ?? 0}/100</div>
                <div className="text-[10px] text-[#0E88D3] font-semibold mt-0.5">+{targetPart.lot_anomaly_contrib ?? 0} pts</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E7EEF5]">
                <div className="text-[10px] text-[#718292] uppercase">Drift Risk (20%)</div>
                <div className="text-base font-bold text-[#17212B] mt-0.5">{targetPart.drift_risk ?? 0}/100</div>
                <div className="text-[10px] text-[#0E88D3] font-semibold mt-0.5">+{targetPart.drift_contrib ?? 0} pts</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E7EEF5]">
                <div className="text-[10px] text-[#718292] uppercase">Prediction Risk (15%)</div>
                <div className="text-base font-bold text-[#17212B] mt-0.5">{targetPart.prediction_risk ?? 0}/100</div>
                <div className="text-[10px] text-[#0E88D3] font-semibold mt-0.5">+{targetPart.prediction_contrib ?? 0} pts</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E7EEF5]">
                <div className="text-[10px] text-[#718292] uppercase">Data Quality (5%)</div>
                <div className="text-base font-bold text-[#17212B] mt-0.5">{targetPart.data_quality_risk ?? 0}/100</div>
                <div className="text-[10px] text-[#0E88D3] font-semibold mt-0.5">+{targetPart.data_quality_contrib ?? 0} pts</div>
              </div>
            </div>
          </div>

          {/* Explainable Decision Points Card */}
          <div className="p-4 rounded-xl border border-[#D5DEE7] bg-[#FFFFFF] shadow-sm flex flex-col gap-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-[#0E88D3] border-b border-[#D5DEE7] pb-2">
              EXPLAINABLE AI SCREENING EVIDENCE &amp; RATIONALE
            </div>
            <ul className="flex flex-col gap-1.5 text-xs text-[#17212B] list-disc list-inside">
              {targetPart.explanation_points && targetPart.explanation_points.length > 0 ? (
                targetPart.explanation_points.map((pt, idx) => (
                  <li key={idx} className="leading-relaxed text-[#4F6170]">
                    <span className="text-[#17212B]">{pt}</span>
                  </li>
                ))
              ) : (
                <li className="text-[#5B6B7A]">{targetPart.reason || 'Component measurements conform to standard qualification limits.'}</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
