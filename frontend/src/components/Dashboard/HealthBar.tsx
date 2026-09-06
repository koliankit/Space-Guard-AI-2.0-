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
    suffix?: string,
    glow?: string,
  ) => (
    <div className="flex-1 min-w-[140px] px-5 py-2.5 border-r border-line last:border-r-0 text-center relative">
      <div className="flex items-center justify-center gap-1">
        <span className={`font-display text-2xl font-black ${colorClass}`} style={glow ? { textShadow: glow } : {}}>
          {value === null ? '\u2014' : value}
        </span>
        {suffix && <span className="font-mono text-xs text-muted font-bold">{suffix}</span>}
      </div>
      <div className="text-[10px] font-mono text-muted uppercase tracking-widest mt-0.5 flex items-center justify-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-cyan/60" />
        {label}
      </div>
    </div>
  )

  return (
    <div className="flex border-b border-line bg-panel overflow-x-auto relative z-10">
      {cell('Mission Health', health === null ? null : health, 'text-cyan', '%', '0 0 12px #00F0FF')}
      {cell('Safe (Nominal)', safe, 'text-safe', undefined, '0 0 10px #00FF87')}
      {cell('Monitor (Drift)', monitor, 'text-monitor', undefined, '0 0 10px #FFB020')}
      {cell('Reject (Anomaly)', reject, 'text-reject', undefined, '0 0 12px #FF334B')}
    </div>
  )
}
