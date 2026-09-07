import type { ComponentOut } from '../../types'

export default function CriticalAlertModal({
  component,
  onAcknowledge,
}: {
  component: ComponentOut
  onAcknowledge: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="w-[460px] max-w-[94vw] bg-[#0C1220] border-2 border-rose-500/80 rounded-xl p-6 shadow-alert-glow modal-anim relative font-mono">
        <button
          type="button"
          onClick={onAcknowledge}
          className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white text-sm w-6 h-6 flex items-center justify-center rounded hover:bg-slate-800 transition-colors"
          title="Close Dialog"
        >
          &#10005;
        </button>

        <div className="flex items-center gap-2 text-rose-400 font-display font-bold text-xs tracking-wider mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 led" />
          <span>CRITICAL COMPONENT ANOMALY DETECTED</span>
        </div>
        <div className="text-2xl font-mono font-black text-white">{component.component_id}</div>
        <div className="text-xs font-mono text-cyan mb-4 font-semibold">
          {component.subsystem_name} &bull; [{component.subsystem}] &bull; Lot {component.lot_id}
        </div>

        <div className="text-xs font-mono space-y-2.5 bg-[#060B16] p-3.5 rounded-lg border border-slate-800 mb-5">
          <div className="flex justify-between border-b border-dashed border-slate-800 pb-1.5">
            <span className="text-slate-400">Anomaly Risk Score:</span>
            <b className="text-rose-400 text-sm font-bold">{component.risk_score} / 100</b>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-800 pb-1.5">
            <span className="text-slate-400">Current Leakage (168h):</span>
            <b className="text-white font-bold">{component.v168.toFixed(2)} &micro;A</b>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-800 pb-1.5">
            <span className="text-slate-400">Projected (+96h Future):</span>
            <b className="text-amber-400 font-bold">{component.predicted_future.toFixed(2)} &micro;A</b>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-800 pb-1.5">
            <span className="text-slate-400">Datasheet Limit:</span>
            <b className="text-slate-300">{component.limit_ua.toFixed(0)} &micro;A</b>
          </div>
          <div className="flex justify-between pt-0.5 items-center">
            <span className="text-slate-400">AI Screening Verdict:</span>
            <b className="text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/50 text-[11px]">
              REJECT (LATENT OXIDE DRIFT)
            </b>
          </div>
        </div>

        <button
          type="button"
          className="w-full font-display text-xs uppercase tracking-wider px-4 py-3 rounded-lg bg-rose-500 text-black font-black hover:bg-rose-400 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          onClick={onAcknowledge}
        >
          <span>&#10003;</span> ACKNOWLEDGE &amp; LOCK TARGET ON SATELLITE
        </button>
      </div>
    </div>
  )
}
