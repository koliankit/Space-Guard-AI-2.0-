/**
 * Fritsch-Carlson Monotone Cubic Spline Interpolation for SVG Paths.
 * Guarantees monotonicity: eliminates artificial dips, overshoot, or bulging
 * when plotting non-uniformly spaced time-series (e.g. 0h, 24h, 96h, 168h).
 */

export interface SplinePoint {
  x: number
  y: number
}

export function createMonotoneCubicPath(points: SplinePoint[]): string {
  const n = points.length
  if (n === 0) return ''
  if (n === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  if (n === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`
  }

  // 1. Calculate secants (slopes)
  const dx: number[] = []
  const dy: number[] = []
  const slopes: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const dxi = points[i + 1].x - points[i].x
    const dyi = points[i + 1].y - points[i].y
    dx.push(dxi)
    dy.push(dyi)
    slopes.push(dxi !== 0 ? dyi / dxi : 0)
  }

  // 2. Calculate initial tangents
  const m: number[] = [slopes[0]]
  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      m.push(0)
    } else {
      // Weighted harmonic / interval average
      m.push((slopes[i - 1] * dx[i] + slopes[i] * dx[i - 1]) / (dx[i - 1] + dx[i]))
    }
  }
  m.push(slopes[slopes.length - 1])

  // 3. Fritsch-Carlson limiter to guarantee monotonicity
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
    } else {
      const alpha = m[i] / slopes[i]
      const beta = m[i + 1] / slopes[i]
      const dist = alpha * alpha + beta * beta
      if (dist > 9) {
        const tau = 3 / Math.sqrt(dist)
        m[i] = tau * alpha * slopes[i]
        m[i + 1] = tau * beta * slopes[i]
      }
    }
  }

  // 4. Build SVG cubic Bezier path
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const cp1x = points[i].x + dx[i] / 3
    const cp1y = points[i].y + (m[i] * dx[i]) / 3
    const cp2x = points[i + 1].x - dx[i] / 3
    const cp2y = points[i + 1].y - (m[i + 1] * dx[i]) / 3
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${points[i + 1].x.toFixed(1)} ${points[i + 1].y.toFixed(1)}`
  }
  return path
}
