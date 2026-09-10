import { useState, useEffect } from 'react'
import type { ComponentOut, SubsystemStatus } from '../../types'

const STATUS_COLOR: Record<string, string> = {
  safe: '#10B981',
  monitor: '#F59E0B',
  reject: '#EF4444',
  idle: '#94A3B8',
}

interface SatelliteHUDProps {
  subsystems: SubsystemStatus[]
  selectedKey: string | null
  hoveredKey: string | null
  selectedComponent?: ComponentOut | null
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
}: SatelliteHUDProps) {
  const [activePreset, setActivePreset] = useState<'iso' | 'nadir' | 'solar' | 'hga' | 'propulsion'>('iso')
  const [equalizerBars, setEqualizerBars] = useState<number[]>(Array(16).fill(20))

  useEffect(() => {
    const interval = setInterval(() => {
      setEqualizerBars(
        Array.from({ length: 16 }, () => Math.floor(15 + Math.random() * 70))
      )
    }, 220)
    return () => clearInterval(interval)
  }, [])

  const handlePreset = (preset: 'iso' | 'nadir' | 'solar' | 'hga' | 'propulsion') => {
    setActivePreset(preset)
    onSetCameraPreset(preset)
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 select-none overflow-hidden font-mono">
      {/* Central Circular Radar Reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="relative w-[300px] h-[300px] rounded-full border border-amber-500/20 flex items-center justify-center">
          <div className="w-[200px] h-[200px] rounded-full border border-dashed border-amber-500/15 flex items-center justify-center" />
          <div className="absolute top-0 bottom-0 w-px bg-amber-500/15" />
          <div className="absolute left-0 right-0 h-px bg-amber-500/15" />
          <div className="absolute inset-0 rounded-full radar-spinner border-t border-amber-500/40 pointer-events-none" />
        </div>
      </div>

      {/* Top Bar: Controls & Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 relative z-20">
        {/* Left: Viewport Orbit & Camera Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Auto-Rotate Toggle */}
          <button
            type="button"
            onClick={onToggleRotate}
            className={`text-[10px] px-2 py-1 rounded border transition-all flex items-center gap-1.5 ${
              isAutoRotate
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold shadow-sm'
                : 'hud-glass border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle Automatic Orbit Rotation"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isAutoRotate ? 'bg-amber-400 dot-pulse' : 'bg-slate-500'}`} />
            {isAutoRotate ? 'ROTATING' : 'PAUSED'}
          </button>

          {/* Directional Pad */}
          <div className="flex items-center gap-0.5 hud-glass rounded p-0.5 border border-slate-700/80">
            <button
              type="button"
              onClick={onRotateLeft}
              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-amber-400 rounded transition-colors"
              title="Rotate Left"
            >
              &#8634;
            </button>
            <button
              type="button"
              onClick={onRotateRight}
              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-amber-400 rounded transition-colors"
              title="Rotate Right"
            >
              &#8635;
            </button>
            <button
              type="button"
              onClick={onTiltUp}
              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-amber-400 rounded transition-colors"
              title="Tilt Up"
            >
              &#9650;
            </button>
            <button
              type="button"
              onClick={onTiltDown}
              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-amber-400 rounded transition-colors"
              title="Tilt Down"
            >
              &#9660;
            </button>
          </div>

          {/* Exploded Mode */}
          <button
            type="button"
            onClick={onToggleExploded}
            className={`text-[10px] px-2 py-1 rounded border transition-all ${
              isExploded
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                : 'hud-glass border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Explode 3D Subsystems Outward"
          >
            &#10022; {isExploded ? 'EXPLODED' : 'EXPLODE'}
          </button>

          {/* X-Ray Mode */}
          <button
            type="button"
            onClick={onToggleXray}
            className={`text-[10px] px-2 py-1 rounded border transition-all ${
              isXray
                ? 'bg-amber-500/20 border-amber-500/60 text-white font-bold'
                : 'hud-glass border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="X-Ray Translucent Skin"
          >
            &#9671; {isXray ? 'X-RAY ON' : 'X-RAY'}
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={onResetView}
            className="hud-glass border-slate-700 text-slate-400 hover:text-amber-400 text-[10px] px-2 py-1 rounded border"
            title="Reset Camera"
          >
            &#8630;
          </button>
        </div>

        {/* Right: Camera Presets */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {(
            [
              { id: 'iso', label: 'ISO' },
              { id: 'nadir', label: 'NADIR' },
              { id: 'solar', label: 'SOLAR' },
              { id: 'hga', label: 'HGA' },
              { id: 'propulsion', label: 'PROP' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePreset(preset.id)}
              className={`text-[9.5px] px-2 py-0.5 rounded border transition-all ${
                activePreset === preset.id
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold shadow-sm'
                  : 'hud-glass border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Bar: Telemetry Equalizer + Subsystem Carousel */}
      <div className="flex flex-col gap-1.5 relative z-20">
        {/* Equalizer Telemetry Signal Bar */}
        <div className="flex items-end justify-center gap-0.5 h-3 pointer-events-none opacity-60">
          {equalizerBars.map((val, idx) => (
            <div
              key={idx}
              className="w-1 rounded-t transition-all duration-200"
              style={{
                height: `${val}%`,
                backgroundColor: idx % 2 === 0 ? '#F59E0B' : '#10B981',
              }}
            />
          ))}
        </div>

        {/* Subsystems Carousel */}
        {subsystems.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto py-1 px-2 hud-glass rounded-lg border border-slate-800 pointer-events-auto max-w-full">
            <span className="text-[8.5px] text-amber-400 tracking-wider uppercase px-1 whitespace-nowrap font-bold">
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
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] whitespace-nowrap transition-all border ${
                    isCurr
                      ? 'bg-amber-500/20 border-amber-500/60 text-white font-bold shadow-sm'
                      : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span>{sub.key}</span>
                  {sub.status === 'reject' && (
                    <span className="w-1 h-1 rounded-full bg-rose-500" />
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
