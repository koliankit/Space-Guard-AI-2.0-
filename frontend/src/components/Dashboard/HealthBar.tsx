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
    <div className="border-b border-[#D5E2EA] bg-[#EEF4F8] px-4 md:px-6 py-3 select-none w-full relative">
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Metric 1: Overall Mission Reliability */}
        <div className="relative overflow-hidden flex items-center justify-between p-4 rounded-xl bg-[#FFFFFF] border border-[#D5E2EA] hover:border-[#0E88D3]/50 transition-all shadow-[0_4px_18px_rgba(14,50,80,0.06)]">
          {/* Subtle background telemetry watermark */}
          <svg className="pointer-events-none absolute right-1 bottom-1 w-24 h-16 opacity-20 text-[#0E88D3]" viewBox="0 0 96 64" fill="none">
            <line x1="12" y1="48" x2="48" y2="20" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 3" />
            <line x1="48" y1="20" x2="84" y2="36" stroke="currentColor" strokeWidth="0.8" />
            <circle cx="12" cy="48" r="2" fill="currentColor" />
            <circle cx="48" cy="20" r="2.5" fill="currentColor" />
            <circle cx="84" cy="36" r="2" fill="currentColor" />
          </svg>

          <div className="relative z-[1]">
            <div className="text-xs md:text-sm font-display font-bold text-[#4F6170] uppercase tracking-wider mb-1.5">
              Mission Reliability
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-[#17212B] tracking-tight tabular-nums">
                {health === null ? '—' : health}
              </span>
              <span className="font-mono text-base font-bold text-[#0E88D3]">%</span>
            </div>
          </div>
          <div className="relative z-[1] w-10 h-10 rounded-xl bg-[#F8FBFD] border border-[#0E88D3]/40 flex items-center justify-center text-[#0E88D3] font-mono font-black text-xs md:text-sm shadow-sm">
            {health && health >= 75 ? 'NOM' : 'WARN'}
          </div>
        </div>

        {/* Metric 2: Safe Nominal Components */}
        <div className="relative overflow-hidden flex items-center justify-between p-4 rounded-xl bg-[#FFFFFF] border border-[#D5E2EA] hover:border-[#168A5B]/50 transition-all shadow-[0_4px_18px_rgba(14,50,80,0.06)]">
          {/* Subtle background telemetry watermark */}
          <svg className="pointer-events-none absolute right-1 bottom-1 w-24 h-16 opacity-20 text-[#168A5B]" viewBox="0 0 96 64" fill="none">
            <line x1="16" y1="32" x2="52" y2="16" stroke="currentColor" strokeWidth="0.8" />
            <line x1="52" y1="16" x2="80" y2="44" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 3" />
            <circle cx="16" cy="32" r="2" fill="currentColor" />
            <circle cx="52" cy="16" r="2.5" fill="currentColor" />
            <circle cx="80" cy="44" r="2" fill="currentColor" />
          </svg>

          <div className="relative z-[1]">
            <div className="text-xs md:text-sm font-display font-bold text-[#4F6170] uppercase tracking-wider mb-1.5">
              Flight Nominal Units
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-[#168A5B] tracking-tight tabular-nums">
                {safe === null ? '—' : safe}
              </span>
              <span className="text-xs md:text-sm text-[#718292] font-sans font-medium">verified safe</span>
            </div>
          </div>
          <div className="relative z-[1] w-10 h-10 rounded-xl bg-[#F8FBFD] border border-[#168A5B]/40 flex items-center justify-center text-[#168A5B] text-xs md:text-sm font-black font-mono shadow-sm">
            OK
          </div>
        </div>

        {/* Metric 3: Drift Warning */}
        <div className="relative overflow-hidden flex items-center justify-between p-4 rounded-xl bg-[#FFFFFF] border border-[#D5E2EA] hover:border-[#C58A00]/50 transition-all shadow-[0_4px_18px_rgba(14,50,80,0.06)]">
          {/* Subtle background telemetry watermark */}
          <svg className="pointer-events-none absolute right-1 bottom-1 w-24 h-16 opacity-20 text-[#C58A00]" viewBox="0 0 96 64" fill="none">
            <line x1="10" y1="24" x2="44" y2="44" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 3" />
            <line x1="44" y1="44" x2="78" y2="28" stroke="currentColor" strokeWidth="0.8" />
            <circle cx="10" cy="24" r="2" fill="currentColor" />
            <circle cx="44" cy="44" r="2.5" fill="currentColor" />
            <circle cx="78" cy="28" r="2" fill="currentColor" />
          </svg>

          <div className="relative z-[1]">
            <div className="text-xs md:text-sm font-display font-bold text-[#4F6170] uppercase tracking-wider mb-1.5">
              Parametric Drift Watch
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-[#C58A00] tracking-tight tabular-nums">
                {monitor === null ? '—' : monitor}
              </span>
              <span className="text-xs md:text-sm text-[#718292] font-sans font-medium">monitored</span>
            </div>
          </div>
          <div className="relative z-[1] w-10 h-10 rounded-xl bg-[#F8FBFD] border border-[#C58A00]/40 flex items-center justify-center text-[#C58A00] text-xs md:text-sm font-black font-mono shadow-sm">
            OBS
          </div>
        </div>

        {/* Metric 4: Quarantined Defects */}
        <div
          className={`relative overflow-hidden flex items-center justify-between p-4 rounded-xl border transition-all shadow-[0_4px_18px_rgba(14,50,80,0.06)] ${
            (reject ?? 0) > 0
              ? 'bg-[#FEF2F2] border-[#D9363E]/60 animate-alert-once'
              : 'bg-[#FFFFFF] border-[#D5E2EA] hover:border-[#D5E2EA]'
          }`}
        >
          {/* Subtle background telemetry watermark */}
          <svg className="pointer-events-none absolute right-1 bottom-1 w-24 h-16 opacity-20 text-[#D9363E]" viewBox="0 0 96 64" fill="none">
            <line x1="14" y1="42" x2="50" y2="18" stroke="currentColor" strokeWidth="0.8" />
            <line x1="50" y1="18" x2="82" y2="40" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 3" />
            <circle cx="14" cy="42" r="2" fill="currentColor" />
            <circle cx="50" cy="18" r="2.5" fill="currentColor" />
            <circle cx="82" cy="40" r="2" fill="currentColor" />
          </svg>

          <div className="relative z-[1]">
            <div className="text-xs md:text-sm font-display font-bold text-[#4F6170] uppercase tracking-wider mb-1.5">
              Quarantined Silicon
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-mono text-2xl lg:text-3xl xl:text-4xl font-black tracking-tight tabular-nums ${
                  (reject ?? 0) > 0 ? 'text-[#D9363E]' : 'text-[#718292]'
                }`}
              >
                {reject === null ? '—' : reject}
              </span>
              <span className="text-xs md:text-sm text-[#718292] font-sans font-medium">isolated</span>
            </div>
          </div>
          <div
            className={`relative z-[1] w-10 h-10 rounded-xl flex items-center justify-center text-xs md:text-sm font-black font-mono shadow-sm ${
              (reject ?? 0) > 0
                ? 'bg-[#FEF2F2] border border-[#D9363E]/50 text-[#D9363E]'
                : 'bg-[#F8FBFD] border border-[#D5E2EA] text-[#718292]'
            }`}
          >
            {(reject ?? 0) > 0 ? 'ISO' : '0'}
          </div>
        </div>
      </div>
    </div>
  )
}
