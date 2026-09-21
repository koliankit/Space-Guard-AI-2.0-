import React, { useEffect } from 'react'
import type { TeeSecurityStatus } from '../../types'
import { sounds } from '../../utils/soundEffects'

interface TeeSecurityModalProps {
  isOpen: boolean
  onClose: () => void
  status: TeeSecurityStatus | null
}

export default function TeeSecurityModal({ isOpen, onClose, status }: TeeSecurityModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isEnabled = status?.enabled ?? false
  const isHardware = status?.hardware_backed ?? false
  const mode = status?.mode ?? 'simulation'
  const isSimulation = mode === 'simulation'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070D18]/85 backdrop-blur-sm p-4 overflow-y-auto font-sans animate-fadein">
      <div className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl border border-[#26384D] bg-[#111E30] text-[#E8EDF2] shadow-2xl overflow-hidden flex flex-col my-4">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#26384D] bg-[#0D1726] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-[#3B82B6]/40 bg-[#16253A] flex items-center justify-center text-[#3B82B6] font-mono text-base font-bold shadow-sm">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="m-0 text-base font-display font-bold tracking-wider text-[#E8EDF2] uppercase">
                  Trusted Execution Environment (TEE)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16253A] text-[#91A0B2] border border-[#26384D]">
                  DEFENSE-IN-DEPTH LAYER
                </span>
              </div>
              <p className="m-0 text-xs text-[#91A0B2] font-sans mt-0.5">
                Confidential computing enclave boundary for flight qualification decisions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sounds.playClick()
              onClose()
            }}
            className="w-8 h-8 rounded-lg border border-[#26384D] bg-[#16253A] text-[#91A0B2] hover:text-[#E8EDF2] hover:bg-[#26384D] flex items-center justify-center text-sm transition-colors cursor-pointer"
            title="Close [Esc]"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5 text-xs md:text-sm font-sans flex-1 overflow-y-auto">
          {/* Status & Mode Banners */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Status Card */}
            <div className="p-3.5 rounded-xl border border-[#26384D] bg-[#16253A] flex flex-col gap-1">
              <span className="text-[11px] font-mono uppercase text-[#91A0B2] font-semibold">Security State</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    !isEnabled
                      ? 'bg-[#91A0B2]'
                      : isSimulation
                      ? 'bg-[#D6A33A] animate-gentle-pulse'
                      : 'bg-[#3FA66B] animate-gentle-pulse'
                  }`}
                />
                <span
                  className={`font-mono font-bold text-xs md:text-sm ${
                    !isEnabled
                      ? 'text-[#91A0B2]'
                      : isSimulation
                      ? 'text-[#D6A33A]'
                      : 'text-[#3FA66B]'
                  }`}
                >
                  {!isEnabled ? 'DISABLED' : isSimulation ? 'SIMULATION' : 'ENABLED'}
                </span>
              </div>
            </div>

            {/* Operating Mode Card */}
            <div className="p-3.5 rounded-xl border border-[#26384D] bg-[#16253A] flex flex-col gap-1">
              <span className="text-[11px] font-mono uppercase text-[#91A0B2] font-semibold">Execution Mode</span>
              <span className="font-mono font-bold text-[#E8EDF2] text-xs md:text-sm mt-0.5">
                {isSimulation ? 'Development (Sim)' : 'Hardware Production'}
              </span>
            </div>

            {/* Hardware-backed Card */}
            <div className="p-3.5 rounded-xl border border-[#26384D] bg-[#16253A] flex flex-col gap-1">
              <span className="text-[11px] font-mono uppercase text-[#91A0B2] font-semibold">Hardware-Backed</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs font-mono font-bold ${isHardware ? 'text-[#3FA66B]' : 'text-[#D6A33A]'}`}>
                  {isHardware ? 'YES (Confidential VM)' : 'NO (Emulated Perim)'}
                </span>
              </div>
            </div>
          </div>

          {/* Educational Concept Box */}
          <div className="p-4 rounded-xl border border-[#3B82B6]/30 bg-[#16253A] flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#3B82B6] font-mono font-bold uppercase tracking-wide">
              <span>ℹ️</span>
              <span>Architectural Responsibility</span>
            </div>
            <p className="text-[#91A0B2] leading-relaxed m-0">
              TEE provides an optional hardware-backed isolation layer for selected sensitive computations. It operates as a{' '}
              <strong className="text-[#E8EDF2]">security and deployment boundary</strong> rather than an AI algorithm or statistical replacement.
              Screening analytics, lot-relative normalization, and temporal drift predictions execute identically whether TEE is active or bypassed.
            </p>
          </div>

          {/* Protected Computations List */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono uppercase text-[#E8EDF2] font-bold tracking-wider flex items-center gap-1.5">
              <span>🔒</span> Protected Operations Catalog
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { title: 'AI Inference Verification', desc: 'Validates integrity of raw model output vectors' },
                { title: 'Proprietary Weight Matrix', desc: 'Isolates composite risk engine scoring coefficients' },
                { title: 'Screening Decision Logic', desc: 'Evaluates SAFE / MONITOR / REJECT quarantine verdicts' },
                { title: 'Cryptographic Attestation', desc: 'Produces tamper-evident SHA256 & HMAC execution proofs' },
              ].map((op, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-[#26384D] bg-[#16253A] flex flex-col gap-0.5"
                >
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#E8EDF2]">
                    <span className="text-[#3FA66B]">✓</span>
                    {op.title}
                  </div>
                  <span className="text-[11px] text-[#91A0B2] font-sans">{op.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Latest Execution Attestation Token */}
          {status?.latest_attestation && (
            <div className="p-3.5 rounded-xl border border-[#26384D] bg-[#070D18] flex flex-col gap-2 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-[#91A0B2] border-b border-[#26384D] pb-1.5">
                <span className="font-bold text-[#C99A2E] uppercase tracking-wider">LATEST ATTESTATION PROOF</span>
                <span className="text-[#3FA66B] font-semibold">{status.latest_attestation.verification}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <div className="text-[#91A0B2]">Execution ID:</div>
                <div className="text-[#E8EDF2] truncate" title={status.latest_attestation.execution_id}>
                  {status.latest_attestation.execution_id}
                </div>
                <div className="text-[#91A0B2]">Enclave Identifier:</div>
                <div className="text-[#E8EDF2]">{status.latest_attestation.enclave_id}</div>
                <div className="text-[#91A0B2]">HMAC-SHA256 Sig:</div>
                <div className="text-[#3B82B6] font-mono text-[10px] truncate" title={status.latest_attestation.signature}>
                  {status.latest_attestation.signature.substring(0, 24)}...
                </div>
                <div className="text-[#91A0B2]">Timestamp:</div>
                <div className="text-[#91A0B2]">{new Date(status.latest_attestation.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          )}

          {/* Explicit Limitations Disclaimer */}
          <div className="p-3 rounded-xl border border-[#26384D] bg-[#0D1726] text-[11px] text-[#91A0B2] flex flex-col gap-1">
            <span className="font-mono font-bold uppercase text-[#E8EDF2] text-[10px] tracking-wide">
              Engineering Limitations & Scope Disclaimer:
            </span>
            <p className="m-0 leading-normal">
              TEE boundary isolation does not prevent physical hardware destruction or side-channel vulnerabilities.
              It does not guarantee protection against every attack, nor does it replace software-level data validation or physical burn-in testing.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#26384D] bg-[#0D1726] flex items-center justify-between text-xs font-mono text-[#91A0B2]">
          <span>Config: TEE_ENABLED={isEnabled ? 'true' : 'false'} | MODE={mode}</span>
          <button
            type="button"
            onClick={() => {
              sounds.playClick()
              onClose()
            }}
            className="px-4 py-1.5 rounded-lg border border-[#26384D] bg-[#16253A] text-[#E8EDF2] hover:bg-[#26384D] transition-all font-sans font-semibold cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  )
}
