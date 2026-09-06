import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import type { SubsystemStatus } from '../../types'

import SolarWings from './SolarWings'
import AntennaArray from './AntennaArray'
import PropulsionDeck from './PropulsionDeck'
import SatelliteEquipment from './SatelliteEquipment'
import SatelliteHUD from './SatelliteHUD'

interface CameraControllerProps {
  preset: 'iso' | 'nadir' | 'solar' | 'hga' | 'propulsion'
  targetPos: [number, number, number] | null
  controlsRef: React.RefObject<any>
  isTransitioning: boolean
  onTransitionEnd: () => void
}

function CameraController({
  preset,
  targetPos,
  controlsRef,
  isTransitioning,
  onTransitionEnd,
}: CameraControllerProps) {
  const { camera } = useThree()

  useFrame((_, delta) => {
    // Only lerp camera during active transitions (e.g. preset change or subsystem selection)
    // Once the user interacts or transition completes, OrbitControls has 100% control
    if (!isTransitioning) return

    let desiredPos = new THREE.Vector3(0, 1.6, 5.8)
    let desiredLook = new THREE.Vector3(0, 0, 0)

    if (targetPos) {
      // Offset camera nicely relative to the target equipment
      desiredLook = new THREE.Vector3(...targetPos)
      desiredPos = new THREE.Vector3(
        targetPos[0] * 1.8 + (targetPos[0] >= 0 ? 1.2 : -1.2),
        targetPos[1] * 1.6 + 0.6,
        targetPos[2] * 1.8 + 2.2,
      )
    } else {
      switch (preset) {
        case 'nadir': // Earth-facing nadir optical sensor view
          desiredPos = new THREE.Vector3(0, -3.2, 4.0)
          break
        case 'solar': // Side view focusing on the photovoltaic arrays
          desiredPos = new THREE.Vector3(4.8, 0.6, 2.4)
          break
        case 'hga': // Top-down view focusing on high gain antenna
          desiredPos = new THREE.Vector3(0.6, 4.2, 2.4)
          break
        case 'propulsion': // Aft view focusing on rocket nozzle and RCS pods
          desiredPos = new THREE.Vector3(0, -3.8, -2.4)
          break
        case 'iso':
        default:
          desiredPos = new THREE.Vector3(0, 1.6, 5.8)
          break
      }
    }

    const step = Math.min(1, delta * 4.2)
    camera.position.lerp(desiredPos, step)

    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredLook, step)
      controlsRef.current.update()
    }

    // When close enough, end transition cleanly
    if (camera.position.distanceTo(desiredPos) < 0.04) {
      onTransitionEnd()
    }
  })

  return null
}

function SpacecraftModel({
  subsystems,
  selectedKey,
  hoveredKey,
  explodedOffset,
  isXray,
  onSelect,
  onHover,
}: {
  subsystems: SubsystemStatus[]
  selectedKey: string | null
  hoveredKey: string | null
  explodedOffset: number
  isXray: boolean
  onSelect: (key: string) => void
  onHover: (key: string | null) => void
}) {
  const groupRef = useRef<THREE.Group>(null)

  // Octagonal Chamfered Main Bus Geometry
  const busGeo = useMemo(() => new THREE.CylinderGeometry(0.88, 0.94, 1.28, 8), [])
  const busEdges = useMemo(() => new THREE.EdgesGeometry(busGeo), [busGeo])

  // Realistic Aerospace MLI (Multi-Layer Insulation) Thermal Blanket Material
  const isPaySelected = selectedKey === 'PAY'
  const isPayHovered = hoveredKey === 'PAY'

  const mliMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isPaySelected ? '#f8fafc' : isPayHovered ? '#fef08a' : '#c98a0c',
        emissive: isPaySelected ? '#00f0ff' : isPayHovered ? '#ca8a04' : '#6b4306',
        emissiveIntensity: isPaySelected ? 0.7 : isPayHovered ? 0.4 : 0.15,
        metalness: 0.92,
        roughness: 0.2,
        transparent: isXray,
        opacity: isXray ? 0.28 : 1.0,
      }),
    [isXray, isPaySelected, isPayHovered],
  )

  // Carbon-composite Radiator Cooling Face Material
  const radiatorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0f172a',
        emissive: '#00f0ff',
        emissiveIntensity: 0.08,
        metalness: 0.88,
        roughness: 0.25,
        transparent: isXray,
        opacity: isXray ? 0.25 : 1.0,
      }),
    [isXray],
  )

  // Internal Carbon Truss Structure (visible especially in X-ray mode)
  const trussGeo = useMemo(() => new THREE.BoxGeometry(1.24, 1.05, 1.24), [])
  const trussEdges = useMemo(() => new THREE.EdgesGeometry(trussGeo), [trussGeo])

  return (
    <group ref={groupRef}>
      {/* --- Central Avionics Structural Core Frame --- */}
      <lineSegments geometry={trussEdges}>
        <lineBasicMaterial color="#00FF9D" transparent opacity={isXray ? 0.9 : 0.3} />
      </lineSegments>

      {/* --- Main Bus Octagonal Chassis (MLI Thermal Blanket) --- */}
      <mesh
        geometry={busGeo}
        material={mliMaterial}
        onClick={(e) => {
          e.stopPropagation()
          onSelect('PAY')
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover('PAY')
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          onHover(null)
        }}
      />
      <lineSegments geometry={busEdges}>
        <lineBasicMaterial
          color={isPaySelected ? '#00ff9d' : '#00f0ff'}
          transparent
          opacity={isPaySelected ? 0.95 : isXray ? 0.85 : 0.5}
        />
      </lineSegments>

      {/* Titanium Structural Decks (Upper & Lower Separation Rings) */}
      <mesh position={[0, 0.64, 0]}>
        <torusGeometry args={[0.91, 0.035, 14, 36]} />
        <meshStandardMaterial
          color="#38bdf8"
          metalness={0.94}
          roughness={0.15}
          emissive="#0284c7"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0, -0.64, 0]}>
        <torusGeometry args={[0.97, 0.035, 14, 36]} />
        <meshStandardMaterial
          color="#38bdf8"
          metalness={0.94}
          roughness={0.15}
          emissive="#0284c7"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Silver-Carbon Thermal Radiator Cooling Faces (Port & Starboard) */}
      {[-0.7, 0.7].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} material={radiatorMaterial}>
          <boxGeometry args={[0.024, 0.92, 0.68]} />
        </mesh>
      ))}

      {/* --- Deployable Multi-Panel Solar Wings --- */}
      <SolarWings
        explodedOffset={explodedOffset}
        isXray={isXray}
        isSelected={selectedKey === 'SOLAR'}
        isHovered={hoveredKey === 'SOLAR'}
        onSelect={onSelect}
        onHover={onHover}
      />

      {/* --- High-Gain Parabolic Antenna & Telemetry Mast --- */}
      <AntennaArray
        explodedOffset={explodedOffset}
        isXray={isXray}
        isSelected={selectedKey === 'COM' || selectedKey === 'TEL'}
        isHovered={hoveredKey === 'COM' || hoveredKey === 'TEL'}
        onSelect={onSelect}
        onHover={onHover}
      />

      {/* --- Aft Propulsion Deck & RCS Thrusters --- */}
      <PropulsionDeck
        explodedOffset={explodedOffset}
        isXray={isXray}
        isSelected={selectedKey === 'CTL'}
        isHovered={hoveredKey === 'CTL'}
        onSelect={onSelect}
        onHover={onHover}
      />

      {/* --- Physical 3D Equipment Modules for All 11 Subsystems --- */}
      {subsystems.map((s) => (
        <SatelliteEquipment
          key={s.key}
          subsystem={s}
          isSelected={s.key === selectedKey}
          isHovered={s.key === hoveredKey}
          explodedOffset={explodedOffset}
          isXray={isXray}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </group>
  )
}

function HologramFloor() {
  const radarRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (radarRef.current) {
      radarRef.current.rotation.y += delta * 0.25
    }
  })

  return (
    <group position={[0, -1.4, 0]}>
      {/* Concentric Holographic Rings */}
      {[1.2, 2.0, 2.8, 3.6].map((r, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.015, r, 64]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? '#00F0FF' : '#00FF87'}
            transparent
            opacity={0.35 - i * 0.06}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Rotating Radar Crosshairs in Cyan */}
      <group ref={radarRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[7.4, 0.02]} />
          <meshBasicMaterial color="#00F0FF" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[7.4, 0.02]} />
          <meshBasicMaterial color="#00F0FF" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

function EarthBackground() {
  const earthRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.015
    }
  })

  return (
    <group position={[0, -26, -10]}>
      {/* Deep Blue Oceanic Earth Globe */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[21, 48, 48]} />
        <meshStandardMaterial
          color="#0A192F"
          emissive="#001C3D"
          emissiveIntensity={0.35}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Atmospheric Cyan Rim Glow Haze */}
      <mesh>
        <sphereGeometry args={[21.4, 48, 48]} />
        <meshBasicMaterial
          color="#00F0FF"
          transparent
          opacity={0.22}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

export default function SatelliteScene({
  subsystems,
  onSelect,
  focusKey,
}: {
  subsystems: SubsystemStatus[]
  onSelect: (key: string) => void
  focusKey: string | null
}) {
  const controlsRef = useRef<any>(null)
  const [isAutoRotate, setIsAutoRotate] = useState(true)
  const [isExploded, setIsExploded] = useState(false)
  const [isXray, setIsXray] = useState(false)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'nadir' | 'solar' | 'hga' | 'propulsion'>('iso')
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Target position when focusing on a specific subsystem
  const targetPos = useMemo(() => {
    if (!focusKey) return null
    const sub = subsystems.find((s) => s.key === focusKey)
    return sub ? (sub.position as [number, number, number]) : null
  }, [focusKey, subsystems])

  // Trigger smooth transition when focusKey or preset changes
  useEffect(() => {
    if (focusKey) {
      setIsTransitioning(true)
    }
  }, [focusKey])

  const handleSelectSubsystem = useCallback(
    (key: string) => {
      setIsAutoRotate(false)
      setIsTransitioning(true)
      onSelect(key)
    },
    [onSelect],
  )

  const handleDeselect = useCallback(() => {
    setIsAutoRotate(false)
    setIsTransitioning(true)
    onSelect('')
  }, [onSelect])

  const handlePreset = useCallback((preset: 'iso' | 'nadir' | 'solar' | 'hga' | 'propulsion') => {
    setIsAutoRotate(false)
    setCameraPreset(preset)
    setIsTransitioning(true)
  }, [])

  const handleRotateLeft = useCallback(() => {
    setIsAutoRotate(false)
    setIsTransitioning(false)
    if (controlsRef.current) {
      controlsRef.current.rotateLeft(Math.PI / 8)
      controlsRef.current.update()
    }
  }, [])

  const handleRotateRight = useCallback(() => {
    setIsAutoRotate(false)
    setIsTransitioning(false)
    if (controlsRef.current) {
      controlsRef.current.rotateRight(Math.PI / 8)
      controlsRef.current.update()
    }
  }, [])

  const handleTiltUp = useCallback(() => {
    setIsAutoRotate(false)
    setIsTransitioning(false)
    if (controlsRef.current) {
      controlsRef.current.rotateUp(Math.PI / 12)
      controlsRef.current.update()
    }
  }, [])

  const handleTiltDown = useCallback(() => {
    setIsAutoRotate(false)
    setIsTransitioning(false)
    if (controlsRef.current) {
      controlsRef.current.rotateDown(Math.PI / 12)
      controlsRef.current.update()
    }
  }, [])

  const handleResetView = useCallback(() => {
    setCameraPreset('iso')
    if (controlsRef.current) {
      controlsRef.current.reset()
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
    setIsTransitioning(true)
    setIsAutoRotate(true)
  }, [])

  // Expose global hooks for App-level actions if needed
  useEffect(() => {
    ;(window as any).__spaceguardResumeRotate = () => setIsAutoRotate(true)
    ;(window as any).__spaceguardPauseRotate = () => setIsAutoRotate(false)
    ;(window as any).__spaceguardResetView = handleResetView
  }, [handleResetView])

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Telemetry Mission Control HUD Overlay */}
      <SatelliteHUD
        subsystems={subsystems}
        selectedKey={focusKey}
        hoveredKey={hoveredKey}
        isAutoRotate={isAutoRotate}
        isExploded={isExploded}
        isXray={isXray}
        onToggleRotate={() => setIsAutoRotate((v) => !v)}
        onToggleExploded={() => setIsExploded((v) => !v)}
        onToggleXray={() => setIsXray((v) => !v)}
        onSetCameraPreset={handlePreset}
        onSelectSubsystem={handleSelectSubsystem}
        onResetView={handleResetView}
        onRotateLeft={handleRotateLeft}
        onRotateRight={handleRotateRight}
        onTiltUp={handleTiltUp}
        onTiltDown={handleTiltDown}
        onDeselect={handleDeselect}
      />

      {/* 3D Canvas Scene with Graceful WebGL Error Handling */}
      <CanvasErrorBoundary>
        <Canvas
          camera={{ position: [0, 1.6, 5.8], fov: 42 }}
          className="cursor-grab active:cursor-grabbing"
          onPointerMissed={() => {
            // Deselect when clicking empty space
            if (focusKey) onSelect('')
          }}
        >
        {/* Space Environment Lighting */}
        <ambientLight intensity={0.45} color="#071324" />

        {/* Primary Sunlight (High contrast, sharp specular) */}
        <directionalLight position={[6, 8, 4]} intensity={2.8} color="#fffbf0" />

        {/* Earth Albedo Bounce Light (Cyan/Blue reflection from below) */}
        <directionalLight position={[-3, -6, 2]} intensity={1.2} color="#00F0FF" />

        {/* Neon Green Deep Space Rim Light */}
        <pointLight position={[-5, 2, -4]} intensity={0.9} color="#00FF87" />

        {/* Deep Space Cosmic Starfield */}
        <Stars radius={110} depth={50} count={3400} factor={3.8} saturation={0.7} fade speed={0.8} />

        {/* Distant Earth Horizon */}
        <EarthBackground />

        {/* Holographic Concentric Radar Floor */}
        <HologramFloor />

        {/* Detailed Modular Spacecraft */}
        <SpacecraftModel
          subsystems={subsystems}
          selectedKey={focusKey}
          hoveredKey={hoveredKey}
          explodedOffset={isExploded ? 1.0 : 0.0}
          isXray={isXray}
          onSelect={handleSelectSubsystem}
          onHover={setHoveredKey}
        />

        {/* Smooth Camera Controller during transitions */}
        <CameraController
          preset={cameraPreset}
          targetPos={targetPos}
          controlsRef={controlsRef}
          isTransitioning={isTransitioning}
          onTransitionEnd={() => setIsTransitioning(false)}
        />

        {/* Interactive OrbitControls for 360-degree manual rotation and zoom */}
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          enableDamping={true}
          dampingFactor={0.08}
          rotateSpeed={0.85}
          zoomSpeed={1.0}
          minDistance={1.8}
          maxDistance={14}
          autoRotate={isAutoRotate}
          autoRotateSpeed={0.8}
          onStart={() => {
            // User manually started dragging: pause auto-rotate and cancel any active transition
            setIsAutoRotate(false)
            setIsTransitioning(false)
          }}
        />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  )
}

class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.warn('WebGL / Three.js Canvas Error caught, displaying 2D telemetry schematic:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-[#030E1D] text-center font-mono">
          <div className="w-12 h-12 rounded-full border border-cyan/40 bg-cyan/10 flex items-center justify-center text-cyan mb-3 shadow-neon-cyan">
            &#128752;
          </div>
          <div className="text-cyan font-display font-bold text-xs uppercase tracking-wider mb-1">
            3D Spacecraft Canvas (Fallback Telemetry Mode)
          </div>
          <div className="text-slate-400 text-[10px] max-w-sm">
            Hardware acceleration is inactive in this browser session. Spacecraft telemetry and subsystem diagnostics remain fully active.
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
