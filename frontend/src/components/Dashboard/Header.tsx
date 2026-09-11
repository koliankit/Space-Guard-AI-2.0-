import React, { useEffect, useState } from 'react'
import { sounds } from '../../utils/soundEffects'

export type DashboardTab = 'wall' | 'lots' | 'telemetry' | 'matrix' | 'orbital' | 'subsystems' | 'report'

interface HeaderProps {
  streamActive: boolean
  activeTab: DashboardTab
  onSelectTab: (tab: DashboardTab) => void
  totalComponents?: number
  rejectCount?: number
  onOpenPitchModal?: () => void
  onOpenIngestModal?: () => void
  activeMissionName?: string
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
        className={`text-xs md:text-sm px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 font-display tracking-wide border cursor-pointer whitespace-nowrap ${
          isActive
            ? 'bg-gradient-to-r from-amber-500/25 to-amber-600/20 border-amber-500/80 text-amber-300 font-bold shadow-isro ring-1 ring-amber-500/30'
            : 'bg-[#0A1122] border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/90 hover:border-slate-700 font-medium'
        }`}
      >
        {tab.icon && <span className="text-sm">{tab.icon}</span>}
        <span
          className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
            isActive
              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
              : 'bg-black/40 text-slate-400 border border-slate-700/60'
          }`}
        >
          [{tab.tag}]
        </span>
        <span>{tab.label}</span>
        {tab.id === 'matrix' && totalComponents > 0 && (
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-md font-bold ${
              isActive
                ? 'bg-amber-500/40 text-amber-100 border border-amber-400/50'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            {totalComponents}
          </span>
        )}
        {tab.id === 'report' && rejectCount > 0 && (
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-rose-600 text-white font-black animate-pulse">
            {rejectCount} REJ
          </span>
        )}
      </button>
    )
  }

  return (
    <header className="border-b border-slate-800/90 bg-[#0A1020] relative z-20 font-sans">
      {/* Top Banner: ISRO ISTRAC / SDSC SHAR Mission Operations Control */}
      <div className="flex flex-wrap items-center justify-between px-4 md:px-6 py-2 border-b border-slate-800/80 gap-3">
        {/* Official ISRO Title & Mission Crest */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg border border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex flex-col items-center justify-center text-white font-display font-bold text-xs shadow-isro">
            <span className="tracking-tight text-xs text-amber-300 font-bold">ISRO</span>
            <span className="text-[8.5px] text-slate-300 font-mono tracking-widest">MOX</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="m-0 text-base md:text-lg font-display font-bold tracking-wider text-white uppercase">
                SpaceGuard AI <span className="text-slate-600 font-normal">|</span> <span className="text-amber-400">Mission Reliability Control</span>
              </h1>
              <span className="text-[10.5px] px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700 font-mono font-medium">
                SDSC SHAR // LCC-01
              </span>
            </div>
            <div className="text-xs md:text-[13px] text-slate-300 font-sans mt-0.5">
              MIL-STD-883 Method 1005 Silicon HTOL Component Screening &amp; Flight Assurance
            </div>
          </div>
        </div>

        {/* Synchronized Mission Clocks & Ground Telemetry */}
        <div className="flex items-center gap-2.5 text-xs md:text-sm font-mono">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#070D1A] border border-slate-800 flex items-center gap-2 shadow-sm">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">IST</span>
            <span className="font-bold text-white text-xs md:text-sm tabular-nums">{istTime || '16:15:00'}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-[#070D1A] border border-amber-500/40 flex items-center gap-2 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 led" />
            <span className="text-[11px] text-amber-400 uppercase font-bold">MET</span>
            <span className="font-bold text-amber-300 text-xs md:text-sm tabular-nums">{formatMet(metSeconds)}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-[#070D1A] border border-slate-800 items-center gap-2 hidden lg:flex shadow-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${streamActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <span className="text-[11px] text-slate-400 font-semibold">BYL-32 DSN</span>
            <span className={`text-xs md:text-sm font-bold ${streamActive ? 'text-emerald-300' : 'text-slate-500'}`}>
              {streamActive ? 'CARRIER LOCK' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 text-xs font-mono">
          {onOpenPitchModal && (
            <button
              type="button"
              onClick={() => {
                sounds.playPing()
                onOpenPitchModal()
              }}
              className="text-xs font-sans font-semibold px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0F172A] text-slate-200 hover:border-amber-500/70 hover:text-amber-300 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="View Official ISRO Briefing Deck (Press 'P')"
            >
              <span className="text-sm">📑</span> ISRO Briefing
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
              className="p-2 rounded-xl border border-slate-800 bg-[#070D1A] text-slate-300 hover:text-white hover:border-slate-700 text-sm flex items-center justify-center transition-colors cursor-pointer"
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
              className="p-2 rounded-xl border border-slate-800 bg-[#070D1A] text-slate-300 hover:text-white hover:border-slate-700 text-sm flex items-center justify-center transition-colors cursor-pointer"
              title="Toggle Fullscreen"
            >
              <span>⛶</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Navigation Section: Two Distinct Card Boxes with Clean Spacing */}
      <div className="px-4 md:px-6 py-2.5 bg-[#060B16] border-t border-slate-800/80 flex flex-col gap-2 select-none">
        {/* Box 1 (Above): Primary Telemetry & Screening Consoles */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#091124] border border-slate-800/90 shadow-sm overflow-x-auto gap-3">
          <div className="flex items-center gap-2 flex-nowrap">
            <span className="text-[11px] text-amber-400/90 font-mono font-bold uppercase tracking-wider mr-1 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              PRIMARY:
            </span>
            {PRIMARY_TABS.map(renderTabButton)}
          </div>
          <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono text-slate-500 whitespace-nowrap pl-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#060C18] border border-slate-800 text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              MODULES A &amp; B ACTIVE
            </span>
          </div>
        </div>

        {/* Box 2 (Below): Diagnostics, DSN Tracking & Clearance Assurance */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#091124] border border-slate-800/90 shadow-sm overflow-x-auto gap-3">
          <div className="flex items-center gap-2 flex-nowrap">
            <span className="text-[11px] text-slate-400 font-mono font-bold uppercase tracking-wider mr-1 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              OPERATIONS:
            </span>
            {SECONDARY_TABS.map(renderTabButton)}
          </div>

          <div className="flex items-center gap-3 text-xs md:text-sm text-slate-400 font-mono flex-shrink-0 whitespace-nowrap">
            <span className="px-3 py-1 rounded-lg bg-[#060C18] border border-slate-700/80 text-slate-300 flex items-center gap-2 text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 led" />
              Mission Profile: <span className="text-white font-bold">{activeMissionName}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

