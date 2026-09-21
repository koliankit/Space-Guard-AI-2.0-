import { useState } from 'react'

export interface AuditEntry {
  time: string
  text: string
  cls?: 'flag' | 'ok' | ''
}

export function nowTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false })
}


const CLASS_MAP: Record<string, string> = {
  flag: 'text-[#D9363E] font-bold',
  ok: 'text-[#168A5B] font-semibold',
  '': 'text-[#17212B]',
}

export default function AuditLog({ entries }: { entries: AuditEntry[] }) {
  const [expanded, setExpanded] = useState(false)
  const latest = entries[entries.length - 1]

  return (
    <footer className="px-5 py-1.5 bg-[#FFFFFF] border-t border-[#D9E2EA] relative z-10 font-mono text-xs select-none shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-left text-[#5B6B7A] hover:text-[#17212B] transition-colors cursor-pointer flex-1 min-w-0"
        >
          <span className="text-[10px] tracking-wider text-[#F47216] uppercase font-bold flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F47216] led" />
            EVENT LOG
          </span>
          <span className="text-[#D9E2EA]">|</span>
          {latest && (
            <div className="truncate text-[10.5px] flex items-center gap-1.5 min-w-0">
              <span className="text-[#0E88D3] font-bold shrink-0">[{latest.time}]</span>
              <span className={`truncate ${CLASS_MAP[latest.cls ?? '']}`}>{latest.text}</span>
            </div>
          )}
        </button>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-[9.5px] text-[#81909D] hidden sm:inline">
            EVENT BUS: <span className="text-[#168A5B] font-bold">ONLINE</span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] text-[#5B6B7A] hover:text-[#0E88D3] px-1.5 py-0.5 rounded bg-[#F8FAFC] border border-[#D9E2EA] transition-colors"
          >
            {expanded ? 'HIDE LOG \u25bc' : `${entries.length} EVENTS \u25b2`}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 text-[11px] max-h-[140px] overflow-y-auto space-y-1 bg-[#F8FAFC] p-2.5 rounded-lg border border-[#D9E2EA] animate-modalin">
          {entries.map((e, i) => (
            <div key={i} className="leading-relaxed flex items-start gap-2">
              <span className="text-[#0E88D3] font-bold shrink-0">[{e.time}]</span>
              <span className={CLASS_MAP[e.cls ?? '']}>
                {e.cls === 'flag' ? '\u25b6 [ALERT] ' : e.cls === 'ok' ? '\u2714 [SUCCESS] ' : '\u2022 '}
                {e.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </footer>
  )
}
