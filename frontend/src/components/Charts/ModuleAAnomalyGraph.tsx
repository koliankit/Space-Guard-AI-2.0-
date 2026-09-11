import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { ComponentOut } from '../../types'
import { sounds } from '../../utils/soundEffects'

interface ModuleAAnomalyGraphProps {
  component: ComponentOut | null
}

const STAGES = [0, 24, 96, 168]

export default function ModuleAAnomalyGraph({ component }: ModuleAAnomalyGraphProps) {
  const [stageH, setStageH] = useState<number>(168)
  const [animProgress, setAnimProgress] = useState<number>(1)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const pathRef = useRef<SVGPathElement>(null)
  const [pathLength, setPathLength] = useState<number>(800)
  const animFrameRef = useRef<number | null>(null)
  const lastPingHourRef = useRef<number>(-1)

  const W = 720
  const H = 280
  const padL = 54
  const padR = 28
  const padT = 24
  const padB = 44

  // Live simulation telemetry sweep
  const startSweepAnimation = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setIsSimulating(true)
    setAnimProgress(0)
    lastPingHourRef.current = -1
    sounds.playClick()
    const startTime = performance.now()
    const duration = 2200 // 2.2 seconds slow-to-medium sweep

    const tick = (now: number) => {
      const elapsed = now - startTime
      const rawP = Math.min(1, elapsed / duration)
      // Smooth cubic ease-in-out for realistic oscilloscope probe sweep
      const easeP = rawP < 0.5 ? 4 * rawP * rawP * rawP : 1 - Math.pow(-2 * rawP + 2, 3) / 2
      setAnimProgress(easeP)

      if (rawP < 1) {
        animFrameRef.current = requestAnimationFrame(tick)
      } else {
        setAnimProgress(1)
        setIsSimulating(false)
        animFrameRef.current = null
      }
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  // Auto-trigger sweep when component changes or stage filter changes
  useEffect(() => {
    if (component?.component_id) {
      startSweepAnimation()
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [component?.component_id, stageH, startSweepAnimation])

  // Measure path length on DOM mount/update
  useEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength()
      if (len > 0 && Math.abs(len - pathLength) > 1) {
        setPathLength(len)
      }
    }
  }, [component, stageH, pathLength])

  // Signal spectrogram equalizer bars along the bottom (animating dynamically during sweep)
  const spectrumBars = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => {
      const wave = isSimulating ? Math.sin(animProgress * Math.PI * 4 + i * 0.4) * 4 : 0
      const base = Math.abs(Math.sin((i / 36) * Math.PI * 3.2)) * 18 + 5
      return Math.min(Math.max(4, base + wave), 24)
    })
  }, [isSimulating, animProgress])

  if (!component) {
    return (
      <div className="bg-[#071120] border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-bold text-white flex items-center gap-1.5 text-[11px] uppercase">
            <span className="w-2 h-2 rounded-full bg-white led" />
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

  // Probe tip coordinates along the path
  const tipPoint = useMemo(() => {
    if (!pathRef.current || pathLength <= 0) {
      return { x: xFor(0), y: yFor(component.v0) }
    }
    const currentLen = Math.min(pathLength, Math.max(0, pathLength * animProgress))
    try {
      return pathRef.current.getPointAtLength(currentLen)
    } catch {
      return { x: xFor(0), y: yFor(component.v0) }
    }
  }, [animProgress, pathLength, component.v0])

  // Current simulated hour and telemetry value from probe position
  const simHour = useMemo(() => {
    const rawH = ((tipPoint.x - padL) / (W - padL - padR)) * 168
    return Math.min(stageH, Math.max(0, rawH))
  }, [tipPoint.x, stageH, padL, padR, W])

  const simVal = useMemo(() => {
    const fraction = (H - padB - tipPoint.y) / (H - padT - padB || 1)
    const val = minY + fraction * (maxY - minY)
    return Math.max(minY, Math.min(maxY, val))
  }, [tipPoint.y, minY, maxY, H, padT, padB])

  // Trigger audio pings at time milestones
  useEffect(() => {
    if (!isSimulating) return
    for (const h of STAGES) {
      if (h <= stageH && simHour >= h && lastPingHourRef.current < h) {
        lastPingHourRef.current = h
        sounds.playPing()
        break
      }
    }
  }, [simHour, isSimulating, stageH])

  // Live interpolated readouts for dashboard synchronization
  const finalDelta = (component.v168 ?? 0) - (component.v0 ?? 0)
  const displayedDelta = animProgress >= 1 ? finalDelta : simVal - component.v0
  const finalZ = component.z168
  const displayedZ = animProgress >= 1 ? finalZ : (simVal - lotMean) / (lotStd || 1)

  return (
    <div className="bg-[#070E1C] border border-slate-800/90 rounded-xl p-3 flex flex-col gap-2 shadow-lg select-none">
      {/* Top Header & Stage Scrubbing Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full led"
            style={{ backgroundColor: curveColor }}
          />
          <span className="font-display font-bold text-xs md:text-sm text-white tracking-wider uppercase">
            GRAPH A &bull; HTOL 168H PARAMETRIC ANOMALY OSCILLOSCOPE
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-bold">
            {component.component_id}
          </span>
        </div>

        {/* Action controls & Stage Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Simulation Indicator & Replay Control */}
          <div className="flex items-center gap-1.5">
            {isSimulating ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                LIVE SWEEP [{(animProgress * 100).toFixed(0)}%]
              </span>
            ) : (
              <button
                type="button"
                onClick={startSweepAnimation}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm"
                title="Replay oscilloscope live telemetry sweep"
              >
                <span>▶</span> REPLAY SWEEP
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#050914] p-1 rounded-lg border border-slate-800">
            <span className="text-xs font-mono text-slate-400 px-1.5 uppercase font-bold">Stage:</span>
            {STAGES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setStageH(h)}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  stageH === h
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/60 font-bold shadow-isro'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main SVG Chart Canvas */}
      <div className="relative rounded-lg overflow-hidden border border-slate-800/80 bg-[#040812]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[260px] md:h-[290px] block">
          <defs>
            <linearGradient id="area-grad-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={curveColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={curveColor} stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="lot-band-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
            </linearGradient>

            <linearGradient id="laserBeamGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={curveColor} stopOpacity="0.0" />
              <stop offset="50%" stopColor={curveColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor={curveColor} stopOpacity="0.0" />
            </linearGradient>

            <filter id="glow-a" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Sweep Clip Path so area fill follows the leading probe in real-time */}
            <clipPath id="sweep-clip-a">
              <rect
                x={0}
                y={0}
                width={animProgress >= 1 ? W : Math.max(padL, tipPoint.x)}
                height={H}
              />
            </clipPath>
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
              stroke="#FFFFFF"
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

          {/* Lot Norm Baseline Trace (Crisp White dashed line) */}
          {baselinePts.length > 1 && (
            <path
              d={baselineCurve}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.4}
              strokeDasharray="3 2"
              opacity={0.85}
            />
          )}

          {/* Shaded Area under Component Curve (clipped to current sweep progress) */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#area-grad-a)"
              clipPath="url(#sweep-clip-a)"
            />
          )}

          {/* Component Waveform Curve (Solid Trace drawn live via strokeDashoffset) */}
          {smoothCurve && (
            <path
              ref={pathRef}
              d={smoothCurve}
              fill="none"
              stroke={curveColor}
              strokeWidth={2.4}
              strokeDasharray={pathLength}
              strokeDashoffset={pathLength * (1 - animProgress)}
              filter="url(#glow-a)"
            />
          )}

          {/* Component Reading Data Points (Sequentially revealing as laser sweeps past) */}
          {shown.map(([h, val]) => {
            const cx = xFor(h)
            const cy = yFor(val)
            const isWorstPoint = h === 168 && isRej
            const isReached = tipPoint.x >= cx - 2 || animProgress >= 1

            if (!isReached) return null

            return (
              <g key={h} className="transition-opacity duration-300">
                {/* Milestone ping glow circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isWorstPoint ? 8 : 6}
                  fill={isWorstPoint ? '#EF4444' : curveColor}
                  opacity={0.35}
                />
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
                  y={cy - 9}
                  textAnchor="middle"
                  className="fill-white text-[8.5px] font-mono font-bold tabular-nums"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            )
          })}

          {/* Real-time Oscilloscope Scanner Beam & Laser Probe Head */}
          {isSimulating && animProgress < 1 && (
            <g>
              {/* Vertical Laser Scanner Line */}
              <line
                x1={tipPoint.x}
                x2={tipPoint.x}
                y1={padT}
                y2={H - padB}
                stroke="url(#laserBeamGrad)"
                strokeWidth={1.5}
                opacity={0.9}
              />
              {/* Active Laser Probe Head */}
              <circle
                cx={tipPoint.x}
                cy={tipPoint.y}
                r={8}
                fill={curveColor}
                opacity={0.35}
              />
              <circle
                cx={tipPoint.x}
                cy={tipPoint.y}
                r={4.5}
                fill={curveColor}
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
              <circle
                cx={tipPoint.x}
                cy={tipPoint.y}
                r={1.5}
                fill="#FFFFFF"
              />

              {/* Floating Live Telemetry Chip above the probe */}
              <g
                transform={`translate(${Math.min(
                  W - padR - 55,
                  Math.max(padL + 55, tipPoint.x)
                )}, ${Math.max(padT + 16, tipPoint.y - 18)})`}
              >
                <rect
                  x="-52"
                  y="-12"
                  width="104"
                  height="20"
                  rx="4"
                  fill="#0B1528"
                  stroke={curveColor}
                  strokeWidth="1.2"
                  filter="drop-shadow(0 2px 5px rgba(0,0,0,0.6))"
                />
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  T+{Math.round(simHour)}h: {simVal.toFixed(2)} &mu;A
                </text>
              </g>
            </g>
          )}

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
                  fill={isSimulating ? '#10B981' : '#F59E0B'}
                  opacity={0.3 + (bh / 18) * 0.4}
                  rx={1}
                />
              )
            })}
          </g>
        </svg>
      </div>

      {/* Legend & Telemetry Readouts (Updating live in sync with sweep) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm font-mono text-slate-200 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-2">
            <span
              className="inline-block w-3.5 h-1.5 rounded-full"
              style={{ backgroundColor: curveColor }}
            />
            <span className="font-bold text-white">Component Measured</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-1 bg-white border-t border-dashed border-white" />
            <span className="text-slate-100 font-semibold">Lot Norm Mean ({lotMean.toFixed(1)}&mu;A)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-1 bg-rose-500" />
            <span className="text-rose-400 font-semibold">Limit Threshold</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="text-slate-400">Delta Drift:</span>
            <b className={`font-bold tabular-nums ${isSimulating ? 'text-amber-300' : 'text-white'}`}>
              {displayedDelta.toFixed(2)} &micro;A
            </b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-400">Lot Z-Score:</span>
            <b
              className={`tabular-nums ${
                displayedZ != null && Math.abs(displayedZ) >= 3
                  ? 'text-rose-400 font-bold'
                  : displayedZ != null && Math.abs(displayedZ) >= 2
                  ? 'text-amber-400 font-bold'
                  : 'text-emerald-400 font-bold'
              }`}
            >
              {displayedZ != null ? `${displayedZ > 0 ? '+' : ''}${displayedZ.toFixed(2)}σ` : '--'}
            </b>
          </span>
        </div>
      </div>
    </div>
  )
}


