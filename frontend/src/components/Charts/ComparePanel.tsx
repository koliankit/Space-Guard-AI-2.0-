import type { ComponentOut } from '../../types'

export default function ComparePanel({ component }: { component: ComponentOut | null }) {
  const isReject = component?.status === 'reject'
  const isMonitor = component?.status === 'monitor'
  const isAbnormalInSpec = component?.traditional_decision === 'PASS' && component?.status !== 'safe'

  const aiColor = component
    ? isReject
      ? 'text-[#E5484D] font-bold'
      : isMonitor
      ? 'text-[#F2B84B] font-bold'
      : 'text-[#22A06B] font-bold'
    : 'text-[#9AAFC0]'

  return (
    <div className="bg-[#102337] rounded-xl border border-[#1D3A52] p-4 flex flex-col font-sans text-xs shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#1D3A52] mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0E88D3]" />
          <h4 className="m-0 text-xs font-bold tracking-wider uppercase text-[#F1F5F9] font-display">
            Screening Paradigm Comparison
          </h4>
        </div>
        <span className="text-[10px] font-mono text-[#F47216] bg-[#F47216]/10 px-2 py-0.5 rounded border border-[#F47216]/30 font-semibold">
          ISRO QUALIFICATION PROTOCOL
        </span>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {/* Traditional Approach */}
        <div className="p-3.5 rounded-lg bg-[#0B1928] border border-[#1D3A52] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] uppercase font-bold text-[#9AAFC0] flex items-center gap-1.5">
                <span className="text-[#E5484D] font-black">&#10006;</span> Traditional Screening
              </span>
              <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#102337] text-[#9AAFC0] font-mono border border-[#1D3A52]">
                Static Limit
              </span>
            </div>
            <div className="text-sm font-bold text-[#F1F5F9] mb-1">
              {component ? `${component.traditional_decision}` : 'PASS / FAIL'}
            </div>
            <div className="text-[11px] text-[#9AAFC0] leading-relaxed italic mb-2">
              "Is the component within the datasheet limit?"
            </div>
            <div className="p-2 rounded bg-[#102337] text-[10.5px] text-[#F1F5F9] border border-[#1D3A52] font-sans">
              {component ? (
                <span>
                  168h Value: <b className="font-mono text-[#F1F5F9]">{component.v168.toFixed(2)} µA</b> &le; Spec Limit: <b className="font-mono text-[#F1F5F9]">{component.limit_ua} µA</b>
                </span>
              ) : (
                <span>Fixed limit check only. Latent drifts pass silently.</span>
              )}
            </div>
          </div>
          <div className="text-[10px] text-[#6F8495] mt-2 font-mono">
            Blind to lot manufacturing shifts &amp; time-series drift acceleration.
          </div>
        </div>

        {/* SpaceGuard AI Layer */}
        <div className="p-3.5 rounded-lg bg-[#142B40] border border-[#0E88D3]/40 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] uppercase font-bold text-[#0E88D3] flex items-center gap-1.5 font-display">
                <span className="text-[#22A06B] font-black">&#10003;</span> SpaceGuard AI Screening
              </span>
              <span className="text-[9.5px] px-2 py-0.5 rounded bg-[#0E88D3]/15 text-[#0E88D3] border border-[#0E88D3]/30 font-semibold font-mono">
                Behavioral Intelligence
              </span>
            </div>
            <div className={`text-sm font-bold mb-1 ${aiColor}`}>
              {component ? `${(component.status || 'safe').toUpperCase()} (${component.risk_score}/100)` : 'PREDICTIVE VERDICT'}
            </div>
            <div className="text-[11px] text-[#9AAFC0] leading-relaxed italic mb-2">
              "Is it behaving normally, and where is its behavior heading?"
            </div>
            <div className="p-2 rounded bg-[#0B1928] text-[10.5px] text-[#F1F5F9] border border-[#1D3A52] font-sans">
              {component ? (
                <span>
                  Lot µ: <b className="font-mono text-[#F1F5F9]">{component.lot_mean?.toFixed(1) ?? '--'} µA</b> &bull; z: <b className="font-mono text-[#F1F5F9]">{component.z168 > 0 ? '+' : ''}{component.z168.toFixed(1)}σ</b> &bull; Pred 168h: <b className="font-mono text-[#F1F5F9]">{component.predicted168_from_early.toFixed(1)} µA</b>
                </span>
              ) : (
                <span>Lot baseline + drift rate + 168h prediction + 3D localization.</span>
              )}
            </div>
          </div>
          {isAbnormalInSpec ? (
            <div className="mt-2 text-[10px] text-[#F47216] font-semibold">
              &#9888; Identified latent defect passing static specs but abnormal to lot peers.
            </div>
          ) : (
            <div className="text-[10px] text-[#9AAFC0] mt-2 font-mono">
              Domain-specific integration of robust statistics &amp; machine learning.
            </div>
          )}
        </div>
      </div>

      {/* Tagline & Core Intelligence Workflow Banner */}
      <div className="pt-2.5 border-t border-[#1D3A52] text-center">
        <div className="text-[10.5px] font-medium tracking-wide flex items-center justify-center gap-2 flex-wrap">
          <span className="text-[#E5484D] font-bold">WITHIN LIMIT &ne; ALWAYS HEALTHY</span>
          <span className="text-[#6F8495]">&bull;</span>
          <span className="text-[#9AAFC0] font-mono">Detect &rarr; Understand &rarr; Predict &rarr; Localize &rarr; Decide</span>
        </div>
      </div>
    </div>
  )
}

