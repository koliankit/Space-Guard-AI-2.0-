import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { ComponentOut } from '../../types'
import { sounds } from '../../utils/soundEffects'

const STAGES = [0, 24, 96, 168, 216]

export default function TelemetryChart({ component }: { component: ComponentOut | null }) {
  const [stageH, setStageH] = useState<number>(216)
  const [animProgress, setAnimProgress] = useState<number>(1)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [simSpeed, setSimSpeed] = useState<0.5 | 1 | 2>(1) // 0.5x (16s), 1x (8s), 2x (4s)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const [chartDims, setChartDims] = useState<{ width: number; height: number }>({ width: 920, height: 460 })

  const pathRef = useRef<SVGPathElement>(null)
  const [pathLength, setPathLength] = useState<number>(850)
  const animFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const elapsedOffsetRef = useRef<number>(0)
  const lastPingHourRef = useRef<number>(-1)

  // Measure container dimensions dynamically to fill 100% of the newly available space
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
  const padT = 28
  const padB = 48

  // Fallback defaults if no component is selected
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

  const allVals = [v0, v24, v96, v168, limitVal, bandLow, bandHigh, predFuture]
  const minY = Math.max(0, Math.min(...allVals) * 0.78)
  const maxY = Math.max(...allVals) * 1.15

  const maxHorizon = 216
  const xFor = (h: number) => padL + (h / maxHorizon) * (W - padL - padR)
  const yFor = (v: number) => H - padB - ((v - minY) / (maxY - minY || 1)) * (H - padT - padB)

  // Stage points
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

  // Smooth Catmull-Rom spline curve for component
  const smoothCurve = useMemo(() => {
    if (shown.length < 2) return ''
    const mapped = shown.map(([h, v]) => ({ x: xFor(h), y: yFor(v) }))
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
  }, [shown, minY, maxY, W, H])

  const lastPoint = shown[shown.length - 1]

  const areaD = useMemo(() => {
    if (shown.length <= 1 || !smoothCurve || !lastPoint) return ''
    return `${smoothCurve} L ${xFor(lastPoint[0])} ${H - padB} L ${xFor(shown[0][0])} ${H - padB} Z`
  }, [smoothCurve, shown, lastPoint, H, padB])

  // Lot peer baseline curve
  const baselineCurve = useMemo(() => {
    const baselinePts: [number, number][] = [
      [0, v0 * 0.96],
      [24, v0 + (lotMean - v0) * 0.2],
      [96, v0 + (lotMean - v0) * 0.65],
      [168, lotMean],
      [216, lotMean + (lotMean - v0) * 0.08],
    ].filter(([h]) => h <= stageH) as [number, number][]

    if (baselinePts.length < 2) return ''
    const mapped = baselinePts.map(([h, v]) => ({ x: xFor(h), y: yFor(v) }))
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
  }, [v0, lotMean, stageH, minY, maxY, W, H])

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
  }, [animProgress, pathLength, v0, minY, maxY, W, H])

  // Simulated live instantaneous values calculated along probe trajectory
  const simHour = useMemo(() => {
    const rawH = ((tipPoint.x - padL) / (W - padL - padR)) * maxHorizon
    return Math.min(stageH, Math.max(0, rawH))
  }, [tipPoint.x, stageH, padL, padR, W])

  const simVal = useMemo(() => {
    const fraction = (H - padB - tipPoint.y) / (H - padT - padB || 1)
    const val = minY + fraction * (maxY - minY)
    return Math.max(minY, Math.min(maxY, val))
  }, [tipPoint.y, minY, maxY, H, padT, padB])

  // Simulation speed & duration (8000ms base for clear real-time monitoring)
  const baseDuration = 8000 / simSpeed

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
      startSweepAnimation(false)
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setIsPaused(true)
    }
  }, [isPaused, startSweepAnimation])

  // Trigger sweep on component or stage change
  useEffect(() => {
    if (component?.component_id) {
      startSweepAnimation(true)
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [component?.component_id, stageH, startSweepAnimation])

  // Measure path length
  useEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength()
      if (len > 0 && Math.abs(len - pathLength) > 1) {
        setPathLength(len)
      }
    }
  }, [component, stageH, pathLength, smoothCurve])

  // Audio radar pings at milestone intervals
  useEffect(() => {
    if (!isSimulating) return
    for (const h of [0, 24, 96, 168, 216]) {
      if (h <= stageH && simHour >= h && lastPingHourRef.current < h) {
        lastPingHourRef.current = h
        sounds.playPing()
        break
      }
    }
  }, [simHour, isSimulating, stageH])

  // Dynamic spectrogram energy equalizer bars
  const numSpectrumBars = useMemo(() => {
    return Math.min(60, Math.max(32, Math.floor((W - padL - padR) / 18)))
  }, [W, padL, padR])

  const spectrumBars = useMemo(() => {
    return Array.from({ length: numSpectrumBars }, (_, i) => {
      const wave = isSimulating && !isPaused ? Math.sin(animProgress * Math.PI * 6 + i * 0.35) * 6 : 0
      const base = Math.abs(Math.sin((i / numSpectrumBars) * Math.PI * 3.4)) * 20 + 6
      return Math.min(Math.max(4, base + wave), 26)
    })
  }, [isSimulating, isPaused, animProgress, numSpectrumBars])

  const isRej = component?.status === 'reject'
  const isMon = component?.status === 'monitor'
  const curveColor = isRej ? '#EF4444' : isMon ? '#F59E0B' : '#10B981'

  // Live interpolated readouts in sync with sweep (matching Module A & B)
  const finalDelta = (component?.v168 ?? 0) - (component?.v0 ?? 0)
  const displayedDelta = animProgress >= 1 ? finalDelta : simVal - v0
  const finalZ = component?.z168 ?? 0
  const displayedZ = animProgress >= 1 ? finalZ : (simVal - lotMean) / (lotStd || 1)
  const marginToSpec = component ? component.limit_ua - simVal : 0

  if (!component) {
    // Multi-channel spacecraft bus waveforms when idle
    const busPts1 = Array.from({ length: 36 }, (_, i) => {
      const x = padL + (i / 35) * (W - padL - padR)
      const y = H / 2 - 40 + Math.sin(i * 0.65) * 28 + Math.cos(i * 1.3) * 12
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')

    const busPts2 = Array.from({ length: 36 }, (_, i) => {
      const x = padL + (i / 35) * (W - padL - padR)
      const y = H / 2 + 40 + Math.cos(i * 0.55) * 26 + Math.sin(i * 1.1) * 14
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')

    return (
      <div className="bg-[#0B1120] p-4 md:p-5 rounded-xl border border-slate-800 relative overflow-hidden font-sans w-full flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-sm md:text-base font-bold font-display tracking-wider uppercase text-amber-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 led" />
            Burn-In Waveform Telemetry Oscilloscope (Full Spectrum)
          </h3>
          <span className="font-mono text-xs text-slate-300 tracking-wider">
            CHANNEL: <span className="text-emerald-400 font-bold">OSC-CH1 / CH2 / CH3</span>
          </span>
        </div>
        <div ref={containerRef} className="w-full flex-1 min-h-[440px]">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full block bg-[#060B16] rounded-xl border border-slate-800 select-none">
            {/* Reticle Grid */}
            {[0.2, 0.4, 0.6, 0.8].map((pct, i) => (
              <line key={`h-${i}`} x1={padL} y1={padT + pct * (H - padT - padB)} x2={W - padR} y2={padT + pct * (H - padT - padB)} stroke="#94A3B8" strokeOpacity="0.12" strokeDasharray="4 4" />
            ))}
            {/* Channel 1 */}
            <polyline points={busPts1} fill="none" stroke="#10B981" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.6))' }} />
            {/* Channel 2 */}
            <polyline points={busPts2} fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="4 3" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' }} />
            <text x={W / 2} y={H / 2} textAnchor="middle" className="fill-amber-300 text-xs font-mono font-bold tracking-wider">
              [ LIVE SPACECRAFT BUS STREAM &bull; SELECT COMPONENT TO INSPECT WAVEFORM ]
            </text>
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0B1120] p-4 md:p-5 rounded-xl border border-slate-800 relative overflow-hidden font-sans w-full flex flex-col gap-3 shadow-panel-subtle select-none">
      {/* Top Header & Live Sweep Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full led" style={{ backgroundColor: curveColor }} />
          <h3 className="m-0 text-sm md:text-base font-bold font-display tracking-wider uppercase text-amber-400 flex items-center gap-2">
            Burn-In Waveform Telemetry Oscilloscope
          </h3>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-100 font-bold">
            {component.component_id}
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-[#070D1A] border border-slate-800 text-slate-400">
            {component.name} &bull; {component.subsystem.toUpperCase()}
          </span>
        </div>

        {/* Live Sweep Playback & Horizon Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Playback Controls & Speed Toggle */}
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
                onClick={() => startSweepAnimation(true)}
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

            {/* Live Timestamp Indicator */}
            {isSimulating && (
              <span className="text-[10px] font-mono font-bold text-emerald-400 px-1.5 animate-pulse">
                {isPaused ? '[PAUSED]' : `[T+${Math.round(simHour)}h]`}
              </span>
            )}
          </div>

          {/* Stage Scrubbing Selectors */}
          <div className="flex items-center gap-1 bg-[#050914] p-1 rounded-lg border border-slate-800">
            <span className="text-xs font-mono text-slate-400 px-1.5 uppercase font-bold">Horizon:</span>
            {STAGES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setStageH(h)}
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

      {/* Main Full-Width SVG Oscilloscope Canvas */}
      <div
        ref={containerRef}
        className={`relative rounded-xl overflow-hidden border border-slate-800 bg-[#040812] w-full transition-all duration-300 ${
          isExpanded
            ? 'min-h-[620px] md:min-h-[700px] lg:min-h-[760px]'
            : 'min-h-[440px] md:min-h-[480px] lg:min-h-[520px]'
        }`}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full block"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <filter id="telemetryGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="steelGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
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

            <linearGradient id="specGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#64748B" stopOpacity="0.2" />
            </linearGradient>

            {/* Sweep Clip Path so area fill follows the leading probe in real-time */}
            <clipPath id="sweepClipTelemetry">
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
              strokeOpacity="0.25"
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
              strokeWidth={2.0}
              filter="url(#steelGlow)"
              strokeDasharray="4 3"
              opacity={0.85}
            />
          )}

          {/* Under-Curve Gradient Fill (Clipped to Sweep Probe) */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#telemetryAreaGrad)"
              clipPath="url(#sweepClipTelemetry)"
            />
          )}

          {/* Primary Measured Component Current Waveform Spline (Hidden SVG path for coordinate extraction) */}
          {smoothCurve && (
            <path
              ref={pathRef}
              d={smoothCurve}
              fill="none"
              stroke="transparent"
              strokeWidth={1}
            />
          )}

          {/* Visible Spline Clipped to Animated Probe Progress */}
          {smoothCurve && (
            <path
              d={smoothCurve}
              fill="none"
              stroke={curveColor}
              strokeWidth={3}
              filter="url(#telemetryGlow)"
              clipPath="url(#sweepClipTelemetry)"
            />
          )}

          {/* Discrete Milestone Markers */}
          {shown.map(([h, v]) => {
            const isFuture = h > 168
            const isPast = animProgress >= 1 || simHour >= h
            if (!isPast) return null
            return (
              <g key={h}>
                <circle
                  cx={xFor(h)}
                  cy={yFor(v)}
                  r={5.5}
                  fill="#060B16"
                  stroke={isFuture ? '#F59E0B' : curveColor}
                  strokeWidth={2.2}
                  filter="url(#telemetryGlow)"
                />
                <circle
                  cx={xFor(h)}
                  cy={yFor(v)}
                  r={2.5}
                  fill={isFuture ? '#F59E0B' : curveColor}
                />
                <text
                  x={xFor(h)}
                  y={yFor(v) - 10}
                  textAnchor="middle"
                  fill={isFuture ? '#F59E0B' : curveColor}
                  className="text-[10px] font-mono font-bold"
                >
                  {v.toFixed(2)} µA
                </text>
              </g>
            )
          })}

          {/* Projected Vector (+96h to 216h Future Drift) */}
          {stageH >= 168 && lastPoint && (
            <>
              <line
                x1={xFor(168)}
                y1={yFor(v168)}
                x2={xFor(216)}
                y2={yFor(predFuture)}
                stroke="#F59E0B"
                strokeWidth={2.2}
                strokeDasharray="5 3"
                clipPath="url(#sweepClipTelemetry)"
                style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.6))' }}
              />
              {animProgress >= 0.95 && (
                <text
                  x={xFor(216)}
                  y={yFor(predFuture) - 10}
                  textAnchor="end"
                  fill="#F59E0B"
                  className="text-[10px] font-mono font-bold"
                >
                  +96h Projected: {predFuture.toFixed(2)} µA
                </text>
              )}
            </>
          )}

          {/* Live Telemetry Traveling Laser Probe & Real-Time Tooltip Chip */}
          {isSimulating && (
            <g>
              {/* Vertical Laser Line passing through the probe */}
              <line
                x1={tipPoint.x}
                x2={tipPoint.x}
                y1={padT}
                y2={H - padB}
                stroke={curveColor}
                strokeWidth={1.2}
                strokeDasharray="3 2"
                opacity={0.7}
              />

              {/* Pulsing Radar Rings */}
              <circle
                cx={tipPoint.x}
                cy={tipPoint.y}
                r={10}
                fill="none"
                stroke={curveColor}
                strokeWidth={1}
                opacity={0.5}
                className="animate-ping"
              />
              <circle
                cx={tipPoint.x}
                cy={tipPoint.y}
                r={5}
                fill={curveColor}
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
              <circle
                cx={tipPoint.x}
                cy={tipPoint.y}
                r={1.8}
                fill="#FFFFFF"
              />

              {/* Floating Live Telemetry Chip above the probe */}
              <g
                transform={`translate(${Math.min(
                  W - padR - 65,
                  Math.max(padL + 65, tipPoint.x)
                )}, ${Math.max(padT + 18, tipPoint.y - 22)})`}
              >
                <rect
                  x="-62"
                  y="-13"
                  width="124"
                  height="22"
                  rx="5"
                  fill="#0B1528"
                  stroke={curveColor}
                  strokeWidth="1.4"
                  filter="drop-shadow(0 3px 6px rgba(0,0,0,0.7))"
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
                  T+{Math.round(simHour)}h: {simVal.toFixed(2)} µA
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

      {/* Live Reading Telemetry HUD Cards (Showing Real-Time Dynamic Readings as per Module A & B) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
        {/* Card 1: Live Measured Current */}
        <div className="p-2.5 rounded-xl bg-[#070D1A] border border-slate-800 flex flex-col justify-between gap-1">
          <span className="text-slate-400 text-[10.5px] uppercase font-semibold">Live Reading</span>
          <span className={`font-mono text-base font-bold tabular-nums ${isSimulating ? 'text-amber-300' : 'text-emerald-400'}`}>
            {simVal.toFixed(2)} µA
          </span>
          <span className="text-[9.5px] text-slate-400">
            {isSimulating ? `Probe at T+${Math.round(simHour)}h` : '168h end-of-test'}
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
            <span className="text-white font-bold">CH1: Component Measured Current (µA)</span>
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
            <span className="text-amber-300 font-bold">Projected Future Drift Vector</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>ADC: 24-BIT DELTA-SIGMA</span>
          <span>&bull;</span>
          <span>SAMPLE RATE: 10 KS/s</span>
          <span>&bull;</span>
          <span className="text-emerald-400 font-bold">ONLINE</span>
        </div>
      </div>
    </div>
  )
}
