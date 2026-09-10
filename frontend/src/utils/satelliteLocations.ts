/**
 * Spacecraft Subsystem Physical Equipment Layout & Location Registry
 * Maps each subsystem code to its physical location, equipment bay, deck, and 3D coordinates
 * on the ISRO spacecraft bus.
 */

export interface SubsystemLocationInfo {
  key: string
  name: string
  bay: string
  deck: string
  pos: [number, number, number]
  role: string
  coolingMethod: string
  busVoltage: string
}

export const SUBSYSTEM_LOCATIONS: Record<string, SubsystemLocationInfo> = {
  FC: {
    key: 'FC',
    name: 'Flight Computer',
    bay: 'Avionics Bay A1',
    deck: 'Upper Avionics Deck',
    pos: [0.55, 0.55, -0.2],
    role: 'On-Board Computer (OBC) & MIL-STD-1553B Data Bus Master',
    coolingMethod: 'Conductive Thermal Straps',
    busVoltage: '28V Regulated',
  },
  PWR: {
    key: 'PWR',
    name: 'Power System',
    bay: 'PCDU Rack B2',
    deck: 'Mid Equipment Deck B',
    pos: [0.55, 0.42, 0.62],
    role: 'Power Conditioning & Distribution Unit (PCDU) & Shunts',
    coolingMethod: 'Baseplate Heat Sink',
    busVoltage: '28V / 50V High Bus',
  },
  BAT: {
    key: 'BAT',
    name: 'Battery Module',
    bay: 'Battery Compartment C1',
    deck: 'Lower Equipment Bay',
    pos: [0.55, -0.42, 0.62],
    role: 'Li-Ion 48V Flight Battery Bank & Cell Balancers',
    coolingMethod: 'Thermal Phase-Change Material',
    busVoltage: '48V DC Battery Bus',
  },
  SOLAR: {
    key: 'SOLAR',
    name: 'Solar Array',
    bay: 'SADM Gimbal Bay',
    deck: 'Port & Starboard Wings',
    pos: [2.55, 0.0, 0.0],
    role: 'Articulated GaAs Solar Wings & Drive Mechanisms',
    coolingMethod: 'Radiation into Space',
    busVoltage: 'Solar Photovoltaic Raw',
  },
  COM: {
    key: 'COM',
    name: 'Communication Module',
    bay: 'RF Transceiver Bay T1',
    deck: 'Zenith Communications Mast',
    pos: [-0.2, 0.62, 0.55],
    role: 'S/X-Band High-Gain Transponder & TWTA Amplifiers',
    coolingMethod: 'Optical Solar Reflector',
    busVoltage: '28V Regulated',
  },
  TEL: {
    key: 'TEL',
    name: 'Telemetry Module',
    bay: 'TT&C Baseband Bay M1',
    deck: 'Central Core Enclosure',
    pos: [-0.2, 0.62, -0.55],
    role: 'Downlink Telemetry Encoder & Beacon Transmitter',
    coolingMethod: 'Conductive Chassis Rail',
    busVoltage: '28V Regulated',
  },
  NAV: {
    key: 'NAV',
    name: 'Navigation Unit',
    bay: 'AOCS Sensor Platform N1',
    deck: 'Zenith Optical Deck',
    pos: [0.0, 0.1, 0.95],
    role: 'Autonomous Star Trackers & Fiber Optic Gyros',
    coolingMethod: 'Isolated Thermally-Stable Bench',
    busVoltage: '28V Regulated',
  },
  THM: {
    key: 'THM',
    name: 'Thermal Control',
    bay: 'Radiator Heat Pipe Loop',
    deck: 'Nadir Face Panel',
    pos: [0.0, 0.0, -0.85],
    role: 'Dual-Loop Ammonia Heat Pipes & Operational Strip Heaters',
    coolingMethod: 'Passive Radiative Panels',
    busVoltage: '28V Essential Bus',
  },
  SEN: {
    key: 'SEN',
    name: 'Sensor Module',
    bay: 'Magnetometer Boom S1',
    deck: 'Deployable Sensor Mast',
    pos: [-0.75, 0.3, 0.4],
    role: 'Fluxgate Magnetometer & Space Radiation Monitor',
    coolingMethod: 'Multi-Layer Insulation (MLI)',
    busVoltage: '15V Isolated Low-Noise',
  },
  PAY: {
    key: 'PAY',
    name: 'Payload Instruments',
    bay: 'Optical Bench Bay P1',
    deck: 'Earth-Facing Payload Deck',
    pos: [-0.85, -0.3, -0.1],
    role: 'High-Resolution Multispectral Earth Camera & High-Speed ADCs',
    coolingMethod: 'Thermoelectric Cooler (TEC)',
    busVoltage: '28V Low-Ripple Dedicated',
  },
  CTL: {
    key: 'CTL',
    name: 'Control Electronics',
    bay: 'Actuator Driver Bay D1',
    deck: 'Nadir Internal Core',
    pos: [0.75, -0.55, -0.3],
    role: 'Reaction Wheel Servo Drivers & Magnetic Torquers',
    coolingMethod: 'Conduction through Structural Ribs',
    busVoltage: '28V Motor Bus',
  },
}

export function getSubsystemLocation(key?: string | null): SubsystemLocationInfo {
  if (!key) {
    return SUBSYSTEM_LOCATIONS.FC
  }
  const cleanKey = key.toUpperCase().trim()
  return (
    SUBSYSTEM_LOCATIONS[cleanKey] || {
      key: cleanKey,
      name: `${cleanKey} Subsystem`,
      bay: `Equipment Bay [${cleanKey}]`,
      deck: 'Satellite Main Bus',
      pos: [0.0, 0.0, 0.0],
      role: 'Integrated Spacecraft Avionics & Payload Module',
      coolingMethod: 'Chassis Heat Spreader',
      busVoltage: '28V Bus',
    }
  )
}

export function formatCoordinates(pos: [number, number, number]): string {
  const [x, y, z] = pos
  const sign = (n: number) => (n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2))
  return `X:${sign(x)} Y:${sign(y)} Z:${sign(z)}`
}
