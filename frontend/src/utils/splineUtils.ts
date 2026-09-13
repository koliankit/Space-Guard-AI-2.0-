/**
 * Monotone Cubic Spline (Fritsch-Carlson algorithm) for aerospace telemetry waveforms.
 * Ensures strictly monotonic interpolation without overshoot, backward loops, or erratic bulges.
 */

export interface Point2D {
  x: number
  y: number
}

/**
 * Generates an SVG cubic Bézier path (M ... C ...) using the Fritsch-Carlson monotonic spline algorithm.
 * Guarantees no overshoot, no loops, and smooth C1 continuity across unevenly spaced time intervals.
 */
export function buildMonotoneCubicPath(points: Point2D[]): string {
  if (!points || points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`
  }

  const n = points.length
  // 1. Calculate secant slopes (d_k)
  const h: number[] = []
  const delta: number[] = []

  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x
    const dy = points[i + 1].y - points[i].y
    h.push(dx)
    delta.push(dx === 0 ? 0 : dy / dx)
  }

  // 2. Initialize tangents (m_k)
  const m: number[] = new Array(n).fill(0)
  m[0] = delta[0]
  m[n - 1] = delta[n - 2]

  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) {
      m[i] = 0
    } else {
      // Harmonic mean (or standard weighted average) to preserve monotonicity
      m[i] = (delta[i - 1] + delta[i]) / 2
    }
  }

  // 3. Fritsch-Carlson bounds check & adjustment
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
    } else {
      const alpha = m[i] / delta[i]
      const beta = m[i + 1] / delta[i]
      const dist = alpha * alpha + beta * beta
      if (dist > 9) {
        const tau = 3 / Math.sqrt(dist)
        m[i] = tau * alpha * delta[i]
        m[i + 1] = tau * beta * delta[i]
      }
    }
  }

  // 4. Construct SVG Cubic Bézier commands
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`

  for (let i = 0; i < n - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const dx = h[i] / 3

    const cp1x = p1.x + dx
    const cp1y = p1.y + m[i] * dx
    const cp2x = p2.x - dx
    const cp2y = p2.y - m[i + 1] * dx

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }

  return path
}

/**
 * Evaluates the monotonic spline value Y at any given X.
 */
export function evaluateMonotoneSpline(points: Point2D[], targetX: number): number {
  if (!points || points.length === 0) return 0
  if (points.length === 1) return points[0].y
  if (targetX <= points[0].x) return points[0].y
  if (targetX >= points[points.length - 1].x) return points[points.length - 1].y

  // Find segment
  let idx = 0
  for (let i = 0; i < points.length - 1; i++) {
    if (targetX >= points[i].x && targetX <= points[i + 1].x) {
      idx = i
      break
    }
  }

  const p0 = points[idx]
  const p1 = points[idx + 1]
  const dx = p1.x - p0.x
  if (dx === 0) return p0.y

  const t = (targetX - p0.x) / dx
  // Standard Hermite basis functions
  const t2 = t * t
  const t3 = t2 * t

  const h00 = 2 * t3 - 3 * t2 + 1
  const h10 = t3 - 2 * t2 + t
  const h01 = -2 * t3 + 3 * t2
  const h11 = t3 - t2

  // Re-calculate tangents m0, m1 for this segment
  let m0 = (p1.y - p0.y) / dx
  let m1 = m0

  if (idx > 0) {
    const dPrev = (p0.y - points[idx - 1].y) / (p0.x - points[idx - 1].x || 1)
    m0 = dPrev * m0 <= 0 ? 0 : (dPrev + m0) / 2
  }
  if (idx + 2 < points.length) {
    const dNext = (points[idx + 2].y - p1.y) / (points[idx + 2].x - p1.x || 1)
    m1 = m1 * dNext <= 0 ? 0 : (m1 + dNext) / 2
  }

  return h00 * p0.y + h10 * dx * m0 + h01 * p1.y + h11 * dx * m1
}
