import { useState, useEffect } from 'react'
import type { ComponentOut, SubsystemStatus } from '../../types'

const STATUS_COLOR: Record<string, string> = {
  safe: '#10B981',
  monitor: '#F59E0B',
  reject: '#EF4444',
  idle: '#38BDF8',
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
  selectedComponent,
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
  const [equalizerBars, setEqualizerBars] = useState<number[]>(Array(16).fill(20))

  useEffect(() => {
    const interval = setInterval(() => {
      setEqualizerBars(
        Array.from({ length: 16 }, () => Math.floor(15 + Math.random() * 70))
      )
    }, 220)
    return () => clearInterval(interval)
  }, [])

  const currentKey = hoveredKey || selectedKey
  const activeSubsystem = subsystems.find((s) => s.key === currentKey)

  const handlePreset = (preset: 'iso' | 'nadir' | 'solar' | 'hga' | 'propulsion') => {
    setActivePreset(preset)
    onSetCameraPreset(preset)
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 select-none overflow-hidden font-mono">
      {/* Central Circular Radar Reticle (Subtle) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="relative w-[300px] h-[300px] rounded-full border border-cyan/30 flex items-center justify-center">
          <div className="w-[200px] h-[200px] rounded-full border border-dashed border-cyan/20 flex items-center justify-center" />
          <div className="absolute top-0 bottom-0 w-px bg-cyan/15" />
          <div className="absolute left-0 right-0 h-px bg-cyan/15" />
          <div className="absolute inset-0 rounded-full radar-spinner border-t border-cyan/50 pointer-events-none" />
        </div>
      </div>

      {/* --- Top Bar: Controls & Presets --- */}
      <div className="flex flex-wrap items-center justify-between gap-2 relative z-20">
        {/* Left: Viewport Orbit & Camera Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Auto-Rotate Toggle */}
          <button
            type="button"
            onClick={onToggleRotate}
            className={`text-[10px] px-2 py-1 rounded border transition-all flex items-center gap-1.5 ${
              isAutoRotate
                ? 'bg-cyan/20 border-cyan text-cyan font-bold shadow-neon-cyan'
                : 'hud-glass border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle Automatic Orbit Rotation"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isAutoRotate ? 'bg-cyan dot-pulse' : 'bg-slate-500'}`} />
            {isAutoRotate ? 'ROTATING' : 'PAUSED'}
          </button>

          {/* Directional Pad */}
          <div className="flex items-center gap-0.5 hud-glass rounded p-0.5 border border-slate-700/80">
            <button
              type="button"
              onClick={onRotateLeft}
              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-cyan rounded transition-colors"
              title="Rotate Left"
            >
              &#8634;
            </button>
            <button
              type="button"
              onClick={onRotateRight}
              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-cyan rounded transition-colors"
              title="Rotate Right"
            >
              &#8635;
            </button>
            <button
              type="button"
              onClick={onTiltUp}
              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-cyan rounded transition-colors"
              title="Tilt Up"
            >
              &#9650;
            </button>
            <button
              type="button"
              onClick={onTiltDown}
              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-cyan rounded transition-colors"
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
                ? 'bg-cyan/20 border-cyan text-white font-bold'
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
            className="hud-glass border-slate-700 text-slate-400 hover:text-cyan text-[10px] px-2 py-1 rounded border"
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
                  ? 'bg-cyan/20 border-cyan text-cyan font-bold shadow-neon-cyan'
                  : 'hud-glass border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- Center: TARGET COMPONENT HUD CARD (When Component Available) --- */}
      <div className="flex items-start justify-between w-full pointer-events-none my-auto">
        {/* Active Selected Component Telemetry Overlay */}
        {selectedComponent ? (
          <div className="hud-glass border border-cyan/50 rounded-lg p-3 max-w-sm pointer-events-auto shadow-neon-cyan backdrop-blur-md animate-modalin reticle-corner">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan led" />
                <span className="text-[10px] uppercase font-display font-bold tracking-wider text-cyan">
                  TARGET COMPONENT IN 3D
                </span>
              </div>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                  selectedComponent.status === 'reject'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                    : selectedComponent.status === 'monitor'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                }`}
              >
                {selectedComponent.status.toUpperCase()}
              </span>
            </div>

            <div className="text-base font-bold text-white tracking-wide mb-1">
              {selectedComponent.component_id}
            </div>

            <div className="text-[10px] text-cyan mb-2 font-medium">
              Subsystem: <b className="text-white">[{selectedComponent.subsystem}]</b> {selectedComponent.subsystem_name} &bull; Lot: {selectedComponent.lot_id}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] mb-2.5">
              <div>
                <span className="text-slate-400 text-[9px] block">168h Leakage:</span>
                <b className={selectedComponent.status === 'reject' ? 'text-rose-400' : 'text-slate-100'}>
                  {selectedComponent.v168.toFixed(2)} &micro;A
                </b>
                <span className="text-[8.5px] text-slate-500 ml-1">/ {selectedComponent.limit_ua.toFixed(0)} &micro;A</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block">Lot Mean &amp; z-Score:</span>
                <b className={Math.abs(selectedComponent.z168) >= 2.5 ? 'text-rose-400' : Math.abs(selectedComponent.z168) >= 1.8 ? 'text-amber-400' : 'text-slate-200'}>
                  {selectedComponent.lot_mean != null ? `${selectedComponent.lot_mean.toFixed(1)} µA` : '--'} ({selectedComponent.z168 > 0 ? '+' : ''}{selectedComponent.z168.toFixed(2)}&sigma;)
                </b>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block">Early Pred 168h:</span>
                <b className="text-cyan font-semibold">{selectedComponent.predicted168_from_early.toFixed(2)} &micro;A</b>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block">Future +96h (264h):</span>
                <b className={selectedComponent.predicted_future > selectedComponent.limit_ua ? 'text-rose-400 font-bold' : 'text-amber-300 font-semibold'}>
                  {selectedComponent.predicted_future.toFixed(2)} &micro;A
                </b>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectSubsystem(selectedComponent.subsystem)}
              className="w-full text-[10px] font-display font-bold uppercase tracking-wider py-1 px-2 rounded bg-cyan/15 border border-cyan/40 text-cyan hover:bg-cyan hover:text-black transition-all flex items-center justify-center gap-1.5 shadow-neon-cyan"
            >
              <span>&#8982;</span> LOCK &amp; FOCUS [{selectedComponent.subsystem}] IN 3D
            </button>
          </div>
        ) : (
          <div className="hud-glass px-2.5 py-1.5 rounded border border-slate-700/60 text-[10px] text-slate-400 pointer-events-auto flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan/60" />
            <span>Select any component from the ledger to target on 3D spacecraft twin.</span>
          </div>
        )}

        {/* Selected Subsystem Inspector Card (if different or specifically clicked) */}
        {activeSubsystem && (!selectedComponent || selectedComponent.subsystem !== activeSubsystem.key) && (
          <div className="hud-glass border border-slate-700 rounded-lg p-2.5 max-w-xs pointer-events-auto shadow-md relative animate-modalin">
            {onDeselect && (
              <button
                type="button"
                onClick={onDeselect}
                className="absolute top-1.5 right-1.5 text-slate-400 hover:text-white text-xs w-4 h-4 flex items-center justify-center"
              >
                &#10005;
              </button>
            )}
            <div className="flex items-center gap-2 pb-1 border-b border-slate-700/60 mb-1.5 pr-4">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: STATUS_COLOR[activeSubsystem.status] }}
              />
              <span className="font-bold text-xs text-white truncate">{activeSubsystem.name}</span>
              <span className="text-[9px] px-1 rounded bg-slate-800 text-cyan">[{activeSubsystem.key}]</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[9.5px]">
              <div>Components: <b className="text-white">{activeSubsystem.count}</b></div>
              <div>Avg Risk: <b className="text-cyan">{Math.round(activeSubsystem.avg_risk)}/100</b></div>
              <div className="col-span-2 text-slate-400 truncate">
                Top Flag: <b className="text-white">{activeSubsystem.top_component ?? 'Nominal'}</b>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- Bottom Bar: Telemetry Equalizer + Subsystem Pills --- */}
      <div className="flex flex-col gap-1.5 relative z-20">
        {/* Equalizer Telemetry Signal Bar (Compact) */}
        <div className="flex items-end justify-center gap-0.5 h-3 pointer-events-none opacity-60">
          {equalizerBars.map((val, idx) => (
            <div
              key={idx}
              className="w-1 rounded-t transition-all duration-200"
              style={{
                height: `${val}%`,
                backgroundColor: idx % 2 === 0 ? '#00F0FF' : '#10B981',
              }}
            />
          ))}
        </div>

        {/* Subsystems Carousel / Quick Target Pills */}
        {subsystems.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto py-1 px-2 hud-glass rounded-lg border border-slate-800 pointer-events-auto max-w-full">
            <span className="text-[8.5px] text-cyan tracking-wider uppercase px-1 whitespace-nowrap font-bold">
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
                      ? 'bg-cyan/20 border-cyan text-white font-bold shadow-neon-cyan'
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
