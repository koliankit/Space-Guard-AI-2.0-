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
  const item = (label: string, value: string | number | null, color = 'text-[#0E88D3]') => (
    <div className="bg-[#0B1928] p-2 rounded border border-[#1D3A52]">
      <div className={`font-mono text-base font-bold ${color}`}>{value === null ? '—' : value}</div>
      <div className="text-[9px] font-mono text-[#6F8495] uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )

  return (
    <div className="bg-[#102337] p-4 border-r border-[#1D3A52]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-[11px] font-display tracking-widest uppercase text-[#0E88D3] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0E88D3] shadow-sm" />
          Data Ingestion Quality
        </h3>
        <span className="font-mono text-[9px] text-[#22A06B] font-bold">SHA-256 CHECK</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {item('Total Ingested Rows', rows, 'text-[#F1F5F9]')}
        {item('Validated Records', valid, 'text-[#22A06B]')}
        {item('Dropped / Missing', missing, missing ? 'text-[#E5484D] font-bold' : 'text-[#9AAFC0]')}
        {item('Component Lots', lots, 'text-[#0E88D3]')}
        {item('Screened Parameter', 'Leakage Current (µA)', 'text-[#F1F5F9]')}
        {item('Burn-In Stages', '4 Stages [0-168h]', 'text-[#F1F5F9]')}
      </div>
    </div>
  )
}
