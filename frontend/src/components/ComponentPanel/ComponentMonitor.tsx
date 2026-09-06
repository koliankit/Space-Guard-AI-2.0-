import { useState } from 'react'
import type { ComponentOut, SubsystemStatus } from '../../types'

const DOT_COLOR: Record<string, string> = {
  safe: 'bg-safe shadow-[0_0_8px_#00FF87]',
  monitor: 'bg-monitor shadow-[0_0_8px_#FFB020]',
  reject: 'bg-reject shadow-[0_0_10px_#FF334B] dot-pulse',
  idle: 'bg-[#1D3252]',
}

export default function ComponentMonitor({
  subsystems,
  components,
  analysisRun,
  selectedId,
  onSelectSubsystem,
  onSelectComponent,
  onSearch,
  onFilter,
}: {
  subsystems: SubsystemStatus[]
  components: ComponentOut[]
  analysisRun: boolean
  selectedId: string | null
  onSelectSubsystem: (key: string) => void
  onSelectComponent: (id: string) => void
  onSearch: (term: string) => void
  onFilter: (mode: string) => void
}) {
  const [filter, setFilter] = useState('ALL')

  return (
    <div className="bg-panel p-3.5 border-r border-line flex flex-col h-full overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="m-0 text-[11px] font-display tracking-widest uppercase text-cyan text-glow-cyan flex items-center gap-2">
          <span className="w-1.5 h-3 bg-cyan inline-block shadow-[0_0_6px_#00F0FF]" />
          Subsystem Monitor
        </h3>
        <span className="text-[9px] text-muted tracking-wider">ISRO-INSTR-01</span>
      </div>

      {/* Cyber Search Terminal Input */}
      <div className="relative mb-2">
        <span className="absolute left-2.5 top-2 text-cyan text-xs font-mono font-bold">&gt;</span>
        <input
          className="w-full pl-6 pr-2.5 py-1.5 bg-[#061224] border border-line rounded text-slate-100 font-mono text-xs focus:border-cyan focus:shadow-neon-cyan outline-none transition-all placeholder:text-muted"
          placeholder="SEARCH ISRO COMPONENT ID..."
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Filter Mode Selector */}
      <div className="flex gap-1 mb-3">
        {['ALL', 'SAFE', 'MONITOR', 'REJECT'].map((f) => {
          const isActive = filter === f
          const activeClass =
            f === 'SAFE'
              ? 'border-safe bg-safe/20 text-safe font-bold shadow-neon-green'
              : f === 'REJECT'
              ? 'border-reject bg-reject/20 text-reject font-bold shadow-alert-glow'
              : f === 'MONITOR'
              ? 'border-monitor bg-monitor/20 text-monitor font-bold'
              : 'border-cyan bg-cyan/20 text-cyan font-bold shadow-neon-cyan'

          return (
            <button
              key={f}
              type="button"
              className={`flex-1 py-1 px-0.5 text-[9.5px] font-mono uppercase rounded border transition-all ${
                isActive ? activeClass : 'border-line bg-bg text-muted hover:text-white'
              }`}
              onClick={() => {
                setFilter(f)
                onFilter(f)
              }}
            >
              {f}
            </button>
          )
        })}
      </div>

      {/* Subsystem List */}
      <div className="text-[9.5px] font-mono uppercase text-muted tracking-wider mb-1.5 flex justify-between">
        <span>Subsystems</span>
        <span>Count</span>
      </div>
      <div className="max-h-[175px] overflow-y-auto space-y-0.5 pr-1 mb-3">
        {subsystems.map((s) => (
          <div
            key={s.key}
            className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-xs font-mono hover:bg-[#0C1D38] transition-all border border-transparent hover:border-line"
            onClick={() => onSelectSubsystem(s.key)}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLOR[s.status] ?? DOT_COLOR.idle}`} />
            <span className="font-bold text-cyan text-[10.5px] w-8">[{s.key}]</span>
            <span className="flex-1 text-slate-200 truncate text-[11px]">{s.name}</span>
            <span className="text-muted text-[10px]">{s.count}</span>
          </div>
        ))}
      </div>

      {/* Flagged Components Feed */}
      <div className="pt-2.5 border-t border-line flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between text-[9.5px] font-mono uppercase text-muted tracking-wider mb-1.5">
          <span>Flagged Feed</span>
          <span className="text-safe font-bold">{components.length} parts</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {!analysisRun && (
            <div className="text-muted text-[11px] font-mono px-1 py-2">
              [ Awaiting AI Screening execution ]
            </div>
          )}
          {analysisRun && components.length === 0 && (
            <div className="text-muted text-[11px] font-mono px-1 py-2">
              [ No anomalous components found ]
            </div>
          )}
          {analysisRun &&
            components.map((c) => (
              <div
                key={c.component_id}
                className={`flex justify-between items-center py-1.5 px-2 rounded cursor-pointer font-mono text-[11px] transition-all border ${
                  selectedId === c.component_id
                    ? 'border-cyan bg-cyan/20 text-white shadow-neon-cyan font-bold'
                    : 'border-line/60 bg-[#071324] hover:border-cyan/50 hover:bg-[#0C1E36]'
                }`}
                onClick={() => onSelectComponent(c.component_id)}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      c.status === 'safe'
                        ? 'bg-safe'
                        : c.status === 'monitor'
                        ? 'bg-monitor'
                        : 'bg-reject led'
                    }`}
                  />
                  <span className="text-slate-100">{c.component_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-muted">{c.subsystem}</span>
                  <span
                    className={`font-bold px-1 rounded text-[10px] ${
                      c.status === 'safe'
                        ? 'text-safe bg-safe/10'
                        : c.status === 'monitor'
                        ? 'text-monitor bg-monitor/10'
                        : 'text-reject bg-reject/15'
                    }`}
                  >
                    {c.risk_score}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
