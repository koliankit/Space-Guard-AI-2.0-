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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-xl bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Simple Clean Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0B1120]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                Data Ingestion &bull; SpaceGuard AI
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Satish Dhawan Space Centre SHAR &bull; Component Screening
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
          {/* Method 1: Upload CSV */}
          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>1. Upload Burn-In CSV File</span>
              <span className="text-[10px] text-slate-400 font-normal">Accepted: .csv, .tsv</span>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                dragActive
                  ? 'border-sky-400 bg-sky-500/10'
                  : 'border-slate-700 bg-[#0A0F1E] hover:border-slate-500 hover:bg-[#0D152A]'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 text-lg">
                📄
              </div>
              <div className="text-sm font-medium text-white">
                Drag and drop your telemetry CSV here
              </div>
              <div className="text-xs text-slate-400">
                or <span className="text-sky-400 font-semibold underline">browse file from device</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="text-[11px] text-slate-400 mt-1">
                Required columns: <code className="text-slate-300 font-mono">component_id, lot_id, 0h, 24h, 168h</code>
              </div>
            </div>
          </div>

          {/* Clean Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">OR</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Method 2: Select ISRO Mission */}
          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              2. Load Authentic ISRO Mission Telemetry
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
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
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-400 text-white shadow-sm'
                        : 'bg-[#0A0F1E] border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-[#0E172E]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                        <span>{m.icon}</span>
                        <span>{m.name}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {m.description}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">
                      {m.targetOrbit} &bull; {m.centre}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={handleLoadMission}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Load {currentMission.name} Telemetry Dataset &rarr;</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0B1120] flex items-center justify-between text-xs text-slate-400">
          <span>MIL-STD-883 Method 1005 Compliant</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white underline text-xs"
          >
            Skip to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
