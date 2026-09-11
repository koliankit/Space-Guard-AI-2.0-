import React, { useRef, useState } from 'react'
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
  onOpenIngestModal,
  onOpenLotsModal,
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
  onOpenIngestModal?: () => void
  onOpenLotsModal?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  return (
    <div className="border-b border-slate-800/90 bg-[#080E1C] px-4 md:px-6 py-3 font-sans select-none">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left Section: Core Telemetry Data Ingestion Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Prominent Ingest CSV Trigger (Upload / Drag & Drop / Direct Paste Modal) */}
          <div
            className={`border rounded-xl px-4 py-2.5 flex items-center gap-2.5 cursor-pointer transition-all shadow-sm ${
              drag
                ? 'border-amber-400 bg-amber-500/20 text-white ring-2 ring-amber-400/40'
                : 'border-slate-700/90 bg-[#0B1326] text-slate-200 hover:border-amber-500/70 hover:bg-[#111D38]'
            }`}
            onClick={() => {
              sounds.playClick()
              if (onOpenIngestModal) {
                onOpenIngestModal()
              } else {
                inputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              if (e.dataTransfer.files[0]) {
                sounds.playSuccess()
                onFile(e.dataTransfer.files[0])
              }
            }}
            title="Upload CSV/TSV flight telemetry or paste raw dataset"
          >
            <span className="text-amber-400 font-bold text-lg">📁</span>
            <span className="text-sm font-display font-semibold tracking-wide">
              <span className="text-slate-300">INGEST </span>
              <span className="text-amber-400 font-bold underline decoration-amber-400/50">CSV TELEMETRY</span>
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

          {/* Quick Load Flight Batch */}
          <button
            type="button"
            className="text-sm font-display font-bold px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-slate-100 hover:bg-slate-700 hover:border-amber-400 hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            onClick={() => {
              sounds.playPing()
              onDemo()
            }}
            title="Load standard ISRO Gaganyaan qualification telemetry batch"
          >
            <span className="text-amber-400 text-base">▶</span>
            <span>LOAD FLIGHT BATCH</span>
          </button>
        </div>

        {/* Right Section: Core Execution & Export Actions */}
        <div className="flex items-center gap-3">
          {/* Primary Big CTA: Execute AI Screening */}
          <button
            type="button"
            disabled={!canRun || running}
            className={`text-sm md:text-[15px] font-display font-black px-6 py-2.5 rounded-xl transition-all flex items-center gap-2.5 shadow-lg uppercase tracking-wider cursor-pointer border ${
              running
                ? 'bg-amber-600 text-white border-amber-400/60 shadow-amber-950/60 cursor-wait'
                : canRun
                ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/60 shadow-emerald-950/70 hover:shadow-emerald-900/80 hover:scale-[1.01]'
                : 'bg-slate-800 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed'
            }`}
            onClick={() => {
              sounds.playPing()
              onRun()
            }}
            title="Execute Isolation Forest and XGBoost latent drift screening on loaded batch"
          >
            <span className={running ? 'animate-spin' : 'text-lg'}>{running ? '⟳' : '⚡'}</span>
            <span>{running ? 'SCREENING IN PROGRESS...' : 'EXECUTE AI SCREENING'}</span>
          </button>

          {/* Export Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              disabled={!canReport}
              onClick={() => {
                sounds.playClick()
                setShowExportMenu((v) => !v)
              }}
              className="text-sm font-display font-bold px-4 py-2.5 rounded-xl border border-slate-700 bg-[#0B1325] text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-500 hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Export Flight Clearance Reports & Logs"
            >
              <span className="text-base">📥</span>
              <span>EXPORT CLEARANCE ▾</span>
            </button>

            {showExportMenu && canReport && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-[#0B1325] border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-modalin flex flex-col gap-1.5">
                {onReportPdf && (
                  <button
                    type="button"
                    className="w-full text-left px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-sans font-medium text-emerald-300 hover:bg-emerald-500/15 flex items-center justify-between transition-colors cursor-pointer"
                    onClick={() => {
                      sounds.playSuccess()
                      setShowExportMenu(false)
                      onReportPdf()
                    }}
                  >
                    <span className="font-semibold">Flight Clearance Certificate</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">.PDF</span>
                  </button>
                )}
                {onReportExcel && (
                  <button
                    type="button"
                    className="w-full text-left px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-sans font-medium text-amber-300 hover:bg-amber-500/15 flex items-center justify-between transition-colors cursor-pointer"
                    onClick={() => {
                      sounds.playSuccess()
                      setShowExportMenu(false)
                      onReportExcel()
                    }}
                  >
                    <span className="font-semibold">Screening Ledger CSV</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300">.CSV</span>
                  </button>
                )}
                <button
                  type="button"
                  className="w-full text-left px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-sans font-medium text-slate-300 hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                  onClick={() => {
                    sounds.playClick()
                    setShowExportMenu(false)
                    onReport()
                  }}
                >
                  <span className="font-semibold">Technical Markdown Report</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">.MD</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dataset Status Ticker with interactive Lot-Wise Inspector */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 text-base md:text-lg text-slate-100 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="w-3 h-3 rounded-full bg-emerald-400 led flex-shrink-0" />
          <div
            className="flex items-center gap-2 flex-wrap text-sm md:text-base leading-snug cursor-pointer select-none font-medium"
            onClick={(e) => {
              const target = e.target as HTMLElement
              if (
                target.closest('.lot-clickable') ||
                target.classList.contains('lot-clickable') ||
                target.textContent?.toLowerCase().includes('lot')
              ) {
                sounds.playClick()
                onOpenLotsModal?.()
              }
            }}
            title="Click lot badge to open Lot-Wise Classification Window"
            dangerouslySetInnerHTML={{ __html: metaText }}
          />

          {/* Dedicated quick-access button to open Lot-Wise Classification Window */}
          {onOpenLotsModal && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                onOpenLotsModal()
              }}
              className="inline-flex items-center gap-2 text-xs md:text-sm font-mono font-bold bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 hover:text-white px-4 py-1.5 rounded-lg border border-amber-500/60 hover:border-amber-400 transition-all shadow-sm cursor-pointer ml-1.5 group"
              title="Open dedicated Lot-Wise Classification Window"
            >
              <span>📦</span>
              <span>INSPECT LOTS &rarr;</span>
            </button>
          )}
        </div>
        <span className="text-slate-300 text-xs md:text-sm uppercase font-mono font-bold tracking-wider bg-[#070D1A] px-3.5 py-1.5 rounded-lg border border-slate-800 whitespace-nowrap hidden lg:inline-block shadow-sm">
          MIL-STD-883 HTOL 168H RELIABILITY SPEC
        </span>
      </div>
    </div>
  )
}
