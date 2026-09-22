import React from 'react'
import type { ComponentOut } from '../../types'

export function ComponentOverviewCard({ component }: { component: ComponentOut | null }) {
  if (!component) {
    return (
      <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#D7E0EA] flex flex-col justify-center items-center text-center font-sans h-full min-h-[460px] shadow-sm">
        <h3 className="m-0 mb-3 text-xs font-bold uppercase tracking-wider text-[#0B1E36] flex items-center gap-2 font-display">
          <span className="w-2 h-2 rounded-full bg-[#005A9C]" />
          Component Intelligence
        </h3>
        <div className="text-[#475569] text-xs leading-relaxed py-6 px-4 border border-dashed border-[#D7E0EA] rounded-lg max-w-xs font-mono font-medium">
          Select any component on the 3D Satellite, matrix, or lot ledger to inspect dynamic lot-relative telemetry.
        </div>
      </div>
    )
  }

  const isReject = component.status === 'reject'
  const isMonitor = component.status === 'monitor'
  const isAbnormalInSpec = component.traditional_decision === 'PASS' && component.status !== 'safe'
  const bHealth = component.behavioral_health || (isReject ? 'CRITICAL' : isMonitor ? 'MONITOR' : 'NORMAL')

  return (
    <div className="bg-[#FFFFFF] p-4 md:p-5 rounded-xl border border-[#D7E0EA] flex flex-col justify-between h-full font-sans text-xs shadow-sm">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#D7E0EA] mb-3.5">
          <h3 className="m-0 text-xs md:text-sm font-bold uppercase tracking-wider text-[#0B1E36] flex items-center gap-2 font-display">
            <span className={`w-2.5 h-2.5 rounded-full ${isReject ? 'bg-[#DC2626]' : isMonitor ? 'bg-[#D97706]' : 'bg-[#168A5B]'}`} />
            Component Intelligence
          </h3>
          <div className="flex items-center gap-2">
            {/* Behavioral Health Badge */}
            <span
              className={`font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                bHealth === 'CRITICAL'
                  ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                  : bHealth === 'DEGRADING' || bHealth === 'MONITOR'
                  ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                  : 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
              }`}
              title="Component Behavioral Health State"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${bHealth === 'CRITICAL' ? 'bg-[#DC2626]' : bHealth === 'DEGRADING' || bHealth === 'MONITOR' ? 'bg-[#D97706]' : 'bg-[#168A5B]'}`} />
              {bHealth}
            </span>
            <span
              className={`font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded border ${
                isReject
                  ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                  : isMonitor
                  ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                  : 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
              }`}
            >
              {(component.status || 'safe').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Target Component Identifier Card */}
        <div className="bg-[#F8FAFD] p-3.5 rounded-xl border border-[#D7E0EA] mb-3.5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <div className="text-base font-bold text-[#0B1E36] font-mono tracking-wide">
              {component.component_id}
            </div>
            <div className="text-xs font-mono text-[#475569]">
              Lot: <span className="text-[#005A9C] font-bold">{component.lot_id}</span>
            </div>
          </div>
          <div className="text-xs text-[#334E68] mt-1.5 font-medium flex items-center justify-between">
            <span className="font-bold text-[#0B1E36]">{component.subsystem_name} &bull; [{component.subsystem}]</span>
            <span className="text-[10.5px] text-[#475569] uppercase font-mono font-semibold">{component.parameter || 'Leakage Current (µA)'}</span>
          </div>
        </div>

        {/* Traditional vs AI Verdict Comparison Box */}
        <div className="mb-3.5 p-3.5 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[#334E68] font-bold">Traditional Spec Check:</span>
            <b className={`px-2.5 py-1 rounded font-mono text-xs border ${
              component.traditional_decision === 'PASS'
                ? 'text-[#065F46] bg-[#ECFDF5] border-[#A7F3D0]'
                : 'text-[#991B1B] bg-[#FEF2F2] border-[#FECACA]'
            }`}>
              {component.traditional_decision} (&le; {component.limit_ua} µA)
            </b>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#334E68] font-bold">AI Lot-Relative Verdict:</span>
            <b className={`px-2.5 py-1 rounded font-mono text-xs border ${
              isReject
                ? 'text-[#991B1B] bg-[#FEF2F2] border-[#FECACA]'
                : isMonitor
                ? 'text-[#92400E] bg-[#FFFBEB] border-[#FDE68A]'
                : 'text-[#065F46] bg-[#ECFDF5] border-[#A7F3D0]'
            }`}>
              {(component.status || 'safe').toUpperCase()} &bull; Risk {component.risk_score}/100
            </b>
          </div>
          {isAbnormalInSpec ? (
            <div className="p-2.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#92400E] font-medium leading-relaxed">
              <span className="text-[#DC2626] font-bold">⚠️ Latent Defect:</span> Passes Static Limit (&le; {component.limit_ua} µA) but diverges abnormal from lot cohort ({component.z168 > 0 ? '+' : ''}{component.z168.toFixed(1)}σ).
            </div>
          ) : (
            <div className="pt-1.5 text-[11px] text-[#475569] border-t border-[#D7E0EA] flex justify-between font-mono font-medium">
              <span>Evaluation Protocol:</span>
              <span className="text-[#0B1E36] font-bold">MIL-STD-883 HTOL 168H</span>
            </div>
          )}
        </div>

        {/* Burn-In Measurements (0h, 24h, 96h, 168h) */}
        <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA]">
          <div className="text-[10.5px] text-[#334E68] uppercase font-bold mb-2.5 flex items-center justify-between">
            <span className="font-bold tracking-wider text-[#0B1E36]">HTOL Burn-In Measurements</span>
            <span className="text-[#005A9C] text-[10px] font-mono font-bold">MIL-STD-883 M1005</span>
          </div>
          <div className="grid grid-cols-4 gap-2.5 text-center font-mono">
            <div className="bg-[#FFFFFF] p-2.5 rounded-lg border border-[#D7E0EA] shadow-xs">
              <div className="text-[10px] text-[#475569] uppercase font-bold mb-0.5">0h</div>
              <div className="text-[#0B1E36] font-bold text-sm">{component.v0.toFixed(2)}</div>
            </div>
            <div className="bg-[#FFFFFF] p-2.5 rounded-lg border border-[#D7E0EA] shadow-xs">
              <div className="text-[10px] text-[#475569] uppercase font-bold mb-0.5">24h</div>
              <div className="text-[#0B1E36] font-bold text-sm">{component.v24.toFixed(2)}</div>
            </div>
            <div className="bg-[#FFFFFF] p-2.5 rounded-lg border border-[#D7E0EA] shadow-xs">
              <div className="text-[10px] text-[#475569] uppercase font-bold mb-0.5">96h</div>
              <div className="text-[#0B1E36] font-bold text-sm">{component.v96 != null ? component.v96.toFixed(2) : '--'}</div>
            </div>
            <div className="bg-[#FFFFFF] p-2.5 rounded-lg border border-[#D7E0EA] shadow-xs">
              <div className="text-[10px] text-[#475569] uppercase font-bold mb-0.5">168h</div>
              <div className={`font-bold text-sm ${isReject ? 'text-[#DC2626]' : isMonitor ? 'text-[#D97706]' : 'text-[#168A5B]'}`}>
                {component.v168.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status Footprint */}
      <div className="mt-3.5 pt-2.5 border-t border-[#D7E0EA] flex items-center justify-between text-[11px] font-mono text-[#475569]">
        <span>Channel: 24-Bit Sigma-Delta ADC</span>
        <span className={isReject ? 'text-[#DC2626] font-bold' : 'text-[#168A5B] font-bold'}>
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
    <div className="bg-[#FFFFFF] p-4 md:p-5 rounded-xl border border-[#D7E0EA] flex flex-col gap-4 font-sans text-xs shadow-sm w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#D7E0EA]">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isReject ? 'bg-[#DC2626]' : isMonitor ? 'bg-[#D97706]' : 'bg-[#168A5B]'}`} />
          <h3 className="m-0 text-xs md:text-sm font-bold uppercase tracking-wider text-[#0B1E36] font-display">
            Mathematical Telemetry Metrics &amp; Statistical Drift Review
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#F8FAFD] border border-[#D7E0EA] text-[#0B1E36] font-bold">
            {component.component_id}
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#475569] font-medium">
          ALGORITHM: <span className="text-[#168A5B] font-bold">ISRO HTOL LOT COHORT GAUSSIAN</span>
        </span>
      </div>

      {/* 5-Column Grid for the 10 Mathematical Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Metric 1 */}
        <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col justify-between gap-1 shadow-sm">
          <span className="text-[#475569] text-[11px] uppercase font-bold">Datasheet Limit</span>
          <span className="font-mono text-base font-bold text-[#DC2626]">{component.limit_ua.toFixed(0)} µA</span>
          <span className="text-[10px] text-[#64748B] font-medium">Standard spec ceiling</span>
        </div>

        {/* Metric 2 */}
        <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col justify-between gap-1 shadow-sm">
          <span className="text-[#475569] text-[11px] uppercase font-bold">Lot Median</span>
          <span className="font-mono text-base font-bold text-[#0B1E36]">
            {component.lot_median != null ? `${component.lot_median.toFixed(2)} µA` : component.lot_mean != null ? `${component.lot_mean.toFixed(2)} µA` : '--'}
          </span>
          <span className="text-[10px] text-[#005A9C] truncate font-bold">
            {component.lot_pct_dev != null ? `${component.lot_pct_dev > 0 ? '+' : ''}${component.lot_pct_dev.toFixed(1)}% vs lot median` : 'Lot baseline median'}
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col justify-between gap-1 shadow-sm">
          <span className="text-[#475569] text-[11px] uppercase font-bold">Lot MAD</span>
          <span className="font-mono text-base font-bold text-[#0B1E36]">
            {component.lot_mad != null ? `±${component.lot_mad.toFixed(2)} µA` : component.lot_std != null ? `±${component.lot_std.toFixed(2)} µA` : '--'}
          </span>
          <span className="text-[10px] text-[#64748B] font-medium">Robust absolute deviation</span>
        </div>

        {/* Metric 4 */}
        <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col justify-between gap-1 shadow-sm">
          <span className="text-[#475569] text-[11px] uppercase font-bold">Lot z-Score</span>
          <span className={`font-mono text-base font-bold ${
            Math.abs(component.z168) >= 3 ? 'text-[#DC2626]' : Math.abs(component.z168) >= 2 ? 'text-[#C58A00]' : 'text-[#168A5B]'
          }`}>
            {component.z168 > 0 ? '+' : ''}{component.z168.toFixed(2)}σ
          </span>
          <span className="text-[10px] text-[#64748B] font-medium">Standard normal quantile</span>
        </div>

        {/* Metric 5 */}
        <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col justify-between gap-1 shadow-sm">
          <span className="text-[#475569] text-[11px] uppercase font-bold">Drift % (168h vs 0h)</span>
          <span className={`font-mono text-base font-bold ${
            Math.abs(component.pct_drift) >= 60 ? 'text-[#DC2626]' : Math.abs(component.pct_drift) >= 40 ? 'text-[#C58A00]' : 'text-[#0B1E36]'
          }`}>
            {component.pct_drift > 0 ? '+' : ''}{component.pct_drift.toFixed(1)}%
          </span>
          <span className="text-[10px] text-[#64748B] font-medium">Total burn-in divergence</span>
        </div>

        {/* Metric 6 */}
        <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col justify-between gap-1 shadow-sm">
          <span className="text-[#475569] text-[11px] uppercase font-bold">Drift Slope</span>
          <span className="font-mono text-base font-bold text-[#0B1E36]">{component.slope.toFixed(4)} µA/hr</span>
          <span className="text-[10px] text-[#475569] truncate font-medium">{component.drift_trend || 'NOMINAL / STABLE'}</span>
        </div>

        {/* Metric 7 */}
        <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col justify-between gap-1 shadow-sm">
          <span className="text-[#475569] text-[11px] uppercase font-bold">Predicted 168h (Early)</span>
          <span className="font-mono text-base font-bold text-[#0B1E36]">{component.predicted168_from_early.toFixed(2)} µA</span>
          <span className="text-[10px] text-[#005A9C] truncate font-bold">
            {component.prediction_error_168 != null ? `Error: ±${component.prediction_error_168.toFixed(2)} µA` : '0h-24h early trajectory'}
          </span>
        </div>

        {/* Metric 8 */}
        <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col justify-between gap-1 shadow-sm">
          <span className="text-[#475569] text-[11px] uppercase font-bold">Projected Future (264h)</span>
          <span className={`font-mono text-base font-bold ${
            component.predicted_future > component.limit_ua ? 'text-[#DC2626]' : 'text-[#168A5B]'
          }`}>
            {component.predicted_future.toFixed(2)} µA
          </span>
          <span className="text-[10px] text-[#64748B] truncate font-medium">
            {component.predicted_future > component.limit_ua
              ? `EXCEEDS LIMIT (+${(component.predicted_future - component.limit_ua).toFixed(2)} µA)`
              : component.margin_future != null ? `Margin: ${component.margin_future.toFixed(2)} µA` : 'In-flight projection'}
          </span>
        </div>

        {/* Metric 9 */}
        <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col justify-between gap-1 shadow-sm">
          <span className="text-[#475569] text-[11px] uppercase font-bold">Anomaly Score</span>
          <span className="font-mono text-base font-bold text-[#005A9C]">
            {component.lot_anomaly_score != null ? `${component.lot_anomaly_score.toFixed(1)}` : (component.iso_score * 100).toFixed(1)} / 100
          </span>
          <span className="text-[10px] text-[#64748B] font-medium">Robust Anomaly Rating</span>
        </div>

        {/* Metric 10 */}
        <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] flex flex-col justify-between gap-1 shadow-sm">
          <span className="text-[#475569] text-[11px] uppercase font-bold">Risk Score &amp; Decision</span>
          <span className={`font-mono text-base font-bold ${
            isReject ? 'text-[#DC2626]' : isMonitor ? 'text-[#D97706]' : 'text-[#168A5B]'
          }`}>
            {component.risk_score} / 100 [{(component.status || 'safe').toUpperCase()}]
          </span>
          <span className="text-[10px] text-[#475569] truncate font-medium">
            {component.risk_score >= 75 ? 'QUARANTINE THRESHOLD' : component.risk_score >= 40 ? 'MONITORING ACTIVE' : 'FLIGHT READY'}
          </span>
        </div>
      </div>

      {/* WHY THIS COMPONENT WAS FLAGGED (Explainable AI Panel) */}
      <div className="pt-2 border-t border-[#D7E0EA]">
        <div className="text-[11px] uppercase font-bold text-[#475569] tracking-wider mb-2.5 flex items-center justify-between font-sans">
          <span className="flex items-center gap-1.5 text-[#0B1E36]">
            <span className="text-[#D97706] font-bold">&gt;&gt;</span> WHY WAS THIS COMPONENT FLAGGED?
          </span>
          <span className="text-[10px] text-[#92400E] font-mono font-bold bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FDE68A]">
            XAI EXPLAINABLE INTELLIGENCE ENGINE
          </span>
        </div>
        <div
          className={`p-3.5 rounded-xl border text-xs font-sans leading-relaxed space-y-2 ${
            isReject
              ? 'bg-[#FEF2F2] border-[#FECACA] text-[#0B1E36]'
              : isMonitor
              ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#0B1E36]'
              : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#0B1E36]'
          }`}
        >
          {explanationPoints.map((pt, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <span className="font-mono font-bold text-[#005A9C]">{idx + 1}.</span>
              <span className="leading-relaxed font-medium">{pt}</span>
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

