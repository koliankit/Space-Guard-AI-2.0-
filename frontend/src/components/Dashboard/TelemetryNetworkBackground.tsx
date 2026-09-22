import React, { useEffect, useRef } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseAlpha: number
  isActiveHub: boolean
  hubPhase: number
  seed: number
}

interface Pulse {
  fromNode: number
  toNode: number
  progress: number // 0 to 1
  duration: number // seconds (3.0 - 5.5s)
  color: string
}

interface StarParticle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseAlpha: number
  twinkleSpeed: number
  phase: number
  layer: number // 0: distant dust, 1: mid-field, 2: foreground
}

interface Spacecraft {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  trail: { x: number; y: number }[]
  beaconTimer: number
  beaconRadius: number
  color: string
}

interface RadarPing {
  hubIndex: number
  radius: number
  maxRadius: number
  alpha: number
  speed: number
}

export default function TelemetryNetworkBackground({
  className = '',
  nodeCount = 38,
  connectionDistance = 170,
}: {
  className?: string
  nodeCount?: number
  connectionDistance?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = 0
    let height = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Resize handler
    const handleResize = () => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    // 1. Initialize Telemetry Network Nodes (38 nodes)
    const nodes: Node[] = []
    for (let i = 0; i < nodeCount; i++) {
      const isActiveHub = i % 6 === 0 // 6-7 active ground tracking stations
      nodes.push({
        x: Math.random() * (width || window.innerWidth),
        y: Math.random() * (height || window.innerHeight),
        // Very slow, smooth drift (20-30s cycle)
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.14,
        radius: isActiveHub ? 2.4 : 1.2 + Math.random() * 0.7,
        baseAlpha: isActiveHub ? 0.75 : 0.28 + Math.random() * 0.22,
        isActiveHub,
        hubPhase: Math.random() * Math.PI * 2,
        seed: Math.random() * 100,
      })
    }

    // 2. Initialize Space Particles / Stars (3 layers of parallax on dark navy)
    const stars: StarParticle[] = []
    const starCount = 48
    for (let i = 0; i < starCount; i++) {
      const layer = i < 24 ? 0 : i < 40 ? 1 : 2
      const speedMultiplier = layer === 0 ? 0.05 : layer === 1 ? 0.10 : 0.18
      stars.push({
        x: Math.random() * (width || window.innerWidth),
        y: Math.random() * (height || window.innerHeight),
        vx: -0.06 * speedMultiplier - (Math.random() * 0.04 * speedMultiplier),
        vy: -0.03 * speedMultiplier - (Math.random() * 0.02 * speedMultiplier),
        radius: layer === 0 ? 0.6 + Math.random() * 0.4 : layer === 1 ? 0.9 + Math.random() * 0.5 : 1.3 + Math.random() * 0.4,
        baseAlpha: layer === 0 ? 0.25 : layer === 1 ? 0.45 : 0.65,
        twinkleSpeed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        layer,
      })
    }

    // 3. Spacecraft Travelling Light Particles (Slow live orbital motion)
    const spacecrafts: Spacecraft[] = [
      {
        x: 40,
        y: (height || window.innerHeight) * 0.28,
        vx: 0.38, // ~22px/sec across screen (~25-30s traversal)
        vy: 0.06,
        angle: 0.15,
        trail: [],
        beaconTimer: 0,
        beaconRadius: 0,
        color: 'rgba(56, 189, 248, 0.95)', // Glowing Cyan-blue telemetry probe
      },
      {
        x: (width || window.innerWidth) * 0.85,
        y: (height || window.innerHeight) * 0.80,
        vx: -0.32,
        vy: -0.08,
        angle: Math.PI + 0.24,
        trail: [],
        beaconTimer: 2.0,
        beaconRadius: 0,
        color: 'rgba(244, 114, 22, 0.95)', // ISRO Deep Mission Telemetry probe
      },
    ]

    // 4. Telemetry Transmission Signal Pulses
    const pulses: Pulse[] = []
    let lastPulseTime = 0
    let nextPulseDelay = 2200 + Math.random() * 1500

    // 5. Radar Pings from Ground Station Hubs
    const radarPings: RadarPing[] = []
    let lastRadarTime = 0

    // Visibility change handler (pause when tab hidden)
    let isVisible = !document.hidden
    const handleVisibilityChange = () => {
      isVisible = !document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    let lastTime = performance.now()
    let globalTime = 0

    // Render loop
    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time
      globalTime += dt

      if (isVisible && width > 0 && height > 0) {
        ctx.clearRect(0, 0, width, height)

        // =========================================================================
        // SUBSYSTEM 1: Subtle Cosmic Light Current on Deep Navy Canvas
        // =========================================================================
        const atmosphericPhase = globalTime * 0.18 // ~35s cycle
        const atmGlowX = width * (0.35 + 0.12 * Math.sin(atmosphericPhase))
        const atmGlowY = height * (0.42 + 0.10 * Math.cos(atmosphericPhase * 0.8))

        const atmGrad = ctx.createRadialGradient(atmGlowX, atmGlowY, 20, atmGlowX, atmGlowY, width * 0.45)
        atmGrad.addColorStop(0, 'rgba(37, 99, 235, 0.07)')
        atmGrad.addColorStop(0.55, 'rgba(20, 184, 166, 0.03)')
        atmGrad.addColorStop(1, 'rgba(11, 23, 38, 0)')
        ctx.fillStyle = atmGrad
        ctx.fillRect(0, 0, width, height)

        // =========================================================================
        // SUBSYSTEM 2: Orbital Mechanics Arcs & Satellite Trackers
        // =========================================================================
        ctx.save()
        const orbitSlowAngle = globalTime * 0.012 // slow continuous drift

        // Arc 1: Geostationary Transfer Orbit (GTO Arc)
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.20)'
        ctx.lineWidth = 1.0
        ctx.setLineDash([6, 16])
        ctx.beginPath()
        const arc1CenterX = width * 0.72
        const arc1CenterY = height * 0.38
        const arc1RadiusX = width * 0.58
        const arc1RadiusY = height * 0.40
        const arc1Rot = 0.32 + Math.sin(orbitSlowAngle) * 0.04
        ctx.ellipse(arc1CenterX, arc1CenterY, arc1RadiusX, arc1RadiusY, arc1Rot, 0, Math.PI * 2)
        ctx.stroke()

        // Arc 2: Low Earth Polar Orbit (LEO Arc)
        ctx.strokeStyle = 'rgba(20, 184, 166, 0.16)'
        ctx.setLineDash([4, 14])
        ctx.beginPath()
        const arc2CenterX = width * 0.28
        const arc2CenterY = height * 0.70
        const arc2RadiusX = width * 0.62
        const arc2RadiusY = height * 0.35
        const arc2Rot = -0.28 + Math.cos(orbitSlowAngle * 0.9) * 0.03
        ctx.ellipse(arc2CenterX, arc2CenterY, arc2RadiusX, arc2RadiusY, arc2Rot, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])

        // Orbiting satellite beacons on the arcs (continuous Keplerian tracking)
        const sat1Theta = globalTime * 0.045 // ~22s per revolution
        const s1X = arc1CenterX + arc1RadiusX * Math.cos(sat1Theta) * Math.cos(arc1Rot) - arc1RadiusY * Math.sin(sat1Theta) * Math.sin(arc1Rot)
        const s1Y = arc1CenterY + arc1RadiusX * Math.cos(sat1Theta) * Math.sin(arc1Rot) + arc1RadiusY * Math.sin(sat1Theta) * Math.cos(arc1Rot)
        ctx.beginPath()
        ctx.arc(s1X, s1Y, 2.0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(34, 211, 238, 0.85)'
        ctx.fill()

        const sat2Theta = -globalTime * 0.038
        const s2X = arc2CenterX + arc2RadiusX * Math.cos(sat2Theta) * Math.cos(arc2Rot) - arc2RadiusY * Math.sin(sat2Theta) * Math.sin(arc2Rot)
        const s2Y = arc2CenterY + arc2RadiusX * Math.cos(sat2Theta) * Math.sin(arc2Rot) + arc2RadiusY * Math.sin(sat2Theta) * Math.cos(arc2Rot)
        ctx.beginPath()
        ctx.arc(s2X, s2Y, 1.8, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(245, 158, 11, 0.85)'
        ctx.fill()

        ctx.restore()

        // =========================================================================
        // SUBSYSTEM 3: Space Particles & Stars (3-Layer Parallax Drift)
        // =========================================================================
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i]
          if (!prefersReducedMotion) {
            s.x += s.vx
            s.y += s.vy
            s.phase += dt * s.twinkleSpeed

            // Wrap continuously without popping
            if (s.x < -10) s.x = width + 10
            if (s.x > width + 10) s.x = -10
            if (s.y < -10) s.y = height + 10
            if (s.y > height + 10) s.y = -10
          }

          const twinkle = 0.7 + 0.3 * Math.sin(s.phase)
          const starAlpha = s.baseAlpha * twinkle

          ctx.beginPath()
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
          // Subtle aerospace stars on light canvas
          ctx.fillStyle = s.layer === 2
            ? `rgba(71, 85, 105, ${starAlpha * 0.28})`
            : s.layer === 1
            ? `rgba(100, 116, 139, ${starAlpha * 0.22})`
            : `rgba(148, 163, 184, ${starAlpha * 0.18})`
          ctx.fill()
        }

        // =========================================================================
        // SUBSYSTEM 4: Travelling Spacecraft Light Particles with Trajectory Wake
        // =========================================================================
        if (!prefersReducedMotion) {
          for (let sc of spacecrafts) {
            // Update position
            sc.x += sc.vx
            sc.y += sc.vy

            // Record trail coordinates (up to 14 points)
            sc.trail.unshift({ x: sc.x, y: sc.y })
            if (sc.trail.length > 14) {
              sc.trail.pop()
            }

            // Beacon pulse timer (every 4 seconds)
            sc.beaconTimer += dt
            if (sc.beaconTimer > 4.0) {
              sc.beaconTimer = 0
              sc.beaconRadius = 2.0
            }
            if (sc.beaconRadius > 0) {
              sc.beaconRadius += dt * 9.0
              if (sc.beaconRadius > 26.0) sc.beaconRadius = 0
            }

            // Continuous screen wrap across canvas
            if (sc.vx > 0 && sc.x > width + 40) {
              sc.x = -40
              sc.y = height * (0.2 + Math.random() * 0.4)
              sc.trail = []
            } else if (sc.vx < 0 && sc.x < -40) {
              sc.x = width + 40
              sc.y = height * (0.55 + Math.random() * 0.35)
              sc.trail = []
            }

            // Draw trailing ion wake
            if (sc.trail.length > 1) {
              for (let t = 0; t < sc.trail.length - 1; t++) {
                const p1 = sc.trail[t]
                const p2 = sc.trail[t + 1]
                const trailAlpha = (1 - t / sc.trail.length) * 0.35
                ctx.beginPath()
                ctx.moveTo(p1.x, p1.y)
                ctx.lineTo(p2.x, p2.y)
                ctx.strokeStyle = sc.color.replace('0.95', trailAlpha.toFixed(3))
                ctx.lineWidth = 1.2 * (1 - t / sc.trail.length)
                ctx.stroke()
              }
            }

            // Draw spacecraft glowing core
            ctx.beginPath()
            ctx.arc(sc.x, sc.y, 2.2, 0, Math.PI * 2)
            ctx.fillStyle = sc.color
            ctx.fill()

            // Draw expanding beacon radar ring
            if (sc.beaconRadius > 0) {
              const ringAlpha = (1 - sc.beaconRadius / 26.0) * 0.38
              ctx.beginPath()
              ctx.arc(sc.x, sc.y, sc.beaconRadius, 0, Math.PI * 2)
              ctx.strokeStyle = sc.color.replace('0.95', ringAlpha.toFixed(3))
              ctx.lineWidth = 0.8
              ctx.stroke()
            }
          }
        }

        // =========================================================================
        // SUBSYSTEM 5: Dynamic Telemetry Network Nodes
        // =========================================================================
        if (!prefersReducedMotion) {
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i]
            // Gentle organic drift with sine wobble
            n.x += n.vx + 0.02 * Math.sin(globalTime * 0.25 + n.seed)
            n.y += n.vy + 0.02 * Math.cos(globalTime * 0.25 + n.seed)
            n.hubPhase += dt * 0.85

            // Smooth boundary reflection
            if (n.x < -20) n.x = width + 20
            if (n.x > width + 20) n.x = -20
            if (n.y < -20) n.y = height + 20
            if (n.y > height + 20) n.y = -20
          }
        }

        // =========================================================================
        // SUBSYSTEM 6: Live Connected Network Lines (Triangulation Mesh)
        // =========================================================================
        const activeConnections: [number, number][] = []
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x
            const dy = nodes[i].y - nodes[j].y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < connectionDistance) {
              // Smooth distance-based falloff
              const alpha = Math.pow(1 - dist / connectionDistance, 1.25) * 0.18
              ctx.beginPath()
              ctx.moveTo(nodes[i].x, nodes[i].y)
              ctx.lineTo(nodes[j].x, nodes[j].y)
              ctx.strokeStyle = `rgba(37, 99, 235, ${Math.max(0.04, alpha * 0.9)})`
              ctx.lineWidth = 0.8
              ctx.stroke()

              activeConnections.push([i, j])
            }
          }
        }

        // =========================================================================
        // SUBSYSTEM 7: Real-Time Telemetry Signal Movement along Links
        // =========================================================================
        // Spawn periodic pulses (2-4 concurrent packets across screen)
        if (!prefersReducedMotion && time - lastPulseTime > nextPulseDelay && activeConnections.length > 0) {
          lastPulseTime = time
          nextPulseDelay = 2200 + Math.random() * 1800 // ~2.2 - 4.0s spawn cycle
          const [fromNode, toNode] = activeConnections[Math.floor(Math.random() * activeConnections.length)]
          const duration = 3.0 + Math.random() * 2.2 // 3.0 - 5.2s slow graceful hop
          const isCyan = Math.random() < 0.45
          pulses.push({
            fromNode,
            toNode,
            progress: 0,
            duration,
            color: isCyan ? 'rgba(34, 211, 238, 0.95)' : 'rgba(37, 99, 235, 0.90)',
          })
        }

        // Update & draw pulses
        for (let i = pulses.length - 1; i >= 0; i--) {
          const p = pulses[i]
          p.progress += dt / p.duration

          if (p.progress >= 1) {
            pulses.splice(i, 1)
            continue
          }

          const from = nodes[p.fromNode]
          const to = nodes[p.toNode]
          if (from && to) {
            const px = from.x + (to.x - from.x) * p.progress
            const py = from.y + (to.y - from.y) * p.progress

            // Pulse glowing core
            ctx.beginPath()
            ctx.arc(px, py, 2.4, 0, Math.PI * 2)
            ctx.fillStyle = p.color
            ctx.fill()

            // Directional telemetry tail along the line
            const tailProgress = Math.max(0, p.progress - 0.08)
            const tx = from.x + (to.x - from.x) * tailProgress
            const ty = from.y + (to.y - from.y) * tailProgress
            ctx.beginPath()
            ctx.moveTo(px, py)
            ctx.lineTo(tx, ty)
            ctx.strokeStyle = p.color.replace('0.95', '0.30').replace('0.90', '0.30')
            ctx.lineWidth = 1.6
            ctx.stroke()
          }
        }

        // =========================================================================
        // SUBSYSTEM 8: Ground Station Radar Range Sweeps
        // =========================================================================
        if (!prefersReducedMotion && globalTime - lastRadarTime > 18.0) {
          lastRadarTime = globalTime
          // Find an active hub to radiate a sweep
          const activeHubIndices: number[] = []
          nodes.forEach((n, idx) => { if (n.isActiveHub) activeHubIndices.push(idx) })
          if (activeHubIndices.length > 0) {
            const hubIdx = activeHubIndices[Math.floor(Math.random() * activeHubIndices.length)]
            radarPings.push({
              hubIndex: hubIdx,
              radius: 4,
              maxRadius: 85,
              alpha: 0.22,
              speed: 16.0,
            })
          }
        }

        for (let i = radarPings.length - 1; i >= 0; i--) {
          const rp = radarPings[i]
          rp.radius += dt * rp.speed
          rp.alpha = (1 - rp.radius / rp.maxRadius) * 0.22

          if (rp.radius >= rp.maxRadius) {
            radarPings.splice(i, 1)
            continue
          }

          const hub = nodes[rp.hubIndex]
          if (hub) {
            ctx.beginPath()
            ctx.arc(hub.x, hub.y, rp.radius, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(0, 90, 156, ${rp.alpha})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }

        // =========================================================================
        // SUBSYSTEM 9: Draw Telemetry Nodes (Solid Muted Blue / Active Station Rings)
        // =========================================================================
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i]
          let currentAlpha = n.baseAlpha * 0.65
          if (n.isActiveHub) {
            currentAlpha = 0.55 + 0.18 * Math.sin(n.hubPhase)
          }

          // Node center
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
          ctx.fillStyle = n.isActiveHub
            ? `rgba(0, 90, 156, ${currentAlpha})`
            : `rgba(51, 78, 104, ${currentAlpha})`
          ctx.fill()

          // Active telemetry hubs have faint concentric locator ring
          if (n.isActiveHub) {
            ctx.beginPath()
            ctx.arc(n.x, n.y, n.radius * 2.8, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(0, 90, 156, ${currentAlpha * 0.35})`
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    if (prefersReducedMotion) {
      render(performance.now())
    } else {
      animationFrameId = requestAnimationFrame(render)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [nodeCount, connectionDistance])

  return (
    <div
      className={`pointer-events-none absolute inset-0 w-full h-full overflow-hidden select-none ${className}`}
      style={{
        zIndex: 0,
        backgroundColor: '#07131F',
        backgroundImage: `
          linear-gradient(168deg, #050E17 0%, #081625 32%, #0B1D2F 65%, #06111C 100%),
          radial-gradient(ellipse 70% 50% at 14% 18%, rgba(14, 136, 211, 0.14) 0%, transparent 65%),
          radial-gradient(ellipse 60% 60% at 86% 28%, rgba(7, 91, 140, 0.12) 0%, transparent 60%),
          radial-gradient(ellipse 80% 60% at 50% 88%, rgba(56, 189, 248, 0.08) 0%, transparent 70%),
          radial-gradient(ellipse 40% 40% at 50% 45%, rgba(14, 165, 233, 0.06) 0%, transparent 60%)
        `,
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  )
}
