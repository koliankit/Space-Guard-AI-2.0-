import { useEffect, useState } from 'react'

const STAGES = [
  'DATA STREAM INGESTION',
  'OUTLIER & MISSING PREPROCESSING',
  'POLYNOMIAL DRIFT FEATURE EXTRACTION',
  'LOT-RELATIVE MEDIAN & MAD ANALYSIS',
  'ISOLATION FOREST ANOMALY SCORING',
  'SUPERVISED XGBOOST DEFECT CLASSIFIER',
  'BAYESIAN RISK AGGREGATION ENGINE',
  '3D SPACECRAFT HARDWARE LOCALIZATION',
  'DYNAMIC SCREENING VERDICT (SAFE / MONITOR / REJECT)',
]

export default function PipelineOverlay({ onDone }: { onDone: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const stepMs = 240
    let i = 0
    const timer = setInterval(() => {
      i += 1
      setActiveIdx(i)
      if (i >= STAGES.length) {
        clearInterval(timer)
        setTimeout(onDone, 350)
      }
    }, stepMs)
    return () => clearInterval(timer)
  }, [onDone])

  return (
    <div className="fixed inset-0 bg-[#010A04]/90 flex flex-col items-center justify-center gap-3 z-50 backdrop-blur-md font-mono select-none">
      <div className="p-6 rounded-lg bg-[#041A0B] border border-accent/60 shadow-[0_0_30px_rgba(57,255,20,0.25)] relative max-w-md w-full mx-4">
        <div className="font-display text-sm tracking-widest text-accent text-glow-green mb-4 flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent led" />
            <span>AI SCREENING PIPELINE IN PROGRESS</span>
          </div>
          <span className="text-[10px] text-muted tracking-wider">MIL-STD-883</span>
        </div>
        <div className="space-y-2 text-xs">
          {STAGES.map((s, i) => {
            const isDone = i < activeIdx
            const isCurrent = i === activeIdx
            return (
              <div
                key={s}
                className={`flex items-center gap-2.5 transition-all ${
                  isDone
                    ? 'text-accent opacity-95'
                    : isCurrent
                    ? 'text-accent font-bold text-glow-green scale-[1.02] origin-left'
                    : 'text-muted/40 opacity-40'
                }`}
              >
                <span className="font-bold text-xs">{isDone ? '\u2714' : isCurrent ? '\u25b6' : '\u2022'}</span>
                <span>{s}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-line text-[10px] text-muted flex items-center justify-between">
          <span>ISRO RELIABILITY ENGINE</span>
          <span className="text-accent animate-pulse">PROCESSING TELEMETRY...</span>
        </div>
      </div>
    </div>
  )
}
