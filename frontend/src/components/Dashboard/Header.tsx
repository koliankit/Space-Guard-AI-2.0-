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
  activeMissionName?: string
}

export default function Header({
  streamActive,
  activeTab,
  onSelectTab,
  totalComponents = 0,
  rejectCount = 0,
  onOpenPitchModal,
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
    { id: 'wall', label: 'PANORAMIC MCC WALL', tag: '00', icon: '🖥️' },
    { id: 'telemetry', label: '3D SATELLITE & TELEMETRY', tag: '01' },
    { id: 'matrix', label: 'AI SCREENING MATRIX', tag: '02' },
    { id: 'orbital', label: 'ORBITAL DSN TRACKING', tag: '03' },
    { id: 'subsystems', label: 'SUBSYSTEM DIAGNOSTICS', tag: '04' },
    { id: 'report', label: 'CLEARANCE REPORT & PDF', tag: '05' },
  ]

  return (
    <header className="border-b border-slate-800 bg-[#080E1C] relative z-20 font-mono">
      {/* Top Banner: Official ISRO SDSC SHAR Header */}
      <div className="flex flex-wrap items-center justify-between px-5 py-2.5 border-b border-slate-800/80 gap-3">
        {/* Official ISRO Title & Mission Crest */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border border-cyan/60 flex flex-col items-center justify-center text-cyan bg-[#0B1528] font-display font-black text-xs tracking-tighter shadow-sm">
            <span>ISRO</span>
            <span className="text-[7px] text-emerald-400 font-mono tracking-widest">SHAR</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="m-0 text-xs font-display font-black tracking-widest text-white uppercase">
                SPACEGUARD AI &bull; <span className="text-cyan">ISRO SDSC SHAR</span>
              </h1>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/30 font-bold">
                MCC SRIHARIKOTA
              </span>
            </div>
            <div className="text-[10px] text-slate-400 tracking-wider uppercase flex items-center gap-2 mt-0.5">
              <span>MIL-STD-883 Method 1005 HTOL Reliability Engine</span>
            </div>
          </div>
        </div>

        {/* Live Synchronized Mission Timers & Telemetry Cues */}
        <div className="flex items-center gap-2 text-xs">
          <div className="hud-glass px-2.5 py-1 rounded border border-slate-800 flex items-center gap-2">
            <span className="text-[9px] text-slate-400 uppercase">IST:</span>
            <span className="font-bold text-cyan text-[11px]">{istTime || '16:15:00'}</span>
          </div>
          <div className="hud-glass px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 led" />
            <span className="text-[9px] text-emerald-400 uppercase">MET:</span>
            <span className="font-bold text-emerald-400 text-[11px]">{formatMet(metSeconds)}</span>
          </div>
          <div className="hud-glass px-2.5 py-1 rounded border border-slate-800 flex items-center gap-2 hidden md:flex">
            <span className={`w-1.5 h-1.5 rounded-full ${streamActive ? 'bg-cyan led' : 'bg-slate-500'}`} />
            <span className="text-[9px] text-slate-400">DSN:</span>
            <span className={streamActive ? 'text-cyan font-bold text-[10px]' : 'text-slate-500 text-[10px]'}>
              {streamActive ? 'LOCKED' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Action Buttons & Audio */}
        <div className="flex items-center gap-2 font-mono text-[10.5px]">
          {rejectCount > 0 && (
            <div className="flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/60 px-2.5 py-1 rounded text-rose-400 font-bold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 led" />
              <span>{rejectCount} QUARANTINED</span>
            </div>
          )}

          {onOpenPitchModal && (
            <button
              type="button"
              onClick={() => {
                sounds.playPing()
                onOpenPitchModal()
              }}
              className="font-display text-[11px] uppercase tracking-wider px-2.5 py-1 rounded border border-amber-500/60 bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-black transition-all flex items-center gap-1.5 font-bold"
              title="View Official ISRO Briefing Deck (Press 'P')"
            >
              <span>📑</span> BRIEFING DECK
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
              className="hud-glass px-2 py-1 rounded border border-slate-800 text-slate-400 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
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
              className="hud-glass px-2 py-1 rounded border border-slate-800 text-slate-400 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
              title="Toggle Fullscreen"
            >
              <span>⛶</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Navigation Bar: High Visual Clarity of Active Tab */}
      <div className="flex items-center justify-between px-5 py-1.5 bg-[#050A15] border-t border-slate-800/60 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mr-1.5 hidden md:inline">
            CONSOLE:
          </span>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`font-mono text-[11px] px-3 py-1 rounded-md transition-all flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-cyan/20 border-cyan text-cyan font-bold shadow-neon-cyan'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {tab.icon && <span className="text-xs">{tab.icon}</span>}
                <span className={`text-[9px] ${isActive ? 'text-cyan font-bold' : 'text-slate-500'}`}>[{tab.tag}]</span>
                <span>{tab.label}</span>
                {tab.id === 'matrix' && totalComponents > 0 && (
                  <span className={`text-[9px] px-1 rounded ${isActive ? 'bg-cyan text-black font-bold' : 'bg-slate-800 text-slate-400'}`}>
                    {totalComponents}
                  </span>
                )}
                {tab.id === 'report' && rejectCount > 0 && (
                  <span className="text-[9px] px-1 rounded bg-rose-500 text-white font-bold">
                    !
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-slate-400 tracking-wider hidden lg:flex">
          <span className="px-2 py-0.5 rounded bg-cyan/15 border border-cyan/30 text-cyan font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan led" />
            MISSION: {activeMissionName}
          </span>
        </div>
      </div>
    </header>
  )
}
