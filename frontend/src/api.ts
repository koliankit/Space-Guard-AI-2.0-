import type { AnalyzeResult, ComponentOut, MissionStatus, UploadResult } from './types'
import { offlineISRO } from './offlineEngine'

export const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

let backendReachable: boolean | null = null

export async function isBackendAvailable(): Promise<boolean> {
  if (backendReachable === false) return false
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1200)
    const res = await fetch(`${API_BASE}/api/health`, { signal: controller.signal })
    clearTimeout(timer)
    const contentType = res.headers.get('content-type')
    backendReachable = res.ok && Boolean(contentType && contentType.includes('application/json'))
    return backendReachable
  } catch {
    backendReachable = false
    return false
  }
}

async function asJson(res: Response) {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = (body as any).detail || JSON.stringify(body)
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  return res.json()
}

export async function uploadFile(file: File, columnMapping?: Record<string, string>): Promise<UploadResult> {
  if (await isBackendAvailable()) {
    try {
      const form = new FormData()
      form.append('file', file)
      if (columnMapping) form.append('column_mapping', JSON.stringify(columnMapping))
      const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form })
      return await asJson(res)
    } catch (e) {
      console.warn('Backend upload unavailable, using offline engine:', e)
      backendReachable = false
    }
  }
  try {
    const text = await file.text()
    return offlineISRO.loadCSVText(text)
  } catch (err) {
    console.warn('Failed to parse CSV locally, falling back to demo batch:', err)
    return offlineISRO.initDemo()
  }
}

export async function createDemoBatch(missionId?: string): Promise<UploadResult> {
  if (await isBackendAvailable()) {
    try {
      const res = await fetch(`${API_BASE}/api/demo?mission=${encodeURIComponent(missionId || '')}`, { method: 'POST' })
      return await asJson(res)
    } catch (e) {
      console.warn('Backend /api/demo failed, engaging standalone ISRO telemetry engine:', e)
      backendReachable = false
    }
  }
  return offlineISRO.initDemo(missionId)
}

export function getActiveMission() {
  return offlineISRO.getActiveMission()
}

export async function analyzeBatch(batchId: number): Promise<AnalyzeResult> {
  if (backendReachable) {
    try {
      const res = await fetch(`${API_BASE}/api/analyze/${batchId}`, { method: 'POST' })
      return await asJson(res)
    } catch (e) {
      console.warn('Backend /api/analyze failed, engaging standalone screening engine:', e)
      backendReachable = false
    }
  }
  return offlineISRO.analyze(batchId)
}

export async function listComponents(
  batchId: number,
  opts: { status?: string; search?: string; limit?: number } = {},
): Promise<{ total: number; components: ComponentOut[] }> {
  if (backendReachable) {
    try {
      const params = new URLSearchParams()
      if (opts.status) params.set('status', opts.status)
      if (opts.search) params.set('search', opts.search)
      params.set('limit', String(opts.limit ?? 60))
      const res = await fetch(`${API_BASE}/api/components/${batchId}?${params.toString()}`)
      return await asJson(res)
    } catch (e) {
      backendReachable = false
    }
  }
  return offlineISRO.listComponents(batchId, opts)
}

export async function componentDetail(batchId: number, componentId: string): Promise<ComponentOut> {
  if (backendReachable) {
    try {
      const res = await fetch(`${API_BASE}/api/components/${batchId}/${encodeURIComponent(componentId)}`)
      return await asJson(res)
    } catch (e) {
      backendReachable = false
    }
  }
  const detail = offlineISRO.getComponentDetail(batchId, componentId)
  if (!detail) throw new Error(`Component ${componentId} not found`)
  return detail
}

export async function missionStatus(batchId: number): Promise<MissionStatus> {
  if (backendReachable) {
    try {
      const res = await fetch(`${API_BASE}/api/mission-status/${batchId}`)
      return await asJson(res)
    } catch (e) {
      backendReachable = false
    }
  }
  return offlineISRO.getMissionStatus(batchId)
}

export function reportUrl(batchId?: number | null): string {
  const md = offlineISRO.generateMarkdownReport()
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' })
  return URL.createObjectURL(blob)
}
