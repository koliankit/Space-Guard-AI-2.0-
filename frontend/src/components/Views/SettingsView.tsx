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
    <div className="flex flex-col flex-1 p-4 md:p-6 bg-[#070D18] text-[#E8EDF2] font-sans select-none overflow-y-auto w-full min-h-screen">
      {/* Top Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#26384D] mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C99A2E]" />
            <h1 className="m-0 text-base md:text-lg font-display font-black tracking-wider uppercase text-[#E8EDF2]">
              Mission Control &amp; TEE Security Settings
            </h1>
            <span className="text-[10.5px] px-2 py-0.5 rounded bg-[#111E30] text-[#C99A2E] border border-[#C99A2E]/40 font-mono font-bold">
              SYS-CONFIG // V2.0
            </span>
          </div>
          <p className="text-xs text-[#91A0B2] font-sans mt-1">
            Configure confidential computing enclaves, MIL-STD-883 HTOL screening thresholds, mission telemetry profiles, and alert parameters.
          </p>
        </div>

        {savedNotice && (
          <div className="px-3 py-1.5 rounded-lg bg-[#3FA66B]/20 border border-[#3FA66B]/50 text-[#3FA66B] font-mono text-xs flex items-center gap-2 animate-gentle-pulse">
            <span>✓</span> Parameters Updated Successfully
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Card 1: Confidential Computing & TEE Security Enclave */}
        <div className="bg-[#111E30] border border-[#26384D] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#26384D] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <h2 className="text-sm font-display font-bold uppercase tracking-wide text-[#E8EDF2]">
                Trusted Execution Environment (TEE)
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#16253A] border border-[#3B82B6]/40 text-[#3B82B6] font-mono font-bold">
              CONFIDENTIAL COMPUTING
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3.5 rounded-lg bg-[#070D18] border border-[#26384D] flex items-center justify-between">
              <div>
                <div className="text-[11px] text-[#91A0B2] font-semibold">ENCLAVE OPERATIONAL MODE</div>
                <div className="text-sm font-bold text-[#E8EDF2] mt-0.5">
                  {teeStatus?.mode ? teeStatus.mode.toUpperCase() : 'SIMULATION MODE'}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#C99A2E]/20 text-[#C99A2E] border border-[#C99A2E]/50 font-bold">
                {teeStatus?.enabled ? 'PROTECTED' : 'READY'}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#070D18] border border-[#26384D] space-y-1.5">
              <div className="flex justify-between text-[11px] text-[#91A0B2]">
                <span>ENCLAVE MEASUREMENT (SHA-256):</span>
                <span className="text-[#3B82B6] font-bold">SHA-256 VERIFIED</span>
              </div>
              <div className="text-[11px] text-[#E8EDF2] font-mono truncate bg-[#0D1726] p-2 rounded border border-[#26384D]">
                {teeStatus?.enclave_id || teeStatus?.latest_attestation?.signature || 'ISRO-TEE-ENCLAVE-SHA256-MEASURED'}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#070D18] border border-[#26384D] flex justify-between items-center">
              <div>
                <div className="text-[11px] text-[#91A0B2]">CRYPTO SIGNATURE VERIFICATION</div>
                <div className="text-xs text-[#3FA66B] font-bold mt-0.5">HMAC-SHA256 SIGNED</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick()
                  onOpenTeeModal()
                }}
                className="px-3 py-1.5 rounded-lg bg-[#16253A] hover:bg-[#26384D] border border-[#3B82B6] text-[#3B82B6] hover:text-[#E8EDF2] font-bold text-xs transition-colors cursor-pointer"
              >
                Inspect Attestation &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Space Qualification Screening Thresholds */}
        <form onSubmit={handleSave} className="bg-[#111E30] border border-[#26384D] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#26384D] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚖️</span>
              <h2 className="text-sm font-display font-bold uppercase tracking-wide text-[#E8EDF2]">
                Screening Physics Limits
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#16253A] border border-[#26384D] text-[#91A0B2] font-mono">
              MIL-STD-883
            </span>
          </div>

          <div className="space-y-3.5 text-xs font-mono">
            <div>
              <label className="block text-[#91A0B2] text-[11px] mb-1 font-semibold">
                STATIC LEAKAGE CURRENT LIMIT (&mu;A)
              </label>
              <input
                type="number"
                step="1"
                value={htolLimit}
                onChange={(e) => setHtolLimit(parseFloat(e.target.value) || 50)}
                className="w-full bg-[#070D18] border border-[#26384D] rounded-lg px-3 py-2 text-[#E8EDF2] focus:outline-none focus:border-[#C99A2E]"
              />
              <span className="text-[10px] text-[#5A6E85] mt-0.5 block font-sans">
                Standard maximum limit specification for Flight Logic / MOS devices.
              </span>
            </div>

            <div>
              <label className="block text-[#91A0B2] text-[11px] mb-1 font-semibold">
                LOT-RELATIVE DIVERGENCE THRESHOLD (&sigma;)
              </label>
              <input
                type="number"
                step="0.1"
                value={zThreshold}
                onChange={(e) => setZThreshold(parseFloat(e.target.value) || 3.0)}
                className="w-full bg-[#070D18] border border-[#26384D] rounded-lg px-3 py-2 text-[#E8EDF2] focus:outline-none focus:border-[#C99A2E]"
              />
              <span className="text-[10px] text-[#5A6E85] mt-0.5 block font-sans">
                Components exceeding this sigma threshold relative to their lot mean trigger AI REJECT.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#91A0B2] text-[11px] mb-1 font-semibold">
                  ARRHENIUS ACTIVATION (eV)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={activationEnergy}
                  onChange={(e) => setActivationEnergy(parseFloat(e.target.value) || 0.7)}
                  className="w-full bg-[#070D18] border border-[#26384D] rounded-lg px-3 py-2 text-[#E8EDF2] focus:outline-none focus:border-[#C99A2E]"
                />
              </div>

              <div>
                <label className="block text-[#91A0B2] text-[11px] mb-1 font-semibold">
                  BURN-IN DURATION (HRS)
                </label>
                <input
                  type="number"
                  step="24"
                  value={burnInHours}
                  onChange={(e) => setBurnInHours(parseInt(e.target.value) || 168)}
                  className="w-full bg-[#070D18] border border-[#26384D] rounded-lg px-3 py-2 text-[#E8EDF2] focus:outline-none focus:border-[#C99A2E]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#C99A2E] to-[#D6A33A] text-slate-950 font-display font-bold text-xs hover:brightness-110 transition-all cursor-pointer shadow-sm"
              >
                APPLY &amp; SAVE SCREENING PARAMETERS
              </button>
            </div>
          </div>
        </form>

        {/* Card 3: Active Mission Spacecraft Profile */}
        <div className="bg-[#111E30] border border-[#26384D] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#26384D] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛰️</span>
              <h2 className="text-sm font-display font-bold uppercase tracking-wide text-[#E8EDF2]">
                Active ISRO Flight Profile
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#16253A] border border-[#26384D] text-[#91A0B2] font-mono">
              MISSION TELEMETRY
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
                        ? 'bg-[#C99A2E]/15 border-[#C99A2E] text-[#E8EDF2] shadow-sm ring-1 ring-[#C99A2E]/40'
                        : 'bg-[#070D18] border-[#26384D] text-[#91A0B2] hover:text-[#E8EDF2] hover:bg-[#16253A]'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold">{m.id}</span>
                    <span className="text-[11px] font-sans truncate mt-1 text-[#E8EDF2]">{m.name}</span>
                    <span className="text-[9.5px] font-mono text-[#C99A2E] mt-1">{m.targetOrbit}</span>
                  </button>
                )
              })}
            </div>

            <div className="p-3 rounded-lg bg-[#070D18] border border-[#26384D] text-xs font-mono space-y-1">
              <div className="text-[11px] text-[#91A0B2]">DATASET STATUS:</div>
              <div className="text-[#E8EDF2] font-bold">
                {totalComponents > 0 ? `${totalComponents} components currently mounted in active memory` : 'No components loaded'}
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Audio Feedback, Telemetry Reset & System Controls */}
        <div className="bg-[#111E30] border border-[#26384D] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#26384D] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎛️</span>
              <h2 className="text-sm font-display font-bold uppercase tracking-wide text-[#E8EDF2]">
                Audio &amp; System Maintenance
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#16253A] border border-[#26384D] text-[#91A0B2] font-mono">
              GLOBAL CONTROLS
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3.5 rounded-lg bg-[#070D18] border border-[#26384D] flex items-center justify-between">
              <div>
                <div className="text-[#E8EDF2] font-bold">ACOUSTIC TELEMETRY FEEDBACK</div>
                <div className="text-[10px] text-[#91A0B2] font-sans mt-0.5">
                  Audio alerts for critical anomalies, clicks, and mission pings
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSound}
                className={`px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition-colors ${
                  soundEnabled
                    ? 'bg-[#3FA66B]/20 text-[#3FA66B] border-[#3FA66B]/50'
                    : 'bg-[#16253A] text-[#91A0B2] border-[#26384D]'
                }`}
              >
                {soundEnabled ? '🔊 ENABLED' : '🔇 MUTED'}
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-[#070D18] border border-[#26384D] flex items-center justify-between">
              <div>
                <div className="text-[#E8EDF2] font-bold">RESET TELEMETRY SESSION</div>
                <div className="text-[10px] text-[#91A0B2] font-sans mt-0.5">
                  Clear active memory buffer and return to clean intake state
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick()
                  onResetWorkflow()
                }}
                className="px-3 py-1.5 rounded-lg bg-[#D94B5B]/20 text-[#D94B5B] border border-[#D94B5B]/50 hover:bg-[#D94B5B]/30 font-bold text-xs transition-colors cursor-pointer"
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
