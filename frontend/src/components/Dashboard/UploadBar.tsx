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
  onReportCsv,
  onOpenIngestModal,
  onOpenLotsModal,
  onResetWorkflow,
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
  onReportCsv?: () => void
  activeMissionId?: string
  onSelectMission?: (missionId: string) => void
  onOpenIngestModal?: () => void
  onOpenLotsModal?: () => void
  onResetWorkflow?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  return (
    <div className="border-b border-[#26384D] bg-[#070D18] px-4 md:px-6 py-3 font-sans select-none">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left Section: Core Telemetry Data Ingestion Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Prominent Ingest CSV Trigger (Upload / Drag & Drop / Direct Paste Modal) */}
          <div
            className={`border rounded-xl px-4 py-2.5 flex items-center gap-2.5 cursor-pointer transition-all shadow-sm ${
              drag
                ? 'border-[#C99A2E] bg-[#C99A2E]/20 text-[#E8EDF2] ring-2 ring-[#C99A2E]/40'
                : 'border-[#26384D] bg-[#111E30] text-[#E8EDF2] hover:border-[#C99A2E]/70 hover:bg-[#16253A]'
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
            <span className="text-[#C99A2E] font-bold text-lg">📁</span>
            <span className="text-sm font-display font-semibold tracking-wide">
              <span className="text-[#91A0B2]">INGEST </span>
              <span className="text-[#C99A2E] font-bold underline decoration-[#C99A2E]/50">CSV TELEMETRY</span>
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
            className="text-sm font-display font-bold px-4 py-2.5 rounded-xl border border-[#26384D] bg-[#16253A] text-[#E8EDF2] hover:bg-[#26384D] hover:border-[#C99A2E] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            onClick={() => {
              sounds.playPing()
              onDemo()
            }}
            title="Load standard ISRO Gaganyaan qualification telemetry batch"
          >
            <span className="text-[#C99A2E] text-base">▶</span>
            <span>LOAD FLIGHT BATCH</span>
          </button>

          {onResetWorkflow && (
            <button
              type="button"
              className="text-sm font-display font-bold px-3.5 py-2.5 rounded-xl border border-[#D94B5B]/40 bg-[#28131D] text-[#D94B5B] hover:bg-[#28131D]/80 hover:text-[#E8EDF2] hover:border-[#D94B5B] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              onClick={() => {
                sounds.playClick()
                onResetWorkflow()
              }}
              title="Reset flight telemetry and return to Window 1 CSV Ingestion"
            >
              <span>🔄</span>
              <span>NEW CSV INTAKE</span>
            </button>
          )}
        </div>

        {/* Right Section: Core Execution & Export Actions */}
        <div className="flex items-center gap-3">
          {/* Primary Big CTA: Execute AI Screening */}
          <button
            type="button"
            disabled={!canRun || running}
            className={`text-sm md:text-[15px] font-display font-black px-6 py-2.5 rounded-xl transition-all flex items-center gap-2.5 shadow-lg uppercase tracking-wider cursor-pointer border ${
              running
                ? 'bg-[#16253A] text-[#C99A2E] border-[#C99A2E]/60 cursor-wait'
                : canRun
                ? 'bg-gradient-to-r from-[#3FA66B] to-[#3B82B6] hover:from-[#3FA66B]/90 hover:to-[#3B82B6]/90 text-[#E8EDF2] border-[#3FA66B]/60 shadow-lg'
                : 'bg-[#16253A] text-[#91A0B2] border-[#26384D] opacity-50 cursor-not-allowed'
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
              className="text-sm font-display font-bold px-4 py-2.5 rounded-xl border border-[#26384D] bg-[#111E30] text-[#E8EDF2] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#3B82B6] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Export Flight Clearance Reports & Logs"
            >
              <span className="text-base">📥</span>
              <span>EXPORT CLEARANCE ▾</span>
            </button>

            {showExportMenu && canReport && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-[#111E30] border border-[#26384D] rounded-xl shadow-2xl p-2 z-50 animate-modalin flex flex-col gap-1.5">
                {onReportPdf && (
                  <button
                    type="button"
                    className="w-full text-left px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-sans font-medium text-[#3FA66B] hover:bg-[#16253A] flex items-center justify-between transition-colors cursor-pointer"
                    onClick={() => {
                      sounds.playSuccess()
                      setShowExportMenu(false)
                      onReportPdf()
                    }}
                  >
                    <span className="font-semibold">Flight Clearance Certificate</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#3FA66B]/20 border border-[#3FA66B]/30 text-[#3FA66B]">.PDF</span>
                  </button>
                )}
                {onReportExcel && (
                  <button
                    type="button"
                    className="w-full text-left px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-sans font-medium text-[#C99A2E] hover:bg-[#16253A] flex items-center justify-between transition-colors cursor-pointer"
                    onClick={() => {
                      sounds.playSuccess()
                      setShowExportMenu(false)
                      onReportExcel()
                    }}
                  >
                    <span className="font-semibold">Screening Ledger Excel</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#C99A2E]/20 border border-[#C99A2E]/30 text-[#C99A2E]">.XLS</span>
                  </button>
                )}
                {onReportCsv && (
                  <button
                    type="button"
                    className="w-full text-left px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-sans font-medium text-[#3B82B6] hover:bg-[#16253A] flex items-center justify-between transition-colors cursor-pointer"
                    onClick={() => {
                      sounds.playSuccess()
                      setShowExportMenu(false)
                      onReportCsv()
                    }}
                  >
                    <span className="font-semibold">Screening Dataset Export</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#3B82B6]/20 border border-[#3B82B6]/30 text-[#3B82B6]">.CSV</span>
                  </button>
                )}
                <button
                  type="button"
                  className="w-full text-left px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-sans font-medium text-[#E8EDF2] hover:bg-[#16253A] flex items-center justify-between transition-colors cursor-pointer"
                  onClick={() => {
                    sounds.playSuccess()
                    setShowExportMenu(false)
                    onReport()
                  }}
                >
                  <span className="font-semibold">Technical Mission Report</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#3B82B6]/20 border border-[#3B82B6]/30 text-[#3B82B6]">.PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dataset Status Ticker with interactive Lot-Wise Inspector */}
      <div className="mt-3 pt-3 border-t border-[#26384D] flex items-center justify-between gap-3 text-base md:text-lg text-[#E8EDF2] flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3FA66B] animate-gentle-pulse flex-shrink-0" />
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
              className="inline-flex items-center gap-2 text-xs md:text-sm font-mono font-bold bg-[#16253A] hover:bg-[#26384D] text-[#C99A2E] hover:text-[#E8EDF2] px-4 py-1.5 rounded-lg border border-[#C99A2E]/60 hover:border-[#C99A2E] transition-all shadow-sm cursor-pointer ml-1.5 group"
              title="Open dedicated Lot-Wise Classification Window"
            >
              <span>📦</span>
              <span>INSPECT LOTS &rarr;</span>
            </button>
          )}
        </div>
        <span className="text-[#91A0B2] text-xs md:text-sm uppercase font-mono font-bold tracking-wider bg-[#0D1726] px-3.5 py-1.5 rounded-lg border border-[#26384D] whitespace-nowrap hidden lg:inline-block shadow-sm">
          MIL-STD-883 HTOL 168H RELIABILITY SPEC
        </span>
      </div>
    </div>
  )
}
