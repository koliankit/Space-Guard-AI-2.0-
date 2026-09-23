import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { ComponentOut } from '../../types'
import { sounds } from '../../utils/soundEffects'
import { createMonotoneCubicPath } from '../../utils/spline'

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
  const [zoomMode, setZoomMode] = useState<'focus' | 'full'>('focus')
  const [activeHorizon, setActiveHorizon] = useState<216 | 264 | 336>(264)
  const [hoveredPoint, setHoveredPoint] = useState<{ hour: number; val: number; label: string } | null>(null)
  const [animProgress, setAnimProgress] = useState<number>(1)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [simSpeed, setSimSpeed] = useState<0.5 | 1 | 2>(1) // 0.5x (17s), 1x (8.5s slow), 2x (4.2s)
  const [manualInspectHour, setManualInspectHour] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const [chartDims, setChartDims] = useState<{ width: number; height: number }>({ width: 880, height: 380 })

  const measuredPathRef = useRef<SVGPathElement>(null)
  const [measuredLen, setMeasuredLen] = useState<number>(800)
  const animFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const elapsedOffsetRef = useRef<number>(0)
  const hasPinged168Ref = useRef<boolean>(false)
  const hasPingedHorizonRef = useRef<boolean>(false)

  // Measure container dimensions dynamically to fill full remaining space edge-to-edge
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateSize = () => {
      const w = el.clientWidth || el.getBoundingClientRect().width
      const h = el.clientHeight || el.getBoundingClientRect().height
      if (w > 0 && h > 0) {
        setChartDims({
          width: Math.round(w),
          height: Math.round(Math.max(340, h)),
        })
      }
    }
    updateSize()
    const timer = setTimeout(updateSize, 40)

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect
        const w = Math.round(cr.width || el.clientWidth)
        const h = Math.round(Math.max(340, cr.height || el.clientHeight))
        if (w > 0 && h > 0) {
          setChartDims((prev) => {
            if (Math.abs(prev.width - w) < 3 && Math.abs(prev.height - h) < 3) {
              return prev
            }
            return { width: w, height: h }
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
  }, [])

  const W = Math.max(280, chartDims.width)
  const H = Math.max(340, chartDims.height)
  const padL = 50
  const padR = 24
  const padT = 24
  const padB = 44

  const limitVal = component?.limit_ua || 50
  const v0 = component?.v0 ?? 10
  const v24 = component?.v24 ?? 10.2
  const v96 = component?.v96 ?? (v0 + (v24 - v0) * 4)
  const v168 = component?.v168 ?? 11.4
  const slope = component?.slope || (v168 - v0) / 168
  const future264 = component?.predicted_future || v168 + slope * 96

  // Projected value at horizon (Hook called unconditionally)
  const projectedAtHorizon = useMemo(() => {
    const deltaH = activeHorizon - 168
    return v168 + slope * deltaH
  }, [v168, slope, activeHorizon])

  // Calculate breach hour if slope > 0 (Hook called unconditionally)
  const breachHour = useMemo(() => {
    if (slope <= 0) return null
    const h = 168 + (limitVal - v168) / slope
    return h > 0 && h <= 500 ? h : null
  }, [slope, limitVal, v168])

  // Base simulation duration: 8500ms (Very slow and deliberate for clear observation)
  const baseDuration = 8500 / simSpeed

  // Start two-phase live telemetry simulation
  const startSimulation = useCallback((resetOffset = true) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setIsSimulating(true)
    setIsPaused(false)
    if (resetOffset) {
      setAnimProgress(0)
      elapsedOffsetRef.current = 0
      hasPinged168Ref.current = false
      hasPingedHorizonRef.current = false
    }
    sounds.playClick()
    startTimeRef.current = performance.now() - elapsedOffsetRef.current

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current
      elapsedOffsetRef.current = elapsed
      const rawP = Math.min(1, elapsed / baseDuration)
      // Smooth linear pacing for steady flight tracking
      const easeP = rawP < 0.15 ? 2.5 * rawP * rawP : rawP > 0.85 ? 1 - 2.5 * Math.pow(1 - rawP, 2) : rawP
      setAnimProgress(easeP)

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
      startSimulation(false)
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setIsPaused(true)
    }
  }, [isPaused, startSimulation])

  // Ensure full forecast and points are visible immediately when component changes
  useEffect(() => {
    setAnimProgress(1)
    setIsSimulating(false)
    setIsPaused(false)
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [component?.component_id, activeHorizon])

  // Piecewise value interpolation along curve and projection zone for manual checking
  const getValAtHourB = useCallback(
    (h: number) => {
      if (h <= 24) {
        return v0 + ((v24 - v0) / 24) * h
      } else if (h <= 96) {
        return v24 + ((v96 - v24) / 72) * (h - 24)
      } else if (h <= 168) {
        return v96 + ((v168 - v96) / 72) * (h - 96)
      } else {
        return v168 + slope * (h - 168)
      }
    },
    [v0, v24, v96, v168, slope]
  )

  // Uncertainty cone variance (+/- 1.5 sigma drift model)
  const lotStd = component?.lot_std || 1.8
  const coneSpread = Math.max(2.5, lotStd * 1.6)
  const coneUpper = projectedAtHorizon + coneSpread
  const coneLower = Math.max(0, projectedAtHorizon - coneSpread)

  // Bounds for Y
  const fullMaxVal = Math.max(limitVal * 1.12, v0, v24, v96, v168, future264, coneUpper)
  const fullMinVal = Math.max(0, Math.min(v0, v24, v96, v168, coneLower) * 0.85)

  const dataMinB = Math.min(v0, v24, v96, v168, coneLower)
  const dataMaxB = Math.max(v0, v24, v96, v168, future264, coneUpper)
  const marginB = Math.max(0.8, (dataMaxB - dataMinB) * 0.28)
  const focusMinVal = Math.max(0, Math.floor((dataMinB - marginB) * 10) / 10)
  const focusMaxVal = Math.ceil((dataMaxB + marginB) * 10) / 10

  const minVal = zoomMode === 'focus' ? focusMinVal : fullMinVal
  const maxVal = zoomMode === 'focus' ? focusMaxVal : fullMaxVal

  // Max X is active horizon (e.g. 264h or 336h)
  const maxX = Math.max(activeHorizon, breachHour && breachHour <= 336 ? breachHour + 20 : 280)

  const toX = useCallback(
    (hour: number) => padL + (hour / maxX) * (W - padL - padR),
    [maxX, padL, padR, W]
  )
  const toY = useCallback(
    (val: number) => {
      const range = maxVal - minVal || 1
      return H - padB - ((val - minVal) / range) * (H - padT - padB)
    },
    [maxVal, minVal, H, padB, padT]
  )

  // Y-ticks
  const yTicks = useMemo(() => {
    if (zoomMode === 'focus') {
      const step = (maxVal - minVal) / 4
      return [0, 1, 2, 3, 4].map((i) => Math.round((minVal + i * step) * 10) / 10)
    }
    const ticks = [0, 10, 20, 30, 40, 50].filter((v) => v >= minVal && v <= maxVal)
    if (!ticks.includes(limitVal)) ticks.push(limitVal)
    ticks.sort((a, b) => a - b)
    return ticks
  }, [minVal, maxVal, limitVal, zoomMode])

  // Measured points (0h, 24h, 96h, 168h)
  const measuredPoints = useMemo(
    () => [
      { h: 0, v: v0, label: '0h Initial' },
      { h: 24, v: v24, label: '24h Early' },
      { h: 96, v: v96, label: '96h Mid-HTOL' },
      { h: 168, v: v168, label: '168h Burn-in' },
    ],
    [v0, v24, v96, v168]
  )

  const measuredPathD = useMemo(() => {
    const pts = measuredPoints.map((p) => ({ x: toX(p.h), y: toY(p.v) }))
    return createMonotoneCubicPath(pts)
  }, [measuredPoints, toX, toY])

  // Measure ground measured path length whenever path geometry updates
  useEffect(() => {
    if (measuredPathRef.current) {
      try {
        const len = measuredPathRef.current.getTotalLength()
        if (len > 0 && Math.abs(len - measuredLen) > 1) {
          setMeasuredLen(len)
        }
      } catch {
        // ignore
      }
    }
  }, [measuredPathD, W, H, measuredLen])

  // Simulation Phase Calculations
  // Phase 1 (0 -> 0.45): Ground Burn-in sweep (0h -> 168h)
  // Phase 2 (0.45 -> 1.0): In-Flight Extrapolation & Cone Expansion (168h -> activeHorizon)
  const p1 = Math.min(1, animProgress / 0.45)
  const p2 = animProgress <= 0.45 ? 0 : (animProgress - 0.45) / 0.55

  // Trigger audio milestone pings inside useEffect
  useEffect(() => {
    if (!isSimulating) return
    if (p1 >= 1 && !hasPinged168Ref.current) {
      hasPinged168Ref.current = true
      sounds.playPing()
    }
    if (p2 >= 0.98 && !hasPingedHorizonRef.current) {
      hasPingedHorizonRef.current = true
      sounds.playPing()
    }
  }, [p1, p2, isSimulating])

  // In-Flight extrapolation target hour & value
  const currentExtrapH = 168 + p2 * (activeHorizon - 168)
  const currentExtrapVal = v168 + slope * (p2 * (activeHorizon - 168))
  const targetExtrapH = isSimulating && animProgress < 1 ? currentExtrapH : activeHorizon
  const targetExtrapVal = isSimulating && animProgress < 1 ? currentExtrapVal : projectedAtHorizon
  const targetSpread = isSimulating && animProgress < 1 ? coneSpread * p2 : coneSpread

  // Dynamic extrapolation path (solid & complete when static/paused or sweeping in phase 2)
  const extrapPathD = useMemo(() => {
    if (isSimulating && p2 <= 0) return ''
    return `M ${toX(168).toFixed(1)} ${toY(v168).toFixed(1)} L ${toX(targetExtrapH).toFixed(1)} ${toY(
      targetExtrapVal
    ).toFixed(1)}`
  }, [isSimulating, p2, toX, toY, v168, targetExtrapH, targetExtrapVal])

  // Early prediction checkpoint (0-24h projection to 168h)
  const early168 = component?.predicted168_from_early ?? (v24 + (v24 - v0) * 6)
  const earlyPredPathD = useMemo(
    () => `M ${toX(24).toFixed(1)} ${toY(v24).toFixed(1)} L ${toX(168).toFixed(1)} ${toY(early168).toFixed(1)}`,
    [toX, toY, v24, early168]
  )

  // Shaded variance cone polygon dynamically expanding with p2 or fully rendered when static
  const conePolygonD = useMemo(() => {
    if (isSimulating && p2 <= 0.05) return ''
    const upper = targetExtrapVal + targetSpread
    const lower = Math.max(0, targetExtrapVal - targetSpread)
    return (
      `M ${toX(168).toFixed(1)} ${toY(v168).toFixed(1)} ` +
      `L ${toX(targetExtrapH).toFixed(1)} ${toY(upper).toFixed(1)} ` +
      `L ${toX(targetExtrapH).toFixed(1)} ${toY(lower).toFixed(1)} Z`
    )
  }, [isSimulating, p2, toX, toY, v168, targetExtrapH, targetExtrapVal, targetSpread])

  const willBreach = component?.future_limit_breach || projectedAtHorizon >= limitVal
  const marginFuture = component?.margin_future ?? (limitVal - projectedAtHorizon)
  const predError = component?.prediction_error_168 ?? Math.abs(v168 - early168)

  // Live interpolated metric card values synchronized with sweep
  const liveDriftVelocity = animProgress >= 1 ? slope * 1000 : (slope * 1000) * Math.min(1, p1 * 1.2)
  const livePredError = animProgress >= 1 ? predError : predError * Math.min(1, p1 * 1.5)
  const liveProjection = animProgress >= 1 ? projectedAtHorizon : v168 + (projectedAtHorizon - v168) * p2
  const liveMargin =
    animProgress >= 1
      ? marginFuture
      : (limitVal - v168) + (marginFuture - (limitVal - v168)) * p2

  // Probe Tip in Phase 1 vs Phase 2
  const probeTip = useMemo(() => {
    if (animProgress <= 0.45) {
      const curH = p1 * 168
      const curV =
        curH <= 24
          ? v0 + ((v24 - v0) / 24) * curH
          : curH <= 96
          ? v24 + ((v96 - v24) / 72) * (curH - 24)
          : v96 + ((v168 - v96) / 72) * (curH - 96)
      return { x: toX(curH), y: toY(curV), h: curH, v: curV, isExtrap: false }
    } else {
      return {
        x: toX(currentExtrapH),
        y: toY(currentExtrapVal),
        h: currentExtrapH,
        v: currentExtrapVal,
        isExtrap: true,
      }
    }
  }, [animProgress, p1, v0, v24, v96, v168, currentExtrapH, currentExtrapVal, toX, toY])

  // Throttle live simulation telemetry to avoid 60 FPS panel re-renders
  const lastSimUpdateBRef = useRef<number>(0)
  useEffect(() => {
    if (!onSimUpdate) return
    const now = performance.now()
    if (!isSimulating || animProgress >= 1 || now - lastSimUpdateBRef.current > 100) {
      lastSimUpdateBRef.current = now
      onSimUpdate({
        progress: animProgress,
        p1,
        p2,
        currentH: probeTip.h,
        currentVal: probeTip.v,
        liveVelocity: liveDriftVelocity,
        liveProjection,
        liveMargin,
        isSimulating,
      })
    }
  }, [animProgress, p1, p2, probeTip.h, probeTip.v, liveDriftVelocity, liveProjection, liveMargin, isSimulating, onSimUpdate])

  // Interactive manual inspection mouse handlers
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width) return
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    if (mouseX >= padL && mouseX <= W - padR) {
      const h = Math.max(0, Math.min(activeHorizon, ((mouseX - padL) / (W - padL - padR)) * maxX))
      setManualInspectHour(h)
    } else {
      setManualInspectHour(null)
    }
  }

  const handleMouseLeave = () => {
    setManualInspectHour(null)
  }

  const isInspecting = manualInspectHour !== null
  const inspectH = manualInspectHour ?? (isSimulating ? probeTip.h : activeHorizon)
  const inspectVal = manualInspectHour !== null ? getValAtHourB(manualInspectHour) : (isSimulating ? probeTip.v : projectedAtHorizon)
  const isInspectExtrap = inspectH > 168
  const inspectMargin = limitVal - inspectVal

  const displayedDriftVelocity = liveDriftVelocity
  const displayedPredError = livePredError
  const displayedProjection = isInspecting ? inspectVal : liveProjection
  const displayedMargin = isInspecting ? inspectMargin : liveMargin

  // If no component is selected, render empty state (all hooks have been unconditionally called above)
  if (!component) {
    return (
      <div className="bg-[#07111C] border border-[#1D3A52] rounded-xl p-3.5 flex flex-col gap-2 flex-1 h-full min-h-[380px] md:min-h-[440px]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-bold text-[#F1F5F9] flex items-center gap-1.5 text-[11px] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#0E88D3] animate-gentle-pulse" />
            Module B &bull; Future Drift Forecaster (+96h Projection)
          </span>
          <span className="text-[10px] text-[#9AAFC0] font-mono">MODEL: POLYNOMIAL EXTENSION</span>
        </div>
        <div className="flex-1 min-h-[300px] md:min-h-[360px] flex items-center justify-center rounded-lg border border-[#1D3A52] bg-[#0B1928] text-[#9AAFC0] text-xs font-mono">
          [ AWAITING COMPONENT SELECTION TO DISPLAY DRIFT PROJECTION ]
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#07111C] border border-[#1D3A52] rounded-xl p-3 flex flex-col gap-2 relative shadow-2xl select-none flex-1 h-full w-full min-h-[380px] md:min-h-[440px]">
      {/* Top Header & Extrapolation Horizon Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs md:text-sm border-b border-[#1D3A52] pb-2">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-[#F1F5F9] flex items-center gap-1.5 text-xs md:text-sm uppercase tracking-wider">
            <span className={`w-2.5 h-2.5 rounded-full ${willBreach ? 'bg-[#D9363E] animate-alert-once' : 'bg-[#0E88D3] animate-gentle-pulse'}`} />
            MODULE B &bull; DRIFT FORECASTING
          </span>
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${
              willBreach
                ? 'bg-[#D9363E]/20 text-[#D9363E] border-[#D9363E]/50'
                : 'bg-[#168A5B]/20 text-[#168A5B] border-[#168A5B]/50'
            }`}
          >
            {willBreach ? 'BREACH PREDICTED' : 'NOMINAL DRIFT'}
          </span>
        </div>

        {/* Live Simulation status, Zoom Toggle, Speed Selector & Horizon Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Toggle: Focus Dynamic Scale vs Full Spec Scale */}
          <button
            type="button"
            onClick={() => setZoomMode((z) => (z === 'focus' ? 'full' : 'focus'))}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
              zoomMode === 'focus'
                ? 'bg-[#0E88D3]/30 text-[#F1F5F9] border-[#0E88D3] shadow-sm'
                : 'bg-[#102337] text-[#9AAFC0] border-[#1D3A52] hover:text-[#F1F5F9]'
            }`}
            title={zoomMode === 'focus' ? 'Switch to Full Spec Scale (0-50µA)' : 'Focus Zoom on Extrapolation Curve'}
          >
            {zoomMode === 'focus' ? '🔍 FOCUS: DRIFT' : '📐 FULL SPEC (50µA)'}
          </button>

          {/* Playback Controls & Speed Toggle */}
          <div className="flex items-center gap-1.5 bg-[#0B1928] p-1 rounded-lg border border-[#1D3A52]">
            {isSimulating ? (
              <button
                type="button"
                onClick={togglePause}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0E88D3]/20 text-[#0E88D3] border border-[#0E88D3]/40 text-[10px] font-mono font-bold hover:bg-[#0E88D3]/30 transition-all cursor-pointer"
                title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
              >
                <span>{isPaused ? '▶ RESUME' : '⏸ PAUSE'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startSimulation(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#102337] hover:bg-[#1D3A52] text-[#0E88D3] hover:text-[#F1F5F9] border border-[#1D3A52] text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm"
                title="Replay in-flight drift simulation"
              >
                <span>↺</span> REPLAY
              </button>
            )}

            {/* Speed Selector */}
            <div className="flex items-center gap-0.5 pl-1 border-l border-[#1D3A52] text-[9.5px] font-mono">
              {([0.5, 1, 2] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSimSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    simSpeed === spd
                      ? 'bg-[#0E88D3]/30 text-[#0E88D3] font-bold border border-[#0E88D3]/50'
                      : 'text-[#7F93A5] hover:text-[#F1F5F9]'
                  }`}
                  title={spd === 0.5 ? 'Ultra Slow (17s)' : spd === 1 ? 'Slow Observation (8.5s)' : 'Fast (4s)'}
                >
                  {spd === 0.5 ? '0.5x' : spd === 1 ? '1x' : '2x'}
                </button>
              ))}
            </div>

            {/* Live Phase Pill */}
            {isSimulating && (
              <span className="text-[9.5px] font-mono font-bold text-[#0E88D3] px-1 animate-gentle-pulse">
                {isPaused
                  ? 'PAUSED'
                  : p2 > 0
                  ? `+${Math.round(currentExtrapH - 168)}h`
                  : `${Math.round(probeTip.h)}h`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#0B1928] p-1 rounded-lg border border-[#1D3A52] font-mono text-xs">
            <span className="text-[#9AAFC0] px-1 uppercase text-xs font-bold">HORIZON:</span>
            {([216, 264, 336] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setActiveHorizon(h)}
                className={`px-2.5 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  activeHorizon === h
                    ? 'bg-[#0E88D3]/30 text-[#F1F5F9] border border-[#0E88D3] font-bold'
                    : 'text-[#7F93A5] hover:text-[#F1F5F9] hover:bg-[#102337]'
                }`}
              >
                +{h - 168}h
              </button>
            ))}
          </div>

          {/* Manual Inspection Active Badge */}
          {isInspecting && (
            <span className="text-[10px] font-mono font-bold text-[#0E88D3] bg-[#0B1928] px-2 py-0.5 rounded border border-[#0E88D3]/40">
              T+{Math.round(inspectH)}h &bull; {inspectVal.toFixed(2)} &mu;A
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas Area with Manual Inspection Crosshair */}
      <div
        ref={containerRef}
        className="relative rounded-lg border border-[#1D3A52] bg-[#07111C] overflow-hidden w-full flex-1 transition-all duration-300 min-h-[300px] md:min-h-[360px] h-full"
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full block select-none cursor-crosshair"
          style={{ width: '100%', height: '100%', display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="coneGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F47216" stopOpacity="0.08" />
              <stop offset="100%" stopColor={willBreach ? '#D9363E' : '#F47216'} stopOpacity="0.28" />
            </linearGradient>
            <linearGradient id="flightZoneGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0E88D3" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#0E88D3" stopOpacity="0.12" />
            </linearGradient>
            <pattern id="gridPatternB" width="30" height="20" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 20" fill="none" stroke="#1D3A52" strokeWidth="0.6" strokeOpacity="0.7" />
            </pattern>
          </defs>

          {/* Background Grid Pattern */}
          <rect x={padL} y={padT} width={W - padL - padR} height={H - padT - padB} fill="url(#gridPatternB)" />

          {/* Flight Phase Shading: Ground Burn-in vs In-Flight Operations */}
          <rect
            x={toX(168)}
            y={padT}
            width={toX(activeHorizon) - toX(168)}
            height={H - padT - padB}
            fill="url(#flightZoneGrad)"
          />
          <text
            x={toX(168) + 8}
            y={padT + 14}
            fill="#9AAFC0"
            fontSize="8"
            fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
            fontWeight="bold"
            letterSpacing="0.08em"
            opacity={0.85}
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
                  stroke={yVal === limitVal ? '#D9363E' : '#1D3A52'}
                  strokeDasharray={yVal === limitVal ? '4 3' : undefined}
                  strokeWidth={yVal === limitVal ? 1.2 : 0.6}
                  strokeOpacity={yVal === limitVal ? 0.9 : 0.7}
                />
                <text
                  x={padL - 6}
                  y={yPos + 3}
                  textAnchor="end"
                  fill={yVal === limitVal ? '#D9363E' : '#9AAFC0'}
                  fontSize="9"
                  fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
                  fontWeight={yVal === limitVal ? 'bold' : 'normal'}
                >
                  {yVal.toFixed(0)}
                </text>
              </g>
            )
          })}

          {/* Uniform 24-Hour Engineering Reticle Gridlines across Ground & In-Flight Horiz */}
          {Array.from({ length: Math.floor(activeHorizon / 24) + 1 }, (_, i) => i * 24).map((h) => {
            const xPos = toX(h)
            const isMilestone = h === 0 || h === 24 || h === 96 || h === 168 || h === activeHorizon
            return (
              <g key={`grid-v-b-${h}`}>
                <line
                  x1={xPos}
                  y1={padT}
                  x2={xPos}
                  y2={H - padB}
                  stroke={h === 168 ? '#9AAFC0' : h === activeHorizon ? '#F47216' : '#1D3A52'}
                  strokeDasharray={h === 168 ? '3 3' : isMilestone ? '3 2' : '1 3'}
                  strokeWidth={h === 168 || h === activeHorizon ? 1.2 : isMilestone ? 0.9 : 0.5}
                  strokeOpacity={h === 168 || h === activeHorizon ? 0.9 : isMilestone ? 0.8 : 0.4}
                />
                {isMilestone && (
                  <text
                    x={xPos}
                    y={H - padB + 14}
                    textAnchor="middle"
                    fill={h === 168 ? '#F1F5F9' : h === activeHorizon ? '#F47216' : '#9AAFC0'}
                    fontSize="9"
                    fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
                    fontWeight={h >= 168 ? 'bold' : 'normal'}
                  >
                    {h}h
                  </text>
                )}
              </g>
            )
          })}

          {/* 168H Ground Completion Marker */}
          <text
            x={toX(168)}
            y={H - padB + 26}
            textAnchor="middle"
            fill="#9AAFC0"
            fontSize="7.5"
            fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
          >
            ▲ HTOL END
          </text>

          {/* Datasheet Limit Line or Out-of-Frame Indicator */}
          {limitVal <= maxVal ? (
            <g transform={`translate(${W - padR - 105}, ${toY(limitVal) - 9})`}>
              <rect width="102" height="15" rx="3" fill="#102337" stroke="#D9363E" strokeWidth="0.8" opacity="0.95" />
              <text x="51" y="10.5" textAnchor="middle" fill="#D9363E" fontSize="8" fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif" fontWeight="bold">
                SPEC LIMIT {limitVal.toFixed(1)} &mu;A
              </text>
            </g>
          ) : (
            <g transform={`translate(${W - padR - 195}, ${padT + 4})`}>
              <rect x="0" y="0" width="190" height="18" rx="4" fill="#102337" stroke="#D9363E" strokeWidth="0.8" opacity="0.95" />
              <text x="8" y="12.5" fill="#D9363E" fontSize="8" fontFamily="monospace" fontWeight="bold">
                ▲ SPEC LIMIT {limitVal.toFixed(1)}&mu;A (HEADROOM: +{(limitVal - (component?.predicted_future ?? v168)).toFixed(1)}&mu;A)
              </text>
            </g>
          )}

          {/* Arrhenius Reliability Physics Callout in Top Canvas Space */}
          {zoomMode === 'focus' && (
            <g transform={`translate(${padL + 10}, ${padT + 6})`} opacity={0.95}>
              <rect x="0" y="0" width="220" height="40" rx="5" fill="#0B1928" stroke="#1D3A52" strokeWidth="0.8" />
              <text x="8" y="12" fill="#9AAFC0" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                RELIABILITY PHYSICS &bull; JEDEC JESD22-A108
              </text>
              <text x="8" y="24" fill="#0E88D3" fontSize="8" fontFamily="monospace">
                Arrhenius Ea: 0.70 eV &bull; AF: 38.4x @ 125&deg;C
              </text>
              <text x="8" y="34" fill="#168A5B" fontSize="7.5" fontFamily="monospace">
                Confidence Band: &plusmn;1.5&sigma; Linear Degradation
              </text>
            </g>
          )}

          {/* Dynamic Predictive Uncertainty Cone (expanding with p2) */}
          {conePolygonD && <path d={conePolygonD} fill="url(#coneGrad)" />}

          {/* Early Prediction Checkpoint Trace (24h -> 168h projection) */}
          {p1 >= 0.14 && (
            <path
              d={earlyPredPathD}
              fill="none"
              stroke="#9AAFC0"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity={Math.min(0.6, (p1 - 0.14) * 2)}
            />
          )}

          {/* Measured Past Telemetry Line (0h -> 168h, Technical Blue) */}
          <path
            ref={measuredPathRef}
            d={measuredPathD}
            fill="none"
            stroke="#0E88D3"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={isSimulating && p1 < 1 ? measuredLen : undefined}
            strokeDashoffset={isSimulating && p1 < 1 ? measuredLen * (1 - p1) : undefined}
          />

          {/* Future Extrapolation Line (168h -> Horizon, Muted Gold or Alert Red) */}
          {extrapPathD && (
            <path
              d={extrapPathD}
              fill="none"
              stroke={willBreach ? '#D9363E' : '#F47216'}
              strokeWidth={2.2}
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}

          {/* Nodes for Measured Points */}
          {measuredPoints.map((p) => {
            const isReached = p1 >= p.h / 168 || animProgress >= 1
            if (!isReached) return null

            const cx = toX(p.h)
            const cy = toY(p.v)
            return (
              <g
                key={p.h}
                className="cursor-pointer transition-opacity duration-300"
                onMouseEnter={() => setHoveredPoint({ hour: p.h, val: p.v, label: p.label })}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle cx={cx} cy={cy} r="4" fill="#07111C" stroke="#0E88D3" strokeWidth="1.5" />
                <circle cx={cx} cy={cy} r="1.5" fill="#F1F5F9" />
              </g>
            )
          })}

          {/* Early Prediction 168h Point & Error Delta Bar */}
          {p1 >= 1 && (
            <g>
              <circle
                cx={toX(168)}
                cy={toY(early168)}
                r="3.5"
                fill="#07111C"
                stroke="#9AAFC0"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              <line
                x1={toX(168)}
                y1={toY(v168)}
                x2={toX(168)}
                y2={toY(early168)}
                stroke="#F47216"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Future Projection Node at Horizon */}
          {(p2 > 0 || !isSimulating) && (
            <g
              className="cursor-pointer"
              onMouseEnter={() =>
                setHoveredPoint({
                  hour: activeHorizon,
                  val: projectedAtHorizon,
                  label: `Projected @ +${activeHorizon - 168}h`,
                })
              }
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {(p2 >= 0.98 || !isSimulating) && (
                <circle
                  cx={toX(activeHorizon)}
                  cy={toY(projectedAtHorizon)}
                  r={8}
                  fill="none"
                  stroke={willBreach ? '#D9363E' : '#F47216'}
                  strokeWidth={1.2}
                  className="animate-gentle-pulse"
                  opacity={0.5}
                />
              )}
              <circle
                cx={toX(targetExtrapH)}
                cy={toY(targetExtrapVal)}
                r={5}
                fill={willBreach ? '#102337' : '#0B1928'}
                stroke={willBreach ? '#D9363E' : '#F47216'}
                strokeWidth="2"
              />
              <circle cx={toX(targetExtrapH)} cy={toY(targetExtrapVal)} r="2" fill={willBreach ? '#D9363E' : '#F47216'} />
            </g>
          )}

          {/* Live Probe Scanner Head & Telemetry Badge */}
          {isSimulating && animProgress < 1 && (
            <g>
              {/* Probe Pulse Circle */}
              <circle
                cx={probeTip.x}
                cy={probeTip.y}
                r={8}
                fill={probeTip.isExtrap ? '#F47216' : '#0E88D3'}
                opacity={0.25}
              />
              <circle
                cx={probeTip.x}
                cy={probeTip.y}
                r={4}
                fill={probeTip.isExtrap ? '#F47216' : '#0E88D3'}
                stroke="#F1F5F9"
                strokeWidth={1.5}
              />
              <circle cx={probeTip.x} cy={probeTip.y} r={1.5} fill="#F1F5F9" />

              {/* Floating HUD Telemetry Badge */}
              <g
                transform={`translate(${Math.min(
                  W - padR - 55,
                  Math.max(padL + 55, probeTip.x)
                )}, ${Math.max(padT + 16, probeTip.y - 18)})`}
              >
                <rect
                  x="-50"
                  y="-12"
                  width="100"
                  height="20"
                  rx="4"
                  fill="#0B1928"
                  stroke={probeTip.isExtrap ? '#F47216' : '#0E88D3'}
                  strokeWidth="1.2"
                  filter="drop-shadow(0 2px 5px rgba(0,0,0,0.6))"
                />
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fill="#F1F5F9"
                  fontSize="8.5"
                  fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
                  fontWeight="bold"
                >
                  T+{Math.round(probeTip.h)}h: {probeTip.v.toFixed(2)} &mu;A
                </text>
              </g>
            </g>
          )}

          {/* Breach Crosshair & Annotation - Calm highlight with alert-once */}
          {breachHour && breachHour <= maxX && (p2 === 1 || currentExtrapH >= breachHour) && (
            <g transform={`translate(${toX(breachHour)}, ${toY(limitVal)})`} className="animate-alert-once">
              <circle r="7" fill="none" stroke="#D9363E" strokeWidth="1.2" opacity="0.8" />
              <circle r="4.5" fill="#102337" stroke="#D9363E" strokeWidth="1.8" />
              <line x1="-8" y1="0" x2="8" y2="0" stroke="#D9363E" strokeWidth="1.5" />
              <line x1="0" y1="-8" x2="0" y2="8" stroke="#D9363E" strokeWidth="1.5" />
              <text x="0" y="-11" textAnchor="middle" fill="#D9363E" fontSize="7.5" fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif" fontWeight="bold">
                BREACH T+{Math.round(breachHour)}H
              </text>
            </g>
          )}

          {/* Interactive Manual Inspection Line Section & Crosshair */}
          {isInspecting && (
            <g>
              {/* Vertical Inspection Line across full height */}
              <line
                x1={toX(inspectH)}
                x2={toX(inspectH)}
                y1={padT}
                y2={H - padB}
                stroke={isInspectExtrap ? '#F47216' : '#0E88D3'}
                strokeWidth={1.5}
                strokeDasharray="3 2"
                opacity={0.9}
              />
              {/* Horizontal line to Y-axis */}
              <line
                x1={padL}
                x2={toX(inspectH)}
                y1={toY(inspectVal)}
                y2={toY(inspectVal)}
                stroke={isInspectExtrap ? '#F47216' : '#0E88D3'}
                strokeWidth={0.8}
                strokeDasharray="2 2"
                opacity={0.5}
              />
              {/* Reticle Target on the line */}
              <circle
                cx={toX(inspectH)}
                cy={toY(inspectVal)}
                r={6}
                fill={isInspectExtrap ? '#F47216' : '#0E88D3'}
                opacity={0.25}
              />
              <circle
                cx={toX(inspectH)}
                cy={toY(inspectVal)}
                r={3.5}
                fill={isInspectExtrap ? '#F47216' : '#0E88D3'}
                stroke="#F1F5F9"
                strokeWidth={1.5}
              />

              {/* Floating Manual Inspection Chip */}
              <g
                transform={`translate(${Math.min(
                  W - padR - 65,
                  Math.max(padL + 65, toX(inspectH))
                )}, ${Math.max(padT + 18, toY(inspectVal) - 22)})`}
              >
                <rect
                  x="-64"
                  y="-14"
                  width="128"
                  height="24"
                  rx="4"
                  fill="#0B1928"
                  stroke={isInspectExtrap ? '#F47216' : '#0E88D3'}
                  strokeWidth="1.2"
                  filter="drop-shadow(0 3px 6px rgba(0,0,0,0.5))"
                />
                <text
                  x="0"
                  y="-1"
                  textAnchor="middle"
                  fill="#9AAFC0"
                  fontSize="8"
                  fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
                >
                  MANUAL PROBE &bull; T+{Math.round(inspectH)}h {isInspectExtrap ? '(FLIGHT)' : '(HTOL)'}
                </text>
                <text
                  x="0"
                  y="8"
                  textAnchor="middle"
                  fill={isInspectExtrap ? '#F47216' : '#0E88D3'}
                  fontSize="9.5"
                  fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
                  fontWeight="bold"
                >
                  {inspectVal.toFixed(2)} &mu;A
                </text>
              </g>
            </g>
          )}

          {/* Active Hover Tooltip */}
          {hoveredPoint && (
            <g transform={`translate(${toX(hoveredPoint.hour)}, ${Math.max(padT + 15, toY(hoveredPoint.val) - 18)})`}>
              <rect
                x="-42"
                y="-14"
                width="84"
                height="22"
                rx="4"
                fill="#0B1928"
                stroke="#F47216"
                strokeWidth="1"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
              />
              <text x="0" y="-2" textAnchor="middle" fill="#9AAFC0" fontSize="7.5" fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif">
                {hoveredPoint.label}
              </text>
              <text x="0" y="6" textAnchor="middle" fill="#F47216" fontSize="8.5" fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif" fontWeight="bold">
                {hoveredPoint.val.toFixed(2)} &mu;A
              </text>
            </g>
          )}

          {/* Y Axis Unit Label */}
          <text
            x={padL - 6}
            y={padT - 6}
            textAnchor="end"
            fill="#9AAFC0"
            fontSize="8"
            fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
          >
            &mu;A
          </text>
        </svg>
      </div>

      {/* Legend & Telemetry Readouts (Harmonized with Module A) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm font-mono text-[#F1F5F9] pt-2 border-t border-[#1D3A52]">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-1.5 rounded-full bg-[#0E88D3]" />
            <span className="font-bold text-[#F1F5F9]">HTOL Measured</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-1 bg-[#F47216] border-t border-dashed border-[#F47216]" />
            <span className="text-[#F47216] font-semibold">Arrhenius Extrapolation</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-1 bg-[#D9363E]" />
            <span className="text-[#D9363E] font-semibold">Spec Limit ({limitVal.toFixed(1)}&mu;A)</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="text-[#9AAFC0]">
              {isInspecting ? `Probe @ T+${Math.round(inspectH)}h:` : 'Drift Velocity:'}
            </span>
            <b className={`font-bold tabular-nums ${isInspecting ? 'text-[#0E88D3]' : displayedDriftVelocity > 50 ? 'text-[#D9363E]' : 'text-[#F47216]'}`}>
              {isInspecting ? `${inspectVal.toFixed(2)} µA` : `${displayedDriftVelocity.toFixed(2)} nA/h`}
            </b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[#9AAFC0]">
              {isInspecting ? 'Probe Margin:' : `+${activeHorizon - 168}h Margin:`}
            </span>
            <b className={`font-bold tabular-nums ${displayedMargin < 5 ? 'text-[#D9363E]' : displayedMargin < 15 ? 'text-[#C58A00]' : 'text-[#168A5B]'}`}>
              {displayedMargin.toFixed(1)} µA
            </b>
          </span>
        </div>
      </div>
    </div>
  )
}
