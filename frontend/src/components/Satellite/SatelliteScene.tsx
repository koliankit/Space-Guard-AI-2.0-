import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import type { ComponentOut, SubsystemStatus } from '../../types'

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
  selectedComponent,
  isRotating,
  onSelect,
  onHover,
}: {
  subsystems: SubsystemStatus[]
  selectedKey: string | null
  hoveredKey: string | null
  explodedOffset: number
  isXray: boolean
  selectedComponent?: ComponentOut | null
  isRotating: boolean
  onSelect: (key: string) => void
  onHover: (key: string | null) => void
}) {
  const groupRef = useRef<THREE.Group>(null)

  // Controlled slow rotation: ~28 seconds per full revolution (2*PI/28 = ~0.22 rad/s)
  // Pauses when component or subsystem is being inspected
  useFrame((_, delta) => {
    if (groupRef.current && isRotating && !selectedKey && !selectedComponent) {
      groupRef.current.rotation.y += delta * 0.22
    }
  })

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
        emissive: isPaySelected ? '#F59E0B' : isPayHovered ? '#ca8a04' : '#6b4306',
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
        color: '#142B40',
        emissive: '#334155',
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
        <lineBasicMaterial color="#0E88D3" transparent opacity={isXray ? 0.9 : 0.3} />
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
          color={isPaySelected ? '#F59E0B' : '#FFFFFF'}
          transparent
          opacity={isPaySelected ? 0.95 : isXray ? 0.85 : 0.5}
        />
      </lineSegments>

      {/* Titanium Structural Decks (Upper & Lower Separation Rings) */}
      <mesh position={[0, 0.64, 0]}>
        <torusGeometry args={[0.91, 0.035, 14, 36]} />
        <meshStandardMaterial
          color="#94A3B8"
          metalness={0.94}
          roughness={0.15}
          emissive="#1E293B"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0, -0.64, 0]}>
        <torusGeometry args={[0.97, 0.035, 14, 36]} />
        <meshStandardMaterial
          color="#94A3B8"
          metalness={0.94}
          roughness={0.15}
          emissive="#1E293B"
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
          selectedComponent={selectedComponent}
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
      {/* Concentric Holographic Rings in ISRO Blue */}
      {[1.2, 2.0, 2.8, 3.6].map((r, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.015, r, 64]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? '#0E88D3' : '#1D3A52'}
            transparent
            opacity={0.25 - i * 0.04}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Rotating Radar Crosshairs in ISRO Blue */}
      <group ref={radarRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[7.4, 0.02]} />
          <meshBasicMaterial color="#0E88D3" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[7.4, 0.02]} />
          <meshBasicMaterial color="#0E88D3" transparent opacity={0.25} side={THREE.DoubleSide} />
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

      {/* Atmospheric Rim Glow Haze */}
      <mesh>
        <sphereGeometry args={[21.4, 48, 48]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.15}
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
  selectedComponent,
}: {
  subsystems: SubsystemStatus[]
  onSelect: (key: string) => void
  focusKey: string | null
  selectedComponent?: ComponentOut | null
}) {
  const controlsRef = useRef<any>(null)
  const [isAutoRotate, setIsAutoRotate] = useState(true)
  const [isExploded, setIsExploded] = useState(false)
  const [isXray, setIsXray] = useState(false)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'nadir' | 'solar' | 'hga' | 'propulsion'>('iso')
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Subsystem key to focus: explicit focusKey or subsystem of selected component
  const effectiveFocusKey = focusKey || selectedComponent?.subsystem || null

  // Target position when focusing on a specific subsystem
  const targetPos = useMemo(() => {
    if (!effectiveFocusKey) return null
    const sub = subsystems.find((s) => s.key === effectiveFocusKey)
    return sub ? (sub.position as [number, number, number]) : null
  }, [effectiveFocusKey, subsystems])

  // Trigger smooth transition when focusKey, selectedComponent or preset changes
  useEffect(() => {
    if (effectiveFocusKey) {
      setIsTransitioning(true)
    }
  }, [effectiveFocusKey])

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
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background: 'linear-gradient(180deg, #EAF4FB 0%, #F4F8FB 50%, #DCECF7 100%)',
      }}
    >
      {/* Subtle blue radial space glow behind the satellite */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-45"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(14, 136, 211, 0.22) 0%, transparent 65%)',
        }}
      />

      {/* Telemetry Mission Control HUD Overlay */}
      <SatelliteHUD
        subsystems={subsystems}
        selectedKey={effectiveFocusKey}
        hoveredKey={hoveredKey}
        selectedComponent={selectedComponent}
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
          gl={{ alpha: true, antialias: true }}
          className="cursor-grab active:cursor-grabbing"
          onPointerMissed={() => {
            // Deselect when clicking empty space
            if (focusKey) onSelect('')
          }}
        >
        {/* Light Space Environment Lighting */}
        <ambientLight intensity={0.65} color="#DCECF7" />

        {/* Primary Sunlight (Sharp high-altitude solar specular) */}
        <directionalLight position={[6, 8, 4]} intensity={2.4} color="#ffffff" />

        {/* Earth Albedo Bounce Light (Crisp reflection from below) */}
        <directionalLight position={[-3, -6, 2]} intensity={0.8} color="#E2E8F0" />

        {/* ISRO Telemetry Blue Solar Specular Light */}
        <pointLight position={[-5, 2, -4]} intensity={0.6} color="#0E88D3" />

        {/* Soft Celestial Starfield */}
        <Stars radius={110} depth={50} count={1200} factor={2.2} saturation={0.3} fade speed={0.4} />

        {/* Distant Earth Horizon */}
        <EarthBackground />

        {/* Holographic Concentric Radar Floor */}
        <HologramFloor />

        {/* Detailed Modular Spacecraft with Controlled Slow Rotation */}
        <SpacecraftModel
          subsystems={subsystems}
          selectedKey={effectiveFocusKey}
          hoveredKey={hoveredKey}
          explodedOffset={isExploded ? 1.0 : 0.0}
          isXray={isXray}
          selectedComponent={selectedComponent}
          isRotating={isAutoRotate}
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

        {/* Stable Interactive OrbitControls (camera stays steady while model rotates) */}
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
          autoRotate={false}
          onStart={() => {
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
        <div className="flex flex-col items-center justify-center h-full p-6 bg-[#07111C] text-center font-mono">
          <div className="w-12 h-12 rounded-full border border-[#0E88D3]/40 bg-[#0E88D3]/10 flex items-center justify-center text-[#0E88D3] mb-3 shadow-sm">
            &#128752;
          </div>
          <div className="text-[#0E88D3] font-display font-bold text-xs uppercase tracking-wider mb-1">
            3D Spacecraft Canvas (Fallback Telemetry Mode)
          </div>
          <div className="text-[#9AAFC0] text-[10px] max-w-sm">
            Hardware acceleration is inactive in this browser session. Spacecraft telemetry and subsystem diagnostics remain fully active.
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
