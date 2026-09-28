import React, { useRef, useState } from 'react'
import { ISRO_MISSIONS } from '../../offlineEngine'
import { sounds } from '../../utils/soundEffects'

interface DataIngestModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadFile: (file: File) => void
  onSelectMission: (missionId: string) => void
  activeMissionId?: string
  initialMode?: 'upload' | 'paste' | 'preset'
}

const SAMPLE_CSV = `component_id,lot_id,subsystem,0h,24h,96h,168h,static_limit_ua
FC-ASIC-088,LOT-PSLV-C58-01,FC,12.4,14.8,22.1,38.9,50.0
FC-PROC-102,LOT-PSLV-C58-01,FC,11.2,11.5,12.0,12.6,50.0
PWR-MOSFET-401,LOT-PSLV-C58-01,PWR,6.2,6.5,7.1,7.8,50.0
PWR-REG-205,LOT-PSLV-C58-01,PWR,7.1,7.3,7.6,8.0,50.0
COM-LNA-501,LOT-PSLV-C58-02,COM,9.1,9.4,9.8,10.2,50.0
COM-TWTA-ANOM-02,LOT-PSLV-C58-02,COM,9.5,9.9,10.6,11.3,50.0
NAV-GYRO-701,LOT-PSLV-C58-03,NAV,14.2,16.5,21.0,29.4,50.0
NAV-GYRO-DRIFT-88,LOT-PSLV-C58-03,NAV,28.5,36.2,45.8,54.2,50.0
BAT-CELL-101,LOT-PSLV-C58-04,BAT,8.0,8.2,8.5,8.9,50.0
BAT-CELL-042,LOT-PSLV-C58-04,BAT,14.5,16.8,21.2,26.4,50.0`

export default function DataIngestModal({
  isOpen,
  onClose,
  onUploadFile,
  onSelectMission,
  activeMissionId = 'GAGANYAAN',
  initialMode = 'upload',
}: DataIngestModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'preset'>(initialMode)
  const [dragActive, setDragActive] = useState(false)
  const [pastedText, setPastedText] = useState('')
  const [selectedPreset, setSelectedPreset] = useState(activeMissionId)
  const [selectedLotPreview, setSelectedLotPreview] = useState<string | null>(null)

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

  const handlePastedSubmit = () => {
    if (!pastedText.trim()) return
    sounds.playSuccess()
    const file = new File([pastedText.trim()], 'pasted_telemetry.csv', { type: 'text/csv' })
    onUploadFile(file)
    onClose()
  }

  const handleLoadMission = () => {
    sounds.playPing()
    onSelectMission(selectedPreset)
    onClose()
  }

  const currentMission = ISRO_MISSIONS.find((m) => m.id === selectedPreset) || ISRO_MISSIONS[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-[#F8FAFC] border border-[#D5DEE7] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D5DEE7] bg-[#FFFFFF]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0E88D3]" />
              <h2 className="text-sm font-bold text-[#0F1D2E] tracking-wide uppercase">
                Data Ingestion &bull; SpaceGuard AI
              </h2>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Satish Dhawan Space Centre SHAR &bull; Telemetry Ingestion Engine
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#0F1D2E] hover:bg-[#F8FAFC] transition-colors text-sm cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Method Switcher Tabs */}
        <div className="grid grid-cols-3 bg-[#FFFFFF] border-b border-[#D5DEE7] p-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-[#0E88D3]/10 text-[#0E88D3] font-bold border border-[#0E88D3]/30'
                : 'text-[#64748B] hover:text-[#0F1D2E] hover:bg-[#F8FAFC]'
            }`}
          >
            <span>📁</span>
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-[#0E88D3]/10 text-[#0E88D3] font-bold border border-[#0E88D3]/30'
                : 'text-[#64748B] hover:text-[#0F1D2E] hover:bg-[#F8FAFC]'
            }`}
          >
            <span>📋</span>
            <span>Paste CSV Text</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preset')}
            className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'preset'
                ? 'bg-[#0E88D3]/10 text-[#0E88D3] font-bold border border-[#0E88D3]/30'
                : 'text-[#64748B] hover:text-[#0F1D2E] hover:bg-[#F8FAFC]'
            }`}
          >
            <span>🚀</span>
            <span>ISRO Flight Batch</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: UPLOAD CSV FILE */}
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-3">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  dragActive
                    ? 'border-[#0E88D3] bg-[#0E88D3]/10'
                    : 'border-[#D5DEE7] bg-[#FFFFFF] hover:border-[#0E88D3]/60 hover:bg-[#FFFFFF]'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#F8FAFC] flex items-center justify-center text-[#0F1D2E] text-2xl">
                  📄
                </div>
                <div className="text-sm font-medium text-[#0F1D2E]">
                  Drag and drop your telemetry CSV here
                </div>
                <div className="text-xs text-[#64748B]">
                  or <span className="text-[#0E88D3] font-semibold underline">browse file from device</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="text-[11px] text-[#64748B] mt-2">
                  Required columns: <code className="text-[#64748B] font-mono">component_id, lot_id, 0h, 24h, 168h</code>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PASTE CSV TEXT DIRECTLY */}
          {activeTab === 'paste' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B] font-semibold">Paste raw CSV / TSV text below:</span>
                <button
                  type="button"
                  onClick={() => setPastedText(SAMPLE_CSV)}
                  className="text-[#0E88D3] hover:text-[#0A6CA8] underline text-[11px] font-mono cursor-pointer"
                >
                  [+] Insert Sample Dataset
                </button>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="component_id,lot_id,subsystem,0h,24h,96h,168h,static_limit_ua&#10;FC-ASIC-088,LOT-01,FC,12.4,14.8,22.1,38.9,50.0&#10;..."
                rows={10}
                className="w-full bg-[#FFFFFF] border border-[#D5DEE7] rounded-xl p-3 text-xs font-mono text-[#0F1D2E] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0E88D3] leading-relaxed"
              />

              <button
                type="button"
                disabled={!pastedText.trim()}
                onClick={handlePastedSubmit}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>⚡ Parse &amp; Ingest Pasted Telemetry</span>
              </button>
            </div>
          )}

          {/* TAB 3: SELECT ISRO MISSION PRESET */}
          {activeTab === 'preset' && (
            <div className="flex flex-col gap-3">
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
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFFFFF] border-[#0E88D3] ring-1 ring-[#0E88D3] text-[#0F1D2E]'
                          : 'bg-[#FFFFFF] border-[#D5DEE7] text-[#64748B] hover:border-[#0E88D3]/40'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0F1D2E]">
                        <span>{m.icon}</span>
                        <span>{m.name}</span>
                      </div>
                      <div className="text-[10px] text-[#64748B] truncate">
                        {m.description}
                      </div>
                      <div className="text-[9px] text-[#64748B] font-mono">
                        {m.targetOrbit} &bull; {m.centre}
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={handleLoadMission}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0E88D3] hover:bg-[#0A6CA8] text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm mt-1 cursor-pointer"
              >
                <span>Load {currentMission.name} Telemetry Dataset &rarr;</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#D5DEE7] bg-[#FFFFFF] flex items-center justify-between text-xs text-[#64748B]">
          <span>MIL-STD-883 Method 1005 Compliant</span>
          <button
            type="button"
            onClick={onClose}
            className="text-[#64748B] hover:text-[#0F1D2E] underline text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
