export interface AuditEntry {
  time: string
  text: string
  cls?: 'flag' | 'ok' | ''
}

export function nowTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false })
}

const CLASS_MAP: Record<string, string> = {
  flag: 'text-reject font-bold',
  ok: 'text-safe font-semibold',
  '': 'text-slate-300',
}

export default function AuditLog({ entries }: { entries: AuditEntry[] }) {
  return (
    <footer className="px-6 py-2.5 bg-[#071120] border-t border-line relative z-10 font-mono">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] tracking-widest text-cyan uppercase font-bold flex items-center gap-1.5">
          <span className="text-cyan">&gt;&gt;</span> ANALYSIS AUDIT LOG &amp; SYSTEM EVENTS
        </div>
        <div className="text-[9px] text-muted">
          EVENT BUS: <span className="text-safe font-bold">ONLINE</span>
        </div>
      </div>
      <div className="text-[11px] max-h-[110px] overflow-y-auto space-y-0.5 bg-[#060D1A] p-2 rounded border border-line/60">
        {entries.map((e, i) => (
          <div key={i} className="leading-tight flex items-start gap-2">
            <span className="text-cyan font-bold">[{e.time}]</span>
            <span className={CLASS_MAP[e.cls ?? '']}>
              {e.cls === 'flag' ? '\u25b6 [ALERT] ' : e.cls === 'ok' ? '\u2714 [SUCCESS] ' : '\u2022 '}
              {e.text}
            </span>
          </div>
        ))}
      </div>
    </footer>
  )
}
