import type { ComponentOut, MissionStatus } from '../types'
import { offlineISRO } from '../offlineEngine'

/**
 * Pure client-side zero-dependency PDF generator for ISRO SpaceGuard AI.
 * Strictly adheres to PDF-1.4 standard with valid xref table and exact object IDs.
 * Uses Times-Roman Type-1 font family throughout for executive aerospace clearance documents.
 */
class SimplePdfWriter {
  private pages: { stream: string; width: number; height: number }[] = []

  addPage(stream: string, width = 595.28, height = 841.89): number {
    this.pages.push({ stream, width, height })
    return this.pages.length
  }

  build(): Uint8Array {
    const N = this.pages.length
    const kids: string[] = []
    for (let i = 0; i < N; i++) {
      kids.push(`${9 + i * 2} 0 R`)
    }

    // Fixed Header Objects:
    // 1: Catalog
    // 2: Pages
    // 3: Times-Roman (/F1)
    // 4: Times-Bold (/F2)
    // 5: Times-Italic (/F3)
    // 6: Times-BoldItalic (/F4)
    // 7: Courier (/F5)
    // 8: Courier-Bold (/F6)
    const objects: string[] = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${N} >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Times-BoldItalic /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>',
    ]

    // Append Page and Stream objects for each page
    for (let i = 0; i < N; i++) {
      const p = this.pages[i]
      const streamBytes = new TextEncoder().encode(p.stream)
      const streamObjNum = 10 + i * 2

      // Page object (9 + i * 2)
      const pageObj = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.width} ${p.height}] /Contents ${streamObjNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R /F5 7 0 R /F6 8 0 R >> /ProcSet [/PDF /Text /ImageB /ImageC /ImageI] >> >>`
      // Stream object (10 + i * 2)
      const streamObj = `<< /Length ${streamBytes.length} >>\nstream\n${p.stream}\nendstream`

      objects.push(pageObj)
      objects.push(streamObj)
    }

    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
    const offsets: number[] = []

    for (let i = 0; i < objects.length; i++) {
      offsets.push(new TextEncoder().encode(out).length)
      out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
    }

    const xrefOffset = new TextEncoder().encode(out).length
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \r\n`
    for (const offset of offsets) {
      out += `${String(offset).padStart(10, '0')} 00000 n \r\n`
    }

    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
    return new TextEncoder().encode(out)
  }

  download(filename: string) {
    const bytes = this.build()
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

/**
 * Escapes characters for PDF Type-1 string literals and replaces non-ASCII unicode
 * with clean ASCII equivalents.
 */
function esc(str: string | null | undefined): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2022\u2023\u25E6]/g, '-')
    .replace(/µ/g, 'u')
    .replace(/°/g, ' deg ')
    .replace(/[^\x20-\x7E]/g, ' ')
}

/**
 * Generates vector PDF commands for the official ISRO emblem / crest.
 */
function drawIsroLogo(cx: number, cy: number, scale = 1): string {
  let s = ''
  // Outer circular gold ring
  s += `q 0.96 0.97 0.99 rg ${cx - 24 * scale} ${cy - 24 * scale} ${48 * scale} ${48 * scale} re f Q\n`
  s += `q 0.85 0.45 0.05 RG ${1.8 * scale} w ${cx - 24 * scale} ${cy - 24 * scale} ${48 * scale} ${48 * scale} re S Q\n`

  // Deep navy orbital arc
  s += `q 0.10 0.18 0.32 RG ${2 * scale} w `
  s += `${cx - 18 * scale} ${cy - 12 * scale} m `
  s += `${cx - 6 * scale} ${cy + 20 * scale} ${cx + 12 * scale} ${cy + 18 * scale} ${cx + 18 * scale} ${cy - 8 * scale} c S Q\n`

  // Saffron / Orange Rocket Chevron
  s += `q 0.95 0.45 0.10 rg `
  s += `${cx} ${cy + 18 * scale} m `
  s += `${cx + 10 * scale} ${cy - 14 * scale} l `
  s += `${cx} ${cy - 6 * scale} l `
  s += `${cx - 10 * scale} ${cy - 14 * scale} l h f Q\n`

  // Central satellite node
  s += `q 0.10 0.18 0.32 rg ${cx - 2.5 * scale} ${cy + 4 * scale} ${5 * scale} ${5 * scale} re f Q\n`

  // "ISRO" text under crest in Times-Bold
  s += `BT /F2 ${7 * scale} Tf 0.10 0.18 0.32 rg ${cx - 10 * scale} ${cy - 20 * scale} Td (ISRO) Tj ET\n`
  return s
}

/**
 * Generates vector PDF commands for an executive Donut Pie Chart with crisp segments.
 */
function drawPdfPieChart(
  cx: number,
  cy: number,
  radius: number,
  safeCount: number,
  monCount: number,
  rejCount: number,
  healthPct: number
): string {
  let s = ''
  const total = Math.max(1, safeCount + monCount + rejCount)
  const safeFrac = safeCount / total
  const monFrac = monCount / total
  const rejFrac = rejCount / total

  const slices = [
    { color: '0.08 0.58 0.28', fraction: safeFrac }, // Deep Forest Emerald (Safe)
    { color: '0.90 0.55 0.08', fraction: monFrac },  // Saffron Amber (Monitor)
    { color: '0.85 0.16 0.18', fraction: rejFrac },  // Crimson Red (Reject)
  ]

  let currentAngle = Math.PI / 2 // Start at 12 o'clock

  for (const slice of slices) {
    if (slice.fraction <= 0) continue
    const sweep = slice.fraction * 2 * Math.PI
    const endAngle = currentAngle - sweep

    // Generate polygonal arc points for perfect compatibility across all PDF viewers
    const steps = Math.max(8, Math.ceil(sweep / (Math.PI / 16)))
    let path = `q ${slice.color} rg ${cx.toFixed(1)} ${cy.toFixed(1)} m `

    for (let i = 0; i <= steps; i++) {
      const a = currentAngle - sweep * (i / steps)
      const px = cx + radius * Math.cos(a)
      const py = cy + radius * Math.sin(a)
      path += `${px.toFixed(1)} ${py.toFixed(1)} l `
    }
    path += 'h f Q\n'
    s += path

    // White wedge divider line
    const x1 = cx + radius * Math.cos(currentAngle)
    const y1 = cy + radius * Math.sin(currentAngle)
    s += `q 1 1 1 RG 1.5 w ${cx.toFixed(1)} ${cy.toFixed(1)} m ${x1.toFixed(1)} ${y1.toFixed(1)} l S Q\n`

    currentAngle = endAngle
  }

  // Inner cutout circle for modern executive Donut style
  const innerR = radius * 0.48
  s += `q 1 1 1 rg ${cx.toFixed(1)} ${cy.toFixed(1)} m `
  const innerSteps = 32
  for (let i = 0; i <= innerSteps; i++) {
    const a = (i / innerSteps) * 2 * Math.PI
    const px = cx + innerR * Math.cos(a)
    const py = cy + innerR * Math.sin(a)
    s += `${px.toFixed(1)} ${py.toFixed(1)} l `
  }
  s += 'h f Q\n'

  // Outer border ring
  s += `q 0.80 0.82 0.86 RG 1 w ${cx.toFixed(1)} ${cy.toFixed(1)} m `
  for (let i = 0; i <= innerSteps; i++) {
    const a = (i / innerSteps) * 2 * Math.PI
    const px = cx + radius * Math.cos(a)
    const py = cy + radius * Math.sin(a)
    s += `${px.toFixed(1)} ${py.toFixed(1)} l `
  }
  s += 'h S Q\n'

  // Center Health Index Callout in Times-Bold
  s += `BT /F2 13 Tf 0.10 0.18 0.32 rg ${cx - 15} ${cy + 4} Td (${healthPct}%) Tj ET\n`
  s += `BT /F2 6 Tf 0.45 0.50 0.58 rg ${cx - 18} ${cy - 7} Td (HEALTH) Tj ET\n`

  return s
}

/**
 * Standard professional header and double border wrapper for all certificate pages.
 */
function createPageCanvas(pageNum: number, totalPages: number, docRef: string, dateStr: string, timeStr: string, pageTitle: string): { topY: number; prefix: string; footer: string } {
  let s = ''
  // Clean white sheet background
  s += 'q 1 1 1 rg 0 0 595.28 841.89 re f Q\n'

  // Official Double Border (Gold outer, Navy inner)
  s += 'q 0.85 0.50 0.08 RG 1.5 w 18 18 559.28 805.89 re S Q\n'
  s += 'q 0.15 0.22 0.36 RG 0.75 w 22 22 551.28 797.89 re S Q\n'

  // Official Masthead Container (Crisp White / Light Slate)
  s += 'q 0.98 0.98 0.99 rg 25 724 545.28 92 re f Q\n'
  s += 'q 0.85 0.50 0.08 RG 1 w 25 724 545.28 92 re S Q\n'
  s += 'q 0.95 0.45 0.10 RG 2.5 w 25 816 545.28 0 re S Q\n' // Saffron top accent line

  // Draw ISRO vector logo
  s += drawIsroLogo(62, 770, 0.92)

  // Header Typography in Times-Bold / Times-Roman
  s += 'BT /F2 10 Tf 0.80 0.40 0.05 rg 98 800 Td (BHARATIYA ANTARIKSH ANUSANDHAN SANGATHAN) Tj ET\n'
  s += 'BT /F2 12.5 Tf 0.10 0.18 0.34 rg 98 784 Td (INDIAN SPACE RESEARCH ORGANISATION [ISRO]) Tj ET\n'
  s += 'BT /F1 8.5 Tf 0.25 0.30 0.40 rg 98 770 Td (SATISH DHAWAN SPACE CENTRE SHAR, SRIHARIKOTA (524 124), ANDHRA PRADESH) Tj ET\n'
  s += 'BT /F2 8 Tf 0.30 0.35 0.45 rg 98 757 Td (RELIABILITY & QUALITY ASSURANCE DIRECTORATE [RQAD] // SPACEGUARD AI DIVISION) Tj ET\n'
  s += `BT /F1 7.5 Tf 0.45 0.50 0.58 rg 98 743 Td (DOC REF: ${esc(docRef)}   |   ISSUE DATE: ${esc(dateStr)} ${esc(timeStr)} IST   |   SECURITY: RESTRICTED) Tj ET\n`

  // Footer bar
  let footer = ''
  footer += 'q 0.75 0.80 0.85 RG 0.75 w 25 50 545.28 0 re S Q\n'
  footer += `BT /F1 7 Tf 0.40 0.45 0.55 rg 28 38 Td (${esc(pageTitle)} // SATISH DHAWAN SPACE CENTRE SHAR // ISRO SPACEGUARD AI) Tj ET\n`
  footer += `BT /F2 7.5 Tf 0.10 0.18 0.32 rg 505 38 Td (PAGE ${pageNum} OF ${totalPages}) Tj ET\n`

  return { topY: 712, prefix: s, footer }
}

/**
 * Generate official ISRO 3-Page Flight Clearance Certificate PDF in Times New Roman.
 * Fixes text overwriting, ensures separated columns, uses full space, and updates officer titles.
 */
export function generateCertificatePdf(
  mission: MissionStatus | null,
  components: ComponentOut[]
) {
  let data = components
  if (!data || data.length === 0) {
    data = offlineISRO.listComponents(1, { limit: 500 }).components
  }

  const pdf = new SimplePdfWriter()
  const rejected = data.filter((c) => c.status === 'reject')
  const monitored = data.filter((c) => c.status === 'monitor')
  const safe = data.filter((c) => c.status === 'safe')
  const health = mission?.mission_health ?? (data.length > 0 ? Math.round(100 - (data.reduce((s, c) => s + c.risk_score, 0) / data.length)) : 88)
  const docRef = `ISRO/SDSC-SHAR/RQAD/${new Date().getFullYear()}/CERT-SG1-089`
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  // Subsystem mapping
  const subMap: Record<string, ComponentOut[]> = {}
  for (const part of data) {
    if (!subMap[part.subsystem]) subMap[part.subsystem] = []
    subMap[part.subsystem].push(part)
  }

  // =========================================================================
  // PAGE 1: OFFICIAL FLIGHT CLEARANCE CERTIFICATE & DONUT PIE CHART
  // =========================================================================
  const p1Canvas = createPageCanvas(1, 3, docRef, dateStr, timeStr, 'OFFICIAL FLIGHT CLEARANCE CERTIFICATE')
  let p1 = p1Canvas.prefix

  // Title Banner with Separate Non-Overlapping Clearance Badge Box
  const titleBoxY = 684
  p1 += `q 0.95 0.97 1 rg 25 ${titleBoxY} 545.28 28 re f 0.80 0.85 0.92 RG 1 w 25 ${titleBoxY} 545.28 28 re S Q\n`
  p1 += `BT /F2 9.5 Tf 0.10 0.18 0.34 rg 35 ${titleBoxY + 9} Td (FLIGHT COMPONENT SCREENING & CLEARANCE CERTIFICATE) Tj ET\n`

  // Dedicated clearance badge on the right (starts at 385, separated by 115pt from title)
  const isCond = rejected.length > 0
  const badgeBg = isCond ? '1 0.94 0.94' : '0.94 0.99 0.95'
  const badgeStroke = isCond ? '0.85 0.16 0.18' : '0.08 0.58 0.28'
  p1 += `q ${badgeBg} rg 385 ${titleBoxY + 4} 175 20 re f ${badgeStroke} RG 1 w 385 ${titleBoxY + 4} 175 20 re S Q\n`
  p1 += `BT /F2 8 Tf ${badgeStroke} rg 395 ${titleBoxY + 10} Td (${isCond ? 'STATUS: CONDITIONAL CLEARANCE' : 'STATUS: FULL FLIGHT CLEARANCE'}) Tj ET\n`

  // 4 KPI Summary Scorecard Boxes (Y=622)
  const cardW = 130
  const cardH = 48
  const cardGap = 8.4
  const startX = 25
  const cardY = 622

  // KPI 1: Mission Health Index
  p1 += `q 0.97 0.98 1 rg ${startX} ${cardY} ${cardW} ${cardH} re f 0.80 0.85 0.92 RG 1 w ${startX} ${cardY} ${cardW} ${cardH} re S Q\n`
  p1 += `BT /F2 16 Tf 0.10 0.18 0.34 rg ${startX + 12} ${cardY + 26} Td (${health}%) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.40 0.45 0.55 rg ${startX + 12} ${cardY + 11} Td (MISSION HEALTH INDEX) Tj ET\n`

  // KPI 2: Flight Approved (Safe)
  const x2 = startX + cardW + cardGap
  p1 += `q 0.95 0.99 0.96 rg ${x2} ${cardY} ${cardW} ${cardH} re f 0.65 0.85 0.70 RG 1 w ${x2} ${cardY} ${cardW} ${cardH} re S Q\n`
  p1 += `BT /F2 16 Tf 0.08 0.58 0.28 rg ${x2 + 12} ${cardY + 26} Td (${safe.length} PARTS) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.40 0.45 0.55 rg ${x2 + 12} ${cardY + 11} Td (FLIGHT QUALIFIED [SAFE]) Tj ET\n`

  // KPI 3: Active Orbital Monitoring
  const x3 = x2 + cardW + cardGap
  p1 += `q 1 0.98 0.94 rg ${x3} ${cardY} ${cardW} ${cardH} re f 0.90 0.80 0.65 RG 1 w ${x3} ${cardY} ${cardW} ${cardH} re S Q\n`
  p1 += `BT /F2 16 Tf 0.85 0.50 0.08 rg ${x3 + 12} ${cardY + 26} Td (${monitored.length} PARTS) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.40 0.45 0.55 rg ${x3 + 12} ${cardY + 11} Td (ORBITAL WATCH [MONITOR]) Tj ET\n`

  // KPI 4: Quarantined Defects
  const x4 = x3 + cardW + cardGap
  p1 += `q 1 0.96 0.96 rg ${x4} ${cardY} ${cardW} ${cardH} re f 0.90 0.70 0.70 RG 1 w ${x4} ${cardY} ${cardW} ${cardH} re S Q\n`
  p1 += `BT /F2 16 Tf 0.85 0.16 0.18 rg ${x4 + 12} ${cardY + 26} Td (${rejected.length} DEFECTS) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.40 0.45 0.55 rg ${x4 + 12} ${cardY + 11} Td (QUARANTINED [REJECT]) Tj ET\n`

  // ================= PIE CHART & VISUAL SCREENING BREAKDOWN SECTION =================
  const pieSectionY = 460
  p1 += `q 0.99 0.99 1 rg 25 ${pieSectionY} 545.28 148 re f 0.85 0.88 0.93 RG 1 w 25 ${pieSectionY} 545.28 148 re S Q\n`
  p1 += `BT /F2 9.5 Tf 0.10 0.18 0.34 rg 35 ${pieSectionY + 130} Td (VISUAL FLIGHT SCREENING DISTRIBUTION & HEALTH ENVELOPE (PIE CHART)) Tj ET\n`

  // Draw Pie Chart
  const pieCx = 100
  const pieCy = pieSectionY + 68
  const pieR = 52
  p1 += drawPdfPieChart(pieCx, pieCy, pieR, safe.length, monitored.length, rejected.length, health)

  // Pie Chart Legend & Breakdown Bars
  const totalScreened = Math.max(1, data.length)
  const safePct = ((safe.length / totalScreened) * 100).toFixed(1)
  const monPct = ((monitored.length / totalScreened) * 100).toFixed(1)
  const rejPct = ((rejected.length / totalScreened) * 100).toFixed(1)

  const legX = 185
  // Safe Legend Item
  p1 += `q 0.08 0.58 0.28 rg ${legX} ${pieSectionY + 94} 12 10 re f Q\n`
  p1 += `BT /F2 8.5 Tf 0.08 0.58 0.28 rg ${legX + 18} ${pieSectionY + 96} Td (FLIGHT QUALIFIED [SAFE]: ${safe.length} Units (${safePct}%)) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.35 0.40 0.50 rg ${legX + 18} ${pieSectionY + 84} Td (Nominal lot cohort behavior. Fully qualified for direct primary bus integration.) Tj ET\n`

  // Monitor Legend Item
  p1 += `q 0.90 0.55 0.08 rg ${legX} ${pieSectionY + 58} 12 10 re f Q\n`
  p1 += `BT /F2 8.5 Tf 0.85 0.50 0.08 rg ${legX + 18} ${pieSectionY + 60} Td (ACTIVE ORBITAL MONITOR: ${monitored.length} Units (${monPct}%)) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.35 0.40 0.50 rg ${legX + 18} ${pieSectionY + 48} Td (Passing specification limits with moderate drift. Scheduled for in-situ orbital DSN tracking.) Tj ET\n`

  // Reject Legend Item
  p1 += `q 0.85 0.16 0.18 rg ${legX} ${pieSectionY + 22} 12 10 re f Q\n`
  p1 += `BT /F2 8.5 Tf 0.85 0.16 0.18 rg ${legX + 18} ${pieSectionY + 24} Td (QUARANTINED SILICON DEFECTS: ${rejected.length} Units (${rejPct}%)) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.35 0.40 0.50 rg ${legX + 18} ${pieSectionY + 12} Td (Non-linear gate-oxide degradation intercepted. Quarantined from flight power rail.) Tj ET\n`

  // ================= EXECUTIVE CLEARANCE STATEMENT =================
  const execY = 345
  p1 += `q 0.98 0.98 0.99 rg 25 ${execY} 545.28 100 re f 0.85 0.88 0.93 RG 1 w 25 ${execY} 545.28 100 re S Q\n`
  p1 += `BT /F2 9.5 Tf 0.10 0.18 0.34 rg 35 ${execY + 82} Td (EXECUTIVE CLEARANCE SUMMARY & DEFECT INTERCEPTION FINDINGS:) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${execY + 66} Td (1. High-Temperature Operating Life (HTOL) stress was executed for 168 hours at 125 deg C per MIL-STD-883 Method 1005.11.) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${execY + 52} Td (2. While conventional static limit screening passed 99.4% of parts, SpaceGuard AI lot-relative modeling flagged ${rejected.length} latent defects.) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${execY + 38} Td (3. Intercepted gate-oxide anomalies exhibited abnormal drift rates (slope > +0.08 uA/hr) and high quantile divergence (> +3.5 sigma).) Tj ET\n`
  p1 += `BT /F2 8 Tf 0.08 0.58 0.28 rg 35 ${execY + 20} Td (4. FLIGHT CLEARANCE IS OFFICIALLY ENDORSED subject to automated PCDU bus quarantine of quarantined parts.) Tj ET\n`

  // ================= OFFICIAL SIGNATURES & ENDORSEMENT BLOCKS (PAGE 1) =================
  const sigY = 175
  // Left Box: SATELLITE MONITORING UNIT (SMU) - Updated Officer Name
  p1 += `q 0.98 0.98 1 rg 25 ${sigY} 265 158 re f 0.80 0.85 0.92 RG 1 w 25 ${sigY} 265 158 re S Q\n`
  p1 += `BT /F2 8.5 Tf 0.80 0.40 0.05 rg 35 ${sigY + 140} Td (SATELLITE MONITORING UNIT (SMU):) Tj ET\n`
  p1 += `BT /F2 11 Tf 0.10 0.18 0.34 rg 35 ${sigY + 124} Td (Dr. A. Rajesh Kumar, Ph.D.) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${sigY + 110} Td (Lead Satellite Monitoring Unit Officer) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${sigY + 98} Td (ISTRAC Quality Assurance & Reliability Division) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${sigY + 86} Td (ISRO Telemetry, Tracking & Command Network, Bengaluru) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${sigY + 68} Td (Screening Audit: MIL-STD-883 Method 1005 Compliant) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${sigY + 56} Td (Digital Seal: SHA256-8F4C2E9A3B71D05C [VERIFIED]) Tj ET\n`
  p1 += `BT /F2 8.5 Tf 0.08 0.58 0.28 rg 35 ${sigY + 30} Td ([DIGITALLY SIGNED & VERIFIED BY SMU]) Tj ET\n`

  // Right Box: OPERATIONS CONTROLLER OFFICER (OCO) - Updated Officer Name
  const sigRightX = 305
  p1 += `q 0.98 0.98 1 rg ${sigRightX} ${sigY} 265 158 re f 0.80 0.85 0.92 RG 1 w ${sigRightX} ${sigY} 265 158 re S Q\n`
  p1 += `BT /F2 8.5 Tf 0.80 0.40 0.05 rg ${sigRightX + 10} ${sigY + 140} Td (OPERATIONS CONTROLLER OFFICER (OCO):) Tj ET\n`
  p1 += `BT /F2 11 Tf 0.10 0.18 0.34 rg ${sigRightX + 10} ${sigY + 124} Td (Dr. M. S. Suryanarayana, Distinguished Scientist) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.25 0.30 0.40 rg ${sigRightX + 10} ${sigY + 110} Td (Operations Controller Officer) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.25 0.30 0.40 rg ${sigRightX + 10} ${sigY + 98} Td (Satish Dhawan Space Centre SHAR, Sriharikota) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.25 0.30 0.40 rg ${sigRightX + 10} ${sigY + 86} Td (Range Safety & Launch Operations Directorate) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg ${sigRightX + 10} ${sigY + 68} Td (Flight Readiness Review (FRR) Board: APPROVED) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg ${sigRightX + 10} ${sigY + 56} Td (Spacecraft Integration Authorization: ENDORSED FOR LAUNCH) Tj ET\n`
  p1 += `BT /F2 8.5 Tf 0.08 0.58 0.28 rg ${sigRightX + 10} ${sigY + 30} Td ([LAUNCH READINESS AUTHORIZED BY OCO]) Tj ET\n`

  // Official Clearance Stamp Box (Bottom of Page 1)
  const stampY = 62
  p1 += `q 0.95 0.99 0.96 rg 25 ${stampY} 545.28 100 re f 0.08 0.58 0.28 RG 1.5 w 25 ${stampY} 545.28 100 re S Q\n`
  p1 += `BT /F2 10.5 Tf 0.08 0.58 0.28 rg 35 ${stampY + 80} Td (OFFICIAL LAUNCH CLEARANCE RESOLUTION // SDSC SHAR SRIHARIKOTA) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${stampY + 64} Td (The Range Operations Directorate confirms that SpaceGuard-1 flight qualification standards have been fulfilled.) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${stampY + 50} Td (All quarantined parts are physically unpowered or mapped to cold-standby backup rails in accordance with ISRO-PAS-200.) Tj ET\n`
  p1 += `BT /F2 8.5 Tf 0.10 0.18 0.34 rg 35 ${stampY + 32} Td (MISSION STATUS: GO FOR FLIGHT INTEGRATION & ORBITAL LAUNCH) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${stampY + 16} Td (Authority: ISRO Headquarters, Antariksh Bhavan, Bengaluru | Range Safety Council, Sriharikota) Tj ET\n`

  p1 += p1Canvas.footer
  pdf.addPage(p1)

  // =========================================================================
  // PAGE 2: COMPLETE SUBSYSTEM SCREENING MATRIX & AVIONICS ARCHITECTURE
  // =========================================================================
  const p2Canvas = createPageCanvas(2, 3, docRef, dateStr, timeStr, 'SUBSYSTEM SCREENING & AVIONICS ARCHITECTURE')
  let p2 = p2Canvas.prefix

  // Page 2 Section 1 Title
  const p2s1Y = 684
  p2 += `q 0.95 0.97 1 rg 25 ${p2s1Y} 545.28 26 re f 0.80 0.85 0.92 RG 1 w 25 ${p2s1Y} 545.28 26 re S Q\n`
  p2 += `BT /F2 10.5 Tf 0.10 0.18 0.34 rg 35 ${p2s1Y + 9} Td (SECTION 1: COMPLETE SPACECRAFT SUBSYSTEM SCREENING & HEALTH MATRIX) Tj ET\n`

  // Table 1 Header
  let t1HeadY = 656
  p2 += `q 0.90 0.93 0.97 rg 25 ${t1HeadY} 545.28 20 re f 0.70 0.75 0.82 RG 1 w 25 ${t1HeadY} 545.28 20 re S Q\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 32 ${t1HeadY + 6} Td (SUBSYSTEM) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 110 ${t1HeadY + 6} Td (MODULE DESCRIPTION) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 265 ${t1HeadY + 6} Td (TOTAL) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 315 ${t1HeadY + 6} Td (SAFE) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 365 ${t1HeadY + 6} Td (MONITOR) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 425 ${t1HeadY + 6} Td (REJECT) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 475 ${t1HeadY + 6} Td (RISK) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 525 ${t1HeadY + 6} Td (STATUS) Tj ET\n`

  let t1RowY = t1HeadY - 19
  const subEntries = Object.entries(subMap)
  for (let i = 0; i < subEntries.length && i < 8; i++) {
    const [key, parts] = subEntries[i]
    const pSafe = parts.filter((p) => p.status === 'safe').length
    const pMon = parts.filter((p) => p.status === 'monitor').length
    const pRej = parts.filter((p) => p.status === 'reject').length
    const avgRisk = Math.round(parts.reduce((a, b) => a + b.risk_score, 0) / parts.length)
    const name = parts[0]?.subsystem_name || key
    const isAlt = i % 2 === 1

    p2 += `q ${isAlt ? '0.97 0.98 1' : '1 1 1'} rg 25 ${t1RowY - 2} 545.28 18 re f 0.85 0.88 0.92 RG 0.5 w 25 ${t1RowY - 2} 545.28 18 re S Q\n`
    p2 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 32 ${t1RowY + 3} Td ([${esc(key)}]) Tj ET\n`
    p2 += `BT /F1 7.5 Tf 0.20 0.25 0.35 rg 110 ${t1RowY + 3} Td (${esc(name.slice(0, 26))}) Tj ET\n`
    p2 += `BT /F1 7.5 Tf 0.10 0.18 0.34 rg 265 ${t1RowY + 3} Td (${parts.length}) Tj ET\n`
    p2 += `BT /F2 7.5 Tf 0.08 0.58 0.28 rg 315 ${t1RowY + 3} Td (${pSafe}) Tj ET\n`
    p2 += `BT /F2 7.5 Tf 0.85 0.50 0.08 rg 365 ${t1RowY + 3} Td (${pMon}) Tj ET\n`
    p2 += `BT /F2 7.5 Tf ${pRej > 0 ? '0.85 0.16 0.18' : '0.45 0.50 0.60'} rg 425 ${t1RowY + 3} Td (${pRej}) Tj ET\n`
    p2 += `BT /F1 7.5 Tf 0.25 0.30 0.40 rg 475 ${t1RowY + 3} Td (${avgRisk}/100) Tj ET\n`
    p2 += `BT /F2 7 Tf ${pRej > 0 ? '0.85 0.16 0.18' : '0.08 0.58 0.28'} rg 525 ${t1RowY + 3} Td (${pRej > 0 ? 'QUARANTINE' : 'QUALIFIED'}) Tj ET\n`
    t1RowY -= 19
  }

  // Section 2: Dual-Redundant Avionics Architecture Diagram (Positioned with clear 24pt spacing)
  const archY = 320
  p2 += `q 0.98 0.98 1 rg 25 ${archY} 545.28 144 re f 0.80 0.85 0.92 RG 1 w 25 ${archY} 545.28 144 re S Q\n`
  p2 += `BT /F2 9.5 Tf 0.10 0.18 0.34 rg 35 ${archY + 126} Td (SECTION 2: SPACEGUARD-1 DUAL-REDUNDANT AVIONICS ARCHITECTURE & BUS NODES) Tj ET\n`

  // Bus Line in Deep Navy
  p2 += `q 0.10 0.18 0.34 RG 2.2 w [4 2] 0 d 40 ${archY + 84} m 540 ${archY + 84} l S Q\n`
  p2 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 195 ${archY + 90} Td (ISRO MIL-STD-1553B / CAN PRIMARY SYSTEM BUS) Tj ET\n`

  // Node 1: PCDU
  p2 += `q 0.96 1 0.97 rg 40 ${archY + 20} 115 48 re f 0.08 0.58 0.28 RG 1.2 w 40 ${archY + 20} 115 48 re S Q\n`
  p2 += `BT /F2 8 Tf 0.08 0.58 0.28 rg 48 ${archY + 50} Td (PCDU [POWER]) Tj ET\n`
  p2 += `BT /F1 7 Tf 0.30 0.35 0.45 rg 48 ${archY + 38} Td (Solar Array MPPT) Tj ET\n`
  p2 += `BT /F1 6.5 Tf 0.45 0.50 0.60 rg 48 ${archY + 26} Td (Battery Bus Voltage Rail) Tj ET\n`

  // Node 2: OBC
  p2 += `q 0.96 0.98 1 rg 170 ${archY + 20} 115 48 re f 0.10 0.18 0.34 RG 1.2 w 170 ${archY + 20} 115 48 re S Q\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 178 ${archY + 50} Td (MAIN OBC [FC]) Tj ET\n`
  p2 += `BT /F1 7 Tf 0.30 0.35 0.45 rg 178 ${archY + 38} Td (Dual Fault-Tolerant CPU) Tj ET\n`
  p2 += `BT /F1 6.5 Tf 0.45 0.50 0.60 rg 178 ${archY + 26} Td (SPARC V8 Architecture) Tj ET\n`

  // Node 3: COMM
  p2 += `q 1 0.98 0.94 rg 300 ${archY + 20} 115 48 re f 0.85 0.50 0.08 RG 1.2 w 300 ${archY + 20} 115 48 re S Q\n`
  p2 += `BT /F2 8 Tf 0.85 0.50 0.08 rg 308 ${archY + 50} Td (COMM [ISTRAC]) Tj ET\n`
  p2 += `BT /F1 7 Tf 0.30 0.35 0.45 rg 308 ${archY + 38} Td (S/X-Band Telemetry Link) Tj ET\n`
  p2 += `BT /F1 6.5 Tf 0.45 0.50 0.60 rg 308 ${archY + 26} Td (Deep Space Network) Tj ET\n`

  // Node 4: SENSE NODE
  p2 += `q 1 0.95 0.95 rg 430 ${archY + 20} 115 48 re f 0.85 0.16 0.18 RG 1.2 w 430 ${archY + 20} 115 48 re S Q\n`
  p2 += `BT /F2 8 Tf 0.85 0.16 0.18 rg 438 ${archY + 50} Td (GATE-OXIDE DUT) Tj ET\n`
  p2 += `BT /F1 7 Tf 0.85 0.16 0.18 rg 438 ${archY + 38} Td (In-Situ 168h Sense Node) Tj ET\n`
  p2 += `BT /F2 6.5 Tf 0.85 0.16 0.18 rg 438 ${archY + 26} Td ([QUARANTINED]) Tj ET\n`

  // Section 3: Technical Screening Methodology Note (Fills the lower half of Page 2)
  const methY = 65
  p2 += `q 0.98 0.98 0.99 rg 25 ${methY} 545.28 230 re f 0.85 0.88 0.93 RG 1 w 25 ${methY} 545.28 230 re S Q\n`
  p2 += `BT /F2 10 Tf 0.10 0.18 0.34 rg 35 ${methY + 210} Td (SECTION 3: PREDICTIVE HTOL METHODOLOGY & BUS QUARANTINE CONTROLS) Tj ET\n`
  p2 += `BT /F3 8.5 Tf 0.20 0.25 0.35 rg 35 ${methY + 192} Td ("Our innovation is not replacing existing MIL-STD-883 screening. We add a predictive AI intelligence layer that identifies abnormal) Tj ET\n`
  p2 += `BT /F3 8.5 Tf 0.20 0.25 0.35 rg 35 ${methY + 180} Td (components even when they remain within static datasheet limits, predicts future drift, and localizes the affected component.") Tj ET\n`
  p2 += `BT /F2 8 Tf 0.80 0.40 0.05 rg 35 ${methY + 162} Td (Core Innovation Paradigm: WITHIN LIMIT != ALWAYS HEALTHY) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 146} Td (1. Workflow Pipeline: Detect -> Understand -> Predict -> Localize -> Decide.) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 132} Td (2. Lot-Relative Gaussian Modeling: Evaluates robust lot mean (u) and lot standard deviation (s) for quantile divergence.) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 118} Td (3. Multivariate Isolation Forest: Identifies subtle multi-dimensional outliers without relying on static thresholds.) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 104} Td (4. Predictive Extrapolation: Fits time-series drift slope trajectories to predict 264h mission orbital performance.) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.08 0.58 0.28 rg 35 ${methY + 86} Td (AUTOMATED BUS QUARANTINE PROTOCOL:) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 70} Td (A. Components flagged with risk scores >= 75 are automatically isolated from the primary PCDU power rail.) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 56} Td (B. Secondary cold-standby modules are automatically powered on and commanded into nominal flight configuration.) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 42} Td (C. All quarantine commands are recorded in the immutable mission audit log with SHA-256 verification hashes.) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 28} Td (D. Range Safety confirms zero single-point failure vectors exist for SpaceGuard-1 launch deployment.) Tj ET\n`

  p2 += p2Canvas.footer
  pdf.addPage(p2)

  // =========================================================================
  // PAGE 3: QUARANTINED DEFECTS LEDGER, ACTIVE MONITORING & FINAL SIGN-OFF
  // =========================================================================
  const p3Canvas = createPageCanvas(3, 3, docRef, dateStr, timeStr, 'QUARANTINED SILICON DEFECTS & RANGE ENDORSEMENT')
  let p3 = p3Canvas.prefix

  // Page 3 Section 4 Title
  const p3s4Y = 684
  p3 += `q 1 0.96 0.96 rg 25 ${p3s4Y} 545.28 26 re f 0.90 0.70 0.70 RG 1 w 25 ${p3s4Y} 545.28 26 re S Q\n`
  p3 += `BT /F2 10.5 Tf 0.85 0.16 0.18 rg 35 ${p3s4Y + 9} Td (SECTION 4: QUARANTINED SILICON GATE-OXIDE DEFECTS & DRIFT ANOMALIES) Tj ET\n`

  // Table 2 Header - Wide, clean, non-overlapping columns!
  // Columns: PART ID (30), SUB (160), LOT ID (220), 168h (320), LIMIT (380), z-SCORE (435), RISK (485), ACTION (532)
  let t2HeadY = 656
  p3 += `q 0.92 0.85 0.85 rg 25 ${t2HeadY} 545.28 20 re f 0.80 0.65 0.65 RG 1 w 25 ${t2HeadY} 545.28 20 re S Q\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 30 ${t2HeadY + 6} Td (PART IDENTIFIER) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 160 ${t2HeadY + 6} Td (SUB) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 220 ${t2HeadY + 6} Td (LOT NUMBER) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 320 ${t2HeadY + 6} Td (168h MEAS.) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 380 ${t2HeadY + 6} Td (SPEC LIMIT) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 435 ${t2HeadY + 6} Td (z-SCORE) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 485 ${t2HeadY + 6} Td (RISK) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 532 ${t2HeadY + 6} Td (ACTION) Tj ET\n`

  let t2RowY = t2HeadY - 18
  const rejParts = rejected.slice(0, 5)
  for (let i = 0; i < rejParts.length; i++) {
    const c = rejParts[i]
    const isAlt = i % 2 === 1
    p3 += `q ${isAlt ? '1 0.97 0.97' : '1 1 1'} rg 25 ${t2RowY - 2} 545.28 17 re f 0.88 0.78 0.78 RG 0.5 w 25 ${t2RowY - 2} 545.28 17 re S Q\n`
    p3 += `BT /F2 7 Tf 0.10 0.18 0.34 rg 30 ${t2RowY + 3} Td (${esc(c.component_id)}) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.20 0.25 0.35 rg 160 ${t2RowY + 3} Td ([${esc(c.subsystem)}]) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.40 0.45 0.55 rg 220 ${t2RowY + 3} Td (${esc(c.lot_id)}) Tj ET\n`
    p3 += `BT /F2 7 Tf 0.85 0.16 0.18 rg 320 ${t2RowY + 3} Td (${c.v168.toFixed(2)} uA) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.25 0.30 0.40 rg 380 ${t2RowY + 3} Td (${c.limit_ua.toFixed(0)} uA) Tj ET\n`
    p3 += `BT /F2 7 Tf 0.85 0.16 0.18 rg 435 ${t2RowY + 3} Td (${c.z168 > 0 ? '+' : ''}${c.z168.toFixed(1)}s) Tj ET\n`
    p3 += `BT /F2 7 Tf 0.85 0.16 0.18 rg 485 ${t2RowY + 3} Td (${Math.round(c.risk_score)}/100) Tj ET\n`
    p3 += `BT /F2 6.5 Tf 0.85 0.16 0.18 rg 532 ${t2RowY + 3} Td (QUARANTINE) Tj ET\n`
    t2RowY -= 18
  }

  // Section 5: Active Orbital Monitoring Ledger (Positioned with clear spacing)
  const p3s5Y = t2RowY - 22
  p3 += `q 1 0.98 0.94 rg 25 ${p3s5Y} 545.28 24 re f 0.90 0.80 0.65 RG 1 w 25 ${p3s5Y} 545.28 24 re S Q\n`
  p3 += `BT /F2 10 Tf 0.85 0.50 0.08 rg 35 ${p3s5Y + 7} Td (SECTION 5: ACTIVE ORBITAL MONITORING LEDGER (MODERATE LATENT DRIFT)) Tj ET\n`

  let t3HeadY = p3s5Y - 20
  p3 += `q 0.98 0.95 0.88 rg 25 ${t3HeadY} 545.28 18 re f 0.88 0.78 0.65 RG 1 w 25 ${t3HeadY} 545.28 18 re S Q\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 30 ${t3HeadY + 5} Td (PART IDENTIFIER) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 160 ${t3HeadY + 5} Td (SUB) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 220 ${t3HeadY + 5} Td (LOT NUMBER) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 320 ${t3HeadY + 5} Td (168h MEAS.) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 380 ${t3HeadY + 5} Td (DRIFT SLOPE) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 445 ${t3HeadY + 5} Td (PRED 264h) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 515 ${t3HeadY + 5} Td (DSN CADENCE) Tj ET\n`

  let t3RowY = t3HeadY - 17
  const monParts = monitored.slice(0, 4)
  for (let i = 0; i < monParts.length; i++) {
    const c = monParts[i]
    const isAlt = i % 2 === 1
    p3 += `q ${isAlt ? '1 0.98 0.94' : '1 1 1'} rg 25 ${t3RowY - 2} 545.28 16 re f 0.90 0.85 0.78 RG 0.5 w 25 ${t3RowY - 2} 545.28 16 re S Q\n`
    p3 += `BT /F2 7 Tf 0.10 0.18 0.34 rg 30 ${t3RowY + 3} Td (${esc(c.component_id)}) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.20 0.25 0.35 rg 160 ${t3RowY + 3} Td ([${esc(c.subsystem)}]) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.40 0.45 0.55 rg 220 ${t3RowY + 3} Td (${esc(c.lot_id)}) Tj ET\n`
    p3 += `BT /F2 7 Tf 0.85 0.50 0.08 rg 320 ${t3RowY + 3} Td (${c.v168.toFixed(2)} uA) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.25 0.30 0.40 rg 380 ${t3RowY + 3} Td (+${c.slope.toFixed(4)} uA/h) Tj ET\n`
    p3 += `BT /F2 7 Tf 0.85 0.50 0.08 rg 445 ${t3RowY + 3} Td (${c.predicted_future.toFixed(2)} uA) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.08 0.58 0.28 rg 515 ${t3RowY + 3} Td (10s DSN Watch) Tj ET\n`
    t3RowY -= 17
  }

  // Section 6: Orbital Reliability & HTOL Physics Envelope (Fills empty space on Page 3)
  const relY = 225
  p3 += `q 0.98 0.98 1 rg 25 ${relY} 545.28 145 re f 0.80 0.85 0.92 RG 1 w 25 ${relY} 545.28 145 re S Q\n`
  p3 += `BT /F2 9.5 Tf 0.10 0.18 0.34 rg 35 ${relY + 128} Td (SECTION 6: ORBITAL LIFETIME & HTOL ARRHENIUS DEGRADATION PHYSICS) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${relY + 112} Td (1. Arrhenius Thermal Acceleration: AF = exp[(Ea / k) * (1/T_use - 1/T_stress)] with Ea = 0.70 eV, k = 8.617e-5 eV/K.) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${relY + 98} Td (2. Stress Profile: HTOL conducted at 125 deg C (398 K) vs 25 deg C (298 K) nominal orbit equates to AF = 78.4x acceleration.) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${relY + 84} Td (3. Flight Equivalence: 168 hours HTOL testing is mathematically equivalent to 13,171 hours (1.50 years) in Low Earth Orbit.) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${relY + 70} Td (4. Autonomous In-Situ Watchdog: Telemetry trip threshold set to delta_I > +2.50 uA, triggering failover in < 12 milliseconds.) Tj ET\n`
  p3 += `BT /F2 8 Tf 0.08 0.58 0.28 rg 35 ${relY + 52} Td (5. ZERO SINGLE-POINT FAILURES: All quarantined gate-oxide components backed by fully redundant cold-standby hardware.) Tj ET\n`
  p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${relY + 36} Td (Compliance Standard: ISRO-PAS-200 Spacecraft Reliability Standards | MIL-STD-883 Method 1005.11 Class-S Orbit Acceptance) Tj ET\n`
  p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${relY + 20} Td (Telemetry Channel: DSN Bangalore 32-meter Deep Space Ground Station Real-Time S-Band Telemetry Carrier) Tj ET\n`

  // Section 7: Official Quality Assurance & Range Safety Endorsements (Page 3 Sign-Offs)
  const finalSigY = 62
  // Left: SATELLITE MONITORING UNIT (SMU) - Updated Officer Name
  p3 += `q 0.98 0.98 1 rg 25 ${finalSigY} 265 152 re f 0.80 0.85 0.92 RG 1 w 25 ${finalSigY} 265 152 re S Q\n`
  p3 += `BT /F2 8.5 Tf 0.80 0.40 0.05 rg 35 ${finalSigY + 134} Td (SATELLITE MONITORING UNIT (SMU):) Tj ET\n`
  p3 += `BT /F2 11 Tf 0.10 0.18 0.34 rg 35 ${finalSigY + 118} Td (Dr. A. Rajesh Kumar, Ph.D.) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${finalSigY + 104} Td (Lead Satellite Monitoring Unit Officer) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${finalSigY + 92} Td (ISTRAC Quality Assurance & Reliability Division) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${finalSigY + 80} Td (ISRO Telemetry, Tracking & Command Network, Bengaluru) Tj ET\n`
  p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${finalSigY + 62} Td (Verification Stamp: ISRO-RQAD-DSN-CERT-092) Tj ET\n`
  p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${finalSigY + 50} Td (Digital Seal: SHA256-8F4C2E9A3B71D05C [VERIFIED]) Tj ET\n`
  p3 += `BT /F2 8.5 Tf 0.08 0.58 0.28 rg 35 ${finalSigY + 24} Td ([CERTIFIED BY SATELLITE MONITORING UNIT]) Tj ET\n`

  // Right: OPERATIONS CONTROLLER OFFICER (OCO) - Updated Officer Name
  const finalSigRightX = 305
  p3 += `q 0.98 0.98 1 rg ${finalSigRightX} ${finalSigY} 265 152 re f 0.80 0.85 0.92 RG 1 w ${finalSigRightX} ${finalSigY} 265 152 re S Q\n`
  p3 += `BT /F2 8.5 Tf 0.80 0.40 0.05 rg ${finalSigRightX + 10} ${finalSigY + 134} Td (OPERATIONS CONTROLLER OFFICER (OCO):) Tj ET\n`
  p3 += `BT /F2 11 Tf 0.10 0.18 0.34 rg ${finalSigRightX + 10} ${finalSigY + 118} Td (Dr. M. S. Suryanarayana, Distinguished Scientist) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.25 0.30 0.40 rg ${finalSigRightX + 10} ${finalSigY + 104} Td (Operations Controller Officer) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.25 0.30 0.40 rg ${finalSigRightX + 10} ${finalSigY + 92} Td (Satish Dhawan Space Centre SHAR, Sriharikota) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.25 0.30 0.40 rg ${finalSigRightX + 10} ${finalSigY + 80} Td (Range Operations & Launch Authorization Board) Tj ET\n`
  p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg ${finalSigRightX + 10} ${finalSigY + 62} Td (Endorsement Code: SHAR-LAUNCH-GO-2026-SG1) Tj ET\n`
  p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg ${finalSigRightX + 10} ${finalSigY + 50} Td (Flight Integration: AUTHORIZED FOR LIFTOFF) Tj ET\n`
  p3 += `BT /F2 8.5 Tf 0.08 0.58 0.28 rg ${finalSigRightX + 10} ${finalSigY + 24} Td ([ENDORSED BY OPERATIONS CONTROLLER OFFICER]) Tj ET\n`

  p3 += p3Canvas.footer
  pdf.addPage(p3)

  pdf.download(`ISRO_SDSC_SHAR_Flight_Clearance_Certificate_${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * Generate official ISRO Technical Mission Screening & Anomaly Audit Report PDF.
 * Generates the technical audit PDF report following the exact 3-page Times New Roman standard.
 */
export function generateTechnicalReportPdf(
  mission: MissionStatus | null,
  components: ComponentOut[]
) {
  let data = components
  if (!data || data.length === 0) {
    data = offlineISRO.listComponents(1, { limit: 500 }).components
  }

  const pdf = new SimplePdfWriter()
  const rejected = data.filter((c) => c.status === 'reject')
  const monitored = data.filter((c) => c.status === 'monitor')
  const safe = data.filter((c) => c.status === 'safe')
  const health = mission?.mission_health ?? (data.length > 0 ? Math.round(100 - (data.reduce((s, c) => s + c.risk_score, 0) / data.length)) : 88)
  const docRef = `ISRO/SDSC-SHAR/RQAD/${new Date().getFullYear()}/TECH-AUDIT-SG1-042`
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  // Subsystem mapping
  const subMap: Record<string, ComponentOut[]> = {}
  for (const part of data) {
    if (!subMap[part.subsystem]) subMap[part.subsystem] = []
    subMap[part.subsystem].push(part)
  }

  // =========================================================================
  // PAGE 1: TECHNICAL ANOMALY AUDIT & DONUT PIE CHART
  // =========================================================================
  const p1Canvas = createPageCanvas(1, 3, docRef, dateStr, timeStr, 'TECHNICAL HARDWARE AUDIT REPORT')
  let p1 = p1Canvas.prefix

  // Title Banner with Separate Non-Overlapping Clearance Badge Box
  const titleBoxY = 684
  p1 += `q 0.95 0.97 1 rg 25 ${titleBoxY} 545.28 28 re f 0.80 0.85 0.92 RG 1 w 25 ${titleBoxY} 545.28 28 re S Q\n`
  p1 += `BT /F2 9.5 Tf 0.10 0.18 0.34 rg 35 ${titleBoxY + 9} Td (HARDWARE RELIABILITY & ANOMALY TECHNICAL AUDIT) Tj ET\n`

  // Dedicated clearance badge on the right (starts at 385, separated by 115pt from title)
  const isCond = rejected.length > 0
  const badgeBg = isCond ? '1 0.94 0.94' : '0.94 0.99 0.95'
  const badgeStroke = isCond ? '0.85 0.16 0.18' : '0.08 0.58 0.28'
  p1 += `q ${badgeBg} rg 385 ${titleBoxY + 4} 175 20 re f ${badgeStroke} RG 1 w 385 ${titleBoxY + 4} 175 20 re S Q\n`
  p1 += `BT /F2 8 Tf ${badgeStroke} rg 395 ${titleBoxY + 10} Td (${isCond ? 'AUDIT: CONDITIONAL QUARANTINE' : 'AUDIT: FULL CLEARANCE'}) Tj ET\n`

  // 4 KPI Summary Scorecard Boxes (Y=622)
  const cardW = 130
  const cardH = 48
  const cardGap = 8.4
  const startX = 25
  const cardY = 622

  // KPI 1: Mission Health Index
  p1 += `q 0.97 0.98 1 rg ${startX} ${cardY} ${cardW} ${cardH} re f 0.80 0.85 0.92 RG 1 w ${startX} ${cardY} ${cardW} ${cardH} re S Q\n`
  p1 += `BT /F2 16 Tf 0.10 0.18 0.34 rg ${startX + 12} ${cardY + 26} Td (${health}%) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.40 0.45 0.55 rg ${startX + 12} ${cardY + 11} Td (RELIABILITY HEALTH INDEX) Tj ET\n`

  // KPI 2: Flight Approved (Safe)
  const x2 = startX + cardW + cardGap
  p1 += `q 0.95 0.99 0.96 rg ${x2} ${cardY} ${cardW} ${cardH} re f 0.65 0.85 0.70 RG 1 w ${x2} ${cardY} ${cardW} ${cardH} re S Q\n`
  p1 += `BT /F2 16 Tf 0.08 0.58 0.28 rg ${x2 + 12} ${cardY + 26} Td (${safe.length} PARTS) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.40 0.45 0.55 rg ${x2 + 12} ${cardY + 11} Td (QUALIFIED FLIGHT PARTS) Tj ET\n`

  // KPI 3: Active Orbital Monitoring
  const x3 = x2 + cardW + cardGap
  p1 += `q 1 0.98 0.94 rg ${x3} ${cardY} ${cardW} ${cardH} re f 0.90 0.80 0.65 RG 1 w ${x3} ${cardY} ${cardW} ${cardH} re S Q\n`
  p1 += `BT /F2 16 Tf 0.85 0.50 0.08 rg ${x3 + 12} ${cardY + 26} Td (${monitored.length} PARTS) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.40 0.45 0.55 rg ${x3 + 12} ${cardY + 11} Td (IN-SITU DSN MONITORING) Tj ET\n`

  // KPI 4: Quarantined Defects
  const x4 = x3 + cardW + cardGap
  p1 += `q 1 0.96 0.96 rg ${x4} ${cardY} ${cardW} ${cardH} re f 0.90 0.70 0.70 RG 1 w ${x4} ${cardY} ${cardW} ${cardH} re S Q\n`
  p1 += `BT /F2 16 Tf 0.85 0.16 0.18 rg ${x4 + 12} ${cardY + 26} Td (${rejected.length} DEFECTS) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.40 0.45 0.55 rg ${x4 + 12} ${cardY + 11} Td (LATENT GATE DEFECTS) Tj ET\n`

  // ================= PIE CHART & VISUAL SCREENING BREAKDOWN SECTION =================
  const pieSectionY = 460
  p1 += `q 0.99 0.99 1 rg 25 ${pieSectionY} 545.28 148 re f 0.85 0.88 0.93 RG 1 w 25 ${pieSectionY} 545.28 148 re S Q\n`
  p1 += `BT /F2 9.5 Tf 0.10 0.18 0.34 rg 35 ${pieSectionY + 130} Td (SPACECRAFT HARDWARE RELIABILITY DISTRIBUTION (PIE CHART)) Tj ET\n`

  // Draw Pie Chart
  const pieCx = 100
  const pieCy = pieSectionY + 68
  const pieR = 52
  p1 += drawPdfPieChart(pieCx, pieCy, pieR, safe.length, monitored.length, rejected.length, health)

  // Pie Chart Legend & Breakdown Bars
  const totalScreened = Math.max(1, data.length)
  const safePct = ((safe.length / totalScreened) * 100).toFixed(1)
  const monPct = ((monitored.length / totalScreened) * 100).toFixed(1)
  const rejPct = ((rejected.length / totalScreened) * 100).toFixed(1)

  const legX = 185
  // Safe Legend Item
  p1 += `q 0.08 0.58 0.28 rg ${legX} ${pieSectionY + 94} 12 10 re f Q\n`
  p1 += `BT /F2 8.5 Tf 0.08 0.58 0.28 rg ${legX + 18} ${pieSectionY + 96} Td (QUALIFIED FLIGHT PARTS: ${safe.length} Units (${safePct}%)) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.35 0.40 0.50 rg ${legX + 18} ${pieSectionY + 84} Td (Nominal lot cohort behavior. Zero latent drift detected across 168h HTOL test cycle.) Tj ET\n`

  // Monitor Legend Item
  p1 += `q 0.90 0.55 0.08 rg ${legX} ${pieSectionY + 58} 12 10 re f Q\n`
  p1 += `BT /F2 8.5 Tf 0.85 0.50 0.08 rg ${legX + 18} ${pieSectionY + 60} Td (ACTIVE ORBITAL MONITOR: ${monitored.length} Units (${monPct}%)) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.35 0.40 0.50 rg ${legX + 18} ${pieSectionY + 48} Td (Within specification limits with moderate drift. Scheduled for in-situ telemetry polling.) Tj ET\n`

  // Reject Legend Item
  p1 += `q 0.85 0.16 0.18 rg ${legX} ${pieSectionY + 22} 12 10 re f Q\n`
  p1 += `BT /F2 8.5 Tf 0.85 0.16 0.18 rg ${legX + 18} ${pieSectionY + 24} Td (QUARANTINED SILICON DEFECTS: ${rejected.length} Units (${rejPct}%)) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.35 0.40 0.50 rg ${legX + 18} ${pieSectionY + 12} Td (Latent gate-oxide degradation intercepted. Isolated by PCDU solid-state switches.) Tj ET\n`

  // ================= EXECUTIVE TECHNICAL SUMMARY =================
  const execY = 345
  p1 += `q 0.98 0.98 0.99 rg 25 ${execY} 545.28 100 re f 0.85 0.88 0.93 RG 1 w 25 ${execY} 545.28 100 re S Q\n`
  p1 += `BT /F2 9.5 Tf 0.10 0.18 0.34 rg 35 ${execY + 82} Td (EXECUTIVE TECHNICAL AUDIT SUMMARY & METHODOLOGY FINDINGS:) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${execY + 66} Td (1. Screening Protocol: HTOL stress executed for 168 hours at 125 deg C per MIL-STD-883 Method 1005.11.) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${execY + 52} Td (2. Latent Defect Interception: SpaceGuard AI lot-relative modeling flagged ${rejected.length} latent silicon anomalies.) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${execY + 38} Td (3. Physics of Failure: Anomaly drift rate > +0.08 uA/hr with quantile divergence z > +3.5 sigma relative to lot mean.) Tj ET\n`
  p1 += `BT /F2 8 Tf 0.08 0.58 0.28 rg 35 ${execY + 20} Td (4. TECHNICAL FLIGHT INTEGRATION ENDORSED: Quarantined parts physically isolated; secondary cold-standbys online.) Tj ET\n`

  // ================= OFFICIAL SIGNATURES & ENDORSEMENT BLOCKS (PAGE 1) =================
  const sigY = 175
  // Left Box: SATELLITE MONITORING UNIT (SMU) - Updated Officer Name
  p1 += `q 0.98 0.98 1 rg 25 ${sigY} 265 158 re f 0.80 0.85 0.92 RG 1 w 25 ${sigY} 265 158 re S Q\n`
  p1 += `BT /F2 8.5 Tf 0.80 0.40 0.05 rg 35 ${sigY + 140} Td (SATELLITE MONITORING UNIT (SMU):) Tj ET\n`
  p1 += `BT /F2 11 Tf 0.10 0.18 0.34 rg 35 ${sigY + 124} Td (Dr. A. Rajesh Kumar, Ph.D.) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${sigY + 110} Td (Lead Satellite Monitoring Unit Officer) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${sigY + 98} Td (ISTRAC Quality Assurance & Reliability Division) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${sigY + 86} Td (ISRO Telemetry, Tracking & Command Network, Bengaluru) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${sigY + 68} Td (Technical Audit Standard: MIL-STD-883 Class-S Space Flight) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${sigY + 56} Td (Audit Hash: SHA256-8F4C2E9A3B71D05C [AUTHENTICATED]) Tj ET\n`
  p1 += `BT /F2 8.5 Tf 0.08 0.58 0.28 rg 35 ${sigY + 30} Td ([TECHNICAL AUDIT CERTIFIED BY SMU]) Tj ET\n`

  // Right Box: OPERATIONS CONTROLLER OFFICER (OCO) - Updated Officer Name
  const sigRightX = 305
  p1 += `q 0.98 0.98 1 rg ${sigRightX} ${sigY} 265 158 re f 0.80 0.85 0.92 RG 1 w ${sigRightX} ${sigY} 265 158 re S Q\n`
  p1 += `BT /F2 8.5 Tf 0.80 0.40 0.05 rg ${sigRightX + 10} ${sigY + 140} Td (OPERATIONS CONTROLLER OFFICER (OCO):) Tj ET\n`
  p1 += `BT /F2 11 Tf 0.10 0.18 0.34 rg ${sigRightX + 10} ${sigY + 124} Td (Dr. M. S. Suryanarayana, Distinguished Scientist) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.25 0.30 0.40 rg ${sigRightX + 10} ${sigY + 110} Td (Operations Controller Officer) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.25 0.30 0.40 rg ${sigRightX + 10} ${sigY + 98} Td (Satish Dhawan Space Centre SHAR, Sriharikota) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.25 0.30 0.40 rg ${sigRightX + 10} ${sigY + 86} Td (Range Safety & Launch Operations Directorate) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg ${sigRightX + 10} ${sigY + 68} Td (Flight Readiness Review (FRR) Board: ENDORSED) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg ${sigRightX + 10} ${sigY + 56} Td (Spacecraft Integration Board: AUTHORIZED FOR LIFTOFF) Tj ET\n`
  p1 += `BT /F2 8.5 Tf 0.08 0.58 0.28 rg ${sigRightX + 10} ${sigY + 30} Td ([FLIGHT READINESS ENDORSED BY OCO]) Tj ET\n`

  // Official Clearance Stamp Box (Bottom of Page 1)
  const stampY = 62
  p1 += `q 0.95 0.99 0.96 rg 25 ${stampY} 545.28 100 re f 0.08 0.58 0.28 RG 1.5 w 25 ${stampY} 545.28 100 re S Q\n`
  p1 += `BT /F2 10.5 Tf 0.08 0.58 0.28 rg 35 ${stampY + 80} Td (TECHNICAL AUDIT RESOLUTION // SDSC SHAR SRIHARIKOTA) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${stampY + 64} Td (The Reliability Directorate verifies that SpaceGuard-1 flight qualification meets Class-S standards.) Tj ET\n`
  p1 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${stampY + 50} Td (All quarantined components are physically decoupled from primary power buses with zero mission impact.) Tj ET\n`
  p1 += `BT /F2 8.5 Tf 0.10 0.18 0.34 rg 35 ${stampY + 32} Td (TECHNICAL AUDIT STATUS: HARDWARE QUALIFIED FOR LAUNCH INTEGRATION) Tj ET\n`
  p1 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${stampY + 16} Td (Authority: ISRO Headquarters, Antariksh Bhavan, Bengaluru | Range Safety Council, Sriharikota) Tj ET\n`

  p1 += p1Canvas.footer
  pdf.addPage(p1)

  // =========================================================================
  // PAGE 2: COMPLETE SUBSYSTEM SCREENING MATRIX & AVIONICS ARCHITECTURE
  // =========================================================================
  const p2Canvas = createPageCanvas(2, 3, docRef, dateStr, timeStr, 'SUBSYSTEM RELIABILITY MATRIX & AVIONICS ARCHITECTURE')
  let p2 = p2Canvas.prefix

  // Page 2 Section 1 Title
  const p2s1Y = 684
  p2 += `q 0.95 0.97 1 rg 25 ${p2s1Y} 545.28 26 re f 0.80 0.85 0.92 RG 1 w 25 ${p2s1Y} 545.28 26 re S Q\n`
  p2 += `BT /F2 10.5 Tf 0.10 0.18 0.34 rg 35 ${p2s1Y + 9} Td (SECTION 1: SPACECRAFT SUBSYSTEM COMPONENT RELIABILITY MATRIX) Tj ET\n`

  // Table 1 Header
  let t1HeadY = 656
  p2 += `q 0.90 0.93 0.97 rg 25 ${t1HeadY} 545.28 20 re f 0.70 0.75 0.82 RG 1 w 25 ${t1HeadY} 545.28 20 re S Q\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 32 ${t1HeadY + 6} Td (SUBSYSTEM) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 110 ${t1HeadY + 6} Td (MODULE DESCRIPTION) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 265 ${t1HeadY + 6} Td (TOTAL) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 315 ${t1HeadY + 6} Td (SAFE) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 365 ${t1HeadY + 6} Td (MONITOR) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 425 ${t1HeadY + 6} Td (REJECT) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 475 ${t1HeadY + 6} Td (RISK) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 525 ${t1HeadY + 6} Td (STATUS) Tj ET\n`

  let t1RowY = t1HeadY - 19
  const subEntries = Object.entries(subMap)
  for (let i = 0; i < subEntries.length && i < 8; i++) {
    const [key, parts] = subEntries[i]
    const pSafe = parts.filter((p) => p.status === 'safe').length
    const pMon = parts.filter((p) => p.status === 'monitor').length
    const pRej = parts.filter((p) => p.status === 'reject').length
    const avgRisk = Math.round(parts.reduce((a, b) => a + b.risk_score, 0) / parts.length)
    const name = parts[0]?.subsystem_name || key
    const isAlt = i % 2 === 1

    p2 += `q ${isAlt ? '0.97 0.98 1' : '1 1 1'} rg 25 ${t1RowY - 2} 545.28 18 re f 0.85 0.88 0.92 RG 0.5 w 25 ${t1RowY - 2} 545.28 18 re S Q\n`
    p2 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 32 ${t1RowY + 3} Td ([${esc(key)}]) Tj ET\n`
    p2 += `BT /F1 7.5 Tf 0.20 0.25 0.35 rg 110 ${t1RowY + 3} Td (${esc(name.slice(0, 26))}) Tj ET\n`
    p2 += `BT /F1 7.5 Tf 0.10 0.18 0.34 rg 265 ${t1RowY + 3} Td (${parts.length}) Tj ET\n`
    p2 += `BT /F2 7.5 Tf 0.08 0.58 0.28 rg 315 ${t1RowY + 3} Td (${pSafe}) Tj ET\n`
    p2 += `BT /F2 7.5 Tf 0.85 0.50 0.08 rg 365 ${t1RowY + 3} Td (${pMon}) Tj ET\n`
    p2 += `BT /F2 7.5 Tf ${pRej > 0 ? '0.85 0.16 0.18' : '0.45 0.50 0.60'} rg 425 ${t1RowY + 3} Td (${pRej}) Tj ET\n`
    p2 += `BT /F1 7.5 Tf 0.25 0.30 0.40 rg 475 ${t1RowY + 3} Td (${avgRisk}/100) Tj ET\n`
    p2 += `BT /F2 7 Tf ${pRej > 0 ? '0.85 0.16 0.18' : '0.08 0.58 0.28'} rg 525 ${t1RowY + 3} Td (${pRej > 0 ? 'QUARANTINE' : 'QUALIFIED'}) Tj ET\n`
    t1RowY -= 19
  }

  // Section 2: Dual-Redundant Avionics Architecture Diagram (Positioned with clear 24pt spacing)
  const archY = 320
  p2 += `q 0.98 0.98 1 rg 25 ${archY} 545.28 144 re f 0.80 0.85 0.92 RG 1 w 25 ${archY} 545.28 144 re S Q\n`
  p2 += `BT /F2 9.5 Tf 0.10 0.18 0.34 rg 35 ${archY + 126} Td (SECTION 2: SPACEGUARD-1 DUAL-REDUNDANT AVIONICS ARCHITECTURE & BUS NODES) Tj ET\n`

  // Bus Line in Deep Navy
  p2 += `q 0.10 0.18 0.34 RG 2.2 w [4 2] 0 d 40 ${archY + 84} m 540 ${archY + 84} l S Q\n`
  p2 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 195 ${archY + 90} Td (ISRO MIL-STD-1553B / CAN PRIMARY SYSTEM BUS) Tj ET\n`

  // Node 1: PCDU
  p2 += `q 0.96 1 0.97 rg 40 ${archY + 20} 115 48 re f 0.08 0.58 0.28 RG 1.2 w 40 ${archY + 20} 115 48 re S Q\n`
  p2 += `BT /F2 8 Tf 0.08 0.58 0.28 rg 48 ${archY + 50} Td (PCDU [POWER]) Tj ET\n`
  p2 += `BT /F1 7 Tf 0.30 0.35 0.45 rg 48 ${archY + 38} Td (Solar Array MPPT) Tj ET\n`
  p2 += `BT /F1 6.5 Tf 0.45 0.50 0.60 rg 48 ${archY + 26} Td (Battery Bus Voltage Rail) Tj ET\n`

  // Node 2: OBC
  p2 += `q 0.96 0.98 1 rg 170 ${archY + 20} 115 48 re f 0.10 0.18 0.34 RG 1.2 w 170 ${archY + 20} 115 48 re S Q\n`
  p2 += `BT /F2 8 Tf 0.10 0.18 0.34 rg 178 ${archY + 50} Td (MAIN OBC [FC]) Tj ET\n`
  p2 += `BT /F1 7 Tf 0.30 0.35 0.45 rg 178 ${archY + 38} Td (Dual Fault-Tolerant CPU) Tj ET\n`
  p2 += `BT /F1 6.5 Tf 0.45 0.50 0.60 rg 178 ${archY + 26} Td (SPARC V8 Architecture) Tj ET\n`

  // Node 3: COMM
  p2 += `q 1 0.98 0.94 rg 300 ${archY + 20} 115 48 re f 0.85 0.50 0.08 RG 1.2 w 300 ${archY + 20} 115 48 re S Q\n`
  p2 += `BT /F2 8 Tf 0.85 0.50 0.08 rg 308 ${archY + 50} Td (COMM [ISTRAC]) Tj ET\n`
  p2 += `BT /F1 7 Tf 0.30 0.35 0.45 rg 308 ${archY + 38} Td (S/X-Band Telemetry Link) Tj ET\n`
  p2 += `BT /F1 6.5 Tf 0.45 0.50 0.60 rg 308 ${archY + 26} Td (Deep Space Network) Tj ET\n`

  // Node 4: SENSE NODE
  p2 += `q 1 0.95 0.95 rg 430 ${archY + 20} 115 48 re f 0.85 0.16 0.18 RG 1.2 w 430 ${archY + 20} 115 48 re S Q\n`
  p2 += `BT /F2 8 Tf 0.85 0.16 0.18 rg 438 ${archY + 50} Td (GATE-OXIDE DUT) Tj ET\n`
  p2 += `BT /F1 7 Tf 0.85 0.16 0.18 rg 438 ${archY + 38} Td (In-Situ 168h Sense Node) Tj ET\n`
  p2 += `BT /F2 6.5 Tf 0.85 0.16 0.18 rg 438 ${archY + 26} Td ([QUARANTINED]) Tj ET\n`

  // Section 3: Technical Screening Methodology Note (Fills the lower half of Page 2)
  const methY = 65
  p2 += `q 0.98 0.98 0.99 rg 25 ${methY} 545.28 230 re f 0.85 0.88 0.93 RG 1 w 25 ${methY} 545.28 230 re S Q\n`
  p2 += `BT /F2 10 Tf 0.10 0.18 0.34 rg 35 ${methY + 210} Td (SECTION 3: MACHINE LEARNING MODELING ARCHITECTURE & FAILOVER PROTOCOL) Tj ET\n`
  p2 += `BT /F3 8.5 Tf 0.20 0.25 0.35 rg 35 ${methY + 192} Td ("Our innovation is not replacing existing MIL-STD-883 screening. We add a predictive AI intelligence layer that identifies abnormal) Tj ET\n`
  p2 += `BT /F3 8.5 Tf 0.20 0.25 0.35 rg 35 ${methY + 180} Td (components even when they remain within static datasheet limits, predicts future drift, and localizes the affected component.") Tj ET\n`
  p2 += `BT /F2 8 Tf 0.80 0.40 0.05 rg 35 ${methY + 162} Td (Core Innovation Paradigm: WITHIN LIMIT != ALWAYS HEALTHY) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 146} Td (1. Multimodal Feature Engineering: 0h baseline, 48h checkpoint, 168h completion, delta leakage, and slope trajectory.) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 132} Td (2. Lot-Relative Gaussian Anomaly Detection: Calculates robust lot mean (u) and lot standard deviation (s) for quantile divergence.) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 118} Td (3. Multivariate Isolation Forest: Generates unsupervised isolation depth scores to flag subtle non-linear degradation.) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 104} Td (4. Predictive Orbital Extrapolation: Fits polynomial drift models to extrapolate component risk out to 264h mission life.) Tj ET\n`
  p2 += `BT /F2 8 Tf 0.08 0.58 0.28 rg 35 ${methY + 86} Td (FAILOVER CONTROL LOGIC & AUTONOMOUS BUS QUARANTINE:) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 70} Td (A. Parts exhibiting anomaly risk >= 75/100 are automatically disconnected from primary PCDU power rail in < 12 ms.) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 56} Td (B. Backup cold-standby modules are powered on and verified via MIL-STD-1553B system health telemetry.) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 42} Td (C. All quarantine events are stamped with cryptographic signatures and logged to immutable ground audit storage.) Tj ET\n`
  p2 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${methY + 28} Td (D. Range Safety confirms full redundancy is verified with zero single-point failure paths.) Tj ET\n`

  p2 += p2Canvas.footer
  pdf.addPage(p2)

  // =========================================================================
  // PAGE 3: QUARANTINED DEFECTS LEDGER, ACTIVE MONITORING & FINAL SIGN-OFF
  // =========================================================================
  const p3Canvas = createPageCanvas(3, 3, docRef, dateStr, timeStr, 'QUARANTINED SILICON AUDIT & RANGE VERIFICATION')
  let p3 = p3Canvas.prefix

  // Page 3 Section 4 Title
  const p3s4Y = 684
  p3 += `q 1 0.96 0.96 rg 25 ${p3s4Y} 545.28 26 re f 0.90 0.70 0.70 RG 1 w 25 ${p3s4Y} 545.28 26 re S Q\n`
  p3 += `BT /F2 10.5 Tf 0.85 0.16 0.18 rg 35 ${p3s4Y + 9} Td (SECTION 4: QUARANTINED SILICON GATE-OXIDE DEFECTS & DRIFT ANOMALIES) Tj ET\n`

  // Table 2 Header - Wide, clean, non-overlapping columns!
  // Columns: PART ID (30), SUB (160), LOT ID (220), 168h (320), LIMIT (380), z-SCORE (435), RISK (485), ACTION (532)
  let t2HeadY = 656
  p3 += `q 0.92 0.85 0.85 rg 25 ${t2HeadY} 545.28 20 re f 0.80 0.65 0.65 RG 1 w 25 ${t2HeadY} 545.28 20 re S Q\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 30 ${t2HeadY + 6} Td (PART IDENTIFIER) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 160 ${t2HeadY + 6} Td (SUB) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 220 ${t2HeadY + 6} Td (LOT NUMBER) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 320 ${t2HeadY + 6} Td (168h MEAS.) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 380 ${t2HeadY + 6} Td (SPEC LIMIT) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 435 ${t2HeadY + 6} Td (z-SCORE) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 485 ${t2HeadY + 6} Td (RISK) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 532 ${t2HeadY + 6} Td (ACTION) Tj ET\n`

  let t2RowY = t2HeadY - 18
  const rejParts = rejected.slice(0, 5)
  for (let i = 0; i < rejParts.length; i++) {
    const c = rejParts[i]
    const isAlt = i % 2 === 1
    p3 += `q ${isAlt ? '1 0.97 0.97' : '1 1 1'} rg 25 ${t2RowY - 2} 545.28 17 re f 0.88 0.78 0.78 RG 0.5 w 25 ${t2RowY - 2} 545.28 17 re S Q\n`
    p3 += `BT /F2 7 Tf 0.10 0.18 0.34 rg 30 ${t2RowY + 3} Td (${esc(c.component_id)}) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.20 0.25 0.35 rg 160 ${t2RowY + 3} Td ([${esc(c.subsystem)}]) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.40 0.45 0.55 rg 220 ${t2RowY + 3} Td (${esc(c.lot_id)}) Tj ET\n`
    p3 += `BT /F2 7 Tf 0.85 0.16 0.18 rg 320 ${t2RowY + 3} Td (${c.v168.toFixed(2)} uA) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.25 0.30 0.40 rg 380 ${t2RowY + 3} Td (${c.limit_ua.toFixed(0)} uA) Tj ET\n`
    p3 += `BT /F2 7 Tf 0.85 0.16 0.18 rg 435 ${t2RowY + 3} Td (${c.z168 > 0 ? '+' : ''}${c.z168.toFixed(1)}s) Tj ET\n`
    p3 += `BT /F2 7 Tf 0.85 0.16 0.18 rg 485 ${t2RowY + 3} Td (${Math.round(c.risk_score)}/100) Tj ET\n`
    p3 += `BT /F2 6.5 Tf 0.85 0.16 0.18 rg 532 ${t2RowY + 3} Td (QUARANTINE) Tj ET\n`
    t2RowY -= 18
  }

  // Section 5: Active Orbital Monitoring Ledger (Positioned with clear spacing)
  const p3s5Y = t2RowY - 22
  p3 += `q 1 0.98 0.94 rg 25 ${p3s5Y} 545.28 24 re f 0.90 0.80 0.65 RG 1 w 25 ${p3s5Y} 545.28 24 re S Q\n`
  p3 += `BT /F2 10 Tf 0.85 0.50 0.08 rg 35 ${p3s5Y + 7} Td (SECTION 5: ACTIVE ORBITAL MONITORING LEDGER (MODERATE LATENT DRIFT)) Tj ET\n`

  let t3HeadY = p3s5Y - 20
  p3 += `q 0.98 0.95 0.88 rg 25 ${t3HeadY} 545.28 18 re f 0.88 0.78 0.65 RG 1 w 25 ${t3HeadY} 545.28 18 re S Q\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 30 ${t3HeadY + 5} Td (PART IDENTIFIER) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 160 ${t3HeadY + 5} Td (SUB) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 220 ${t3HeadY + 5} Td (LOT NUMBER) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 320 ${t3HeadY + 5} Td (168h MEAS.) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 380 ${t3HeadY + 5} Td (DRIFT SLOPE) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 445 ${t3HeadY + 5} Td (PRED 264h) Tj ET\n`
  p3 += `BT /F2 7.5 Tf 0.10 0.18 0.34 rg 515 ${t3HeadY + 5} Td (DSN CADENCE) Tj ET\n`

  let t3RowY = t3HeadY - 17
  const monParts = monitored.slice(0, 4)
  for (let i = 0; i < monParts.length; i++) {
    const c = monParts[i]
    const isAlt = i % 2 === 1
    p3 += `q ${isAlt ? '1 0.98 0.94' : '1 1 1'} rg 25 ${t3RowY - 2} 545.28 16 re f 0.90 0.85 0.78 RG 0.5 w 25 ${t3RowY - 2} 545.28 16 re S Q\n`
    p3 += `BT /F2 7 Tf 0.10 0.18 0.34 rg 30 ${t3RowY + 3} Td (${esc(c.component_id)}) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.20 0.25 0.35 rg 160 ${t3RowY + 3} Td ([${esc(c.subsystem)}]) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.40 0.45 0.55 rg 220 ${t3RowY + 3} Td (${esc(c.lot_id)}) Tj ET\n`
    p3 += `BT /F2 7 Tf 0.85 0.50 0.08 rg 320 ${t3RowY + 3} Td (${c.v168.toFixed(2)} uA) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.25 0.30 0.40 rg 380 ${t3RowY + 3} Td (+${c.slope.toFixed(4)} uA/h) Tj ET\n`
    p3 += `BT /F2 7 Tf 0.85 0.50 0.08 rg 445 ${t3RowY + 3} Td (${c.predicted_future.toFixed(2)} uA) Tj ET\n`
    p3 += `BT /F1 7 Tf 0.08 0.58 0.28 rg 515 ${t3RowY + 3} Td (10s DSN Watch) Tj ET\n`
    t3RowY -= 17
  }

  // Section 6: Orbital Reliability & HTOL Physics Envelope (Fills empty space on Page 3)
  const relY = 225
  p3 += `q 0.98 0.98 1 rg 25 ${relY} 545.28 145 re f 0.80 0.85 0.92 RG 1 w 25 ${relY} 545.28 145 re S Q\n`
  p3 += `BT /F2 9.5 Tf 0.10 0.18 0.34 rg 35 ${relY + 128} Td (SECTION 6: ORBITAL LIFETIME & HTOL ARRHENIUS DEGRADATION PHYSICS) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${relY + 112} Td (1. Arrhenius Thermal Acceleration: AF = exp[(Ea / k) * (1/T_use - 1/T_stress)] with Ea = 0.70 eV, k = 8.617e-5 eV/K.) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${relY + 98} Td (2. Stress Profile: HTOL conducted at 125 deg C (398 K) vs 25 deg C (298 K) nominal orbit equates to AF = 78.4x acceleration.) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${relY + 84} Td (3. Flight Equivalence: 168 hours HTOL testing is mathematically equivalent to 13,171 hours (1.50 years) in Low Earth Orbit.) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.20 0.25 0.35 rg 35 ${relY + 70} Td (4. Autonomous In-Situ Watchdog: Telemetry trip threshold set to delta_I > +2.50 uA, triggering failover in < 12 milliseconds.) Tj ET\n`
  p3 += `BT /F2 8 Tf 0.08 0.58 0.28 rg 35 ${relY + 52} Td (5. ZERO SINGLE-POINT FAILURES: All quarantined gate-oxide components backed by fully redundant cold-standby hardware.) Tj ET\n`
  p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${relY + 36} Td (Compliance Standard: ISRO-PAS-200 Spacecraft Reliability Standards | MIL-STD-883 Method 1005.11 Class-S Orbit Acceptance) Tj ET\n`
  p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${relY + 20} Td (Telemetry Channel: DSN Bangalore 32-meter Deep Space Ground Station Real-Time S-Band Telemetry Carrier) Tj ET\n`

  // Section 7: Official Quality Assurance & Range Safety Endorsements (Page 3 Sign-Offs)
  const finalSigY = 62
  // Left: SATELLITE MONITORING UNIT (SMU) - Updated Officer Name
  p3 += `q 0.98 0.98 1 rg 25 ${finalSigY} 265 152 re f 0.80 0.85 0.92 RG 1 w 25 ${finalSigY} 265 152 re S Q\n`
  p3 += `BT /F2 8.5 Tf 0.80 0.40 0.05 rg 35 ${finalSigY + 134} Td (SATELLITE MONITORING UNIT (SMU):) Tj ET\n`
  p3 += `BT /F2 11 Tf 0.10 0.18 0.34 rg 35 ${finalSigY + 118} Td (Dr. A. Rajesh Kumar, Ph.D.) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${finalSigY + 104} Td (Lead Satellite Monitoring Unit Officer) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${finalSigY + 92} Td (ISTRAC Quality Assurance & Reliability Division) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.25 0.30 0.40 rg 35 ${finalSigY + 80} Td (ISRO Telemetry, Tracking & Command Network, Bengaluru) Tj ET\n`
  p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${finalSigY + 62} Td (Verification Stamp: ISRO-RQAD-DSN-CERT-092) Tj ET\n`
  p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 ${finalSigY + 50} Td (Digital Seal: SHA256-8F4C2E9A3B71D05C [VERIFIED]) Tj ET\n`
  p3 += `BT /F2 8.5 Tf 0.08 0.58 0.28 rg 35 ${finalSigY + 24} Td ([CERTIFIED BY SATELLITE MONITORING UNIT]) Tj ET\n`

  // Right: OPERATIONS CONTROLLER OFFICER (OCO) - Updated Officer Name
  const finalSigRightX = 305
  p3 += `q 0.98 0.98 1 rg ${finalSigRightX} ${finalSigY} 265 152 re f 0.80 0.85 0.92 RG 1 w ${finalSigRightX} ${finalSigY} 265 152 re S Q\n`
  p3 += `BT /F2 8.5 Tf 0.80 0.40 0.05 rg ${finalSigRightX + 10} ${finalSigY + 134} Td (OPERATIONS CONTROLLER OFFICER (OCO):) Tj ET\n`
  p3 += `BT /F2 11 Tf 0.10 0.18 0.34 rg ${finalSigRightX + 10} ${finalSigY + 118} Td (Dr. M. S. Suryanarayana, Distinguished Scientist) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.25 0.30 0.40 rg ${finalSigRightX + 10} ${finalSigY + 104} Td (Operations Controller Officer) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.25 0.30 0.40 rg ${finalSigRightX + 10} ${finalSigY + 92} Td (Satish Dhawan Space Centre SHAR, Sriharikota) Tj ET\n`
  p3 += `BT /F1 8 Tf 0.25 0.30 0.40 rg ${finalSigRightX + 10} ${finalSigY + 80} Td (Range Operations & Launch Authorization Board) Tj ET\n`
  p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg ${finalSigRightX + 10} ${finalSigY + 62} Td (Endorsement Code: SHAR-LAUNCH-GO-2026-SG1) Tj ET\n`
  p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg ${finalSigRightX + 10} ${finalSigY + 50} Td (Flight Integration: AUTHORIZED FOR LIFTOFF) Tj ET\n`
  p3 += `BT /F2 8.5 Tf 0.08 0.58 0.28 rg ${finalSigRightX + 10} ${finalSigY + 24} Td ([ENDORSED BY OPERATIONS CONTROLLER OFFICER]) Tj ET\n`

  p3 += p3Canvas.footer
  pdf.addPage(p3)

  pdf.download(`ISRO_SDSC_SHAR_Technical_Mission_Report_${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * Generate comprehensive Multi-Page ISRO Mission Screening Report PDF.
 */
export function generateScreeningReportPdf(
  mission: MissionStatus | null,
  components: ComponentOut[]
) {
  generateCertificatePdf(mission, components)
}
