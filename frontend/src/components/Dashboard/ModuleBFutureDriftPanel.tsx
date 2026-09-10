import React from 'react'
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
  const loc = selected ? getSubsystemLocation(selected.subsystem) : null
  const limitVal = selected?.limit_ua || 50
  const slope = selected?.slope || (selected ? (selected.v168 - selected.v0) / 168 : 0)
  const willBreach = selected?.future_limit_breach || (selected && selected.predicted_future >= limitVal)
  const breachHour =
    slope > 0 && selected
      ? 168 + (limitVal - selected.v168) / slope
      : null

  const isAccelerating = selected?.drift_trend === 'ACCELERATING POSITIVE DRIFT'

  return (
    <div className="flex flex-col rounded-xl bg-[#090F1E] border border-slate-800 shadow-xl overflow-hidden min-h-[580px]">
      {/* Module B Top Bezel Bar */}
      <div className="bg-[#0F172A] border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/40">
            MODULE B
          </span>
          <span className="text-xs font-bold text-white tracking-wide uppercase">
            Future Drift &amp; In-Flight Reliability Forecasting
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${willBreach ? 'bg-rose-500 led' : 'bg-amber-400 led'}`} />
          <span className="text-slate-400 text-[11px]">FLIGHT HORIZON: +96H &bull; 264H</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 flex-1 flex flex-col gap-3">
        {selected ? (
          <div className="p-3 rounded-lg bg-[#070D1A] border border-slate-800 flex flex-col gap-2.5">
            {/* Top Identity & Drift Classification Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">{selected.component_id}</span>
                <span className="text-slate-400 text-xs">&bull;</span>
                <span className="text-amber-300 text-xs">Target Subsystem:</span>
                <button
                  type="button"
                  onClick={() => onSelectSubsystem && onSelectSubsystem(selected.subsystem)}
                  className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold hover:bg-amber-500/30 transition-colors"
                >
                  [{selected.subsystem}] {loc?.name || selected.subsystem}
                </button>
              </div>

              {/* Drift Trend Badge */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                    willBreach
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : isAccelerating
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {selected.drift_trend || (willBreach ? 'PREDICTED EXCEEDANCE' : 'NOMINAL DRIFT')}
                </span>
                {willBreach && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                    CRITICAL BREACH
                  </span>
                )}
              </div>
            </div>

            {/* In-Flight Reliability Forecast Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-[#050B16] border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase">Drift Velocity</span>
                <span className={`text-sm font-bold mt-0.5 ${slope > 0.05 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {(slope * 1000).toFixed(2)} <span className="text-[10px] font-normal text-slate-400">nA/hr</span>
                </span>
              </div>

              <div className="p-2 rounded bg-[#050B16] border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase">264h Extrapolated</span>
                <span className={`text-sm font-bold mt-0.5 ${willBreach ? 'text-rose-400' : 'text-slate-100'}`}>
                  {selected.predicted_future.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">&mu;A</span>
                </span>
              </div>

              <div className="p-2 rounded bg-[#050B16] border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase">Future Safety Margin</span>
                <span
                  className={`text-sm font-bold mt-0.5 ${
                    (selected.margin_future ?? 0) < 5
                      ? 'text-rose-400'
                      : (selected.margin_future ?? 0) < 15
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {(selected.margin_future ?? (limitVal - selected.predicted_future)).toFixed(1)}{' '}
                  <span className="text-[10px] font-normal text-slate-400">&mu;A</span>
                </span>
              </div>

              <div className="p-2 rounded bg-[#050B16] border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase">Time to Limit Breach</span>
                <span className={`text-sm font-bold mt-0.5 ${breachHour && breachHour <= 300 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {breachHour && breachHour > 0 && breachHour < 1000
                    ? `T+${Math.round(breachHour)} hrs`
                    : '> 10,000 hrs (SAFE)'}
                </span>
              </div>
            </div>

            {/* Early-to-Late Validation & Model Accuracy */}
            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800/80">
              <div className="flex justify-between bg-slate-900/40 px-2 py-1 rounded">
                <span className="text-slate-400">Early 0-24h Model:</span>
                <span className="text-slate-200 font-bold">
                  {selected.predicted168_from_early.toFixed(1)} &mu;A
                </span>
              </div>
              <div className="flex justify-between bg-slate-900/40 px-2 py-1 rounded">
                <span className="text-slate-400">Actual 168h Reading:</span>
                <span className="text-slate-200 font-bold">{selected.v168.toFixed(1)} &mu;A</span>
              </div>
              <div className="flex justify-between bg-slate-900/40 px-2 py-1 rounded">
                <span className="text-slate-400">Prediction Error:</span>
                <span className="text-sky-300 font-bold">
                  &plusmn;{(selected.prediction_error_168 ?? Math.abs(selected.v168 - selected.predicted168_from_early)).toFixed(2)} &mu;A
                </span>
              </div>
            </div>

            {/* Flight Operations Advisory / Mitigation Actions */}
            <div
              className={`p-2 rounded text-xs flex items-start gap-2 border ${
                willBreach
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
              }`}
            >
              <span className="font-bold font-mono text-[11px] uppercase whitespace-nowrap">
                {willBreach ? '⚠️ Mitigation Advisory:' : 'ℹ️ Flight Recommendation:'}
              </span>
              <span className="text-[11px] font-sans leading-relaxed">
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
          <ModuleBFutureDriftGraph component={selected} />
        </div>
      </div>

      {/* Module B Bezel Bottom Bar */}
      <div className="bg-[#070D1A] border-t border-slate-800 px-4 py-2 text-xs text-slate-400 flex justify-between font-mono">
        <span>Extrapolation Algorithm: Empirical Arrhenius Degradation Model</span>
        <span className={willBreach ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
          {willBreach ? 'ACTION REQUIRED: ISOLATE COMPONENT' : 'SYSTEM RELIABILITY: NOMINAL'}
        </span>
      </div>
    </div>
  )
}
