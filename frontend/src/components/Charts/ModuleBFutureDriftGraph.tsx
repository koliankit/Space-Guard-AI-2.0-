import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { ComponentOut } from '../../types'
import { sounds } from '../../utils/soundEffects'

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
  const [hoveredPoint, setHoveredPoint] = useState<{ hour: number; val: number; label: string } | null>(null)
  const [animProgress, setAnimProgress] = useState<number>(1)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [simSpeed, setSimSpeed] = useState<0.5 | 1 | 2>(1) // 0.5x (17s), 1x (8.5s slow), 2x (4.2s)

  const measuredPathRef = useRef<SVGPathElement>(null)
  const [measuredLen, setMeasuredLen] = useState<number>(600)
  const animFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const elapsedOffsetRef = useRef<number>(0)
  const hasPinged168Ref = useRef<boolean>(false)
  const hasPingedHorizonRef = useRef<boolean>(false)

  const W = 720
  const H = 280
  const padL = 54
  const padR = 32
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

  // Auto-trigger simulation when component or horizon changes
  useEffect(() => {
    if (component?.component_id) {
      startSimulation(true)
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [component?.component_id, activeHorizon, startSimulation])

  // Measure ground measured path length
  useEffect(() => {
    if (measuredPathRef.current) {
      const len = measuredPathRef.current.getTotalLength()
      if (len > 0 && Math.abs(len - measuredLen) > 1) {
        setMeasuredLen(len)
      }
    }
  }, [component, measuredLen])

  // Uncertainty cone variance (+/- 1.5 sigma drift model)
  const lotStd = component?.lot_std || 1.8
  const coneSpread = Math.max(2.5, lotStd * 1.6)
  const coneUpper = projectedAtHorizon + coneSpread
  const coneLower = Math.max(0, projectedAtHorizon - coneSpread)

  // Bounds for Y
  const maxVal = Math.max(limitVal * 1.12, v0, v24, v96, v168, future264, coneUpper)
  const minVal = Math.max(0, Math.min(v0, v24, v96, v168, coneLower) * 0.85)

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
    const ticks = [0, 10, 20, 30, 40, 50].filter((v) => v >= minVal && v <= maxVal)
    if (!ticks.includes(limitVal)) ticks.push(limitVal)
    ticks.sort((a, b) => a - b)
    return ticks
  }, [minVal, maxVal, limitVal])

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

  const measuredPathD = useMemo(
    () =>
      measuredPoints
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.h).toFixed(1)} ${toY(p.v).toFixed(1)}`)
        .join(' '),
    [measuredPoints, toX, toY]
  )

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
  const currentSpread = coneSpread * p2
  const currentUpper = currentExtrapVal + currentSpread
  const currentLower = Math.max(0, currentExtrapVal - currentSpread)

  const conePolygonD = useMemo(() => {
    if (p2 <= 0.05) return ''
    return (
      `M ${toX(168).toFixed(1)} ${toY(v168).toFixed(1)} ` +
      `L ${toX(currentExtrapH).toFixed(1)} ${toY(currentUpper).toFixed(1)} ` +
      `L ${toX(currentExtrapH).toFixed(1)} ${toY(currentLower).toFixed(1)} Z`
    )
  }, [p2, toX, toY, v168, currentExtrapH, currentUpper, currentLower])

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

  // Notify parent dashboard panel of live simulation telemetry
  useEffect(() => {
    if (onSimUpdate) {
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

  // If no component is selected, render empty state (all hooks have been unconditionally called above)
  if (!component) {
    return (
      <div className="bg-[#071120] border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-bold text-amber-400 flex items-center gap-1.5 text-[11px] uppercase">
            <span className="w-2 h-2 rounded-full bg-amber-400 led" />
            Module B &bull; Future Drift Forecaster (+96h Projection)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">MODEL: POLYNOMIAL EXTENSION</span>
        </div>
        <div className="h-[200px] flex items-center justify-center rounded-lg border border-slate-800/80 bg-[#050B16] text-slate-400 text-xs font-mono">
          [ AWAITING COMPONENT SELECTION TO DISPLAY DRIFT PROJECTION ]
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#070E1C] border border-slate-800/90 rounded-xl p-3 flex flex-col gap-2 relative shadow-lg select-none">
      {/* Top Header & Extrapolation Horizon Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs md:text-sm border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-amber-400 flex items-center gap-1.5 text-xs md:text-sm uppercase tracking-wider">
            <span className={`w-2.5 h-2.5 rounded-full ${willBreach ? 'bg-rose-500 led' : 'bg-amber-400 led'}`} />
            MODULE B &bull; IN-FLIGHT DRIFT FORECASTING
          </span>
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${
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
          {/* Playback Controls & Speed Toggle */}
          <div className="flex items-center gap-1.5 bg-[#050914] p-1 rounded-lg border border-slate-800">
            {isSimulating ? (
              <button
                type="button"
                onClick={togglePause}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
                title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
              >
                <span>{isPaused ? '▶ RESUME' : '⏸ PAUSE'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startSimulation(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm"
                title="Replay in-flight drift simulation"
              >
                <span>↺</span> REPLAY
              </button>
            )}

            {/* Speed Selector */}
            <div className="flex items-center gap-0.5 pl-1 border-l border-slate-700 text-[9.5px] font-mono">
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
                  title={spd === 0.5 ? 'Ultra Slow (17s)' : spd === 1 ? 'Slow Observation (8.5s)' : 'Fast (4s)'}
                >
                  {spd === 0.5 ? '0.5x' : spd === 1 ? '1x' : '2x'}
                </button>
              ))}
            </div>

            {/* Live Phase Pill */}
            {isSimulating && (
              <span className="text-[9.5px] font-mono font-bold text-amber-400 px-1 animate-pulse">
                {isPaused
                  ? 'PAUSED'
                  : p2 > 0
                  ? `+${Math.round(currentExtrapH - 168)}h`
                  : `${Math.round(probeTip.h)}h`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#050914] p-1 rounded-lg border border-slate-800 font-mono text-xs">
            <span className="text-slate-400 px-1 uppercase text-xs font-bold">HORIZON:</span>
            {([216, 264, 336] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setActiveHorizon(h)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  activeHorizon === h
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/60 font-bold shadow-isro'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                +{h - 168}h ({h}h)
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative rounded-lg border border-slate-800/80 bg-[#040812] overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[260px] md:h-[290px] block select-none">
          <defs>
            <linearGradient id="coneGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.05" />
              <stop offset="100%" stopColor={willBreach ? '#ef4444' : '#f59e0b'} stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="flightZoneGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.07" />
            </linearGradient>
            <pattern id="gridPatternB" width="30" height="20" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 20" fill="none" stroke="#162238" strokeWidth="0.5" strokeOpacity="0.7" />
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
            fill="#ffffff"
            fontSize="8"
            fontFamily="Rajdhani, sans-serif"
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
                  fontFamily="monospace"
                  fontWeight={yVal === limitVal ? 'bold' : 'normal'}
                >
                  {yVal.toFixed(0)}
                </text>
              </g>
            )
          })}

          {/* X Axis Time Marks (0, 24, 96, 168, horizon) */}
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
                  fontFamily="monospace"
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
            fontFamily="monospace"
          >
            ▲ HTOL END
          </text>

          {/* Datasheet Limit Badge */}
          <g transform={`translate(${W - padR - 105}, ${toY(limitVal) - 9})`}>
            <rect width="102" height="15" rx="3" fill="#881337" opacity="0.8" />
            <text x="51" y="10.5" textAnchor="middle" fill="#fda4af" fontSize="8" fontFamily="monospace" fontWeight="bold">
              SPEC LIMIT {limitVal.toFixed(1)} &mu;A
            </text>
          </g>

          {/* Dynamic Predictive Uncertainty Cone (expanding with p2) */}
          {conePolygonD && <path d={conePolygonD} fill="url(#coneGrad)" />}

          {/* Early Prediction Checkpoint Trace (24h -> 168h projection) */}
          {p1 >= 0.14 && (
            <path
              d={earlyPredPathD}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity={Math.min(0.6, (p1 - 0.14) * 2)}
            />
          )}

          {/* Measured Past Telemetry Line (0h -> 168h, drawn live via strokeDashoffset) */}
          <path
            ref={measuredPathRef}
            d={measuredPathD}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={measuredLen}
            strokeDashoffset={measuredLen * (1 - p1)}
          />

          {/* Future Extrapolation Line (168h -> Horizon, drawn dynamically in Phase 2) */}
          {extrapPathD && (
            <path
              d={extrapPathD}
              fill="none"
              stroke={willBreach ? '#ef4444' : '#f59e0b'}
              strokeWidth="2.2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}

          {/* Nodes for Measured Points (Sequentially appearing as reached) */}
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
                <circle cx={cx} cy={cy} r="4" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx={cx} cy={cy} r="1.5" fill="#ffffff" />
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
                fill="#0f172a"
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              <line
                x1={toX(168)}
                y1={toY(v168)}
                x2={toX(168)}
                y2={toY(early168)}
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Future Projection Node at Horizon (activates in Phase 2) */}
          {p2 > 0 && (
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
              {p2 >= 0.98 && (
                <circle
                  cx={toX(activeHorizon)}
                  cy={toY(projectedAtHorizon)}
                  r="10"
                  fill="none"
                  stroke={willBreach ? '#ef4444' : '#f59e0b'}
                  strokeWidth="1.5"
                  className="animate-ping"
                  opacity={0.6}
                />
              )}
              <circle
                cx={toX(currentExtrapH)}
                cy={toY(currentExtrapVal)}
                r="5"
                fill={willBreach ? '#be123c' : '#d97706'}
                stroke={willBreach ? '#fda4af' : '#fde68a'}
                strokeWidth="2"
              />
              <circle cx={toX(currentExtrapH)} cy={toY(currentExtrapVal)} r="2" fill="#ffffff" />
            </g>
          )}

          {/* Live Probe Scanner Head & Telemetry Badge */}
          {isSimulating && animProgress < 1 && (
            <g>
              {/* Probe Pulse Circle */}
              <circle
                cx={probeTip.x}
                cy={probeTip.y}
                r={9}
                fill={probeTip.isExtrap ? '#f59e0b' : '#ffffff'}
                opacity={0.35}
              />
              <circle
                cx={probeTip.x}
                cy={probeTip.y}
                r={4.5}
                fill={probeTip.isExtrap ? '#f59e0b' : '#38bdf8'}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
              <circle cx={probeTip.x} cy={probeTip.y} r={1.5} fill="#ffffff" />

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
                  fill="#0B1528"
                  stroke={probeTip.isExtrap ? '#f59e0b' : '#38bdf8'}
                  strokeWidth="1.2"
                  filter="drop-shadow(0 2px 5px rgba(0,0,0,0.6))"
                />
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  T+{Math.round(probeTip.h)}h: {probeTip.v.toFixed(2)} &mu;A
                </text>
              </g>
            </g>
          )}

          {/* Breach Crosshair & Annotation if within visible range and reached by sweep */}
          {breachHour && breachHour <= maxX && (p2 === 1 || currentExtrapH >= breachHour) && (
            <g transform={`translate(${toX(breachHour)}, ${toY(limitVal)})`}>
              <circle r="7" fill="none" stroke="#ef4444" strokeWidth="1.5" className="animate-ping" opacity="0.75" />
              <circle r="5" fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" strokeWidth="1.8" />
              <line x1="-8" y1="0" x2="8" y2="0" stroke="#ef4444" strokeWidth="1.5" />
              <line x1="0" y1="-8" x2="0" y2="8" stroke="#ef4444" strokeWidth="1.5" />
              <text x="0" y="-11" textAnchor="middle" fill="#ef4444" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                BREACH T+{Math.round(breachHour)}H
              </text>
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
                fill="#0f172a"
                stroke="#f59e0b"
                strokeWidth="1"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
              />
              <text x="0" y="-2" textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">
                {hoveredPoint.label}
              </text>
              <text x="0" y="6" textAnchor="middle" fill="#f59e0b" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                {hoveredPoint.val.toFixed(2)} &mu;A
              </text>
            </g>
          )}

          {/* Y Axis Unit Label */}
          <text
            x={padL - 6}
            y={padT - 6}
            textAnchor="end"
            fill="#64748b"
            fontSize="8"
            fontFamily="monospace"
          >
            &mu;A
          </text>
        </svg>
      </div>

      {/* Metric Callouts & Flight Advisory Bottom Row (Live Count-Up Synchronized with Sweep) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-[#050B16] border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">Drift Velocity</span>
            {isSimulating && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <span className={`text-base font-bold mt-0.5 tabular-nums ${liveDriftVelocity > 50 ? 'text-rose-400' : 'text-amber-400'}`}>
            {liveDriftVelocity.toFixed(2)} <span className="text-xs font-normal text-slate-400">nA/hr</span>
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#050B16] border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">Early Pred Error</span>
            {isSimulating && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <span className="text-base font-bold text-amber-300 mt-0.5 tabular-nums">
            &plusmn;{livePredError.toFixed(2)} <span className="text-xs font-normal text-slate-400">&mu;A</span>
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#050B16] border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">+{activeHorizon - 168}h Projection</span>
            {isSimulating && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <span className={`text-base font-bold mt-0.5 tabular-nums ${willBreach ? 'text-rose-400 font-bold' : 'text-slate-100'}`}>
            {liveProjection.toFixed(2)} <span className="text-xs font-normal text-slate-400">&mu;A</span>
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#050B16] border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">Future Margin</span>
            {isSimulating && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <span className={`text-base font-bold mt-0.5 tabular-nums ${liveMargin < 5 ? 'text-rose-400' : liveMargin < 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {liveMargin.toFixed(1)} <span className="text-xs font-normal text-slate-400">&mu;A</span>
          </span>
        </div>
      </div>
    </div>
  )
}
