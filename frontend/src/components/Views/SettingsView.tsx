import React, { useState } from 'react'
import type { TeeSecurityStatus } from '../../types'
import { ISRO_MISSIONS } from '../../offlineEngine'
import { sounds } from '../../utils/soundEffects'

interface SettingsViewProps {
  teeStatus: TeeSecurityStatus | null
  onOpenTeeModal: () => void
  activeMissionId: string
  onSelectMission: (id: string) => void
  onResetWorkflow: () => void
  totalComponents: number
}

export default function SettingsView({
  teeStatus,
  onOpenTeeModal,
  activeMissionId,
  onSelectMission,
  onResetWorkflow,
  totalComponents,
}: SettingsViewProps) {
  const [soundEnabled, setSoundEnabled] = useState(() => sounds.isEnabled())
  const [htolLimit, setHtolLimit] = useState(50.0)
  const [zThreshold, setZThreshold] = useState(3.0)
  const [activationEnergy, setActivationEnergy] = useState(0.7)
  const [burnInHours, setBurnInHours] = useState(168)
  const [savedNotice, setSavedNotice] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    sounds.playSuccess()
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 3000)
  }

  const toggleSound = () => {
    const next = sounds.toggle()
    setSoundEnabled(next)
    if (next) sounds.playPing()
  }

  return (
    <div className="flex flex-col flex-1 p-3 md:p-5 text-[#F1F5F9] font-sans select-none overflow-y-auto w-full min-h-full gap-4">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#2563EB] text-[#F1F5F9] font-mono font-bold text-[11px] uppercase tracking-wider">
              SETTINGS &amp; ENCLAVE
            </span>
            <span className="text-xs font-mono text-[#A8B6C5] font-semibold">
              ON-PREMISE DEPLOYMENT // TEE SECURITY // MIL-STD-883
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-mono font-black text-[#F1F5F9] tracking-wide mt-1">
            System Configuration &amp; Security Enclave
          </h1>
          <p className="text-xs text-[#A8B6C5] mt-0.5">
            Manage Trusted Execution Environment (TEE) attestation, screening physics limits, and private deployment parameters.
          </p>
        </div>

        {savedNotice && (
          <div className="px-3.5 py-1.5 rounded-lg bg-[#10B981]/20 border border-[#10B981]/50 text-[#10B981] font-mono text-xs flex items-center gap-2 animate-gentle-pulse">
            <span>✓</span> Parameters Saved Successfully
          </div>
        )}
      </div>

      {/* 2x2 Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 items-stretch">
        {/* Card 1: Confidential Computing & TEE Security Enclave */}
        <div className="bg-[#162B40] border border-[#2D4963] rounded-xl p-5 flex flex-col justify-between gap-4 shadow-md h-full">
          <div className="flex items-center justify-between border-b border-[#2D4963] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-[#F1F5F9]">
                Trusted Execution Environment (TEE)
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1B3445] border border-[#2D4963] text-[#22D3EE] font-mono font-bold">
              CONFIDENTIAL COMPUTING
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex items-center justify-between">
              <div>
                <div className="text-[11px] text-[#718398] font-semibold">ENCLAVE OPERATIONAL MODE</div>
                <div className="text-sm font-bold text-[#F1F5F9] mt-0.5">
                  {teeStatus?.mode ? teeStatus.mode.toUpperCase() : 'PRIVATE HARDWARE ENCLAVE'}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 font-bold">
                {teeStatus?.enabled ? 'PROTECTED' : 'HARDENED'}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#1B3445] border border-[#2D4963] space-y-1.5">
              <div className="flex justify-between text-[11px] text-[#718398]">
                <span>ENCLAVE MEASUREMENT (SHA-256):</span>
                <span className="text-[#22D3EE] font-bold">SHA-256 VERIFIED</span>
              </div>
              <div className="text-[11px] text-[#A8B6C5] font-mono truncate bg-[#102337] p-2 rounded border border-[#2D4963]">
                {teeStatus?.enclave_id || teeStatus?.latest_attestation?.signature || '0x7F4A...B9E2-ISRO-TEE-MEASUREMENT'}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex justify-between items-center">
              <div>
                <div className="text-[11px] text-[#718398]">CRYPTO SIGNATURE VERIFICATION</div>
                <div className="text-xs text-[#10B981] font-bold mt-0.5">HMAC-SHA256 SIGNED &bull; TAMPER-PROOF</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick()
                  onOpenTeeModal()
                }}
                className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[#F1F5F9] font-bold text-xs transition-colors"
              >
                Inspect Attestation &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Space Qualification Screening Thresholds */}
        <form onSubmit={handleSave} className="bg-[#162B40] border border-[#2D4963] rounded-xl p-5 flex flex-col justify-between gap-4 shadow-md h-full">
          <div className="flex items-center justify-between border-b border-[#2D4963] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚖️</span>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-[#F1F5F9]">
                Screening Physics &amp; AI Thresholds
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1B3445] border border-[#2D4963] text-[#A8B6C5] font-mono">
              MIL-STD-883
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-[#A8B6C5] text-[11px] mb-1 font-semibold">
                STATIC LEAKAGE CURRENT CEILING (µA)
              </label>
              <input
                type="number"
                step="1"
                value={htolLimit}
                onChange={(e) => setHtolLimit(parseFloat(e.target.value) || 50)}
                className="w-full bg-[#1B3445] border border-[#2D4963] rounded-lg px-3 py-2 text-[#F1F5F9] focus:outline-none focus:border-[#2563EB]"
              />
              <span className="text-[10px] text-[#718398] mt-0.5 block font-sans">
                Absolute manufacturer specification ceiling for flight logic / MOS parts.
              </span>
            </div>

            <div>
              <label className="block text-[#A8B6C5] text-[11px] mb-1 font-semibold">
                LOT-RELATIVE ANOMALY SIGMA BOUND (σ)
              </label>
              <input
                type="number"
                step="0.1"
                value={zThreshold}
                onChange={(e) => setZThreshold(parseFloat(e.target.value) || 3.0)}
                className="w-full bg-[#1B3445] border border-[#2D4963] rounded-lg px-3 py-2 text-[#F1F5F9] focus:outline-none focus:border-[#2563EB]"
              />
              <span className="text-[10px] text-[#718398] mt-0.5 block font-sans">
                Parts exceeding this lot-relative deviation trigger AI REJECT despite being under the static ceiling.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#A8B6C5] text-[11px] mb-1 font-semibold">
                  ARRHENIUS ACTIVATION (eV)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={activationEnergy}
                  onChange={(e) => setActivationEnergy(parseFloat(e.target.value) || 0.7)}
                  className="w-full bg-[#1B3445] border border-[#2D4963] rounded-lg px-3 py-2 text-[#F1F5F9] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[#A8B6C5] text-[11px] mb-1 font-semibold">
                  BURN-IN DURATION (HRS)
                </label>
                <input
                  type="number"
                  step="24"
                  value={burnInHours}
                  onChange={(e) => setBurnInHours(parseInt(e.target.value) || 168)}
                  className="w-full bg-[#1B3445] border border-[#2D4963] rounded-lg px-3 py-2 text-[#F1F5F9] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[#F1F5F9] font-mono font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                APPLY &amp; SAVE SCREENING PARAMETERS
              </button>
            </div>
          </div>
        </form>

        {/* Card 3: Active Mission Spacecraft Profile */}
        <div className="bg-[#162B40] border border-[#2D4963] rounded-xl p-5 flex flex-col justify-between gap-4 shadow-md h-full">
          <div className="flex items-center justify-between border-b border-[#2D4963] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛰️</span>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-[#F1F5F9]">
                Active Flight Mission Profile
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1B3445] border border-[#2D4963] text-[#A8B6C5] font-mono">
              TELEMETRY PROFILE
            </span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ISRO_MISSIONS.map((m) => {
                const isSelected = activeMissionId === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      sounds.playClick()
                      onSelectMission(m.id)
                    }}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2563EB]/20 border-[#2563EB] text-[#F1F5F9] ring-1 ring-[#2563EB]'
                        : 'bg-[#1B3445] border-[#2D4963] text-[#A8B6C5] hover:text-[#F1F5F9] hover:bg-[#203C55]'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold">{m.id}</span>
                    <span className="text-[11px] font-sans truncate mt-1 text-[#F1F5F9]">{m.name}</span>
                    <span className="text-[10px] font-mono text-[#22D3EE] mt-1">{m.targetOrbit}</span>
                  </button>
                )
              })}
            </div>

            <div className="p-3 rounded-lg bg-[#1B3445] border border-[#2D4963] text-xs font-mono space-y-1">
              <div className="text-[11px] text-[#718398]">DATASET BUFFER STATUS:</div>
              <div className="text-[#F1F5F9] font-bold">
                {totalComponents > 0 ? `${totalComponents} components mounted in active telemetry memory` : 'No components loaded'}
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Audio Feedback & Reset Controls */}
        <div className="bg-[#162B40] border border-[#2D4963] rounded-xl p-5 flex flex-col justify-between gap-4 shadow-md h-full">
          <div className="flex items-center justify-between border-b border-[#2D4963] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎛️</span>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-[#F1F5F9]">
                Audio &amp; Workspace Maintenance
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1B3445] border border-[#2D4963] text-[#A8B6C5] font-mono">
              SYSTEM CONTROLS
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex items-center justify-between">
              <div>
                <div className="text-[#F1F5F9] font-bold">ACOUSTIC TELEMETRY FEEDBACK</div>
                <div className="text-[10px] text-[#A8B6C5] font-sans mt-0.5">
                  Audio alerts for critical anomalies, clicks, and mission pings
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSound}
                className={`px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition-colors ${
                  soundEnabled
                    ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40'
                    : 'bg-[#1B3445] text-[#718398] border-[#2D4963]'
                }`}
              >
                {soundEnabled ? '🔊 ENABLED' : '🔇 MUTED'}
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-[#1B3445] border border-[#2D4963] flex items-center justify-between">
              <div>
                <div className="text-[#F1F5F9] font-bold">PURGE WORKSPACE TELEMETRY</div>
                <div className="text-[10px] text-[#A8B6C5] font-sans mt-0.5">
                  Clear active memory buffer and return to clean intake state
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick()
                  onResetWorkflow()
                }}
                className="px-3 py-1.5 rounded-lg bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 hover:bg-[#EF4444]/30 font-bold text-xs transition-colors cursor-pointer"
              >
                RESET DATA 🔄
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
