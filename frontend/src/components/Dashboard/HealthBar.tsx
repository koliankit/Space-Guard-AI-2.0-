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
  const cell = (
    label: string,
    value: number | null,
    colorClass: string,
    badgeBg: string,
    suffix?: string,
  ) => (
    <div className={`flex-1 min-w-[130px] px-4 py-2 border-r border-slate-800/80 last:border-r-0 flex items-center justify-center gap-3 ${badgeBg}`}>
      <div className="flex items-center gap-1">
        <span className={`font-mono text-xl font-black ${colorClass}`}>
          {value === null ? '\u2014' : value}
        </span>
        {suffix && <span className="font-mono text-xs text-slate-400 font-bold">{suffix}</span>}
      </div>
      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
        {label}
      </div>
    </div>
  )

  return (
    <div className="flex border-b border-slate-800 bg-[#070D1A] overflow-x-auto relative z-10 select-none">
      {cell('Mission Health', health === null ? null : health, 'text-cyan', 'bg-transparent', '%')}
      {cell('Safe Nominal', safe, 'text-emerald-400', 'bg-transparent')}
      {cell('Drift Warning', monitor, 'text-amber-400', 'bg-transparent')}
      {cell(
        'Quarantined Defects',
        reject,
        'text-rose-400',
        (reject ?? 0) > 0 ? 'bg-rose-500/10' : 'bg-transparent',
      )}
    </div>
  )
}
