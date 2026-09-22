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
    <div className="border-b border-[#D7E0EA] bg-[#FFFFFF] px-4 md:px-6 py-3.5 select-none w-full relative shadow-xs">
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Metric 1: Overall Mission Reliability */}
        <div className="relative overflow-hidden flex items-center justify-between p-4 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] hover:border-[#005A9C]/50 transition-all shadow-[0_1px_3px_rgba(11,30,54,0.05)]">
          {/* Subtle background telemetry watermark */}
          <svg className="pointer-events-none absolute right-1 bottom-1 w-24 h-16 opacity-15 text-[#005A9C]" viewBox="0 0 96 64" fill="none">
            <line x1="12" y1="48" x2="48" y2="20" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="48" y1="20" x2="84" y2="36" stroke="currentColor" strokeWidth="1" />
            <circle cx="12" cy="48" r="2" fill="currentColor" />
            <circle cx="48" cy="20" r="2.5" fill="currentColor" />
            <circle cx="84" cy="36" r="2" fill="currentColor" />
          </svg>

          <div className="relative z-[1]">
            <div className="text-xs md:text-sm font-display font-bold text-[#334E68] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#005A9C]" />
              Mission Reliability
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-[#0B1E36] tracking-tight tabular-nums">
                {health === null ? '—' : health}
              </span>
              <span className="font-mono text-base font-bold text-[#005A9C]">%</span>
            </div>
          </div>
          <div className="relative z-[1] w-10 h-10 rounded-xl bg-[#FFFFFF] border border-[#005A9C]/30 flex items-center justify-center text-[#005A9C] font-mono font-black text-xs md:text-sm shadow-sm">
            {health && health >= 75 ? 'NOM' : 'WARN'}
          </div>
        </div>

        {/* Metric 2: Safe Nominal Components */}
        <div className="relative overflow-hidden flex items-center justify-between p-4 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] hover:border-[#168A5B]/50 transition-all shadow-[0_1px_3px_rgba(11,30,54,0.05)]">
          {/* Subtle background telemetry watermark */}
          <svg className="pointer-events-none absolute right-1 bottom-1 w-24 h-16 opacity-15 text-[#168A5B]" viewBox="0 0 96 64" fill="none">
            <line x1="16" y1="32" x2="52" y2="16" stroke="currentColor" strokeWidth="1" />
            <line x1="52" y1="16" x2="80" y2="44" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx="16" cy="32" r="2" fill="currentColor" />
            <circle cx="52" cy="16" r="2.5" fill="currentColor" />
            <circle cx="80" cy="44" r="2" fill="currentColor" />
          </svg>

          <div className="relative z-[1]">
            <div className="text-xs md:text-sm font-display font-bold text-[#334E68] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#168A5B]" />
              Flight Nominal Units
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-[#168A5B] tracking-tight tabular-nums">
                {safe === null ? '—' : safe}
              </span>
              <span className="text-xs md:text-sm text-[#475569] font-sans font-semibold">verified safe</span>
            </div>
          </div>
          <div className="relative z-[1] w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#168A5B]/40 flex items-center justify-center text-[#065F46] text-xs md:text-sm font-black font-mono shadow-sm">
            OK
          </div>
        </div>

        {/* Metric 3: Drift Warning */}
        <div className="relative overflow-hidden flex items-center justify-between p-4 rounded-xl bg-[#F8FAFD] border border-[#D7E0EA] hover:border-[#C58A00]/50 transition-all shadow-[0_1px_3px_rgba(11,30,54,0.05)]">
          {/* Subtle background telemetry watermark */}
          <svg className="pointer-events-none absolute right-1 bottom-1 w-24 h-16 opacity-15 text-[#C58A00]" viewBox="0 0 96 64" fill="none">
            <line x1="10" y1="24" x2="44" y2="44" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="44" y1="44" x2="78" y2="28" stroke="currentColor" strokeWidth="1" />
            <circle cx="10" cy="24" r="2" fill="currentColor" />
            <circle cx="44" cy="44" r="2.5" fill="currentColor" />
            <circle cx="78" cy="28" r="2" fill="currentColor" />
          </svg>

          <div className="relative z-[1]">
            <div className="text-xs md:text-sm font-display font-bold text-[#334E68] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C58A00]" />
              Parametric Drift Watch
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-[#B45309] tracking-tight tabular-nums">
                {monitor === null ? '—' : monitor}
              </span>
              <span className="text-xs md:text-sm text-[#475569] font-sans font-semibold">monitored</span>
            </div>
          </div>
          <div className="relative z-[1] w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#C58A00]/40 flex items-center justify-center text-[#92400E] text-xs md:text-sm font-black font-mono shadow-sm">
            OBS
          </div>
        </div>

        {/* Metric 4: Quarantined Defects */}
        <div
          className={`relative overflow-hidden flex items-center justify-between p-4 rounded-xl border transition-all shadow-[0_1px_3px_rgba(11,30,54,0.05)] ${
            (reject ?? 0) > 0
              ? 'bg-[#FEF2F2] border-[#FECACA] animate-alert-once'
              : 'bg-[#F8FAFD] border-[#D7E0EA] hover:border-[#D7E0EA]'
          }`}
        >
          {/* Subtle background telemetry watermark */}
          <svg className="pointer-events-none absolute right-1 bottom-1 w-24 h-16 opacity-15 text-[#D9363E]" viewBox="0 0 96 64" fill="none">
            <line x1="14" y1="42" x2="50" y2="18" stroke="currentColor" strokeWidth="1" />
            <line x1="50" y1="18" x2="82" y2="40" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx="14" cy="42" r="2" fill="currentColor" />
            <circle cx="50" cy="18" r="2.5" fill="currentColor" />
            <circle cx="82" cy="40" r="2" fill="currentColor" />
          </svg>

          <div className="relative z-[1]">
            <div className="text-xs md:text-sm font-display font-bold text-[#334E68] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${(reject ?? 0) > 0 ? 'bg-[#DC2626]' : 'bg-[#64748B]'}`} />
              Quarantined Silicon
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-mono text-2xl lg:text-3xl xl:text-4xl font-black tracking-tight tabular-nums ${
                  (reject ?? 0) > 0 ? 'text-[#991B1B]' : 'text-[#0B1E36]'
                }`}
              >
                {reject === null ? '—' : reject}
              </span>
              <span className="text-xs md:text-sm text-[#475569] font-sans font-semibold">isolated</span>
            </div>
          </div>
          <div
            className={`relative z-[1] w-10 h-10 rounded-xl flex items-center justify-center text-xs md:text-sm font-black font-mono shadow-sm ${
              (reject ?? 0) > 0
                ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
                : 'bg-[#FFFFFF] border border-[#D7E0EA] text-[#475569]'
            }`}
          >
            {(reject ?? 0) > 0 ? 'ISO' : '0'}
          </div>
        </div>
      </div>
    </div>
  )
}
