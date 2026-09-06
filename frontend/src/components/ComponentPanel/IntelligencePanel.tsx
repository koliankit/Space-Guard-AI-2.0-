import type { ComponentOut } from '../../types'

function Row({ k, v, highlight, isAlert }: { k: string; v: string; highlight?: boolean; isAlert?: boolean }) {
  const valueColor = highlight
    ? isAlert
      ? 'text-reject text-glow-red'
      : 'text-safe text-glow-green'
    : 'text-slate-100'

  return (
    <div className="flex justify-between py-1.5 border-b border-dashed border-line/70 text-xs gap-2 font-mono">
      <span className="text-muted">{k}</span>
      <span className={`text-right font-bold ${valueColor}`}>
        {v}
      </span>
    </div>
  )
}

export default function IntelligencePanel({ component }: { component: ComponentOut | null }) {
  if (!component) {
    return (
      <div className="bg-panel p-4 border-l border-line flex flex-col justify-center items-center text-center">
        <h3 className="m-0 mb-3 text-[11px] font-display tracking-widest uppercase text-cyan text-glow-cyan flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan led" />
          Component Intelligence
        </h3>
        <div className="text-muted text-xs font-mono leading-relaxed py-6 px-3 border border-dashed border-line/60 rounded max-w-xs">
          [ TARGET ACQUISITION ]<br />
          Select a component on the 3D Satellite or Component Monitor to run AI diagnostic telemetry.
        </div>
      </div>
    )
  }

  const isReject = component.status === 'reject'
  const isMonitor = component.status === 'monitor'

  return (
    <div className="bg-panel p-4 border-l border-line flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line mb-3">
        <h3 className="m-0 text-[11px] font-display tracking-widest uppercase text-cyan text-glow-cyan flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan led" />
          AI Diagnostic Intelligence
        </h3>
        <span
          className={`font-mono text-[9.5px] uppercase font-bold px-2 py-0.5 rounded border ${
            isReject
              ? 'bg-reject/20 text-reject border-reject/40'
              : isMonitor
              ? 'bg-monitor/20 text-monitor border-monitor/40'
              : 'bg-safe/20 text-safe border-safe/40'
          }`}
        >
          {component.status.toUpperCase()}
        </span>
      </div>

      {/* Target Component Identifier Card */}
      <div className="bg-[#061224] p-3 rounded border border-line mb-3.5 reticle-corner">
        <div className="flex items-baseline justify-between">
          <div className="font-mono text-lg font-bold text-cyan text-glow-cyan">
            {component.component_id}
          </div>
          <div className="font-mono text-xs text-muted">
            LOT: <span className="text-white font-bold">{component.lot_id}</span>
          </div>
        </div>
        <div className="text-[11px] font-mono text-safe mt-0.5 font-semibold">
          {component.subsystem_name} &bull; [{component.subsystem}]
        </div>
      </div>

      {/* Dynamic Telemetry Metrics Table */}
      <div className="space-y-0.5 mb-3.5">
        <Row k="Parameter" v="Leakage Current (µA)" />
        <Row k="Current Reading (168h)" v={`${component.v168.toFixed(2)} µA`} highlight isAlert={isReject} />
        <Row k="Datasheet Limit" v={`${component.limit_ua.toFixed(0)} µA`} />
        <Row
          k="Lot Anomaly (z-score)"
          v={`${component.z168 > 0 ? '+' : ''}${component.z168.toFixed(2)}σ`}
          highlight={Math.abs(component.z168) > 2.5}
          isAlert={isReject}
        />
        <Row k="Drift Rate (slope)" v={`${component.slope.toFixed(4)} µA/hr`} />
        <Row k="Percent Drift (pct_drift)" v={`${component.pct_drift.toFixed(1)}%`} />
        <Row k="Isolation Forest Score" v={`${component.iso_score.toFixed(1)} / 100`} />
        {component.ml_prob != null && (
          <Row k="ML Defect Probability" v={`${(component.ml_prob * 100).toFixed(1)}%`} highlight isAlert={isReject} />
        )}
        <Row k="Projected (+96h future)" v={`${component.predicted_future.toFixed(2)} µA`} />
        <Row k="Composite Risk Score" v={`${component.risk_score} / 100`} highlight isAlert={isReject} />
      </div>

      {/* AI Diagnostic Reasoning Box */}
      <div className="mt-auto pt-3 border-t border-line">
        <div className="text-[10px] font-mono uppercase text-muted tracking-wider mb-1.5 flex items-center gap-1.5">
          <span className="text-cyan font-bold">&gt;&gt;</span> AI Analysis Rationale:
        </div>
        <div
          className={`p-2.5 rounded border text-[11px] font-mono leading-relaxed ${
            isReject
              ? 'bg-reject/10 border-reject/40 text-rose-200'
              : isMonitor
              ? 'bg-monitor/10 border-monitor/40 text-amber-200'
              : 'bg-safe/10 border-safe/40 text-emerald-200'
          }`}
        >
          {component.reason}
        </div>
      </div>
    </div>
  )
}
