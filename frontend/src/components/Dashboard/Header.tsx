import React, { useEffect, useState } from 'react'
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
}

export default function Header({
  streamActive,
  activeTab,
  onSelectTab,
  totalComponents = 0,
  rejectCount = 0,
  onOpenPitchModal,
  onOpenIngestModal,
  activeMissionName = 'Gaganyaan H1 Crew Module',
  onResetWorkflow,
  onOpenOnboarding,
  teeStatus,
  onOpenTeeModal,
  onToggleSidebar,
}: HeaderProps) {
  const [istTime, setIstTime] = useState('')
  const [utcTime, setUtcTime] = useState('')
  const [metSeconds, setMetSeconds] = useState(14820) // Simulated Mission Elapsed Time
  const [soundOn, setSoundOn] = useState(() => sounds.isEnabled())

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date()
      // IST (UTC+5:30)
      setIstTime(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
        }),
      )
      // UTC
      setUtcTime(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'UTC',
          hour12: false,
        }),
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

  const PRIMARY_TABS: { id: DashboardTab; label: string; tag: string; icon?: string }[] = [
    { id: 'wall', label: 'Command Wall (Module A & B)', tag: '00', icon: '⚡' },
    { id: 'lots', label: 'Lot Architecture & Locations', tag: '01', icon: '📦' },
    { id: 'telemetry', label: '3D Satellite & Telemetry', tag: '02' },
    { id: 'matrix', label: 'AI Screening Matrix', tag: '03' },
  ]

  const SECONDARY_TABS: { id: DashboardTab; label: string; tag: string; icon?: string }[] = [
    { id: 'orbital', label: 'Orbital DSN Tracking', tag: '04' },
    { id: 'subsystems', label: 'Subsystem Diagnostics', tag: '05' },
    { id: 'report', label: 'Clearance Report & PDF', tag: '06' },
  ]

  const renderTabButton = (tab: { id: DashboardTab; label: string; tag: string; icon?: string }) => {
    const isActive = activeTab === tab.id
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => {
          sounds.playClick()
          onSelectTab(tab.id)
        }}
        className={`text-xs md:text-sm px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-2 font-display tracking-wide border cursor-pointer whitespace-nowrap select-none ${
          isActive
            ? 'bg-[#C99A2E]/15 border-[#C99A2E] text-[#C99A2E] font-bold shadow-isro ring-1 ring-[#C99A2E]/30'
            : 'bg-[#111E30] border-[#26384D] text-[#91A0B2] hover:text-[#E8EDF2] hover:bg-[#16253A] hover:border-[#3B82B6]/60 font-medium'
        }`}
      >
        {tab.icon && <span className="text-sm">{tab.icon}</span>}
        <span
          className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
            isActive
              ? 'bg-[#C99A2E]/25 text-[#E8EDF2] border border-[#C99A2E]/60'
              : 'bg-[#070D18] text-[#91A0B2] border border-[#26384D]'
          }`}
        >
          [{tab.tag}]
        </span>
        <span>{tab.label}</span>
        {tab.id === 'matrix' && totalComponents > 0 && (
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-md font-bold ${
              isActive
                ? 'bg-[#C99A2E]/30 text-[#E8EDF2] border border-[#C99A2E]/50'
                : 'bg-[#16253A] text-[#91A0B2] border border-[#26384D]'
            }`}
          >
            {totalComponents}
          </span>
        )}
        {tab.id === 'report' && rejectCount > 0 && (
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#D94B5B] text-[#E8EDF2] font-black">
            {rejectCount} REJ
          </span>
        )}
      </button>
    )
  }

  return (
    <header className="border-b border-[#26384D] bg-[#070D18] relative z-20 font-sans">
      {/* Top Banner: ISRO ISTRAC / SDSC SHAR Mission Operations Control */}
      <div className="flex flex-wrap items-center justify-between px-4 md:px-6 py-2 border-b border-[#26384D] gap-3">
        {/* Official ISRO Title & Mission Crest */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg bg-[#111E30] border border-[#26384D] text-[#E8EDF2] hover:text-[#C99A2E] hover:border-[#C99A2E] transition-colors"
              title="Toggle Navigation Menu"
            >
              <span className="text-base">☰</span>
            </button>
          )}
          <div className="w-10 h-10 rounded-lg border border-[#C99A2E]/40 bg-gradient-to-br from-[#C99A2E]/20 to-[#3B82B6]/20 flex flex-col items-center justify-center text-white font-display font-bold text-xs shadow-isro">
            <span className="tracking-tight text-xs text-[#C99A2E] font-bold">ISRO</span>
            <span className="text-[8.5px] text-[#91A0B2] font-mono tracking-widest">MOX</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="m-0 text-base md:text-lg font-display font-bold tracking-wider text-[#E8EDF2] uppercase">
                SpaceGuard AI <span className="text-[#5A6E85] font-normal">|</span> <span className="text-[#C99A2E]">Mission Reliability Control</span>
              </h1>
              <span className="text-[10.5px] px-2 py-0.5 rounded bg-[#111E30] text-[#91A0B2] border border-[#26384D] font-mono font-medium">
                SDSC SHAR // LCC-01
              </span>
            </div>
            <div className="text-xs md:text-[13px] text-[#91A0B2] font-sans mt-0.5">
              MIL-STD-883 Method 1005 Silicon HTOL Component Screening &amp; Flight Assurance
            </div>
          </div>
        </div>

        {/* Synchronized Mission Clocks & Ground Telemetry */}
        <div className="flex items-center gap-2.5 text-xs md:text-sm font-mono">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#0D1726] border border-[#26384D] flex items-center gap-2 shadow-sm">
            <span className="text-[11px] text-[#91A0B2] uppercase font-semibold">IST</span>
            <span className="font-bold text-[#E8EDF2] text-xs md:text-sm tabular-nums">{istTime || '16:15:00'}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-[#0D1726] border border-[#C99A2E]/40 flex items-center gap-2 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C99A2E] led" />
            <span className="text-[11px] text-[#C99A2E] uppercase font-bold">MET</span>
            <span className="font-bold text-[#C99A2E] text-xs md:text-sm tabular-nums">{formatMet(metSeconds)}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-[#0D1726] border border-[#26384D] items-center gap-2 hidden lg:flex shadow-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${streamActive ? 'bg-[#3FA66B] led' : 'bg-[#5A6E85]'}`} />
            <span className="text-[11px] text-[#91A0B2] font-semibold">BYL-32 DSN</span>
            <span className={`text-xs md:text-sm font-bold ${streamActive ? 'text-[#3FA66B]' : 'text-[#5A6E85]'}`}>
              {streamActive ? 'CARRIER LOCK' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 text-xs font-mono">
          {/* TEE Security Layer Status Indicator Badge */}
          <button
            type="button"
            onClick={() => {
              sounds.playClick()
              if (onOpenTeeModal) onOpenTeeModal()
            }}
            className={`text-xs px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-2 cursor-pointer shadow-sm select-none ${
              !teeStatus?.enabled
                ? 'border-[#26384D] bg-[#0D1726] text-[#91A0B2] hover:border-[#3B82B6] hover:text-[#E8EDF2]'
                : teeStatus.mode === 'simulation'
                ? 'border-[#C99A2E]/50 bg-[#C99A2E]/10 text-[#C99A2E] hover:bg-[#C99A2E]/20 hover:border-[#C99A2E]'
                : 'border-[#3B82B6]/50 bg-[#3B82B6]/10 text-[#3B82B6] hover:bg-[#3B82B6]/20 hover:border-[#3B82B6]'
            }`}
            title="Inspect TEE Security Enclave Status, Attestation & Protected Operations"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                !teeStatus?.enabled
                  ? 'border border-[#5A6E85] bg-transparent'
                  : teeStatus.mode === 'simulation'
                  ? 'bg-[#C99A2E] led'
                  : 'bg-[#3B82B6] led'
              }`}
            />
            <div className="flex flex-col text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#91A0B2] font-semibold">
                  SECURITY
                </span>
                <span className="text-[11px] font-mono font-bold tracking-wide">
                  {!teeStatus?.enabled
                    ? '○ TEE DISABLED'
                    : teeStatus.mode === 'simulation'
                    ? '● TEE SIMULATION'
                    : '● TEE ENABLED'}
                </span>
              </div>
              <span className="text-[9.5px] text-[#91A0B2] font-sans">
                Mode: {!teeStatus?.enabled ? 'Bypassed' : teeStatus.mode === 'simulation' ? 'Development' : 'Secure Execution'}
              </span>
            </div>
          </button>

          {onOpenPitchModal && (
            <button
              type="button"
              onClick={() => {
                sounds.playPing()
                onOpenPitchModal()
              }}
              className="text-xs font-sans font-semibold px-3.5 py-2 rounded-xl border border-[#26384D] bg-[#111E30] text-[#E8EDF2] hover:border-[#C99A2E]/70 hover:text-[#C99A2E] transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              title="View Official ISRO Briefing Deck (Press 'P')"
            >
              <span className="text-sm">📑</span> ISRO Briefing
            </button>
          )}

          {onOpenOnboarding && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                onOpenOnboarding()
              }}
              className="text-xs font-mono font-bold px-3 py-2 rounded-xl border border-[#26384D] bg-[#111E30] text-[#E8EDF2] hover:border-[#3B82B6] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Return to 3-Stage Intake & Clearance Gateway (Upload CSV / AI Screening)"
            >
              <span>🛰️</span>
              <span className="hidden sm:inline">PRE-FLIGHT GATE</span>
            </button>
          )}

          {onResetWorkflow && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                onResetWorkflow()
              }}
              className="text-xs font-mono font-bold px-3 py-2 rounded-xl border border-[#D94B5B]/40 bg-[#D94B5B]/15 text-[#D94B5B] hover:bg-[#D94B5B]/25 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Reset telemetry and return to Window 1 CSV Ingest"
            >
              <span>🔄</span>
              <span className="hidden sm:inline">NEW INTAKE</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const newState = sounds.toggle()
                setSoundOn(newState)
                if (newState) sounds.playPing()
              }}
              className="p-2 rounded-xl border border-[#26384D] bg-[#0D1726] text-[#91A0B2] hover:text-[#E8EDF2] hover:border-[#3B82B6] text-sm flex items-center justify-center transition-colors cursor-pointer"
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
              className="p-2 rounded-xl border border-[#26384D] bg-[#0D1726] text-[#91A0B2] hover:text-[#E8EDF2] hover:border-[#3B82B6] text-sm flex items-center justify-center transition-colors cursor-pointer"
              title="Toggle Fullscreen"
            >
              <span>⛶</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Navigation Section: Two Distinct Card Boxes with Clean Spacing */}
      <div className="px-4 md:px-6 py-2.5 bg-[#070D18] border-t border-[#26384D] flex flex-col gap-2 select-none">
        {/* Box 1 (Above): Primary Telemetry & Screening Consoles */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#0D1726] border border-[#26384D] shadow-sm overflow-x-auto gap-3">
          <div className="flex items-center gap-2 flex-nowrap">
            <span className="text-[11px] text-[#C99A2E] font-mono font-bold uppercase tracking-wider mr-1 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C99A2E]" />
              PRIMARY:
            </span>
            {PRIMARY_TABS.map(renderTabButton)}
          </div>
          <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono text-[#91A0B2] whitespace-nowrap pl-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#070D18] border border-[#26384D] text-[#91A0B2] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3FA66B]" />
              MODULES A &amp; B ACTIVE
            </span>
          </div>
        </div>

        {/* Box 2 (Below): Diagnostics, DSN Tracking & Clearance Assurance */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#0D1726] border border-[#26384D] shadow-sm overflow-x-auto gap-3">
          <div className="flex items-center gap-2 flex-nowrap">
            <span className="text-[11px] text-[#91A0B2] font-mono font-bold uppercase tracking-wider mr-1 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82B6]" />
              OPERATIONS:
            </span>
            {SECONDARY_TABS.map(renderTabButton)}
          </div>

          <div className="flex items-center gap-3 text-xs md:text-sm text-[#91A0B2] font-mono flex-shrink-0 whitespace-nowrap">
            <span className="px-3 py-1 rounded-lg bg-[#070D18] border border-[#26384D] text-[#91A0B2] flex items-center gap-2 text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#C99A2E] led" />
              Mission Profile: <span className="text-[#E8EDF2] font-bold">{activeMissionName}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
