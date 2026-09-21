import React, { useEffect, useRef } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseAlpha: number
}

interface Pulse {
  fromNode: number
  toNode: number
  progress: number // 0 to 1
  speed: number
  color: string
}

export default function TelemetryNetworkBackground({
  className = '',
  nodeCount = 28,
  connectionDistance = 145,
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

    // Initialize calm nodes
    const nodes: Node[] = []
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * (width || window.innerWidth),
        y: Math.random() * (height || window.innerHeight),
        // Very slow, calm motion (approx. 15-25s across screen)
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: 1.4 + Math.random() * 1.2,
        baseAlpha: 0.25 + Math.random() * 0.3,
      })
    }

    // Occasional subtle data packets
    const pulses: Pulse[] = []
    let lastPulseTime = 0

    // Visibility change handler (pause when tab hidden)
    let isVisible = !document.hidden
    const handleVisibilityChange = () => {
      isVisible = !document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    let lastTime = performance.now()

    // Render loop
    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time

      if (isVisible && width > 0 && height > 0) {
        ctx.clearRect(0, 0, width, height)

        // Update nodes if motion not reduced
        if (!prefersReducedMotion) {
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i]
            n.x += n.vx
            n.y += n.vy

            // Wrap around edges smoothly
            if (n.x < -20) n.x = width + 20
            if (n.x > width + 20) n.x = -20
            if (n.y < -20) n.y = height + 20
            if (n.y > height + 20) n.y = -20
          }
        }

        // Draw connections
        const activeConnections: [number, number][] = []
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x
            const dy = nodes[i].y - nodes[j].y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < connectionDistance) {
              const alpha = (1 - dist / connectionDistance) * 0.16
              ctx.beginPath()
              ctx.moveTo(nodes[i].x, nodes[i].y)
              ctx.lineTo(nodes[j].x, nodes[j].y)
              ctx.strokeStyle = `rgba(14, 136, 211, ${alpha})`
              ctx.lineWidth = 0.85
              ctx.stroke()

              activeConnections.push([i, j])
            }
          }
        }

        // Periodically spawn a telemetry packet pulse along an active connection
        if (!prefersReducedMotion && time - lastPulseTime > 3200 && activeConnections.length > 0) {
          lastPulseTime = time
          const [fromNode, toNode] = activeConnections[Math.floor(Math.random() * activeConnections.length)]
          // Occasional orange accent telemetry pulse, predominantly ISRO blue
          const isOrange = Math.random() < 0.2
          pulses.push({
            fromNode,
            toNode,
            progress: 0,
            speed: 0.35 + Math.random() * 0.2, // ~2.5-3 seconds travel time
            color: isOrange ? 'rgba(244, 114, 22, 0.75)' : 'rgba(14, 136, 211, 0.7)',
          })
        }

        // Update and draw pulses
        for (let i = pulses.length - 1; i >= 0; i--) {
          const p = pulses[i]
          p.progress += p.speed * dt

          if (p.progress >= 1) {
            pulses.splice(i, 1)
            continue
          }

          const from = nodes[p.fromNode]
          const to = nodes[p.toNode]
          if (from && to) {
            const px = from.x + (to.x - from.x) * p.progress
            const py = from.y + (to.y - from.y) * p.progress

            ctx.beginPath()
            ctx.arc(px, py, 1.8, 0, Math.PI * 2)
            ctx.fillStyle = p.color
            ctx.fill()
          }
        }

        // Draw nodes
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i]
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(14, 136, 211, ${n.baseAlpha})`
          ctx.fill()
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
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 w-full h-full select-none ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
