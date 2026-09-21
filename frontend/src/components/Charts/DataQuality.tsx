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
    <div className="bg-[#FFFFFF] p-2 rounded border border-[#D9E2EA]">
      <div className={`font-mono text-base font-bold ${color}`}>{value === null ? '—' : value}</div>
      <div className="text-[9px] font-mono text-[#81909D] uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )

  return (
    <div className="bg-[#FFFFFF] p-4 border-r border-[#D9E2EA]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-[11px] font-display tracking-widest uppercase text-[#0E88D3] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0E88D3] shadow-sm" />
          Data Ingestion Quality
        </h3>
        <span className="font-mono text-[9px] text-[#168A5B] font-bold">SHA-256 CHECK</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {item('Total Ingested Rows', rows, 'text-[#17212B]')}
        {item('Validated Records', valid, 'text-[#168A5B]')}
        {item('Dropped / Missing', missing, missing ? 'text-[#D9363E] font-bold' : 'text-[#5B6B7A]')}
        {item('Component Lots', lots, 'text-[#0E88D3]')}
        {item('Screened Parameter', 'Leakage Current (µA)', 'text-[#17212B]')}
        {item('Burn-In Stages', '4 Stages [0-168h]', 'text-[#17212B]')}
      </div>
    </div>
  )
}
