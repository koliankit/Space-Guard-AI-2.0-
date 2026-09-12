import React from 'react'
import type { ComponentOut } from '../../types'

export function ComponentOverviewCard({ component }: { component: ComponentOut | null }) {
  if (!component) {
    return (
      <div className="bg-[#0B1120] p-5 rounded-xl border border-slate-800 flex flex-col justify-center items-center text-center font-sans h-full min-h-[460px]">
        <h3 className="m-0 mb-3 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 font-display">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Component Intelligence
        </h3>
        <div className="text-slate-400 text-xs leading-relaxed py-6 px-4 border border-dashed border-slate-800 rounded-lg max-w-xs">
          Select any component on the 3D Satellite or screening matrix to inspect dynamic lot-relative telemetry.
        </div>
      </div>
    )
  }

  const isReject = component.status === 'reject'
  const isMonitor = component.status === 'monitor'
  const isAbnormalInSpec = component.traditional_decision === 'PASS' && component.status !== 'safe'
  const bHealth = component.behavioral_health || (isReject ? 'CRITICAL' : isMonitor ? 'MONITOR' : 'NORMAL')

  return (
    <div className="bg-[#0B1120] p-4 md:p-5 rounded-xl border border-slate-800 flex flex-col justify-between h-full font-sans text-xs shadow-md">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3.5">
          <h3 className="m-0 text-xs md:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 font-display">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 led" />
            Component Intelligence
          </h3>
          <div className="flex items-center gap-2">
            {/* Behavioral Health Badge */}
            <span
              className={`font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                bHealth === 'CRITICAL'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : bHealth === 'DEGRADING'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : bHealth === 'MONITOR'
                  ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
              title="Component Behavioral Health State"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${bHealth === 'CRITICAL' ? 'bg-rose-500' : bHealth === 'DEGRADING' ? 'bg-amber-500' : bHealth === 'MONITOR' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              {bHealth}
            </span>
            <span
              className={`font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded border ${
                isReject
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : isMonitor
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {component.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Target Component Identifier Card */}
        <div className="bg-[#070D1A] p-3.5 rounded-xl border border-slate-800 mb-3.5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <div className="text-base font-bold text-white font-mono tracking-wide">
              {component.component_id}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Lot: <span className="text-amber-300 font-bold">{component.lot_id}</span>
            </div>
          </div>
          <div className="text-xs text-amber-400 mt-1.5 font-medium flex items-center justify-between">
            <span className="font-semibold">{component.subsystem_name} &bull; [{component.subsystem}]</span>
            <span className="text-[10.5px] text-slate-400 uppercase font-mono">{component.parameter || 'Leakage Current (µA)'}</span>
          </div>
        </div>

        {/* Traditional vs AI Verdict Comparison Box */}
        <div className="mb-3.5 p-3.5 rounded-xl bg-[#070D1A] border border-slate-800 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Traditional Spec Check:</span>
            <b className={`px-2.5 py-1 rounded font-mono text-xs ${component.traditional_decision === 'PASS' ? 'text-emerald-300 bg-emerald-500/15' : 'text-rose-300 bg-rose-500/15'}`}>
              {component.traditional_decision} (&le; {component.limit_ua} µA)
            </b>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">AI Lot-Relative Verdict:</span>
            <b className={`px-2.5 py-1 rounded font-mono text-xs ${isReject ? 'text-rose-300 bg-rose-500/20' : isMonitor ? 'text-amber-300 bg-amber-500/20' : 'text-emerald-300 bg-emerald-500/20'}`}>
              {component.status.toUpperCase()} &bull; Risk {component.risk_score}/100
            </b>
          </div>
          {isAbnormalInSpec ? (
            <div className="p-2.5 rounded-lg bg-purple-500/15 border border-purple-400/40 text-[11px] text-purple-200 font-medium">
              <span className="text-amber-300 font-bold">&#9888; Latent Defect:</span> Passes Static Limit (&le; {component.limit_ua} µA) but diverges abnormal from lot cohort ({component.z168 > 0 ? '+' : ''}{component.z168.toFixed(1)}σ).
            </div>
          ) : (
            <div className="pt-1.5 text-[11px] text-slate-400 border-t border-slate-800/80 flex justify-between font-mono">
              <span>Evaluation Protocol:</span>
              <span className="text-slate-300 font-semibold">MIL-STD-883 HTOL 168H</span>
            </div>
          )}
        </div>

        {/* Burn-In Measurements (0h, 24h, 96h, 168h) */}
        <div className="p-3.5 rounded-xl bg-[#070D1A] border border-slate-800">
          <div className="text-[10.5px] text-slate-400 uppercase font-semibold mb-2.5 flex items-center justify-between">
            <span className="font-bold tracking-wider">HTOL Burn-In Measurements</span>
            <span className="text-amber-400 text-[10px] font-mono font-bold">MIL-STD-883 M1005</span>
          </div>
          <div className="grid grid-cols-4 gap-2.5 text-center font-mono">
            <div className="bg-[#0F172A] p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">0h</div>
              <div className="text-white font-bold text-sm">{component.v0.toFixed(2)}</div>
            </div>
            <div className="bg-[#0F172A] p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">24h</div>
              <div className="text-white font-bold text-sm">{component.v24.toFixed(2)}</div>
            </div>
            <div className="bg-[#0F172A] p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">96h</div>
              <div className="text-white font-bold text-sm">{component.v96 != null ? component.v96.toFixed(2) : '--'}</div>
            </div>
            <div className="bg-[#0F172A] p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">168h</div>
              <div className={`font-bold text-sm ${isReject ? 'text-rose-400' : 'text-amber-400'}`}>{component.v168.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status Footprint */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span>Channel: 24-Bit Sigma-Delta ADC</span>
        <span className={isReject ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
          {isReject ? '⚠️ QUARANTINE REQUIRED' : '✓ FLIGHT CLEARED'}
        </span>
      </div>
    </div>
  )
}

export function MathematicalReadingsPanel({ component }: { component: ComponentOut | null }) {
  if (!component) return null

  const isReject = component.status === 'reject'
  const isMonitor = component.status === 'monitor'
  const isAbnormalInSpec = component.traditional_decision === 'PASS' && component.status !== 'safe'

  const explanationPoints = component.explanation_points && component.explanation_points.length > 0
    ? component.explanation_points
    : [
        component.lot_mean != null
          ? `Reading (${component.v168.toFixed(2)} µA) is ${component.z168 > 0 ? '+' : ''}${component.z168.toFixed(1)}σ from lot baseline average (${component.lot_mean.toFixed(2)} µA).`
          : `Component 168h reading is ${component.v168.toFixed(2)} µA against limit ${component.limit_ua} µA.`,
        isAbnormalInSpec
          ? `PASS by datasheet limit (${component.v168.toFixed(2)} µA < ${component.limit_ua} µA) but abnormal relative to lot cohort.`
          : component.v168 > component.limit_ua
          ? `Static limit violation: exceeds ${component.limit_ua} µA by +${(component.v168 - component.limit_ua).toFixed(2)} µA.`
          : `Nominal lot cohort behavior.`,
        `Measured drift slope (+${component.slope.toFixed(4)} µA/hr) over 168h HTOL indicates ${component.drift_trend?.toLowerCase() || 'stable behavior'}.`,
        component.predicted_future > component.limit_ua
          ? `Early 0h+24h extrapolation predicted 168h to ${component.predicted168_from_early.toFixed(2)} µA; 264h future projection (${component.predicted_future.toFixed(2)} µA) exceeds safety limit.`
          : `Early 0h+24h prediction: ${component.predicted168_from_early.toFixed(2)} µA; projected 264h value: ${component.predicted_future.toFixed(2)} µA (margin: ${(component.limit_ua - component.predicted_future).toFixed(2)} µA).`,
      ]

  return (
    <div className="bg-[#0B1120] p-4 md:p-5 rounded-xl border border-slate-800 flex flex-col gap-4 font-sans text-xs shadow-md w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 led" />
          <h3 className="m-0 text-xs md:text-sm font-bold uppercase tracking-wider text-white font-display">
            Mathematical Telemetry Metrics &amp; Statistical Drift Review
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-bold">
            {component.component_id}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          ALGORITHM: <span className="text-emerald-400 font-bold">ISRO HTOL LOT COHORT GAUSSIAN</span>
        </span>
      </div>

      {/* 5-Column Grid for the 10 Mathematical Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Metric 1 */}
        <div className="p-3 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[11px] uppercase font-semibold">Datasheet Limit</span>
          <span className="font-mono text-base font-bold text-rose-400">{component.limit_ua.toFixed(0)} µA</span>
          <span className="text-[10px] text-slate-400">Standard spec ceiling</span>
        </div>

        {/* Metric 2 */}
        <div className="p-3 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[11px] uppercase font-semibold">Lot Average (&mu;)</span>
          <span className="font-mono text-base font-bold text-slate-100">
            {component.lot_mean != null ? `${component.lot_mean.toFixed(2)} µA` : '--'}
          </span>
          <span className="text-[10px] text-amber-300 truncate">
            {component.lot_pct_dev != null ? `${component.lot_pct_dev > 0 ? '+' : ''}${component.lot_pct_dev.toFixed(1)}% vs lot mean` : 'Lot baseline mean'}
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-3 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[11px] uppercase font-semibold">Lot Deviation (&sigma;)</span>
          <span className="font-mono text-base font-bold text-slate-100">
            {component.lot_std != null ? `±${component.lot_std.toFixed(2)} µA` : '--'}
          </span>
          <span className="text-[10px] text-slate-400">Sample variance standard</span>
        </div>

        {/* Metric 4 */}
        <div className="p-3 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[11px] uppercase font-semibold">Lot z-Score</span>
          <span className={`font-mono text-base font-bold ${
            Math.abs(component.z168) >= 3 ? 'text-rose-400' : Math.abs(component.z168) >= 2 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {component.z168 > 0 ? '+' : ''}{component.z168.toFixed(2)}σ
          </span>
          <span className="text-[10px] text-slate-400">Standard normal quantile</span>
        </div>

        {/* Metric 5 */}
        <div className="p-3 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[11px] uppercase font-semibold">Drift % (168h vs 0h)</span>
          <span className={`font-mono text-base font-bold ${
            Math.abs(component.pct_drift) >= 60 ? 'text-rose-400' : Math.abs(component.pct_drift) >= 40 ? 'text-amber-400' : 'text-slate-100'
          }`}>
            {component.pct_drift > 0 ? '+' : ''}{component.pct_drift.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400">Total burn-in divergence</span>
        </div>

        {/* Metric 6 */}
        <div className="p-3 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[11px] uppercase font-semibold">Drift Slope</span>
          <span className="font-mono text-base font-bold text-amber-300">{component.slope.toFixed(4)} µA/hr</span>
          <span className="text-[10px] text-slate-400 truncate">{component.drift_trend || 'NOMINAL / STABLE'}</span>
        </div>

        {/* Metric 7 */}
        <div className="p-3 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[11px] uppercase font-semibold">Predicted 168h (Early)</span>
          <span className="font-mono text-base font-bold text-slate-100">{component.predicted168_from_early.toFixed(2)} µA</span>
          <span className="text-[10px] text-slate-400 truncate">
            {component.prediction_error_168 != null ? `Error: ±${component.prediction_error_168.toFixed(2)} µA` : '0h-24h early trajectory'}
          </span>
        </div>

        {/* Metric 8 */}
        <div className="p-3 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[11px] uppercase font-semibold">Projected Future (264h)</span>
          <span className={`font-mono text-base font-bold ${
            component.predicted_future > component.limit_ua ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {component.predicted_future.toFixed(2)} µA
          </span>
          <span className="text-[10px] text-slate-400 truncate">
            {component.predicted_future > component.limit_ua
              ? `EXCEEDS LIMIT (+${(component.predicted_future - component.limit_ua).toFixed(2)} µA)`
              : component.margin_future != null ? `Margin: ${component.margin_future.toFixed(2)} µA` : 'In-flight projection'}
          </span>
        </div>

        {/* Metric 9 */}
        <div className="p-3 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[11px] uppercase font-semibold">Anomaly Score</span>
          <span className="font-mono text-base font-bold text-purple-300">{component.iso_score.toFixed(1)} / 100</span>
          <span className="text-[10px] text-slate-400">Isolation Forest score</span>
        </div>

        {/* Metric 10 */}
        <div className="p-3 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[11px] uppercase font-semibold">Risk Score &amp; Decision</span>
          <span className={`font-mono text-base font-bold ${
            isReject ? 'text-rose-400' : isMonitor ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {component.risk_score} / 100 [{component.status.toUpperCase()}]
          </span>
          <span className="text-[10px] text-slate-400 truncate">
            {component.risk_score >= 75 ? 'QUARANTINE THRESHOLD' : component.risk_score >= 40 ? 'MONITORING ACTIVE' : 'FLIGHT READY'}
          </span>
        </div>
      </div>

      {/* WHY THIS COMPONENT WAS FLAGGED (Explainable AI Panel) */}
      <div className="pt-2 border-t border-slate-800">
        <div className="text-[11px] uppercase font-bold text-slate-300 tracking-wider mb-2.5 flex items-center justify-between font-sans">
          <span className="flex items-center gap-1.5">
            <span className="text-amber-400 font-bold">&gt;&gt;</span> WHY WAS THIS COMPONENT FLAGGED?
          </span>
          <span className="text-[10px] text-amber-300 font-mono font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            XAI EXPLAINABLE INTELLIGENCE ENGINE
          </span>
        </div>
        <div
          className={`p-3.5 rounded-xl border text-xs font-sans leading-relaxed space-y-2 ${
            isReject
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              : isMonitor
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          }`}
        >
          {explanationPoints.map((pt, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <span className="font-mono font-bold text-amber-400 opacity-90">{idx + 1}.</span>
              <span className="leading-relaxed">{pt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function IntelligencePanel({ component }: { component: ComponentOut | null }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <ComponentOverviewCard component={component} />
      <MathematicalReadingsPanel component={component} />
    </div>
  )
}
