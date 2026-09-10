import React, { useState, useMemo } from 'react'
import type { ComponentOut } from '../../types'

interface ModuleAAnomalyGraphProps {
  component: ComponentOut | null
}

const STAGES = [0, 24, 96, 168]

export default function ModuleAAnomalyGraph({ component }: ModuleAAnomalyGraphProps) {
  const [stageH, setStageH] = useState<number>(168)

  const W = 560
  const H = 220
  const padL = 46
  const padR = 24
  const padT = 20
  const padB = 40

  // Signal spectrogram equalizer bars along the bottom
  const spectrumBars = useMemo(() => {
    return Array.from({ length: 32 }, (_, i) => {
      const val = Math.abs(Math.sin((i / 32) * Math.PI * 3.2)) * 14 + 4
      return Math.min(val, 18)
    })
  }, [])

  if (!component) {
    return (
      <div className="bg-[#071120] border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-bold text-sky-400 flex items-center gap-1.5 text-[11px] uppercase">
            <span className="w-2 h-2 rounded-full bg-sky-400 led" />
            Module A &bull; Parametric Waveform Telemetry
          </span>
          <span className="text-[10px] text-slate-400 font-mono">CHANNEL: 24-BIT SIGMA-DELTA ADC</span>
        </div>
        <div className="h-[200px] flex items-center justify-center rounded-lg border border-slate-800/80 bg-[#050B16] text-slate-400 text-xs font-mono">
          [ AWAITING COMPONENT SELECTION TO DISPLAY SILICON OSCILLOSCOPE ]
        </div>
      </div>
    )
  }

  const stages: [number, number][] = [[0, component.v0], [24, component.v24]]
  if (component.v96 != null) stages.push([96, component.v96])
  stages.push([168, component.v168])
  const shown = stages.filter(([h]) => h <= stageH)

  const limitVal = component.limit_ua || 50
  const lotMean = component.lot_mean ?? component.v168 * 0.94
  const lotStd = component.lot_std ?? 1.8

  const bandLow = Math.max(0, lotMean - 2 * lotStd)
  const bandHigh = lotMean + 2 * lotStd

  const allVals = [
    component.v0,
    component.v24,
    component.v96 ?? component.v24,
    component.v168,
    limitVal,
    bandLow,
    bandHigh,
  ]
  const minY = Math.max(0, Math.min(...allVals) * 0.8)
  const maxY = Math.max(...allVals) * 1.15

  const xFor = (h: number) => padL + (h / 168) * (W - padL - padR)
  const yFor = (v: number) => H - padB - ((v - minY) / (maxY - minY || 1)) * (H - padT - padB)

  // Smooth Catmull-Rom interpolation for component curve
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
  const lastPoint = shown[shown.length - 1]

  // Closed area under curve
  const areaD =
    shown.length > 1
      ? `${smoothCurve} L ${xFor(lastPoint[0])} ${H - padB} L ${xFor(shown[0][0])} ${H - padB} Z`
      : ''

  // Baseline peer mean curve
  const baselinePts: [number, number][] = [
    [0, component.v0 * 0.95],
    [24, component.v0 + (lotMean - component.v0) * 0.18],
    [96, component.v0 + (lotMean - component.v0) * 0.6],
    [168, lotMean],
  ].filter(([h]) => h <= stageH) as [number, number][]
  const baselineCurve = createSmoothPath(baselinePts)

  const isRej = component.status === 'reject'
  const isMon = component.status === 'monitor'
  const curveColor = isRej ? '#EF4444' : isMon ? '#F59E0B' : '#10B981'

  return (
    <div className="bg-[#070E1C] border border-slate-800/90 rounded-xl p-3 flex flex-col gap-2 shadow-lg select-none">
      {/* Top Header & Stage Scrubbing Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full led"
            style={{ backgroundColor: curveColor }}
          />
          <span className="font-display font-bold text-xs text-white tracking-wider uppercase">
            GRAPH A &bull; HTOL 168H PARAMETRIC ANOMALY OSCILLOSCOPE
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
            {component.component_id}
          </span>
        </div>

        {/* Stage Filter Buttons */}
        <div className="flex items-center gap-1 bg-[#050914] p-0.5 rounded-lg border border-slate-800">
          <span className="text-[9.5px] font-mono text-slate-400 px-1.5 uppercase">Stage:</span>
          {STAGES.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setStageH(h)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                stageH === h
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 font-bold shadow-isro'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* Main SVG Chart Canvas */}
      <div className="relative rounded-lg overflow-hidden border border-slate-800/80 bg-[#040812]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[210px] block">
          <defs>
            <linearGradient id="area-grad-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={curveColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={curveColor} stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="lot-band-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38A3FF" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#38A3FF" stopOpacity="0.02" />
            </linearGradient>

            <filter id="glow-a" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const y = padT + (H - padT - padB) * (1 - f)
            const val = minY + (maxY - minY) * f
            return (
              <g key={f}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#162238" strokeWidth={0.8} />
                <text
                  x={padL - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[8.5px] font-mono tabular-nums"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            )
          })}

          {/* Stage X-axis vertical gridlines */}
          {STAGES.map((h) => {
            const x = xFor(h)
            return (
              <g key={h}>
                <line
                  x1={x}
                  x2={x}
                  y1={padT}
                  y2={H - padB}
                  stroke="#152033"
                  strokeDasharray="2 2"
                  strokeWidth={0.8}
                />
                <text
                  x={x}
                  y={H - padB + 14}
                  textAnchor="middle"
                  className="fill-slate-400 text-[9px] font-mono font-semibold"
                >
                  T+{h}h
                </text>
              </g>
            )
          })}

          {/* Lot Peer Variance Band (Shaded Envelope ±2σ) */}
          {stageH >= 24 && (
            <rect
              x={xFor(0)}
              y={yFor(bandHigh)}
              width={xFor(stageH) - xFor(0)}
              height={Math.max(0, yFor(bandLow) - yFor(bandHigh))}
              fill="url(#lot-band-grad)"
              stroke="#38A3FF"
              strokeOpacity="0.25"
              strokeDasharray="3 3"
            />
          )}

          {/* Static Datasheet Limit Line (Red line at limit_ua) */}
          <line
            x1={padL}
            x2={W - padR}
            y1={yFor(limitVal)}
            y2={yFor(limitVal)}
            stroke="#EF4444"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text
            x={W - padR}
            y={yFor(limitVal) - 4}
            textAnchor="end"
            className="fill-rose-400 text-[8px] font-mono font-bold"
          >
            SPEC LIMIT ({limitVal}&mu;A)
          </text>

          {/* Lot Norm Baseline Trace (Steel Blue line) */}
          {baselinePts.length > 1 && (
            <path
              d={baselineCurve}
              fill="none"
              stroke="#38A3FF"
              strokeWidth={1.4}
              strokeDasharray="3 2"
              opacity={0.8}
            />
          )}

          {/* Shaded Area under Component Curve */}
          {areaD && <path d={areaD} fill="url(#area-grad-a)" />}

          {/* Component Waveform Curve (Solid Trace) */}
          {smoothCurve && (
            <path
              d={smoothCurve}
              fill="none"
              stroke={curveColor}
              strokeWidth={2.4}
              filter="url(#glow-a)"
            />
          )}

          {/* Component Reading Data Points */}
          {shown.map(([h, val]) => {
            const cx = xFor(h)
            const cy = yFor(val)
            const isWorstPoint = h === 168 && isRej

            return (
              <g key={h}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isWorstPoint ? 5 : 4}
                  fill={isWorstPoint ? '#EF4444' : curveColor}
                  stroke="#040812"
                  strokeWidth={1.5}
                />
                <text
                  x={cx}
                  y={cy - 8}
                  textAnchor="middle"
                  className="fill-white text-[8.5px] font-mono font-bold tabular-nums"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            )
          })}

          {/* Spectrogram Energy Bars along bottom margin */}
          <g transform={`translate(${padL}, ${H - padB + 22})`}>
            {spectrumBars.map((bh, idx) => {
              const bw = (W - padL - padR) / spectrumBars.length - 2
              const bx = idx * (bw + 2)
              return (
                <rect
                  key={idx}
                  x={bx}
                  y={18 - bh}
                  width={bw}
                  height={bh}
                  fill="#F59E0B"
                  opacity={0.3 + (bh / 18) * 0.4}
                  rx={1}
                />
              )
            })}
          </g>
        </svg>
      </div>

      {/* Legend & Telemetry Readouts */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-300 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-1 rounded-full"
              style={{ backgroundColor: curveColor }}
            />
            <span className="font-semibold text-white">Component Measured</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 bg-blue-400 border-t border-dashed border-blue-400" />
            <span className="text-blue-300 font-medium">Lot Norm Mean ({lotMean.toFixed(1)}&mu;A)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 bg-rose-500" />
            <span className="text-rose-400 font-medium">Limit Threshold</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>
            Delta Drift: <b className="text-white font-bold">{((component.v168 ?? 0) - (component.v0 ?? 0)).toFixed(2)} &micro;A</b>
          </span>
          <span>
            Lot Z-Score:{' '}
            <b
              className={
                Math.abs(component.z168 ?? 0) >= 3
                  ? 'text-rose-400 font-bold'
                  : Math.abs(component.z168 ?? 0) >= 2
                  ? 'text-amber-400 font-bold'
                  : 'text-emerald-400'
              }
            >
              {component.z168 != null ? `${component.z168 > 0 ? '+' : ''}${component.z168.toFixed(2)}σ` : '--'}
            </b>
          </span>
        </div>
      </div>
    </div>
  )
}

