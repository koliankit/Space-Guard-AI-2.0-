import React, { useEffect, useState } from 'react'

export type DashboardTab = 'wall' | 'telemetry' | 'matrix' | 'orbital' | 'subsystems' | 'report'

interface HeaderProps {
  streamActive: boolean
  activeTab: DashboardTab
  onSelectTab: (tab: DashboardTab) => void
  totalComponents?: number
  rejectCount?: number
}

export default function Header({
  streamActive,
  activeTab,
  onSelectTab,
  totalComponents = 0,
  rejectCount = 0,
}: HeaderProps) {
  const [istTime, setIstTime] = useState('')
  const [utcTime, setUtcTime] = useState('')
  const [metSeconds, setMetSeconds] = useState(14820) // Simulated Mission Elapsed Time

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
    <header className="border-b border-line bg-gradient-to-b from-[#041A0B] to-[#010A04] relative z-20 font-mono">
      {/* Top Banner: Official ISRO SDSC SHAR Sriharikota Header */}
      <div className="flex flex-wrap items-center justify-between px-6 py-2.5 border-b border-line/60 gap-3">
        {/* Official ISRO Title & Mission Crest */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-cyan/80 flex flex-col items-center justify-center text-cyan bg-[#062612] shadow-neon-cyan font-display font-black text-xs tracking-tighter">
            <span>ISRO</span>
            <span className="text-[7px] text-safe font-mono tracking-widest">SHAR</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="m-0 text-sm font-display font-black tracking-widest text-slate-100 text-glow-green uppercase">
                भारतीय अंतरिक्ष अनुसंधान संगठन &bull; <span className="text-cyan">ISRO</span>
              </h1>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/40 font-bold">
                SDSC SHAR SRIHARIKOTA
              </span>
            </div>
            <div className="text-[10.5px] font-mono text-slate-300 tracking-wider uppercase flex flex-wrap items-center gap-2 mt-0.5">
              <span className="font-bold text-white">MISSION CONTROL CENTRE (MCC)</span>
              <span className="text-line">&bull;</span>
              <span className="text-slate-400">Range Operations Directorate</span>
              <span className="text-line">&bull;</span>
              <span className="text-safe font-bold">MIL-STD-883 HTOL</span>
            </div>
          </div>
        </div>

        {/* Live Synchronized Mission Timers (IST / UTC / MET) */}
        <div className="flex items-center gap-2 text-xs">
          <div className="hud-glass px-2.5 py-1 rounded border border-line flex flex-col items-center">
            <span className="text-[8px] text-muted uppercase tracking-wider">IST (SRIHARIKOTA)</span>
            <span className="font-bold text-cyan text-[11px]">{istTime || '16:15:00'}</span>
          </div>
          <div className="hud-glass px-2.5 py-1 rounded border border-line flex flex-col items-center">
            <span className="text-[8px] text-muted uppercase tracking-wider">UTC TIME</span>
            <span className="font-bold text-slate-200 text-[11px]">{utcTime || '10:45:00'}</span>
          </div>
          <div className="hud-glass px-2.5 py-1 rounded border border-safe/40 bg-safe/10 flex flex-col items-center">
            <span className="text-[8px] text-safe uppercase tracking-wider">MISSION ELAPSED</span>
            <span className="font-bold text-safe text-[11px]">{formatMet(metSeconds)}</span>
          </div>
        </div>

        {/* Live Status Indicators: Range Safety, AI Screening, DSN Uplink */}
        <div className="flex gap-2 font-mono text-[10.5px] text-muted items-center">
          <div className="flex items-center gap-1.5 hud-glass px-2.5 py-1 rounded border border-line">
            <span className="w-1.5 h-1.5 rounded-full bg-safe shadow-[0_0_8px_#39FF14] led" />
            <span className="text-slate-200">RANGE:</span>
            <span className="text-safe font-bold">ARMED</span>
          </div>

          <div className="flex items-center gap-1.5 hud-glass px-2.5 py-1 rounded border border-line">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan shadow-[0_0_8px_#39FF14] led" />
            <span className="text-slate-200">AI DETECTOR:</span>
            <span className="text-cyan font-bold">ACTIVE</span>
          </div>

          <div className="flex items-center gap-1.5 hud-glass px-2.5 py-1 rounded border border-line">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                streamActive ? 'bg-safe shadow-[0_0_8px_#39FF14] led' : 'bg-dim'
              }`}
            />
            <span className="text-slate-200">DSN:</span>
            <span className={streamActive ? 'text-safe font-bold' : 'text-muted'}>
              {streamActive ? 'LOCKED' : 'STANDBY'}
            </span>
          </div>

          {rejectCount > 0 && (
            <div className="flex items-center gap-1.5 bg-reject/15 border border-reject px-2.5 py-1 rounded shadow-alert-glow">
              <span className="w-1.5 h-1.5 rounded-full bg-reject led" />
              <span className="text-reject font-bold">{rejectCount} DEFECTS</span>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-1.5 bg-[#021408] border-t border-line/40 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted uppercase tracking-wider font-bold mr-2 hidden md:inline">
            MCC CONSOLE:
          </span>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`font-mono text-[11px] px-3.5 py-1.5 rounded transition-all flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-cyan/15 border-cyan text-cyan shadow-neon-cyan font-bold'
                    : 'hud-glass-interactive border-line/70 text-muted hover:text-white hover:border-line'
                }`}
              >
                {tab.icon && <span>{tab.icon}</span>}
                <span className={`text-[9px] ${isActive ? 'text-cyan' : 'text-dim'}`}>[{tab.tag}]</span>
                <span>{tab.label}</span>
                {tab.id === 'matrix' && totalComponents > 0 && (
                  <span className={`text-[9px] px-1 rounded ${isActive ? 'bg-cyan text-black font-bold' : 'bg-line text-muted'}`}>
                    {totalComponents}
                  </span>
                )}
                {tab.id === 'report' && rejectCount > 0 && (
                  <span className="text-[9px] px-1 rounded bg-reject text-white font-bold">
                    !
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="text-[10px] text-muted tracking-widest hidden lg:block">
          SDSC SHAR MCC &bull; 13.7199&deg; N, 80.2304&deg; E &bull; LAUNCH PAD: SLP
        </div>
      </div>
    </header>
  )
}
