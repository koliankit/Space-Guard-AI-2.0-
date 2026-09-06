import { useRef, useState } from 'react'

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
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  return (
    <div className="flex items-center gap-3.5 flex-wrap px-6 py-2.5 border-b border-line bg-[#071120] relative z-10 font-mono">
      {/* Tactical Dropzone with Reticle Corners */}
      <div
        className={`flex-1 min-w-[260px] border border-dashed rounded px-4 py-2 flex items-center gap-3 cursor-pointer text-xs font-mono transition-all reticle-corner ${
          drag
            ? 'border-cyan bg-cyan/15 text-white shadow-neon-cyan'
            : 'border-line bg-panel text-muted hover:border-cyan hover:text-white'
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
        <span className="text-cyan text-sm font-bold">&gt;&gt;</span>
        <span>
          <span className="text-muted">INGEST TELEMETRY CSV OR </span>
          <b className="text-cyan underline decoration-cyan/40 hover:text-white">SELECT FLIGHT TELEMETRY</b>
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

      {/* Action Buttons: Blue Ingest CTA + Green AI Screening CTA + PDF Generation */}
      <button
        type="button"
        className="font-display text-xs uppercase tracking-wider px-4 py-2 rounded border border-cyan bg-cyan/20 text-cyan font-bold shadow-neon-cyan hover:bg-cyan hover:text-black transition-all flex items-center gap-2"
        onClick={onDemo}
        title="Load authentic ISRO spacecraft 168h burn-in telemetry dataset"
      >
        <span className="text-xs">&#9654;</span> LOAD ISRO FLIGHT BATCH
      </button>

      <button
        type="button"
        disabled={!canRun || running}
        className="font-display text-xs uppercase tracking-wider px-4 py-2 rounded border border-safe bg-safe/20 text-safe font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-safe hover:text-black transition-all flex items-center gap-2 shadow-neon-green"
        onClick={onRun}
        title="Execute real Isolation Forest and XGBoost latent drift screening algorithms"
      >
        <span className="text-xs">&#8635;</span> EXECUTE ISRO AI SCREENING
      </button>

      {onReportPdf && (
        <button
          type="button"
          disabled={!canReport}
          className="font-display text-xs uppercase tracking-wider px-3.5 py-2 rounded border border-safe/80 bg-safe/15 text-safe font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-safe hover:text-black transition-all flex items-center gap-1.5 shadow-neon-green"
          onClick={onReportPdf}
          title="Download official ISRO flight clearance certification report in PDF format"
        >
          <span>&#8681;</span> CLEARANCE PDF
        </button>
      )}

      {onReportExcel && (
        <button
          type="button"
          disabled={!canReport}
          className="font-display text-xs uppercase tracking-wider px-3.5 py-2 rounded border border-emerald-400/80 bg-emerald-500/15 text-emerald-400 font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(52,211,153,0.35)]"
          onClick={onReportExcel}
          title="Download official ISRO flight screening ledger in Excel Spreadsheet (.CSV) format"
        >
          <span>&#8681;</span> EXCEL (.CSV)
        </button>
      )}

      <button
        type="button"
        disabled={!canReport}
        className="font-mono text-[11px] uppercase tracking-wider px-3 py-2 rounded border border-line bg-panel text-muted disabled:opacity-30 disabled:cursor-not-allowed hover:border-cyan hover:text-white transition-all flex items-center gap-1.5"
        onClick={onReport}
        title="Download official ISRO flight clearance certification report in Markdown format"
      >
        <span>&#8681;</span> REPORT (.MD)
      </button>

      {/* Dataset Metadata Stream Text */}
      <div
        className="font-mono text-[11px] text-muted border-l border-line pl-3"
        dangerouslySetInnerHTML={{ __html: metaText }}
      />
    </div>
  )
}
