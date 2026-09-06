export default function DataQuality({
  rows,
  valid,
  missing,
  lots,
}: {
  rows: number | null
  valid: number | null
  missing: number | null
  lots: number | null
}) {
  const item = (label: string, value: string | number | null, color = 'text-cyan') => (
    <div className="bg-[#071324] p-2 rounded border border-line">
      <div className={`font-mono text-base font-bold ${color}`}>{value === null ? '\u2014' : value}</div>
      <div className="text-[9px] font-mono text-muted uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )

  return (
    <div className="bg-panel p-4 border-r border-line">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-[11px] font-display tracking-widest uppercase text-cyan text-glow-cyan flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan led" />
          Data Ingestion Quality
        </h3>
        <span className="font-mono text-[9px] text-safe font-bold">SHA-256 CHECK</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {item('Total Ingested Rows', rows, 'text-slate-100')}
        {item('Validated Records', valid, 'text-safe')}
        {item('Dropped / Missing', missing, missing ? 'text-reject font-bold' : 'text-slate-400')}
        {item('Component Lots', lots, 'text-cyan')}
        {item('Screened Parameter', 'Leakage Current (µA)', 'text-slate-200')}
        {item('Burn-In Stages', '4 Stages [0-168h]', 'text-slate-200')}
      </div>
    </div>
  )
}
