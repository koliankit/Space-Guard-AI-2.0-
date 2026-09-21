import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { ComponentOut } from '../../types'
import { sounds } from '../../utils/soundEffects'
import { createMonotoneCubicPath } from '../../utils/spline'

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
  const [zoomMode, setZoomMode] = useState<'focus' | 'full'>('focus')
  const [stageH, setStageH] = useState<number>(168)
  const [animProgress, setAnimProgress] = useState<number>(1)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [simSpeed, setSimSpeed] = useState<0.5 | 1 | 2>(1) // 0.5x (16s), 1x (8s slow), 2x (4s)
  const [manualInspectHour, setManualInspectHour] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const [chartDims, setChartDims] = useState<{ width: number; height: number }>({ width: 880, height: 270 })

  const pathRef = useRef<SVGPathElement>(null)
  const [pathLength, setPathLength] = useState<number>(800)
  const animFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const elapsedOffsetRef = useRef<number>(0)
  const lastPingHourRef = useRef<number>(-1)

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
          height: Math.round(Math.max(240, h)),
        })
      }
    }
    updateSize()
    const timer = setTimeout(updateSize, 40)

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect
        const w = Math.round(cr.width || el.clientWidth)
        const h = Math.round(Math.max(240, cr.height || el.clientHeight))
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
  const H = Math.max(240, chartDims.height)
  const padL = 50
  const padR = 24
  const padT = 24
  const padB = 44

  // Geometry calculations
  const limitVal = component?.limit_ua || 50
  const lotMean = component?.lot_mean ?? (component?.v168 ? component.v168 * 0.94 : 11.5)
  const lotStd = component?.lot_std ?? 1.8

  const bandLow = Math.max(0, lotMean - 2 * lotStd)
  const bandHigh = lotMean + 2 * lotStd

  const v0 = component?.v0 ?? 10
  const v24 = component?.v24 ?? 10.2
  const v96 = component?.v96 ?? (v0 + (v24 - v0) * 4)
  const v168 = component?.v168 ?? 11.4

  const allVals = [v0, v24, v96, v168, limitVal, bandLow, bandHigh]
  const fullMinY = Math.max(0, Math.min(...allVals) * 0.8)
  const fullMaxY = Math.max(...allVals) * 1.15

  const dataMin = Math.min(v0, v24, v96, v168, bandLow)
  const dataMax = Math.max(v0, v24, v96, v168, bandHigh)
  const margin = Math.max(0.6, (dataMax - dataMin) * 0.28)
  const focusMinY = Math.max(0, Math.floor((dataMin - margin) * 10) / 10)
  const focusMaxY = Math.ceil((dataMax + margin) * 10) / 10

  const minY = zoomMode === 'focus' ? focusMinY : fullMinY
  const maxY = zoomMode === 'focus' ? focusMaxY : fullMaxY

  const xFor = useCallback((h: number) => padL + (h / 168) * (W - padL - padR), [padL, padR, W])
  const yFor = useCallback((v: number) => H - padB - ((v - minY) / (maxY - minY || 1)) * (H - padT - padB), [H, padB, minY, maxY, padT])

  // Piecewise value interpolation along curve for manual checking
  const getValAtHour = useCallback((h: number) => {
    if (h <= 24) return v0 + ((v24 - v0) / 24) * h
    if (h <= 96) return v24 + ((v96 - v24) / 72) * (h - 24)
    return v96 + ((v168 - v96) / 72) * (h - 96)
  }, [v0, v24, v96, v168])

  const stages: [number, number][] = useMemo(() => {
    const list: [number, number][] = [[0, v0], [24, v24]]
    if (component?.v96 != null) list.push([96, v96])
    list.push([168, v168])
    return list
  }, [v0, v24, v96, v168, component?.v96])

  const shown = useMemo(() => stages.filter(([h]) => h <= stageH), [stages, stageH])

  // Smooth Fritsch-Carlson monotone cubic spline curve (strictly monotonic, zero overshoot)
  const smoothCurve = useMemo(() => {
    if (shown.length < 2) return ''
    const mapped = shown.map(([h, v]) => ({ x: xFor(h), y: yFor(v) }))
    return createMonotoneCubicPath(mapped)
  }, [shown, xFor, yFor])

  const lastPoint = shown[shown.length - 1]

  const areaD = useMemo(() => {
    if (shown.length <= 1 || !smoothCurve) return ''
    return `${smoothCurve} L ${xFor(lastPoint[0]).toFixed(1)} ${H - padB} L ${xFor(shown[0][0]).toFixed(1)} ${H - padB} Z`
  }, [smoothCurve, shown, lastPoint, xFor, H, padB])

  const baselineCurve = useMemo(() => {
    const lotBase0 = Math.min(lotMean * 0.75, v0 < lotMean ? v0 * 0.95 : lotMean * 0.75)
    const lotDelta = Math.max(0.1, lotMean - lotBase0)
    const baselinePts: [number, number][] = [
      [0, lotBase0],
      [24, lotBase0 + lotDelta * 0.20],
      [96, lotBase0 + lotDelta * 0.65],
      [168, lotMean],
    ].filter(([h]) => h <= stageH) as [number, number][]

    if (baselinePts.length < 2) return ''
    const mapped = baselinePts.map(([h, v]) => ({ x: xFor(h), y: yFor(v) }))
    return createMonotoneCubicPath(mapped)
  }, [v0, lotMean, stageH, xFor, yFor])

  // Probe tip coordinates along the path
  const tipPoint = useMemo(() => {
    if (!pathRef.current || pathLength <= 0) {
      return { x: xFor(0), y: yFor(v0) }
    }
    const currentLen = Math.min(pathLength, Math.max(0, pathLength * animProgress))
    try {
      return pathRef.current.getPointAtLength(currentLen)
    } catch {
      return { x: xFor(0), y: yFor(v0) }
    }
  }, [animProgress, pathLength, v0, minY, maxY])

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

  // Base simulation duration: 8000ms (Very slow and deliberate for clear observation)
  const baseDuration = 8000 / simSpeed

  // Live simulation telemetry sweep callback
  const startSweepAnimation = useCallback((resetOffset = true) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setIsSimulating(true)
    setIsPaused(false)
    if (resetOffset) {
      setAnimProgress(0)
      elapsedOffsetRef.current = 0
      lastPingHourRef.current = -1
    }
    sounds.playClick()
    startTimeRef.current = performance.now() - elapsedOffsetRef.current

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current
      elapsedOffsetRef.current = elapsed
      const rawP = Math.min(1, elapsed / baseDuration)
      // Smooth linear-cubic hybrid pacing for steady, readable live rates
      const easeP = rawP < 0.2 ? 2.5 * rawP * rawP : rawP > 0.8 ? 1 - 2.5 * Math.pow(1 - rawP, 2) : rawP
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
      // Resume
      startSweepAnimation(false)
    } else {
      // Pause
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setIsPaused(true)
    }
  }, [isPaused, startSweepAnimation])

  // Ensure full graph is visible immediately when component changes
  useEffect(() => {
    setAnimProgress(1)
    setIsSimulating(false)
    setIsPaused(false)
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [component?.component_id, stageH])

  // Throttle live updates to parent dashboard to avoid 60 FPS panel re-renders
  const lastSimUpdateRef = useRef<number>(0)
  useEffect(() => {
    if (!onSimUpdate) return
    const now = performance.now()
    if (!isSimulating || animProgress >= 1 || now - lastSimUpdateRef.current > 100) {
      lastSimUpdateRef.current = now
      onSimUpdate({
        progress: animProgress,
        simHour,
        simVal,
        isSimulating,
      })
    }
  }, [animProgress, simHour, simVal, isSimulating, onSimUpdate])

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
  const numSpectrumBars = useMemo(() => {
    return Math.min(54, Math.max(28, Math.floor((W - padL - padR) / 18)))
  }, [W, padL, padR])

  const spectrumBars = useMemo(() => {
    return Array.from({ length: numSpectrumBars }, (_, i) => {
      const wave = isSimulating && !isPaused ? Math.sin(animProgress * Math.PI * 6 + i * 0.4) * 5 : 0
      const base = Math.abs(Math.sin((i / numSpectrumBars) * Math.PI * 3.2)) * 18 + 5
      return Math.min(Math.max(4, base + wave), 22)
    })
  }, [isSimulating, isPaused, animProgress, numSpectrumBars])

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

  // If no component is selected, render empty state (all hooks have been unconditionally called above)
  if (!component) {
    return (
      <div className="bg-[#F4F7FA] border border-[#D9E2EA] rounded-xl p-3.5 flex flex-col gap-2 flex-1 h-full min-h-[400px]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-bold text-[#17212B] flex items-center gap-1.5 text-[11px] uppercase">
            <span className="w-2 h-2 rounded-full bg-white led" />
            Module A &bull; Parametric Waveform Telemetry
          </span>
          <span className="text-[10px] text-[#5B6B7A] font-mono">CHANNEL: 24-BIT SIGMA-DELTA ADC</span>
        </div>
        <div className="flex-1 min-h-[360px] md:min-h-[440px] flex items-center justify-center rounded-lg border border-[#D9E2EA]/80 bg-[#F4F7FA] text-[#5B6B7A] text-xs font-mono">
          [ AWAITING COMPONENT SELECTION TO DISPLAY SILICON OSCILLOSCOPE ]
        </div>
      </div>
    )
  }

  const isRej = component.status === 'reject'
  const isMon = component.status === 'monitor'
  const curveColor = isRej ? '#D9363E' : isMon ? '#C58A00' : '#168A5B'

  // Live interpolated readouts for dashboard synchronization
  const finalDelta = (component.v168 ?? 0) - (component.v0 ?? 0)
  const isInspecting = manualInspectHour !== null
  const activeInspectHour = manualInspectHour ?? (isSimulating ? simHour : 168)
  const activeInspectVal = manualInspectHour !== null ? getValAtHour(manualInspectHour) : (isSimulating ? simVal : (component.v168 ?? 0))
  const displayedDelta = isInspecting ? activeInspectVal - component.v0 : (animProgress >= 1 ? finalDelta : simVal - component.v0)
  const finalZ = component.z168
  const displayedZ = isInspecting ? (activeInspectVal - lotMean) / (lotStd || 1) : (animProgress >= 1 ? finalZ : (simVal - lotMean) / (lotStd || 1))

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width) return
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    if (mouseX >= padL && mouseX <= W - padR) {
      const h = Math.max(0, Math.min(168, ((mouseX - padL) / (W - padL - padR)) * 168))
      setManualInspectHour(h)
    } else {
      setManualInspectHour(null)
    }
  }

  const handleMouseLeave = () => {
    setManualInspectHour(null)
  }

  return (
    <div className="bg-[#F4F7FA] border border-[#D9E2EA] rounded-xl p-3 flex flex-col gap-2 shadow-lg select-none flex-1 h-full w-full min-h-[300px]">
      {/* Top Header & Stage Scrubbing Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#D9E2EA] pb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: curveColor }}
          />
          <span className="font-display font-bold text-xs md:text-sm text-[#17212B] tracking-wider uppercase">
            GRAPH A &bull; HTOL 168H OSCILLOSCOPE
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#D9E2EA] text-[#17212B] font-bold">
            {component.component_id}
          </span>
        </div>

        {/* Action controls, Zoom Toggle, Speed selector & Stage Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Toggle: Focus Dynamic Scale vs Full Spec Scale */}
          <button
            type="button"
            onClick={() => setZoomMode((z) => (z === 'focus' ? 'full' : 'focus'))}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
              zoomMode === 'focus'
                ? 'bg-[#0E88D3]/20 text-[#0E88D3] border-[#0E88D3]/60 shadow-sm'
                : 'bg-[#F8FAFC] text-[#5B6B7A] border-[#D9E2EA] hover:text-[#17212B]'
            }`}
            title={zoomMode === 'focus' ? 'Switch to Full Spec Scale (0-50µA)' : 'Focus Zoom on Telemetry Data Curve'}
          >
            {zoomMode === 'focus' ? '🔍 FOCUS: TELEMETRY' : '📐 FULL SPEC (50µA)'}
          </button>

          {/* Playback Controls & Speed Toggle */}
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] p-1 rounded-lg border border-[#D9E2EA]">
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
                onClick={() => startSweepAnimation(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8FAFC] hover:bg-[#D9E2EA] text-[#0E88D3] hover:text-[#17212B] border border-[#D9E2EA] text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm"
                title="Replay oscilloscope live telemetry sweep"
              >
                <span>↺</span> REPLAY
              </button>
            )}

            {/* Speed Selector */}
            <div className="flex items-center gap-0.5 pl-1 border-l border-[#D9E2EA] text-[9.5px] font-mono">
              {([0.5, 1, 2] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSimSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded ${
                    simSpeed === spd
                      ? 'bg-[#0E88D3]/30 text-[#0E88D3] font-bold border border-[#0E88D3]/50'
                      : 'text-[#5B6B7A] hover:text-[#17212B]'
                  }`}
                  title={spd === 0.5 ? 'Ultra Slow (16s)' : spd === 1 ? 'Slow Observation (8s)' : 'Fast (4s)'}
                >
                  {spd === 0.5 ? '0.5x' : spd === 1 ? '1x' : '2x'}
                </button>
              ))}
            </div>

            {/* Live Telemetry Progress Pill */}
            {isSimulating && (
              <span className="text-[9.5px] font-mono font-bold text-[#168A5B] px-1 animate-pulse">
                {isPaused ? 'PAUSED' : `T+${Math.round(simHour)}h`}
              </span>
            )}
          </div>

          {/* Scrub Stage Filters */}
          <div className="flex items-center gap-1 bg-[#F4F7FA] p-1 rounded-lg border border-[#D9E2EA] text-xs">
            <span className="text-[#5B6B7A] font-mono text-[10px] uppercase mr-1">STAGE:</span>
            {STAGES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setStageH(h)}
                className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  stageH === h
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/60 font-bold shadow-isro'
                    : 'text-[#5B6B7A] hover:text-[#17212B] hover:bg-[#F8FAFC]'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main SVG Chart Canvas with Interactive Manual Line Section & Cursor */}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden border border-[#D9E2EA] bg-[#F4F7FA] w-full flex-1 transition-all duration-300 min-h-[260px] h-full"
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full block cursor-crosshair"
          style={{ width: '100%', height: '100%', display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
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

          {/* Horizontal Reticle Gridlines & Y-Axis Scale Values */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const y = padT + (H - padT - padB) * (1 - f)
            const val = minY + (maxY - minY) * f
            return (
              <g key={f}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#D9E2EA" strokeWidth={0.8} strokeOpacity={0.6} />
                <text
                  x={padL - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#5B6B7A"
                  className="text-[8.5px] font-mono tabular-nums"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            )
          })}

          {/* Uniform 24-Hour Engineering Reticle Gridlines across 0-168h */}
          {[0, 24, 48, 72, 96, 120, 144, 168].map((h) => {
            const x = xFor(h)
            const isMilestone = h === 0 || h === 24 || h === 96 || h === 168
            return (
              <g key={`grid-v-${h}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={padT}
                  y2={H - padB}
                  stroke="#D9E2EA"
                  strokeDasharray={isMilestone ? '3 2' : '1 3'}
                  strokeWidth={isMilestone ? 1 : 0.6}
                  strokeOpacity={isMilestone ? 0.85 : 0.35}
                />
                {isMilestone && (
                  <text
                    x={x}
                    y={H - padB + 14}
                    textAnchor="middle"
                    fill="#5B6B7A"
                    className="text-[9px] font-mono font-semibold"
                  >
                    T+{h}h
                  </text>
                )}
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

          {/* Datasheet Limit Line or Out-of-Frame Indicator */}
          {limitVal <= maxY ? (
            <>
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
            </>
          ) : (
            <g transform={`translate(${W - padR - 195}, ${padT + 4})`}>
              <rect x="0" y="0" width="190" height="18" rx="4" fill="#FFFFFF" stroke="#EF4444" strokeWidth="0.8" opacity="0.92" />
              <text x="8" y="12.5" fill="#F87171" fontSize="8" fontFamily="monospace" fontWeight="bold">
                ▲ SPEC LIMIT {limitVal.toFixed(1)}&mu;A (+{(limitVal - v168).toFixed(1)}&mu;A Margin)
              </text>
            </g>
          )}

          {/* Lot Peer Gaussian Distribution Meter in Top Canvas Space */}
          {zoomMode === 'focus' && (
            <g transform={`translate(${W - padR - 225}, ${padT + 26})`} opacity={0.92}>
              <rect x="0" y="0" width="220" height="42" rx="5" fill="#F4F7FA" stroke="#D9E2EA" strokeWidth="0.8" />
              <text x="8" y="12" fill="#5B6B7A" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                LOT STATISTICAL SPREAD (N={component.lot_id || 'LOT'})
              </text>
              <text x="8" y="24" fill="#0E88D3" fontSize="8" fontFamily="monospace">
                &mu;={lotMean.toFixed(1)}&mu;A &bull; &sigma;=&plusmn;{lotStd.toFixed(2)} &bull; z={finalZ != null ? `${finalZ > 0 ? '+' : ''}${finalZ.toFixed(2)}&sigma;` : '--'}
              </text>
              {/* Visual sigma meter */}
              <rect x="8" y="30" width="204" height="6" rx="3" fill="#FFFFFF" />
              <rect x="42" y="30" width="136" height="6" rx="2" fill="#168A5B" opacity={0.35} />
              <line x1="110" x2="110" y1="28" y2="38" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle
                cx={Math.min(206, Math.max(12, 110 + (finalZ || 0) * 32))}
                cy="33"
                r="3.5"
                fill={curveColor}
                stroke="#FFFFFF"
                strokeWidth="1"
              />
            </g>
          )}

          {/* Lot Norm Baseline Trace (Crisp White dashed line) */}
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
              strokeDasharray={isSimulating && animProgress < 1 ? pathLength : undefined}
              strokeDashoffset={isSimulating && animProgress < 1 ? pathLength * (1 - animProgress) : undefined}
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
                  stroke="#F4F7FA"
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
                r={9}
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
                  fill="#FFFFFF"
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
                  fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
                  fontWeight="bold"
                >
                  T+{Math.round(simHour)}h: {simVal.toFixed(2)} &mu;A
                </text>
              </g>
            </g>
          )}

          {/* Interactive Manual Line Section & Cursor */}
          {isInspecting && (
            <g>
              {/* Vertical Inspection Line across full height */}
              <line
                x1={xFor(activeInspectHour)}
                x2={xFor(activeInspectHour)}
                y1={padT}
                y2={H - padB}
                stroke="#38BDF8"
                strokeWidth={1.5}
                strokeDasharray="3 2"
                opacity={0.9}
              />
              {/* Horizontal line to Y-axis */}
              <line
                x1={padL}
                x2={xFor(activeInspectHour)}
                y1={yFor(activeInspectVal)}
                y2={yFor(activeInspectVal)}
                stroke="#38BDF8"
                strokeWidth={0.8}
                strokeDasharray="2 2"
                opacity={0.5}
              />
              {/* Reticle Target on the line */}
              <circle
                cx={xFor(activeInspectHour)}
                cy={yFor(activeInspectVal)}
                r={7}
                fill="#38BDF8"
                opacity={0.3}
              />
              <circle
                cx={xFor(activeInspectHour)}
                cy={yFor(activeInspectVal)}
                r={4}
                fill="#0284C7"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />

              {/* Floating Manual Inspection Chip */}
              <g
                transform={`translate(${Math.min(
                  W - padR - 65,
                  Math.max(padL + 65, xFor(activeInspectHour))
                )}, ${Math.max(padT + 18, yFor(activeInspectVal) - 22)})`}
              >
                <rect
                  x="-62"
                  y="-14"
                  width="124"
                  height="24"
                  rx="4"
                  fill="#FFFFFF"
                  stroke="#0E88D3"
                  strokeWidth="1.4"
                  filter="drop-shadow(0 2px 6px rgba(0,0,0,0.15))"
                />
                <text
                  x="0"
                  y="-1"
                  textAnchor="middle"
                  fill="#5B6B7A"
                  fontSize="8"
                  fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
                >
                  MANUAL PROBE &bull; T+{Math.round(activeInspectHour)}h
                </text>
                <text
                  x="0"
                  y="8"
                  textAnchor="middle"
                  fill="#0E88D3"
                  fontSize="9.5"
                  fontFamily="'Sitka Small Semibold', 'Sitka Small', Georgia, serif"
                  fontWeight="bold"
                >
                  {activeInspectVal.toFixed(2)} &mu;A
                </text>
              </g>
            </g>
          )}

          {/* Spectrogram Energy Bars along bottom margin */}
          <g transform={`translate(${padL}, ${H - padB + 22})`}>
            {spectrumBars.map((bh, idx) => {
              const totalAvailW = W - padL - padR
              const bw = Math.max(3.5, totalAvailW / spectrumBars.length - 2)
              const bx = idx * (bw + 2)
              return (
                <rect
                  key={idx}
                  x={bx}
                  y={20 - bh}
                  width={bw}
                  height={bh}
                  fill={isSimulating ? '#10B981' : '#F59E0B'}
                  opacity={0.3 + (bh / 20) * 0.4}
                  rx={1}
                />
              )
            })}
          </g>
        </svg>
      </div>

      {/* Legend & Telemetry Readouts (Updating live in sync with sweep or manual inspection) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm font-mono text-[#17212B] pt-2 border-t border-[#D9E2EA]">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-2">
            <span
              className="inline-block w-3.5 h-1.5 rounded-full"
              style={{ backgroundColor: curveColor }}
            />
            <span className="font-bold text-[#17212B]">Component Measured</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-1 bg-[#17212B] border-t border-dashed border-[#17212B]" />
            <span className="text-[#5B6B7A] font-semibold">Lot Norm Mean ({lotMean.toFixed(1)}&mu;A)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-1 bg-[#D9363E]" />
            <span className="text-[#D9363E] font-semibold">Limit Threshold</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="text-[#5B6B7A]">
              {isInspecting ? `Inspecting T+${Math.round(activeInspectHour)}h:` : 'Delta Drift:'}
            </span>
            <b className={`font-bold tabular-nums ${isInspecting ? 'text-[#0E88D3]' : isSimulating ? 'text-[#F47216]' : 'text-[#17212B]'}`}>
              {displayedDelta.toFixed(2)} &micro;A
            </b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[#5B6B7A]">
              {isInspecting ? 'Z-Score @ Probe:' : 'Lot Z-Score:'}
            </span>
            <b
              className={`tabular-nums ${
                displayedZ != null && Math.abs(displayedZ) >= 3
                  ? 'text-[#D9363E] font-bold'
                  : displayedZ != null && Math.abs(displayedZ) >= 2
                  ? 'text-[#C58A00] font-bold'
                  : 'text-[#168A5B] font-bold'
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
