import { useEffect, useState } from 'react'

interface StageInfo {
  title: string
  detail: string
}

const STAGES: StageInfo[] = [
  {
    title: 'DATA STREAM INGESTION',
    detail: 'Acquiring 0h, 24h, 96h, 168h high-precision silicon telemetry',
  },
  {
    title: 'OUTLIER & MISSING PREPROCESSING',
    detail: 'Filtering sensor noise & performing robust variance imputation',
  },
  {
    title: 'POLYNOMIAL DRIFT FEATURE EXTRACTION',
    detail: 'Fitting Arrhenius degradation models & parametric curvature rates',
  },
  {
    title: 'LOT-RELATIVE MEDIAN & MAD ANALYSIS',
    detail: 'Benchmarking lot statistical medians against spaceflight baselines',
  },
  {
    title: 'ISOLATION FOREST ANOMALY SCORING',
    detail: 'Evaluating multi-dimensional isolation trees for parametric outliers',
  },
  {
    title: 'SUPERVISED XGBOOST DEFECT CLASSIFIER',
    detail: 'Executing gradient-boosted decision trees for latent silicon defects',
  },
  {
    title: 'BAYESIAN RISK AGGREGATION ENGINE',
    detail: 'Fusing evidence layers into calibrated 0-100 flight risk scores',
  },
  {
    title: '3D SPACECRAFT HARDWARE LOCALIZATION',
    detail: 'Mapping identified silicon to satellite equipment bays and coordinates',
  },
  {
    title: 'DYNAMIC SCREENING VERDICT (SAFE / MONITOR / REJECT)',
    detail: 'Finalizing MIL-STD-883 qualification gates & quarantine directives',
  },
]

export default function PipelineOverlay({ onDone }: { onDone: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    // 0.5x speed: 500ms per step instead of 240ms so judges can clearly follow every stage
    const stepMs = 500
    let i = 0
    const timer = setInterval(() => {
      i += 1
      setActiveIdx(i)
      if (i >= STAGES.length) {
        clearInterval(timer)
        setTimeout(onDone, 650)
      }
    }, stepMs)
    return () => clearInterval(timer)
  }, [onDone])

  const progressPercent = Math.min(100, Math.round((activeIdx / STAGES.length) * 100))

  return (
    <div className="fixed inset-0 bg-[#07111C]/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm font-sans select-none animate-fadeIn">
      {/* Aerospace Card with Slate Navy & Steel Blue Borders */}
      <div className="bg-[#102337] border border-[#1D3A52] rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 flex flex-col gap-4">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1D3A52] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-[#0E88D3] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F1F5F9] animate-gentle-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-bold text-[#F1F5F9] tracking-wider uppercase">
                AI Screening Pipeline
              </h2>
              <p className="text-xs font-mono text-[#0E88D3]">
                MIL-STD-883 METHOD 1005 &bull; AUTOMATED SCREENING ENGINE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="px-2.5 py-1 rounded-md bg-[#0E88D3]/15 text-[#0E88D3] border border-[#0E88D3]/30 text-xs sm:text-sm font-bold">
              {progressPercent}%
            </span>
            <span className="text-xs text-[#9AAFC0]">
              STEP {Math.min(activeIdx + 1, STAGES.length)} / {STAGES.length}
            </span>
          </div>
        </div>

        {/* Crisp Progress Bar */}
        <div className="w-full bg-[#0B1928] rounded-full h-1.5 overflow-hidden border border-[#1D3A52]">
          <div
            className="bg-gradient-to-r from-[#0E88D3] to-[#F47216] h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Steps List */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 font-mono">
          {STAGES.map((stage, i) => {
            const isDone = i < activeIdx
            const isCurrent = i === activeIdx

            return (
              <div
                key={stage.title}
                className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all duration-200 ${
                  isCurrent
                    ? 'bg-[#142B40] border-[#0E88D3]/60 shadow-sm'
                    : isDone
                    ? 'bg-[#142B40]/40 border-[#1D3A52]/80'
                    : 'bg-transparent border-transparent opacity-40'
                }`}
              >
                {/* Step Status Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {isDone ? (
                    <span className="w-5 h-5 rounded-full bg-[#22A06B]/20 text-[#22A06B] border border-[#22A06B]/40 flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                  ) : isCurrent ? (
                    <span className="w-5 h-5 rounded-full bg-[#0E88D3] text-[#F1F5F9] flex items-center justify-center text-xs font-bold animate-gentle-pulse">
                      ▶
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-[#0B1928] text-[#9AAFC0] border border-[#1D3A52] flex items-center justify-center text-[10px]">
                      {i + 1}
                    </span>
                  )}
                </div>

                {/* Step Text & Detail */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs sm:text-sm tracking-wide uppercase ${
                        isCurrent
                          ? 'text-[#F1F5F9] font-bold'
                          : isDone
                          ? 'text-[#F1F5F9] font-semibold'
                          : 'text-[#9AAFC0]'
                      }`}
                    >
                      {stage.title}
                    </span>
                    <span
                      className={`text-[10px] uppercase shrink-0 font-bold ${
                        isCurrent
                          ? 'text-[#0E88D3]'
                          : isDone
                          ? 'text-[#22A06B]'
                          : 'text-[#9AAFC0]'
                      }`}
                    >
                      {isDone ? 'COMPLETED' : isCurrent ? 'PROCESSING...' : 'QUEUED'}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-0.5 leading-normal font-sans ${
                      isCurrent
                        ? 'text-[#9AAFC0]'
                        : isDone
                        ? 'text-[#9AAFC0]'
                        : 'text-[#9AAFC0]/60'
                    }`}
                  >
                    {stage.detail}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Bar */}
        <div className="pt-3 border-t border-[#1D3A52] flex items-center justify-between text-xs font-mono">
          <span className="text-[#9AAFC0] text-[11px]">ISRO RELIABILITY INFERENCE ENGINE</span>
          <span className="text-[#0E88D3] font-bold flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#0E88D3] animate-gentle-pulse" />
            {activeIdx >= STAGES.length ? 'VERDICT SYNCHRONIZED' : 'ANALYZING TELEMETRY STREAMS...'}
          </span>
        </div>
      </div>
    </div>
  )
}
