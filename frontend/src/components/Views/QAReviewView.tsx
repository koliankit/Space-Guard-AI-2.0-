import React, { useState, useMemo } from 'react'
import type { ComponentOut, MissionStatus } from '../../types'
import { updateQAReview } from '../../api'
import { sounds } from '../../utils/soundEffects'

interface QAReviewViewProps {
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  mission: MissionStatus | null
  batchId?: number | null
  onNavigateToTab?: (tab: string) => void
}

export default function QAReviewView({
  components,
  selected,
  onSelectComponent,
  mission,
  batchId,
  onNavigateToTab,
}: QAReviewViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [qaFilter, setQaFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED'>('ALL')
  const [aiStatusFilter, setAiStatusFilter] = useState<'ALL' | 'reject' | 'monitor' | 'safe'>('ALL')

  // Local state for active component review edits
  const [localDecision, setLocalDecision] = useState<string>('PENDING')
  const [localNotes, setLocalNotes] = useState<string>('')
  const [localReviewer, setLocalReviewer] = useState<string>('Quality Assurance Engineer')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const filteredComponents = useMemo(() => {
    return components.filter((c) => {
      const currentQa = c.qa_decision || 'PENDING'
      const matchesQa = qaFilter === 'ALL' || currentQa === qaFilter
      const matchesAi = aiStatusFilter === 'ALL' || c.status === aiStatusFilter
      const matchesSearch =
        searchQuery === '' ||
        c.component_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lot_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subsystem?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesQa && matchesAi && matchesSearch
    })
  }, [components, qaFilter, aiStatusFilter, searchQuery])

  const targetPart = selected || filteredComponents[0] || null

  // Update local state when selected component changes
  React.useEffect(() => {
    if (targetPart) {
      setLocalDecision(targetPart.qa_decision || 'PENDING')
      setLocalNotes(targetPart.qa_notes || '')
      setLocalReviewer(targetPart.qa_reviewer || 'Quality Assurance Engineer')
      setSaveSuccess(false)
    }
  }, [targetPart?.component_id])

  const handleSaveReview = async () => {
    if (!targetPart) return
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      sounds.playClick()
      const updated = await updateQAReview(
        targetPart.component_id,
        localDecision,
        localNotes,
        localReviewer,
        batchId
      )
      // Mutate in-memory reference for instant reflection across all tabs
      targetPart.qa_decision = updated.qa_decision as any
      targetPart.qa_notes = updated.qa_notes
      targetPart.qa_reviewer = updated.qa_reviewer
      targetPart.qa_timestamp = updated.qa_timestamp
      setSaveSuccess(true)
      sounds.playSuccess()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e: any) {
      alert('Failed to save QA sign-off: ' + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Summary counts
  const pendingCount = components.filter((c) => (c.qa_decision || 'PENDING') === 'PENDING').length
  const approvedCount = components.filter((c) => c.qa_decision === 'APPROVED').length
  const rejectedCount = components.filter((c) => c.qa_decision === 'REJECTED').length
  const escalatedCount = components.filter((c) => c.qa_decision === 'ESCALATED').length

  if (!components || components.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-8 bg-transparent text-center font-mono">
        <div className="w-16 h-16 rounded-full bg-[#0E88D3]/10 border border-[#0E88D3]/30 flex items-center justify-center text-[#0E88D3] text-2xl font-bold mb-4 shadow-xs">
          ⚖️
        </div>
        <h2 className="text-xl font-black text-[#0F1D2E] uppercase tracking-wider mb-2">
          NO DATA FOR QA REVIEW
        </h2>
        <p className="text-xs text-[#64748B] max-w-md font-sans mb-4">
          Please upload and screen a burn-in telemetry dataset to conduct official human-in-the-loop QA flight qualification reviews.
        </p>
        {onNavigateToTab && (
          <button
            type="button"
            onClick={() => onNavigateToTab('csv_intake')}
            className="px-4 py-2 rounded-lg bg-[#0E88D3] hover:bg-[#0c74b4] text-white text-xs font-bold font-mono transition-colors shadow-xs"
          >
            Go to CSV Intake &rarr;
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-transparent text-[#0F1D2E] font-sans flex-1 min-h-full">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#D5DEE7] bg-[#FFFFFF] p-4 md:p-5 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#0E88D3]/15 text-[#0E88D3] border border-[#0E88D3]/40 font-mono font-bold text-xs uppercase tracking-wider">
              HUMAN-IN-THE-LOOP
            </span>
            <span className="text-xs font-mono font-semibold text-[#64748B]">
              QUALITY ASSURANCE REVIEW BOARD
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#0F1D2E] tracking-wide mt-1">
            Quality Assurance &amp; Flight Authorization Board
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5 max-w-3xl leading-relaxed">
            AI screening operates as decision support. Final flight qualification authority rests with the Quality Assurance Review Board. Inspect AI evidence and record binding human sign-offs.
          </p>
        </div>

        {/* QA Summary Counter Badges */}
        <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
          <div className="px-3 py-1.5 rounded-lg border border-[#D5DEE7] bg-[#F8FAFC] flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#64748B]" />
            <span>PENDING: <b className="text-[#0F1D2E]">{pendingCount}</b></span>
          </div>
          <div className="px-3 py-1.5 rounded-lg border border-[#168A5B]/30 bg-[#F0FDF4] text-[#168A5B] flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#168A5B]" />
            <span>APPROVED: <b>{approvedCount}</b></span>
          </div>
          <div className="px-3 py-1.5 rounded-lg border border-[#D9363E]/30 bg-[#FEF2F2] text-[#D9363E] flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#D9363E]" />
            <span>REJECTED: <b>{rejectedCount}</b></span>
          </div>
          <div className="px-3 py-1.5 rounded-lg border border-[#C58A00]/30 bg-[#FFFBEB] text-[#C58A00] flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#C58A00]" />
            <span>ESCALATED: <b>{escalatedCount}</b></span>
          </div>
        </div>
      </div>

      {/* Main Split Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch flex-1">
        {/* Left: Component Review Ledger (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 rounded-xl border border-[#D5DEE7] bg-[#FFFFFF] p-4 shadow-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5DEE7] pb-3">
            <span className="text-xs font-bold uppercase text-[#0E88D3]">
              REVIEW QUEUE ({filteredComponents.length})
            </span>
            {/* Filter buttons */}
            <div className="flex items-center gap-1 text-[10px]">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'ESCALATED'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setQaFilter(mode)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors border ${
                    qaFilter === mode
                      ? 'bg-[#0E88D3] text-white border-[#0E88D3]'
                      : 'bg-[#F8FAFC] text-[#64748B] border-[#D5DEE7] hover:border-[#0E88D3]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <input
            type="text"
            placeholder="Search by ID, lot, subsystem..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#D5DEE7] text-xs bg-[#F8FAFC] text-[#0F1D2E] focus:outline-none focus:border-[#0E88D3]"
          />

          {/* Table list */}
          <div className="flex-1 overflow-y-auto max-h-[560px] flex flex-col gap-1.5 pr-1">
            {filteredComponents.map((c) => {
              const isSelected = targetPart?.component_id === c.component_id
              const currentQa = c.qa_decision || 'PENDING'
              return (
                <div
                  key={c.component_id}
                  onClick={() => onSelectComponent(c.component_id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#FFFFFF] border-[#0E88D3] ring-1 ring-[#0E88D3] shadow-xs'
                      : 'bg-[#FFFFFF] border-[#D5DEE7] hover:border-[#0E88D3]/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#0F1D2E]">{c.component_id}</span>
                      <span className="text-[10px] text-[#64748B]">Lot: {c.lot_id}</span>
                    </div>
                    <div className="text-[10px] text-[#64748B] mt-0.5">
                      [{c.subsystem}] &bull; AI: <b className={c.status === 'reject' ? 'text-[#D9363E]' : c.status === 'monitor' ? 'text-[#C58A00]' : 'text-[#168A5B]'}>{c.status.toUpperCase()}</b> ({c.risk_score}/100)
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                    currentQa === 'APPROVED' ? 'bg-[#F0FDF4] text-[#168A5B] border-[#168A5B]/30' :
                    currentQa === 'REJECTED' ? 'bg-[#FEF2F2] text-[#D9363E] border-[#D9363E]/30' :
                    currentQa === 'ESCALATED' ? 'bg-[#FFFBEB] text-[#C58A00] border-[#C58A00]/30' :
                    'bg-[#F8FAFC] text-[#64748B] border-[#D5DEE7]'
                  }`}>
                    {currentQa}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Detailed Inspection & Human Sign-off Form (7 cols) */}
        {targetPart ? (
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* AI Decision Support Dossier Card */}
            <div className="p-5 rounded-xl border border-[#D5DEE7] bg-[#FFFFFF] shadow-xs flex flex-col gap-3 font-mono">
              <div className="flex items-center justify-between border-b border-[#D5DEE7] pb-3">
                <div>
                  <span className="text-xs uppercase font-bold text-[#0E88D3]">
                    AI SCREENING EVIDENCE DOSSIER
                  </span>
                  <div className="text-lg font-black text-[#0F1D2E] mt-0.5">
                    {targetPart.component_id} <span className="text-xs text-[#64748B] font-normal">(Lot {targetPart.lot_id})</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#64748B]">AI Recommendation</span>
                  <div className={`text-base font-black uppercase ${
                    targetPart.status === 'reject' ? 'text-[#D9363E]' : targetPart.status === 'monitor' ? 'text-[#C58A00]' : 'text-[#168A5B]'
                  }`}>
                    {targetPart.status} ({targetPart.risk_score}/100)
                  </div>
                </div>
              </div>

              {/* 4 Supporting Signals Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#D5DEE7]">
                  <div className="text-[10px] text-[#64748B] uppercase">Datasheet Limit</div>
                  <div className="font-bold text-[#0F1D2E] mt-0.5">{targetPart.v168.toFixed(2)} µA</div>
                  <div className={`text-[10px] font-semibold mt-0.5 ${targetPart.v168 > (targetPart.limit_ua || 50) ? 'text-[#D9363E]' : 'text-[#168A5B]'}`}>
                    {targetPart.v168 > (targetPart.limit_ua || 50) ? 'Limit Exceeded' : 'Within Limit'}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#D5DEE7]">
                  <div className="text-[10px] text-[#64748B] uppercase">Lot Outlier Z</div>
                  <div className="font-bold text-[#0F1D2E] mt-0.5">{targetPart.z168?.toFixed(2) ?? '0.00'}&sigma;</div>
                  <div className={`text-[10px] font-semibold mt-0.5 ${Math.abs(targetPart.z168 || 0) >= 3 ? 'text-[#D9363E]' : 'text-[#168A5B]'}`}>
                    {Math.abs(targetPart.z168 || 0) >= 3 ? 'Lot Outlier' : 'Nominal Cohort'}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#D5DEE7]">
                  <div className="text-[10px] text-[#64748B] uppercase">Early Drift</div>
                  <div className="font-bold text-[#0F1D2E] mt-0.5">{((targetPart.drift_rate_early ?? targetPart.slope ?? 0) * 1000).toFixed(1)} nA/hr</div>
                  <div className={`text-[10px] font-semibold mt-0.5 ${targetPart.safety_slope_exceeded ? 'text-[#D9363E]' : 'text-[#168A5B]'}`}>
                    {targetPart.safety_slope_exceeded ? 'Slope Exceeded' : 'Safe Slope'}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#D5DEE7]">
                  <div className="text-[10px] text-[#64748B] uppercase">Projected 264h</div>
                  <div className="font-bold text-[#0F1D2E] mt-0.5">{targetPart.predicted_future?.toFixed(1) ?? targetPart.v168.toFixed(1)} µA</div>
                  <div className={`text-[10px] font-semibold mt-0.5 ${targetPart.future_limit_breach ? 'text-[#D9363E]' : 'text-[#168A5B]'}`}>
                    {targetPart.future_limit_breach ? 'Latent Failure' : 'Safe Orbit Headroom'}
                  </div>
                </div>
              </div>

              {/* Explainable Reasoning */}
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D5DEE7] text-xs">
                <div className="text-[10px] font-bold text-[#64748B] uppercase mb-1">AI Reason &amp; Evidence:</div>
                <div className="text-[#1E293B] leading-relaxed">
                  {targetPart.reason || 'Component measurements are compliant with nominal flight tolerances.'}
                </div>
              </div>
            </div>

            {/* Human Sign-Off Form Card */}
            <div className="p-5 rounded-xl border border-[#D5DEE7] bg-[#FFFFFF] shadow-xs flex flex-col gap-4 font-mono">
              <div className="flex items-center justify-between border-b border-[#D5DEE7] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0E88D3]" />
                  <span className="text-xs uppercase font-black text-[#0F1D2E] tracking-wider">
                    HUMAN REVIEWER SIGN-OFF ACTION
                  </span>
                </div>
                {targetPart.qa_timestamp && (
                  <span className="text-[10px] text-[#64748B]">
                    Last reviewed: {new Date(targetPart.qa_timestamp).toLocaleDateString()} {new Date(targetPart.qa_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Decision Radio/Button Group */}
              <div>
                <label className="text-xs font-bold text-[#64748B] uppercase block mb-1.5">
                  Authorize Flight Clearance Decision:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setLocalDecision('APPROVED')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer font-bold ${
                      localDecision === 'APPROVED'
                        ? 'bg-[#168A5B] text-white border-[#168A5B] shadow-xs'
                        : 'bg-[#F0FDF4] text-[#168A5B] border-[#168A5B]/30 hover:border-[#168A5B]'
                    }`}
                  >
                    <span className="text-base">🟢</span>
                    <span>APPROVED</span>
                    <span className="text-[9px] font-normal opacity-80">Flight Ready</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocalDecision('REJECTED')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer font-bold ${
                      localDecision === 'REJECTED'
                        ? 'bg-[#D9363E] text-white border-[#D9363E] shadow-xs'
                        : 'bg-[#FEF2F2] text-[#D9363E] border-[#D9363E]/30 hover:border-[#D9363E]'
                    }`}
                  >
                    <span className="text-base">🔴</span>
                    <span>REJECTED</span>
                    <span className="text-[9px] font-normal opacity-80">Quarantine</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocalDecision('ESCALATED')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer font-bold ${
                      localDecision === 'ESCALATED'
                        ? 'bg-[#C58A00] text-white border-[#C58A00] shadow-xs'
                        : 'bg-[#FFFBEB] text-[#C58A00] border-[#C58A00]/30 hover:border-[#C58A00]'
                    }`}
                  >
                    <span className="text-base">🟠</span>
                    <span>ESCALATED</span>
                    <span className="text-[9px] font-normal opacity-80">Senior Board</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocalDecision('PENDING')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer font-bold ${
                      localDecision === 'PENDING'
                        ? 'bg-[#64748B] text-white border-[#64748B] shadow-xs'
                        : 'bg-[#F8FAFC] text-[#64748B] border-[#D5DEE7] hover:border-[#64748B]'
                    }`}
                  >
                    <span className="text-base">⚪</span>
                    <span>PENDING</span>
                    <span className="text-[9px] font-normal opacity-80">Awaiting Data</span>
                  </button>
                </div>
              </div>

              {/* Reviewer Name */}
              <div>
                <label className="text-xs font-bold text-[#64748B] uppercase block mb-1">
                  Lead QA Reviewer / Certification Officer:
                </label>
                <input
                  type="text"
                  value={localReviewer}
                  onChange={(e) => setLocalReviewer(e.target.value)}
                  placeholder="e.g. Dr. A. Rajesh Kumar, Lead QA Officer"
                  className="w-full px-3 py-2 rounded-lg border border-[#D5DEE7] text-xs bg-[#F8FAFC] text-[#0F1D2E] focus:outline-none focus:border-[#0E88D3]"
                />
              </div>

              {/* Reviewer Justification Notes */}
              <div>
                <label className="text-xs font-bold text-[#64748B] uppercase block mb-1">
                  Engineering Justification / Concurrence Notes:
                </label>
                <textarea
                  rows={3}
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Enter binding rationale for this qualification decision (e.g. Concur with AI latent drift rejection; physical inspection reveals package micro-fissure under thermal stress)..."
                  className="w-full px-3 py-2 rounded-lg border border-[#D5DEE7] text-xs bg-[#F8FAFC] text-[#0F1D2E] focus:outline-none focus:border-[#0E88D3] font-sans"
                />
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-[#D5DEE7]">
                <div className="text-xs font-bold">
                  {saveSuccess && (
                    <span className="text-[#168A5B] flex items-center gap-1.5">
                      ✓ QA Decision Recorded &amp; Saved Successfully
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {onNavigateToTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('passport')}
                      className="px-3 py-2 rounded-lg border border-[#D5DEE7] bg-[#F8FAFC] hover:border-[#0E88D3] text-xs font-bold text-[#0F1D2E] transition-colors"
                    >
                      View Passport &rarr;
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveReview}
                    disabled={isSaving}
                    className="px-5 py-2 rounded-lg bg-[#0E88D3] hover:bg-[#0c74b4] text-white text-xs font-bold font-mono transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isSaving ? 'Recording Sign-off...' : 'Submit Binding QA Sign-off'}</span>
                    <span>✓</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 p-8 rounded-xl border border-[#D5DEE7] bg-[#FFFFFF] text-center text-xs text-[#64748B] font-mono">
            Select a component from the review queue on the left to inspect evidence and execute sign-off.
          </div>
        )}
      </div>
    </div>
  )
}
