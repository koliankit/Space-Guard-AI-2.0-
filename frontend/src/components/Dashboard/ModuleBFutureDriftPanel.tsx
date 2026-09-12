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
    <div className="flex flex-col rounded-xl bg-[#090F1E] border border-slate-800 shadow-xl overflow-hidden min-h-[580px]">
      {/* Module B Top Bezel Bar */}
      <div className="bg-[#0D162A] border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-md bg-amber-500/25 text-amber-300 text-sm sm:text-base font-mono font-black border border-amber-500/70 shadow-isro tracking-wider uppercase whitespace-nowrap">
            MODULE B
          </span>
          <span className="text-xs sm:text-sm font-display font-bold text-white tracking-wider uppercase">
            Future Drift &amp; In-Flight Reliability Forecasting
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`w-2.5 h-2.5 rounded-full ${willBreach ? 'bg-rose-500 led' : 'bg-amber-400 led'}`} />
          <span className="text-slate-400 text-[11px]">
            {isSim
              ? simData?.p2 && simData.p2 > 0
                ? `IN-FLIGHT EXTRAPOLATING: +${Math.round((simData?.currentH ?? 168) - 168)}H`
                : `GROUND BASELINE SWEEP: T+${Math.round(simData?.currentH ?? 0)}H`
              : 'FLIGHT HORIZON: +96H \u2022 264H'}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 flex-1 flex flex-col gap-3">
        {selected ? (
          <div className="p-3 rounded-lg bg-[#070D1A] border border-slate-800 flex flex-col gap-2.5">
            {/* Top Identity & Drift Classification Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 font-mono">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-base md:text-lg font-bold text-white tracking-wide">{selected.component_id}</span>
                <span className="text-slate-400 text-sm">&bull;</span>
                <span className="text-amber-300 text-xs md:text-sm font-semibold">Target Subsystem:</span>
                <button
                  type="button"
                  onClick={() => onSelectSubsystem && onSelectSubsystem(selected.subsystem)}
                  className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold hover:bg-slate-700 transition-colors"
                >
                  [{selected.subsystem}] {loc?.name || selected.subsystem}
                </button>
              </div>

              {/* Drift Trend Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-md text-xs font-bold border transition-all ${
                    willBreach
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : isAccelerating
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {isSim ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
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
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-600 text-white animate-pulse">
                    CRITICAL BREACH
                  </span>
                )}
              </div>
            </div>

            {/* In-Flight Reliability Forecast Metrics Grid (Live count-up synchronized with sweep) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#050B16] border border-slate-800 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Drift Velocity</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                </div>
                <span className={`text-base font-bold mt-1 tabular-nums ${liveVel > 50 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {liveVel.toFixed(2)} <span className="text-xs font-normal text-slate-400">nA/hr</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#050B16] border border-slate-800 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase font-semibold">264h Extrapolated</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                </div>
                <span className={`text-base font-bold mt-1 tabular-nums ${willBreach ? 'text-rose-400' : 'text-slate-100'}`}>
                  {liveProj.toFixed(1)} <span className="text-xs font-normal text-slate-400">&mu;A</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#050B16] border border-slate-800 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Future Safety Margin</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                </div>
                <span
                  className={`text-base font-bold mt-1 tabular-nums ${
                    liveMarg < 5
                      ? 'text-rose-400'
                      : liveMarg < 15
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {liveMarg.toFixed(1)} <span className="text-xs font-normal text-slate-400">&mu;A</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#050B16] border border-slate-800 flex flex-col">
                <span className="text-xs text-slate-400 uppercase font-semibold">Time to Limit Breach</span>
                <span className={`text-base font-bold mt-1 tabular-nums ${breachHour && breachHour <= 300 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {breachHour && breachHour > 0 && breachHour < 1000
                    ? `T+${Math.round(breachHour)} hrs`
                    : '> 10,000 hrs (SAFE)'}
                </span>
              </div>
            </div>

            {/* Early-to-Late Validation & Model Accuracy */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs md:text-sm font-mono text-slate-200 pt-1.5 border-t border-slate-800/80">
              <div className="flex justify-between bg-slate-900/60 px-3 py-1.5 rounded-lg">
                <span className="text-slate-400">Early 0-24h Model:</span>
                <span className="text-slate-100 font-bold tabular-nums">
                  {selected.predicted168_from_early.toFixed(1)} &mu;A
                </span>
              </div>
              <div className="flex justify-between bg-slate-900/60 px-3 py-1.5 rounded-lg">
                <span className="text-slate-400">Actual 168h Reading:</span>
                <span className="text-slate-100 font-bold tabular-nums">{selected.v168.toFixed(1)} &mu;A</span>
              </div>
              <div className="flex justify-between bg-slate-900/60 px-3 py-1.5 rounded-lg">
                <span className="text-slate-400">Prediction Error:</span>
                <span className="text-amber-300 font-bold tabular-nums">
                  &plusmn;{(selected.prediction_error_168 ?? Math.abs(selected.v168 - selected.predicted168_from_early)).toFixed(2)} &mu;A
                </span>
              </div>
            </div>

            {/* Flight Operations Advisory / Mitigation Actions */}
            <div
              className={`p-3 rounded-lg text-xs md:text-sm flex items-start gap-2.5 border ${
                willBreach
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
              }`}
            >
              <span className="font-bold font-mono text-xs md:text-sm uppercase whitespace-nowrap">
                {willBreach ? '⚠️ Mitigation Advisory:' : 'ℹ️ Flight Recommendation:'}
              </span>
              <span className="text-xs md:text-[13.5px] font-sans leading-relaxed">
                {willBreach
                  ? `Component exhibits runaway leakage drift exceeding ${limitVal} µA threshold in mission orbit. Recommend automated telemetry trip, power bus decoupling, and switching to redundant Cold-Standby channel in ${loc?.bay || 'Equipment Bay'}.`
                  : `Component exhibits stable drift velocity (${(slope * 1000).toFixed(1)} nA/hr). Maintain regular 24h orbital polling cycle. Bus supply remains nominal.`}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 bg-[#070D1A] rounded-lg border border-slate-800">
            No component selected. Pick a component from Module A to evaluate Module B Future Drift Projections.
          </div>
        )}

        {/* Module B Dedicated Graph: Future Drift Forecaster */}
        <div className="mt-1">
          <ModuleBFutureDriftGraph component={selected} onSimUpdate={setSimData} />
        </div>
      </div>

      {/* Module B Bezel Bottom Bar */}
      <div className="bg-[#070D1A] border-t border-slate-800 px-4 py-2 text-xs text-slate-400 flex justify-between font-mono">
        <span>Extrapolation Algorithm: Empirical Arrhenius Degradation Model</span>
        <span className={willBreach ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
          {willBreach ? 'ACTION REQUIRED: ISOLATE COMPONENT' : 'SYSTEM RELIABILITY: NOMINAL'}
        </span>
      </div>
    </div>
  )
}

