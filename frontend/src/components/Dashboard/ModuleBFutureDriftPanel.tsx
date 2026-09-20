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
    <div className={`flex flex-col rounded-xl bg-[#111E30] border shadow-xl overflow-hidden h-full transition-colors ${
      willBreach ? 'border-[#D94B5B]/60' : 'border-[#26384D]'
    }`}>
      {/* Module B Top Bezel Bar */}
      <div className="bg-[#0D1726] border-b border-[#26384D] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-md bg-[#C99A2E]/20 text-[#C99A2E] text-sm sm:text-base font-mono font-black border border-[#C99A2E]/60 shadow-isro tracking-wider uppercase whitespace-nowrap">
            MODULE B
          </span>
          <span className="text-xs sm:text-sm font-display font-bold text-[#E8EDF2] tracking-wider uppercase">
            Future Drift &amp; In-Flight Reliability Forecasting
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${willBreach ? 'bg-[#D94B5B] led' : 'bg-[#C99A2E] led'}`} />
          <span className="text-[#91A0B2] text-[11px]">
            {isSim
              ? simData?.p2 && simData.p2 > 0
                ? `IN-FLIGHT EXTRAPOLATING: +${Math.round((simData?.currentH ?? 168) - 168)}H`
                : `GROUND BASELINE SWEEP: T+${Math.round(simData?.currentH ?? 0)}H`
              : 'FLIGHT HORIZON: +96H \u2022 264H'}
          </span>
        </div>
      </div>

      {/* Module B Predictive Engine & Horizon Sub-bar */}
      <div className="p-3 bg-[#0D1726] border-b border-[#26384D] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[#91A0B2] font-mono text-[11px]">PREDICTION ENGINE:</span>
          <span className="text-[#C99A2E] font-bold bg-[#C99A2E]/15 px-2 py-0.5 rounded border border-[#C99A2E]/30 text-[11px]">
            EMPIRICAL ARRHENIUS DEGRADATION
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-[#91A0B2]">HORIZON:</span>
          <span className="text-[#3FA66B] font-bold bg-[#3FA66B]/15 px-2 py-0.5 rounded border border-[#3FA66B]/30">
            264H IN-FLIGHT (+96H EXTENSION)
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 flex-1 flex flex-col gap-3.5">
        {selected ? (
          <div className={`p-3 rounded-lg border flex flex-col gap-2.5 transition-colors ${
            willBreach ? 'bg-[#28131D] border-[#D94B5B]/50' : 'bg-[#16253A] border-[#26384D]'
          }`}>
            {/* Top Identity & Drift Classification Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 font-mono">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-base md:text-lg font-bold text-[#E8EDF2] tracking-wide">{selected.component_id}</span>
                <span className="text-[#5A6E85] text-sm">&bull;</span>
                <span className="text-[#C99A2E] text-xs md:text-sm font-semibold">Target Subsystem:</span>
                <button
                  type="button"
                  onClick={() => onSelectSubsystem && onSelectSubsystem(selected.subsystem)}
                  className="px-2 py-1 rounded-md bg-[#111E30] border border-[#26384D] text-[#3B82B6] text-xs font-bold hover:border-[#3B82B6] transition-colors"
                >
                  [{selected.subsystem}] {loc?.name || selected.subsystem}
                </button>
              </div>

              {/* Drift Trend Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-md text-xs font-bold border transition-colors ${
                    willBreach
                      ? 'bg-[#D94B5B]/20 text-[#D94B5B] border-[#D94B5B]/50'
                      : isAccelerating
                      ? 'bg-[#D6A33A]/20 text-[#D6A33A] border-[#D6A33A]/50'
                      : 'bg-[#3FA66B]/20 text-[#3FA66B] border-[#3FA66B]/50'
                  }`}
                >
                  {isSim ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C99A2E] led" />
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
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#D94B5B] text-[#E8EDF2] animate-alert-once">
                    CRITICAL BREACH
                  </span>
                )}
              </div>
            </div>

            {/* In-Flight Reliability Forecast Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#070D18] border border-[#26384D] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#91A0B2] uppercase font-semibold">Drift Velocity</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-[#C99A2E] led" />}
                </div>
                <span className={`text-base font-bold mt-1 tabular-nums ${liveVel > 50 ? 'text-[#D94B5B]' : 'text-[#C99A2E]'}`}>
                  {liveVel.toFixed(2)} <span className="text-xs font-normal text-[#91A0B2]">nA/hr</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#070D18] border border-[#26384D] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#91A0B2] uppercase font-semibold">264h Extrapolated</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-[#C99A2E] led" />}
                </div>
                <span className={`text-base font-bold mt-1 tabular-nums ${willBreach ? 'text-[#D94B5B]' : 'text-[#E8EDF2]'}`}>
                  {liveProj.toFixed(1)} <span className="text-xs font-normal text-[#91A0B2]">&mu;A</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#070D18] border border-[#26384D] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#91A0B2] uppercase font-semibold">Future Safety Margin</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-[#C99A2E] led" />}
                </div>
                <span
                  className={`text-base font-bold mt-1 tabular-nums ${
                    liveMarg < 5
                      ? 'text-[#D94B5B]'
                      : liveMarg < 15
                      ? 'text-[#D6A33A]'
                      : 'text-[#3FA66B]'
                  }`}
                >
                  {liveMarg.toFixed(1)} <span className="text-xs font-normal text-[#91A0B2]">&mu;A</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#070D18] border border-[#26384D] flex flex-col">
                <span className="text-xs text-[#91A0B2] uppercase font-semibold">Time to Limit Breach</span>
                <span className={`text-base font-bold mt-1 tabular-nums ${breachHour && breachHour <= 300 ? 'text-[#D94B5B]' : 'text-[#3FA66B]'}`}>
                  {breachHour && breachHour > 0 && breachHour < 1000
                    ? `T+${Math.round(breachHour)}h`
                    : 'NO BREACH (>1000h)'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-[#91A0B2] bg-[#16253A] rounded-lg border border-[#26384D]">
            No component selected. Ingest data or pick a component to run Module B Future Drift Forecast.
          </div>
        )}

        {/* Module B Dedicated Graph: Predictive Extrapolation Canvas */}
        <div className="mt-1 flex flex-col h-[350px] md:h-[370px] min-h-[340px] md:min-h-[360px] w-full">
          <ModuleBFutureDriftGraph component={selected} onSimUpdate={setSimData} />
        </div>
      </div>

      {/* Module B Bezel Bottom Bar */}
      <div className="bg-[#0D1726] border-t border-[#26384D] px-4 py-2 text-xs text-[#91A0B2] flex justify-between font-mono">
        <span>Extrapolation: Linear Arrhenius + Dynamic Confidence Cone</span>
        <span className="text-[#E8EDF2]">
          Datasheet Bound: {limitVal.toFixed(1)} &mu;A
        </span>
      </div>
    </div>
  )
}
