import React, { useState, useRef, useMemo } from 'react'
import type { ComponentOut, UploadResult } from '../../types'
import { downloadSampleCSV, ISRO_MISSIONS, type RawPart } from '../../offlineEngine'
import { TEST_FIXTURES, createTestCsvFile } from '../../utils/testFixtures'
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
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-transparent text-[#17212B] font-sans flex-1 min-h-full">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D9E2EA] pb-3 bg-[#FFFFFF]/60 p-3 md:p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#0E88D3]/15 text-[#0E88D3] border border-[#0E88D3]/40 font-mono font-bold text-xs uppercase tracking-wider">
              DATA INTAKE
            </span>
            <span className="text-xs font-mono text-[#5B6B7A]">
              MIL-STD-883 METHOD 1005 CLASS S
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#17212B] tracking-wide mt-1">
            CSV Flight Telemetry Intake Dashboard
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5 max-w-3xl">
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
              ? 'border-[#0E88D3] bg-[#F8FAFC]/80'
              : 'border-[#D9E2EA] hover:border-[#0E88D3] bg-[#FFFFFF]'
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

          <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-[#D9E2EA] flex items-center justify-center text-2xl mb-3 text-[#0E88D3]">
            {uploading ? '⏳' : '📥'}
          </div>

          <div className="font-mono font-bold text-sm md:text-base text-[#17212B]">
            {uploading
              ? 'Parsing and validating telemetry records...'
              : 'Drop flight telemetry CSV here, or click to browse'}
          </div>

          <p className="text-xs text-[#5B6B7A] mt-1 max-w-md font-sans">
            Requires component burn-in parameters at 0h, 24h, 96h, and 168h intervals. Columns with common synonyms are auto-detected.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#F4F7FA] border border-[#D9E2EA] text-[11px] font-mono text-[#5B6B7A]">
              Format: <code>.csv</code>
            </span>
            <span className="px-2.5 py-1 rounded bg-[#F4F7FA] border border-[#D9E2EA] text-[11px] font-mono text-[#5B6B7A]">
              Encoding: <code>UTF-8</code>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                sounds.playClick()
                downloadSampleCSV()
              }}
              className="px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#0E88D3] hover:bg-[#0E88D3] hover:text-[#F4F7FA] text-[11px] font-mono font-bold text-[#0E88D3] transition-colors"
              title="Download standardized MIL-STD-883 CSV template"
            >
              ↓ Download Blank CSV Template
            </button>
          </div>

          {uploadError && (
            <div className="mt-3 p-2.5 rounded-lg bg-[#FEF2F2] border border-[#D9363E] text-xs font-mono text-[#D9363E] max-w-lg text-left">
              ⚠ <b>Upload Error:</b> {uploadError}
            </div>
          )}
        </div>

        {/* Official ISRO Batches & File Information */}
        <div className="flex flex-col gap-4">
          {/* File Information Card */}
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#D9E2EA] pb-2">
              <span className="text-xs font-mono font-bold uppercase text-[#5B6B7A]">
                Current Ingestion Status
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  hasData ? 'bg-[#168A5B] animate-gentle-pulse' : 'bg-[#C58A00]'
                }`}
              />
            </div>

            {hasData ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#5B6B7A]">Source File:</span>
                  <span className="text-[#17212B] font-bold truncate max-w-[170px]" title={uploadedFileName || 'Batch File'}>
                    {uploadedFileName || `${activeMissionName} Dataset`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5B6B7A]">Valid Parts:</span>
                  <span className="text-[#168A5B] font-bold">{rawParts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5B6B7A]">Active Lots:</span>
                  <span className="text-[#0E88D3] font-bold">
                    {new Set(rawParts.map((p) => p.lot_id)).size} lots
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5B6B7A]">Mission Target:</span>
                  <span className="text-[#0E88D3] font-bold">{activeMissionName}</span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[#5B6B7A]">
                No CSV dataset loaded yet. Upload a file or load an official ISRO flight batch below.
              </div>
            )}
          </div>

          {/* Quick Official Batch Selectors */}
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-2.5">
            <span className="text-xs font-mono font-bold uppercase text-[#5B6B7A]">
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
                      ? 'bg-[#F8FAFC] border-[#0E88D3] text-[#17212B]'
                      : 'bg-[#F4F7FA] border-[#D9E2EA] hover:border-[#0E88D3] text-[#5B6B7A] hover:text-[#17212B]'
                  }`}
                >
                  <div className="font-bold text-[#17212B] truncate">{m.name}</div>
                  <div className="text-[10px] text-[#81909D]">{m.code}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Validation Gate Test Harness (1-Click Error Scenario Injectors) */}
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-[#D9E2EA] pb-1.5">
              <span className="text-xs font-mono font-bold uppercase text-[#5B6B7A] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F47216]" />
                Validation Gate Test Harness
              </span>
              <span className="text-[10px] font-mono text-[#81909D]">
                MIL-STD-883 QA
              </span>
            </div>
            <p className="text-[11px] text-[#5B6B7A]">
              1-click test fixtures to test validation gating &amp; error table:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {TEST_FIXTURES.map((fixture) => {
                const isValid = fixture.expectedStatus === 'PASSED'
                return (
                  <button
                    key={fixture.id}
                    type="button"
                    onClick={() => {
                      const file = createTestCsvFile(fixture.id)
                      handleFileInput(file)
                    }}
                    disabled={uploading}
                    className={`p-2 rounded-lg border text-left transition-all text-xs font-mono flex flex-col gap-0.5 cursor-pointer ${
                      isValid
                        ? 'bg-[#F0FDF4] hover:bg-[#DCFCE7] border-[#168A5B]/40 text-[#168A5B]'
                        : 'bg-[#FEF2F2] hover:bg-[#FEE2E2] border-[#D9363E]/40 text-[#D9363E]'
                    }`}
                    title={fixture.description}
                  >
                    <div className="font-bold text-[11px] flex items-center justify-between">
                      <span className="truncate">{fixture.name}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded font-bold uppercase">
                        {isValid ? 'PASS' : 'BLOCK'}
                      </span>
                    </div>
                    <span className="text-[9px] text-[#5B6B7A] truncate">
                      {fixture.expectedErrorType || 'Schema Compliant'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Preview Section - Flexes to fill remaining viewport height */}
      <div className="p-4 md:p-5 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-4 flex-1 min-h-[360px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9E2EA] pb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono font-bold text-[#17212B] uppercase tracking-wide">
              Dataset Preview &amp; Raw Telemetry Records
            </span>
            <span className="px-2 py-0.5 rounded bg-[#F8FAFC] text-[#5B6B7A] text-xs font-mono border border-[#D9E2EA]">
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
              className="bg-[#F4F7FA] border border-[#D9E2EA] rounded-lg px-3 py-1.5 text-xs text-[#17212B] font-mono placeholder:text-[#81909D] focus:outline-none focus:border-[#0E88D3] w-64"
            />

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setTablePage(0)
              }}
              className="bg-[#F4F7FA] border border-[#D9E2EA] text-[#5B6B7A] text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
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
        <div className="overflow-x-auto overflow-y-auto rounded-lg border border-[#D9E2EA] flex-1 min-h-0">
          <table className="w-full text-xs font-mono text-left border-collapse">
            <thead>
              <tr className="bg-[#FFFFFF] text-[#5B6B7A] uppercase tracking-wider border-b border-[#D9E2EA]">
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
            <tbody className="divide-y divide-[#D9E2EA]/60 bg-[#FFFFFF]">
              {paginatedParts.length > 0 ? (
                paginatedParts.map((p, idx) => {
                  const delta = p.v168 - p.v0
                  const isSpecFail = p.v168 > p.limit_ua
                  return (
                    <tr
                      key={p.component_id}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="p-2.5 text-[#81909D]">
                        {tablePage * pageSize + idx + 1}
                      </td>
                      <td className="p-2.5 font-bold text-[#17212B]">
                        {p.component_id}
                      </td>
                      <td className="p-2.5 text-[#0E88D3]">{p.lot_id}</td>
                      <td className="p-2.5 text-[#0E88D3]">{p.subsystem}</td>
                      <td className="p-2.5 text-right tabular-nums text-[#5B6B7A]">
                        {p.v0.toFixed(2)} &mu;A
                      </td>
                      <td className="p-2.5 text-right tabular-nums text-[#5B6B7A]">
                        {p.v24.toFixed(2)} &mu;A
                      </td>
                      <td className="p-2.5 text-right tabular-nums text-[#5B6B7A]">
                        {p.v96 != null ? `${p.v96.toFixed(2)} \u00B5A` : '--'}
                      </td>
                      <td className="p-2.5 text-right tabular-nums font-bold text-[#17212B]">
                        {p.v168.toFixed(2)} &mu;A
                      </td>
                      <td className="p-2.5 text-right tabular-nums text-[#81909D]">
                        {p.limit_ua.toFixed(1)} &mu;A
                      </td>
                      <td
                        className={`p-2.5 text-right tabular-nums font-semibold ${
                          delta > 5 ? 'text-[#D9363E]' : delta > 2 ? 'text-[#C58A00]' : 'text-[#168A5B]'
                        }`}
                      >
                        {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} &mu;A
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSpecFail
                              ? 'bg-[#D9363E]/20 text-[#D9363E] border border-[#D9363E]/50'
                              : 'bg-[#168A5B]/20 text-[#168A5B] border border-[#168A5B]/50'
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
                  <td colSpan={11} className="p-8 text-center text-[#5B6B7A]">
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
          <div className="flex items-center justify-between text-xs font-mono text-[#5B6B7A] pt-2">
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
                className="px-3 py-1 rounded bg-[#F4F7FA] border border-[#D9E2EA] hover:border-[#0E88D3] disabled:opacity-40 disabled:pointer-events-none transition-colors"
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
                className="px-3 py-1 rounded bg-[#F4F7FA] border border-[#D9E2EA] hover:border-[#0E88D3] disabled:opacity-40 disabled:pointer-events-none transition-colors"
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
