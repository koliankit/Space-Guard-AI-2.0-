import React, { useEffect, useState } from 'react'
import { sounds } from '../../utils/soundEffects'

export type DashboardTab = 'wall' | 'telemetry' | 'matrix' | 'orbital' | 'subsystems' | 'report'

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

  const TABS: { id: DashboardTab; label: string; tag: string; icon?: string }[] = [
    { id: 'wall', label: 'Panoramic MCC Wall', tag: '00', icon: '🖥️' },
    { id: 'telemetry', label: '3D Satellite & Telemetry', tag: '01' },
    { id: 'matrix', label: 'AI Screening Matrix', tag: '02' },
    { id: 'orbital', label: 'Orbital DSN Tracking', tag: '03' },
    { id: 'subsystems', label: 'Subsystem Diagnostics', tag: '04' },
    { id: 'report', label: 'Clearance Report & PDF', tag: '05' },
  ]

  return (
    <header className="border-b border-slate-800 bg-[#0B1120] relative z-20 font-sans">
      {/* Top Banner: Official ISRO SDSC SHAR Header */}
      <div className="flex flex-wrap items-center justify-between px-6 py-2.5 border-b border-slate-800/80 gap-3">
        {/* Official ISRO Title & Mission Crest */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border border-slate-700 bg-[#111A2E] flex flex-col items-center justify-center text-white font-bold text-xs shadow-sm">
            <span className="tracking-tight text-[11px] text-sky-400">ISRO</span>
            <span className="text-[7.5px] text-emerald-400 font-mono tracking-wider">SHAR</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="m-0 text-sm font-bold tracking-wide text-white">
                SpaceGuard AI <span className="text-slate-500 font-normal">|</span> <span className="text-sky-400">SDSC SHAR Mission Operations</span>
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                Sriharikota LCC
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-normal mt-0.5">
              MIL-STD-883 Method 1005 HTOL Component Screening &amp; Latent Drift Assurance
            </div>
          </div>
        </div>

        {/* Live Synchronized Mission Timers & Telemetry Cues */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1 rounded-md bg-[#101827] border border-slate-800 flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase font-medium">IST</span>
            <span className="font-mono font-bold text-slate-100 text-xs">{istTime || '16:15:00'}</span>
          </div>
          <div className="px-3 py-1 rounded-md bg-[#101827] border border-emerald-500/30 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-emerald-400 uppercase font-medium">MET</span>
            <span className="font-mono font-bold text-emerald-300 text-xs">{formatMet(metSeconds)}</span>
          </div>
          <div className="px-3 py-1 rounded-md bg-[#101827] border border-slate-800 flex items-center gap-2 hidden md:flex">
            <span className={`w-1.5 h-1.5 rounded-full ${streamActive ? 'bg-sky-400' : 'bg-slate-600'}`} />
            <span className="text-[10px] text-slate-400">DSN</span>
            <span className={`font-mono text-xs font-semibold ${streamActive ? 'text-sky-300' : 'text-slate-500'}`}>
              {streamActive ? 'LOCKED' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Action Buttons & Audio */}
        <div className="flex items-center gap-2 text-xs">
          {rejectCount > 0 && (
            <div className="flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/40 px-2.5 py-1 rounded-md text-rose-300 font-medium text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>{rejectCount} Quarantined</span>
            </div>
          )}

          {onOpenIngestModal && (
            <button
              type="button"
              onClick={() => {
                sounds.playPing()
                onOpenIngestModal()
              }}
              className="text-[11.5px] font-medium px-3 py-1.5 rounded-md border border-sky-500/50 bg-sky-500/15 text-sky-300 hover:bg-sky-500 hover:text-white transition-all flex items-center gap-1.5"
              title="Upload CSV Telemetry or Select Flight Batch"
            >
              <span>📁</span> Ingest CSV Data
            </button>
          )}

          {onOpenPitchModal && (
            <button
              type="button"
              onClick={() => {
                sounds.playPing()
                onOpenPitchModal()
              }}
              className="text-[11.5px] font-medium px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-1.5"
              title="View Official ISRO Briefing Deck (Press 'P')"
            >
              <span>📑</span> Briefing Deck
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const newState = sounds.toggle()
                setSoundOn(newState)
                if (newState) sounds.playPing()
              }}
              className="px-2 py-1.5 rounded-md border border-slate-800 bg-[#101827] text-slate-400 hover:text-white text-xs flex items-center gap-1 transition-colors"
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
              className="px-2 py-1.5 rounded-md border border-slate-800 bg-[#101827] text-slate-400 hover:text-white text-xs flex items-center gap-1 transition-colors"
              title="Toggle Fullscreen"
            >
              <span>⛶</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Navigation Bar: High Visual Clarity of Active Tab */}
      <div className="flex items-center justify-between px-6 py-2 bg-[#080D1A] border-t border-slate-800/60 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mr-2 hidden md:inline">
            CONSOLE:
          </span>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`text-[11.5px] px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 font-medium border ${
                  isActive
                    ? 'bg-sky-600 border-sky-500 text-white font-semibold shadow-sm'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.icon && <span className="text-xs">{tab.icon}</span>}
                <span className={`text-[10px] font-mono ${isActive ? 'text-sky-100 opacity-90' : 'text-slate-400'}`}>[{tab.tag}]</span>
                <span>{tab.label}</span>
                {tab.id === 'matrix' && totalComponents > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'}`}>
                    {totalComponents}
                  </span>
                )}
                {tab.id === 'report' && rejectCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold">
                    !
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 hidden lg:flex">
          <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/80 text-slate-300 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            Target Profile: <span className="text-white font-semibold">{activeMissionName}</span>
          </span>
        </div>
      </div>
    </header>
  )
}
