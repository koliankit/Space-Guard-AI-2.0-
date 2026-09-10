import React, { useRef, useState } from 'react'
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
    <div className="border-b border-slate-800/90 bg-[#080E1C] px-4 md:px-6 py-2 font-sans text-xs select-none">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left Section: Ingest Action + Mission Selector */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[340px] flex-wrap">
          {/* Ingest CSV Trigger */}
          <div
            className={`border rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-all ${
              drag
                ? 'border-amber-400 bg-amber-500/10 text-white'
                : 'border-slate-700/80 bg-[#0A1224] text-slate-300 hover:border-amber-500/60 hover:bg-[#111C36]'
            }`}
            onClick={() => {
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
              if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0])
            }}
          >
            <span className="text-amber-400 font-bold text-sm">📁</span>
            <span className="text-[11px] font-medium font-sans">
              <span className="text-slate-400">INGEST </span>
              <span className="text-amber-400 font-semibold underline decoration-amber-400/40">CSV FILE</span>
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

          {/* Direct Paste CSV Trigger */}
          <button
            type="button"
            onClick={() => onOpenIngestModal?.()}
            className="border border-slate-700/80 bg-[#0A1224] hover:bg-[#111C36] hover:border-amber-500/50 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5"
            title="Paste raw CSV text directly from clipboard"
          >
            <span className="text-amber-400">📋</span>
            <span>PASTE CSV DATA</span>
          </button>

          {/* Mission Preset Pills */}
          <div className="flex items-center gap-1 bg-[#060B16] p-1 rounded-lg border border-slate-800">
            <span className="text-[9.5px] text-slate-400 font-display uppercase font-semibold px-1.5 hidden xl:inline">
              MISSION:
            </span>
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
                  className={`text-[11px] px-2.5 py-0.5 rounded-md transition-all flex items-center gap-1.5 font-medium font-sans border ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-semibold shadow-isro'
                      : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title={`${m.name} — ${m.description}`}
                >
                  <span>{m.icon}</span>
                  <span className="tracking-wide">{m.name.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Section: Core Execution Actions */}
        <div className="flex items-center gap-2">
          {/* Load Batch */}
          <button
            type="button"
            className="text-[11px] font-display font-bold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5"
            onClick={() => {
              sounds.playPing()
              onDemo()
            }}
            title="Load authentic ISRO spacecraft burn-in telemetry batch"
          >
            <span className="text-amber-400">▶</span> LOAD FLIGHT BATCH
          </button>

          {/* Primary CTA: Execute Screening */}
          <button
            type="button"
            disabled={!canRun || running}
            className="text-[11.5px] font-display font-bold px-4 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm uppercase tracking-wide cursor-pointer"
            onClick={() => {
              sounds.playPing()
              onRun()
            }}
            title="Execute Isolation Forest and XGBoost latent drift screening"
          >
            <span>{running ? '⟳' : '⚡'}</span>
            <span>{running ? 'SCREENING ACTIVE...' : 'EXECUTE AI SCREENING'}</span>
          </button>

          {/* Export Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              disabled={!canReport}
              onClick={() => setShowExportMenu((v) => !v)}
              className="text-[11px] font-display font-semibold px-3 py-1.5 rounded-lg border border-slate-700 bg-[#0B1325] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-500 hover:text-white transition-colors flex items-center gap-1.5"
              title="Export Flight Clearance Reports & Logs"
            >
              <span>📥</span> EXPORT CLEARANCE ▾
            </button>

            {showExportMenu && canReport && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#0B1325] border border-slate-700 rounded-lg shadow-2xl p-1.5 z-50 animate-modalin flex flex-col gap-1">
                {onReportPdf && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 rounded-md text-[11px] font-sans text-emerald-300 hover:bg-emerald-500/15 flex items-center justify-between"
                    onClick={() => {
                      sounds.playSuccess()
                      setShowExportMenu(false)
                      onReportPdf()
                    }}
                  >
                    <span>Clearance PDF Certificate</span>
                    <span className="font-mono text-[9px] opacity-70">.PDF</span>
                  </button>
                )}
                {onReportExcel && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 rounded-md text-[11px] font-sans text-amber-300 hover:bg-amber-500/15 flex items-center justify-between"
                    onClick={() => {
                      sounds.playSuccess()
                      setShowExportMenu(false)
                      onReportExcel()
                    }}
                  >
                    <span>Screening Ledger CSV</span>
                    <span className="font-mono text-[9px] opacity-70">.CSV</span>
                  </button>
                )}
                <button
                  type="button"

                  className="w-full text-left px-3 py-1.5 rounded-md text-[11px] font-sans text-slate-300 hover:bg-slate-800 flex items-center justify-between"
                  onClick={() => {
                    sounds.playClick()
                    setShowExportMenu(false)
                    onReport()
                  }}
                >
                  <span>Technical Markdown Report</span>
                  <span className="font-mono text-[9px] opacity-70">.MD</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dataset Status Ticker with interactive Lot-Wise Inspector */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3 text-sm md:text-[15px] text-slate-200">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 led flex-shrink-0" />
          <div
            className="flex items-center gap-1.5 flex-wrap text-sm md:text-[15px] leading-snug cursor-pointer select-none"
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
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 hover:text-white px-2.5 py-0.5 rounded-md border border-sky-500/40 hover:border-sky-400 transition-all shadow-sm cursor-pointer ml-1 group"
              title="Open dedicated Lot-Wise Classification Window"
            >
              <span>📦</span>
              <span>INSPECT LOTS &rarr;</span>
            </button>
          )}
        </div>
        <span className="text-slate-400 text-[11px] uppercase font-mono tracking-wider bg-[#070D1A] px-2.5 py-1 rounded-md border border-slate-800 whitespace-nowrap hidden lg:inline-block">
          MIL-STD-883 HTOL 168H RELIABILITY SPEC
        </span>
      </div>
    </div>
  )
}
