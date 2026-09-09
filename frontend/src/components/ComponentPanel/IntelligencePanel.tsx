import type { ComponentOut } from '../../types'

function Row({
  k,
  v,
  highlight,
  isAlert,
  sub,
}: {
  k: string
  v: string
  highlight?: boolean
  isAlert?: boolean
  sub?: string
}) {
  const valueColor = highlight
    ? isAlert
      ? 'text-rose-400 font-bold'
      : 'text-emerald-400 font-bold'
    : 'text-slate-100'

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-dashed border-slate-800 text-xs font-sans gap-2">
      <span className="text-slate-400">{k}</span>
      <div className="text-right">
        <span className={`font-mono font-bold ${valueColor}`}>{v}</span>
        {sub && <span className="text-[10px] text-slate-500 block font-sans">{sub}</span>}
      </div>
    </div>
  )
}

export default function IntelligencePanel({ component }: { component: ComponentOut | null }) {
  if (!component) {
    return (
      <div className="bg-[#0B1120] p-4 rounded-xl border border-slate-800 flex flex-col justify-center items-center text-center font-sans">
        <h3 className="m-0 mb-3 text-xs font-bold uppercase tracking-wide text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
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

  // Generate structured explanation points if not already present
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
    <div className="bg-[#0B1120] p-4 rounded-xl border border-slate-800 flex flex-col h-full overflow-y-auto font-sans text-xs shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
        <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          Component Intelligence
        </h3>
        <div className="flex items-center gap-1.5">
          {/* Behavioral Health Badge */}
          <span
            className={`font-mono text-[9.5px] uppercase font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 ${
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
            className={`font-mono text-[9.5px] uppercase font-bold px-2 py-0.5 rounded border ${
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
      <div className="bg-[#070D1A] p-3 rounded-lg border border-slate-800 mb-3">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-bold text-white font-mono">
            {component.component_id}
          </div>
          <div className="text-[10.5px] text-slate-400 font-mono">
            Lot: <span className="text-slate-200 font-bold">{component.lot_id}</span>
          </div>
        </div>
        <div className="text-xs text-sky-400 mt-1 font-medium flex items-center justify-between">
          <span>{component.subsystem_name} &bull; [{component.subsystem}]</span>
          <span className="text-[10px] text-slate-400 uppercase font-mono">{component.parameter || 'Leakage Current (µA)'}</span>
        </div>
      </div>

      {/* Traditional vs AI Verdict Comparison Box */}
      <div className="mb-3 p-3 rounded-lg bg-[#070D1A] border border-slate-800 text-xs space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Traditional Spec Check:</span>
          <b className={`px-2 py-0.5 rounded font-mono text-xs ${component.traditional_decision === 'PASS' ? 'text-emerald-300 bg-emerald-500/15' : 'text-rose-300 bg-rose-500/15'}`}>
            {component.traditional_decision} (&le; {component.limit_ua} µA)
          </b>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">AI Lot-Relative Verdict:</span>
          <b className={`px-2 py-0.5 rounded font-mono text-xs ${isReject ? 'text-rose-300 bg-rose-500/20' : isMonitor ? 'text-amber-300 bg-amber-500/20' : 'text-emerald-300 bg-emerald-500/20'}`}>
            {component.status.toUpperCase()} &bull; Risk {component.risk_score}/100
          </b>
        </div>
        {isAbnormalInSpec ? (
          <div className="p-2 rounded bg-purple-500/15 border border-purple-400/40 text-[11px] text-purple-200 font-medium">
            <span className="text-amber-300 font-bold">&#9888; Latent Defect:</span> Passes Static Limit (&le; {component.limit_ua} µA) but diverges abnormal from lot cohort ({component.z168 > 0 ? '+' : ''}{component.z168.toFixed(1)}σ).
          </div>
        ) : (
          <div className="pt-1 text-[10.5px] text-slate-400 border-t border-slate-800 flex justify-between">
            <span>Evaluation Protocol:</span>
            <span className="text-slate-300 font-mono font-semibold">MIL-STD-883 HTOL 168H</span>
          </div>
        )}
      </div>

      {/* Burn-In Measurements (0h, 24h, 96h, 168h) */}
      <div className="mb-3.5 p-3 rounded-lg bg-[#070D1A] border border-slate-800">
        <div className="text-[10px] text-slate-400 uppercase font-semibold mb-2 flex items-center justify-between">
          <span>HTOL Burn-In Measurements</span>
          <span className="text-sky-400 text-[10px] font-mono">MIL-STD-883 M1005</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center font-mono">
          <div className="bg-[#0F172A] p-2 rounded-lg border border-slate-800">
            <div className="text-[9.5px] text-slate-400 mb-0.5">0h</div>
            <div className="text-white font-bold text-xs">{component.v0.toFixed(2)}</div>
          </div>
          <div className="bg-[#0F172A] p-2 rounded-lg border border-slate-800">
            <div className="text-[9.5px] text-slate-400 mb-0.5">24h</div>
            <div className="text-white font-bold text-xs">{component.v24.toFixed(2)}</div>
          </div>
          <div className="bg-[#0F172A] p-2 rounded-lg border border-slate-800">
            <div className="text-[9.5px] text-slate-400 mb-0.5">96h</div>
            <div className="text-white font-bold text-xs">{component.v96 != null ? component.v96.toFixed(2) : '--'}</div>
          </div>
          <div className="bg-[#0F172A] p-2 rounded-lg border border-slate-800">
            <div className="text-[9.5px] text-slate-400 mb-0.5">168h</div>
            <div className={`font-bold text-xs ${isReject ? 'text-rose-400' : 'text-sky-400'}`}>{component.v168.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Dynamic Telemetry Metrics Table (All 18 Parameters) */}
      <div className="space-y-0.5 mb-3.5">
        <Row k="Datasheet Limit" v={`${component.limit_ua.toFixed(0)} µA`} />
        <Row
          k="Lot Average (µ)"
          v={component.lot_mean != null ? `${component.lot_mean.toFixed(2)} µA` : '--'}
          sub={component.lot_pct_dev != null ? `${component.lot_pct_dev > 0 ? '+' : ''}${component.lot_pct_dev.toFixed(1)}% vs lot mean` : undefined}
        />
        <Row
          k="Lot Deviation (σ)"
          v={component.lot_std != null ? `±${component.lot_std.toFixed(2)} µA` : '--'}
        />
        <Row
          k="Lot z-Score"
          v={`${component.z168 > 0 ? '+' : ''}${component.z168.toFixed(2)}σ`}
          highlight={Math.abs(component.z168) >= 2.0}
          isAlert={Math.abs(component.z168) >= 3.0}
        />
        <Row
          k="Drift % (168h vs 0h)"
          v={`${component.pct_drift > 0 ? '+' : ''}${component.pct_drift.toFixed(1)}%`}
          highlight={Math.abs(component.pct_drift) >= 40}
          isAlert={Math.abs(component.pct_drift) >= 60}
        />
        <Row
          k="Drift Slope"
          v={`${component.slope.toFixed(4)} µA/hr`}
          sub={component.drift_trend || 'NOMINAL / STABLE'}
        />
        <Row
          k="Predicted 168h (from 0h+24h)"
          v={`${component.predicted168_from_early.toFixed(2)} µA`}
          sub={component.prediction_error_168 != null ? `Error vs 168h: ±${component.prediction_error_168.toFixed(2)} µA` : undefined}
        />
        <Row
          k="Projected Future (264h)"
          v={`${component.predicted_future.toFixed(2)} µA`}
          highlight={component.predicted_future > component.limit_ua}
          isAlert={component.predicted_future > component.limit_ua}
          sub={
            component.predicted_future > component.limit_ua
              ? `PREDICTED LIMIT EXCEEDANCE (+${(component.predicted_future - component.limit_ua).toFixed(2)} µA)`
              : component.margin_future != null
              ? `Margin: ${component.margin_future.toFixed(2)} µA`
              : undefined
          }
        />
        <Row k="Anomaly Score" v={`${component.iso_score.toFixed(1)} / 100`} />
        <Row
          k="Risk Score & Decision"
          v={`${component.risk_score} / 100 [${component.status.toUpperCase()}]`}
          highlight
          isAlert={isReject}
          sub={component.risk_score >= 75 ? 'QUARANTINE THRESHOLD EXCEEDED' : component.risk_score >= 40 ? 'ACTIVE TELEMETRY MONITORING' : 'FLIGHT READY'}
        />
      </div>

      {/* WHY THIS COMPONENT WAS FLAGGED (Explainable AI Panel) */}
      <div className="mt-auto pt-3 border-t border-slate-800">
        <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-2 flex items-center justify-between font-sans">
          <span className="flex items-center gap-1.5">
            <span className="text-sky-400 font-bold">&gt;&gt;</span> WHY WAS THIS COMPONENT FLAGGED?
          </span>
          <span className="text-[9.5px] text-sky-400 font-mono font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
            XAI ENGINE
          </span>
        </div>
        <div
          className={`p-3 rounded-lg border text-[11px] font-sans leading-relaxed space-y-1.5 ${
            isReject
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              : isMonitor
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          }`}
        >
          {explanationPoints.map((pt, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="font-mono font-bold opacity-75">{idx + 1}.</span>
              <span>{pt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
