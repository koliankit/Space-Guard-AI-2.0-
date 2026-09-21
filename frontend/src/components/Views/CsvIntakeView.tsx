import React, { useState, useRef, useMemo } from 'react'
import type { ComponentOut, UploadResult } from '../../types'
import { downloadSampleCSV, ISRO_MISSIONS, type RawPart } from '../../offlineEngine'
import { sounds } from '../../utils/soundEffects'
import * as api from '../../api'

interface CsvIntakeViewProps {
  onFileUploaded: (file: File) => Promise<void>
  onLoadOfficialBatch: (missionId: string) => Promise<void>
  batchId: number | null
  uploadMeta: UploadResult | null
  allComponents: ComponentOut[]
  activeMissionName: string
  activeMissionId: string
  onSelectMission: (id: string) => void
  onContinueToValidation: () => void
}

export default function CsvIntakeView({
  onFileUploaded,
  onLoadOfficialBatch,
  batchId,
  uploadMeta,
  allComponents,
  activeMissionName,
  activeMissionId,
  onSelectMission,
  onContinueToValidation,
}: CsvIntakeViewProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [tablePage, setTablePage] = useState(0)
  const [pageSize, setPageSize] = useState(15)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Raw parts from memory or derived from allComponents
  const rawParts: RawPart[] = useMemo(() => {
    const raw = api.getRawParts()
    if (raw && raw.length > 0) return raw
    if (allComponents && allComponents.length > 0) {
      return allComponents.map((c) => ({
        component_id: c.component_id,
        lot_id: c.lot_id,
        subsystem: c.subsystem,
        v0: c.v0,
        v24: c.v24,
        v96: c.v96,
        v168: c.v168,
        limit_ua: c.limit_ua,
        ground_truth: c.ground_truth ?? null,
      }))
    }
    return []
  }, [allComponents, batchId, uploadMeta])

  // Filtered parts for preview table
  const filteredParts = useMemo(() => {
    if (!searchQuery) return rawParts
    const q = searchQuery.toLowerCase()
    return rawParts.filter(
      (p) =>
        p.component_id.toLowerCase().includes(q) ||
        p.lot_id.toLowerCase().includes(q) ||
        p.subsystem.toLowerCase().includes(q)
    )
  }, [rawParts, searchQuery])

  const totalPages = Math.ceil(filteredParts.length / pageSize) || 1
  const paginatedParts = useMemo(() => {
    const start = tablePage * pageSize
    return filteredParts.slice(start, start + pageSize)
  }, [filteredParts, tablePage, pageSize])

  const handleFileInput = async (file: File) => {
    setUploadError(null)
    setUploading(true)
    setUploadedFileName(file.name)
    try {
      sounds.playClick()
      await onFileUploaded(file)
      sounds.playSuccess()
      setTablePage(0)
    } catch (err: any) {
      sounds.playAlert()
      setUploadError(err?.message || 'Failed to parse CSV file. Please verify MIL-STD-883 schema.')
    } finally {
      setUploading(false)
    }
  }

  const handleLoadDemo = async (mId: string) => {
    setUploadError(null)
    setUploading(true)
    setUploadedFileName(`isro_${mId.toLowerCase()}_official_flight_batch.csv`)
    try {
      sounds.playClick()
      onSelectMission(mId)
      await onLoadOfficialBatch(mId)
      sounds.playSuccess()
      setTablePage(0)
    } catch (err: any) {
      sounds.playAlert()
      setUploadError(err?.message || 'Failed to load official flight batch.')
    } finally {
      setUploading(false)
    }
  }

  const hasData = rawParts.length > 0 || uploadMeta !== null

  return (
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-[#07111C] text-[#F1F5F9] font-sans flex-1 min-h-full">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1D3A52] pb-3 bg-[#0B1928]/60 p-3 md:p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#0E88D3]/15 text-[#0E88D3] border border-[#0E88D3]/40 font-mono font-bold text-xs uppercase tracking-wider">
              DATA INTAKE
            </span>
            <span className="text-xs font-mono text-[#9AAFC0]">
              MIL-STD-883 METHOD 1005 CLASS S
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#F1F5F9] tracking-wide mt-1">
            CSV Flight Telemetry Intake Dashboard
          </h1>
          <p className="text-xs text-[#9AAFC0] mt-0.5 max-w-3xl">
            Upload raw component burn-in readings or acquire verified ISRO qualification batches.
            Verify schema compliance and inspect telemetry records prior to AI screening.
          </p>
        </div>

        {/* Right Action: Continue to Validation */}
        <div className="flex items-center gap-3">
          {hasData && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                onContinueToValidation()
              }}
              className="px-4 py-2.5 rounded-lg bg-[#F47216] hover:bg-[#FA8838] text-white font-mono font-bold text-xs md:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-none"
            >
              <span>Continue to Validation</span>
              <span>&rarr;</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Row 1: Upload Zone (Left) & File Info / Demo Batch Loaders (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Drag & Drop Upload Zone */}
        <div
          className={`lg:col-span-2 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-[#0E88D3] bg-[#142B40]/80'
              : 'border-[#1D3A52] hover:border-[#0E88D3] bg-[#102337]'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            if (e.dataTransfer.files?.[0]) {
              handleFileInput(e.dataTransfer.files[0])
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileInput(e.target.files[0])
              }
            }}
          />

          <div className="w-14 h-14 rounded-2xl bg-[#142B40] border border-[#1D3A52] flex items-center justify-center text-2xl mb-3 text-[#0E88D3]">
            {uploading ? '⏳' : '📥'}
          </div>

          <div className="font-mono font-bold text-sm md:text-base text-[#F1F5F9]">
            {uploading
              ? 'Parsing and validating telemetry records...'
              : 'Drop flight telemetry CSV here, or click to browse'}
          </div>

          <p className="text-xs text-[#9AAFC0] mt-1 max-w-md font-sans">
            Requires component burn-in parameters at 0h, 24h, 96h, and 168h intervals. Columns with common synonyms are auto-detected.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#07111C] border border-[#1D3A52] text-[11px] font-mono text-[#9AAFC0]">
              Format: <code>.csv</code>
            </span>
            <span className="px-2.5 py-1 rounded bg-[#07111C] border border-[#1D3A52] text-[11px] font-mono text-[#9AAFC0]">
              Encoding: <code>UTF-8</code>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                sounds.playClick()
                downloadSampleCSV()
              }}
              className="px-2.5 py-1 rounded bg-[#142B40] border border-[#0E88D3] hover:bg-[#0E88D3] hover:text-[#07111C] text-[11px] font-mono font-bold text-[#0E88D3] transition-colors"
              title="Download standardized MIL-STD-883 CSV template"
            >
              ↓ Download Blank CSV Template
            </button>
          </div>

          {uploadError && (
            <div className="mt-3 p-2.5 rounded-lg bg-[#24141E] border border-[#E5484D] text-xs font-mono text-[#E5484D] max-w-lg text-left">
              ⚠ <b>Upload Error:</b> {uploadError}
            </div>
          )}
        </div>

        {/* Official ISRO Batches & File Information */}
        <div className="flex flex-col gap-4">
          {/* File Information Card */}
          <div className="p-4 rounded-xl bg-[#102337] border border-[#1D3A52] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#1D3A52] pb-2">
              <span className="text-xs font-mono font-bold uppercase text-[#9AAFC0]">
                Current Ingestion Status
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  hasData ? 'bg-[#22A06B] animate-gentle-pulse' : 'bg-[#F2B84B]'
                }`}
              />
            </div>

            {hasData ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#9AAFC0]">Source File:</span>
                  <span className="text-[#F1F5F9] font-bold truncate max-w-[170px]" title={uploadedFileName || 'Batch File'}>
                    {uploadedFileName || `${activeMissionName} Dataset`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AAFC0]">Valid Parts:</span>
                  <span className="text-[#22A06B] font-bold">{rawParts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AAFC0]">Active Lots:</span>
                  <span className="text-[#0E88D3] font-bold">
                    {new Set(rawParts.map((p) => p.lot_id)).size} lots
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AAFC0]">Mission Target:</span>
                  <span className="text-[#0E88D3] font-bold">{activeMissionName}</span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[#9AAFC0]">
                No CSV dataset loaded yet. Upload a file or load an official ISRO flight batch below.
              </div>
            )}
          </div>

          {/* Quick Official Batch Selectors */}
          <div className="p-4 rounded-xl bg-[#102337] border border-[#1D3A52] flex flex-col gap-2.5">
            <span className="text-xs font-mono font-bold uppercase text-[#9AAFC0]">
              Official ISRO Flight Datasets
            </span>
            <div className="grid grid-cols-2 gap-2">
              {ISRO_MISSIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleLoadDemo(m.id)}
                  disabled={uploading}
                  className={`p-2.5 rounded-lg border text-left transition-all text-xs font-mono cursor-pointer ${
                    activeMissionId === m.id && hasData
                      ? 'bg-[#142B40] border-[#0E88D3] text-[#F1F5F9]'
                      : 'bg-[#07111C] border-[#1D3A52] hover:border-[#0E88D3] text-[#9AAFC0] hover:text-[#F1F5F9]'
                  }`}
                >
                  <div className="font-bold text-[#F1F5F9] truncate">{m.name}</div>
                  <div className="text-[10px] text-[#6F8495]">{m.code}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Preview Section - Flexes to fill remaining viewport height */}
      <div className="p-4 md:p-5 rounded-xl bg-[#102337] border border-[#1D3A52] flex flex-col gap-4 flex-1 min-h-[360px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1D3A52] pb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono font-bold text-[#F1F5F9] uppercase tracking-wide">
              Dataset Preview &amp; Raw Telemetry Records
            </span>
            <span className="px-2 py-0.5 rounded bg-[#142B40] text-[#9AAFC0] text-xs font-mono border border-[#1D3A52]">
              {filteredParts.length} Records
            </span>
          </div>

          {/* Search Bar & Page Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search component, lot, subsystem..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setTablePage(0)
              }}
              className="bg-[#07111C] border border-[#1D3A52] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] font-mono placeholder:text-[#6F8495] focus:outline-none focus:border-[#0E88D3] w-64"
            />

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setTablePage(0)
              }}
              className="bg-[#07111C] border border-[#1D3A52] text-[#9AAFC0] text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value={10}>10 rows</option>
              <option value={15}>15 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto rounded-lg border border-[#1D3A52] flex-1 min-h-0">
          <table className="w-full text-xs font-mono text-left border-collapse">
            <thead>
              <tr className="bg-[#0B1928] text-[#9AAFC0] uppercase tracking-wider border-b border-[#1D3A52]">
                <th className="p-2.5 font-semibold">#</th>
                <th className="p-2.5 font-semibold">Component ID</th>
                <th className="p-2.5 font-semibold">Lot ID</th>
                <th className="p-2.5 font-semibold">Subsystem</th>
                <th className="p-2.5 font-semibold text-right">0h Initial</th>
                <th className="p-2.5 font-semibold text-right">24h Early</th>
                <th className="p-2.5 font-semibold text-right">96h Mid</th>
                <th className="p-2.5 font-semibold text-right">168h Final</th>
                <th className="p-2.5 font-semibold text-right">Spec Limit</th>
                <th className="p-2.5 font-semibold text-right">&Delta; (168h-0h)</th>
                <th className="p-2.5 font-semibold text-center">Spec Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D3A52]/60 bg-[#102337]">
              {paginatedParts.length > 0 ? (
                paginatedParts.map((p, idx) => {
                  const delta = p.v168 - p.v0
                  const isSpecFail = p.v168 > p.limit_ua
                  return (
                    <tr
                      key={p.component_id}
                      className="hover:bg-[#142B40] transition-colors"
                    >
                      <td className="p-2.5 text-[#6F8495]">
                        {tablePage * pageSize + idx + 1}
                      </td>
                      <td className="p-2.5 font-bold text-[#F1F5F9]">
                        {p.component_id}
                      </td>
                      <td className="p-2.5 text-[#0E88D3]">{p.lot_id}</td>
                      <td className="p-2.5 text-[#0E88D3]">{p.subsystem}</td>
                      <td className="p-2.5 text-right tabular-nums text-[#9AAFC0]">
                        {p.v0.toFixed(2)} &mu;A
                      </td>
                      <td className="p-2.5 text-right tabular-nums text-[#9AAFC0]">
                        {p.v24.toFixed(2)} &mu;A
                      </td>
                      <td className="p-2.5 text-right tabular-nums text-[#9AAFC0]">
                        {p.v96 != null ? `${p.v96.toFixed(2)} \u00B5A` : '--'}
                      </td>
                      <td className="p-2.5 text-right tabular-nums font-bold text-[#F1F5F9]">
                        {p.v168.toFixed(2)} &mu;A
                      </td>
                      <td className="p-2.5 text-right tabular-nums text-[#6F8495]">
                        {p.limit_ua.toFixed(1)} &mu;A
                      </td>
                      <td
                        className={`p-2.5 text-right tabular-nums font-semibold ${
                          delta > 5 ? 'text-[#E5484D]' : delta > 2 ? 'text-[#F2B84B]' : 'text-[#22A06B]'
                        }`}
                      >
                        {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} &mu;A
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSpecFail
                              ? 'bg-[#E5484D]/20 text-[#E5484D] border border-[#E5484D]/50'
                              : 'bg-[#22A06B]/20 text-[#22A06B] border border-[#22A06B]/50'
                          }`}
                        >
                          {isSpecFail ? 'FAIL' : 'PASS'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-[#9AAFC0]">
                    {hasData
                      ? 'No components match your search filter.'
                      : 'No records available. Upload a CSV file or select an official batch above.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs font-mono text-[#9AAFC0] pt-2">
            <div>
              Showing {tablePage * pageSize + 1} to{' '}
              {Math.min((tablePage + 1) * pageSize, filteredParts.length)} of{' '}
              {filteredParts.length} records
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={tablePage === 0}
                onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                className="px-3 py-1 rounded bg-[#07111C] border border-[#1D3A52] hover:border-[#0E88D3] disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>
              <span className="px-2">
                Page {tablePage + 1} of {totalPages}
              </span>
              <button
                type="button"
                disabled={tablePage >= totalPages - 1}
                onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
                className="px-3 py-1 rounded bg-[#07111C] border border-[#1D3A52] hover:border-[#0E88D3] disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
