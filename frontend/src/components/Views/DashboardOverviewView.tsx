import { useState, useMemo } from 'react'
import type { ComponentOut, MissionStatus, SubsystemStatus } from '../../types'
import SatelliteScene from '../Satellite/SatelliteScene'
import { sounds } from '../../utils/soundEffects'

interface DashboardOverviewViewProps {
  mission: MissionStatus | null
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  onSelectSubsystem: (subKey: string) => void
  focusKey: string | null
  onNavigateToTab: (tab: string) => void
}

export default function DashboardOverviewView({
  mission,
  components,
  selected,
  onSelectComponent,
  onSelectSubsystem,
  focusKey,
  onNavigateToTab,
}: DashboardOverviewViewProps) {
  // Parameter selector for Burn-In Trends
  const [selectedParameter, setSelectedParameter] = useState('Leakage Current (µA)')
  const [activeHour, setActiveHour] = useState<'0h' | '24h' | '96h' | '168h'>('168h')
  const [hoveredPoint, setHoveredPoint] = useState<{
    hour: string
    label: string
    normalLotAvg: number
    normalComp: number
    anomalousComp: number
    specLimit: number
  } | null>(null)

  // Use dynamic or fallback realistic demo data specified in requirements
  const safeCount = mission?.safe ?? 842
  const monitorCount = mission?.monitor ?? 298
  const rejectCount = mission?.reject ?? 92
  const totalCount = components.length > 0 ? components.length : 1232

  const safePct = ((safeCount / totalCount) * 100).toFixed(1)
  const monitorPct = ((monitorCount / totalCount) * 100).toFixed(1)
  const rejectPct = ((rejectCount / totalCount) * 100).toFixed(1)

  // Selected component for 3D localization preview
  const activeComponent = useMemo(() => {
    if (selected) return selected
    const rej = components.find((c) => c.status === 'reject')
    if (rej) return rej
    return {
      component_id: 'C-1045',
      subsystem: 'PWR',
      subsystem_name: 'Power System',
      part_type: 'MOSFET Driver Switch',
      status: 'reject' as const,
      risk_score: 87,
      v0: 10.4,
      v24: 14.8,
      v168: 42.1,
      limit_ua: 50.0,
      predicted_future: 54.2,
      parameter: 'Leakage Current (µA)',
      lot_id: 'LOT-2024-Q3-04',
      lot_mean: 10.2,
      lot_std: 1.8,
      traditional_decision: 'PASS',
      z168: 3.82,
      pct_drift: 18.4,
    } as unknown as ComponentOut
  }, [selected, components])

  // Realistic Burn-In Parameter Trends Time-Series Data
  const trendData = [
    { hour: '0h', label: '0h Baseline', normalLotAvg: 10.0, normalComp: 9.8, anomalousComp: 10.4, specLimit: 50.0 },
    { hour: '24h', label: '24h Burn-In', normalLotAvg: 10.2, normalComp: 10.1, anomalousComp: 14.8, specLimit: 50.0 },
    { hour: '96h', label: '96h Mid-Point', normalLotAvg: 10.4, normalComp: 10.3, anomalousComp: 26.2, specLimit: 50.0 },
    { hour: '168h', label: '168h Milestone', normalLotAvg: 10.6, normalComp: 10.5, anomalousComp: 42.1, specLimit: 50.0 },
  ]

  // Recent Alerts Data
  const recentAlerts = [
    { id: 'C-1045', param: 'Leakage Current', behaviour: 'Drift Detected', status: 'reject', time: '2h ago', risk: 87, sub: 'PWR' },
    { id: 'C-0872', param: 'Vcc Voltage', behaviour: 'Lot Deviation', status: 'monitor', time: '4h ago', risk: 54, sub: 'FC' },
    { id: 'C-0561', param: 'Current Consumption', behaviour: 'Normal', status: 'safe', time: '5h ago', risk: 12, sub: 'COM' },
    { id: 'C-0327', param: 'Temperature', behaviour: 'Rising Trend', status: 'monitor', time: '6h ago', risk: 48, sub: 'THM' },
    { id: 'C-1188', param: 'Oscillator Frequency', behaviour: 'Gate Leakage', status: 'reject', time: '8h ago', risk: 91, sub: 'TEL' },
  ]

  const subsystems: SubsystemStatus[] = mission?.subsystems ?? [
    { key: 'PWR', name: 'Power Module', position: [0.55, 0.42, 0.62], count: 48, status: 'reject', avg_risk: 87, top_component: 'C-1045' },
    { key: 'FC', name: 'Flight Computer', position: [0.55, 0.55, -0.20], count: 52, status: 'monitor', avg_risk: 54, top_component: 'C-0872' },
    { key: 'COM', name: 'Communication Module', position: [-0.20, 0.62, 0.55], count: 36, status: 'safe', avg_risk: 12, top_component: 'C-0561' },
    { key: 'THM', name: 'Thermal Control', position: [0.0, 0.0, -0.85], count: 24, status: 'monitor', avg_risk: 48, top_component: 'C-0327' },
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0 p-3 md:p-5 gap-4 font-sans text-xs select-none w-full">
      {/* =========================================================================
          SECTION 1: TOP KPI CARDS (SAFE, MONITOR, REJECT, TOTAL COMPONENTS)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: SAFE */}
        <div className="bg-[#1B3445] border border-[#2D4963] hover:border-[#10B981]/50 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#10B981]/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-[#A8B6C5] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
              SAFE
            </span>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
              {safePct}%
            </span>
          </div>
          <div className="mt-2.5">
            <div className="font-mono text-3xl font-black text-[#F1F5F9] tracking-tight">
              {safeCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#A8B6C5] mt-1 flex items-center gap-1">
              <span>✓ Verified Lot Relative Variance</span>
            </div>
          </div>
          <div className="w-full bg-[#162B40] h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#10B981] h-full rounded-full transition-all duration-500" style={{ width: `${safePct}%` }} />
          </div>
        </div>

        {/* KPI 2: MONITOR */}
        <div className="bg-[#1B3445] border border-[#2D4963] hover:border-[#F59E0B]/50 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#F59E0B]/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-[#A8B6C5] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]" />
              MONITOR
            </span>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
              {monitorPct}%
            </span>
          </div>
          <div className="mt-2.5">
            <div className="font-mono text-3xl font-black text-[#F1F5F9] tracking-tight">
              {monitorCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#A8B6C5] mt-1 flex items-center gap-1">
              <span>⚠ Burn-in Acceleration Trend</span>
            </div>
          </div>
          <div className="w-full bg-[#162B40] h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#F59E0B] h-full rounded-full transition-all duration-500" style={{ width: `${monitorPct}%` }} />
          </div>
        </div>

        {/* KPI 3: REJECT */}
        <div className="bg-[#1B3445] border border-[#2D4963] hover:border-[#EF4444]/50 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#EF4444]/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-[#A8B6C5] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_6px_#EF4444] animate-pulse" />
              REJECT
            </span>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
              {rejectPct}%
            </span>
          </div>
          <div className="mt-2.5">
            <div className="font-mono text-3xl font-black text-[#EF4444] tracking-tight">
              {rejectCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#A8B6C5] mt-1 flex items-center gap-1">
              <span>✖ Latent Escape Prevention</span>
            </div>
          </div>
          <div className="w-full bg-[#162B40] h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#EF4444] h-full rounded-full transition-all duration-500" style={{ width: `${rejectPct}%` }} />
          </div>
        </div>

        {/* KPI 4: TOTAL COMPONENTS */}
        <div className="bg-[#1B3445] border border-[#2D4963] hover:border-[#2563EB]/50 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#2563EB]/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-[#A8B6C5] uppercase tracking-wider flex items-center gap-1.5">
              <span>📦</span>
              TOTAL COMPONENTS
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2563EB]/15 text-[#22D3EE] border border-[#2563EB]/40 font-semibold">
              100% AUDITED
            </span>
          </div>
          <div className="mt-2.5">
            <div className="font-mono text-3xl font-black text-[#F1F5F9] tracking-tight">
              {totalCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#A8B6C5] mt-1 flex items-center gap-1">
              <span>MIL-STD-883 Method 1005</span>
            </div>
          </div>
          <div className="w-full bg-[#162B40] h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#2563EB] h-full rounded-full" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: ROW 1 - BURN-IN PARAMETER TRENDS & RISK DISTRIBUTION DONUT
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Card (2 Columns): Burn-In Parameter Trends */}
        <div className="lg:col-span-2 bg-[#1B3445] border border-[#2D4963] rounded-xl p-4 md:p-5 flex flex-col justify-between shadow-xs">
          {/* Header & Controls */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2D4963]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                  <h3 className="m-0 font-bold text-sm tracking-wide uppercase text-[#F1F5F9]">
                    Burn-In Parameter Trends
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#162B40] text-[#22D3EE] border border-[#2D4963]">
                    HTOL 168H ACCELERATION
                  </span>
                </div>
                <p className="text-[11px] text-[#A8B6C5] mt-0.5">
                  Multi-epoch telemetry tracking &bull; Normal lot dispersion vs. anomalous drift trajectory
                </p>
              </div>

              {/* Parameter Selector & Time Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Parameter Dropdown */}
                <select
                  value={selectedParameter}
                  onChange={(e) => setSelectedParameter(e.target.value)}
                  className="bg-[#162B40] text-[#F1F5F9] border border-[#2D4963] rounded-lg px-2.5 py-1 text-xs font-mono outline-hidden cursor-pointer"
                >
                  <option value="Leakage Current (µA)">Leakage Current (µA)</option>
                  <option value="Vcc Supply (V)">Vcc Voltage (V)</option>
                  <option value="Quiescent Current (mA)">Quiescent Current (mA)</option>
                  <option value="Switch Resistance (mΩ)">Switch Resistance (mΩ)</option>
                </select>

                {/* Time Controls: 0h, 24h, 96h, 168h */}
                <div className="flex items-center bg-[#102337] border border-[#2D4963] rounded-lg p-0.5">
                  {(['0h', '24h', '96h', '168h'] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        sounds.playClick()
                        setActiveHour(h)
                      }}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        activeHour === h
                          ? 'bg-[#2563EB] text-white shadow-xs'
                          : 'text-[#A8B6C5] hover:text-[#F1F5F9]'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Core Principle Callout Banner */}
            <div className="mt-3 px-3.5 py-2 rounded-lg bg-[#162B40] border border-[#2D4963] flex items-center justify-between text-xs">
              <span className="text-[#A8B6C5] flex items-center gap-2">
                <span className="text-[#F59E0B]">⚡</span>
                <span className="text-[#F1F5F9] font-semibold">Principle:</span>
                <span>A component may remain within datasheet limits (50 µA) while behaving abnormally relative to its own lot.</span>
              </span>
              <span className="font-mono text-[10px] text-[#22D3EE] font-bold uppercase hidden md:inline">
                LOT COMPARISON ACTIVE
              </span>
            </div>

            {/* Interactive SVG Chart Canvas */}
            <div className="relative mt-4 h-64 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 220">
                <defs>
                  <linearGradient id="anomalousGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Reticle Grid Lines */}
                <line x1="40" y1="20" x2="570" y2="20" stroke="#2D4963" strokeDasharray="3 3" opacity="0.6" />
                <text x="35" y="24" fill="#718398" fontSize="9" textAnchor="end" fontFamily="monospace">50 µA (LIMIT)</text>

                <line x1="40" y1="70" x2="570" y2="70" stroke="#2D4963" strokeDasharray="3 3" opacity="0.4" />
                <text x="35" y="74" fill="#718398" fontSize="9" textAnchor="end" fontFamily="monospace">35 µA</text>

                <line x1="40" y1="120" x2="570" y2="120" stroke="#2D4963" strokeDasharray="3 3" opacity="0.4" />
                <text x="35" y="124" fill="#718398" fontSize="9" textAnchor="end" fontFamily="monospace">20 µA</text>

                <line x1="40" y1="170" x2="570" y2="170" stroke="#2D4963" opacity="0.6" />
                <text x="35" y="174" fill="#718398" fontSize="9" textAnchor="end" fontFamily="monospace">10 µA (LOT)</text>

                {/* X Axis Time Marks */}
                <text x="70" y="195" fill="#A8B6C5" fontSize="10" textAnchor="middle" fontFamily="monospace">0h</text>
                <text x="230" y="195" fill="#A8B6C5" fontSize="10" textAnchor="middle" fontFamily="monospace">24h</text>
                <text x="390" y="195" fill="#A8B6C5" fontSize="10" textAnchor="middle" fontFamily="monospace">96h</text>
                <text x="540" y="195" fill="#A8B6C5" fontSize="10" textAnchor="middle" fontFamily="monospace">168h</text>

                {/* 1. Datasheet Limit Reference Line (Red Dashed) */}
                <line x1="40" y1="20" x2="570" y2="20" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.75" />

                {/* 2. Normal Lot Average Line (Cyan Dashed) */}
                <polyline
                  points="70,170 230,168 390,166 540,164"
                  fill="none"
                  stroke="#22D3EE"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* 3. Normal Component Line (Teal Solid) */}
                <polyline
                  points="70,172 230,170 390,168 540,166"
                  fill="none"
                  stroke="#14B8A6"
                  strokeWidth="2.5"
                />

                {/* 4. Anomalous Component Drift Curve (Red Solid + Shaded Gradient) */}
                <polygon
                  points="70,168 230,150 390,105 540,48 540,170 70,170"
                  fill="url(#anomalousGlow)"
                />
                <polyline
                  points="70,168 230,150 390,105 540,48"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="3"
                />

                {/* Interactive Points on Anomalous Curve */}
                {[
                  { cx: 70, cy: 168, data: trendData[0] },
                  { cx: 230, cy: 150, data: trendData[1] },
                  { cx: 390, cy: 105, data: trendData[2] },
                  { cx: 540, cy: 48, data: trendData[3] },
                ].map((pt, i) => (
                  <g
                    key={i}
                    onMouseEnter={() => setHoveredPoint(pt.data)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer"
                  >
                    <circle cx={pt.cx} cy={pt.cy} r="6" fill="#EF4444" className="hover:scale-125 transition-transform" />
                    <circle cx={pt.cx} cy={pt.cy} r="3" fill="#FFFFFF" />
                  </g>
                ))}
              </svg>

              {/* Hover Tooltip Overlay */}
              {hoveredPoint && (
                <div className="absolute top-2 right-4 bg-[#102337] border border-[#2563EB] rounded-lg p-2.5 shadow-lg text-[11px] font-mono animate-fade-in z-20">
                  <div className="font-bold text-[#F1F5F9] pb-1 border-b border-[#2D4963]">
                    {hoveredPoint.label}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5">
                    <span className="text-[#EF4444]">Anomalous Part:</span>
                    <span className="font-bold text-[#EF4444] text-right">{hoveredPoint.anomalousComp.toFixed(1)} µA</span>
                    <span className="text-[#14B8A6]">Normal Part:</span>
                    <span className="font-bold text-[#14B8A6] text-right">{hoveredPoint.normalComp.toFixed(1)} µA</span>
                    <span className="text-[#22D3EE]">Lot Average:</span>
                    <span className="font-bold text-[#22D3EE] text-right">{hoveredPoint.normalLotAvg.toFixed(1)} µA</span>
                    <span className="text-[#718398]">Datasheet Limit:</span>
                    <span className="font-bold text-[#718398] text-right">{hoveredPoint.specLimit.toFixed(1)} µA</span>
                  </div>
                </div>
              )}
            </div>

            {/* Legend Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#2D4963] text-[11px] font-mono">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#22D3EE] border-b border-dashed border-[#22D3EE]" />
                  <span className="text-[#A8B6C5]">Normal Lot Average (10 µA)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#14B8A6]" />
                  <span className="text-[#A8B6C5]">Normal Component</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#EF4444] rounded" />
                  <span className="text-[#EF4444] font-bold">Anomalous Component (Drift)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab('ai_analysis')}
                className="text-[#22D3EE] hover:text-[#F1F5F9] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                Deep-Dive AI Analysis &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Right Card (1 Column): Risk Score Distribution Donut */}
        <div className="bg-[#1B3445] border border-[#2D4963] rounded-xl p-4 md:p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#2D4963]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" />
                <h3 className="m-0 font-bold text-sm tracking-wide uppercase text-[#F1F5F9]">
                  Risk Score Distribution
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#A8B6C5] px-2 py-0.5 rounded bg-[#162B40] border border-[#2D4963]">
                AI COHORT
              </span>
            </div>

            {/* SVG Donut Chart */}
            <div className="relative flex items-center justify-center py-6">
              <svg className="w-44 h-44 -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#162B40" strokeWidth="12" />

                {/* Safe Segment (68.3% -> ~163 circumference) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="12"
                  strokeDasharray="163.2 238.8"
                  strokeDashoffset="0"
                  className="transition-all duration-700"
                />

                {/* Monitor Segment (24.2% -> ~57.8 circumference) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="12"
                  strokeDasharray="57.8 238.8"
                  strokeDashoffset="-163.2"
                  className="transition-all duration-700"
                />

                {/* Reject Segment (7.5% -> ~17.9 circumference) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="12"
                  strokeDasharray="17.9 238.8"
                  strokeDashoffset="-221.0"
                  className="transition-all duration-700"
                />
              </svg>

              {/* Center Value: 7.5% High Risk */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-mono text-2xl font-black text-[#EF4444] tracking-tight">
                  7.5%
                </span>
                <span className="text-[10px] font-mono font-bold text-[#A8B6C5] uppercase">
                  High Risk
                </span>
                <span className="text-[9px] text-[#718398]">92 Escapes</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-2 pt-2 border-t border-[#2D4963]">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span className="text-[#A8B6C5]">SAFE</span>
                </div>
                <span className="font-mono font-bold text-[#F1F5F9]">68.3% (842)</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="text-[#A8B6C5]">MONITOR</span>
                </div>
                <span className="font-mono font-bold text-[#F1F5F9]">24.2% (298)</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  <span className="text-[#EF4444] font-bold">REJECT</span>
                </div>
                <span className="font-mono font-bold text-[#EF4444]">7.5% (92)</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('risk_engine')}
            className="w-full mt-3 py-2 px-3 rounded-lg bg-[#162B40] hover:bg-[#203C55] text-[#22D3EE] font-mono font-bold text-xs border border-[#2D4963] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open Risk Engine</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: ROW 2 - 3D COMPONENT LOCALIZATION & RECENT ALERTS TABLE
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Card: 3D Component Localization Panel */}
        <div className="bg-[#1B3445] border border-[#2D4963] rounded-xl p-4 md:p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#2D4963]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                <h3 className="m-0 font-bold text-sm tracking-wide uppercase text-[#F1F5F9]">
                  3D Component Localization
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#162B40] text-[#14B8A6] border border-[#2D4963]">
                CAD DIGITAL TWIN
              </span>
            </div>

            {/* Embedded 3D Viewport with Leader Line / Component HUD */}
            <div className="relative mt-3 h-72 rounded-xl border border-[#2D4963] bg-[radial-gradient(ellipse_at_center,#102337_0%,#0B1726_100%)] overflow-hidden shadow-inner flex flex-col">
              <SatelliteScene
                subsystems={subsystems}
                onSelect={onSelectSubsystem}
                focusKey={focusKey}
                selectedComponent={activeComponent}
              />

              {/* Component HUD Overlay Card (Showing Connection / Leader Data) */}
              <div className="absolute bottom-3 left-3 right-3 bg-[#102337]/90 backdrop-blur-xs border border-[#EF4444]/60 rounded-xl p-3 shadow-lg flex items-center justify-between text-xs animate-fade-in">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#EF4444] shadow-[0_0_10px_#EF4444] animate-pulse" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#F1F5F9]">
                        {activeComponent.component_id}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-[#EF4444]/20 text-[#EF4444] font-mono font-bold text-[10px] border border-[#EF4444]/40 uppercase">
                        {activeComponent.status}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-[#A8B6C5] mt-0.5">
                      Location: <b className="text-[#F1F5F9]">Power Module (PCDU)</b> &bull; Param: {activeComponent.parameter}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-[#A8B6C5] uppercase font-bold">Risk Score</div>
                  <div className="font-mono text-lg font-black text-[#EF4444]">
                    {Math.round(activeComponent.risk_score)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#2D4963] text-xs font-mono">
            <span className="text-[#A8B6C5]">
              Active Selection: <b className="text-[#22D3EE]">{activeComponent.component_id}</b> ({((activeComponent as any).part_type || activeComponent.component_type || 'MOSFET')})
            </span>
            <button
              type="button"
              onClick={() => onNavigateToTab('satellite')}
              className="text-[#2563EB] hover:text-[#22D3EE] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              Full 3D Spacecraft View &rarr;
            </button>
          </div>
        </div>

        {/* Right Card: Recent Alerts Table */}
        <div className="bg-[#1B3445] border border-[#2D4963] rounded-xl p-4 md:p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#2D4963]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <h3 className="m-0 font-bold text-sm tracking-wide uppercase text-[#F1F5F9]">
                  Recent Alerts
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#162B40] text-[#A8B6C5] border border-[#2D4963]">
                LIVE LOG
              </span>
            </div>

            {/* Table */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#2D4963] text-[10.5px] text-[#718398] uppercase">
                    <th className="pb-2">Component ID</th>
                    <th className="pb-2">Parameter</th>
                    <th className="pb-2">Behaviour</th>
                    <th className="pb-2 text-center">Status</th>
                    <th className="pb-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D4963]/60">
                  {recentAlerts.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => onSelectComponent(row.id)}
                      className="hover:bg-[#162B40] transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 font-bold text-[#F1F5F9] flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            row.status === 'reject'
                              ? 'bg-[#EF4444]'
                              : row.status === 'monitor'
                              ? 'bg-[#F59E0B]'
                              : 'bg-[#10B981]'
                          }`}
                        />
                        {row.id}
                      </td>
                      <td className="py-2.5 text-[#A8B6C5]">{row.param}</td>
                      <td className="py-2.5 text-[#E2E8F0] font-medium">{row.behaviour}</td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase border ${
                            row.status === 'reject'
                              ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                              : row.status === 'monitor'
                              ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                              : 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-[#718398]">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#2D4963] text-xs font-mono">
            <span className="text-[#718398]">Showing latest qualification anomalies</span>
            <button
              type="button"
              onClick={() => onNavigateToTab('matrix')}
              className="text-[#2563EB] hover:text-[#22D3EE] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              View Full Component Ledger &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
