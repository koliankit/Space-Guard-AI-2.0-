import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface AntennaArrayProps {
  explodedOffset?: number
  isXray?: boolean
  isSelected?: boolean
  isHovered?: boolean
  onSelect?: (key: string) => void
  onHover?: (key: string | null) => void
}

export default function AntennaArray({
  explodedOffset = 0,
  isXray = false,
  isSelected = false,
  isHovered = false,
  onSelect,
  onHover,
}: AntennaArrayProps) {
  const feedPulseRef = useRef<THREE.Mesh>(null)

  // Animated pulse on feed horn sub-reflector
  useFrame(({ clock }) => {
    if (feedPulseRef.current) {
      const s = isSelected || isHovered ? 1.0 + 0.25 * Math.sin(clock.elapsedTime * 6) : 1.0
      feedPulseRef.current.scale.set(s, s, s)
    }
  })

  // Parabolic dish cross-section lathe geometry
  const dishGeometry = useMemo(() => {
    const points: THREE.Vector2[] = []
    const segments = 28
    const radius = 0.52
    const depth = 0.17
    for (let i = 0; i <= segments; i++) {
      const r = (i / segments) * radius
      const y = (depth / (radius * radius)) * (r * r)
      points.push(new THREE.Vector2(r, y))
    }
    return new THREE.LatheGeometry(points, 36)
  }, [])

  const dishEdges = useMemo(() => new THREE.EdgesGeometry(dishGeometry, 20), [dishGeometry])

  // Helical omnidirectional telemetry antenna coil geometry
  const helixPoints = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const turns = 7
    const radius = 0.045
    const length = 0.38
    const steps = 70
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const angle = t * turns * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, t * length, Math.sin(angle) * radius))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  return (
    <group
      position={[0, 0.65 + explodedOffset * 0.7, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.('COM')
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover?.('COM')
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        onHover?.(null)
      }}
    >
      {/* Invisible raycast hit box for easy antenna selection */}
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.9, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* --- High-Gain Parabolic Antenna (HGA) --- */}
      <group position={[0.25, 0.25, 0.45]} rotation={[-0.45, 0.35, 0]}>
        {/* Gimbal Dual-Axis Rotary Mount with Servo Cylinders */}
        <mesh position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.065, 0.085, 0.18, 20]} />
          <meshStandardMaterial
            color={isSelected ? '#F59E0B' : '#1E293B'}
            metalness={0.88}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[0, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.048, 0.048, 0.16, 16]} />
          <meshStandardMaterial
            color={isSelected ? '#F59E0B' : '#38A3FF'}
            metalness={0.92}
            roughness={0.15}
            emissive={isSelected ? '#F59E0B' : '#1E3A8A'}
            emissiveIntensity={isSelected ? 0.6 : 0.2}
          />
        </mesh>

        {/* Main Carbon-composite Parabolic Reflector Dish */}
        <mesh geometry={dishGeometry} rotation={[Math.PI, 0, 0]}>
          <meshStandardMaterial
            color={isSelected ? '#1E293B' : isHovered ? '#111827' : '#0B1120'}
            emissive={isSelected ? '#F59E0B' : isHovered ? '#D97706' : '#1E3A8A'}
            emissiveIntensity={isSelected ? 0.45 : isHovered ? 0.25 : 0.1}
            metalness={0.88}
            roughness={0.2}
            side={THREE.DoubleSide}
            transparent={isXray}
            opacity={isXray ? 0.4 : 1.0}
          />
        </mesh>

        {/* Golden Mesh Internal Reflector Lining */}
        <mesh geometry={dishGeometry} rotation={[Math.PI, 0, 0]} scale={[0.99, 0.99, 0.99]}>
          <meshStandardMaterial
            color="#d4af37"
            emissive="#ffd700"
            emissiveIntensity={isSelected ? 0.4 : 0.1}
            metalness={0.95}
            roughness={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Dish structural glowing rib lines */}
        <lineSegments geometry={dishEdges} rotation={[Math.PI, 0, 0]}>
          <lineBasicMaterial
            color={isSelected ? '#F59E0B' : isHovered ? '#38A3FF' : '#475569'}
            transparent
            opacity={isSelected ? 0.95 : isHovered ? 0.8 : 0.55}
          />
        </lineSegments>

        {/* Sub-reflector tripod feed struts */}
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, idx) => {
          const strutBaseR = 0.42
          const x = Math.cos(angle) * strutBaseR
          const z = Math.sin(angle) * strutBaseR
          return (
            <group key={idx}>
              <mesh position={[x / 2, 0.13, z / 2]} rotation={[Math.sin(angle) * 0.42, 0, -Math.cos(angle) * 0.42]}>
                <cylinderGeometry args={[0.009, 0.009, 0.34, 8]} />
                <meshStandardMaterial
                  color={isSelected ? '#F59E0B' : '#38A3FF'}
                  metalness={0.92}
                  emissive={isSelected ? '#F59E0B' : '#1E3A8A'}
                  emissiveIntensity={isSelected ? 0.4 : 0.15}
                />
              </mesh>
            </group>
          )
        })}

        {/* Central Feed Horn & Sub-reflector Cap */}
        <mesh ref={feedPulseRef} position={[0, 0.24, 0]}>
          <sphereGeometry args={[0.045, 20, 20]} />
          <meshStandardMaterial
            color={isSelected ? '#F59E0B' : '#38A3FF'}
            emissive={isSelected ? '#F59E0B' : '#1E3A8A'}
            emissiveIntensity={isSelected ? 1.0 : 0.5}
            metalness={0.92}
            roughness={0.1}
          />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.022, 0.035, 0.14, 16]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* --- Omnidirectional Telemetry Helical Mast --- */}
      <group position={[-0.48, 0.1, -0.45]}>
        {/* Mast stalk with gold grounding band */}
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.016, 0.022, 0.28, 12]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.9} roughness={0.18} />
        </mesh>
        {/* Glowing Helical Antenna Coil */}
        <primitive
          object={useMemo(
            () =>
              new THREE.Line(
                helixPoints,
                new THREE.LineBasicMaterial({
                  color: isSelected ? '#10B981' : '#F59E0B',
                  linewidth: 2,
                }),
              ),
            [helixPoints, isSelected],
          )}
          position={[0, 0.28, 0]}
        />
        <mesh position={[0, 0.68, 0]}>
          <coneGeometry args={[0.022, 0.07, 12]} />
          <meshStandardMaterial
            color={isSelected ? '#10B981' : '#F59E0B'}
            emissive={isSelected ? '#10B981' : '#F59E0B'}
            emissiveIntensity={isSelected ? 0.9 : 0.4}
          />
        </mesh>
      </group>

      {/* --- S-Band Biconical Antenna --- */}
      <group position={[-0.15, 0.25, -0.55]}>
        <mesh position={[0, 0.09, 0]}>
          <coneGeometry args={[0.045, 0.1, 20]} />
          <meshStandardMaterial
            color={isSelected ? '#F59E0B' : '#38A3FF'}
            metalness={0.88}
            emissive={isSelected ? '#F59E0B' : '#1E3A8A'}
            emissiveIntensity={isSelected ? 0.5 : 0.2}
          />
        </mesh>
        <mesh position={[0, -0.01, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.045, 0.1, 20]} />
          <meshStandardMaterial
            color={isSelected ? '#F59E0B' : '#38A3FF'}
            metalness={0.88}
            emissive={isSelected ? '#F59E0B' : '#1E3A8A'}
            emissiveIntensity={isSelected ? 0.5 : 0.2}
          />
        </mesh>
      </group>
    </group>
  )
}
