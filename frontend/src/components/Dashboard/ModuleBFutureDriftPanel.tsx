import React, { useState } from 'react'
import type { ComponentOut } from '../../types'
import ModuleBFutureDriftGraph from '../Charts/ModuleBFutureDriftGraph'
import { getSubsystemLocation } from '../../utils/satelliteLocations'

interface ModuleBFutureDriftPanelProps {
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  onSelectSubsystem?: (subKey: string) => void
}

export default function ModuleBFutureDriftPanel({
  selected,
  onSelectSubsystem,
}: ModuleBFutureDriftPanelProps) {
  const [simData, setSimData] = useState<{
    progress: number
    p1: number
    p2: number
    currentH: number
    currentVal: number
    liveVelocity: number
    liveProjection: number
    liveMargin: number
    isSimulating: boolean
  } | null>(null)

  const loc = selected ? getSubsystemLocation(selected.subsystem) : null
  const limitVal = selected?.limit_ua || 50
  const slope = selected?.slope || (selected ? (selected.v168 - selected.v0) / 168 : 0)

  const isSim = simData?.isSimulating && (simData.progress ?? 1) < 1
  const liveVel = isSim ? (simData?.liveVelocity ?? slope * 1000) : slope * 1000
  const liveProj = isSim ? (simData?.liveProjection ?? selected?.predicted_future ?? 0) : selected?.predicted_future ?? 0
  const liveMarg = isSim ? (simData?.liveMargin ?? (limitVal - liveProj)) : selected?.margin_future ?? (limitVal - (selected?.predicted_future ?? 0))
  const willBreach = isSim ? liveProj >= limitVal : selected?.future_limit_breach || (selected && selected.predicted_future >= limitVal)

  const breachHour =
    slope > 0 && selected
      ? 168 + (limitVal - selected.v168) / slope
      : null

  const isAccelerating = selected?.drift_trend === 'ACCELERATING POSITIVE DRIFT'

  return (
    <div className={`flex flex-col rounded-xl bg-[#102337] border shadow-xl overflow-hidden h-full transition-colors ${
      willBreach ? 'border-[#E5484D]/60' : 'border-[#1D3A52]'
    }`}>
      {/* Module B Top Bezel Bar */}
      <div className="bg-[#0B1928] border-b border-[#1D3A52] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-md bg-[#0E88D3]/15 text-[#0E88D3] text-sm sm:text-base font-mono font-black border border-[#0E88D3]/60 shadow-isro tracking-wider uppercase whitespace-nowrap">
            MODULE B
          </span>
          <span className="text-xs sm:text-sm font-display font-bold text-[#F1F5F9] tracking-wider uppercase">
            Future Drift &amp; In-Flight Reliability Forecasting
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${willBreach ? 'bg-[#E5484D] led' : 'bg-[#0E88D3] led'}`} />
          <span className="text-[#9AAFC0] text-[11px]">
            {isSim
              ? simData?.p2 && simData.p2 > 0
                ? `IN-FLIGHT EXTRAPOLATING: +${Math.round((simData?.currentH ?? 168) - 168)}H`
                : `GROUND BASELINE SWEEP: T+${Math.round(simData?.currentH ?? 0)}H`
              : 'FLIGHT HORIZON: +96H \u2022 264H'}
          </span>
        </div>
      </div>

      {/* Module B Predictive Engine & Horizon Sub-bar */}
      <div className="p-3 bg-[#0B1928] border-b border-[#1D3A52] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[#9AAFC0] font-mono text-[11px]">PREDICTION ENGINE:</span>
          <span className="text-[#F47216] font-bold bg-[#F47216]/15 px-2 py-0.5 rounded border border-[#F47216]/30 text-[11px]">
            EMPIRICAL ARRHENIUS DEGRADATION
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-[#9AAFC0]">HORIZON:</span>
          <span className="text-[#22A06B] font-bold bg-[#22A06B]/15 px-2 py-0.5 rounded border border-[#22A06B]/30">
            264H IN-FLIGHT (+96H EXTENSION)
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-2.5 flex-1 flex flex-col gap-2.5">
        {selected ? (
          <div className={`p-2.5 rounded-lg border flex flex-col gap-2 transition-colors ${
            willBreach ? 'bg-[#24141E] border-[#E5484D]/50' : 'bg-[#142B40] border-[#1D3A52]'
          }`}>
            {/* Top Identity & Drift Classification Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base md:text-lg font-bold text-[#F1F5F9] tracking-wide">{selected.component_id}</span>
                <span className="text-[#6F8495] text-xs">&bull;</span>
                <span className="text-[#0E88D3] text-xs font-semibold">Target Subsystem:</span>
                <button
                  type="button"
                  onClick={() => onSelectSubsystem && onSelectSubsystem(selected.subsystem)}
                  className="px-2 py-0.5 rounded bg-[#102337] border border-[#1D3A52] text-[#0E88D3] text-xs font-bold hover:border-[#0E88D3] transition-colors"
                >
                  [{selected.subsystem}] {loc?.name || selected.subsystem}
                </button>
              </div>

              {/* Drift Trend Badge */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold border transition-colors ${
                    willBreach
                      ? 'bg-[#E5484D]/20 text-[#E5484D] border-[#E5484D]/50'
                      : isAccelerating
                      ? 'bg-[#F2B84B]/20 text-[#F2B84B] border-[#F2B84B]/50'
                      : 'bg-[#22A06B]/20 text-[#22A06B] border-[#22A06B]/50'
                  }`}
                >
                  {isSim ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0E88D3] led" />
                      {willBreach
                        ? 'CRITICAL LIMIT EXCEEDANCE'
                        : simData?.p2 && simData.p2 > 0
                        ? `EXTRAPOLATING (+${Math.round((simData?.currentH ?? 168) - 168)}H)`
                        : `MEASURING T+${Math.round(simData?.currentH ?? 0)}H`}
                    </span>
                  ) : (
                    selected.drift_trend || (willBreach ? 'PREDICTED EXCEEDANCE' : 'NOMINAL DRIFT')
                  )}
                </span>
                {willBreach && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#E5484D] text-[#F1F5F9] animate-alert-once">
                    CRITICAL BREACH
                  </span>
                )}
              </div>
            </div>

            {/* In-Flight Reliability Forecast Metrics Grid (4-box harmonized with Module A) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-mono">
              <div className="p-1.5 rounded bg-[#07111C] border border-[#1D3A52] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#9AAFC0] uppercase font-semibold">Drift Velocity</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-[#0E88D3] led" />}
                </div>
                <span className={`text-sm font-bold mt-0.5 tabular-nums ${liveVel > 50 ? 'text-[#E5484D]' : 'text-[#F47216]'}`}>
                  {liveVel.toFixed(2)} <span className="text-[10px] font-normal text-[#9AAFC0]">nA/hr</span>
                </span>
                <span className="text-[9px] text-[#6F8495] font-mono mt-0.5">Arrhenius Slope</span>
              </div>

              <div className="p-1.5 rounded bg-[#07111C] border border-[#1D3A52] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#9AAFC0] uppercase font-semibold">264h Extrapolated</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-[#0E88D3] led" />}
                </div>
                <span className={`text-sm font-bold mt-0.5 tabular-nums ${willBreach ? 'text-[#E5484D]' : 'text-[#F1F5F9]'}`}>
                  {liveProj.toFixed(1)} <span className="text-[10px] font-normal text-[#9AAFC0]">&mu;A</span>
                </span>
                <span className="text-[9px] text-[#0E88D3] font-mono mt-0.5">In-Flight Target</span>
              </div>

              <div className="p-1.5 rounded bg-[#07111C] border border-[#1D3A52] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#9AAFC0] uppercase font-semibold">Future Margin</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-[#0E88D3] led" />}
                </div>
                <span
                  className={`text-sm font-bold mt-0.5 tabular-nums ${
                    liveMarg < 5
                      ? 'text-[#E5484D]'
                      : liveMarg < 15
                      ? 'text-[#F2B84B]'
                      : 'text-[#22A06B]'
                  }`}
                >
                  {liveMarg.toFixed(1)} <span className="text-[10px] font-normal text-[#9AAFC0]">&mu;A</span>
                </span>
                <span className="text-[9px] text-[#6F8495] font-mono mt-0.5">Datasheet Headroom</span>
              </div>

              <div className="p-1.5 rounded bg-[#07111C] border border-[#1D3A52] flex flex-col">
                <span className="text-[10px] text-[#9AAFC0] uppercase font-semibold">Breach Horizon</span>
                <span className={`text-sm font-bold mt-0.5 tabular-nums ${breachHour && breachHour <= 300 ? 'text-[#E5484D]' : 'text-[#22A06B]'}`}>
                  {breachHour && breachHour > 0 && breachHour < 1000
                    ? `T+${Math.round(breachHour)}h`
                    : 'NO BREACH (>1000h)'}
                </span>
                <span className="text-[9px] text-[#6F8495] font-mono mt-0.5">Safety Boundary</span>
              </div>
            </div>

            {/* In-Flight Physics & Reliability Horizon Strip (Matching Module A exactly) */}
            <div className="p-2 rounded bg-[#102337] border border-[#1D3A52] text-xs text-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 font-mono">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[#F47216] font-bold text-[10px] uppercase whitespace-nowrap">
                  MODEL:
                </span>
                <span className="text-xs text-[#F1F5F9] truncate font-sans" title="Empirical Arrhenius Thermal Activation Model (Ea=0.7eV)">
                  Arrhenius Thermal Degradation &bull; Dynamic Confidence Cone
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[#9AAFC0] whitespace-nowrap">
                <span>Pred Error: <b className="text-[#F1F5F9]">&plusmn;{(selected?.prediction_error_168 ?? 0.42).toFixed(2)}&mu;A</b></span>
                <span>Spec Limit: <b className="text-[#E5484D]">{limitVal.toFixed(1)}&mu;A</b></span>
                <span>Horizon: <b className="text-[#0E88D3]">264H (+96H)</b></span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-[#9AAFC0] bg-[#142B40] rounded-lg border border-[#1D3A52]">
            No component selected. Pick a component to run Module B Future Drift Forecast.
          </div>
        )}

        {/* Module B Dedicated Graph: Predictive Extrapolation Canvas - Dynamically occupies full remaining height */}
        <div className="mt-0.5 flex flex-col flex-1 min-h-[280px] w-full">
          <ModuleBFutureDriftGraph component={selected} onSimUpdate={setSimData} />
        </div>
      </div>

      {/* Module B Bezel Bottom Bar */}
      <div className="bg-[#0B1928] border-t border-[#1D3A52] px-4 py-2 text-xs text-[#9AAFC0] flex justify-between font-mono">
        <span>Extrapolation: Linear Arrhenius + Dynamic Confidence Cone</span>
        <span className="text-[#F1F5F9]">
          Datasheet Bound: {limitVal.toFixed(1)} &mu;A
        </span>
      </div>
    </div>
  )
}
