import { useRef, useState } from 'react'
import { ISRO_MISSIONS } from '../../offlineEngine'
import { sounds } from '../../utils/soundEffects'

export default function UploadBar({
  metaText,
  canRun,
  canReport,
  running,
  onFile,
  onDemo,
  onRun,
  onReport,
  onReportPdf,
  onReportExcel,
  activeMissionId = 'GAGANYAAN',
  onSelectMission,
}: {
  metaText: string
  canRun: boolean
  canReport: boolean
  running: boolean
  onFile: (f: File) => void
  onDemo: () => void
  onRun: () => void
  onReport: () => void
  onReportPdf?: () => void
  onReportExcel?: () => void
  activeMissionId?: string
  onSelectMission?: (missionId: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const [showExportMenu, setShowExportMenu] = useState(false)

  return (
    <div className="border-b border-slate-800 bg-[#0A1122] px-5 py-2 font-mono text-xs select-none">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left Section: Ingest File Dropzone + Mission Preset Pills */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[320px]">
          {/* Dropzone */}
          <div
            className={`border border-dashed rounded-md px-3 py-1.5 flex items-center gap-2 cursor-pointer text-[11px] transition-all ${
              drag
                ? 'border-cyan bg-cyan/15 text-white shadow-neon-cyan'
                : 'border-slate-700 bg-[#070D1A] text-slate-400 hover:border-cyan hover:text-white'
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0])
            }}
          >
            <span className="text-cyan font-bold">&gt;&gt;</span>
            <span>
              <span className="text-slate-400">INGEST CSV OR </span>
              <b className="text-cyan underline decoration-cyan/40">UPLOAD FILE</b>
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.tsv,text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) onFile(e.target.files[0])
              }}
            />
          </div>

          {/* Mission Preset Pills */}
          <div className="flex items-center gap-1 bg-[#060D1A] p-0.5 rounded-md border border-slate-800">
            <span className="text-[9px] text-slate-500 uppercase font-bold px-1.5 hidden xl:inline">MISSION:</span>
            {ISRO_MISSIONS.map((m) => {
              const isSelected = activeMissionId === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    sounds.playClick()
                    onSelectMission?.(m.id)
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded transition-all flex items-center gap-1 font-bold border ${
                    isSelected
                      ? 'bg-cyan/20 border-cyan text-cyan font-black'
                      : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title={`${m.name} — ${m.description}`}
                >
                  <span className="text-xs">{m.icon}</span>
                  <span className="font-display tracking-wider text-[10px]">{m.id}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Section: Core Actions (Load -> Execute -> Export) */}
        <div className="flex items-center gap-2">
          {/* Load Demo Batch */}
          <button
            type="button"
            className="font-display text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md border border-cyan/50 bg-cyan/15 text-cyan font-bold hover:bg-cyan hover:text-black transition-all flex items-center gap-1.5"
            onClick={() => {
              sounds.playPing()
              onDemo()
            }}
            title="Load authentic ISRO spacecraft burn-in telemetry batch"
          >
            <span>&#9654;</span> LOAD FLIGHT BATCH
          </button>

          {/* Execute AI Screening (Primary Highlighted CTA) */}
          <button
            type="button"
            disabled={!canRun || running}
            className="font-display text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded-md border border-emerald-400 bg-emerald-500/20 text-emerald-300 font-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-1.5 shadow-neon-green"
            onClick={() => {
              sounds.playPing()
              onRun()
            }}
            title="Execute Isolation Forest and XGBoost latent drift screening"
          >
            <span>&#8635;</span> {running ? 'SCREENING IN PROGRESS...' : 'EXECUTE AI SCREENING'}
          </button>

          {/* Export Dropdown / Group */}
          <div className="relative">
            <button
              type="button"
              disabled={!canReport}
              onClick={() => setShowExportMenu((v) => !v)}
              className="font-display text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md border border-slate-700 bg-[#0D1527] text-slate-300 font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:border-cyan hover:text-white transition-all flex items-center gap-1.5"
              title="Export Flight Clearance Reports & Logs"
            >
              <span>&#8681;</span> EXPORT REPORTS &#9662;
            </button>

            {showExportMenu && canReport && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#0D1527] border border-slate-700 rounded-md shadow-2xl p-1 z-50 animate-modalin flex flex-col gap-0.5">
                {onReportPdf && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 rounded text-[11px] font-mono text-emerald-300 hover:bg-emerald-500/20 flex items-center justify-between"
                    onClick={() => {
                      sounds.playSuccess()
                      setShowExportMenu(false)
                      onReportPdf()
                    }}
                  >
                    <span>Clearance PDF Certificate</span>
                    <span>.PDF</span>
                  </button>
                )}
                {onReportExcel && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 rounded text-[11px] font-mono text-cyan hover:bg-cyan/20 flex items-center justify-between"
                    onClick={() => {
                      sounds.playSuccess()
                      setShowExportMenu(false)
                      onReportExcel()
                    }}
                  >
                    <span>Screening Ledger CSV</span>
                    <span>.CSV</span>
                  </button>
                )}
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 rounded text-[11px] font-mono text-slate-300 hover:bg-slate-800 flex items-center justify-between"
                  onClick={() => {
                    sounds.playClick()
                    setShowExportMenu(false)
                    onReport()
                  }}
                >
                  <span>Technical Markdown Report</span>
                  <span>.MD</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dataset Status Ticker (Clean & Integrated) */}
      <div className="mt-1 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10.5px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan/60" />
          <span dangerouslySetInnerHTML={{ __html: metaText }} />
        </div>
        <span className="text-slate-500 text-[9.5px]">QUALIFICATION PROFILE: MIL-STD-883 HTOL 168H</span>
      </div>
    </div>
  )
}
