import { useState } from 'react'
import type { ComponentOut, SubsystemStatus } from '../../types'

const DOT_COLOR: Record<string, string> = {
  safe: 'bg-emerald-400',
  monitor: 'bg-amber-400',
  reject: 'bg-rose-500',
  idle: 'bg-slate-600',
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
    <div className="bg-[#0B1120] p-4 border-r border-slate-800 flex flex-col h-full overflow-hidden font-sans text-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          Subsystem Monitor
        </h3>
        <span className="text-[10px] font-mono text-slate-400">ISRO-INSTR-01</span>
      </div>

      {/* Clean Search Input */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
        <input
          className="w-full pl-8 pr-3 py-1.5 bg-[#070D1A] border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:border-sky-500 outline-none transition-all placeholder:text-slate-500"
          placeholder="Search Component ID..."
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Filter Mode Selector */}
      <div className="flex gap-1.5 mb-3">
        {['ALL', 'SAFE', 'MONITOR', 'REJECT'].map((f) => {
          const isActive = filter === f
          const activeClass =
            f === 'SAFE'
              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-semibold'
              : f === 'REJECT'
              ? 'border-rose-500 bg-rose-500/20 text-rose-300 font-semibold'
              : f === 'MONITOR'
              ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-semibold'
              : 'border-sky-500 bg-sky-500/20 text-sky-300 font-semibold'

          return (
            <button
              key={f}
              type="button"
              className={`flex-1 py-1 px-1 text-[10px] font-medium uppercase rounded-md border transition-all ${
                isActive ? activeClass : 'border-slate-800 bg-[#070D1A] text-slate-400 hover:text-white'
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
      <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5 flex justify-between">
        <span>Subsystems</span>
        <span>Count</span>
      </div>
      <div className="max-h-[175px] overflow-y-auto space-y-0.5 pr-1 mb-3">
        {subsystems.map((s) => (
          <div
            key={s.key}
            className="flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer text-xs hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-700"
            onClick={() => onSelectSubsystem(s.key)}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLOR[s.status] ?? DOT_COLOR.idle}`} />
            <span className="font-mono font-bold text-sky-400 text-[11px] w-9">[{s.key}]</span>
            <span className="flex-1 text-slate-200 truncate text-[11.5px]">{s.name}</span>
            <span className="font-mono text-slate-400 text-[10.5px]">{s.count}</span>
          </div>
        ))}
      </div>

      {/* Flagged Components Feed */}
      <div className="pt-3 border-t border-slate-800 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-2">
          <span>Component Feed</span>
          <span className="font-mono text-emerald-400 font-bold">{components.length} parts</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {!analysisRun && (
            <div className="text-slate-400 text-xs px-2 py-3 text-center bg-[#070D1A] rounded-lg border border-slate-800">
              Awaiting AI Screening execution
            </div>
          )}
          {analysisRun && components.length === 0 && (
            <div className="text-slate-400 text-xs px-2 py-3 text-center bg-[#070D1A] rounded-lg border border-slate-800">
              No anomalous components found
            </div>
          )}
          {analysisRun &&
            components.map((c) => (
              <div
                key={c.component_id}
                className={`flex justify-between items-center py-2 px-2.5 rounded-lg cursor-pointer text-xs transition-all border ${
                  selectedId === c.component_id
                    ? 'border-sky-500 bg-sky-500/15 text-white font-semibold shadow-sm'
                    : 'border-slate-800/80 bg-[#070D1A] hover:border-slate-700 hover:bg-slate-800/40'
                }`}
                onClick={() => onSelectComponent(c.component_id)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      c.status === 'safe'
                        ? 'bg-emerald-400'
                        : c.status === 'monitor'
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-mono text-slate-100 text-xs">{c.component_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{c.subsystem}</span>
                  <span
                    className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10.5px] ${
                      c.status === 'safe'
                        ? 'text-emerald-300 bg-emerald-500/15'
                        : c.status === 'monitor'
                        ? 'text-amber-300 bg-amber-500/15'
                        : 'text-rose-300 bg-rose-500/20'
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
