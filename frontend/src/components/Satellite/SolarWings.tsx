import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SolarWingsProps {
  explodedOffset?: number
  isXray?: boolean
  isSelected?: boolean
  isHovered?: boolean
  onSelect?: (key: string) => void
  onHover?: (key: string | null) => void
}

export default function SolarWings({
  explodedOffset = 0,
  isXray = false,
  isSelected = false,
  isHovered = false,
  onSelect,
  onHover,
}: SolarWingsProps) {
  const pulseRef = useRef<THREE.Group>(null)

  // Subtle solar energy pulse animation when selected
  useFrame(({ clock }) => {
    if (pulseRef.current && (isSelected || isHovered)) {
      const scale = 1.0 + 0.02 * Math.sin(clock.elapsedTime * 4)
      pulseRef.current.scale.set(scale, 1, scale)
    }
  })

  // Photovoltaic panel geometry
  const panelGeo = useMemo(() => new THREE.BoxGeometry(0.74, 0.022, 1.28), [])
  const panelEdges = useMemo(() => new THREE.EdgesGeometry(panelGeo), [panelGeo])

  // Cell grid lines on the active surface of each panel
  const gridLinesGeo = useMemo(() => {
    const points: THREE.Vector3[] = []
    // 6 vertical busbars across the width
    for (let i = -0.32; i <= 0.32; i += 0.128) {
      points.push(new THREE.Vector3(i, 0.013, -0.62))
      points.push(new THREE.Vector3(i, 0.013, 0.62))
    }
    // 10 horizontal grid lines across the length
    for (let j = -0.58; j <= 0.58; j += 0.128) {
      points.push(new THREE.Vector3(-0.35, 0.013, j))
      points.push(new THREE.Vector3(0.35, 0.013, j))
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points)
    return geom
  }, [])

  // Deep space gallium-arsenide / silicon solar cell material
  const cellMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isSelected ? '#0b2e59' : isHovered ? '#092548' : '#06162d',
        emissive: isSelected ? '#38A3FF' : isHovered ? '#1E3A8A' : '#031b38',
        emissiveIntensity: isSelected ? 0.65 : isHovered ? 0.45 : 0.2,
        metalness: 0.95,
        roughness: 0.12,
        transparent: isXray,
        opacity: isXray ? 0.35 : 1.0,
      }),
    [isXray, isSelected, isHovered],
  )

  // Gold Kapton thermal film on the backside
  const kaptonMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isSelected ? '#ffd166' : '#d48824',
        emissive: isSelected ? '#ffb703' : '#6b4306',
        emissiveIntensity: isSelected ? 0.35 : 0.1,
        metalness: 0.88,
        roughness: 0.22,
        transparent: isXray,
        opacity: isXray ? 0.3 : 1.0,
      }),
    [isXray, isSelected],
  )

  // Lightweight titanium/carbon composite support frame
  const frameMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isSelected ? '#F59E0B' : '#1e293b',
        metalness: 0.9,
        roughness: 0.2,
      }),
    [isSelected],
  )

  // Single wing generator (3 foldable panels + hinges + yoke + SADM drive)
  const renderWing = (direction: 1 | -1) => {
    const panelPositions = [0.85, 1.62, 2.39] // X offsets from wing root
    const rootX = direction * (1.05 + explodedOffset * 0.8)

    return (
      <group position={[rootX, 0, 0]}>
        {/* Solar Array Drive Mechanism (SADM) Stepper Motor & Slip Ring Housing */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.075, 0.075, 0.3, 24]} />
          <meshStandardMaterial
            color={isSelected ? '#F59E0B' : '#2563EB'}
            emissive={isSelected ? '#F59E0B' : '#1E3A8A'}
            emissiveIntensity={isSelected ? 0.7 : 0.25}
            metalness={0.92}
            roughness={0.15}
          />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[direction * 0.08, 0, 0]}>
          <torusGeometry args={[0.082, 0.015, 12, 24]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* Articulated Yoke Structure */}
        <mesh position={[direction * 0.22, 0, 0]}>
          <boxGeometry args={[0.3, 0.045, 0.2]} />
          <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* 3 Accordion Solar Panels */}
        {panelPositions.map((posX, idx) => {
          const actualX = direction * (posX - 0.45)
          return (
            <group key={idx} position={[actualX, 0, 0]}>
              {/* Photovoltaic Silicon Face */}
              <mesh geometry={panelGeo} material={cellMaterial} />

              {/* Glowing High-Tech Edge Framing */}
              <lineSegments geometry={panelEdges}>
                <lineBasicMaterial
                  color={isSelected ? '#10B981' : isHovered ? '#F59E0B' : '#38A3FF'}
                  transparent
                  opacity={isSelected ? 0.95 : isHovered ? 0.8 : 0.55}
                />
              </lineSegments>

              {/* Silicon Cell Conductor Grid Wires */}
              <lineSegments geometry={gridLinesGeo}>
                <lineBasicMaterial
                  color={isSelected ? '#F59E0B' : '#2563EB'}
                  transparent
                  opacity={isSelected ? 0.85 : 0.5}
                />
              </lineSegments>

              {/* Backside Gold Kapton MLI Thermal Sheet */}
              <mesh position={[0, -0.012, 0]}>
                <planeGeometry args={[0.72, 1.26]} />
                <meshStandardMaterial {...kaptonMaterial} side={THREE.BackSide} />
              </mesh>

              {/* Titanium Deployment Hinges */}
              {idx < 2 && (
                <mesh position={[direction * 0.38, 0, 0]} material={frameMaterial}>
                  <cylinderGeometry args={[0.025, 0.025, 0.22, 12]} />
                </mesh>
              )}
            </group>
          )
        })}
      </group>
    )
  }

  return (
    <group
      ref={pulseRef}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.('SOLAR')
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover?.('SOLAR')
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        onHover?.(null)
      }}
    >
      {/* Invisible Raycast Hit Box for effortless clicking across both wings */}
      <mesh position={[2.0 + explodedOffset * 0.8, 0, 0]}>
        <boxGeometry args={[2.5, 0.3, 1.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[-2.0 - explodedOffset * 0.8, 0, 0]}>
        <boxGeometry args={[2.5, 0.3, 1.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Render Starboard and Port Wings */}
      {renderWing(1)}
      {renderWing(-1)}
    </group>
  )
}
