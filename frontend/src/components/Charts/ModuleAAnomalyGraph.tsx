import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { ComponentOut } from '../../types'
import { sounds } from '../../utils/soundEffects'
import { buildMonotoneCubicPath, evaluateMonotoneSpline, type Point2D } from '../../utils/splineUtils'

export interface ModuleASimData {
  progress: number
  simHour: number
  simVal: number
  isSimulating: boolean
}

interface ModuleAAnomalyGraphProps {
  component: ComponentOut | null
  onSimUpdate?: (data: ModuleASimData) => void
}

const STAGES = [0, 24, 96, 168]

export default function ModuleAAnomalyGraph({ component, onSimUpdate }: ModuleAAnomalyGraphProps) {
  const [stageH, setStageH] = useState<number>(168)
  const [animProgress, setAnimProgress] = useState<number>(0)
  const [isSimulating, setIsSimulating] = useState<boolean>(true)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [isLooping, setIsLooping] = useState<boolean>(true)
  const [simSpeed, setSimSpeed] = useState<0.5 | 1 | 2>(0.5)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  // Interactive mouse hover state
  const [isHovering, setIsHovering] = useState<boolean>(false)
  const [hoverData, setHoverData] = useState<{
    hour: number
    val: number
    x: number
    y: number
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [chartDims, setChartDims] = useState<{ width: number; height: number }>({ width: 880, height: 420 })

  const pathRef = useRef<SVGPathElement>(null)
  const [pathLength, setPathLength] = useState<number>(800)
  const animFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const elapsedOffsetRef = useRef<number>(0)

  // Measure container dimensions dynamically
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateSize = () => {
      const w = el.clientWidth || el.getBoundingClientRect().width
      const h = el.clientHeight || el.getBoundingClientRect().height
      if (w > 0 && h > 0) {
        setChartDims({
          width: Math.round(w),
          height: Math.round(Math.max(420, h)),
        })
      }
    }
    updateSize()
    const timer = setTimeout(updateSize, 40)

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect
        const w = cr.width || el.clientWidth
        const h = cr.height || el.clientHeight
        if (w > 0 && h > 0) {
          setChartDims({
            width: Math.round(w),
            height: Math.round(Math.max(420, h)),
          })
        }
      }
    })
    ro.observe(el)
    window.addEventListener('resize', updateSize)
    return () => {
      clearTimeout(timer)
      ro.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [isExpanded])

  const W = Math.max(500, chartDims.width)
  const H = Math.max(420, chartDims.height)
  const padL = 55
  const padR = 28
  const padT = 28
  const padB = 46

  // Geometry calculations
  const limitVal = component?.limit_ua || 50
  const lotMean = component?.lot_mean ?? (component?.v168 ? component.v168 * 0.94 : 11.5)
  const lotStd = component?.lot_std ?? 1.8

  const bandLow = Math.max(0, lotMean - 2 * lotStd)
  const bandHigh = lotMean + 2 * lotStd

  const v0 = component?.v0 ?? 10
  const v24 = component?.v24 ?? 10.2
  const v96 = component?.v96 ?? 10.8
  const v168 = component?.v168 ?? 11.4

  const allVals = [v0, v24, v96, v168, limitVal, bandLow, bandHigh]
  const minY = Math.max(0, Math.min(...allVals) * 0.75)
  const maxY = Math.max(...allVals) * 1.20

  const xFor = useCallback(
    (h: number) => padL + (Math.max(0, Math.min(168, h)) / 168) * (W - padL - padR),
    [padL, padR, W]
  )
  const yFor = useCallback(
    (v: number) => {
      const clamped = Math.max(minY, Math.min(maxY, v))
      return H - padB - ((clamped - minY) / (maxY - minY || 1)) * (H - padT - padB)
    },
    [minY, maxY, H, padB, padT]
  )

  const stages: [number, number][] = useMemo(() => {
    const list: [number, number][] = [[0, v0], [24, v24]]
    if (component?.v96 != null) list.push([96, v96])
    list.push([168, v168])
    return list
  }, [v0, v24, v96, v168, component?.v96])

  const shown = useMemo(() => stages.filter(([h]) => h <= stageH), [stages, stageH])

  const mappedPoints: Point2D[] = useMemo(() => {
    return shown.map(([h, v]) => ({ x: xFor(h), y: yFor(v) }))
  }, [shown, xFor, yFor])

  // Fritsch-Carlson Monotone Spline (No overshoots, no loops)
  const smoothCurve = useMemo(() => {
    return buildMonotoneCubicPath(mappedPoints)
  }, [mappedPoints])

  const lastPoint = shown[shown.length - 1]

  const areaD = useMemo(() => {
    if (shown.length <= 1 || !smoothCurve) return ''
    return `${smoothCurve} L ${xFor(lastPoint[0])} ${H - padB} L ${xFor(shown[0][0])} ${H - padB} Z`
  }, [smoothCurve, shown, lastPoint, H, padB, xFor])

  const mappedBaseline: Point2D[] = useMemo(() => {
    const baselinePts: [number, number][] = [
      [0, v0 * 0.95],
      [24, v0 + (lotMean - v0) * 0.18],
      [96, v0 + (lotMean - v0) * 0.6],
      [168, lotMean],
    ].filter(([h]) => h <= stageH) as [number, number][]

    return baselinePts.map(([h, v]) => ({ x: xFor(h), y: yFor(v) }))
  }, [v0, lotMean, stageH, xFor, yFor])

  const baselineCurve = useMemo(() => {
    return buildMonotoneCubicPath(mappedBaseline)
  }, [mappedBaseline])

  // Current simulated hour and telemetry value along monotone spline
  const simHour = useMemo(() => {
    return Math.min(stageH, Math.max(0, animProgress * stageH))
  }, [animProgress, stageH])

  const tipPoint = useMemo(() => {
    if (mappedPoints.length < 2) {
      return { x: xFor(0), y: yFor(v0) }
    }
    const x = xFor(simHour)
    const y = evaluateMonotoneSpline(mappedPoints, x)
    return {
      x: Math.max(padL, Math.min(W - padR, x)),
      y: Math.max(padT, Math.min(H - padB, y)),
    }
  }, [simHour, mappedPoints, xFor, yFor, v0, padL, padR, padT, padB, W, H])

  const simVal = useMemo(() => {
    const fraction = (H - padB - tipPoint.y) / (H - padT - padB || 1)
    const val = minY + fraction * (maxY - minY)
    return Math.max(minY, Math.min(maxY, val))
  }, [tipPoint.y, minY, maxY, H, padT, padB])

  // Active coordinates (Hover overrides auto-simulation)
  const isUserInspecting = isHovering && hoverData !== null
  const activeHour = isUserInspecting ? hoverData.hour : simHour
  const activeVal = isUserInspecting ? hoverData.val : simVal
  const activeProbeX = isUserInspecting ? hoverData.x : tipPoint.x
  const activeProbeY = isUserInspecting ? hoverData.y : tipPoint.y

  const simSpeedRef = useRef<number>(simSpeed)
  simSpeedRef.current = simSpeed

  const isLoopingRef = useRef<boolean>(isLooping)
  isLoopingRef.current = isLooping

  const stageHRef = useRef<number>(stageH)
  stageHRef.current = stageH

  const lastPingHourRef = useRef<number>(-1)

  const getDuration = useCallback((spd: number) => {
    return 8000 / spd
  }, [])

  // Live simulation telemetry sweep callback
  const startSweepAnimation = useCallback((resetOffset = true) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setIsSimulating(true)
    setIsPaused(false)

    const curSpeed = simSpeedRef.current
    const duration = getDuration(curSpeed)

    if (resetOffset) {
      setAnimProgress(0)
      elapsedOffsetRef.current = 0
      lastPingHourRef.current = -1
      startTimeRef.current = performance.now()
    } else {
      startTimeRef.current = performance.now() - elapsedOffsetRef.current
    }

    const tick = (now: number) => {
      const currentDuration = getDuration(simSpeedRef.current)
      const elapsed = now - startTimeRef.current
      elapsedOffsetRef.current = elapsed
      const rawP = elapsed / currentDuration

      if (rawP >= 1) {
        if (isLoopingRef.current) {
          const holdElapsed = now - (startTimeRef.current + currentDuration)
          if (holdElapsed >= 750) {
            startTimeRef.current = now
            elapsedOffsetRef.current = 0
            lastPingHourRef.current = -1
            setAnimProgress(0)
          } else {
            setAnimProgress(1)
          }
          animFrameRef.current = requestAnimationFrame(tick)
          return
        } else {
          setAnimProgress(1)
          setIsSimulating(false)
          setIsPaused(false)
          animFrameRef.current = null
          return
        }
      }

      const p = Math.max(0, Math.min(1, rawP))
      setAnimProgress(p)

      // Milestone audio radar ping
      const curHour = p * stageHRef.current
      for (const m of [24, 96, 168]) {
        if (curHour >= m && lastPingHourRef.current < m && m <= stageHRef.current) {
          lastPingHourRef.current = m
          sounds.playPing()
          break
        }
      }

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }, [getDuration])

  const togglePause = useCallback(() => {
    sounds.playClick()
    if (isPaused) {
      startSweepAnimation(false)
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setIsPaused(true)
    }
  }, [isPaused, startSweepAnimation])

  const handleSpeedChange = useCallback((spd: 0.5 | 1 | 2) => {
    sounds.playClick()
    setSimSpeed(spd)
    simSpeedRef.current = spd
    const newDuration = getDuration(spd)
    const curP = animProgress >= 1 ? 0 : animProgress
    elapsedOffsetRef.current = curP * newDuration
    startTimeRef.current = performance.now() - elapsedOffsetRef.current

    if (isPaused || !isSimulating) {
      setIsPaused(false)
      setIsSimulating(true)
      startSweepAnimation(false)
    }
  }, [animProgress, isPaused, isSimulating, getDuration, startSweepAnimation])

  // Auto-trigger sweep when component changes
  useEffect(() => {
    if (component?.component_id) {
      startSweepAnimation(true)
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [component?.component_id, startSweepAnimation])

  // Notify parent dashboard with live state
  useEffect(() => {
    if (onSimUpdate) {
      onSimUpdate({
        progress: animProgress,
        simHour: activeHour,
        simVal: activeVal,
        isSimulating,
      })
    }
  }, [animProgress, activeHour, activeVal, isSimulating, onSimUpdate])

  // Measure path length on DOM mount/update
  useEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength()
      if (len > 0 && Math.abs(len - pathLength) > 1) {
        setPathLength(len)
      }
    }
  }, [component, stageH, pathLength, smoothCurve])

  // Mouse handlers for interactive scrubbing
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg || mappedPoints.length < 2) return
    const rect = svg.getBoundingClientRect()
    const clientX = e.clientX - rect.left
    const svgX = (clientX / rect.width) * W

    const clampedX = Math.max(padL, Math.min(W - padR, svgX))
    const hour = ((clampedX - padL) / (W - padL - padR)) * 168
    const clampedHour = Math.min(stageH, Math.max(0, hour))

    const y = evaluateMonotoneSpline(mappedPoints, clampedX)
    const clampedY = Math.max(padT, Math.min(H - padB, y))
    const fraction = (H - padB - clampedY) / (H - padT - padB || 1)
    const val = minY + fraction * (maxY - minY)

    setIsHovering(true)
    setHoverData({
      hour: clampedHour,
      val: Math.max(minY, Math.min(maxY, val)),
      x: clampedX,
      y: clampedY,
    })
  }

  const handleSvgMouseLeave = () => {
    setIsHovering(false)
    setHoverData(null)
  }

  const handleScrubberChange = (newHour: number) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setIsPaused(true)
    const clampedH = Math.min(stageH, Math.max(0, newHour))
    const clampedX = xFor(clampedH)
    const y = evaluateMonotoneSpline(mappedPoints, clampedX)
    const clampedY = Math.max(padT, Math.min(H - padB, y))
    const fraction = (H - padB - clampedY) / (H - padT - padB || 1)
    const val = minY + fraction * (maxY - minY)

    const newProgress = clampedH / (stageH || 1)
    setAnimProgress(newProgress)
    const duration = getDuration(simSpeedRef.current)
    elapsedOffsetRef.current = newProgress * duration
    startTimeRef.current = performance.now() - elapsedOffsetRef.current

    setIsHovering(true)
    setHoverData({
      hour: clampedH,
      val: Math.max(minY, Math.min(maxY, val)),
      x: clampedX,
      y: clampedY,
    })
  }

  // Visual status indicators
  const isRej = component?.status === 'reject'
  const isMon = component?.status === 'monitor'
  const curveColor = isRej ? '#EF4444' : isMon ? '#F59E0B' : '#10B981'

  // Metric derivations
  const drift168 = activeVal - v0
  const zScore = (activeVal - lotMean) / (lotStd || 1)
  const specMargin = limitVal - activeVal

  if (!component) {
    return (
      <div className="bg-[#070E1C] border border-slate-800/90 rounded-xl p-3 flex flex-col gap-2 relative shadow-lg select-none flex-1 h-full w-full min-h-[400px]">
        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
          <span className="font-display font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            MODULE A &bull; SILICON ANOMALY OSCILLOSCOPE
          </span>
          <span className="text-[10px] text-slate-400 font-mono">MIL-STD-883 HTOL</span>
        </div>
        <div className="flex-1 min-h-[360px] flex items-center justify-center rounded-lg border border-slate-800/80 bg-[#050B16] text-slate-400 text-xs font-mono">
          [ SELECT COMPONENT OR LOAD BATCH TO INSPECT HTOL OSCILLOSCOPE WAVEFORM ]
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#070E1C] border border-slate-800/90 rounded-xl p-3 flex flex-col gap-2.5 relative shadow-lg select-none flex-1 h-full w-full min-h-[400px]">
      {/* Top Header & Simulation Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-amber-400 flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full led" style={{ backgroundColor: curveColor }} />
            MODULE A &bull; SILICON ANOMALY OSCILLOSCOPE
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 border border-slate-700 text-slate-100">
            {component.component_id}
          </span>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#050914] p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={togglePause}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                !isPaused && isSimulating
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title={isPaused ? 'Resume Sweep' : 'Pause Sweep'}
            >
              <span className={`w-2 h-2 rounded-full ${!isPaused && isSimulating ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span>{isPaused ? '▶ RESUME' : '⏸ PAUSE'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsHovering(false)
                setHoverData(null)
                startSweepAnimation(true)
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm"
              title="Replay oscilloscope telemetry sweep from 0h"
            >
              <span>↺</span> REPLAY
            </button>

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={() => setIsLooping((prev) => !prev)}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                isLooping
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title={isLooping ? 'Auto-loop active: sweeps continuously' : 'Loop disabled: stops at 168h'}
            >
              🔁 {isLooping ? 'LOOP ON' : 'LOOP OFF'}
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-0.5 pl-1 border-l border-slate-700 text-[10px] font-mono">
              {([0.5, 1, 2] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => handleSpeedChange(spd)}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${
                    simSpeed === spd
                      ? 'bg-amber-500/40 text-amber-200 border border-amber-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={spd === 0.5 ? '0.5x Slow' : spd === 1 ? '1x Normal' : '2x Fast'}
                >
                  {spd}x{spd === 0.5 ? ' SLOW' : ''}
                </button>
              ))}
            </div>

            <span className="text-[9.5px] font-mono font-bold text-emerald-400 px-1 whitespace-nowrap">
              {isUserInspecting
                ? `[INSPECT T+${Math.round(activeHour)}h]`
                : isPaused
                ? `[PAUSED T+${Math.round(activeHour)}h]`
                : `[SWEEP T+${Math.round(activeHour)}h]`}
            </span>
          </div>

          {/* Stage Milestones */}
          <div className="flex items-center gap-1 bg-[#050914] p-1 rounded-lg border border-slate-800 font-mono text-[11px]">
            <span className="text-slate-400 px-1 uppercase text-[10px] font-bold">HORIZON:</span>
            {STAGES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  sounds.playClick()
                  setStageH(h)
                }}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  stageH === h
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/60 shadow-isro'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm ${
              isExpanded
                ? 'bg-amber-500/30 text-amber-300 border-amber-500/60 shadow-isro'
                : 'bg-[#050914] hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
            title={isExpanded ? 'Restore Standard Height' : 'Expand Oscilloscope'}
          >
            <span>{isExpanded ? '⤡ RESTORE' : '⤢ EXPAND'}</span>
          </button>
        </div>
      </div>

      {/* Manual Timeline Scrubber */}
      <div className="bg-[#070D1A] border border-slate-800/80 rounded-lg px-3 py-1 flex items-center justify-between gap-3 text-xs font-mono">
        <span className="text-slate-400 whitespace-nowrap text-[11px] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          MANUAL SCRUBBER:
        </span>
        <input
          type="range"
          min={0}
          max={stageH}
          step={1}
          value={Math.round(activeHour)}
          onChange={(e) => handleScrubberChange(parseFloat(e.target.value))}
          className="flex-1 accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          title="Drag slider to inspect waveform at any hour"
        />
        <span className="text-amber-300 font-bold text-xs min-w-[65px] text-right">
          T+{Math.round(activeHour)} hrs
        </span>
      </div>

      {/* Main SVG Chart Canvas */}
      <div
        ref={containerRef}
        className={`relative rounded-lg overflow-hidden border border-slate-800/80 bg-[#040812] w-full flex-1 transition-all duration-300 cursor-crosshair ${
          isExpanded
            ? 'min-h-[640px] md:min-h-[740px] lg:min-h-[820px]'
            : 'min-h-[460px] sm:min-h-[500px] md:min-h-[540px] lg:min-h-[580px]'
        }`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full block select-none"
          style={{ width: '100%', height: '100%', display: 'block' }}
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={handleSvgMouseLeave}
          onClick={handleSvgMouseMove}
        >
          <defs>
            <linearGradient id="area-grad-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={curveColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={curveColor} stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="lot-band-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
            </linearGradient>

            <filter id="glow-a" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <clipPath id="sweep-clip-a">
              <rect
                x={0}
                y={0}
                width={animProgress >= 1 || isUserInspecting ? W : Math.max(padL, tipPoint.x)}
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

          {/* Lot Peer Variance Band */}
          {stageH >= 24 && (
            <rect
              x={xFor(0)}
              y={yFor(bandHigh)}
              width={xFor(stageH) - xFor(0)}
              height={Math.max(0, yFor(bandLow) - yFor(bandHigh))}
              fill="url(#lot-band-grad)"
              stroke="#FFFFFF"
              strokeOpacity="0.22"
              strokeDasharray="3 3"
            />
          )}

          {/* Static Datasheet Limit Line */}
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
            SPEC LIMIT ({limitVal}µA)
          </text>

          {/* Lot Norm Baseline Trace */}
          {baselineCurve && (
            <path
              d={baselineCurve}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.4}
              strokeDasharray="3 2"
              opacity={0.85}
            />
          )}

          {/* Shaded Area under Component Curve */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#area-grad-a)"
              clipPath="url(#sweep-clip-a)"
            />
          )}

          {/* Hidden length path */}
          {smoothCurve && (
            <path
              ref={pathRef}
              d={smoothCurve}
              fill="none"
              stroke="transparent"
              strokeWidth={1}
            />
          )}

          {/* Component Waveform Curve (Monotone Cubic Spline) */}
          {smoothCurve && (
            <path
              d={smoothCurve}
              fill="none"
              stroke={curveColor}
              strokeWidth={2.4}
              filter="url(#glow-a)"
              clipPath="url(#sweep-clip-a)"
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
                  r={isWorstPoint ? 7 : 5}
                  fill={isWorstPoint ? '#EF4444' : curveColor}
                  opacity={0.35}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={isWorstPoint ? 4.5 : 3.5}
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

          {/* Crosshair Laser & HUD Probe */}
          {(isSimulating || isUserInspecting || isPaused) && (
            <g>
              <line
                x1={activeProbeX}
                x2={activeProbeX}
                y1={padT}
                y2={H - padB}
                stroke={curveColor}
                strokeWidth={1.4}
                strokeDasharray="3 2"
                opacity={0.8}
              />
              <line
                x1={padL}
                x2={activeProbeX}
                y1={activeProbeY}
                y2={activeProbeY}
                stroke={curveColor}
                strokeWidth={0.8}
                strokeDasharray="2 2"
                opacity={0.5}
              />
              <circle
                cx={activeProbeX}
                cy={activeProbeY}
                r={9}
                fill={curveColor}
                opacity={0.35}
                className="animate-ping"
              />
              <circle
                cx={activeProbeX}
                cy={activeProbeY}
                r={4.5}
                fill={curveColor}
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />

              {/* Floating Tooltip Chip */}
              <g
                transform={`translate(${Math.min(
                  W - padR - 65,
                  Math.max(padL + 65, activeProbeX)
                )}, ${Math.max(padT + 18, activeProbeY - 22)})`}
              >
                <rect
                  x="-62"
                  y="-13"
                  width="124"
                  height="22"
                  rx="5"
                  fill="#0B1528"
                  stroke={curveColor}
                  strokeWidth="1.2"
                  filter="drop-shadow(0 3px 6px rgba(0,0,0,0.8))"
                />
                <text
                  x="0"
                  y="2.5"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="9.5"
                  fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
                  fontWeight="bold"
                >
                  T+{Math.round(activeHour)}h: {activeVal.toFixed(2)} µA
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Module A Live Telemetry HUD Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
        <div className="p-2 rounded-lg bg-[#050A14] border border-slate-800 flex flex-col">
          <span className="text-slate-400 text-[10px] uppercase">Active Reading</span>
          <span className={`text-sm font-bold tabular-nums ${isUserInspecting ? 'text-sky-400' : isRej ? 'text-rose-400' : 'text-emerald-400'}`}>
            {activeVal.toFixed(2)} µA
          </span>
          <span className="text-[9px] text-slate-500">T+{Math.round(activeHour)}h probe</span>
        </div>

        <div className="p-2 rounded-lg bg-[#050A14] border border-slate-800 flex flex-col">
          <span className="text-slate-400 text-[10px] uppercase">Drift vs 0h</span>
          <span className={`text-sm font-bold tabular-nums ${drift168 > 4 ? 'text-amber-400' : 'text-slate-200'}`}>
            {drift168 > 0 ? '+' : ''}{drift168.toFixed(2)} µA
          </span>
          <span className="text-[9px] text-slate-500">0h: {v0.toFixed(1)} µA</span>
        </div>

        <div className="p-2 rounded-lg bg-[#050A14] border border-slate-800 flex flex-col">
          <span className="text-slate-400 text-[10px] uppercase">Lot Z-Score</span>
          <span className={`text-sm font-bold tabular-nums ${Math.abs(zScore) >= 2.5 ? 'text-rose-400' : 'text-slate-200'}`}>
            {zScore > 0 ? '+' : ''}{zScore.toFixed(2)}σ
          </span>
          <span className="text-[9px] text-slate-500">Mean: {lotMean.toFixed(1)} µA</span>
        </div>

        <div className="p-2 rounded-lg bg-[#050A14] border border-slate-800 flex flex-col">
          <span className="text-slate-400 text-[10px] uppercase">Spec Margin</span>
          <span className={`text-sm font-bold tabular-nums ${specMargin < 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {specMargin.toFixed(1)} µA
          </span>
          <span className="text-[9px] text-slate-500">Limit: {limitVal} µA</span>
        </div>
      </div>
    </div>
  )
}
