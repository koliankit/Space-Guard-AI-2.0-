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
    <header className="border-b border-[#26384D] bg-[#070D18] sticky top-0 z-40 font-sans select-none flex-shrink-0">
      <div className="flex items-center justify-between px-3 md:px-5 py-2 gap-2.5 w-full">
        {/* Left Section: Mobile Menu, ISRO Crest & SpaceGuard AI Brand */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 rounded-lg bg-[#111E30] border border-[#26384D] text-[#E8EDF2] hover:text-[#C99A2E] hover:border-[#C99A2E] transition-colors flex-shrink-0 cursor-pointer"
              title="Toggle Navigation Menu"
            >
              <span className="text-sm">☰</span>
            </button>
          )}

          <div className="w-8 h-8 rounded-lg border border-[#C99A2E]/50 bg-gradient-to-br from-[#C99A2E]/25 to-[#3B82B6]/25 flex flex-col items-center justify-center text-white font-display font-bold text-xs shadow-isro flex-shrink-0">
            <span className="tracking-tight text-[11px] text-[#C99A2E] font-black leading-none">ISRO</span>
            <span className="text-[7.5px] text-[#91A0B2] font-mono tracking-widest leading-none mt-0.5">MOX</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm md:text-base font-display font-black tracking-wider text-[#E8EDF2] uppercase truncate">
                SpaceGuard <span className="text-[#C99A2E]">AI</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#111E30] text-[#91A0B2] border border-[#26384D] font-mono font-medium hidden sm:inline-block">
                SDSC SHAR // LCC-01
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#0D1726] text-[#C99A2E] border border-[#C99A2E]/40 font-mono font-bold truncate max-w-[160px] md:max-w-xs hidden md:inline-block">
                {activeMissionName}
              </span>
            </div>
          </div>
        </div>

        {/* Center Section: Telemetry Clocks & Ground Station */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono flex-shrink-0">
          <div className="px-2.5 py-1 rounded-lg bg-[#0D1726] border border-[#26384D] flex items-center gap-1.5 shadow-sm">
            <span className="text-[10px] text-[#91A0B2] uppercase font-semibold">IST</span>
            <span className="font-bold text-[#E8EDF2] tabular-nums text-xs">{istTime || '16:15:00'}</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-[#0D1726] border border-[#C99A2E]/40 flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#C99A2E] led" />
            <span className="text-[10px] text-[#C99A2E] uppercase font-bold">MET</span>
            <span className="font-bold text-[#C99A2E] tabular-nums text-xs">{formatMet(metSeconds)}</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-[#0D1726] border border-[#26384D] items-center gap-1.5 hidden xl:flex shadow-sm">
            <span className={`w-2 h-2 rounded-full ${streamActive ? 'bg-[#3FA66B] led' : 'bg-[#5A6E85]'}`} />
            <span className="text-[10px] text-[#91A0B2] font-semibold">BYL-32 DSN</span>
            <span className={`text-xs font-bold ${streamActive ? 'text-[#3FA66B]' : 'text-[#5A6E85]'}`}>
              {streamActive ? 'CARRIER LOCK' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Right Section: Global Action Controls */}
        <div className="flex items-center gap-2 text-xs font-mono flex-shrink-0">
          {/* Active Dataset Status & Run Button */}
          {totalComponents > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111E30] border border-[#26384D]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3FA66B]" />
              <span className="text-[#E8EDF2] font-bold">{totalComponents}</span>
              <span className="text-[#91A0B2] text-[10.5px]">PARTS</span>
              {rejectCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded bg-[#D94B5B] text-white text-[10px] font-black">
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
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#C99A2E] to-[#D6A33A] text-slate-950 font-display font-black text-xs hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
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
                ? 'border-[#26384D] bg-[#0D1726] text-[#91A0B2] hover:border-[#3B82B6] hover:text-[#E8EDF2]'
                : teeStatus.mode === 'simulation'
                ? 'border-[#C99A2E]/50 bg-[#C99A2E]/10 text-[#C99A2E] hover:bg-[#C99A2E]/20'
                : 'border-[#3B82B6]/50 bg-[#3B82B6]/10 text-[#3B82B6] hover:bg-[#3B82B6]/20'
            }`}
            title="Inspect TEE Security Enclave Status & Cryptographic Attestation"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                !teeStatus?.enabled
                  ? 'border border-[#5A6E85] bg-transparent'
                  : teeStatus.mode === 'simulation'
                  ? 'bg-[#C99A2E] led'
                  : 'bg-[#3B82B6] led'
              }`}
            />
            <span className="text-[11px] font-mono font-bold tracking-wide">
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
              className="text-xs font-sans font-semibold px-2.5 py-1 rounded-lg border border-[#26384D] bg-[#111E30] text-[#E8EDF2] hover:border-[#C99A2E]/70 hover:text-[#C99A2E] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
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
              className="text-xs font-mono font-bold px-2 py-1 rounded-lg border border-[#D94B5B]/40 bg-[#D94B5B]/15 text-[#D94B5B] hover:bg-[#D94B5B]/25 hover:text-white transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
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
              className="p-1.5 rounded-lg border border-[#26384D] bg-[#0D1726] text-[#91A0B2] hover:text-[#E8EDF2] hover:border-[#3B82B6] text-xs flex items-center justify-center transition-colors cursor-pointer"
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
              className="p-1.5 rounded-lg border border-[#26384D] bg-[#0D1726] text-[#91A0B2] hover:text-[#E8EDF2] hover:border-[#3B82B6] text-xs flex items-center justify-center transition-colors cursor-pointer"
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
