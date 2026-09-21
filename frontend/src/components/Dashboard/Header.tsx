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
    <header className="border-b border-[#1D3A52] bg-[#07111C] sticky top-0 z-40 font-sans select-none flex-shrink-0">
      <div className="flex items-center justify-between px-3 md:px-5 py-2 gap-2.5 w-full">
        {/* Left Section: Mobile Menu, ISRO Crest & SpaceGuard AI Brand */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 rounded-lg bg-[#102337] border border-[#1D3A52] text-[#F1F5F9] hover:text-[#0E88D3] hover:border-[#0E88D3] transition-colors flex-shrink-0 cursor-pointer"
              title="Toggle Navigation Menu"
            >
              <span className="text-sm">☰</span>
            </button>
          )}

          <div className="w-8 h-8 rounded-lg border border-[#F47216]/50 bg-gradient-to-br from-[#F47216]/20 to-[#0E88D3]/20 flex flex-col items-center justify-center text-white font-display font-bold text-xs shadow-orange flex-shrink-0">
            <span className="tracking-tight text-[11px] text-[#F47216] font-black leading-none">ISRO</span>
            <span className="text-[7.5px] text-[#9AAFC0] font-mono tracking-widest leading-none mt-0.5">MOX</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm md:text-base font-display font-black tracking-wider text-[#F1F5F9] uppercase truncate">
                SpaceGuard <span className="text-[#F47216]">AI</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#102337] text-[#9AAFC0] border border-[#1D3A52] font-mono font-medium hidden sm:inline-block">
                SDSC SHAR // LCC-01
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#0B1928] text-[#0E88D3] border border-[#0E88D3]/40 font-mono font-bold truncate max-w-[160px] md:max-w-xs hidden md:inline-block">
                {activeMissionName}
              </span>
            </div>
          </div>
        </div>

        {/* Center Section: Telemetry Clocks & Ground Station */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono flex-shrink-0">
          <div className="px-2.5 py-1 rounded-lg bg-[#0B1928] border border-[#1D3A52] flex items-center gap-1.5 shadow-sm">
            <span className="text-[10px] text-[#9AAFC0] uppercase font-semibold">IST</span>
            <span className="font-bold text-[#F1F5F9] tabular-nums text-xs">{istTime || '16:15:00'}</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-[#0B1928] border border-[#0E88D3]/40 flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#0E88D3] led" />
            <span className="text-[10px] text-[#0E88D3] uppercase font-bold">MET</span>
            <span className="font-bold text-[#0E88D3] tabular-nums text-xs">{formatMet(metSeconds)}</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-[#0B1928] border border-[#1D3A52] items-center gap-1.5 hidden xl:flex shadow-sm">
            <span className={`w-2 h-2 rounded-full ${streamActive ? 'bg-[#22A06B] led' : 'bg-[#6F8495]'}`} />
            <span className="text-[10px] text-[#9AAFC0] font-semibold">BYL-32 DSN</span>
            <span className={`text-xs font-bold ${streamActive ? 'text-[#22A06B]' : 'text-[#6F8495]'}`}>
              {streamActive ? 'CARRIER LOCK' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Right Section: Global Action Controls */}
        <div className="flex items-center gap-2 text-xs font-mono flex-shrink-0">
          {/* Active Dataset Status & Run Button */}
          {totalComponents > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#102337] border border-[#1D3A52]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B]" />
              <span className="text-[#F1F5F9] font-bold">{totalComponents}</span>
              <span className="text-[#9AAFC0] text-[10.5px]">PARTS</span>
              {rejectCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded bg-[#E5484D] text-white text-[10px] font-black">
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
              className="px-3 py-1.5 rounded-lg bg-[#F47216] hover:bg-[#FA8838] text-[#07111C] font-display font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-orange disabled:opacity-50"
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
                ? 'border-[#1D3A52] bg-[#0B1928] text-[#9AAFC0] hover:border-[#0E88D3] hover:text-[#F1F5F9]'
                : teeStatus.mode === 'simulation'
                ? 'border-[#0E88D3]/50 bg-[#0E88D3]/10 text-[#0E88D3] hover:bg-[#0E88D3]/20'
                : 'border-[#0E88D3]/50 bg-[#0E88D3]/15 text-[#0E88D3] hover:bg-[#0E88D3]/25'
            }`}
            title="Inspect TEE Security Enclave Status & Cryptographic Attestation"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                !teeStatus?.enabled
                  ? 'border border-[#6F8495] bg-transparent'
                  : 'bg-[#0E88D3] led'
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
              className="text-xs font-sans font-semibold px-2.5 py-1 rounded-lg border border-[#1D3A52] bg-[#102337] text-[#F1F5F9] hover:border-[#0E88D3] hover:text-[#0E88D3] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
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
              className="text-xs font-mono font-bold px-2 py-1 rounded-lg border border-[#E5484D]/40 bg-[#E5484D]/15 text-[#E5484D] hover:bg-[#E5484D]/25 hover:text-white transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
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
              className="p-1.5 rounded-lg border border-[#1D3A52] bg-[#0B1928] text-[#9AAFC0] hover:text-[#F1F5F9] hover:border-[#0E88D3] text-xs flex items-center justify-center transition-colors cursor-pointer"
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
              className="p-1.5 rounded-lg border border-[#1D3A52] bg-[#0B1928] text-[#9AAFC0] hover:text-[#F1F5F9] hover:border-[#0E88D3] text-xs flex items-center justify-center transition-colors cursor-pointer"
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
