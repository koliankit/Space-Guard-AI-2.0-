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
}

interface Pulse {
  fromNode: number
  toNode: number
  progress: number // 0 to 1
  duration: number // seconds (3-6s)
  color: string
}

interface AtmosphericParticle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
}

export default function TelemetryNetworkBackground({
  className = '',
  nodeCount = 32,
  connectionDistance = 165,
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

    // Initialize calm nodes (12-25s movement)
    const nodes: Node[] = []
    for (let i = 0; i < nodeCount; i++) {
      const isActiveHub = i % 7 === 0 // few active telemetry hubs (0.45-0.65 opacity)
      nodes.push({
        x: Math.random() * (width || window.innerWidth),
        y: Math.random() * (height || window.innerHeight),
        // Very slow, calm motion (15-25s across screen)
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        radius: isActiveHub ? 2.0 : 1.3 + Math.random() * 0.6,
        baseAlpha: isActiveHub ? 0.48 + Math.random() * 0.16 : 0.18 + Math.random() * 0.22,
        isActiveHub,
        hubPhase: Math.random() * Math.PI * 2,
      })
    }

    // Atmospheric micro-particles (faint floating particles)
    const particles: AtmosphericParticle[] = []
    const particleCount = 16
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * (width || window.innerWidth),
        y: Math.random() * (height || window.innerHeight),
        vx: (Math.random() - 0.5) * 0.08,
        vy: -0.04 - Math.random() * 0.06,
        radius: 0.8 + Math.random() * 0.5,
        alpha: 0.08 + Math.random() * 0.12,
      })
    }

    // Telemetry transmission signal points (slow moving 3-6s, then wait)
    const pulses: Pulse[] = []
    let lastPulseTime = 0
    let nextPulseDelay = 3500 + Math.random() * 2000

    // Visibility change handler (pause when tab hidden)
    let isVisible = !document.hidden
    const handleVisibilityChange = () => {
      isVisible = !document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    let lastTime = performance.now()
    let orbitalAngle = 0

    // Render loop
    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time

      if (isVisible && width > 0 && height > 0) {
        ctx.clearRect(0, 0, width, height)

        // 1. Draw Faint Orbital Arcs in background
        orbitalAngle += dt * 0.018 // slow drift (approx. 350s per rotation)
        ctx.save()
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'
        ctx.lineWidth = 1.1
        ctx.setLineDash([8, 16])

        // Orbital Arc 1: Top-right to bottom-left orbit
        ctx.beginPath()
        ctx.ellipse(width * 0.75, height * 0.35, width * 0.55, height * 0.42, 0.38 + Math.sin(orbitalAngle) * 0.04, 0, Math.PI * 2)
        ctx.stroke()

        // Orbital Arc 2: Lower sweeping trajectory
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.09)'
        ctx.beginPath()
        ctx.ellipse(width * 0.25, height * 0.75, width * 0.65, height * 0.38, -0.25 + Math.cos(orbitalAngle) * 0.03, 0, Math.PI * 2)
        ctx.stroke()

        ctx.setLineDash([])
        ctx.restore()

        // 2. Update and Draw Atmospheric Micro-Particles (Ambient Twinkling Stars)
        if (!prefersReducedMotion) {
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i]
            p.x += p.vx
            p.y += p.vy
            if (p.x < -10) p.x = width + 10
            if (p.x > width + 10) p.x = -10
            if (p.y < -10) p.y = height + 10

            ctx.beginPath()
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(186, 230, 253, ${p.alpha * 1.5})`
            ctx.fill()
          }
        }

        // 3. Update telemetry nodes if motion not reduced
        if (!prefersReducedMotion) {
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i]
            n.x += n.vx
            n.y += n.vy
            n.hubPhase += dt * 0.9

            // Wrap around edges smoothly
            if (n.x < -20) n.x = width + 20
            if (n.x > width + 20) n.x = -20
            if (n.y < -20) n.y = height + 20
            if (n.y > height + 20) n.y = -20
          }
        }

        // 4. Draw Connecting Lines (rgba(56, 189, 248, 0.06 to 0.22))
        const activeConnections: [number, number][] = []
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x
            const dy = nodes[i].y - nodes[j].y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < connectionDistance) {
              const alpha = (1 - dist / connectionDistance) * 0.20 // 0.00 to 0.20
              ctx.beginPath()
              ctx.moveTo(nodes[i].x, nodes[i].y)
              ctx.lineTo(nodes[j].x, nodes[j].y)
              ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0.06, alpha * 1.3)})`
              ctx.lineWidth = 0.8
              ctx.stroke()

              activeConnections.push([i, j])
            }
          }
        }

        // 5. Occasionally spawn moving telemetry signal point along connection line
        if (!prefersReducedMotion && time - lastPulseTime > nextPulseDelay && activeConnections.length > 0) {
          lastPulseTime = time
          nextPulseDelay = 2500 + Math.random() * 2000 // 2.5 - 4.5 seconds interval
          const [fromNode, toNode] = activeConnections[Math.floor(Math.random() * activeConnections.length)]
          const duration = 2.8 + Math.random() * 2.0 // 2.8 - 4.8 seconds travel time
          const isOrange = Math.random() < 0.28 // occasional ISRO saffron telemetry packet
          pulses.push({
            fromNode,
            toNode,
            progress: 0,
            duration,
            color: isOrange ? 'rgba(249, 115, 22, 0.95)' : 'rgba(56, 189, 248, 0.95)',
          })
        }

        // 6. Update and Draw Moving Telemetry Signal Points
        for (let i = pulses.length - 1; i >= 0; i--) {
          const p = pulses[i]
          p.progress += (dt / p.duration)

          if (p.progress >= 1) {
            pulses.splice(i, 1)
            continue
          }

          const from = nodes[p.fromNode]
          const to = nodes[p.toNode]
          if (from && to) {
            const px = from.x + (to.x - from.x) * p.progress
            const py = from.y + (to.y - from.y) * p.progress

            // Glowing telemetry packet outer aura
            ctx.beginPath()
            ctx.arc(px, py, 6, 0, Math.PI * 2)
            ctx.fillStyle = p.color.replace('0.95', '0.22')
            ctx.fill()

            // Glowing core packet
            ctx.beginPath()
            ctx.arc(px, py, 2.4, 0, Math.PI * 2)
            ctx.fillStyle = p.color
            ctx.fill()
          }
        }

        // 7. Draw Telemetry Nodes with Cyan Glow
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i]
          let currentAlpha = n.baseAlpha
          if (n.isActiveHub) {
            // Calm breathing for active hubs
            currentAlpha = 0.55 + 0.25 * Math.sin(n.hubPhase)
          }

          // Outer aura on nodes
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.radius * 2.0, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(56, 189, 248, ${currentAlpha * 0.25})`
          ctx.fill()

          // Core node
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(56, 189, 248, ${Math.min(1, currentAlpha * 1.4)})`
          ctx.fill()

          // Active telemetry hubs have concentric locator ring
          if (n.isActiveHub) {
            ctx.beginPath()
            ctx.arc(n.x, n.y, n.radius * 3.2, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(56, 189, 248, ${currentAlpha * 0.5})`
            ctx.lineWidth = 0.75
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
        backgroundColor: '#0E1D30',
        backgroundImage: `
          radial-gradient(circle at 18% 22%, rgba(14, 165, 233, 0.22) 0%, transparent 55%),
          radial-gradient(circle at 78% 35%, rgba(56, 189, 248, 0.16) 0%, transparent 60%),
          radial-gradient(circle at 50% 75%, rgba(14, 136, 211, 0.18) 0%, transparent 65%),
          radial-gradient(circle at 88% 85%, rgba(30, 64, 110, 0.35) 0%, transparent 55%)
        `,
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  )
}
