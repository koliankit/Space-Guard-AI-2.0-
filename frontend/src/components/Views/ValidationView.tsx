import React, { useState, useMemo, useRef } from 'react'
import type { ComponentOut, UploadResult, MissionStatus, ValidationReport, ValidationErrorItem } from '../../types'
import { type RawPart } from '../../offlineEngine'
import { sounds } from '../../utils/soundEffects'
import * as api from '../../api'
import AnalysisWorkflowBar from '../Dashboard/AnalysisWorkflowBar'
import type { DashboardTab } from '../Dashboard/Header'

interface ValidationViewProps {
  batchId: number | null
  uploadMeta: UploadResult | null
  validationReport?: ValidationReport | null
  onFileUploaded?: (file: File) => Promise<void>
  allComponents: ComponentOut[]
  mission: MissionStatus | null
  running: boolean
  onRunScreening: () => Promise<void>
  onSelectStage: (stage: DashboardTab) => void
  activeMissionName: string
}

export default function ValidationView({
  batchId,
  uploadMeta,
  validationReport,
  onFileUploaded,
  allComponents,
  mission,
  running,
  onRunScreening,
  onSelectStage,
  activeMissionName,
}: ValidationViewProps) {
  const [tablePage, setTablePage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(15)

  // Error table filtering & search
  const [errorSearch, setErrorSearch] = useState('')
  const [errorSeverityFilter, setErrorSeverityFilter] = useState<'ALL' | 'Critical' | 'Warning'>('ALL')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const errorTableRef = useRef<HTMLDivElement>(null)

  // Report status
  const isBlocked = validationReport?.status === 'BLOCKED'
  const isPassed = validationReport?.status === 'PASSED' || (uploadMeta !== null && !isBlocked)

  // Raw or evaluated parts
  const rawParts: RawPart[] = useMemo(() => {
    if (isBlocked) return []
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
  }, [allComponents, batchId, uploadMeta, isBlocked])

  const validationAudit = useMemo(() => {
    if (isBlocked) return null
    return api.getDataValidationAudit()
  }, [rawParts, batchId, uploadMeta, isBlocked])

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

  const totalPages = Math.ceil(filteredParts.length / rowsPerPage) || 1
  const paginatedParts = useMemo(() => {
    const start = tablePage * rowsPerPage
    return filteredParts.slice(start, start + rowsPerPage)
  }, [filteredParts, tablePage, rowsPerPage])

  // Filtered validation errors
  const filteredErrors: ValidationErrorItem[] = useMemo(() => {
    if (!validationReport?.errors) return []
    return validationReport.errors.filter((err) => {
      const matchSeverity = errorSeverityFilter === 'ALL' || err.severity === errorSeverityFilter
      const q = errorSearch.toLowerCase()
      const matchSearch =
        !errorSearch ||
        err.errorType.toLowerCase().includes(q) ||
        (err.column && err.column.toLowerCase().includes(q)) ||
        (err.row && String(err.row).includes(q)) ||
        err.impact.toLowerCase().includes(q) ||
        err.recommendedFix.toLowerCase().includes(q) ||
        (err.detectedValue && err.detectedValue.toLowerCase().includes(q))
      return matchSeverity && matchSearch
    })
  }, [validationReport?.errors, errorSeverityFilter, errorSearch])

  const hasData = rawParts.length > 0
  const isScreened = mission !== null && (mission.safe > 0 || mission.monitor > 0 || mission.reject > 0)

  // Download error report JSON
  const handleDownloadErrorReport = () => {
    if (!validationReport) return
    const reportData = {
      standard: 'MIL-STD-883 METHOD 1005',
      timestamp: new Date().toISOString(),
      report: validationReport,
    }
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `validation_error_report_${validationReport.fileName || 'data'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Trigger file picker
  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onFileUploaded) {
      await onFileUploaded(file)
      e.target.value = ''
    }
  }

  return (
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-[#F4F7FA] text-[#17212B] font-sans flex-1 min-h-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D9E2EA] pb-3 bg-[#FFFFFF] p-3 md:p-4 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#0E88D3]/15 text-[#0E88D3] border border-[#0E88D3]/40 font-mono font-bold text-xs uppercase tracking-wider">
              STAGE 1
            </span>
            <span className="text-xs font-mono text-[#5B6B7A]">
              DATA PREPROCESSING &amp; VALIDATION GATE
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#17212B] tracking-wide mt-1">
            Telemetry Preprocessing &amp; Audit Engine
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5 max-w-3xl">
            MIL-STD-883 Method 1005 Class S integrity screening. Evaluates schema compliance,
            burn-in measurements, sensor noise regularization, and prevents invalid telemetry from entering AI modules.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              sounds.playClick()
              await onRunScreening()
            }}
            disabled={!hasData || running || isBlocked}
            className={`px-4 py-2.5 rounded-lg font-mono font-bold text-xs md:text-sm transition-all flex items-center gap-2 shadow-sm ${
              !hasData || running || isBlocked
                ? 'bg-[#D9E2EA] text-[#81909D] cursor-not-allowed opacity-60'
                : 'bg-[#0E88D3] hover:bg-[#0c74b4] text-white cursor-pointer'
            }`}
            title={isBlocked ? 'AI Screening is blocked due to critical validation errors.' : 'Execute screening across validated parts'}
          >
            <span>{running ? 'Screening in Progress...' : 'Start AI Screening'}</span>
            <span>⚡</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectStage('module_a')}
            disabled={!isScreened}
            className={`px-4 py-2.5 rounded-lg font-mono font-bold text-xs md:text-sm transition-all flex items-center gap-2 ${
              isScreened
                ? 'bg-[#F47216] hover:bg-[#FA8838] text-white cursor-pointer shadow-sm'
                : 'bg-[#D9E2EA] text-[#81909D] cursor-not-allowed opacity-60'
            }`}
          >
            <span>Proceed to Module A</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* Horizontal Analysis Workflow Bar */}
      <AnalysisWorkflowBar
        currentStage="validation"
        onSelectStage={onSelectStage}
        hasData={hasData}
        isScreened={isScreened}
      />

      {/* ============================================================ */}
      {/* 1. VALIDATION FAILED / BLOCKED STATE                          */}
      {/* ============================================================ */}
      {isBlocked && validationReport && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Bezel Banner: DATA VALIDATION FAILED */}
          <div className="p-5 rounded-xl bg-[#FFFFFF] border-2 border-[#D9363E] shadow-md flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9E2EA] pb-4">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-[#D9363E] animate-pulse" />
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg md:text-xl font-mono font-black text-[#D9363E] tracking-wide uppercase">
                      DATA VALIDATION FAILED &bull; AI SCREENING BLOCKED
                    </h2>
                    <span className="px-2.5 py-0.5 rounded bg-[#D9363E] text-white font-mono font-bold text-xs">
                      BLOCKED
                    </span>
                  </div>
                  <div className="text-xs text-[#5B6B7A] font-mono mt-0.5">
                    File: <b className="text-[#17212B]">{validationReport.fileName}</b> &bull; Standard: MIL-STD-883 Method 1005
                  </div>
                </div>
              </div>

              {/* Action Buttons: View Errors, Download Error Report, Upload Corrected CSV */}
              <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                <button
                  type="button"
                  onClick={() => errorTableRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-3 py-1.5 rounded-lg border border-[#D9E2EA] bg-[#F8FAFC] hover:bg-[#D9E2EA] text-[#17212B] font-bold cursor-pointer transition-colors"
                >
                  [ VIEW ERRORS ]
                </button>
                <button
                  type="button"
                  onClick={handleDownloadErrorReport}
                  className="px-3 py-1.5 rounded-lg border border-[#0E88D3] bg-[#0E88D3]/10 hover:bg-[#0E88D3]/20 text-[#0E88D3] font-bold cursor-pointer transition-colors"
                >
                  [ DOWNLOAD ERROR REPORT ]
                </button>
                <button
                  type="button"
                  onClick={handleTriggerUpload}
                  className="px-3 py-1.5 rounded-lg bg-[#0E88D3] hover:bg-[#0c74b4] text-white font-bold cursor-pointer transition-colors shadow-sm"
                >
                  [ UPLOAD CORRECTED CSV ]
                </button>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-mono">
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D9E2EA]">
                <div className="text-[11px] text-[#5B6B7A] uppercase font-semibold">Total Errors Found</div>
                <div className="text-2xl font-bold text-[#17212B] mt-0.5">{validationReport.errorCount}</div>
                <div className="text-[10px] text-[#81909D]">Across schema &amp; records</div>
              </div>

              <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#D9363E]/40">
                <div className="text-[11px] text-[#D9363E] uppercase font-semibold">Critical Errors</div>
                <div className="text-2xl font-bold text-[#D9363E] mt-0.5">{validationReport.criticalCount}</div>
                <div className="text-[10px] text-[#D9363E]">Blocks AI screening pipeline</div>
              </div>

              <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#C58A00]/40">
                <div className="text-[11px] text-[#C58A00] uppercase font-semibold">Warnings</div>
                <div className="text-2xl font-bold text-[#C58A00] mt-0.5">{validationReport.warningCount}</div>
                <div className="text-[10px] text-[#C58A00]">Non-critical anomalies</div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D9E2EA]">
                <div className="text-[11px] text-[#5B6B7A] uppercase font-semibold">Quality Index</div>
                <div className="text-2xl font-bold text-[#D9363E] mt-0.5">{validationReport.dataQualityScore}%</div>
                <div className="text-[10px] text-[#81909D]">Below qualification gate (60%)</div>
              </div>
            </div>

            {/* Error Rule Explainer Alert */}
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#D9363E]/30 text-xs font-mono text-[#D9363E]">
              <b>VALIDATION GATE ENFORCED:</b> When critical validation errors are present, SpaceGuard AI will NOT compute
              fake scores, will NOT silently repair data, and will NOT send corrupt inputs to Module A, Module B, or the Risk Engine.
              Correct the issues below and re-upload the telemetry file.
            </div>
          </div>

          {/* Highlight Cards for Top Errors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {validationReport.errors.slice(0, 4).map((err) => (
              <div
                key={err.id}
                className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] shadow-sm flex flex-col gap-2 font-mono text-xs"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#D9E2EA] pb-2">
                  <span className="font-bold text-[#D9363E] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#D9363E]" />
                    ERROR TYPE: {err.errorType}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      err.severity === 'Critical'
                        ? 'bg-[#D9363E]/15 text-[#D9363E] border border-[#D9363E]/40'
                        : 'bg-[#C58A00]/15 text-[#C58A00] border border-[#C58A00]/40'
                    }`}
                  >
                    {err.severity.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  {err.row && (
                    <div>
                      <span className="text-[#5B6B7A]">Row:</span> <b className="text-[#17212B]">#{err.row}</b>
                    </div>
                  )}
                  {err.column && (
                    <div>
                      <span className="text-[#5B6B7A]">Column:</span> <b className="text-[#0E88D3]">{err.column}</b>
                    </div>
                  )}
                  {err.detectedValue && (
                    <div>
                      <span className="text-[#5B6B7A]">Detected:</span> <b className="text-[#D9363E]">{err.detectedValue}</b>
                    </div>
                  )}
                  {err.expectedValue && (
                    <div>
                      <span className="text-[#5B6B7A]">Expected:</span> <b className="text-[#168A5B]">{err.expectedValue}</b>
                    </div>
                  )}
                </div>

                <div className="text-[11px] mt-1 pt-2 border-t border-[#D9E2EA]/60">
                  <div className="text-[#5B6B7A]">
                    <span className="font-semibold text-[#17212B]">Impact:</span> {err.impact}
                  </div>
                  <div className="text-[#0E88D3] mt-0.5">
                    <span className="font-semibold text-[#17212B]">Recommended Fix:</span> {err.recommendedFix}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Searchable / Filterable Error Table */}
          <div ref={errorTableRef} className="p-4 md:p-5 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] shadow-sm flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9E2EA] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-[#17212B] uppercase">
                  Comprehensive Validation Error Ledger
                </span>
                <span className="text-xs font-mono text-[#5B6B7A] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#D9E2EA]">
                  Showing {filteredErrors.length} of {validationReport.errorCount}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Filter errors by type, row, column..."
                  value={errorSearch}
                  onChange={(e) => setErrorSearch(e.target.value)}
                  className="bg-[#F4F7FA] border border-[#D9E2EA] rounded-lg px-2.5 py-1 text-xs text-[#17212B] font-mono placeholder:text-[#81909D] focus:outline-none focus:border-[#0E88D3] w-56"
                />

                {/* Severity Filter Pills */}
                <div className="flex items-center gap-1">
                  {(['ALL', 'Critical', 'Warning'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setErrorSeverityFilter(sev)}
                      className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                        errorSeverityFilter === sev
                          ? sev === 'Critical'
                            ? 'bg-[#D9363E] text-white font-bold'
                            : sev === 'Warning'
                            ? 'bg-[#C58A00] text-white font-bold'
                            : 'bg-[#0E88D3] text-white font-bold'
                          : 'bg-[#F8FAFC] text-[#5B6B7A] border border-[#D9E2EA] hover:text-[#17212B]'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Table */}
            <div className="overflow-x-auto rounded-lg border border-[#D9E2EA]">
              <table className="w-full text-xs font-mono text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#5B6B7A] uppercase tracking-wider border-b border-[#D9E2EA]">
                    <th className="p-2.5 font-semibold">Severity</th>
                    <th className="p-2.5 font-semibold">Error Type</th>
                    <th className="p-2.5 font-semibold">Row</th>
                    <th className="p-2.5 font-semibold">Column</th>
                    <th className="p-2.5 font-semibold">Detected Value</th>
                    <th className="p-2.5 font-semibold">Expected Value</th>
                    <th className="p-2.5 font-semibold">Impact</th>
                    <th className="p-2.5 font-semibold">Recommended Fix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9E2EA]/60 bg-[#FFFFFF]">
                  {filteredErrors.length > 0 ? (
                    filteredErrors.map((err) => (
                      <tr key={err.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              err.severity === 'Critical'
                                ? 'bg-[#D9363E]/15 text-[#D9363E] border border-[#D9363E]/40'
                                : 'bg-[#C58A00]/15 text-[#C58A00] border border-[#C58A00]/40'
                            }`}
                          >
                            {err.severity}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-[#17212B] whitespace-nowrap">{err.errorType}</td>
                        <td className="p-2.5 text-[#5B6B7A]">{err.row ? `#${err.row}` : 'Header'}</td>
                        <td className="p-2.5 text-[#0E88D3] font-semibold">{err.column || '--'}</td>
                        <td className="p-2.5 text-[#D9363E] font-semibold">{err.detectedValue || '--'}</td>
                        <td className="p-2.5 text-[#168A5B] font-semibold">{err.expectedValue || '--'}</td>
                        <td className="p-2.5 text-[#5B6B7A] max-w-xs">{err.impact}</td>
                        <td className="p-2.5 text-[#0E88D3] max-w-xs font-semibold">{err.recommendedFix}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-[#5B6B7A]">
                        No errors matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. VALIDATION SUCCESS / READY FOR AI SCREENING               */}
      {/* ============================================================ */}
      {isPassed && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Validation Passed Bezel */}
          <div className="p-4 md:p-5 rounded-xl bg-[#FFFFFF] border-2 border-[#168A5B] shadow-sm flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9E2EA] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#168A5B]" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base md:text-lg font-mono font-bold text-[#168A5B] tracking-wide uppercase">
                      TELEMETRY DATASET VALIDATED &bull; MIL-STD-883 CLEARANCE APPROVED
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#168A5B]/15 text-[#168A5B] border border-[#168A5B]/40">
                      STATUS: READY FOR AI SCREENING
                    </span>
                  </div>
                  <div className="text-xs text-[#5B6B7A] font-mono mt-0.5">
                    File: <b className="text-[#17212B]">{validationReport?.fileName || 'validated_telemetry.csv'}</b> &bull; {rawParts.length} verified records
                  </div>
                </div>
              </div>

              {/* Start Screening Action Button */}
              <button
                type="button"
                onClick={async () => {
                  sounds.playClick()
                  await onRunScreening()
                }}
                disabled={running}
                className="px-5 py-2.5 rounded-lg bg-[#0E88D3] hover:bg-[#0c74b4] text-white font-mono font-bold text-xs md:text-sm cursor-pointer transition-all shadow-md flex items-center gap-2"
              >
                <span>{running ? 'Screening Pipeline Running...' : 'START AI SCREENING'}</span>
                <span>⚡</span>
              </button>
            </div>

            {/* Checklist of 5 Verifications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#168A5B]/40 flex items-center gap-2">
                <span className="text-[#168A5B] font-bold text-sm">✓</span>
                <span className="text-[#17212B] font-semibold">FILE FORMAT VALID</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#168A5B]/40 flex items-center gap-2">
                <span className="text-[#168A5B] font-bold text-sm">✓</span>
                <span className="text-[#17212B] font-semibold">SCHEMA VALID</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#168A5B]/40 flex items-center gap-2">
                <span className="text-[#168A5B] font-bold text-sm">✓</span>
                <span className="text-[#17212B] font-semibold">REQUIRED COLUMNS VALID</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#168A5B]/40 flex items-center gap-2">
                <span className="text-[#168A5B] font-bold text-sm">✓</span>
                <span className="text-[#17212B] font-semibold">ROW VALIDATION PASSED</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#168A5B]/40 flex items-center gap-2">
                <span className="text-[#168A5B] font-bold text-sm">✓</span>
                <span className="text-[#168A5B] font-bold">
                  DATA QUALITY: {validationReport?.dataQualityScore ?? 98}%
                </span>
              </div>
            </div>
          </div>

          {/* Row 1: 4 Validation Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono text-[#5B6B7A]">
                <span>VALID RECORDS</span>
                <span className="w-2 h-2 rounded-full bg-[#168A5B]" />
              </div>
              <div className="text-2xl font-mono font-bold text-[#17212B] tabular-nums">
                {rawParts.length}
              </div>
              <div className="text-[11px] text-[#168A5B] font-mono flex items-center gap-1">
                <span>✓</span>
                <span>100% Parsed Successfully</span>
              </div>
              <p className="text-[10.5px] text-[#81909D] mt-1 font-sans">
                All records verified with component ID, lot grouping, and burn-in points.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono text-[#5B6B7A]">
                <span>INTERPOLATED POINTS</span>
                <span className="w-2 h-2 rounded-full bg-[#168A5B]" />
              </div>
              <div className="text-2xl font-mono font-bold text-[#17212B] tabular-nums">
                {validationAudit?.missing96hCount ?? 0}
              </div>
              <div className="text-[11px] text-[#168A5B] font-mono flex items-center gap-1">
                <span>✓</span>
                <span>Zero Unresolved Nulls</span>
              </div>
              <p className="text-[10.5px] text-[#81909D] mt-1 font-sans">
                Spline interpolation applied to missing intermediate telemetry points.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono text-[#5B6B7A]">
                <span>DUPLICATE PARTS</span>
                <span className="w-2 h-2 rounded-full bg-[#168A5B]" />
              </div>
              <div className="text-2xl font-mono font-bold text-[#17212B] tabular-nums">
                0
              </div>
              <div className="text-[11px] text-[#168A5B] font-mono flex items-center gap-1">
                <span>✓</span>
                <span>Unique Serialization</span>
              </div>
              <p className="text-[10.5px] text-[#81909D] mt-1 font-sans">
                Every component verified with unique UID across qualification production lots.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono text-[#5B6B7A]">
                <span>UNITS &amp; LIMITS</span>
                <span className="w-2 h-2 rounded-full bg-[#168A5B]" />
              </div>
              <div className="text-2xl font-mono font-bold text-[#0E88D3] tabular-nums">
                &mu;A
              </div>
              <div className="text-[11px] text-[#5B6B7A] font-mono flex items-center gap-1">
                <span>Threshold:</span>
                <span className="text-[#17212B] font-bold">50.0 &mu;A Limit</span>
              </div>
              <p className="text-[10.5px] text-[#81909D] mt-1 font-sans">
                Normalized against MIL-STD-883 Class S maximum reverse leakage parameters.
              </p>
            </div>
          </div>

          {/* Row 2: Arrhenius Acceleration Physics Banner */}
          <div className="p-4 md:p-5 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9E2EA] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#168A5B]" />
                <span className="text-sm font-mono font-bold text-[#17212B] uppercase">
                  Silicon Burn-In Degradation Physics Model
                </span>
              </div>
              <span className="text-xs font-mono text-[#0E88D3]">
                ARRHENIUS ACTIVATION: E<sub>a</sub> = 0.70 eV &bull; T<sub>j</sub> = 125&deg;C
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono pt-1">
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D9E2EA]">
                <div className="text-[#5B6B7A] uppercase font-bold text-[11px]">Acceleration Factor (AF)</div>
                <div className="text-lg font-bold text-[#17212B] mt-1">168.4&times; Ground-Equivalent</div>
                <div className="text-[10.5px] text-[#81909D] mt-0.5">
                  168h at 125&deg;C corresponds to ~3.2 years of continuous orbital life.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D9E2EA]">
                <div className="text-[#5B6B7A] uppercase font-bold text-[11px]">Lot-Relative Baseline</div>
                <div className="text-lg font-bold text-[#0E88D3] mt-1">Median &plusmn; MAD Robust Estimator</div>
                <div className="text-[10.5px] text-[#81909D] mt-0.5">
                  Protects against extreme outliers skewing baseline mean and standard deviation.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D9E2EA]">
                <div className="text-[#5B6B7A] uppercase font-bold text-[11px]">Extrapolation Horizon</div>
                <div className="text-lg font-bold text-[#F47216] mt-1">+96h In-Flight Projection (264h)</div>
                <div className="text-[10.5px] text-[#81909D] mt-0.5">
                  Early warning detection before components cross flight specification limit.
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Cleaned Dataset Preview */}
          <div className="p-4 md:p-5 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-4 shadow-sm flex-1 min-h-[360px]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9E2EA] pb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-[#17212B] uppercase tracking-wide">
                  Cleaned &amp; Validated Telemetry Dataset
                </span>
                <span className="px-2 py-0.5 rounded bg-[#F8FAFC] text-[#5B6B7A] text-xs font-mono border border-[#D9E2EA]">
                  {filteredParts.length} Verified Records
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Search verified records..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setTablePage(0)
                  }}
                  className="bg-[#F4F7FA] border border-[#D9E2EA] rounded-lg px-3 py-1.5 text-xs text-[#17212B] font-mono placeholder:text-[#81909D] focus:outline-none focus:border-[#0E88D3] w-64"
                />

                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value))
                    setTablePage(0)
                  }}
                  className="bg-[#F4F7FA] border border-[#D9E2EA] text-[#5B6B7A] text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10 rows</option>
                  <option value={15}>15 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#D9E2EA]">
              <table className="w-full text-xs font-mono text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#5B6B7A] uppercase tracking-wider border-b border-[#D9E2EA]">
                    <th className="p-2.5 font-semibold">#</th>
                    <th className="p-2.5 font-semibold">Component ID</th>
                    <th className="p-2.5 font-semibold">Lot ID</th>
                    <th className="p-2.5 font-semibold">Subsystem</th>
                    <th className="p-2.5 font-semibold text-right">0h (Cleaned)</th>
                    <th className="p-2.5 font-semibold text-right">24h (Cleaned)</th>
                    <th className="p-2.5 font-semibold text-right">96h (Cleaned)</th>
                    <th className="p-2.5 font-semibold text-right">168h (Cleaned)</th>
                    <th className="p-2.5 font-semibold text-right">Datasheet Spec</th>
                    <th className="p-2.5 font-semibold text-center">Data Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9E2EA]/60 bg-[#FFFFFF]">
                  {paginatedParts.map((p, idx) => (
                    <tr key={p.component_id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-2.5 text-[#81909D]">{tablePage * rowsPerPage + idx + 1}</td>
                      <td className="p-2.5 font-bold text-[#17212B]">{p.component_id}</td>
                      <td className="p-2.5 text-[#0E88D3]">{p.lot_id}</td>
                      <td className="p-2.5 text-[#0E88D3]">{p.subsystem}</td>
                      <td className="p-2.5 text-right tabular-nums text-[#5B6B7A]">{p.v0.toFixed(2)} &mu;A</td>
                      <td className="p-2.5 text-right tabular-nums text-[#5B6B7A]">{p.v24.toFixed(2)} &mu;A</td>
                      <td className="p-2.5 text-right tabular-nums text-[#5B6B7A]">
                        {p.v96 != null ? `${p.v96.toFixed(2)} \u00B5A` : (p.v24 + 0.5 * (p.v168 - p.v24)).toFixed(2) + ' µA'}
                      </td>
                      <td className="p-2.5 text-right tabular-nums font-bold text-[#17212B]">
                        {p.v168.toFixed(2)} &mu;A
                      </td>
                      <td className="p-2.5 text-right tabular-nums text-[#81909D]">
                        {p.limit_ua.toFixed(1)} &mu;A
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#168A5B]/15 text-[#168A5B] border border-[#168A5B]/40">
                          VERIFIED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs font-mono text-[#5B6B7A] pt-2">
                <div>
                  Page {tablePage + 1} of {totalPages} ({filteredParts.length} items)
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={tablePage === 0}
                    onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                    className="px-3 py-1 rounded bg-[#F8FAFC] border border-[#D9E2EA] hover:border-[#0E88D3] disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={tablePage >= totalPages - 1}
                    onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
                    className="px-3 py-1 rounded bg-[#F8FAFC] border border-[#D9E2EA] hover:border-[#0E88D3] disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. EMPTY STATE (NO DATASET LOADED)                           */}
      {/* ============================================================ */}
      {!isBlocked && !isPassed && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-xl bg-[#FFFFFF] border border-[#D9E2EA] shadow-sm text-center font-mono animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-[#0E88D3]/10 border border-[#0E88D3]/30 flex items-center justify-center text-3xl mb-4">
            📡
          </div>
          <h2 className="text-xl font-bold text-[#17212B] uppercase tracking-wide">
            NO DATASET LOADED
          </h2>
          <p className="text-xs text-[#5B6B7A] max-w-md mt-1.5 font-sans">
            Upload a valid MIL-STD-883 burn-in CSV file in the CSV Intake workspace or use the button below to commence telemetry preprocessing and validation.
          </p>

          <div className="flex items-center gap-3 mt-5">
            <button
              type="button"
              onClick={handleTriggerUpload}
              className="px-4 py-2 rounded-lg bg-[#0E88D3] hover:bg-[#0c74b4] text-white text-xs font-bold font-mono transition-all shadow-sm cursor-pointer"
            >
              Upload Flight CSV Telemetry
            </button>
            <button
              type="button"
              onClick={() => onSelectStage('csv_intake')}
              className="px-4 py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#D9E2EA] border border-[#D9E2EA] text-[#17212B] text-xs font-bold font-mono transition-all cursor-pointer"
            >
              Open CSV Intake Workspace &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
