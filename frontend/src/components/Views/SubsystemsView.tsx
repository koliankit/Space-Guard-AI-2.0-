import { useState, useMemo } from 'react'
import type { ComponentOut, SubsystemStatus } from '../../types'

interface SubsystemsViewProps {
  subsystems: SubsystemStatus[]
  components: ComponentOut[]
  onFocusSubsystem: (key: string) => void
  onSelectComponent: (id: string) => void
}

const SUBSYSTEM_DETAILS: Record<
  string,
  {
    description: string
    redundancy: string
    nominalPower: string
    operatingTemp: string
    subComponents: string[]
  }
> = {
  FC: {
    description: 'Rad-hard Dual-Core DSP Processor, FPGA Command Decoder & Mil-Std-1553B Avionics Bus.',
    redundancy: 'Dual Redundant (Core-A Active / Core-B Cold Backup)',
    nominalPower: '28.4 W',
    operatingTemp: '+18.2 °C',
    subComponents: ['Processor DSP-301', 'FPGA Command Decoder', 'EEPROM Memory Bank', 'Avionics Bus 1553B'],
  },
  PWR: {
    description: 'Power Conditioning & Distribution Unit (PCDU), High-Voltage Shunt Regulators & DC-DC Converters.',
    redundancy: 'N+1 Redundant Shunt Bank',
    nominalPower: '340.0 W (Throughput)',
    operatingTemp: '+24.5 °C',
    subComponents: ['SiC Power MOSFETs', 'Main Bus Voltage Regulator', 'PCDU Controller', 'Shunt Limiter'],
  },
  BAT: {
    description: 'Space-qualified Li-Ion Battery Pack with Autonomous Cell Balancers & Thermal Cutoffs.',
    redundancy: '2x 40Ah Independent Strings',
    nominalPower: '48.0 V Nom',
    operatingTemp: '+12.8 °C',
    subComponents: ['Secondary Li-Ion Cells', 'Active Cell Balancer', 'Overcurrent Protection Relay', 'BMU Controller'],
  },
  SOLAR: {
    description: 'Dual Articulated 3-Panel GaAs Solar Array Wings with Solar Array Drive Mechanism (SADM).',
    redundancy: 'Dual Symmetrical Wings (Port & Starboard)',
    nominalPower: '1,450 W (BOL Sunlit)',
    operatingTemp: '-45.0 °C to +85.0 °C',
    subComponents: ['Triple-Junction GaAs Cells', 'Bypass Diodes', 'SADM Stepper Drive', 'Hinge Wire Harness'],
  },
  COM: {
    description: 'S/X-Band High-Gain Parabolic Dish Antenna, Traveling Wave Tube Amplifiers (TWTA) & Diplexers.',
    redundancy: 'Dual TWTA Amplifiers (Prime/Redundant)',
    nominalPower: '65.0 W RF',
    operatingTemp: '+22.1 °C',
    subComponents: ['GaAs Low Noise Amplifier', 'Traveling Wave Tube Amp', 'Diplexer Filter', 'Gimbal Antenna Actuator'],
  },
  TEL: {
    description: 'Omnidirectional Telemetry Helical Mast, S-Band Transponder, Beacon Transmitter & Command Decoder.',
    redundancy: 'Cross-strapped Transponders',
    nominalPower: '18.5 W',
    operatingTemp: '+15.4 °C',
    subComponents: ['Helical Antenna Coil', 'S-Band Transponder', 'Telemetry Encoder', 'Frequency Synthesizer'],
  },
  NAV: {
    description: 'Attitude & Orbit Control System (AOCS), Autonomous Star Trackers, Gyroscopes & Sun Sensors.',
    redundancy: '3x Axis Redundant Gyros + Dual Star Trackers',
    nominalPower: '32.0 W',
    operatingTemp: '+16.5 °C',
    subComponents: ['Fiber Optic Gyroscope', 'Digital Sun Sensors', 'Autonomous Star Tracker', 'Inertial Measurement Unit'],
  },
  THM: {
    description: 'Thermal Control System, Multilayer Insulation (MLI) Blankets, Heat Pipes & Optical Radiators.',
    redundancy: 'Dual Loop Heat Pipes & Redundant Heaters',
    nominalPower: '14.0 W (Heaters)',
    operatingTemp: '+14.0 °C (Chassis Mean)',
    subComponents: ['Kapton Surface Heaters', 'Platinum RTD Sensors', 'Thermal Bypass Valves', 'Optical Solar Radiator'],
  },
  SEN: {
    description: 'Triaxial Fluxgate Magnetometers, Earth Horizon Sensors, Plasma Detectors & Radiation Monitors.',
    redundancy: 'Dual Sensor Heads',
    nominalPower: '8.5 W',
    operatingTemp: '+10.2 °C',
    subComponents: ['Fluxgate Magnetometer', 'Earth Horizon Sensor', 'Radiation Dosimeter', 'Plasma Wave Sensor'],
  },
  PAY: {
    description: 'Multispectral Earth Imaging CCD Camera, High-Speed ADC Array & Instrument Optical Bench.',
    redundancy: 'Primary Scientific Instrument',
    nominalPower: '110.0 W',
    operatingTemp: '-10.0 °C (Focal Plane Array)',
    subComponents: ['Multispectral CCD Sensor', '16-Bit High Speed ADC', 'Low-Noise Pre-Amplifier', 'Optical Bench'],
  },
  CTL: {
    description: 'Reaction Wheels (4x Pyramidal Mount), Magnetic Torquer Rods & Micro-RCS Thruster Pods.',
    redundancy: '4-Wheel Pyramidal Configuration (Can operate on 3)',
    nominalPower: '42.0 W',
    operatingTemp: '+20.0 °C',
    subComponents: ['Brushless Reaction Wheel', 'Magnetic Torquer Rod', 'Hydrazine RCS Micro-Valves', 'Servo Controller'],
  },
}

export default function SubsystemsView({
  subsystems,
  components,
  onFocusSubsystem,
  onSelectComponent,
}: SubsystemsViewProps) {
  const [viewMode, setViewMode] = useState<'subsystems' | 'lots'>('lots')

  // Group components by qualification lots
  const lots = useMemo(() => {
    const map = new Map<
      string,
      {
        lot_id: string
        parts: ComponentOut[]
        mean: number
        std: number
        rejects: number
        monitors: number
        safe: number
        status: 'safe' | 'monitor' | 'reject'
      }
    >()

    components.forEach((c) => {
      const l = c.lot_id || 'UNKNOWN-LOT'
      let item = map.get(l)
      if (!item) {
        item = {
          lot_id: l,
          parts: [],
          mean: c.lot_mean ?? 0,
          std: c.lot_std ?? 0,
          rejects: 0,
          monitors: 0,
          safe: 0,
          status: 'safe',
        }
        map.set(l, item)
      }
      item.parts.push(c)
      if (c.status === 'reject') {
        item.rejects++
        item.status = 'reject'
      } else if (c.status === 'monitor') {
        item.monitors++
        if (item.status !== 'reject') item.status = 'monitor'
      } else {
        item.safe++
      }
    })

    return Array.from(map.values()).sort((a, b) => a.lot_id.localeCompare(b.lot_id))
  }, [components])

  return (
    <div className="flex flex-col flex-1 p-5 bg-bg font-mono select-none overflow-y-auto">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-line mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan led" />
            <h2 className="m-0 text-sm font-display font-black tracking-widest text-slate-100 uppercase">
              ISRO COMPONENT &amp; LOT DIAGNOSTIC CONSOLE
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/40 font-bold">
              {viewMode === 'subsystems' ? '11 PHYSICAL ARCHITECTURES' : `${lots.length} QUALIFICATION LOTS`}
            </span>
          </div>
          <div className="text-[10px] text-muted tracking-wider mt-0.5">
            Spacecraft Subsystem Health &bull; Flight Qualification Lots &bull; Statistical Lot-Relative Drift &bull; Redundancy Allocation
          </div>
        </div>

        {/* Classification Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#070D1A] border border-slate-700/80 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('lots')}
              className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                viewMode === 'lots'
                  ? 'bg-cyan/25 text-cyan border border-cyan/50 shadow-neon-cyan'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📦</span>
              <span>Qualification Lots ({lots.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('subsystems')}
              className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                viewMode === 'subsystems'
                  ? 'bg-cyan/25 text-cyan border border-cyan/50 shadow-neon-cyan'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🛰️</span>
              <span>Subsystems ({subsystems.length})</span>
            </button>
          </div>

          <div className="text-xs text-muted flex items-center gap-2">
            <span>MISSION TOTAL:</span>
            <span className="text-safe font-bold">{components.length} COMPONENTS</span>
          </div>
        </div>
      </div>

      {/* Grid: Qualification Lots or 11 Physical Subsystems */}
      {viewMode === 'lots' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {lots.map((lot) => {
            const isReject = lot.status === 'reject'
            const isMonitor = lot.status === 'monitor'
            const rejectRate = ((lot.rejects / (lot.parts.length || 1)) * 100).toFixed(1)

            return (
              <div
                key={lot.lot_id}
                className={`p-3.5 rounded border transition-all flex flex-col justify-between reticle-corner shadow-panel-subtle ${
                  isReject
                    ? 'bg-[#19090E] border-reject/80 shadow-alert-glow'
                    : isMonitor
                    ? 'bg-[#181105] border-monitor/70'
                    : 'bg-[#041A0B] border-line hover:border-cyan/60'
                }`}
              >
                <div>
                  {/* Header: Lot ID & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan font-mono font-bold text-xs truncate max-w-[170px]" title={lot.lot_id}>
                        {lot.lot_id}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase whitespace-nowrap ${
                        isReject
                          ? 'bg-reject/25 text-reject border border-reject/50'
                          : isMonitor
                          ? 'bg-monitor/25 text-monitor border border-monitor/50'
                          : 'bg-safe/25 text-safe border border-safe/50'
                      }`}
                    >
                      {lot.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Standard info */}
                  <div className="text-[10px] text-muted mb-2.5 leading-relaxed">
                    MIL-STD-883 Method 1005 HTOL Burn-in &bull; 125&deg;C / 168h Thermal Stress Lot
                  </div>

                  {/* Lot Statistical Specs */}
                  <div className="space-y-1 text-[10px] bg-[#021408] p-2 rounded border border-line/60 mb-2.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted font-sans">Sample Size:</span>
                      <span className="text-slate-100 font-bold">{lot.parts.length} components</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted font-sans">Lot Baseline &mu;:</span>
                      <span className="text-cyan font-bold">{lot.mean.toFixed(2)} &micro;A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted font-sans">Defect Quarantine:</span>
                      <span className={`font-bold ${lot.rejects > 0 ? 'text-reject' : 'text-safe'}`}>
                        {lot.rejects} parts ({rejectRate}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted font-sans">Drift Monitor:</span>
                      <span className="text-monitor font-bold">{lot.monitors} parts</span>
                    </div>
                  </div>

                  {/* Visual Status Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[9px] text-muted font-bold mb-1">
                      <span>Lot Classification Breakdown</span>
                      <span className="text-slate-300 font-mono">
                        {lot.safe} Safe / {lot.monitors} Mon / {lot.rejects} Rej
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
                      <div
                        style={{ width: `${(lot.safe / (lot.parts.length || 1)) * 100}%` }}
                        className="bg-safe h-full"
                        title={`${lot.safe} Safe`}
                      />
                      <div
                        style={{ width: `${(lot.monitors / (lot.parts.length || 1)) * 100}%` }}
                        className="bg-monitor h-full"
                        title={`${lot.monitors} Monitor`}
                      />
                      <div
                        style={{ width: `${(lot.rejects / (lot.parts.length || 1)) * 100}%` }}
                        className="bg-reject h-full"
                        title={`${lot.rejects} Reject`}
                      />
                    </div>
                  </div>

                  {/* Component Chips list */}
                  <div className="mb-3">
                    <div className="text-[9px] uppercase tracking-wider text-muted font-bold mb-1 flex justify-between">
                      <span>Parts in Lot:</span>
                      <span className="text-slate-400 font-mono text-[9px]">{lot.parts.length} total</span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-[85px] overflow-y-auto pr-1">
                      {lot.parts.slice(0, 16).map((c) => (
                        <button
                          key={c.component_id}
                          type="button"
                          onClick={() => onSelectComponent(c.component_id)}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono transition-all border ${
                            c.status === 'reject'
                              ? 'bg-reject/20 text-rose-300 border-reject/40 hover:bg-reject/40 font-bold'
                              : c.status === 'monitor'
                              ? 'bg-monitor/20 text-amber-300 border-monitor/40 hover:bg-monitor/40'
                              : 'bg-[#062612] text-slate-300 border-line hover:border-cyan hover:text-white'
                          }`}
                          title={`Click to inspect component ${c.component_id} [${c.subsystem}]`}
                        >
                          {c.component_id}
                        </button>
                      ))}
                      {lot.parts.length > 16 && (
                        <span className="text-[8.5px] text-slate-500 self-center font-mono">
                          +{lot.parts.length - 16} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const firstComp = lot.parts.find((p) => p.status === 'reject') || lot.parts[0]
                      if (firstComp) {
                        onSelectComponent(firstComp.component_id)
                        onFocusSubsystem(firstComp.subsystem)
                      }
                    }}
                    className="flex-1 hud-glass-interactive border-line text-cyan hover:border-cyan text-[10.5px] py-1 px-2 rounded border transition-all font-bold flex items-center justify-center gap-1.5"
                  >
                    <span>&#9678;</span> INSPECT LOT IN 3D
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Grid of All 11 Subsystems */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {subsystems.map((sub) => {
            const isReject = sub.status === 'reject'
            const isMonitor = sub.status === 'monitor'
            const details = SUBSYSTEM_DETAILS[sub.key] ?? {
              description: 'Physical satellite subsystem equipment module.',
              redundancy: 'Standard Prime/Backup',
              nominalPower: '25.0 W',
              operatingTemp: '+20.0 °C',
              subComponents: [],
            }

            // Flagged components in this subsystem
            const subComponents = components.filter((c) => c.subsystem === sub.key)
            const flaggedCount = subComponents.filter((c) => c.status !== 'safe').length

            return (
              <div
                key={sub.key}
                className={`p-3.5 rounded border transition-all flex flex-col justify-between reticle-corner shadow-panel-subtle ${
                  isReject
                    ? 'bg-[#19090E] border-reject/80 shadow-alert-glow'
                    : isMonitor
                    ? 'bg-[#181105] border-monitor/70'
                    : 'bg-[#041A0B] border-line hover:border-cyan/60'
                }`}
              >
                <div>
                  {/* Header: Key, Name & Status Pill */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan font-display font-black text-sm">[{sub.key}]</span>
                      <span className="text-slate-100 font-bold text-xs">{sub.name}</span>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase whitespace-nowrap ${
                        isReject
                          ? 'bg-reject/25 text-reject border border-reject/50'
                          : isMonitor
                          ? 'bg-monitor/25 text-monitor border border-monitor/50'
                          : 'bg-safe/25 text-safe border border-safe/50'
                      }`}
                    >
                      {sub.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Subsystem Description */}
                  <div className="text-[10px] text-muted mb-2.5 leading-relaxed">
                    {details.description}
                  </div>

                  {/* Technical Specs */}
                  <div className="space-y-1 text-[10px] bg-[#021408] p-2 rounded border border-line/60 mb-2.5">
                    <div className="flex justify-between">
                      <span className="text-muted">Redundancy:</span>
                      <span className="text-slate-200 font-semibold truncate max-w-[140px]" title={details.redundancy}>
                        {details.redundancy}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Power Draw:</span>
                      <span className="text-safe font-bold">{details.nominalPower}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Operating Temp:</span>
                      <span className="text-slate-200">{details.operatingTemp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Parts Inspected:</span>
                      <span className="text-slate-100 font-bold">
                        {sub.count} parts {flaggedCount > 0 && <span className="text-reject font-black">({flaggedCount} flagged)</span>}
                      </span>
                    </div>
                  </div>

                  {/* Sub-Assemblies List */}
                  <div className="mb-3">
                    <div className="text-[9px] uppercase tracking-wider text-muted font-bold mb-1">
                      Key Assemblies:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {details.subComponents.map((item, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-[#062612] text-slate-300 border border-line">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Focus 3D Model */}
                <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onFocusSubsystem(sub.key)}
                    className="flex-1 hud-glass-interactive border-line text-cyan hover:border-cyan text-[10.5px] py-1 px-2 rounded border transition-all font-bold flex items-center justify-center gap-1.5"
                  >
                    <span>&#9678;</span> FOCUS IN 3D SATELLITE
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
