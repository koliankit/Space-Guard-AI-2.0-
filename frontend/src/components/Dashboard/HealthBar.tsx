import React from 'react'

export default function HealthBar({
  health,
  safe,
  monitor,
  reject,
}: {
  health: number | null
  safe: number | null
  monitor: number | null
  reject: number | null
}) {
  return (
    <div className="border-b border-slate-800/90 bg-[#070D1A] px-4 md:px-6 py-2 select-none w-full">
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Metric 1: Overall Mission Reliability */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1325] border border-slate-800/90 hover:border-amber-500/40 transition-colors">
          <div>
            <div className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Mission Reliability
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-xl lg:text-2xl font-black text-white tracking-tight tabular-nums">
                {health === null ? '—' : health}
              </span>
              <span className="font-mono text-xs font-bold text-amber-400">%</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-[11px]">
            {health && health >= 75 ? 'NOM' : 'WARN'}
          </div>
        </div>

        {/* Metric 2: Safe Nominal Components */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1325] border border-slate-800/90 hover:border-emerald-500/40 transition-colors">
          <div>
            <div className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Flight Nominal Units
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl lg:text-2xl font-black text-emerald-400 tracking-tight tabular-nums">
                {safe === null ? '—' : safe}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">verified safe</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold font-mono">
            OK
          </div>
        </div>

        {/* Metric 3: Drift Warning */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1325] border border-slate-800/90 hover:border-amber-500/40 transition-colors">
          <div>
            <div className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Parametric Drift Watch
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl lg:text-2xl font-black text-amber-400 tracking-tight tabular-nums">
                {monitor === null ? '—' : monitor}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">monitored</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold font-mono">
            OBS
          </div>
        </div>

        {/* Metric 4: Quarantined Defects */}
        <div
          className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
            (reject ?? 0) > 0
              ? 'bg-rose-950/25 border-rose-500/50 shadow-alert'
              : 'bg-[#0B1325] border-slate-800/90'
          }`}
        >
          <div>
            <div className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Quarantined Silicon
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`font-mono text-xl lg:text-2xl font-black tracking-tight tabular-nums ${
                  (reject ?? 0) > 0 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {reject === null ? '—' : reject}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">isolated</span>
            </div>
          </div>
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold font-mono ${
              (reject ?? 0) > 0
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                : 'bg-slate-800/40 border border-slate-700/40 text-slate-500'
            }`}
          >
            {(reject ?? 0) > 0 ? 'ISO' : '0'}
          </div>
        </div>
      </div>
    </div>
  )
}

