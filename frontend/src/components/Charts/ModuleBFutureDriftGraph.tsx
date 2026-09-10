import React, { useState, useMemo } from 'react'
import type { ComponentOut } from '../../types'

interface ModuleBFutureDriftGraphProps {
  component: ComponentOut | null
}

export default function ModuleBFutureDriftGraph({ component }: ModuleBFutureDriftGraphProps) {
  const [activeHorizon, setActiveHorizon] = useState<216 | 264 | 336>(264)
  const [hoveredPoint, setHoveredPoint] = useState<{ hour: number; val: number; label: string } | null>(null)

  const W = 560
  const H = 220
  const padL = 46
  const padR = 28
  const padT = 20
  const padB = 40

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

  const limitVal = component.limit_ua || 50
  const v0 = component.v0
  const v24 = component.v24
  const v96 = component.v96 ?? (v0 + (v24 - v0) * 4)
  const v168 = component.v168
  const slope = component.slope || (v168 - v0) / 168
  const future264 = component.predicted_future || v168 + slope * 96

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

  // Uncertainty cone variance (+/- 1.5 sigma drift model)
  const lotStd = component.lot_std || 1.8
  const coneSpread = Math.max(2.5, lotStd * 1.6)
  const coneUpper = projectedAtHorizon + coneSpread
  const coneLower = Math.max(0, projectedAtHorizon - coneSpread)

  // Bounds for Y
  const maxVal = Math.max(limitVal * 1.12, v0, v24, v96, v168, future264, coneUpper)
  const minVal = Math.max(0, Math.min(v0, v24, v96, v168, coneLower) * 0.85)

  // Max X is active horizon (e.g. 264h or 336h)
  const maxX = Math.max(activeHorizon, breachHour && breachHour <= 336 ? breachHour + 20 : 280)

  const toX = (hour: number) => padL + (hour / maxX) * (W - padL - padR)
  const toY = (val: number) => {
    const range = maxVal - minVal || 1
    return H - padB - ((val - minVal) / range) * (H - padT - padB)
  }

  // Y-ticks
  const yTicks = [0, 10, 20, 30, 40, 50].filter((v) => v >= minVal && v <= maxVal)
  if (!yTicks.includes(limitVal)) yTicks.push(limitVal)
  yTicks.sort((a, b) => a - b)

  // Measured points (0h, 24h, 96h, 168h)
  const measuredPoints = [
    { h: 0, v: v0, label: '0h Initial' },
    { h: 24, v: v24, label: '24h Early' },
    { h: 96, v: v96, label: '96h Mid-HTOL' },
    { h: 168, v: v168, label: '168h Burn-in' },
  ]

  const measuredPathD = measuredPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.h).toFixed(1)} ${toY(p.v).toFixed(1)}`)
    .join(' ')

  // Extrapolation path from 168h to activeHorizon
  const extrapPathD = `M ${toX(168).toFixed(1)} ${toY(v168).toFixed(1)} L ${toX(activeHorizon).toFixed(1)} ${toY(projectedAtHorizon).toFixed(1)}`

  // Early prediction checkpoint (0-24h projection to 168h)
  const early168 = component.predicted168_from_early
  const earlyPredPathD = `M ${toX(24).toFixed(1)} ${toY(v24).toFixed(1)} L ${toX(168).toFixed(1)} ${toY(early168).toFixed(1)}`

  // Shaded variance cone polygon (from 168h to activeHorizon)
  const conePolygonD = `M ${toX(168).toFixed(1)} ${toY(v168).toFixed(1)} ` +
    `L ${toX(activeHorizon).toFixed(1)} ${toY(coneUpper).toFixed(1)} ` +
    `L ${toX(activeHorizon).toFixed(1)} ${toY(coneLower).toFixed(1)} Z`

  const willBreach = component.future_limit_breach || projectedAtHorizon >= limitVal
  const marginFuture = component.margin_future ?? (limitVal - projectedAtHorizon)
  const predError = component.prediction_error_168 ?? Math.abs(v168 - early168)

  return (
    <div className="bg-[#071120] border border-slate-800 rounded-xl p-3 flex flex-col gap-2 relative">
      {/* Top Header & Extrapolation Horizon Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-amber-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
            <span className={`w-2 h-2 rounded-full ${willBreach ? 'bg-rose-500 led' : 'bg-amber-400 led'}`} />
            Module B &bull; In-Flight Drift Forecasting
          </span>
          <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border ${
            willBreach
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}>
            {willBreach ? 'BREACH PREDICTED' : 'NOMINAL DRIFT'}
          </span>
        </div>

        {/* Projection Horizon Buttons */}
        <div className="flex items-center gap-1 bg-[#050B16] p-0.5 rounded border border-slate-800 font-mono text-[10px]">
          <span className="text-slate-400 px-1">HORIZON:</span>
          {([216, 264, 336] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setActiveHorizon(h)}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeHorizon === h
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              +{h - 168}h ({h}h)
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative rounded-lg border border-slate-800/80 bg-[#050B16] overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block select-none"
          style={{ minHeight: '190px' }}
        >
          <defs>
            <linearGradient id="coneGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.05" />
              <stop offset="100%" stopColor={willBreach ? '#f43f5e' : '#f59e0b'} stopOpacity="0.22" />
            </linearGradient>
            <linearGradient id="flightZoneGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.09" />
            </linearGradient>
            <pattern id="gridPatternB" width="30" height="20" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.4" strokeOpacity="0.6" />
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
            fill="#38bdf8"
            fontSize="8"
            fontFamily="monospace"
            letterSpacing="0.08em"
            opacity={0.7}
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
                  stroke={yVal === limitVal ? '#f43f5e' : '#1e293b'}
                  strokeDasharray={yVal === limitVal ? '4 3' : undefined}
                  strokeWidth={yVal === limitVal ? 1.2 : 0.6}
                  strokeOpacity={yVal === limitVal ? 0.9 : 0.8}
                />
                <text
                  x={padL - 6}
                  y={yPos + 3}
                  textAnchor="end"
                  fill={yVal === limitVal ? '#f43f5e' : '#64748b'}
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
                  stroke={h === 168 ? '#38bdf8' : h === activeHorizon ? '#f59e0b' : '#1e293b'}
                  strokeDasharray={h >= 168 ? '3 3' : undefined}
                  strokeWidth={h >= 168 ? 1 : 0.5}
                  strokeOpacity={h >= 168 ? 0.7 : 0.5}
                />
                <text
                  x={xPos}
                  y={H - padB + 14}
                  textAnchor="middle"
                  fill={h === 168 ? '#38bdf8' : h === activeHorizon ? '#f59e0b' : '#64748b'}
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
            fill="#38bdf8"
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

          {/* Predictive Uncertainty Cone */}
          <path d={conePolygonD} fill="url(#coneGrad)" />

          {/* Early Prediction Checkpoint Trace (24h -> 168h projection) */}
          <path
            d={earlyPredPathD}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity="0.6"
          />

          {/* Measured Past Telemetry Line (0h -> 168h) */}
          <path
            d={measuredPathD}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Future Extrapolation Line (168h -> Horizon) */}
          <path
            d={extrapPathD}
            fill="none"
            stroke={willBreach ? '#f43f5e' : '#f59e0b'}
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />

          {/* Nodes for Measured Points */}
          {measuredPoints.map((p) => {
            const cx = toX(p.h)
            const cy = toY(p.v)
            return (
              <g
                key={p.h}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint({ hour: p.h, val: p.v, label: p.label })}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle cx={cx} cy={cy} r="4" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                <circle cx={cx} cy={cy} r="1.5" fill="#ffffff" />
              </g>
            )
          })}

          {/* Early Prediction 168h Point & Error Delta Bar */}
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
            {/* Connecting delta line between actual 168h and predicted from 24h */}
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

          {/* Future Projection Node at Horizon */}
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

          {/* Breach Crosshair & Annotation if within visible range */}
          {breachHour && breachHour <= maxX && (
            <g transform={`translate(${toX(breachHour)}, ${toY(limitVal)})`}>
              <circle r="7" fill="none" stroke="#f43f5e" strokeWidth="1.5" className="animate-ping" opacity="0.75" />
              <circle r="5" fill="#f43f5e" fillOpacity="0.3" stroke="#f43f5e" strokeWidth="1.8" />
              <line x1="-8" y1="0" x2="8" y2="0" stroke="#f43f5e" strokeWidth="1.5" />
              <line x1="0" y1="-8" x2="0" y2="8" stroke="#f43f5e" strokeWidth="1.5" />
              <text x="0" y="-11" textAnchor="middle" fill="#f43f5e" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                BREACH T+{Math.round(breachHour)}H
              </text>
            </g>
          )}

          {/* Active Tooltip */}
          {hoveredPoint && (
            <g transform={`translate(${toX(hoveredPoint.hour)}, ${Math.max(padT + 15, toY(hoveredPoint.val) - 18)})`}>
              <rect
                x="-42"
                y="-14"
                width="84"
                height="22"
                rx="4"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
              />
              <text x="0" y="-2" textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">
                {hoveredPoint.label}
              </text>
              <text x="0" y="6" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
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

      {/* Metric Callouts & Flight Advisory Bottom Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="p-2 rounded-lg bg-[#050B16] border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase">Drift Velocity</span>
          <span className={`text-sm font-bold mt-0.5 ${slope > 0.05 ? 'text-rose-400' : 'text-amber-400'}`}>
            {(slope * 1000).toFixed(2)} <span className="text-[10px] font-normal text-slate-400">nA/hr</span>
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#050B16] border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase">Early Pred Error</span>
          <span className="text-sm font-bold text-sky-300 mt-0.5">
            &plusmn;{predError.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">&mu;A</span>
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#050B16] border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase">+{activeHorizon - 168}h Projection</span>
          <span className={`text-sm font-bold mt-0.5 ${willBreach ? 'text-rose-400 font-bold' : 'text-slate-100'}`}>
            {projectedAtHorizon.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">&mu;A</span>
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#050B16] border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase">Future Margin</span>
          <span className={`text-sm font-bold mt-0.5 ${marginFuture < 5 ? 'text-rose-400' : marginFuture < 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {marginFuture.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">&mu;A</span>
          </span>
        </div>
      </div>
    </div>
  )
}
