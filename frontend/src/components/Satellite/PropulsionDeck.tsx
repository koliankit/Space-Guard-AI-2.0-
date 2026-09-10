import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PropulsionDeckProps {
  explodedOffset?: number
  isXray?: boolean
  isSelected?: boolean
  isHovered?: boolean
  onSelect?: (key: string) => void
  onHover?: (key: string | null) => void
}

export default function PropulsionDeck({
  explodedOffset = 0,
  isXray = false,
  isSelected = false,
  isHovered = false,
  onSelect,
  onHover,
}: PropulsionDeckProps) {
  const plumeRef = useRef<THREE.Group>(null)
  const throatGlowRef = useRef<THREE.Mesh>(null)

  // Animated engine combustion pulse & RCS thruster plumes
  useFrame(({ clock }) => {
    if (throatGlowRef.current) {
      const s = isSelected ? 1.0 + 0.3 * Math.sin(clock.elapsedTime * 8) : 1.0 + 0.1 * Math.sin(clock.elapsedTime * 3)
      throatGlowRef.current.scale.set(s, s, s)
    }
    if (plumeRef.current) {
      const s = 0.8 + 0.35 * Math.sin(clock.elapsedTime * 12)
      plumeRef.current.scale.set(s, 1.0 + 0.2 * Math.cos(clock.elapsedTime * 10), s)
    }
  })

  // Main LAM Rocket Nozzle Lathe Geometry (bell nozzle contour)
  const nozzleGeometry = useMemo(() => {
    const pts: THREE.Vector2[] = []
    const segments = 24
    const throatR = 0.055
    const exitR = 0.24
    const length = 0.44
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const r = throatR + (exitR - throatR) * Math.pow(t, 0.75)
      const y = -t * length
      pts.push(new THREE.Vector2(r, y))
    }
    return new THREE.LatheGeometry(pts, 28)
  }, [])

  // RCS miniature thruster nozzle lathe
  const rcsNozzleGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0.008, 0),
      new THREE.Vector2(0.024, -0.055),
    ]
    return new THREE.LatheGeometry(pts, 14)
  }, [])

  // Corner positions for the 4 RCS thruster pods
  const rcsCorners: [number, number, number][] = [
    [0.72, -0.45, 0.62],
    [-0.72, -0.45, 0.62],
    [0.72, -0.45, -0.62],
    [-0.72, -0.45, -0.62],
  ]

  return (
    <group
      position={[0, -0.56 - explodedOffset * 0.7, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.('CTL')
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover?.('CTL')
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        onHover?.(null)
      }}
    >
      {/* Invisible raycast hit box for propulsion deck selection */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.7, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Propulsion Aft Deck Structural Carbon-Titanium Plate */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.78, 0.82, 0.05, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#F59E0B' : isHovered ? '#D97706' : '#1e293b'}
          metalness={0.9}
          roughness={0.2}
          emissive={isSelected ? '#F59E0B' : '#0f172a'}
          emissiveIntensity={isSelected ? 0.4 : 0.05}
          transparent={isXray}
          opacity={isXray ? 0.35 : 1.0}
        />
      </mesh>

      {/* Main Liquid Apogee Motor (LAM) Injector Head & Combustion Chamber */}
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.095, 0.12, 0.13, 20]} />
        <meshStandardMaterial
          color="#475569"
          metalness={0.92}
          roughness={0.15}
        />
      </mesh>

      {/* Ceramic Gold-Titanium Thermal Heat Shield Ring */}
      <mesh position={[0, -0.05, 0]}>
        <torusGeometry args={[0.28, 0.03, 14, 28]} />
        <meshStandardMaterial
          color="#d4af37"
          emissive={isSelected ? '#ffd700' : '#854d0e'}
          emissiveIntensity={isSelected ? 0.6 : 0.2}
          metalness={0.92}
          roughness={0.2}
        />
      </mesh>

      {/* Niobium Radiation-Cooled Expansion Bell Nozzle */}
      <mesh geometry={nozzleGeometry} position={[0, -0.14, 0]}>
        <meshStandardMaterial
          color={isSelected ? '#334155' : '#1e293b'}
          roughness={0.35}
          metalness={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Internal Engine Throat Pulsing Orange Combustion Plasma */}
      <mesh ref={throatGlowRef} position={[0, -0.22, 0]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={isSelected ? '#ff3d00' : '#ff7a18'} />
      </mesh>

      {/* Simulated Ion / Hot Thruster Exhaust Plume when selected or hovered */}
      {(isSelected || isHovered) && (
        <group ref={plumeRef} position={[0, -0.58, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.16, 0.38, 16]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.65} />
        </group>
      )}

      {/* Pressurant Helium Spherical Tanks on Aft Deck */}
      {[-0.34, 0.34].map((x, i) => (
        <group key={i} position={[x, 0.14, 0]}>
          <mesh>
            <sphereGeometry args={[0.14, 20, 20]} />
            <meshStandardMaterial
              color="#94a3b8"
              metalness={0.95}
              roughness={0.12}
              emissive={isSelected ? '#F59E0B' : '#0f172a'}
              emissiveIntensity={isSelected ? 0.35 : 0.05}
            />
          </mesh>
          {/* Braided steel propellant feed lines */}
          <mesh position={[x > 0 ? -0.12 : 0.12, -0.06, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.18, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
          </mesh>
        </group>
      ))}

      {/* --- 4x RCS Thruster Quads on Bus Corners --- */}
      {rcsCorners.map((pos, idx) => (
        <group key={idx} position={pos}>
          {/* Mounting bracket with gold ground plate */}
          <mesh>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
            <meshStandardMaterial color="#334155" metalness={0.88} />
          </mesh>
          {/* +X / -X nozzle */}
          <mesh
            position={[pos[0] > 0 ? 0.045 : -0.045, 0, 0]}
            rotation={[0, 0, pos[0] > 0 ? -Math.PI / 2 : Math.PI / 2]}
          >
            <primitive object={rcsNozzleGeo} />
            <meshStandardMaterial color="#64748b" metalness={0.95} side={THREE.DoubleSide} />
          </mesh>
          {/* -Y nozzle (downward thrust vector) */}
          <mesh position={[0, -0.045, 0]}>
            <primitive object={rcsNozzleGeo} />
            <meshStandardMaterial color="#64748b" metalness={0.95} side={THREE.DoubleSide} />
          </mesh>
          {/* +Z / -Z nozzle */}
          <mesh
            position={[0, 0, pos[2] > 0 ? 0.045 : -0.045]}
            rotation={[pos[2] > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0]}
          >
            <primitive object={rcsNozzleGeo} />
            <meshStandardMaterial color="#64748b" metalness={0.95} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
