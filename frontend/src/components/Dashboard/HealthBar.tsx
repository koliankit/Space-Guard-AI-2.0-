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
    <div className="border-b border-slate-800/90 bg-[#070D1A] px-4 md:px-6 py-3 select-none w-full">
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Metric 1: Overall Mission Reliability */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#0B1325] border border-slate-800/90 hover:border-amber-500/50 transition-all shadow-sm">
          <div>
            <div className="text-xs md:text-sm font-display font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Mission Reliability
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-white tracking-tight tabular-nums">
                {health === null ? '—' : health}
              </span>
              <span className="font-mono text-base font-bold text-amber-400">%</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300 font-mono font-black text-xs md:text-sm shadow-sm">
            {health && health >= 75 ? 'NOM' : 'WARN'}
          </div>
        </div>

        {/* Metric 2: Safe Nominal Components */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#0B1325] border border-slate-800/90 hover:border-emerald-500/50 transition-all shadow-sm">
          <div>
            <div className="text-xs md:text-sm font-display font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Flight Nominal Units
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-emerald-400 tracking-tight tabular-nums">
                {safe === null ? '—' : safe}
              </span>
              <span className="text-xs md:text-sm text-slate-400 font-sans font-medium">verified safe</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-300 text-xs md:text-sm font-black font-mono shadow-sm">
            OK
          </div>
        </div>

        {/* Metric 3: Drift Warning */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#0B1325] border border-slate-800/90 hover:border-amber-500/50 transition-all shadow-sm">
          <div>
            <div className="text-xs md:text-sm font-display font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Parametric Drift Watch
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-amber-400 tracking-tight tabular-nums">
                {monitor === null ? '—' : monitor}
              </span>
              <span className="text-xs md:text-sm text-slate-400 font-sans font-medium">monitored</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300 text-xs md:text-sm font-black font-mono shadow-sm">
            OBS
          </div>
        </div>

        {/* Metric 4: Quarantined Defects */}
        <div
          className={`flex items-center justify-between p-4 rounded-xl border transition-all shadow-sm ${
            (reject ?? 0) > 0
              ? 'bg-rose-950/30 border-rose-500/60 shadow-alert'
              : 'bg-[#0B1325] border-slate-800/90 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="text-xs md:text-sm font-display font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Quarantined Silicon
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-mono text-2xl lg:text-3xl xl:text-4xl font-black tracking-tight tabular-nums ${
                  (reject ?? 0) > 0 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {reject === null ? '—' : reject}
              </span>
              <span className="text-xs md:text-sm text-slate-400 font-sans font-medium">isolated</span>
            </div>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs md:text-sm font-black font-mono shadow-sm ${
              (reject ?? 0) > 0
                ? 'bg-rose-500/25 border border-rose-500/50 text-rose-300'
                : 'bg-slate-800/50 border border-slate-700/50 text-slate-400'
            }`}
          >
            {(reject ?? 0) > 0 ? 'ISO' : '0'}
          </div>
        </div>
      </div>
    </div>
  )
}
