import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ComponentOut, SubsystemStatus } from '../../types'

const STATUS_COLOR: Record<string, string> = {
  safe: '#10B981',
  monitor: '#F59E0B',
  reject: '#EF4444',
  idle: '#38A3FF',
}

interface EquipmentModuleProps {
  subsystem: SubsystemStatus
  isSelected: boolean
  isHovered: boolean
  explodedOffset: number
  isXray: boolean
  selectedComponent?: ComponentOut | null
  onSelect: (key: string) => void
  onHover: (key: string | null) => void
}

export default function SatelliteEquipment({
  subsystem,
  isSelected,
  isHovered,
  explodedOffset,
  isXray,
  selectedComponent,
  onSelect,
  onHover,
}: EquipmentModuleProps) {
  const groupRef = useRef<THREE.Group>(null)
  const pulseRef = useRef<THREE.Mesh>(null)
  const bracketRef = useRef<THREE.Group>(null)
  const basePos = subsystem.position as [number, number, number]

  const isTargetComponent = Boolean(selectedComponent && subsystem.key === selectedComponent.subsystem)
  const effectiveStatus = isTargetComponent && selectedComponent
    ? (selectedComponent.status === 'reject' || selectedComponent.behavioral_health === 'CRITICAL'
        ? 'reject'
        : selectedComponent.status === 'monitor' || selectedComponent.behavioral_health === 'DEGRADING'
        ? 'monitor'
        : 'safe')
    : subsystem.status

  const color = STATUS_COLOR[effectiveStatus] ?? STATUS_COLOR.idle
  const isReject = effectiveStatus === 'reject'

  // Animate pulse on selection or warning status
  useFrame(({ clock }) => {
    if (pulseRef.current) {
      if (isReject) {
        const t = clock.elapsedTime * 4.5
        const s = 1.0 + 0.4 * Math.sin(t)
        pulseRef.current.scale.set(s, s, s)
      } else if (isSelected || isHovered) {
        const s = 1.0 + 0.22 * Math.sin(clock.elapsedTime * 4)
        pulseRef.current.scale.set(s, s, s)
      } else {
        pulseRef.current.scale.set(1, 1, 1)
      }
    }
    if (bracketRef.current && (isSelected || isHovered)) {
      bracketRef.current.rotation.y = clock.elapsedTime * 0.5
    }
  })

  // Calculate exploded position outward along radial vector from origin
  const explodedPos = useMemo(() => {
    const v = new THREE.Vector3(...basePos)
    const dir = v.clone().normalize()
    return v.clone().add(dir.multiplyScalar(explodedOffset * 0.9))
  }, [basePos, explodedOffset])

  // Equipment enclosure materials with dynamic emissive flare
  const equipmentMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isSelected ? '#ffffff' : isHovered ? '#38A3FF' : '#1E293B',
        metalness: 0.88,
        roughness: 0.2,
        emissive: isSelected ? color : isHovered ? '#F59E0B' : '#0B1120',
        emissiveIntensity: isSelected ? 0.8 : isHovered ? 0.4 : 0.1,
        transparent: isXray,
        opacity: isXray ? 0.4 : 1.0,
      }),
    [isSelected, isHovered, color, isXray],
  )

  // 3D Holographic Selection Bracket Geometry (corner ticks)
  const selectionBracketGeo = useMemo(() => {
    const s = 0.22
    const c = 0.06
    const pts: THREE.Vector3[] = [
      // Top corners
      new THREE.Vector3(-s, s, -s), new THREE.Vector3(-s + c, s, -s),
      new THREE.Vector3(-s, s, -s), new THREE.Vector3(-s, s, -s + c),
      new THREE.Vector3(-s, s, -s), new THREE.Vector3(-s, s - c, -s),

      new THREE.Vector3(s, s, -s), new THREE.Vector3(s - c, s, -s),
      new THREE.Vector3(s, s, -s), new THREE.Vector3(s, s, -s + c),
      new THREE.Vector3(s, s, -s), new THREE.Vector3(s, s - c, -s),

      new THREE.Vector3(-s, s, s), new THREE.Vector3(-s + c, s, s),
      new THREE.Vector3(-s, s, s), new THREE.Vector3(-s, s, s - c),
      new THREE.Vector3(-s, s, s), new THREE.Vector3(-s, s - c, s),

      new THREE.Vector3(s, s, s), new THREE.Vector3(s - c, s, s),
      new THREE.Vector3(s, s, s), new THREE.Vector3(s, s, s - c),
      new THREE.Vector3(s, s, s), new THREE.Vector3(s, s - c, s),

      // Bottom corners
      new THREE.Vector3(-s, -s, -s), new THREE.Vector3(-s + c, -s, -s),
      new THREE.Vector3(-s, -s, -s), new THREE.Vector3(-s, -s, -s + c),
      new THREE.Vector3(-s, -s, -s), new THREE.Vector3(-s, -s + c, -s),

      new THREE.Vector3(s, -s, -s), new THREE.Vector3(s - c, -s, -s),
      new THREE.Vector3(s, -s, -s), new THREE.Vector3(s, -s, -s + c),
      new THREE.Vector3(s, -s, -s), new THREE.Vector3(s, -s + c, -s),

      new THREE.Vector3(-s, -s, s), new THREE.Vector3(-s + c, -s, s),
      new THREE.Vector3(-s, -s, s), new THREE.Vector3(-s, -s, s - c),
      new THREE.Vector3(-s, -s, s), new THREE.Vector3(-s, -s + c, s),

      new THREE.Vector3(s, -s, s), new THREE.Vector3(s - c, -s, s),
      new THREE.Vector3(s, -s, s), new THREE.Vector3(s, -s, s - c),
      new THREE.Vector3(s, -s, s), new THREE.Vector3(s, -s + c, s),
    ]
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  // Subsystem-specific realistic 3D equipment geometry
  const renderEquipmentGeometry = () => {
    switch (subsystem.key) {
      case 'FC': // Flight Computer: Rad-hard casing with cooling heatsink ribs and diagnostic LEDs
        return (
          <group>
            {/* Main Processor Enclosure */}
            <mesh material={equipmentMat}>
              <boxGeometry args={[0.28, 0.2, 0.24]} />
            </mesh>
            {/* Heat sink cooling fins */}
            {[-0.09, -0.045, 0, 0.045, 0.09].map((x, i) => (
              <mesh key={i} position={[x, 0.11, 0]}>
                <boxGeometry args={[0.016, 0.035, 0.22]} />
                <meshStandardMaterial
                  color={isSelected ? '#F59E0B' : '#1E293B'}
                  emissive={isSelected ? '#F59E0B' : '#000000'}
                  emissiveIntensity={isSelected ? 0.4 : 0}
                  metalness={0.9}
                />
              </mesh>
            ))}
            {/* Dual Diagnostic Status LEDs */}
            <mesh position={[0.1, 0.04, 0.125]}>
              <sphereGeometry args={[0.02, 10, 10]} />
              <meshBasicMaterial color={isReject ? '#EF4444' : isSelected ? '#F59E0B' : '#38A3FF'} />
            </mesh>
            <mesh position={[0.05, 0.04, 0.125]}>
              <sphereGeometry args={[0.02, 10, 10]} />
              <meshBasicMaterial color="#10B981" />
            </mesh>
          </group>
        )

      case 'PWR': // Power System: PCDU enclosure with capacitor banks & copper busbars
        return (
          <group>
            <mesh material={equipmentMat}>
              <boxGeometry args={[0.3, 0.22, 0.22]} />
            </mesh>
            {/* Gold Electrolytic Capacitor Banks */}
            {[-0.08, 0.08].map((x, i) => (
              <group key={i} position={[x, 0.12, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.04, 0.04, 0.07, 14]} />
                  <meshStandardMaterial
                    color="#c29415"
                    metalness={0.92}
                    roughness={0.2}
                    emissive={isSelected ? '#ffd700' : '#4d3800'}
                    emissiveIntensity={isSelected ? 0.5 : 0.1}
                  />
                </mesh>
              </group>
            ))}
            {/* Heavy Power Busbar */}
            <mesh position={[0, -0.06, 0.115]}>
              <boxGeometry args={[0.24, 0.024, 0.024]} />
              <meshStandardMaterial
                color="#F59E0B"
                emissive="#F59E0B"
                emissiveIntensity={isSelected ? 0.7 : 0.3}
                metalness={0.9}
              />
            </mesh>
          </group>
        )

      case 'BAT': // Battery: 2x 8-cell Li-ion pack in aluminum coldplate
        return (
          <group>
            {/* Coldplate Base */}
            <mesh position={[0, -0.05, 0]}>
              <boxGeometry args={[0.3, 0.035, 0.24]} />
              <meshStandardMaterial
                color={isSelected ? '#F59E0B' : '#0F172A'}
                emissive={isSelected ? '#F59E0B' : '#0B1120'}
                emissiveIntensity={isSelected ? 0.4 : 0.1}
                metalness={0.85}
              />
            </mesh>
            {/* Cylindrical Battery Cell Array */}
            {[-0.09, -0.03, 0.03, 0.09].map((x, col) =>
              [-0.045, 0.045].map((z, row) => (
                <mesh key={`${col}-${row}`} position={[x, 0.025, z]}>
                  <cylinderGeometry args={[0.024, 0.024, 0.11, 12]} />
                  <meshStandardMaterial
                    color={isSelected ? '#38A3FF' : '#1E293B'}
                    emissive={isSelected ? '#38A3FF' : '#0B1120'}
                    emissiveIntensity={isSelected ? 0.6 : 0.1}
                    metalness={0.88}
                    roughness={0.2}
                  />
                </mesh>
              )),
            )}
          </group>
        )

      case 'SOLAR': // Solar Array Drive Assembly (SADA) motor & slip ring
        return (
          <group>
            <mesh material={equipmentMat}>
              <cylinderGeometry args={[0.09, 0.1, 0.18, 20]} />
            </mesh>
            <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.07, 0.018, 10, 20]} />
              <meshStandardMaterial
                color="#F59E0B"
                emissive="#F59E0B"
                emissiveIntensity={isSelected ? 0.8 : 0.3}
                metalness={0.92}
              />
            </mesh>
          </group>
        )

      case 'COM': // Communications Transceiver & microwave waveguide
        return (
          <group>
            <mesh material={equipmentMat}>
              <boxGeometry args={[0.24, 0.16, 0.2]} />
            </mesh>
            {/* Waveguide Flange */}
            <mesh position={[0.13, 0.02, 0]}>
              <boxGeometry args={[0.035, 0.07, 0.045]} />
              <meshStandardMaterial
                color="#38A3FF"
                metalness={0.95}
                emissive={isSelected ? '#38A3FF' : '#000000'}
                emissiveIntensity={isSelected ? 0.5 : 0}
              />
            </mesh>
            {/* Coaxial SMA Connector Ports */}
            {[-0.045, 0.045].map((y, i) => (
              <mesh key={i} position={[-0.125, y, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.016, 0.016, 0.035, 10]} />
                <meshStandardMaterial color="#d4af37" metalness={0.95} />
              </mesh>
            ))}
          </group>
        )

      case 'TEL': // Telemetry Module & Encoder
        return (
          <group>
            <mesh material={equipmentMat}>
              <boxGeometry args={[0.22, 0.15, 0.19]} />
            </mesh>
            {/* Micro RF Shield Enclosure */}
            <mesh position={[0, 0.09, 0]}>
              <boxGeometry args={[0.13, 0.028, 0.11]} />
              <meshStandardMaterial
                color="#38A3FF"
                emissive="#38A3FF"
                emissiveIntensity={isSelected ? 0.6 : 0.2}
                metalness={0.88}
              />
            </mesh>
          </group>
        )

      case 'NAV': // Star Tracker Optical Head & Sun Sensors
        return (
          <group>
            {/* Star Tracker Baffle Optical Barrels (tilted 35 deg outward) */}
            <group rotation={[0.4, 0.2, 0]}>
              <mesh>
                <cylinderGeometry args={[0.035, 0.048, 0.15, 18]} />
                <meshStandardMaterial color="#0B1120" metalness={0.92} roughness={0.1} />
              </mesh>
              {/* Internal optical lens glass in calibrated emerald */}
              <mesh position={[0, 0.065, 0]}>
                <circleGeometry args={[0.03, 18]} />
                <meshStandardMaterial
                  color="#10B981"
                  emissive="#10B981"
                  emissiveIntensity={isSelected ? 1.0 : 0.6}
                  roughness={0.05}
                  metalness={0.9}
                />
              </mesh>
            </group>
            {/* Sensor mounting bracket */}
            <mesh position={[0, -0.065, 0]}>
              <boxGeometry args={[0.13, 0.035, 0.13]} />
              <meshStandardMaterial color="#1E293B" metalness={0.85} />
            </mesh>
          </group>
        )

      case 'THM': // Thermal Control Louver System
        return (
          <group>
            {/* Thermal Radiator Backplate */}
            <mesh>
              <boxGeometry args={[0.28, 0.24, 0.035]} />
              <meshStandardMaterial
                color={isSelected ? '#F59E0B' : '#1E293B'}
                emissive={isSelected ? '#F59E0B' : '#0B1120'}
                emissiveIntensity={isSelected ? 0.5 : 0.1}
                metalness={0.88}
                roughness={0.15}
              />
            </mesh>
            {/* Louver Motorized Blades */}
            {[-0.08, -0.025, 0.03, 0.085].map((y, i) => (
              <mesh key={i} position={[0, y, 0.022]} rotation={[0.45, 0, 0]}>
                <boxGeometry args={[0.24, 0.038, 0.007]} />
                <meshStandardMaterial
                  color="#38A3FF"
                  emissive="#38A3FF"
                  emissiveIntensity={isSelected ? 0.6 : 0.2}
                  metalness={0.92}
                />
              </mesh>
            ))}
          </group>
        )

      case 'SEN': // Earth Observation Optical Sensor Barrel
        return (
          <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.085, 0.11, 0.24, 22]} />
              <meshStandardMaterial color="#0B1120" metalness={0.88} roughness={0.18} />
            </mesh>
            {/* Front Aperture Hood Ring */}
            <mesh position={[0, 0.12, 0]}>
              <torusGeometry args={[0.088, 0.014, 10, 22]} />
              <meshStandardMaterial
                color="#F59E0B"
                emissive="#F59E0B"
                emissiveIntensity={isSelected ? 0.8 : 0.4}
                metalness={0.92}
              />
            </mesh>
            {/* Optical Multi-element Lens */}
            <mesh position={[0, 0.09, 0]}>
              <circleGeometry args={[0.076, 22]} />
              <meshStandardMaterial
                color="#38A3FF"
                emissive="#1E3A8A"
                emissiveIntensity={isSelected ? 1.0 : 0.7}
                roughness={0.08}
              />
            </mesh>
          </group>
        )

      case 'PAY': // Main Instrument Payload Enclosure
        return (
          <group>
            <mesh material={equipmentMat}>
              <boxGeometry args={[0.32, 0.26, 0.26]} />
            </mesh>
            {/* Cryogenic cooling radiator strip */}
            <mesh position={[0, 0.14, 0]}>
              <boxGeometry args={[0.26, 0.02, 0.2]} />
              <meshStandardMaterial
                color="#e2e8f0"
                metalness={0.92}
                roughness={0.1}
                emissive={isSelected ? '#38A3FF' : '#000000'}
                emissiveIntensity={isSelected ? 0.5 : 0}
              />
            </mesh>
          </group>
        )

      case 'CTL': // Reaction Wheels (Momentum Actuators) & Torque Rods
        return (
          <group>
            {/* 3 Orthogonal Reaction Wheel Flywheels */}
            <mesh position={[0, 0, 0.055]}>
              <cylinderGeometry args={[0.07, 0.07, 0.028, 22]} />
              <meshStandardMaterial
                color={isSelected ? '#F59E0B' : '#64748b'}
                metalness={0.92}
                roughness={0.18}
                emissive={isSelected ? '#F59E0B' : '#000000'}
                emissiveIntensity={isSelected ? 0.5 : 0}
              />
            </mesh>
            <mesh position={[0.055, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.065, 0.065, 0.028, 22]} />
              <meshStandardMaterial
                color={isSelected ? '#F59E0B' : '#64748b'}
                metalness={0.92}
                roughness={0.18}
              />
            </mesh>
            {/* Magnetic torque rod */}
            <mesh position={[-0.065, 0.065, -0.045]} rotation={[0, 0, Math.PI / 4]}>
              <cylinderGeometry args={[0.014, 0.014, 0.2, 10]} />
              <meshStandardMaterial color="#b45309" metalness={0.88} />
            </mesh>
          </group>
        )

      default:
        return (
          <mesh material={equipmentMat}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
          </mesh>
        )
    }
  }

  return (
    <group
      ref={groupRef}
      position={[explodedPos.x, explodedPos.y, explodedPos.z]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(subsystem.key)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover(subsystem.key)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        onHover(null)
      }}
    >
      {/* Invisible Raycast Hit Box for instant reliable clicking */}
      <mesh>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Physical 3D Equipment Model */}
      {renderEquipmentGeometry()}

      {/* Equipment Mounting Bracket Pad */}
      <mesh position={[0, -0.085, 0]}>
        <boxGeometry args={[0.16, 0.014, 0.16]} />
        <meshStandardMaterial
          color={isSelected ? '#F59E0B' : '#334155'}
          emissive={isSelected ? '#F59E0B' : '#000000'}
          emissiveIntensity={isSelected ? 0.4 : 0}
          metalness={0.8}
        />
      </mesh>

      {/* Interactive Status Marker Sphere */}
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.045, 14, 14]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isReject ? 1.8 : isSelected ? 1.4 : 0.9}
        />
      </mesh>

      {/* Anomaly / Selection Pulsing Alert Rings */}
      {(isReject || isSelected || isHovered) && (
        <mesh ref={pulseRef} position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.14, 0.014, 10, 28]} />
          <meshBasicMaterial color={color} transparent opacity={isReject ? 0.95 : 0.75} />
        </mesh>
      )}

      {/* 3D Holographic Corner Selection Bracket (visible when selected or hovered) */}
      {(isSelected || isHovered) && (
        <group ref={bracketRef}>
          <lineSegments geometry={selectionBracketGeo}>
            <lineBasicMaterial
              color={color}
              linewidth={2}
              transparent
              opacity={isSelected ? 0.95 : 0.7}
            />
          </lineSegments>
          {/* Vertical Tactical Beacon Guideline */}
          <line>
            <bufferGeometry
              attach="geometry"
              {...new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0.18, 0),
                new THREE.Vector3(0, 0.38, 0),
              ])}
            />
            <lineBasicMaterial color={color} transparent opacity={0.8} />
          </line>
        </group>
      )}


    </group>
  )
}
