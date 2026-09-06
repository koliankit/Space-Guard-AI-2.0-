import { useState } from 'react'

const FIELDS: [string, string][] = [
  ['component_id', 'Component ID'],
  ['lot_id', 'Lot ID'],
  ['v0', '0h Reading'],
  ['v24', '24h Reading'],
  ['v96', '96h Reading (optional)'],
  ['v168', '168h Reading'],
  ['limit', 'Datasheet Limit (optional)'],
]

export default function MappingModal({
  headers,
  autoMapping,
  missingFields,
  onApply,
  onCancel,
}: {
  headers: string[]
  autoMapping: Record<string, string>
  missingFields: string[]
  onApply: (mapping: Record<string, string>) => void
  onCancel: () => void
}) {
  const [mapping, setMapping] = useState<Record<string, string>>(autoMapping)

  const required = ['component_id', 'lot_id', 'v0', 'v24', 'v168']

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-panel border border-line rounded-xl p-5 w-[460px] max-w-[92vw] modal-anim">
        <h3 className="mt-0 text-emerald-100 font-display">Column Mapping</h3>
        <p className="text-xs text-muted">
          We couldn&apos;t confidently auto-detect: <b>{missingFields.join(', ')}</b>. Map the remaining columns below.
        </p>
        <div className="space-y-2.5 mt-3">
          {FIELDS.map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <label className="w-[140px] text-muted">{label}</label>
              <select
                className="flex-1 bg-[#020D05] border border-line text-emerald-100 px-2 py-1.5 rounded font-mono text-[11px] focus:border-accent outline-none"
                value={mapping[key] ?? ''}
                onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
              >
                <option value="">&mdash; none &mdash;</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            className="flex-1 font-display text-xs uppercase px-4 py-2.5 rounded border border-accent bg-accent/20 text-accent font-bold shadow-neon-green hover:bg-accent hover:text-bg transition-all"
            onClick={() => {
              const stillMissing = required.filter((f) => !mapping[f])
              if (stillMissing.length) {
                alert('Please map: ' + stillMissing.join(', '))
                return
              }
              onApply(mapping)
            }}
          >
            Apply Mapping &amp; Continue
          </button>
          <button type="button" className="px-4 py-2.5 rounded border border-line text-xs font-mono text-muted hover:text-white" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
