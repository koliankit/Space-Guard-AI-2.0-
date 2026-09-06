import { useState, useEffect } from 'react'
import type { SubsystemStatus } from '../../types'

const STATUS_COLOR: Record<string, string> = {
  safe: '#00FF87',
  monitor: '#FFB020',
  reject: '#FF334B',
  idle: '#1B3557',
}

interface SatelliteHUDProps {
  subsystems: SubsystemStatus[]
  selectedKey: string | null
  hoveredKey: string | null
  isAutoRotate: boolean
  isExploded: boolean
  isXray: boolean
  onToggleRotate: () => void
  onToggleExploded: () => void
  onToggleXray: () => void
  onSetCameraPreset: (preset: 'iso' | 'nadir' | 'solar' | 'hga' | 'propulsion') => void
  onSelectSubsystem: (key: string) => void
  onResetView: () => void
  onRotateLeft?: () => void
  onRotateRight?: () => void
  onTiltUp?: () => void
  onTiltDown?: () => void
  onDeselect?: () => void
}

export default function SatelliteHUD({
  subsystems,
  selectedKey,
  hoveredKey,
  isAutoRotate,
  isExploded,
  isXray,
  onToggleRotate,
  onToggleExploded,
  onToggleXray,
  onSetCameraPreset,
  onSelectSubsystem,
  onResetView,
  onRotateLeft,
  onRotateRight,
  onTiltUp,
  onTiltDown,
  onDeselect,
}: SatelliteHUDProps) {
  const [activePreset, setActivePreset] = useState<'iso' | 'nadir' | 'solar' | 'hga' | 'propulsion'>('iso')
  const [equalizerBars, setEqualizerBars] = useState<number[]>(Array(24).fill(20))

  // Simulate animated live telemetry frequency spectrum bars
  useEffect(() => {
    const interval = setInterval(() => {
      setEqualizerBars(
        Array.from({ length: 24 }, () => Math.floor(15 + Math.random() * 70))
      )
    }, 180)
    return () => clearInterval(interval)
  }, [])

  const currentKey = hoveredKey || selectedKey
  const activeSubsystem = subsystems.find((s) => s.key === currentKey)

  const handlePreset = (preset: 'iso' | 'nadir' | 'solar' | 'hga' | 'propulsion') => {
    setActivePreset(preset)
    onSetCameraPreset(preset)
  }

  // Circular gauge component
  const renderCircleGauge = (label: string, pct: number, color: string) => {
    const radius = 20
    const circ = 2 * Math.PI * radius
    const strokeDashoffset = circ - (pct / 100) * circ
    return (
      <div className="flex flex-col items-center justify-center p-0.5">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r={radius} fill="transparent" stroke="#0C2B33" strokeWidth="2.5" />
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth="3"
              strokeDasharray={circ}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            />
          </svg>
          <span className="absolute font-display font-bold text-[10px] text-white" style={{ color }}>
            {pct}%
          </span>
        </div>
        <span className="font-mono text-[8px] uppercase tracking-wider text-muted mt-0.5">{label}</span>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 select-none overflow-hidden">
      {/* Central Circular Radar Reticle (Pointer-events none) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <div className="relative w-[340px] h-[340px] rounded-full border border-accent/35 flex items-center justify-center">
          <div className="w-[260px] h-[260px] rounded-full border border-dashed border-accent/25 flex items-center justify-center" />
          <div className="absolute w-[180px] h-[180px] rounded-full border border-accent/20" />
          <div className="absolute top-0 bottom-0 w-px bg-accent/20" />
          <div className="absolute left-0 right-0 h-px bg-accent/20" />
          <div className="absolute inset-0 rounded-full radar-spinner border-t-2 border-accent/60 pointer-events-none" />
          <span className="absolute top-1 font-mono text-[8px] text-accent font-bold">000&deg;</span>
          <span className="absolute right-1 font-mono text-[8px] text-accent font-bold">090&deg;</span>
          <span className="absolute bottom-1 font-mono text-[8px] text-accent font-bold">180&deg;</span>
          <span className="absolute left-1 font-mono text-[8px] text-accent font-bold">270&deg;</span>
        </div>
      </div>

      {/* --- Top Bar: Viewport Actions, Rotation Controls & Telemetry Dials --- */}
      <div className="flex items-start justify-between gap-2 relative z-20">
        {/* Left: Viewport Controls with Manual Rotation Pad */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          {/* Auto-Rotate Toggle */}
          <button
            type="button"
            onClick={onToggleRotate}
            className={`font-mono text-[10.5px] px-2.5 py-1 rounded border transition-all flex items-center gap-1.5 ${
              isAutoRotate
                ? 'bg-accent/20 border-accent text-accent shadow-neon-green font-bold'
                : 'hud-glass-interactive border-line text-muted hover:text-white'
            }`}
            title="Toggle Automatic Satellite Orbit Rotation"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isAutoRotate ? 'bg-accent dot-pulse' : 'bg-muted'}`} />
            {isAutoRotate ? 'AUTOROTATE: ON' : 'PAUSED'}
          </button>

          {/* Manual Directional Rotation Buttons */}
          <div className="flex items-center gap-0.5 bg-bg/70 border border-line rounded p-0.5 backdrop-blur-sm">
            <button
              type="button"
              onClick={onRotateLeft}
              className="px-2 py-0.5 font-mono text-xs text-muted hover:text-accent hover:bg-accent/15 rounded transition-all"
              title="Rotate Satellite Left (Orbit Left)"
            >
              &#8634; LEFT
            </button>
            <button
              type="button"
              onClick={onRotateRight}
              className="px-2 py-0.5 font-mono text-xs text-muted hover:text-accent hover:bg-accent/15 rounded transition-all"
              title="Rotate Satellite Right (Orbit Right)"
            >
              RIGHT &#8635;
            </button>
            <button
              type="button"
              onClick={onTiltUp}
              className="px-1.5 py-0.5 font-mono text-xs text-muted hover:text-accent hover:bg-accent/15 rounded transition-all"
              title="Tilt Camera Up"
            >
              &#9650;
            </button>
            <button
              type="button"
              onClick={onTiltDown}
              className="px-1.5 py-0.5 font-mono text-xs text-muted hover:text-accent hover:bg-accent/15 rounded transition-all"
              title="Tilt Camera Down"
            >
              &#9660;
            </button>
          </div>

          {/* Exploded Mode */}
          <button
            type="button"
            onClick={onToggleExploded}
            className={`font-mono text-[10.5px] px-2.5 py-1 rounded border transition-all flex items-center gap-1.5 ${
              isExploded
                ? 'bg-lime/20 border-lime text-lime shadow-neon-lime font-bold'
                : 'hud-glass-interactive border-line text-muted hover:text-white'
            }`}
            title="Explode 3D Subsystems Outward for Internal Equipment Inspection"
          >
            &#10022; EXPLODED {isExploded ? 'ACTIVE' : 'OFF'}
          </button>

          {/* X-Ray Mode */}
          <button
            type="button"
            onClick={onToggleXray}
            className={`font-mono text-[10.5px] px-2.5 py-1 rounded border transition-all flex items-center gap-1.5 ${
              isXray
                ? 'bg-accent/20 border-accent text-white shadow-neon-green font-bold'
                : 'hud-glass-interactive border-line text-muted hover:text-white'
            }`}
            title="X-Ray Structural Mode: Translucent Outer Thermal Skin"
          >
            &#9671; X-RAY {isXray ? 'ON' : 'OFF'}
          </button>

          {/* Reset View */}
          <button
            type="button"
            onClick={onResetView}
            className="hud-glass-interactive border-line text-muted hover:text-accent font-mono text-[10.5px] px-2 py-1 rounded border"
            title="Reset Orbit Camera Angle & Distance"
          >
            &#8630; RESET
          </button>
        </div>

        {/* Center-Top: Scanning Header Label + Mouse Interaction Hint */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="hud-glass px-3.5 py-0.5 rounded border border-accent/40 text-center font-display font-bold text-xs tracking-widest text-accent text-glow-green">
            &lt; 3D SATELLITE DIGITAL TWIN &gt;
          </div>
          <div className="font-mono text-[8.5px] text-muted tracking-wider bg-bg/80 px-2 py-0.5 rounded border border-line/60">
            DRAG MOUSE TO ROTATE 360&deg; &bull; SCROLL TO ZOOM &bull; CLICK ANY PART TO INSPECT
          </div>
        </div>

        {/* Right: Technical Telemetry & Circular Metric Dials */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hud-glass px-2 py-0.5 rounded border border-line flex gap-2">
            {renderCircleGauge('PWR', 98, '#00F0FF')}
            {renderCircleGauge('SOLAR', 100, '#00FF87')}
            {renderCircleGauge('AOCS', 99, '#00F0FF')}
            {renderCircleGauge('THM', 45, '#FFB020')}
          </div>

          <div className="hud-glass px-2.5 py-1 rounded border border-line text-right font-mono text-[10px]">
            <div className="flex items-center gap-1.5 justify-end text-accent font-bold font-display tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-accent led" />
              ORBITAL TELEMETRY
            </div>
            <div className="text-muted text-[9px] mt-0.5">
              ALT: <span className="text-white font-bold">520.4 KM</span> &bull; VEL: <span className="text-white font-bold">7.61 KM/S</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Tactical Subsystem Callouts (Left & Right Flanks) & Center Inspector --- */}
      <div className="flex items-center justify-between w-full pointer-events-none px-2">
        {/* Left Callouts */}
        <div className="flex flex-col gap-1.5 font-mono text-[10px] pointer-events-auto max-w-[190px]">
          <div
            onClick={() => onSelectSubsystem('FC')}
            className={`cursor-pointer hud-glass px-2.5 py-1 rounded border transition-all ${
              currentKey === 'FC' ? 'border-accent shadow-neon-green text-accent font-bold bg-accent/15' : 'border-line text-muted hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-accent font-display font-bold">[FC]</span>
              <span className="text-[9px] text-muted">&gt;&gt;&gt;</span>
            </div>
            <div className="text-[9.5px] text-slate-200">FLIGHT COMPUTER</div>
            <div className="text-[8.5px] text-dim">RAD-HARDENED OBC</div>
          </div>

          <div
            onClick={() => onSelectSubsystem('PWR')}
            className={`cursor-pointer hud-glass px-2.5 py-1 rounded border transition-all ${
              currentKey === 'PWR' ? 'border-accent shadow-neon-green text-accent font-bold bg-accent/15' : 'border-line text-muted hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-accent font-display font-bold">[PWR]</span>
              <span className="text-[9px] text-muted">&gt;&gt;&gt;</span>
            </div>
            <div className="text-[9.5px] text-slate-200">POWER SYSTEM</div>
            <div className="text-[8.5px] text-dim">PCDU REGULATOR</div>
          </div>

          <div
            onClick={() => onSelectSubsystem('BAT')}
            className={`cursor-pointer hud-glass px-2.5 py-1 rounded border transition-all ${
              currentKey === 'BAT' ? 'border-accent shadow-neon-green text-accent font-bold bg-accent/15' : 'border-line text-muted hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-accent font-display font-bold">[BAT]</span>
              <span className="text-[9px] text-muted">&gt;&gt;&gt;</span>
            </div>
            <div className="text-[9.5px] text-slate-200">BATTERY MODULE</div>
            <div className="text-[8.5px] text-dim">LI-ION 8-CELL PACK</div>
          </div>
        </div>

        {/* Center: Selected Subsystem Tactical Inspector Card */}
        {activeSubsystem && (
          <div className="hud-glass border border-accent/60 rounded-lg p-3 max-w-sm pointer-events-auto shadow-neon-green backdrop-blur-md animate-modalin reticle-corner relative">
            {/* Close / Deselect Button */}
            {onDeselect && (
              <button
                type="button"
                onClick={onDeselect}
                className="absolute top-2 right-2 text-muted hover:text-white font-mono text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-white/10"
                title="Deselect Subsystem"
              >
                &#10005;
              </button>
            )}

            <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-line pr-5">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: STATUS_COLOR[activeSubsystem.status],
                    boxShadow: `0 0 10px ${STATUS_COLOR[activeSubsystem.status]}`,
                  }}
                />
                <span className="font-display font-bold text-sm tracking-wider text-white">
                  {activeSubsystem.name}
                </span>
                <span className="font-mono text-[10px] bg-accent/20 text-accent font-bold px-1.5 py-0.5 rounded border border-accent/40">
                  {activeSubsystem.key}
                </span>
              </div>
              <span
                className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${STATUS_COLOR[activeSubsystem.status]}20`,
                  color: STATUS_COLOR[activeSubsystem.status],
                  border: `1px solid ${STATUS_COLOR[activeSubsystem.status]}60`,
                }}
              >
                {activeSubsystem.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2 font-mono text-[10px]">
              <div className="bg-bg/80 p-1.5 rounded border border-line">
                <div className="text-muted text-[8.5px]">COMPONENTS</div>
                <div className="text-white font-bold text-xs">{activeSubsystem.count}</div>
              </div>
              <div className="bg-bg/80 p-1.5 rounded border border-line">
                <div className="text-muted text-[8.5px]">AVG RISK</div>
                <div className="text-accent font-bold text-xs">
                  {Math.round(activeSubsystem.avg_risk)}/100
                </div>
              </div>
              <div className="bg-bg/80 p-1.5 rounded border border-line">
                <div className="text-muted text-[8.5px]">TOP FLAG</div>
                <div className="text-white font-bold text-[10px] truncate" title={activeSubsystem.top_component ?? 'Nominal'}>
                  {activeSubsystem.top_component ?? 'NONE'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Callouts */}
        <div className="flex flex-col gap-1.5 font-mono text-[10px] pointer-events-auto max-w-[190px] text-right">
          <div
            onClick={() => onSelectSubsystem('SOLAR')}
            className={`cursor-pointer hud-glass px-2.5 py-1 rounded border transition-all ${
              currentKey === 'SOLAR' ? 'border-accent shadow-neon-green text-accent font-bold bg-accent/15' : 'border-line text-muted hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted">&lt;&lt;&lt;</span>
              <span className="text-accent font-display font-bold">[SOLAR]</span>
            </div>
            <div className="text-[9.5px] text-emerald-100">SOLAR WINGS</div>
            <div className="text-[8.5px] text-dim">DUAL ARTICULATED ARRAY</div>
          </div>

          <div
            onClick={() => onSelectSubsystem('COM')}
            className={`cursor-pointer hud-glass px-2.5 py-1 rounded border transition-all ${
              currentKey === 'COM' ? 'border-accent shadow-neon-green text-accent font-bold bg-accent/15' : 'border-line text-muted hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted">&lt;&lt;&lt;</span>
              <span className="text-accent font-display font-bold">[COM]</span>
            </div>
            <div className="text-[9.5px] text-emerald-100">COMMUNICATIONS</div>
            <div className="text-[8.5px] text-dim">HGA DISH &amp; S/X-BAND</div>
          </div>

          <div
            onClick={() => onSelectSubsystem('NAV')}
            className={`cursor-pointer hud-glass px-2.5 py-1 rounded border transition-all ${
              currentKey === 'NAV' ? 'border-accent shadow-neon-green text-accent font-bold bg-accent/15' : 'border-line text-muted hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted">&lt;&lt;&lt;</span>
              <span className="text-accent font-display font-bold">[NAV]</span>
            </div>
            <div className="text-[9.5px] text-emerald-100">NAVIGATION AOCS</div>
            <div className="text-[8.5px] text-dim">STAR TRACKERS &amp; IMU</div>
          </div>
        </div>
      </div>

      {/* --- Bottom Bar: Equalizer Frequency Spectrum + Camera Presets + Subsystem Quick Pills --- */}
      <div className="flex flex-col gap-2 relative z-20">
        {/* Equalizer Frequency Telemetry Bar Meter */}
        <div className="flex items-end justify-center gap-1 h-6 px-4 pointer-events-none">
          {equalizerBars.map((val, idx) => (
            <div
              key={idx}
              className="w-1.5 rounded-t transition-all duration-150"
              style={{
                height: `${val}%`,
                backgroundColor: idx % 3 === 0 ? '#00FF87' : idx % 3 === 1 ? '#00F0FF' : '#38BDF8',
                boxShadow: `0 0 6px ${idx % 3 === 0 ? '#00FF87' : '#00F0FF'}`,
                opacity: 0.85,
              }}
            />
          ))}
        </div>

        {/* Camera Preset Selector */}
        <div className="flex items-center gap-1.5 justify-center pointer-events-auto">
          <span className="font-mono text-[9px] text-muted tracking-wider uppercase mr-1">VIEW:</span>
          {(
            [
              { id: 'iso', label: 'ISOMETRIC' },
              { id: 'nadir', label: 'NADIR / OPTICAL' },
              { id: 'solar', label: 'SOLAR WINGS' },
              { id: 'hga', label: 'HGA DISH' },
              { id: 'propulsion', label: 'PROPULSION' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePreset(preset.id)}
              className={`font-mono text-[10px] px-2.5 py-0.5 rounded border transition-all ${
                activePreset === preset.id
                  ? 'bg-accent/20 border-accent text-accent font-bold shadow-neon-green'
                  : 'hud-glass border-line text-muted hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Subsystems Carousel / Quick Target Pills */}
        {subsystems.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto py-1 px-2 hud-glass rounded-lg border border-line pointer-events-auto max-w-full">
            <span className="font-mono text-[9px] text-accent tracking-wider uppercase px-1 whitespace-nowrap font-bold">
              SUBSYSTEMS:
            </span>
            {subsystems.map((sub) => {
              const isCurr = sub.key === (selectedKey || hoveredKey)
              const dotColor = STATUS_COLOR[sub.status] ?? STATUS_COLOR.idle
              return (
                <button
                  key={sub.key}
                  type="button"
                  onClick={() => onSelectSubsystem(sub.key)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-all border ${
                    isCurr
                      ? 'bg-accent/20 border-accent text-white font-bold shadow-neon-green'
                      : 'border-transparent text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
                  />
                  <span>{sub.key}</span>
                  {sub.status === 'reject' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-reject led" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
