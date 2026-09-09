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
      ? 'text-rose-400 font-bold text-glow-red'
      : 'text-emerald-400 font-bold text-glow-green'
    : 'text-slate-100'

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-dashed border-slate-800 text-xs font-mono gap-2">
      <span className="text-slate-400">{k}</span>
      <div className="text-right">
        <span className={`font-bold ${valueColor}`}>{v}</span>
        {sub && <span className="text-[9.5px] text-slate-500 block">{sub}</span>}
      </div>
    </div>
  )
}

export default function IntelligencePanel({ component }: { component: ComponentOut | null }) {
  if (!component) {
    return (
      <div className="bg-[#090F1E] p-4 rounded-xl border border-slate-800 flex flex-col justify-center items-center text-center">
        <h3 className="m-0 mb-3 text-[11px] font-display tracking-widest uppercase text-cyan text-glow-cyan flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan led" />
          Component Intelligence
        </h3>
        <div className="text-slate-400 text-xs font-mono leading-relaxed py-6 px-3 border border-dashed border-slate-800 rounded-lg max-w-xs">
          [ TARGET ACQUISITION ]<br />
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
    <div className="bg-[#090F1E] p-4 rounded-xl border border-slate-800 flex flex-col h-full overflow-y-auto font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
        <h3 className="m-0 text-[11px] font-display tracking-widest uppercase text-cyan text-glow-cyan flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan led" />
          Component Intelligence
        </h3>
        <div className="flex items-center gap-1.5">
          {/* Behavioral Health Badge */}
          <span
            className={`font-mono text-[9px] uppercase font-black px-2 py-0.5 rounded border flex items-center gap-1 ${
              bHealth === 'CRITICAL'
                ? 'bg-rose-500/25 text-rose-400 border-rose-500/60 shadow-alert-glow'
                : bHealth === 'DEGRADING'
                ? 'bg-amber-500/25 text-amber-400 border-amber-500/60'
                : bHealth === 'MONITOR'
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}
            title="Component Behavioral Health State"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${bHealth === 'CRITICAL' ? 'bg-rose-500 led' : bHealth === 'DEGRADING' ? 'bg-orange-400' : bHealth === 'MONITOR' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            {bHealth}
          </span>
          <span
            className={`font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
              isReject
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : isMonitor
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}
          >
            {component.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Target Component Identifier Card */}
      <div className="bg-[#060D1A] p-3 rounded-lg border border-slate-800 mb-3">
        <div className="flex items-baseline justify-between">
          <div className="text-base font-bold text-white tracking-wide">
            {component.component_id}
          </div>
          <div className="text-[10px] text-slate-400">
            LOT: <span className="text-cyan font-bold">{component.lot_id}</span>
          </div>
        </div>
        <div className="text-[11px] text-emerald-400 mt-0.5 font-semibold flex items-center justify-between">
          <span>{component.subsystem_name} &bull; [{component.subsystem}]</span>
          <span className="text-[10px] text-slate-400 uppercase font-mono">{component.parameter || 'Leakage Current (µA)'}</span>
        </div>
      </div>

      {/* Traditional vs AI Verdict Comparison Box */}
      <div className="mb-3 p-2.5 rounded-lg bg-[#0A1428] border border-cyan/30 text-[10.5px] space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Traditional Spec Check:</span>
          <b className={`px-1.5 py-0.2 rounded font-mono ${component.traditional_decision === 'PASS' ? 'text-emerald-400 bg-emerald-500/15' : 'text-rose-400 bg-rose-500/15'}`}>
            {component.traditional_decision} (&le; {component.limit_ua} µA)
          </b>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">AI Lot-Relative Verdict:</span>
          <b className={`px-1.5 py-0.2 rounded font-mono ${isReject ? 'text-rose-400 bg-rose-500/15' : isMonitor ? 'text-amber-400 bg-amber-500/15' : 'text-emerald-400 bg-emerald-500/15'}`}>
            {component.status.toUpperCase()} &bull; {component.risk_score}/100 RISK
          </b>
        </div>
        {isAbnormalInSpec ? (
          <div className="p-1.5 rounded bg-purple-500/20 border border-purple-400/50 text-[10px] text-purple-200 font-bold">
            <span className="text-amber-300">&#9888; LATENT DEFECT:</span> Within Specification (&le; {component.limit_ua} µA) but ABNORMAL Relative to Lot Cohort ({component.z168 > 0 ? '+' : ''}{component.z168.toFixed(1)}σ).
          </div>
        ) : (
          <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800/80 flex justify-between">
            <span>Behavioral Paradigm:</span>
            <span className="text-cyan font-bold">WITHIN LIMIT &ne; ALWAYS HEALTHY</span>
          </div>
        )}
      </div>

      {/* Burn-In Measurements (0h, 24h, 96h, 168h) */}
      <div className="mb-3 p-2.5 rounded-lg bg-[#060D1A] border border-slate-800">
        <div className="text-[10px] text-slate-400 uppercase font-bold mb-1.5 flex items-center justify-between">
          <span>HTOL BURN-IN READINGS</span>
          <span className="text-cyan text-[9px]">MIL-STD-883 METHOD 1005</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-[#091122] p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">0h</div>
            <div className="text-white font-bold text-xs">{component.v0.toFixed(2)}</div>
          </div>
          <div className="bg-[#091122] p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">24h</div>
            <div className="text-white font-bold text-xs">{component.v24.toFixed(2)}</div>
          </div>
          <div className="bg-[#091122] p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">96h</div>
            <div className="text-white font-bold text-xs">{component.v96 != null ? component.v96.toFixed(2) : '--'}</div>
          </div>
          <div className="bg-[#091122] p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">168h</div>
            <div className={`font-bold text-xs ${isReject ? 'text-rose-400' : 'text-cyan'}`}>{component.v168.toFixed(2)}</div>
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
        <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="text-cyan font-bold">&gt;&gt;</span> WHY WAS THIS COMPONENT FLAGGED?
          </span>
          <span className="text-[9px] text-cyan font-bold">XAI ENGINE</span>
        </div>
        <div
          className={`p-3 rounded-lg border text-[10.5px] font-mono leading-relaxed space-y-1.5 ${
            isReject
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
              : isMonitor
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
              : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
          }`}
        >
          {explanationPoints.map((pt, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span className="font-bold opacity-80">{idx + 1}.</span>
              <span>{pt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
