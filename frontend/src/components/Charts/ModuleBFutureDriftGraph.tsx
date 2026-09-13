import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { ComponentOut } from '../../types'
import { sounds } from '../../utils/soundEffects'
import { buildMonotoneCubicPath, evaluateMonotoneSpline, type Point2D } from '../../utils/splineUtils'

export interface ModuleBSimData {
  progress: number
  p1: number
  p2: number
  currentH: number
  currentVal: number
  liveVelocity: number
  liveProjection: number
  liveMargin: number
  isSimulating: boolean
}

interface ModuleBFutureDriftGraphProps {
  component: ComponentOut | null
  onSimUpdate?: (data: ModuleBSimData) => void
}

export default function ModuleBFutureDriftGraph({ component, onSimUpdate }: ModuleBFutureDriftGraphProps) {
  const [activeHorizon, setActiveHorizon] = useState<216 | 264 | 336>(264)
  const [animProgress, setAnimProgress] = useState<number>(0)
  const [isSimulating, setIsSimulating] = useState<boolean>(true)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [isLooping, setIsLooping] = useState<boolean>(true)
  const [simSpeed, setSimSpeed] = useState<0.5 | 1 | 2>(0.5)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  // Interactive mouse scrubbing & inspection state
  const [isHovering, setIsHovering] = useState<boolean>(false)
  const [hoverData, setHoverData] = useState<{
    hour: number
    val: number
    x: number
    y: number
    label: string
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [chartDims, setChartDims] = useState<{ width: number; height: number }>({ width: 880, height: 420 })

  const measuredPathRef = useRef<SVGPathElement>(null)
  const [measuredLen, setMeasuredLen] = useState<number>(600)
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

  const limitVal = component?.limit_ua || 50
  const v0 = component?.v0 ?? 10
  const v24 = component?.v24 ?? 10.2
  const v96 = component?.v96 ?? (v0 + (v24 - v0) * 4)
  const v168 = component?.v168 ?? 11.4
  const slope = component?.slope || (v168 - v0) / 168
  const future264 = component?.predicted_future || v168 + slope * 96

  // Projected value at horizon
  const projectedAtHorizon = useMemo(() => {
    const deltaH = activeHorizon - 168
    return v168 + slope * deltaH
  }, [v168, slope, activeHorizon])

  // Calculate breach hour if slope > 0
  const breachHour = useMemo(() => {
    if (slope <= 0) return null
    const h = 168 + (limitVal - v168) / slope
    return h > 0 && h <= 500 ? h : null
  }, [slope, limitVal, v168])

  // Base simulation duration (8500ms at 1x; 17000ms at 0.5x slow inspection; 4250ms at 2x)
  const simSpeedRef = useRef<number>(simSpeed)
  simSpeedRef.current = simSpeed

  const isLoopingRef = useRef<boolean>(isLooping)
  isLoopingRef.current = isLooping

  const lastPingHourRef = useRef<number>(-1)

  const getDuration = useCallback((spd: number) => {
    return 8500 / spd
  }, [])

  const startSimulation = useCallback((resetOffset = true) => {
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

      // Audio milestone ping when passing into in-flight zone (168h)
      if (p >= 0.45 && lastPingHourRef.current < 168) {
        lastPingHourRef.current = 168
        sounds.playPing()
      }

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }, [getDuration])

  const togglePause = useCallback(() => {
    sounds.playClick()
    if (isPaused) {
      startSimulation(false)
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setIsPaused(true)
    }
  }, [isPaused, startSimulation])

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
      startSimulation(false)
    }
  }, [animProgress, isPaused, isSimulating, getDuration, startSimulation])

  // Auto-trigger simulation only when component changes
  useEffect(() => {
    if (component?.component_id) {
      startSimulation(true)
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [component?.component_id, startSimulation])

  // Measure ground measured path length
  useEffect(() => {
    if (measuredPathRef.current) {
      const len = measuredPathRef.current.getTotalLength()
      if (len > 0 && Math.abs(len - measuredLen) > 1) {
        setMeasuredLen(len)
      }
    }
  }, [component, measuredLen])

  // Uncertainty cone variance
  const lotStd = component?.lot_std || 1.8
  const coneSpread = Math.max(2.5, lotStd * 1.6)
  const coneUpper = projectedAtHorizon + coneSpread
  const coneLower = Math.max(0, projectedAtHorizon - coneSpread)

  // Bounds for Y with safety margin
  const maxVal = Math.max(limitVal * 1.15, v0, v24, v96, v168, future264, coneUpper) * 1.05
  const minVal = Math.max(0, Math.min(v0, v24, v96, v168, coneLower) * 0.8)

  // Max X is active horizon
  const maxX = Math.max(activeHorizon, breachHour && breachHour <= 336 ? breachHour + 20 : 280)

  const toX = useCallback(
    (hour: number) => padL + (Math.max(0, Math.min(maxX, hour)) / maxX) * (W - padL - padR),
    [maxX, padL, padR, W]
  )
  const toY = useCallback(
    (val: number) => {
      const clamped = Math.max(minVal, Math.min(maxVal, val))
      return H - padB - ((clamped - minVal) / (maxVal - minVal || 1)) * (H - padT - padB)
    },
    [maxVal, minVal, H, padB, padT]
  )

  // Y-ticks
  const yTicks = useMemo(() => {
    const ticks = [0, 10, 20, 30, 40, 50].filter((v) => v >= minVal && v <= maxVal)
    if (!ticks.includes(limitVal)) ticks.push(limitVal)
    ticks.sort((a, b) => a - b)
    return ticks
  }, [minVal, maxVal, limitVal])

  // Measured ground points
  const measuredPoints = useMemo(
    () => [
      { h: 0, v: v0, label: '0h Initial' },
      { h: 24, v: v24, label: '24h Early' },
      { h: 96, v: v96, label: '96h Mid-HTOL' },
      { h: 168, v: v168, label: '168h Burn-in' },
    ],
    [v0, v24, v96, v168]
  )

  const measuredSplinePoints: Point2D[] = useMemo(
    () => measuredPoints.map((p) => ({ x: toX(p.h), y: toY(p.v) })),
    [measuredPoints, toX, toY]
  )

  // Monotone Cubic Spline for past burn-in data
  const measuredPathD = useMemo(
    () => buildMonotoneCubicPath(measuredSplinePoints),
    [measuredSplinePoints]
  )

  // Simulation Phase Calculations
  const p1 = Math.min(1, animProgress / 0.45)
  const p2 = animProgress <= 0.45 ? 0 : (animProgress - 0.45) / 0.55

  // Dynamic In-Flight extrapolation hour & value
  const currentExtrapH = 168 + p2 * (activeHorizon - 168)
  const currentExtrapVal = v168 + slope * (p2 * (activeHorizon - 168))

  // Dynamic extrapolation path
  const extrapPathD = useMemo(() => {
    if (p2 <= 0) return ''
    return `M ${toX(168).toFixed(1)} ${toY(v168).toFixed(1)} L ${toX(currentExtrapH).toFixed(1)} ${toY(
      currentExtrapVal
    ).toFixed(1)}`
  }, [p2, toX, toY, v168, currentExtrapH, currentExtrapVal])

  // Early prediction checkpoint (0-24h projection to 168h)
  const early168 = component?.predicted168_from_early ?? (v24 + (v24 - v0) * 6)
  const earlyPredPathD = useMemo(
    () => `M ${toX(24).toFixed(1)} ${toY(v24).toFixed(1)} L ${toX(168).toFixed(1)} ${toY(early168).toFixed(1)}`,
    [toX, toY, v24, early168]
  )

  // Shaded variance cone polygon dynamically expanding with p2
  const currentSpread = coneSpread * (isHovering ? 1 : p2)
  const coneTargetH = isHovering ? activeHorizon : currentExtrapH
  const coneTargetVal = isHovering ? projectedAtHorizon : currentExtrapVal
  const currentUpper = coneTargetVal + currentSpread
  const currentLower = Math.max(0, coneTargetVal - currentSpread)

  const conePolygonD = useMemo(() => {
    if (p2 <= 0.05 && !isHovering) return ''
    return (
      `M ${toX(168).toFixed(1)} ${toY(v168).toFixed(1)} ` +
      `L ${toX(coneTargetH).toFixed(1)} ${toY(currentUpper).toFixed(1)} ` +
      `L ${toX(coneTargetH).toFixed(1)} ${toY(currentLower).toFixed(1)} Z`
    )
  }, [p2, isHovering, toX, toY, v168, coneTargetH, currentUpper, currentLower])

  const willBreach = component?.future_limit_breach || projectedAtHorizon >= limitVal
  const marginFuture = component?.margin_future ?? (limitVal - projectedAtHorizon)
  const predError = component?.prediction_error_168 ?? Math.abs(v168 - early168)

  // Live interpolated metric card values synchronized with sweep
  const liveDriftVelocity = slope * 1000
  const liveProjection = isHovering && hoverData ? hoverData.val : animProgress >= 1 ? projectedAtHorizon : currentExtrapVal
  const liveMargin = limitVal - liveProjection

  // Interactive mouse scrubbing handler
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const clientX = e.clientX - rect.left
    const svgX = (clientX / rect.width) * W

    const clampedX = Math.max(padL, Math.min(W - padR, svgX))
    const hour = ((clampedX - padL) / (W - padL - padR)) * maxX
    const clampedH = Math.min(activeHorizon, Math.max(0, hour))

    let val = v0
    let label = ''

    if (clampedH <= 168) {
      val = evaluateMonotoneSpline(measuredSplinePoints, clampedX)
      label = `Ground Burn-In (T+${Math.round(clampedH)}h)`
    } else {
      val = v168 + slope * (clampedH - 168)
      label = `In-Flight Forecast (+${Math.round(clampedH - 168)}h)`
    }

    const clampedY = toY(val)

    setIsHovering(true)
    setHoverData({
      hour: clampedH,
      val: Math.max(minVal, Math.min(maxVal, val)),
      x: clampedX,
      y: clampedY,
      label,
    })
  }

  const handleSvgMouseLeave = () => {
    setIsHovering(false)
    setHoverData(null)
  }

  const handleScrubberChange = (newHour: number) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setIsPaused(true)

    const clampedH = Math.min(activeHorizon, Math.max(0, newHour))
    const clampedX = toX(clampedH)
    let val = v0
    let label = ''

    if (clampedH <= 168) {
      val = evaluateMonotoneSpline(measuredSplinePoints, clampedX)
      label = `Ground Burn-In (T+${Math.round(clampedH)}h)`
    } else {
      val = v168 + slope * (clampedH - 168)
      label = `In-Flight Forecast (+${Math.round(clampedH - 168)}h)`
    }

    const clampedY = toY(val)

    let newProgress = 0
    if (clampedH <= 168) {
      newProgress = (clampedH / 168) * 0.45
    } else {
      newProgress = 0.45 + ((clampedH - 168) / (activeHorizon - 168)) * 0.55
    }
    setAnimProgress(newProgress)
    const duration = getDuration(simSpeedRef.current)
    elapsedOffsetRef.current = newProgress * duration
    startTimeRef.current = performance.now() - elapsedOffsetRef.current

    setIsHovering(true)
    setHoverData({
      hour: clampedH,
      val: Math.max(minVal, Math.min(maxVal, val)),
      x: clampedX,
      y: clampedY,
      label,
    })
  }

  // Probe Tip in Phase 1 vs Phase 2
  const probeTip = useMemo(() => {
    if (animProgress <= 0.45) {
      const curH = p1 * 168
      const curX = toX(curH)
      const curV = evaluateMonotoneSpline(measuredSplinePoints, curX)
      return { x: curX, y: toY(curV), h: curH, v: curV, isExtrap: false }
    } else {
      return {
        x: toX(currentExtrapH),
        y: toY(currentExtrapVal),
        h: currentExtrapH,
        v: currentExtrapVal,
        isExtrap: true,
      }
    }
  }, [animProgress, p1, measuredSplinePoints, currentExtrapH, currentExtrapVal, toX, toY])

  // Active Coordinates
  const isUserInspecting = isHovering && hoverData !== null
  const activeHour = isUserInspecting ? hoverData.hour : isSimulating ? probeTip.h : activeHorizon
  const activeVal = isUserInspecting ? hoverData.val : isSimulating ? probeTip.v : projectedAtHorizon
  const activeProbeX = isUserInspecting ? hoverData.x : probeTip.x
  const activeProbeY = isUserInspecting ? hoverData.y : probeTip.y

  // Notify parent dashboard
  useEffect(() => {
    if (onSimUpdate) {
      onSimUpdate({
        progress: animProgress,
        p1,
        p2,
        currentH: activeHour,
        currentVal: activeVal,
        liveVelocity: liveDriftVelocity,
        liveProjection,
        liveMargin,
        isSimulating,
      })
    }
  }, [animProgress, p1, p2, activeHour, activeVal, liveDriftVelocity, liveProjection, liveMargin, isSimulating, onSimUpdate])

  if (!component) {
    return (
      <div className="bg-[#070E1C] border border-slate-800/90 rounded-xl p-3 flex flex-col gap-2 relative shadow-lg select-none flex-1 h-full w-full min-h-[400px]">
        <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
          <span className="font-display font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            MODULE B &bull; IN-FLIGHT DRIFT FORECASTING
          </span>
          <span className="text-[10px] text-slate-400 font-mono">MODEL: POLYNOMIAL EXTENSION</span>
        </div>
        <div className="flex-1 min-h-[360px] flex items-center justify-center rounded-lg border border-slate-800/80 bg-[#050B16] text-slate-400 text-xs font-mono">
          [ SELECT COMPONENT OR LOAD BATCH TO DISPLAY IN-FLIGHT DRIFT FORECAST ]
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#070E1C] border border-slate-800/90 rounded-xl p-3 flex flex-col gap-2.5 relative shadow-lg select-none flex-1 h-full w-full min-h-[400px]">
      {/* Top Header & Extrapolation Horizon Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-amber-400 flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <span className={`w-2 h-2 rounded-full ${willBreach ? 'bg-rose-500 led' : 'bg-amber-400 led'}`} />
            MODULE B &bull; IN-FLIGHT DRIFT FORECASTING
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
              willBreach
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {willBreach ? 'BREACH PREDICTED' : 'NOMINAL DRIFT'}
          </span>
        </div>

        {/* Live Simulation status, Speed Selector & Horizon Buttons */}
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
              title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
            >
              <span className={`w-2 h-2 rounded-full ${!isPaused && isSimulating ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span>{isPaused ? '▶ RESUME' : '⏸ PAUSE'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsHovering(false)
                setHoverData(null)
                startSimulation(true)
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm"
              title="Replay in-flight drift simulation from 0h"
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
              title={isLooping ? 'Auto-loop active: sweeps continuously' : 'Loop disabled: stops at horizon'}
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

            <span className="text-[9.5px] font-mono font-bold text-amber-400 px-1 whitespace-nowrap">
              {isUserInspecting
                ? activeHour > 168
                  ? `[FORECAST +${Math.round(activeHour - 168)}h]`
                  : `[GROUND ${Math.round(activeHour)}h]`
                : isPaused
                ? '[PAUSED]'
                : p2 > 0
                ? `[+${Math.round(currentExtrapH - 168)}h]`
                : `[${Math.round(probeTip.h)}h]`}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#050914] p-1 rounded-lg border border-slate-800 font-mono text-[11px]">
            <span className="text-slate-400 px-1 uppercase text-[10px] font-bold">HORIZON:</span>
            {([216, 264, 336] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  sounds.playClick()
                  setActiveHorizon(h)
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  activeHorizon === h
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/60 font-bold shadow-isro'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                +{h - 168}h ({h}h)
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
            title={isExpanded ? 'Restore Standard Height' : 'Expand Forecast Canvas'}
          >
            <span>{isExpanded ? '⤡ RESTORE' : '⤢ EXPAND'}</span>
          </button>
        </div>
      </div>

      {/* Manual Timeline Scrubber */}
      <div className="bg-[#070D1A] border border-slate-800/80 rounded-lg px-3 py-1 flex items-center justify-between gap-3 text-xs font-mono">
        <span className="text-slate-400 whitespace-nowrap text-[11px] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          FORECAST SCRUBBER:
        </span>
        <input
          type="range"
          min={0}
          max={activeHorizon}
          step={1}
          value={Math.round(activeHour)}
          onChange={(e) => handleScrubberChange(parseFloat(e.target.value))}
          className="flex-1 accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          title="Drag slider to inspect in-flight drift forecast at any hour"
        />
        <span className="text-amber-300 font-bold text-xs min-w-[85px] text-right">
          {activeHour > 168 ? `+${Math.round(activeHour - 168)}h (${Math.round(activeHour)}h)` : `T+${Math.round(activeHour)}h`}
        </span>
      </div>

      {/* SVG Canvas Container */}
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
            <linearGradient id="coneGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.15" />
              <stop offset="100%" stopColor={willBreach ? '#ef4444' : '#f59e0b'} stopOpacity="0.25" />
            </linearGradient>

            <clipPath id="groundClip">
              <rect x={0} y={0} width={isUserInspecting ? W : toX(168)} height={H} />
            </clipPath>
          </defs>

          {/* Shaded Flight Region Background (168h -> maxX) */}
          <rect
            x={toX(168)}
            y={padT}
            width={W - padR - toX(168)}
            height={H - padT - padB}
            fill="#0b1528"
            opacity={0.5}
          />
          <text
            x={toX(168) + 8}
            y={padT + 14}
            fill="#ffffff"
            fontSize="8"
            fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
            fontWeight="bold"
            letterSpacing="0.08em"
            opacity={0.8}
          >
            IN-FLIGHT PROJECTION ZONE (+{activeHorizon - 168}H)
          </text>

          {/* Y Axis Grid Lines & Ticks */}
          {yTicks.map((yVal) => {
            const yPos = toY(yVal)
            return (
              <g key={yVal}>
                <line
                  x1={padL}
                  y1={yPos}
                  x2={W - padR}
                  y2={yPos}
                  stroke={yVal === limitVal ? '#ef4444' : '#162238'}
                  strokeDasharray={yVal === limitVal ? '4 3' : undefined}
                  strokeWidth={yVal === limitVal ? 1.2 : 0.6}
                  strokeOpacity={yVal === limitVal ? 0.9 : 0.8}
                />
                <text
                  x={padL - 6}
                  y={yPos + 3}
                  textAnchor="end"
                  fill={yVal === limitVal ? '#ef4444' : '#64748b'}
                  fontSize="9"
                  fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
                  fontWeight={yVal === limitVal ? 'bold' : 'normal'}
                >
                  {yVal.toFixed(0)}
                </text>
              </g>
            )
          })}

          {/* X Axis Time Marks */}
          {[0, 24, 96, 168, activeHorizon].map((h) => {
            const xPos = toX(h)
            return (
              <g key={h}>
                <line
                  x1={xPos}
                  y1={padT}
                  x2={xPos}
                  y2={H - padB}
                  stroke={h === 168 ? '#ffffff' : h === activeHorizon ? '#f59e0b' : '#162238'}
                  strokeDasharray={h >= 168 ? '3 3' : undefined}
                  strokeWidth={h >= 168 ? 1 : 0.5}
                  strokeOpacity={h >= 168 ? 0.7 : 0.5}
                />
                <text
                  x={xPos}
                  y={H - padB + 14}
                  textAnchor="middle"
                  fill={h === 168 ? '#ffffff' : h === activeHorizon ? '#f59e0b' : '#64748b'}
                  fontSize="9"
                  fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
                  fontWeight={h >= 168 ? 'bold' : 'normal'}
                >
                  {h}h
                </text>
              </g>
            )
          })}

          {/* 168H Ground Completion Marker */}
          <text
            x={toX(168)}
            y={H - padB + 26}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="7.5"
            fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
          >
            ▲ HTOL END
          </text>

          {/* Datasheet Limit Badge */}
          <g transform={`translate(${W - padR - 105}, ${toY(limitVal) - 9})`}>
            <rect width="102" height="15" rx="3" fill="#881337" opacity="0.8" />
            <text x="51" y="10.5" textAnchor="middle" fill="#fda4af" fontSize="8" fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif" fontWeight="bold">
              SPEC LIMIT {limitVal.toFixed(1)} µA
            </text>
          </g>

          {/* Dynamic Predictive Uncertainty Cone */}
          {conePolygonD && <path d={conePolygonD} fill="url(#coneGrad)" />}

          {/* Early Prediction Checkpoint Trace (24h -> 168h projection) */}
          <path
            d={earlyPredPathD}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity={0.6}
          />

          {/* Measured Past Telemetry Line (Monotone Cubic Spline) */}
          <path
            ref={measuredPathRef}
            d={measuredPathD}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Future Extrapolation Line (168h -> Horizon) */}
          {(extrapPathD || isUserInspecting) && (
            <line
              x1={toX(168)}
              y1={toY(v168)}
              x2={toX(activeHorizon)}
              y2={toY(projectedAtHorizon)}
              stroke={willBreach ? '#ef4444' : '#f59e0b'}
              strokeWidth={2.2}
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}

          {/* Nodes for Measured Points */}
          {measuredPoints.map((p) => {
            const cx = toX(p.h)
            const cy = toY(p.v)
            return (
              <g key={p.h}>
                <circle cx={cx} cy={cy} r="4" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx={cx} cy={cy} r="1.5" fill="#ffffff" />
              </g>
            )
          })}

          {/* Future Projection Node at Horizon */}
          <g>
            {willBreach && (
              <circle
                cx={toX(activeHorizon)}
                cy={toY(projectedAtHorizon)}
                r="10"
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.5"
                className="animate-ping"
                opacity={0.6}
              />
            )}
            <circle
              cx={toX(activeHorizon)}
              cy={toY(projectedAtHorizon)}
              r="5"
              fill={willBreach ? '#be123c' : '#d97706'}
              stroke={willBreach ? '#fda4af' : '#fde68a'}
              strokeWidth="2"
            />
            <circle cx={toX(activeHorizon)} cy={toY(projectedAtHorizon)} r="2" fill="#ffffff" />
          </g>

          {/* Crosshair Laser & Telemetry Probe (Interactive or Auto-simulating) */}
          {(isSimulating || isUserInspecting || isPaused) && (
            <g>
              <line
                x1={activeProbeX}
                x2={activeProbeX}
                y1={padT}
                y2={H - padB}
                stroke={activeHour > 168 ? '#f59e0b' : '#38bdf8'}
                strokeWidth={1.4}
                strokeDasharray="3 2"
                opacity={0.8}
              />
              <line
                x1={padL}
                x2={activeProbeX}
                y1={activeProbeY}
                y2={activeProbeY}
                stroke={activeHour > 168 ? '#f59e0b' : '#38bdf8'}
                strokeWidth={0.8}
                strokeDasharray="2 2"
                opacity={0.5}
              />
              <circle
                cx={activeProbeX}
                cy={activeProbeY}
                r={9}
                fill={activeHour > 168 ? '#f59e0b' : '#ffffff'}
                opacity={0.35}
              />
              <circle
                cx={activeProbeX}
                cy={activeProbeY}
                r={4.5}
                fill={activeHour > 168 ? '#f59e0b' : '#38bdf8'}
                stroke="#ffffff"
                strokeWidth={1.5}
              />

              {/* Floating Tooltip Chip */}
              <g
                transform={`translate(${Math.min(
                  W - padR - 70,
                  Math.max(padL + 70, activeProbeX)
                )}, ${Math.max(padT + 18, activeProbeY - 22)})`}
              >
                <rect
                  x="-65"
                  y="-13"
                  width="130"
                  height="22"
                  rx="5"
                  fill="#0B1528"
                  stroke={activeHour > 168 ? '#f59e0b' : '#38bdf8'}
                  strokeWidth="1.2"
                  filter="drop-shadow(0 3px 6px rgba(0,0,0,0.8))"
                />
                <text
                  x="0"
                  y="2.5"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
                  fontWeight="bold"
                >
                  {activeHour > 168
                    ? `+${Math.round(activeHour - 168)}h: ${activeVal.toFixed(2)} µA`
                    : `T+${Math.round(activeHour)}h: ${activeVal.toFixed(2)} µA`}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Module B Live Metric HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
        <div className="p-2 rounded-lg bg-[#050A14] border border-slate-800 flex flex-col">
          <span className="text-slate-400 text-[10px] uppercase">Drift Velocity</span>
          <span className="text-amber-300 text-sm font-bold tabular-nums">
            {liveDriftVelocity.toFixed(1)} nA/h
          </span>
          <span className="text-[9px] text-slate-500">Arrhenius kinetic rate</span>
        </div>

        <div className="p-2 rounded-lg bg-[#050A14] border border-slate-800 flex flex-col">
          <span className="text-slate-400 text-[10px] uppercase">Forecast (+{activeHorizon - 168}h)</span>
          <span className={`text-sm font-bold tabular-nums ${liveProjection >= limitVal ? 'text-rose-400' : 'text-slate-200'}`}>
            {liveProjection.toFixed(2)} µA
          </span>
          <span className="text-[9px] text-slate-500">at T+{activeHorizon}h</span>
        </div>

        <div className="p-2 rounded-lg bg-[#050A14] border border-slate-800 flex flex-col">
          <span className="text-slate-400 text-[10px] uppercase">Flight Margin</span>
          <span className={`text-sm font-bold tabular-nums ${liveMargin < 0 ? 'text-rose-400' : liveMargin < 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {liveMargin > 0 ? '+' : ''}{liveMargin.toFixed(1)} µA
          </span>
          <span className="text-[9px] text-slate-500">Limit: {limitVal} µA</span>
        </div>

        <div className="p-2 rounded-lg bg-[#050A14] border border-slate-800 flex flex-col">
          <span className="text-slate-400 text-[10px] uppercase">Breach Horizon</span>
          <span className={`text-sm font-bold tabular-nums ${breachHour && breachHour < 1000 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {breachHour && breachHour < 1000 ? `T+${Math.round(breachHour)}h` : '> 10k hrs'}
          </span>
          <span className="text-[9px] text-slate-500">{breachHour ? 'Projected limit breach' : 'Nominal lifetime'}</span>
        </div>
      </div>
    </div>
  )
}
