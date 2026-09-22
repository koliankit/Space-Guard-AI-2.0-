import { useState, useMemo } from 'react'
import type { ComponentOut, MissionStatus } from '../../types'
import { sounds } from '../../utils/soundEffects'

interface AIAnalysisViewProps {
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  onSelectSubsystem?: (subKey: string) => void
  onNavigateToTab?: (tab: string) => void
  mission?: MissionStatus | null
}

export default function AIAnalysisView({
  components,
  selected,
  onSelectComponent,
  onSelectSubsystem,
  onNavigateToTab,
  mission,
}: AIAnalysisViewProps) {
  const [activeModule, setActiveModule] = useState<'both' | 'module_a' | 'module_b'>('both')
  const [selectedCompId, setSelectedCompId] = useState<string>(selected?.component_id || 'C-1045')

  // Sample catalog of representative components for interactive deep dive
  const sampleParts = useMemo(() => {
    return [
      {
        id: 'C-1045',
        type: 'MOSFET Driver Switch',
        sub: 'PWR',
        subName: 'Power System',
        status: 'reject' as const,
        v0: 10.4,
        v24: 14.8,
        v96: 26.2,
        v168: 42.1,
        vFuture: 54.2,
        limit: 50.0,
        lotAvg: 10.2,
        lotStd: 1.8,
        driftRate: '+0.21 µA/h',
        zScore: 4.12,
        confidence: 94.8,
        breachHr: 'T+198 hrs',
        reason: 'Within Limit ≠ Healthy — Anomaly Detected: Component exhibits 4.12x lot median quiescent leakage despite operating below 50 µA manufacturer ceiling.',
      },
      {
        id: 'C-0872',
        type: 'Radiation-Hardened SRAM',
        sub: 'FC',
        subName: 'Flight Computer',
        status: 'monitor' as const,
        v0: 12.1,
        v24: 15.6,
        v96: 21.4,
        v168: 28.5,
        vFuture: 34.0,
        limit: 45.0,
        lotAvg: 11.8,
        lotStd: 1.4,
        driftRate: '+0.11 µA/h',
        zScore: 2.85,
        confidence: 91.2,
        breachHr: 'T+340 hrs (Est)',
        reason: 'Accelerating early drift profile detected at 24h & 96h burn-in checkpoints. Exceeds standard Arrhenius lot dispersion envelope.',
      },
      {
        id: 'C-0561',
        type: 'RF Low-Noise Amplifier',
        sub: 'COM',
        subName: 'Communications',
        status: 'safe' as const,
        v0: 9.8,
        v24: 10.0,
        v96: 10.1,
        v168: 10.3,
        vFuture: 10.6,
        limit: 30.0,
        lotAvg: 10.0,
        lotStd: 0.9,
        driftRate: '+0.003 µA/h',
        zScore: 0.22,
        confidence: 98.4,
        breachHr: 'None (> 50,000 hrs)',
        reason: 'Perfect stability across 168h qualification burn-in. Values strictly clustered within ±0.3σ of qualification wafer lot median.',
      },
      {
        id: 'C-0327',
        type: 'Precision Op-Amp Ref',
        sub: 'THM',
        subName: 'Thermal Control',
        status: 'monitor' as const,
        v0: 14.2,
        v24: 18.0,
        v96: 24.5,
        v168: 31.8,
        vFuture: 39.5,
        limit: 40.0,
        lotAvg: 13.5,
        lotStd: 1.2,
        driftRate: '+0.12 µA/h',
        zScore: 2.45,
        confidence: 92.5,
        breachHr: 'T+280 hrs',
        reason: 'Monotonic upward thermal drift observed. Near upper qualification band at 168h milestone.',
      },
    ]
  }, [])

  const currentPart = useMemo(() => {
    const found = sampleParts.find((p) => p.id === selectedCompId)
    if (found) return found
    const fromProps = components.find((c) => c.component_id === selectedCompId)
    if (fromProps) {
      return {
        id: fromProps.component_id,
        type: ((fromProps as any).part_type || fromProps.component_type || 'Aerospace Component'),
        sub: fromProps.subsystem || 'SYS',
        subName: fromProps.subsystem_name || 'Subsystem',
        status: fromProps.status,
        v0: fromProps.v0,
        v24: fromProps.v24,
        v96: fromProps.v96 || fromProps.v24 * 1.3,
        v168: fromProps.v168,
        vFuture: fromProps.predicted_future || fromProps.v168 * 1.25,
        limit: fromProps.limit_ua || 50.0,
        lotAvg: fromProps.lot_mean || 10.2,
        lotStd: 1.5,
        driftRate: `${fromProps.slope >= 0 ? '+' : ''}${fromProps.slope.toFixed(3)} µA/h`,
        zScore: Math.abs(fromProps.z168 || 3.8),
        confidence: 93.5,
        breachHr: fromProps.status === 'reject' ? 'T+198 hrs' : 'T+380 hrs',
        reason: fromProps.reason || 'Telemetry parametric anomaly flagged by dual-module intelligence engine.',
      }
    }
    return sampleParts[0]
  }, [selectedCompId, sampleParts, components])

  const handleSelect = (id: string) => {
    sounds.playClick()
    setSelectedCompId(id)
    onSelectComponent(id)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 p-3 md:p-5 gap-4 font-sans text-xs select-none w-full">
      {/* =========================================================================
          TOP BANNER: ENGINE TITLE & WORKFLOW BREADCRUMB
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#2563EB] text-[#F1F5F9] font-mono font-bold text-[11px] uppercase tracking-wider">
              DUAL-MODULE AI
            </span>
            <span className="text-xs font-mono text-[#A8B6C5] font-semibold">
              ADVANCED RELIABILITY &amp; BURN-IN SCREENING
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-mono font-black text-[#F1F5F9] tracking-wide mt-1">
            AI Screening Analysis Engine
          </h1>
          <p className="text-xs text-[#A8B6C5] mt-0.5">
            Module A detects lot-relative latent flaws while Module B predicts temporal degradation curves before spacecraft integration.
          </p>
        </div>

        {/* View Switcher & Component Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Part Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#1B3445] border border-[#2D4963] rounded-lg px-2.5 py-1">
            <span className="text-[11px] text-[#718398] font-mono">TARGET:</span>
            <select
              value={selectedCompId}
              onChange={(e) => handleSelect(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-[#F1F5F9] focus:outline-none cursor-pointer"
            >
              {sampleParts.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#162B40] text-[#F1F5F9]">
                  {p.id} ({p.sub} - {p.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Module Mode Pills */}
          <div className="flex items-center bg-[#1B3445] border border-[#2D4963] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setActiveModule('both')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                activeModule === 'both'
                  ? 'bg-[#2563EB] text-[#F1F5F9] shadow-sm'
                  : 'text-[#A8B6C5] hover:text-[#F1F5F9]'
              }`}
            >
              Dual View
            </button>
            <button
              type="button"
              onClick={() => setActiveModule('module_a')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                activeModule === 'module_a'
                  ? 'bg-[#2563EB] text-[#F1F5F9] shadow-sm'
                  : 'text-[#A8B6C5] hover:text-[#F1F5F9]'
              }`}
            >
              Module A
            </button>
            <button
              type="button"
              onClick={() => setActiveModule('module_b')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                activeModule === 'module_b'
                  ? 'bg-[#2563EB] text-[#F1F5F9] shadow-sm'
                  : 'text-[#A8B6C5] hover:text-[#F1F5F9]'
              }`}
            >
              Module B
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRIMARY BANNER: “Within Limit ≠ Always Healthy”
          ========================================================================= */}
      <div className="p-3.5 md:p-4 rounded-xl bg-[#162B40] border-l-4 border-l-[#F59E0B] border border-[#2D4963] shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/40 flex items-center justify-center text-[#F59E0B] font-bold text-base shrink-0">
            ⚠️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs uppercase tracking-wider text-[#F59E0B]">
                CORE RELIABILITY PRINCIPLE
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#1B3445] text-[#F1F5F9] font-mono border border-[#2D4963]">
                MIL-STD-883 HTOL
              </span>
            </div>
            <div className="text-sm font-bold text-[#F1F5F9] mt-0.5">
              “Within Limit ≠ Always Healthy” &mdash; Aerospace Latent Flaw Interception
            </div>
            <p className="text-xs text-[#A8B6C5] mt-0.5 max-w-4xl">
              Traditional aerospace test benches use static datasheet ceilings (e.g. 50.0 µA). A part leaking 42.1 µA against a lot average of 10.2 µA passes static gates, yet carries 4.12σ latent semiconductor defects that fail during orbital insertion.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] font-mono text-[#718398]">DECISION SUPPORT STATUS</div>
            <div className="text-xs font-mono font-bold text-[#EF4444] flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
              ENGINEER REVIEW REQUIRED
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODULES CONTAINER (SIDE BY SIDE OR FILTERED)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 items-stretch">
        {/* =====================================================================
            MODULE A: Dynamic Lot-Relative Anomaly Detection
            ===================================================================== */}
        {(activeModule === 'both' || activeModule === 'module_a') && (
          <div className="p-4 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between border-b border-[#2D4963] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                <div>
                  <div className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
                    MODULE A: DYNAMIC LOT-RELATIVE ANOMALY DETECTION
                  </div>
                  <div className="text-[11px] text-[#A8B6C5]">
                    Unsupervised Mahalanobis &amp; Isolation Forest vs Wafer Lot Baseline
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#1B3445] text-[#22D3EE] border border-[#2D4963]">
                Z-Score: +{currentPart.zScore.toFixed(2)}σ
              </span>
            </div>

            {/* Three-Way Comparison Numbers (Component vs Lot vs Datasheet Limit) */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Box 1: Component Value */}
              <div className="p-3 rounded-lg bg-[#1B3445] border border-[#2D4963] flex flex-col justify-between">
                <div className="text-[10px] font-mono text-[#718398] uppercase">COMPONENT VALUE (168h)</div>
                <div className="text-xl md:text-2xl font-mono font-bold text-[#EF4444] mt-1">
                  {currentPart.v168.toFixed(1)} <span className="text-xs text-[#A8B6C5]">µA</span>
                </div>
                <div className="text-[10px] text-[#EF4444] font-semibold mt-1">
                  {currentPart.status === 'reject' ? 'Severe Outlier' : 'Monitored Level'}
                </div>
              </div>

              {/* Box 2: Lot Average */}
              <div className="p-3 rounded-lg bg-[#1B3445] border border-[#2D4963] flex flex-col justify-between">
                <div className="text-[10px] font-mono text-[#718398] uppercase">LOT AVERAGE (BASELINE)</div>
                <div className="text-xl md:text-2xl font-mono font-bold text-[#10B981] mt-1">
                  {currentPart.lotAvg.toFixed(1)} <span className="text-xs text-[#A8B6C5]">µA</span>
                </div>
                <div className="text-[10px] text-[#10B981] font-semibold mt-1">
                  Normal Wafer Median
                </div>
              </div>

              {/* Box 3: Datasheet Limit */}
              <div className="p-3 rounded-lg bg-[#1B3445] border border-[#2D4963] flex flex-col justify-between">
                <div className="text-[10px] font-mono text-[#718398] uppercase">DATASHEET CEILING</div>
                <div className="text-xl md:text-2xl font-mono font-bold text-[#F1F5F9] mt-1">
                  {currentPart.limit.toFixed(1)} <span className="text-xs text-[#A8B6C5]">µA</span>
                </div>
                <div className="text-[10px] text-[#A8B6C5] font-semibold mt-1">
                  Static MIL-STD Spec
                </div>
              </div>
            </div>

            {/* Visual Comparative Ratio Bar */}
            <div className="p-3.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex flex-col gap-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#A8B6C5]">Lot-Relative Leakage Deviation:</span>
                <span className="text-[#EF4444] font-bold">
                  {(currentPart.v168 / currentPart.lotAvg).toFixed(2)}x Lot Median
                </span>
              </div>

              {/* Multi-layered progress indicator */}
              <div className="relative w-full h-5 bg-[#102337] rounded-md overflow-hidden border border-[#2D4963]">
                {/* Lot Normal Band */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-[#10B981]/40 border-r border-[#10B981]"
                  style={{ width: `${(currentPart.lotAvg / currentPart.limit) * 100}%` }}
                  title="Normal Lot Median Band"
                />

                {/* Component Value Marker */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-[#EF4444]/70 border-r-2 border-[#EF4444] transition-all duration-500"
                  style={{ width: `${Math.min(100, (currentPart.v168 / currentPart.limit) * 100)}%` }}
                  title={`Component Value: ${currentPart.v168} µA`}
                />

                {/* Datasheet Limit Reference Line (100%) */}
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#F1F5F9]" title="Datasheet Limit 50 µA" />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-[#718398] mt-0.5">
                <span>0 µA (Ideal)</span>
                <span className="text-[#10B981]">Lot Avg: {currentPart.lotAvg} µA</span>
                <span className="text-[#EF4444]">Target: {currentPart.v168} µA</span>
                <span className="text-[#F1F5F9]">Spec Limit: {currentPart.limit} µA</span>
              </div>
            </div>

            {/* Explanatory AI Callout */}
            <div className="p-3 rounded-lg bg-[#102337] border border-[#2D4963] text-xs text-[#A8B6C5] flex flex-col gap-1.5">
              <div className="font-mono font-bold text-[#F1F5F9] flex items-center gap-1.5">
                <span className="text-[#22D3EE]">✦</span> Isolation Forest Reasoning &amp; Anomaly Explanation:
              </div>
              <p className="leading-relaxed">
                {currentPart.reason}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[#2D4963] text-[11px] font-mono">
                <span className="text-[#718398]">Z-Score: <b className="text-[#F1F5F9]">+{currentPart.zScore.toFixed(2)}σ</b></span>
                <span className="text-[#718398]">Lot Dispersion: <b className="text-[#F1F5F9]">±{currentPart.lotStd} µA</b></span>
                <span className="text-[#718398]">Defect Subspace: <b className="text-[#F59E0B]">Gate Oxide Thinning</b></span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-[#718398]">
                Module A Decision: <b className="text-[#EF4444]">REJECT &bull; LATENT ANOMALY</b>
              </span>
              <button
                type="button"
                onClick={() => onNavigateToTab?.('risk_engine')}
                className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[#F1F5F9] font-mono font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                Send to Risk Engine &rarr;
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE B: Early Drift Prediction (Time-Series Extrapolation)
            ===================================================================== */}
        {(activeModule === 'both' || activeModule === 'module_b') && (
          <div className="p-4 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between border-b border-[#2D4963] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" />
                <div>
                  <div className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
                    MODULE B: EARLY DRIFT PREDICTION &amp; EXTRAPOLATION
                  </div>
                  <div className="text-[11px] text-[#A8B6C5]">
                    Physics-Informed Arrhenius Degradation Curve (0h &rarr; 24h &rarr; 96h &rarr; 168h)
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#1B3445] text-[#14B8A6] border border-[#2D4963]">
                Confidence: {currentPart.confidence}%
              </span>
            </div>

            {/* Time-Series Trajectory Interactive SVG Chart */}
            <div className="p-3.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#A8B6C5]">Time-Series Degradation Curve (µA vs Hours):</span>
                <span className="text-[#F59E0B] font-bold">Drift Rate: {currentPart.driftRate}</span>
              </div>

              {/* Chart Canvas */}
              <div className="h-44 w-full relative">
                <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
                  {/* Grid Lines */}
                  <line x1="50" y1="20" x2="480" y2="20" stroke="#2D4963" strokeDasharray="3,3" strokeWidth="0.8" />
                  <line x1="50" y1="60" x2="480" y2="60" stroke="#2D4963" strokeDasharray="3,3" strokeWidth="0.8" />
                  <line x1="50" y1="100" x2="480" y2="100" stroke="#2D4963" strokeDasharray="3,3" strokeWidth="0.8" />
                  <line x1="50" y1="140" x2="480" y2="140" stroke="#2D4963" strokeWidth="1" />

                  {/* Y-Axis Labels */}
                  <text x="42" y="24" textAnchor="end" fill="#718398" fontSize="9" fontFamily="monospace">50 µA</text>
                  <text x="42" y="64" textAnchor="end" fill="#718398" fontSize="9" fontFamily="monospace">35 µA</text>
                  <text x="42" y="104" textAnchor="end" fill="#718398" fontSize="9" fontFamily="monospace">20 µA</text>
                  <text x="42" y="143" textAnchor="end" fill="#718398" fontSize="9" fontFamily="monospace">0 µA</text>

                  {/* X-Axis Labels */}
                  <text x="70" y="155" textAnchor="middle" fill="#718398" fontSize="9" fontFamily="monospace">0h</text>
                  <text x="180" y="155" textAnchor="middle" fill="#718398" fontSize="9" fontFamily="monospace">24h</text>
                  <text x="290" y="155" textAnchor="middle" fill="#718398" fontSize="9" fontFamily="monospace">96h</text>
                  <text x="400" y="155" textAnchor="middle" fill="#718398" fontSize="9" fontFamily="monospace">168h</text>
                  <text x="465" y="155" textAnchor="middle" fill="#718398" fontSize="9" fontFamily="monospace">+Future</text>

                  {/* Red Datasheet Ceiling Line (50 µA at y=20) */}
                  <line x1="50" y1="20" x2="480" y2="20" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="4,2" />
                  <text x="475" y="15" textAnchor="end" fill="#EF4444" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    SPEC CEILING (50 µA)
                  </text>

                  {/* Normal Lot Baseline Path (Green) */}
                  {/* Values: 0h=10.0, 24h=10.2, 96h=10.4, 168h=10.6 -> approx y=115 */}
                  <polyline
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2"
                    points="70,116 180,115 290,114 400,113 465,112"
                  />
                  <circle cx="70" cy="116" r="3" fill="#10B981" />
                  <circle cx="180" cy="115" r="3" fill="#10B981" />
                  <circle cx="290" cy="114" r="3" fill="#10B981" />
                  <circle cx="400" cy="113" r="3" fill="#10B981" />

                  {/* Anomalous Degrading Curve (Red/Amber) */}
                  {/* Coords based on:
                      v0: 10.4 -> y=115
                      v24: 14.8 -> y=104
                      v96: 26.2 -> y=77
                      v168: 42.1 -> y=39
                      vFuture: 54.2 -> y=10 (breaches ceiling!)
                  */}
                  {/* Actual Measured Segment (Solid Amber/Red) */}
                  <polyline
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2.5"
                    points="70,115 180,104 290,77 400,39"
                  />
                  {/* Predicted Future Extrapolation (Dashed Red Line breaching ceiling) */}
                  <line
                    x1="400"
                    y1="39"
                    x2="465"
                    y2="10"
                    stroke="#EF4444"
                    strokeWidth="2.5"
                    strokeDasharray="4,4"
                  />

                  {/* Data Points */}
                  <circle cx="70" cy="115" r="3.5" fill="#EF4444" stroke="#162B40" strokeWidth="1.5" />
                  <circle cx="180" cy="104" r="3.5" fill="#EF4444" stroke="#162B40" strokeWidth="1.5" />
                  <circle cx="290" cy="77" r="4" fill="#EF4444" stroke="#162B40" strokeWidth="1.5" />
                  <circle cx="400" cy="39" r="4.5" fill="#EF4444" stroke="#F1F5F9" strokeWidth="1.5" />
                  <circle cx="465" cy="10" r="4" fill="#F59E0B" stroke="#162B40" strokeWidth="1.5" />

                  {/* Callout on projected breach */}
                  <text x="460" y="8" textAnchor="end" fill="#F59E0B" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    BREACH: {currentPart.breachHr}
                  </text>
                </svg>
              </div>

              {/* Chart Legend */}
              <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-[#A8B6C5] pt-1 border-t border-[#2D4963]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-1 bg-[#10B981] rounded-xs inline-block" />
                  <span>Normal Lot Trajectory</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-1 bg-[#EF4444] rounded-xs inline-block" />
                  <span>Component Burn-In Measurements</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-0.5 border-b border-dashed border-[#EF4444] inline-block" />
                  <span className="text-[#F59E0B]">AI Extrapolated Future Drift</span>
                </div>
              </div>
            </div>

            {/* Checkpoint Value Cards */}
            <div className="grid grid-cols-4 gap-2 text-center font-mono">
              <div className="p-2 rounded bg-[#102337] border border-[#2D4963]">
                <div className="text-[10px] text-[#718398]">0h BASE</div>
                <div className="text-xs font-bold text-[#F1F5F9] mt-0.5">{currentPart.v0.toFixed(1)} µA</div>
              </div>
              <div className="p-2 rounded bg-[#102337] border border-[#2D4963]">
                <div className="text-[10px] text-[#718398]">24h EARLY</div>
                <div className="text-xs font-bold text-[#F1F5F9] mt-0.5">{currentPart.v24.toFixed(1)} µA</div>
              </div>
              <div className="p-2 rounded bg-[#102337] border border-[#2D4963]">
                <div className="text-[10px] text-[#718398]">96h MID</div>
                <div className="text-xs font-bold text-[#F59E0B] mt-0.5">{currentPart.v96.toFixed(1)} µA</div>
              </div>
              <div className="p-2 rounded bg-[#102337] border border-[#2D4963]">
                <div className="text-[10px] text-[#718398]">168h MILESTONE</div>
                <div className="text-xs font-bold text-[#EF4444] mt-0.5">{currentPart.v168.toFixed(1)} µA</div>
              </div>
            </div>

            {/* Explanatory AI Callout */}
            <div className="p-3 rounded-lg bg-[#102337] border border-[#2D4963] text-xs text-[#A8B6C5] flex flex-col gap-1">
              <div className="font-mono font-bold text-[#F1F5F9] flex items-center gap-1.5">
                <span className="text-[#14B8A6]">✦</span> Physics-Informed Drift Assessment:
              </div>
              <p className="leading-relaxed">
                Degradation curve displays parabolic Arrhenius acceleration. While still below 50.0 µA at 168h ({currentPart.v168.toFixed(1)} µA), trajectory projects specification breach at {currentPart.breachHr}.
              </p>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-[#718398]">
                Module B Decision: <b className="text-[#EF4444]">PROJECTED LIMIT BREACH</b>
              </span>
              <button
                type="button"
                onClick={() => onNavigateToTab?.('satellite')}
                className="px-3 py-1.5 rounded-lg bg-[#1B3445] hover:bg-[#203C55] text-[#22D3EE] border border-[#2D4963] font-mono font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                Localize in 3D Spacecraft &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
