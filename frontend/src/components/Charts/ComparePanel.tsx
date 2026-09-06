import type { ComponentOut } from '../../types'

export default function ComparePanel({ component }: { component: ComponentOut | null }) {
  const aiColor = component
    ? component.status === 'reject'
      ? 'text-reject text-glow-red'
      : component.status === 'monitor'
      ? 'text-monitor'
      : 'text-safe text-glow-green'
    : 'text-muted'

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] bg-panel2 border-b border-line p-3.5 relative">
      <div className="px-3 border-r border-line/60">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-muted" />
          <h4 className="m-0 text-[10px] font-display tracking-widest uppercase text-muted">Traditional Static Limit</h4>
        </div>
        <div className="font-mono text-xl font-bold text-slate-200">
          {component ? component.traditional_decision : 'STATIC SPEC PASS'}
        </div>
        <div className="text-[11px] font-mono text-muted mt-1 leading-relaxed">
          {component
            ? component.traditional_decision === 'PASS'
              ? `${component.v168.toFixed(2)}\u00b5A < ${component.limit_ua.toFixed(0)}\u00b5A (STATIC PASS)`
              : `${component.v168.toFixed(2)}\u00b5A > ${component.limit_ua.toFixed(0)}\u00b5A (EXCEEDED LIMIT)`
            : 'Fixed datasheet limits allow latent parametric drift to bypass screening.'}
        </div>
      </div>

      <div className="flex items-center justify-center text-cyan text-lg px-2 text-glow-cyan font-mono">
        &harr;
      </div>

      <div className="px-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${component ? (component.status === 'reject' ? 'bg-reject dot-pulse' : 'bg-safe dot-pulse') : 'bg-safe dot-pulse'}`} />
          <h4 className="m-0 text-[10px] font-display tracking-widest uppercase text-cyan">SpaceGuard AI Dynamic</h4>
        </div>
        <div className={`font-mono text-xl font-bold ${aiColor}`}>
          {component ? component.status.toUpperCase() : 'AI MONITORING'}
        </div>
        <div className="text-[11px] font-mono text-slate-200 mt-1 leading-relaxed">
          {component ? component.reason : 'Lot-relative Median/MAD + Isolation Forest pre-empts catastrophic orbit failure.'}
        </div>
      </div>

      <div className="col-span-3 text-center font-mono text-[10.5px] text-cyan tracking-wider pt-2 border-t border-dashed border-line/70 mt-2">
        <span className="text-safe font-bold">&gt;&gt;&gt;</span> <span className="text-white font-semibold">"WITHIN LIMIT &ne; HEALTHY"</span> &mdash; <span className="text-slate-300">AI catches anomalous drift before catastrophic failure.</span>
      </div>
    </div>
  )
}
