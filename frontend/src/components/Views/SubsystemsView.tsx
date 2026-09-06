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
  return (
    <div className="flex flex-col flex-1 p-5 bg-bg font-mono select-none overflow-y-auto">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-line mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan led" />
            <h2 className="m-0 text-sm font-display font-black tracking-widest text-slate-100 uppercase">
              ISRO SPACECRAFT SUBSYSTEM DIAGNOSTIC CONSOLE
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/40 font-bold">
              11 PHYSICAL ARCHITECTURES
            </span>
          </div>
          <div className="text-[10px] text-muted tracking-wider mt-0.5">
            Spacecraft Subsystem Health &bull; Fault Tree Isolation &bull; Redundancy Status &bull; Component Allocations
          </div>
        </div>

        <div className="text-xs text-muted flex items-center gap-2">
          <span>MISSION TOTAL:</span>
          <span className="text-safe font-bold">{components.length} COMPONENTS SCREENED</span>
        </div>
      </div>

      {/* Grid of All 11 Subsystems */}
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
    </div>
  )
}
