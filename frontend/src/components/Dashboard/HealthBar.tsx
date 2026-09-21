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
    <div className="border-b border-[#D9E2EA] bg-[#F4F7FA] px-4 md:px-6 py-3 select-none w-full">
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Metric 1: Overall Mission Reliability */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] hover:border-[#0E88D3]/50 transition-all shadow-sm">
          <div>
            <div className="text-xs md:text-sm font-display font-bold text-[#5B6B7A] uppercase tracking-wider mb-1.5">
              Mission Reliability
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-[#17212B] tracking-tight tabular-nums">
                {health === null ? '—' : health}
              </span>
              <span className="font-mono text-base font-bold text-[#0E88D3]">%</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#0E88D3]/40 flex items-center justify-center text-[#0E88D3] font-mono font-black text-xs md:text-sm shadow-sm">
            {health && health >= 75 ? 'NOM' : 'WARN'}
          </div>
        </div>

        {/* Metric 2: Safe Nominal Components */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] hover:border-[#168A5B]/50 transition-all shadow-sm">
          <div>
            <div className="text-xs md:text-sm font-display font-bold text-[#5B6B7A] uppercase tracking-wider mb-1.5">
              Flight Nominal Units
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-[#168A5B] tracking-tight tabular-nums">
                {safe === null ? '—' : safe}
              </span>
              <span className="text-xs md:text-sm text-[#5B6B7A] font-sans font-medium">verified safe</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#168A5B]/40 flex items-center justify-center text-[#168A5B] text-xs md:text-sm font-black font-mono shadow-sm">
            OK
          </div>
        </div>

        {/* Metric 3: Drift Warning */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] hover:border-[#C58A00]/50 transition-all shadow-sm">
          <div>
            <div className="text-xs md:text-sm font-display font-bold text-[#5B6B7A] uppercase tracking-wider mb-1.5">
              Parametric Drift Watch
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-[#C58A00] tracking-tight tabular-nums">
                {monitor === null ? '—' : monitor}
              </span>
              <span className="text-xs md:text-sm text-[#5B6B7A] font-sans font-medium">monitored</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#C58A00]/40 flex items-center justify-center text-[#C58A00] text-xs md:text-sm font-black font-mono shadow-sm">
            OBS
          </div>
        </div>

        {/* Metric 4: Quarantined Defects */}
        <div
          className={`flex items-center justify-between p-4 rounded-xl border transition-all shadow-sm ${
            (reject ?? 0) > 0
              ? 'bg-[#FEF2F2] border-[#D9363E]/60 animate-alert-once'
              : 'bg-[#FFFFFF] border-[#D9E2EA] hover:border-[#D9E2EA]'
          }`}
        >
          <div>
            <div className="text-xs md:text-sm font-display font-bold text-[#5B6B7A] uppercase tracking-wider mb-1.5">
              Quarantined Silicon
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-mono text-2xl lg:text-3xl xl:text-4xl font-black tracking-tight tabular-nums ${
                  (reject ?? 0) > 0 ? 'text-[#D9363E]' : 'text-[#5B6B7A]'
                }`}
              >
                {reject === null ? '—' : reject}
              </span>
              <span className="text-xs md:text-sm text-[#5B6B7A] font-sans font-medium">isolated</span>
            </div>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs md:text-sm font-black font-mono shadow-sm ${
              (reject ?? 0) > 0
                ? 'bg-[#FEF2F2] border border-[#D9363E]/50 text-[#D9363E]'
                : 'bg-[#F8FAFC] border border-[#D9E2EA] text-[#5B6B7A]'
            }`}
          >
            {(reject ?? 0) > 0 ? 'ISO' : '0'}
          </div>
        </div>
      </div>
    </div>
  )
}
