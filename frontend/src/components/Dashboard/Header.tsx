import { useEffect, useState } from 'react'
import { sounds } from '../../utils/soundEffects'
import type { TeeSecurityStatus } from '../../types'

export type DashboardTab =
  | 'overview'
  | 'csv_intake'
  | 'validation'
  | 'module_a'
  | 'module_b'
  | 'risk_engine'
  | 'matrix'
  | 'diagnostics'
  | 'satellite'
  | 'telemetry'
  | 'locations'
  | 'report'
  | 'wall'
  | 'lots'
  | 'subsystems'
  | 'orbital'
  | 'settings'

interface HeaderProps {
  streamActive: boolean
  activeTab: DashboardTab
  onSelectTab: (tab: DashboardTab) => void
  totalComponents?: number
  rejectCount?: number
  onOpenPitchModal?: () => void
  onOpenIngestModal?: () => void
  activeMissionName?: string
  onResetWorkflow?: () => void
  onOpenOnboarding?: () => void
  teeStatus?: TeeSecurityStatus | null
  onOpenTeeModal?: () => void
  onToggleSidebar?: () => void
  onRunScreening?: () => void
  running?: boolean
  isScreened?: boolean
}

export default function Header({
  streamActive,
  activeTab: _activeTab,
  onSelectTab: _onSelectTab,
  totalComponents = 0,
  rejectCount = 0,
  onOpenPitchModal,
  onOpenIngestModal: _onOpenIngestModal,
  activeMissionName = 'Gaganyaan H1 Crew Module',
  onResetWorkflow,
  onOpenOnboarding: _onOpenOnboarding,
  teeStatus,
  onOpenTeeModal,
  onToggleSidebar,
  onRunScreening,
  running = false,
  isScreened = false,
}: HeaderProps) {
  const [istTime, setIstTime] = useState('')
  const [metSeconds, setMetSeconds] = useState(14820)
  const [soundOn, setSoundOn] = useState(() => sounds.isEnabled())

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date()
      setIstTime(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
        })
      )
    }

    updateTimes()
    const timer = setInterval(() => {
      updateTimes()
      setMetSeconds((s) => s + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatMet = (sec: number) => {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0')
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0')
    const s = String(sec % 60).padStart(2, '0')
    return `T+${h}:${m}:${s}`
  }

  return (
    <header className="border-b border-[#1A365D] bg-[#0B1E36] sticky top-0 z-40 font-sans select-none flex-shrink-0 shadow-md">
      <div className="flex items-center justify-between px-3 md:px-5 py-2.5 gap-2.5 w-full">
        {/* Left Section: Mobile Menu, ISRO Crest & ASTRA VIGIL Brand */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 rounded-lg bg-[#142C4C] border border-[#244874] text-white hover:text-[#38BDF8] hover:border-[#38BDF8] transition-colors flex-shrink-0 cursor-pointer"
              title="Toggle Navigation Menu"
            >
              <span className="text-sm">☰</span>
            </button>
          )}

          {/* Aerospace Mission Insignia */}
          <div className="w-8 h-8 rounded-lg border border-[#F47216]/80 bg-gradient-to-br from-[#F47216]/20 to-[#005A9C]/40 flex flex-col items-center justify-center text-white font-display font-bold text-xs shadow-sm flex-shrink-0">
            <span className="tracking-tight text-[11px] text-[#F47216] font-black leading-none">ISRO</span>
            <span className="text-[7.5px] text-[#93C5FD] font-mono tracking-widest leading-none mt-0.5">MOX</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm md:text-base font-display font-black tracking-widest text-white uppercase truncate">
                    ASTRA VIGIL
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#005A9C]/40 text-[#93C5FD] border border-[#005A9C]/60 font-mono font-bold uppercase hidden sm:inline-block">
                    MISSION CONTROL
                  </span>
                </div>
                <span className="text-[10px] text-[#94A3B8] font-mono tracking-wider uppercase hidden sm:block">
                  AI-Driven Component Screening &bull; SDSC SHAR LCC-01
                </span>
              </div>
              <span className="text-[10.5px] px-2.5 py-0.5 rounded bg-[#132A4A] text-[#BAE6FD] border border-[#234E7A] font-mono font-semibold truncate max-w-[160px] md:max-w-xs hidden xl:inline-block">
                {activeMissionName}
              </span>
            </div>
          </div>
        </div>

        {/* Center Section: Telemetry Clocks & Ground Station */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono flex-shrink-0">
          {/* Subtle LIVE Status Indicator */}
          <div className="px-2.5 py-1 rounded-lg bg-[#064E3B]/60 border border-[#10B981]/50 flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[10px] text-[#A7F3D0] uppercase font-bold tracking-wider">LIVE TELEMETRY</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-[#132A4A] border border-[#234E7A] flex items-center gap-1.5 shadow-sm">
            <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">IST</span>
            <span className="font-bold text-white tabular-nums text-xs">{istTime || '16:15:00'}</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-[#132A4A] border border-[#0284C7]/50 flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
            <span className="text-[10px] text-[#7DD3FC] uppercase font-bold">MET</span>
            <span className="font-bold text-[#38BDF8] tabular-nums text-xs">{formatMet(metSeconds)}</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-[#132A4A] border border-[#234E7A] items-center gap-1.5 hidden xl:flex shadow-sm">
            <span className={`w-2 h-2 rounded-full ${streamActive ? 'bg-[#10B981] animate-pulse' : 'bg-[#64748B]'}`} />
            <span className="text-[10px] text-[#94A3B8] font-semibold">BYL-32 DSN</span>
            <span className={`text-xs font-bold ${streamActive ? 'text-[#10B981]' : 'text-[#64748B]'}`}>
              {streamActive ? 'CARRIER LOCK' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Right Section: Global Action Controls */}
        <div className="flex items-center gap-2 text-xs font-mono flex-shrink-0">
          {/* Active Dataset Status & Run Button */}
          {totalComponents > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#132A4A] border border-[#234E7A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span className="text-white font-bold">{totalComponents}</span>
              <span className="text-[#94A3B8] text-[10.5px]">PARTS</span>
              {rejectCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded bg-[#EF4444] text-white text-[10px] font-black">
                  {rejectCount} REJ
                </span>
              )}
            </div>
          )}

          {/* Quick Trigger Run Screening if not run yet */}
          {totalComponents > 0 && onRunScreening && !isScreened && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                onRunScreening()
              }}
              disabled={running}
              className="px-3.5 py-1.5 rounded-lg bg-[#F47216] hover:bg-[#EA580C] text-white font-display font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              title="Execute SpaceGuard AI Silicon Screening Pipeline"
            >
              <span>{running ? '⏳' : '⚡'}</span>
              <span className="hidden sm:inline">{running ? 'SCREENING...' : 'RUN AI SCREENING'}</span>
            </button>
          )}

          {/* TEE Security Enclave Badge */}
          <button
            type="button"
            onClick={() => {
              sounds.playClick()
              if (onOpenTeeModal) onOpenTeeModal()
            }}
            className={`px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm select-none ${
              !teeStatus?.enabled
                ? 'border-[#234E7A] bg-[#132A4A] text-[#94A3B8] hover:border-[#38BDF8] hover:text-white'
                : teeStatus.mode === 'simulation'
                ? 'border-[#0284C7]/60 bg-[#0284C7]/20 text-[#7DD3FC] hover:bg-[#0284C7]/30'
                : 'border-[#10B981]/60 bg-[#064E3B]/60 text-[#A7F3D0] hover:bg-[#064E3B]/80'
            }`}
            title="Inspect TEE Security Enclave Status & Cryptographic Attestation"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                !teeStatus?.enabled
                  ? 'border border-[#64748B] bg-transparent'
                  : 'bg-[#38BDF8] animate-pulse'
              }`}
            />
            <span className="text-[11px] font-mono font-bold tracking-wide text-white">
              TEE {(teeStatus?.mode || 'SIM').toUpperCase()}
            </span>
          </button>

          {/* ISRO Briefing Deck Modal Shortcut */}
          {onOpenPitchModal && (
            <button
              type="button"
              onClick={() => {
                sounds.playPing()
                onOpenPitchModal()
              }}
              className="text-xs font-sans font-semibold px-2.5 py-1 rounded-lg border border-[#234E7A] bg-[#132A4A] text-white hover:border-[#38BDF8] hover:text-[#38BDF8] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="View Official ISRO Briefing Deck (Press 'P')"
            >
              <span>📑</span>
              <span className="hidden sm:inline">Briefing</span>
            </button>
          )}

          {/* Reset Ingest */}
          {onResetWorkflow && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                onResetWorkflow()
              }}
              className="text-xs font-mono font-bold px-2 py-1 rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/15 text-[#FCA5A5] hover:bg-[#EF4444]/25 hover:text-white transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
              title="Reset flight telemetry data"
            >
              <span>🔄</span>
              <span className="hidden lg:inline">RESET</span>
            </button>
          )}

          {/* Audio & Fullscreen Quick Toggles */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const newState = sounds.toggle()
                setSoundOn(newState)
                if (newState) sounds.playPing()
              }}
              className="p-1.5 rounded-lg border border-[#234E7A] bg-[#132A4A] text-[#94A3B8] hover:text-white hover:border-[#38BDF8] text-xs flex items-center justify-center transition-colors cursor-pointer"
              title="Toggle Audio Feedback"
            >
              <span>{soundOn ? '🔊' : '🔇'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {})
                } else {
                  document.exitFullscreen().catch(() => {})
                }
              }}
              className="p-1.5 rounded-lg border border-[#234E7A] bg-[#132A4A] text-[#94A3B8] hover:text-white hover:border-[#38BDF8] text-xs flex items-center justify-center transition-colors cursor-pointer"
              title="Toggle Fullscreen"
            >
              <span>⛶</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
