import React, { useRef, useState } from 'react'
import { ISRO_MISSIONS } from '../../offlineEngine'
import { sounds } from '../../utils/soundEffects'

interface DataIngestModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadFile: (file: File) => void
  onSelectMission: (missionId: string) => void
  activeMissionId?: string
}

export default function DataIngestModal({
  isOpen,
  onClose,
  onUploadFile,
  onSelectMission,
  activeMissionId = 'GAGANYAAN',
}: DataIngestModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(activeMissionId)

  if (!isOpen) return null

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      sounds.playSuccess()
      onUploadFile(e.dataTransfer.files[0])
      onClose()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      sounds.playSuccess()
      onUploadFile(e.target.files[0])
      onClose()
    }
  }

  const handleLoadMission = () => {
    sounds.playPing()
    onSelectMission(selectedPreset)
    onClose()
  }

  const currentMission = ISRO_MISSIONS.find((m) => m.id === selectedPreset) || ISRO_MISSIONS[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none font-mono">
      <div className="relative w-full max-w-2xl bg-[#090F1E] border border-cyan/50 rounded-xl shadow-2xl shadow-cyan/20 overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#0D162B]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan led" />
            <span className="font-display font-black text-xs tracking-wider text-white uppercase">
              STEP 01 // DATA INGESTION WINDOW
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan/15 text-cyan text-[10px] font-bold border border-cyan/30">
              ISRO SDSC SHAR
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs"
            title="Close Window"
          >
            &#10005;
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
          {/* Subtitle / Instructions */}
          <div className="text-xs text-slate-300 leading-relaxed">
            <p className="mb-1 text-slate-400">
              Welcome to <b className="text-white">SpaceGuard AI</b> Mission Reliability System. To initiate qualification screening, first ingest a component burn-in dataset.
            </p>
            <p className="text-[11px] text-cyan/90">
              Upload your custom burn-in CSV datasheet, or select an authentic ISRO qualification flight batch below:
            </p>
          </div>

          {/* ================= SECTION A: DRAG & DROP CSV ================= */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-cyan font-bold tracking-wider uppercase">
                &gt;&gt; OPTION 1: UPLOAD CUSTOM CSV DATASHEET
              </span>
              <span className="text-[10px] text-slate-500">FORMAT: .CSV, .TSV</span>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                dragActive
                  ? 'border-cyan bg-cyan/15 shadow-neon-cyan scale-[1.01]'
                  : 'border-slate-700 bg-[#060B16] hover:border-cyan/60 hover:bg-[#070E1E]'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-cyan/10 border border-cyan/40 flex items-center justify-center text-cyan text-xl">
                &#8681;
              </div>

              <div>
                <div className="text-sm font-bold text-white mb-1">
                  Drag &amp; Drop your Burn-In Telemetry CSV file here
                </div>
                <div className="text-xs text-slate-400">
                  or <span className="text-cyan underline font-bold">browse from your computer</span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Supported Columns Pill Strip */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-slate-800/80 text-[9.5px] text-slate-400">
                <span className="text-slate-500 font-bold">DETECTED COLUMNS:</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">component_id</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">lot_id</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">0h / 24h / 168h</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-500">limit_ua (opt)</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-500">ground_truth (opt)</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">OR</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* ================= SECTION B: SELECT ISRO FLIGHT MISSION ================= */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-cyan font-bold tracking-wider uppercase">
                &gt;&gt; OPTION 2: LOAD ISRO FLIGHT TELEMETRY BATCH
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">READY TO INGEST</span>
            </div>

            {/* Mission Grid */}
            <div className="grid grid-cols-2 gap-2">
              {ISRO_MISSIONS.map((m) => {
                const isSelected = selectedPreset === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      sounds.playClick()
                      setSelectedPreset(m.id)
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-cyan/20 border-cyan text-white shadow-neon-cyan'
                        : 'bg-[#060B16] border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-[#080F1F]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span>{m.icon}</span>
                        <span className="tracking-wide text-white">{m.name}</span>
                      </div>
                      <span className={`text-[9px] px-1 rounded font-mono ${
                        isSelected ? 'bg-cyan text-black font-black' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {m.code}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {m.description}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      ORBIT: <span className="text-slate-300">{m.targetOrbit}</span> &bull; {m.centre}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Load Selected Mission Button */}
            <button
              type="button"
              onClick={handleLoadMission}
              className="mt-1 w-full py-2.5 px-4 rounded-lg bg-cyan/20 border border-cyan/60 text-cyan hover:bg-cyan hover:text-black font-display text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-neon-cyan"
            >
              <span>&#9654;</span> INGEST &amp; LOAD {currentMission.name.toUpperCase()} DATASET
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-[#070D1A] flex items-center justify-between text-[10px] text-slate-500">
          <span>MIL-STD-883 Method 1005 HTOL Reliability Assurance</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white underline"
          >
            Explore Dashboard First &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
