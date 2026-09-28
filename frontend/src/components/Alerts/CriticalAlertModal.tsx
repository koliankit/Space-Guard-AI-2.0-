import type { ComponentOut } from '../../types'

export default function CriticalAlertModal({
  component,
  onAcknowledge,
}: {
  component: ComponentOut
  onAcknowledge: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-[460px] max-w-[94vw] bg-[#FFFFFF] border-2 border-rose-500 rounded-lg p-6 shadow-xl relative font-mono">
        <button
          type="button"
          onClick={onAcknowledge}
          className="absolute top-3.5 right-3.5 text-[#64748B] hover:text-[#0F1D2E] text-sm w-6 h-6 flex items-center justify-center rounded hover:bg-[#F8FAFC] transition-colors"
          title="Close Dialog"
        >
          &#10005;
        </button>

        <div className="flex items-center gap-2 text-rose-600 font-display font-bold text-xs tracking-wider mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
          <span>CRITICAL COMPONENT ANOMALY DETECTED</span>
        </div>
        <div className="text-2xl font-mono font-black text-[#0F1D2E]">{component.component_id}</div>
        <div className="text-xs font-mono text-amber-600 mb-4 font-semibold">
          {component.subsystem_name} &bull; [{component.subsystem}] &bull; Lot {component.lot_id}
        </div>

        <div className="text-xs font-mono space-y-2.5 bg-[#F8FAFC] p-3.5 rounded-lg border border-[#D5DEE7] mb-5">
          <div className="flex justify-between border-b border-dashed border-[#D5DEE7] pb-1.5">
            <span className="text-[#64748B]">Anomaly Risk Score:</span>
            <b className="text-rose-600 text-sm font-bold">{component.risk_score} / 100</b>
          </div>
          <div className="flex justify-between border-b border-dashed border-[#D5DEE7] pb-1.5">
            <span className="text-[#64748B]">Current Leakage (168h):</span>
            <b className="text-[#0F1D2E] font-bold">{component.v168.toFixed(2)} &micro;A</b>
          </div>
          <div className="flex justify-between border-b border-dashed border-[#D5DEE7] pb-1.5">
            <span className="text-[#64748B]">Projected (+96h Future):</span>
            <b className="text-amber-600 font-bold">{component.predicted_future.toFixed(2)} &micro;A</b>
          </div>
          <div className="flex justify-between border-b border-dashed border-[#D5DEE7] pb-1.5">
            <span className="text-[#64748B]">Datasheet Limit:</span>
            <b className="text-[#64748B]">{component.limit_ua.toFixed(0)} &micro;A</b>
          </div>
          <div className="flex justify-between pt-0.5 items-center">
            <span className="text-[#64748B]">AI Screening Verdict:</span>
            <b className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px] font-bold">
              REJECT (LATENT OXIDE DRIFT)
            </b>
          </div>
        </div>

        <button
          type="button"
          className="w-full font-display text-xs uppercase tracking-wider px-4 py-3 rounded bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          onClick={onAcknowledge}
        >
          <span>&#10003;</span> ACKNOWLEDGE &amp; LOCK TARGET ON SATELLITE
        </button>
      </div>
    </div>
  )
}
