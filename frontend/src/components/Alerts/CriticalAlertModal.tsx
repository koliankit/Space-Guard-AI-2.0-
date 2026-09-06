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
      <div className="w-[440px] max-w-[94vw] bg-[#0E0914] border-2 border-reject/90 rounded-lg p-6 shadow-alert-glow modal-anim reticle-corner-red">
        <div className="flex items-center gap-2 text-reject font-display font-bold text-sm tracking-wider mb-2 text-glow-red">
          <span className="text-lg led">&#9888;</span> CRITICAL COMPONENT ANOMALY DETECTED
        </div>
        <div className="text-xl font-mono font-black text-white">{component.component_id}</div>
        <div className="text-xs font-mono text-cyan mb-4 font-semibold">
          {component.subsystem_name} &bull; [{component.subsystem}] &bull; Lot {component.lot_id}
        </div>

        <div className="text-xs font-mono space-y-2 bg-[#060C18] p-3 rounded border border-line mb-4">
          <div className="flex justify-between border-b border-dashed border-line/60 pb-1">
            <span className="text-muted">Anomaly Risk Score:</span>
            <b className="text-reject text-sm">{component.risk_score} / 100</b>
          </div>
          <div className="flex justify-between border-b border-dashed border-line/60 pb-1">
            <span className="text-muted">Current Leakage (168h):</span>
            <b className="text-white">{component.v168.toFixed(2)} &micro;A</b>
          </div>
          <div className="flex justify-between border-b border-dashed border-line/60 pb-1">
            <span className="text-muted">Projected (+96h Future):</span>
            <b className="text-monitor font-bold">{component.predicted_future.toFixed(2)} &micro;A</b>
          </div>
          <div className="flex justify-between border-b border-dashed border-line/60 pb-1">
            <span className="text-muted">Datasheet Limit:</span>
            <b className="text-slate-300">{component.limit_ua.toFixed(0)} &micro;A</b>
          </div>
          <div className="flex justify-between pt-0.5">
            <span className="text-muted">AI Screening Verdict:</span>
            <b className="text-reject bg-reject/20 px-2 py-0.5 rounded border border-reject/50">REJECT (ANOMALOUS DRIFT)</b>
          </div>
        </div>

        <button
          type="button"
          className="w-full font-display text-xs uppercase tracking-wider px-4 py-2.5 rounded bg-reject/25 border border-reject text-white font-bold hover:bg-reject hover:text-black transition-all shadow-alert-glow flex items-center justify-center gap-2"
          onClick={onAcknowledge}
        >
          <span>&#10003;</span> ACKNOWLEDGE &amp; LOCK TARGET ON SATELLITE
        </button>
      </div>
    </div>
  )
}
