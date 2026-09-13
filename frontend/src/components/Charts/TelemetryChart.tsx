import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { ComponentOut } from '../../types'
import { sounds } from '../../utils/soundEffects'
import { buildMonotoneCubicPath, evaluateMonotoneSpline, type Point2D } from '../../utils/splineUtils'

const STAGES = [0, 24, 96, 168, 216]

export default function TelemetryChart({ component }: { component: ComponentOut | null }) {
  const [stageH, setStageH] = useState<number>(216)
  const [animProgress, setAnimProgress] = useState<number>(1)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [simSpeed, setSimSpeed] = useState<0.5 | 1 | 2>(1)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  // Interactive mouse hover & manual scrub state (User in 100% control)
  const [isHovering, setIsHovering] = useState<boolean>(false)
  const [hoverData, setHoverData] = useState<{
    hour: number
    val: number
    x: number
    y: number
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [chartDims, setChartDims] = useState<{ width: number; height: number }>({ width: 920, height: 460 })

  const pathRef = useRef<SVGPathElement>(null)
  const [pathLength, setPathLength] = useState<number>(850)
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
          height: Math.round(Math.max(440, h)),
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
            height: Math.round(Math.max(440, h)),
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
  const H = Math.max(440, chartDims.height)
  const padL = 60
  const padR = 36
  const padT = 32
  const padB = 48

  // Component values & defaults
  const limitVal = component?.limit_ua || 50
  const lotMean = component?.lot_mean ?? (component?.v168 ? component.v168 * 0.92 : 12.0)
  const lotStd = component?.lot_std ?? 1.8

  const bandLow = Math.max(0, lotMean - 2 * lotStd)
  const bandHigh = lotMean + 2 * lotStd

  const v0 = component?.v0 ?? 10
  const v24 = component?.v24 ?? 11.2
  const v96 = component?.v96 ?? 13.8
  const v168 = component?.v168 ?? 16.5
  const predFuture = component?.predicted_future ?? (v168 + (v168 - v96) * 0.6)

  // Safe padded Y bounds so lines never clip
  const allVals = [v0, v24, v96, v168, limitVal, bandLow, bandHigh, predFuture]
  const minY = Math.max(0, Math.min(...allVals) * 0.75)
  const maxY = Math.max(...allVals) * 1.20

  const maxHorizon = 216
  const xFor = useCallback(
    (h: number) => padL + (Math.max(0, Math.min(maxHorizon, h)) / maxHorizon) * (W - padL - padR),
    [padL, padR, W, maxHorizon]
  )
  const yFor = useCallback(
    (v: number) => {
      const clampedV = Math.max(minY, Math.min(maxY, v))
      return H - padB - ((clampedV - minY) / (maxY - minY || 1)) * (H - padT - padB)
    },
    [minY, maxY, H, padB, padT]
  )

  // Stage points definition
  const stages: [number, number][] = useMemo(() => {
    const list: [number, number][] = [
      [0, v0],
      [24, v24],
    ]
    if (component?.v96 != null) list.push([96, v96])
    list.push([168, v168])
    if (predFuture != null) list.push([216, predFuture])
    return list
  }, [v0, v24, v96, v168, predFuture, component?.v96])

  const shown = useMemo(() => stages.filter(([h]) => h <= stageH), [stages, stageH])

  // Points mapped to pixel coordinates for Fritsch-Carlson Monotonic Spline
  const mappedPoints: Point2D[] = useMemo(() => {
    return shown.map(([h, v]) => ({ x: xFor(h), y: yFor(v) }))
  }, [shown, xFor, yFor])

  // Fritsch-Carlson Monotone Cubic Spline (Guarantees NO overshoot, NO wild loops)
  const smoothCurve = useMemo(() => {
    return buildMonotoneCubicPath(mappedPoints)
  }, [mappedPoints])

  const lastPoint = shown[shown.length - 1]

  const areaD = useMemo(() => {
    if (shown.length <= 1 || !smoothCurve || !lastPoint) return ''
    return `${smoothCurve} L ${xFor(lastPoint[0])} ${H - padB} L ${xFor(shown[0][0])} ${H - padB} Z`
  }, [smoothCurve, shown, lastPoint, H, padB, xFor])

  // Lot peer baseline curve using monotonic spline
  const mappedBaseline: Point2D[] = useMemo(() => {
    const baselinePts: [number, number][] = [
      [0, v0 * 0.96],
      [24, v0 + (lotMean - v0) * 0.2],
      [96, v0 + (lotMean - v0) * 0.65],
      [168, lotMean],
      [216, lotMean + (lotMean - v0) * 0.08],
    ].filter(([h]) => h <= stageH) as [number, number][]

    return baselinePts.map(([h, v]) => ({ x: xFor(h), y: yFor(v) }))
  }, [v0, lotMean, stageH, xFor, yFor])

  const baselineCurve = useMemo(() => {
    return buildMonotoneCubicPath(mappedBaseline)
  }, [mappedBaseline])

  // Probe tip coordinates along the path when auto-simulating
  const tipPoint = useMemo(() => {
    if (!pathRef.current || pathLength <= 0) {
      return { x: xFor(0), y: yFor(v0) }
    }
    const currentLen = Math.min(pathLength, Math.max(0, pathLength * animProgress))
    try {
      const pt = pathRef.current.getPointAtLength(currentLen)
      return {
        x: Math.max(padL, Math.min(W - padR, pt.x)),
        y: Math.max(padT, Math.min(H - padB, pt.y)),
      }
    } catch {
      return { x: xFor(0), y: yFor(v0) }
    }
  }, [animProgress, pathLength, v0, xFor, yFor, padL, padR, padT, padB, W, H])

  // Simulated live instantaneous values calculated along probe trajectory
  const simHour = useMemo(() => {
    const rawH = ((tipPoint.x - padL) / (W - padL - padR)) * maxHorizon
    return Math.min(stageH, Math.max(0, rawH))
  }, [tipPoint.x, stageH, padL, padR, W, maxHorizon])

  const simVal = useMemo(() => {
    const fraction = (H - padB - tipPoint.y) / (H - padT - padB || 1)
    const val = minY + fraction * (maxY - minY)
    return Math.max(minY, Math.min(maxY, val))
  }, [tipPoint.y, minY, maxY, H, padT, padB])

  // Effective Active Probing State (User Hover overrides auto-simulation)
  const isUserInspecting = isHovering && hoverData !== null
  const activeHour = isUserInspecting ? hoverData.hour : isSimulating ? simHour : (lastPoint ? lastPoint[0] : 168)
  const activeVal = isUserInspecting ? hoverData.val : isSimulating ? simVal : (lastPoint ? lastPoint[1] : v168)
  const activeProbeX = isUserInspecting ? hoverData.x : tipPoint.x
  const activeProbeY = isUserInspecting ? hoverData.y : tipPoint.y

  // Base simulation duration
  const baseDuration = 8000 / simSpeed

  const startSweepAnimation = useCallback((resetOffset = true) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setIsSimulating(true)
    setIsPaused(false)
    if (resetOffset) {
      setAnimProgress(0)
      elapsedOffsetRef.current = 0
    }
    sounds.playClick()
    startTimeRef.current = performance.now() - elapsedOffsetRef.current

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current
      elapsedOffsetRef.current = elapsed
      const rawP = Math.min(1, elapsed / baseDuration)
      // Smooth linear pacing without wild jerking
      setAnimProgress(rawP)

      if (rawP < 1) {
        animFrameRef.current = requestAnimationFrame(tick)
      } else {
        setAnimProgress(1)
        setIsSimulating(false)
        setIsPaused(false)
        animFrameRef.current = null
      }
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [baseDuration])

  const togglePause = useCallback(() => {
    if (isPaused) {
      startSweepAnimation(false)
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setIsPaused(true)
    }
  }, [isPaused, startSweepAnimation])

  // Trigger sweep on component change only (NOT on stage change to prevent runaway loops)
  useEffect(() => {
    if (component?.component_id) {
      startSweepAnimation(true)
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [component?.component_id, startSweepAnimation])

  // Measure path length
  useEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength()
      if (len > 0 && Math.abs(len - pathLength) > 1) {
        setPathLength(len)
      }
    }
  }, [component, stageH, pathLength, smoothCurve])

  // Mouse handlers for interactive scrubbing & inspection
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg || mappedPoints.length < 2) return
    const rect = svg.getBoundingClientRect()
    const clientX = e.clientX - rect.left
    const svgX = (clientX / rect.width) * W

    // Clamp within chart boundaries
    const clampedX = Math.max(padL, Math.min(W - padR, svgX))
    const hour = ((clampedX - padL) / (W - padL - padR)) * maxHorizon
    const clampedHour = Math.min(stageH, Math.max(0, hour))

    // Evaluate exact Y on monotonic curve
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
    setIsSimulating(false)
    setIsPaused(true)
    const clampedH = Math.min(stageH, Math.max(0, newHour))
    const clampedX = xFor(clampedH)
    const y = evaluateMonotoneSpline(mappedPoints, clampedX)
    const clampedY = Math.max(padT, Math.min(H - padB, y))
    const fraction = (H - padB - clampedY) / (H - padT - padB || 1)
    const val = minY + fraction * (maxY - minY)

    setIsHovering(true)
    setHoverData({
      hour: clampedH,
      val: Math.max(minY, Math.min(maxY, val)),
      x: clampedX,
      y: clampedY,
    })
  }

  const curveColor = useMemo(() => {
    if (!component) return '#10B981'
    if (component.status === 'reject') return '#EF4444'
    if (component.status === 'monitor') return '#F59E0B'
    return '#10B981'
  }, [component])

  // Derived metrics based on active probe position
  const displayedDelta = activeVal - v0
  const displayedZ = (activeVal - lotMean) / (lotStd || 1)
  const marginToSpec = limitVal - activeVal

  // Fixed deterministic RF Spectrogram Bars
  const spectrumBars = useMemo(() => {
    const bars = [14, 18, 12, 22, 19, 26, 15, 28, 20, 16, 24, 21, 13, 27, 23, 17, 25, 19, 14, 22]
    return bars
  }, [])

  if (!component) {
    return (
      <div className="bg-[#0B1120] p-4 md:p-5 rounded-xl border border-slate-800 relative overflow-hidden font-sans w-full flex flex-col gap-3 shadow-panel-subtle select-none">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-sm md:text-base font-bold font-display tracking-wider uppercase text-amber-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 led" />
            Burn-In Waveform Telemetry Oscilloscope (Full Spectrum)
          </h3>
          <span className="font-mono text-xs text-slate-400 tracking-wider">
            STATUS: <span className="text-emerald-400 font-bold">READY FOR TELEMETRY INTAKE</span>
          </span>
        </div>
        <div ref={containerRef} className="w-full flex-1 min-h-[440px] flex items-center justify-center bg-[#060B16] rounded-xl border border-slate-800 text-slate-400 text-xs font-mono">
          [ SELECT COMPONENT OR LOAD BATCH TO INSPECT OSCILLOSCOPE WAVEFORM ]
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0B1120] p-4 md:p-5 rounded-xl border border-slate-800 relative overflow-hidden font-sans w-full flex flex-col gap-3 shadow-panel-subtle select-none">
      {/* Top Header & Live Sweep Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full led" style={{ backgroundColor: curveColor }} />
          <h3 className="m-0 text-sm md:text-base font-bold font-display tracking-wider uppercase text-amber-400 flex items-center gap-2">
            Burn-In Waveform Oscilloscope
          </h3>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-100 font-bold">
            {component.component_id}
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-[#070D1A] border border-slate-800 text-slate-400">
            {component.subsystem_name || component.subsystem.toUpperCase()} &bull; LOT: {component.lot_id}
          </span>
        </div>

        {/* Live Sweep Playback & Horizon Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Playback Controls */}
          <div className="flex items-center gap-1.5 bg-[#050914] p-1 rounded-lg border border-slate-800">
            {isSimulating ? (
              <button
                type="button"
                onClick={togglePause}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
                title={isPaused ? 'Resume Sweep' : 'Pause Sweep'}
              >
                <span>{isPaused ? '▶ RESUME' : '⏸ PAUSE'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsHovering(false)
                  setHoverData(null)
                  startSweepAnimation(true)
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 text-[11px] font-mono font-bold transition-all cursor-pointer shadow-sm"
                title="Replay oscilloscope telemetry sweep"
              >
                <span>↺</span> REPLAY
              </button>
            )}

            {/* Speed Selector */}
            <div className="flex items-center gap-0.5 pl-1.5 border-l border-slate-700 text-[10px] font-mono">
              {([0.5, 1, 2] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSimSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded ${
                    simSpeed === spd
                      ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={spd === 0.5 ? '0.5x Slow' : spd === 1 ? '1x Normal' : '2x Fast'}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Probe Position Indicator */}
            <span className="text-[10px] font-mono font-bold text-emerald-400 px-1.5">
              {isUserInspecting ? `[INSPECT T+${Math.round(activeHour)}h]` : isPaused ? '[PAUSED]' : isSimulating ? `[T+${Math.round(activeHour)}h]` : `[100% NOMINAL]`}
            </span>
          </div>

          {/* Stage Filtering Buttons */}
          <div className="flex items-center gap-1 bg-[#050914] p-1 rounded-lg border border-slate-800">
            <span className="text-xs font-mono text-slate-400 px-1.5 uppercase font-bold">Horizon:</span>
            {STAGES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  sounds.playClick()
                  setStageH(h)
                }}
                className={`px-2.5 py-1 text-center font-mono text-xs rounded border transition-all cursor-pointer ${
                  stageH === h
                    ? 'border-amber-500 bg-amber-500/25 text-amber-300 font-bold shadow-sm'
                    : 'border-slate-800 bg-[#070D1A] text-slate-300 hover:border-amber-500/50 hover:text-white'
                }`}
              >
                {h === 216 ? '216h (EOT)' : `${h}h`}
              </button>
            ))}
          </div>

          {/* Full Space Expand / Restore Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className={`flex items-center gap-1 px-3 py-1 rounded border text-xs font-mono font-bold transition-all cursor-pointer shadow-sm ${
              isExpanded
                ? 'bg-amber-500/30 text-amber-300 border-amber-500/60 shadow-isro'
                : 'bg-[#050914] hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
            title={isExpanded ? 'Restore Standard Height' : 'Expand Oscilloscope to Maximize Vertical Space'}
          >
            <span>{isExpanded ? '⤡ RESTORE' : '⤢ EXPAND'}</span>
          </button>
        </div>
      </div>

      {/* Manual Timeline Scrubber Slider (Gives user 100% control anytime) */}
      <div className="bg-[#070D1A] border border-slate-800/80 rounded-lg px-3 py-1.5 flex items-center justify-between gap-3 text-xs font-mono">
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
        <span className="text-amber-300 font-bold text-xs min-w-[70px] text-right">
          T+{Math.round(activeHour)} hrs
        </span>
      </div>

      {/* Main Full-Width SVG Oscilloscope Canvas with Interactive Hover */}
      <div
        ref={containerRef}
        className={`relative rounded-xl overflow-hidden border border-slate-800 bg-[#040812] w-full transition-all duration-300 cursor-crosshair ${
          isExpanded
            ? 'min-h-[620px] md:min-h-[700px] lg:min-h-[760px]'
            : 'min-h-[440px] md:min-h-[480px] lg:min-h-[520px]'
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
            <filter id="telemetryGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="steelGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="telemetryAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={curveColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={curveColor} stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="lotBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.07" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
            </linearGradient>

            {/* Sweep Clip Path */}
            <clipPath id="sweepClipTelemetry">
              <rect
                x={0}
                y={0}
                width={animProgress >= 1 || isUserInspecting ? W : Math.max(padL, tipPoint.x)}
                height={H}
              />
            </clipPath>
          </defs>

          {/* Horizontal Reticle Gridlines & Y-Axis Scale Values */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const y = padT + (H - padT - padB) * (1 - f)
            const val = minY + (maxY - minY) * f
            return (
              <g key={f}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#162238" strokeWidth={0.8} />
                <text
                  x={padL - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[9px] md:text-[10px] font-mono tabular-nums"
                >
                  {val.toFixed(1)} µA
                </text>
              </g>
            )
          })}

          {/* Stage X-axis Vertical Gridlines & Time Markers */}
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
                  y={H - padB + 16}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-mono font-semibold"
                >
                  {h === 216 ? '216h (EOT)' : `T+${h}h`}
                </text>
              </g>
            )
          })}

          {/* Lot Peer Variance Band Envelope (±2σ Peer Envelope) */}
          {stageH >= 24 && (
            <rect
              x={xFor(0)}
              y={yFor(bandHigh)}
              width={xFor(stageH) - xFor(0)}
              height={Math.max(0, yFor(bandLow) - yFor(bandHigh))}
              fill="url(#lotBandGrad)"
              stroke="#FFFFFF"
              strokeOpacity="0.22"
              strokeDasharray="3 3"
            />
          )}

          {/* Static Datasheet Limit Line (Red dashed line at limit_ua) */}
          <line
            x1={padL}
            x2={W - padR}
            y1={yFor(limitVal)}
            y2={yFor(limitVal)}
            stroke="#EF4444"
            strokeWidth={1.8}
            strokeDasharray="6 4"
            style={{ filter: 'drop-shadow(0 0 5px rgba(239,68,68,0.7))' }}
          />
          <text
            x={W - padR}
            y={yFor(limitVal) - 6}
            textAnchor="end"
            className="fill-rose-400 text-[9px] md:text-[10px] font-mono font-bold"
          >
            SPEC LIMIT ({limitVal.toFixed(0)} µA)
          </text>

          {/* Secondary Channel: Lot Norm Baseline Trace (White dashed spline) */}
          {baselineCurve && (
            <path
              d={baselineCurve}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.8}
              filter="url(#steelGlow)"
              strokeDasharray="4 3"
              opacity={0.85}
            />
          )}

          {/* Under-Curve Gradient Fill */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#telemetryAreaGrad)"
              clipPath="url(#sweepClipTelemetry)"
            />
          )}

          {/* Primary Measured Component Current Waveform Spline (Hidden SVG path for length extraction) */}
          {smoothCurve && (
            <path
              ref={pathRef}
              d={smoothCurve}
              fill="none"
              stroke="transparent"
              strokeWidth={1}
            />
          )}

          {/* Visible Spline with Monotone Curvature */}
          {smoothCurve && (
            <path
              d={smoothCurve}
              fill="none"
              stroke={curveColor}
              strokeWidth={2.8}
              filter="url(#telemetryGlow)"
              clipPath="url(#sweepClipTelemetry)"
            />
          )}

          {/* Discrete Milestone Data Points */}
          {shown.map(([h, v]) => {
            const isFuture = h > 168
            const cx = xFor(h)
            const cy = yFor(v)
            return (
              <g key={h}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="#060B16"
                  stroke={isFuture ? '#F59E0B' : curveColor}
                  strokeWidth={2}
                  filter="url(#telemetryGlow)"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={2.5}
                  fill={isFuture ? '#F59E0B' : curveColor}
                />
                <text
                  x={cx}
                  y={cy - 10}
                  textAnchor="middle"
                  fill={isFuture ? '#F59E0B' : curveColor}
                  className="text-[10px] font-mono font-bold"
                >
                  {v.toFixed(2)} µA
                </text>
              </g>
            )
          })}

          {/* Interactive Inspection / Live Probe Crosshair & Laser */}
          {(isSimulating || isUserInspecting) && (
            <g>
              {/* Vertical Laser Crosshair Beam */}
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

              {/* Horizontal Reference Line to Y-Axis */}
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

              {/* Probe Scanner Head */}
              <circle
                cx={activeProbeX}
                cy={activeProbeY}
                r={10}
                fill="none"
                stroke={curveColor}
                strokeWidth={1}
                opacity={0.5}
                className="animate-ping"
              />
              <circle
                cx={activeProbeX}
                cy={activeProbeY}
                r={5}
                fill={curveColor}
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
              <circle
                cx={activeProbeX}
                cy={activeProbeY}
                r={2}
                fill="#FFFFFF"
              />

              {/* Floating Real-Time HUD Chip */}
              <g
                transform={`translate(${Math.min(
                  W - padR - 75,
                  Math.max(padL + 75, activeProbeX)
                )}, ${Math.max(padT + 20, activeProbeY - 24)})`}
              >
                <rect
                  x="-72"
                  y="-14"
                  width="144"
                  height="24"
                  rx="6"
                  fill="#0B1528"
                  stroke={curveColor}
                  strokeWidth="1.4"
                  filter="drop-shadow(0 4px 8px rgba(0,0,0,0.8))"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="10"
                  fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
                  fontWeight="bold"
                >
                  T+{Math.round(activeHour)}h: {activeVal.toFixed(2)} µA
                </text>
              </g>
            </g>
          )}

          {/* Spectrogram Frequency Bars along bottom margin */}
          <g transform={`translate(${padL}, ${H - padB + 20})`}>
            {spectrumBars.map((bh, idx) => {
              const totalAvailW = W - padL - padR
              const bw = Math.max(3.5, totalAvailW / spectrumBars.length - 2)
              const bx = idx * (bw + 2)
              return (
                <rect
                  key={idx}
                  x={bx}
                  y={22 - bh}
                  width={bw}
                  height={bh}
                  fill={isSimulating ? '#10B981' : '#F59E0B'}
                  opacity={0.35 + (bh / 24) * 0.45}
                  rx={1}
                />
              )
            })}
          </g>
        </svg>
      </div>

      {/* Live Reading Telemetry HUD Cards (Dynamically driven by probe or manual scrubber) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
        {/* Card 1: Live Measured Current */}
        <div className="p-2.5 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[10.5px] uppercase font-semibold">Live Probe</span>
          <span className={`font-mono text-base font-bold tabular-nums ${isUserInspecting ? 'text-sky-400' : isSimulating ? 'text-amber-300' : 'text-emerald-400'}`}>
            {activeVal.toFixed(2)} µA
          </span>
          <span className="text-[9.5px] text-slate-400">
            Probe at T+{Math.round(activeHour)}h
          </span>
        </div>

        {/* Card 2: Delta Drift */}
        <div className="p-2.5 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[10.5px] uppercase font-semibold">Delta Drift (vs 0h)</span>
          <span className={`font-mono text-base font-bold tabular-nums ${
            displayedDelta > 5 ? 'text-amber-400' : 'text-slate-100'
          }`}>
            {displayedDelta > 0 ? '+' : ''}{displayedDelta.toFixed(2)} µA
          </span>
          <span className="text-[9.5px] text-slate-400">
            0h baseline: {v0.toFixed(2)} µA
          </span>
        </div>

        {/* Card 3: Lot Z-Score */}
        <div className="p-2.5 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[10.5px] uppercase font-semibold">Lot Z-Score</span>
          <span className={`font-mono text-base font-bold tabular-nums ${
            Math.abs(displayedZ) >= 3 ? 'text-rose-400' : Math.abs(displayedZ) >= 2 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {displayedZ > 0 ? '+' : ''}{displayedZ.toFixed(2)}σ
          </span>
          <span className="text-[9.5px] text-slate-400">
            Lot mean: {lotMean.toFixed(1)} µA
          </span>
        </div>

        {/* Card 4: Spec Margin */}
        <div className="p-2.5 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[10.5px] uppercase font-semibold">Spec Margin</span>
          <span className={`font-mono text-base font-bold tabular-nums ${
            marginToSpec < 0 ? 'text-rose-400' : marginToSpec < 8 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {marginToSpec > 0 ? '+' : ''}{marginToSpec.toFixed(2)} µA
          </span>
          <span className="text-[9.5px] text-slate-400">
            Limit: {limitVal.toFixed(0)} µA
          </span>
        </div>

        {/* Card 5: Drift Slope */}
        <div className="p-2.5 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[10.5px] uppercase font-semibold">Burn-In Drift Rate</span>
          <span className="font-mono text-base font-bold text-amber-300">
            {component.slope.toFixed(4)} µA/h
          </span>
          <span className="text-[9.5px] text-slate-400 truncate">
            {component.drift_trend || 'NOMINAL'}
          </span>
        </div>

        {/* Card 6: +96h Projected Drift */}
        <div className="p-2.5 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[10.5px] uppercase font-semibold">Projected 216h</span>
          <span className={`font-mono text-base font-bold tabular-nums ${
            predFuture > limitVal ? 'text-rose-400' : 'text-slate-100'
          }`}>
            {predFuture.toFixed(2)} µA
          </span>
          <span className={`text-[9.5px] truncate ${
            predFuture > limitVal ? 'text-rose-400 font-bold' : 'text-slate-400'
          }`}>
            {predFuture > limitVal ? 'EXCEEDS LIMIT' : 'Within tolerance'}
          </span>
        </div>
      </div>

      {/* Multi-Channel Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-300 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-5 flex-wrap">
          <span className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-1.5 rounded-full" style={{ backgroundColor: curveColor }} />
            <span className="text-white font-bold">CH1: Measured Current (µA)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-1 bg-white border-t border-dashed border-white" />
            <span className="text-slate-200 font-semibold">CH2: Lot Baseline Mean ({lotMean.toFixed(1)} µA)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-1 bg-rose-500" />
            <span className="text-rose-400 font-semibold">CH3: Datasheet Spec Limit ({limitVal.toFixed(0)} µA)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-1 border-t-2 border-dashed border-amber-400" />
            <span className="text-amber-300 font-bold">Monotone Spline Projection</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>INTERACTION: MOUSE SCRUBBABLE</span>
          <span>&bull;</span>
          <span className="text-emerald-400 font-bold">STRICTLY BOUNDED</span>
        </div>
      </div>
    </div>
  )
}
