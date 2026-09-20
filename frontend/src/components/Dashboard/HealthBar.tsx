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
    <div className="border-b border-[#26384D] bg-[#070D18] px-4 md:px-6 py-3 select-none w-full">
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Metric 1: Overall Mission Reliability */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#111E30] border border-[#26384D] hover:border-[#C99A2E]/50 transition-all shadow-sm">
          <div>
            <div className="text-xs md:text-sm font-display font-bold text-[#91A0B2] uppercase tracking-wider mb-1.5">
              Mission Reliability
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-[#E8EDF2] tracking-tight tabular-nums">
                {health === null ? '—' : health}
              </span>
              <span className="font-mono text-base font-bold text-[#C99A2E]">%</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#16253A] border border-[#C99A2E]/40 flex items-center justify-center text-[#C99A2E] font-mono font-black text-xs md:text-sm shadow-sm">
            {health && health >= 75 ? 'NOM' : 'WARN'}
          </div>
        </div>

        {/* Metric 2: Safe Nominal Components */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#111E30] border border-[#26384D] hover:border-[#3FA66B]/50 transition-all shadow-sm">
          <div>
            <div className="text-xs md:text-sm font-display font-bold text-[#91A0B2] uppercase tracking-wider mb-1.5">
              Flight Nominal Units
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-[#3FA66B] tracking-tight tabular-nums">
                {safe === null ? '—' : safe}
              </span>
              <span className="text-xs md:text-sm text-[#91A0B2] font-sans font-medium">verified safe</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#16253A] border border-[#3FA66B]/40 flex items-center justify-center text-[#3FA66B] text-xs md:text-sm font-black font-mono shadow-sm">
            OK
          </div>
        </div>

        {/* Metric 3: Drift Warning */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#111E30] border border-[#26384D] hover:border-[#D6A33A]/50 transition-all shadow-sm">
          <div>
            <div className="text-xs md:text-sm font-display font-bold text-[#91A0B2] uppercase tracking-wider mb-1.5">
              Parametric Drift Watch
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-[#D6A33A] tracking-tight tabular-nums">
                {monitor === null ? '—' : monitor}
              </span>
              <span className="text-xs md:text-sm text-[#91A0B2] font-sans font-medium">monitored</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#16253A] border border-[#D6A33A]/40 flex items-center justify-center text-[#D6A33A] text-xs md:text-sm font-black font-mono shadow-sm">
            OBS
          </div>
        </div>

        {/* Metric 4: Quarantined Defects */}
        <div
          className={`flex items-center justify-between p-4 rounded-xl border transition-all shadow-sm ${
            (reject ?? 0) > 0
              ? 'bg-[#28131D] border-[#D94B5B]/60 animate-alert-once'
              : 'bg-[#111E30] border-[#26384D] hover:border-[#26384D]'
          }`}
        >
          <div>
            <div className="text-xs md:text-sm font-display font-bold text-[#91A0B2] uppercase tracking-wider mb-1.5">
              Quarantined Silicon
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-mono text-2xl lg:text-3xl xl:text-4xl font-black tracking-tight tabular-nums ${
                  (reject ?? 0) > 0 ? 'text-[#D94B5B]' : 'text-[#91A0B2]'
                }`}
              >
                {reject === null ? '—' : reject}
              </span>
              <span className="text-xs md:text-sm text-[#91A0B2] font-sans font-medium">isolated</span>
            </div>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs md:text-sm font-black font-mono shadow-sm ${
              (reject ?? 0) > 0
                ? 'bg-[#28131D] border border-[#D94B5B]/50 text-[#D94B5B]'
                : 'bg-[#16253A] border border-[#26384D] text-[#91A0B2]'
            }`}
          >
            {(reject ?? 0) > 0 ? 'ISO' : '0'}
          </div>
        </div>
      </div>
    </div>
  )
}
