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
    <div className="border-b border-slate-800/80 bg-[#070D1A]/95 px-6 py-3 select-none">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        {/* Metric 1: Overall Mission Health */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B1325] border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div>
            <div className="text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Mission Reliability
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                {health === null ? '—' : health}
              </span>
              <span className="font-mono text-sm font-bold text-sky-400">%</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-xs">
            {health && health >= 75 ? 'NOM' : 'WARN'}
          </div>
        </div>

        {/* Metric 2: Safe Nominal Components */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B1325] border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div>
            <div className="text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Safe Nominal
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl lg:text-3xl font-extrabold text-emerald-400 tracking-tight">
                {safe === null ? '—' : safe}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">verified units</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
            ✓
          </div>
        </div>

        {/* Metric 3: Drift Warning */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B1325] border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div>
            <div className="text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Parametric Drift
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl lg:text-3xl font-extrabold text-amber-400 tracking-tight">
                {monitor === null ? '—' : monitor}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">under watch</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold">
            ⚠
          </div>
        </div>

        {/* Metric 4: Quarantined Defects */}
        <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
          (reject ?? 0) > 0
            ? 'bg-rose-950/20 border-rose-500/40'
            : 'bg-[#0B1325] border-slate-800/80'
        }`}>
          <div>
            <div className="text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Quarantined Defects
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`font-mono text-2xl lg:text-3xl font-extrabold tracking-tight ${
                (reject ?? 0) > 0 ? 'text-rose-400' : 'text-slate-400'
              }`}>
                {reject === null ? '—' : reject}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">isolated</span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
            (reject ?? 0) > 0
              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
              : 'bg-slate-800/40 border border-slate-700/40 text-slate-500'
          }`}>
            {(reject ?? 0) > 0 ? '⛔' : '0'}
          </div>
        </div>
      </div>
    </div>
  )
}
