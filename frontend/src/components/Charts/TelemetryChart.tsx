import { useState, useMemo } from 'react'
import type { ComponentOut } from '../../types'

const STAGES = [0, 24, 96, 168]

export default function TelemetryChart({ component }: { component: ComponentOut | null }) {
  const [stageH, setStageH] = useState(168)

  return (
    <div className="bg-[#0B1120] p-4 border-r border-slate-800 relative overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="m-0 text-xs font-bold font-display tracking-wider uppercase text-amber-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Burn-In Waveform Telemetry
        </h3>
        <span className="font-mono text-[10px] text-slate-400 tracking-wider">
          CHANNEL: <span className="text-emerald-400 font-bold">OSC-CH1 / CH2</span>
        </span>
      </div>

      {/* Stage Selectors */}
      <div className="flex gap-1.5 mb-2.5">
        {STAGES.map((h) => (
          <button
            key={h}
            className={`flex-1 py-1 px-1 text-center font-mono text-[10.5px] rounded border transition-all ${
              stageH === h
                ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold shadow-sm'
                : 'border-slate-800 bg-[#070D1A] text-slate-400 hover:border-amber-500/50 hover:text-white'
            }`}
            onClick={() => setStageH(h)}
          >
            {h}h
          </button>
        ))}
      </div>

      {/* Main Oscilloscope Waveform Display */}
      <WaveformOscilloscope component={component} uptoH={stageH} />

      {/* Tri-Color Legend */}
      <div className="flex gap-4 text-[9.5px] font-mono text-slate-400 mt-2 flex-wrap items-center">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span className="text-slate-200 font-semibold">Component Current (&#956;A)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
          <span className="text-white font-semibold">Lot Baseline</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-0.5 bg-rose-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
          <span className="text-rose-300">Datasheet Limit</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-0.5 border-t-2 border-dashed border-amber-400" />
          <span className="text-amber-300 font-semibold">Drift Projection</span>
        </span>
      </div>
    </div>
  )
}

function WaveformOscilloscope({ component, uptoH }: { component: ComponentOut | null; uptoH: number }) {
  const W = 520,
    H = 195,
    padL = 42,
    padR = 24,
    padT = 16,
    padB = 36

  // Spectrogram equalizer bars at bottom of chart
  const spectrumBars = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => {
      const val = Math.abs(Math.sin((i / 36) * Math.PI * 3.5)) * 16 + 4
      return Math.min(val, 20)
    })
  }, [])

  if (!component) {
    // Active multi-channel spacecraft bus waveforms when idle
    const busPts1 = Array.from({ length: 24 }, (_, i) => {
      const x = padL + (i / 23) * (W - padL - padR)
      const y = H / 2 - 25 + Math.sin(i * 0.65) * 18 + Math.cos(i * 1.3) * 6
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')

    const busPts2 = Array.from({ length: 24 }, (_, i) => {
      const x = padL + (i / 23) * (W - padL - padR)
      const y = H / 2 + 25 + Math.cos(i * 0.55) * 16 + Math.sin(i * 1.1) * 8
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[195px] block bg-[#060B16] rounded border border-slate-800 select-none">
        <defs>
          <linearGradient id="busGradGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="busGradSteel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Reticle Grid */}
        {[0.25, 0.5, 0.75].map((pct, i) => (
          <line
            key={`h-${i}`}
            x1={padL}
            y1={padT + pct * (H - padT - padB)}
            x2={W - padR}
            y2={padT + pct * (H - padT - padB)}
            stroke="#94A3B8"
            strokeOpacity="0.08"
            strokeDasharray="4 4"
          />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map((pct, i) => (
          <line
            key={`v-${i}`}
            x1={padL + pct * (W - padL - padR)}
            y1={padT}
            x2={padL + pct * (W - padL - padR)}
            y2={H - padB}
            stroke="#94A3B8"
            strokeOpacity="0.08"
            strokeDasharray="4 4"
          />
        ))}

        {/* Channel 1: Primary Bus Voltage Waveform */}
        <polyline points={busPts1} fill="none" stroke="#10B981" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' }} />

        {/* Channel 2: Solar Array Output Waveform */}
        <polyline points={busPts2} fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeDasharray="3 2" style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))' }} />

        {/* Telemetry Status Header */}
        <text x={padL + 8} y={padT + 14} className="fill-emerald-400 text-[9.5px] font-mono font-bold tracking-wider">
          &bull; CH1: 28.4V BUS (NOMINAL)
        </text>
        <text x={padL + 160} y={padT + 14} className="fill-white text-[9.5px] font-mono font-bold tracking-wider">
          &bull; CH2: 14.2A SOLAR
        </text>
        <text x={padL + 280} y={padT + 14} className="fill-amber-400 text-[9.5px] font-mono font-bold tracking-wider">
          &bull; CH3: 98.4% SOC
        </text>

        {/* Center Prompt */}
        <rect x={W / 2 - 140} y={H / 2 - 12} width="280" height="24" rx="4" fill="#0A1020" stroke="#F59E0B" strokeOpacity="0.4" />
        <text x={W / 2} y={H / 2 + 4} textAnchor="middle" className="fill-amber-300 text-[9px] font-mono font-bold tracking-wider">
          [ SPACECRAFT BUS STREAM &bull; SELECT COMPONENT TO ISOLATE ]
        </text>
      </svg>
    )
  }

  const stages: [number, number][] = [[0, component.v0], [24, component.v24]]
  if (component.v96 != null) stages.push([96, component.v96])
  stages.push([168, component.v168])
  const shown = stages.filter(([h]) => h <= uptoH)

  const bandLow = component.v168 * 0.88
  const bandHigh = component.v168 * 1.12

  const allVals = [
    component.v0,
    component.v24,
    component.v96 ?? component.v24,
    component.v168,
    component.limit_ua,
    bandLow,
    bandHigh,
    component.predicted_future,
  ]
  const minY = Math.min(...allVals) * 0.82
  const maxY = Math.max(...allVals) * 1.14

  const xFor = (h: number) => padL + (h / 216) * (W - padL - padR)
  const yFor = (v: number) => H - padB - ((v - minY) / (maxY - minY || 1)) * (H - padT - padB)

  const createSmoothPath = (points: [number, number][]) => {
    if (points.length < 2) return ''
    const mapped = points.map(([h, v]) => ({ x: xFor(h), y: yFor(v) }))
    let d = `M ${mapped[0].x} ${mapped[0].y}`
    for (let i = 0; i < mapped.length - 1; i++) {
      const p0 = i > 0 ? mapped[i - 1] : mapped[i]
      const p1 = mapped[i]
      const p2 = mapped[i + 1]
      const p3 = i !== mapped.length - 2 ? mapped[i + 2] : p2

      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    return d
  }

  const smoothCurve = createSmoothPath(shown)
  const last = shown[shown.length - 1]

  const areaD =
    shown.length > 1
      ? `${smoothCurve} L ${xFor(last[0])} ${H - padB} L ${xFor(shown[0][0])} ${H - padB} Z`
      : ''

  // Secondary channel curve (lot baseline trace in steel blue)
  const baselinePts: [number, number][] = [
    [0, component.v0 * 0.98],
    [24, component.v0 + (component.v168 - component.v0) * 0.15],
    [96, component.v0 + (component.v168 - component.v0) * 0.55],
    [168, component.v168 * 0.95],
  ].filter(([h]) => h <= uptoH) as [number, number][]
  const baselineCurve = createSmoothPath(baselinePts)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[195px] block bg-[#060B16] rounded border border-slate-800">
      <defs>
        <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-steel" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="neon-area-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
        </linearGradient>

        <linearGradient id="spec-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#64748B" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = padT + (H - padT - padB) * (1 - f)
        return (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#1E293B" strokeWidth={0.8} />
            <text x={padL - 6} y={y + 3.5} textAnchor="end" className="fill-slate-500 text-[8.5px] font-mono">
              {(minY + (maxY - minY) * f).toFixed(1)}
            </text>
          </g>
        )
      })}

      {/* Equalizer Frequency Bars */}
      <g transform={`translate(${padL}, ${H - padB + 2})`}>
        {spectrumBars.map((bh, idx) => {
          const bw = (W - padL - padR) / spectrumBars.length - 2
          const bx = idx * (bw + 2)
          return (
            <rect
              key={idx}
              x={bx}
              y={20 - bh}
              width={bw}
              height={bh}
              fill="url(#spec-gradient)"
              opacity={0.65}
              rx={1}
            />
          )
        })}
      </g>

      {/* Datasheet Limit Line in Crimson Red */}
      <line
        x1={padL}
        x2={W - padR}
        y1={yFor(component.limit_ua)}
        y2={yFor(component.limit_ua)}
        stroke="#EF4444"
        strokeWidth={1.4}
        strokeDasharray="5,4"
        style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' }}
      />
      <text x={W - padR} y={yFor(component.limit_ua) - 4} textAnchor="end" fill="#EF4444" className="text-[8.5px] font-mono font-bold">
        LIMIT {component.limit_ua.toFixed(0)} &#956;A
      </text>

      {/* Gradient Under-curve Fill */}
      {areaD && <path d={areaD} fill="url(#neon-area-gradient)" />}

      {/* Secondary Lot Baseline Waveform in Crisp White */}
      {baselineCurve && (
        <path
          d={baselineCurve}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1.8}
          filter="url(#glow-steel)"
          opacity={0.85}
        />
      )}

      {/* Primary Waveform (Component Current) */}
      {smoothCurve && (
        <path
          d={smoothCurve}
          fill="none"
          stroke="#10B981"
          strokeWidth={2.4}
          filter="url(#glow-green)"
        />
      )}

      {/* Data Point Ping Markers */}
      {shown.map(([h, v]) => (
        <g key={h}>
          <circle cx={xFor(h)} cy={yFor(v)} r={4.5} fill="#060B16" stroke="#10B981" strokeWidth={2} filter="url(#glow-green)" />
          <circle cx={xFor(h)} cy={yFor(v)} r={2} fill="#10B981" />
          <text x={xFor(h)} y={yFor(v) - 8} textAnchor="middle" fill="#10B981" className="text-[9px] font-mono font-bold">
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      {/* Projected Future Drift (Dashed Amber Vector) */}
      {uptoH >= 168 && last && (
        <>
          <line
            x1={xFor(last[0])}
            y1={yFor(last[1])}
            x2={xFor(216)}
            y2={yFor(component.predicted_future)}
            stroke="#F59E0B"
            strokeWidth={1.8}
            strokeDasharray="4,3"
            style={{ filter: 'drop-shadow(0 0 3px rgba(245,158,11,0.5))' }}
          />
          <circle cx={xFor(216)} cy={yFor(component.predicted_future)} r={3.5} fill="#F59E0B" />
          <text x={xFor(216)} y={yFor(component.predicted_future) - 6} textAnchor="end" fill="#F59E0B" className="text-[8.5px] font-mono font-bold">
            +96h: {component.predicted_future.toFixed(2)}
          </text>
        </>
      )}

      {/* Stage Time Labels */}
      {['0h', '24h', '96h', '168h'].map((lab, i) => (
        <text key={lab} x={xFor(STAGES[i])} y={H - padB + 22} textAnchor="middle" className="fill-slate-400 text-[9px] font-mono">
          {lab}
        </text>
      ))}
      <text x={xFor(216)} y={H - padB + 22} textAnchor="middle" className="fill-amber-400 text-[9px] font-mono font-bold">
        216h
      </text>
    </svg>
  )
}
