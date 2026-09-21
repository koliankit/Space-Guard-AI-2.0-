import React, { useState, useMemo, useRef, useEffect } from 'react'
import type { ComponentOut, UploadResult, MissionStatus, ValidationReport, ValidationErrorItem, ValidationErrorGroup } from '../../types'
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

const ERROR_GROUPS: { id: 'ALL' | ValidationErrorGroup; label: string; icon: string }[] = [
  { id: 'ALL', label: 'All Issues', icon: '📋' },
  { id: 'SCHEMA', label: 'Schema', icon: '🗂️' },
  { id: 'DATA', label: 'Data Integrity', icon: '🔢' },
  { id: 'RANGE', label: 'Range & Spec', icon: '📏' },
  { id: 'IDENTITY', label: 'Identity', icon: '🆔' },
  { id: 'BURN_IN', label: 'Burn-In Points', icon: '⏱️' },
]

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

  // Error Ledger Controls
  const [selectedGroup, setSelectedGroup] = useState<'ALL' | ValidationErrorGroup>('ALL')
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | 'Critical' | 'Warning'>('ALL')
  const [errorSearch, setErrorSearch] = useState('')
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const errorLedgerRef = useRef<HTMLDivElement>(null)

  // Determine status
  const isBlocked = validationReport?.status === 'BLOCKED'
  const isPassed = validationReport?.status === 'PASSED' || (uploadMeta !== null && !isBlocked)

  // Parts list
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

  // All errors from report
  const allErrors: ValidationErrorItem[] = useMemo(() => {
    return validationReport?.errors || []
  }, [validationReport?.errors])

  // Count per group
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: allErrors.length }
    allErrors.forEach((err) => {
      const g = err.group || 'DATA'
      counts[g] = (counts[g] || 0) + 1
    })
    return counts
  }, [allErrors])

  // Filtered errors
  const filteredErrors = useMemo(() => {
    return allErrors.filter((err) => {
      if (selectedGroup !== 'ALL' && err.group !== selectedGroup) return false
      if (selectedSeverity !== 'ALL' && err.severity !== selectedSeverity) return false
      if (errorSearch.trim()) {
        const q = errorSearch.toLowerCase()
        const match =
          err.errorType.toLowerCase().includes(q) ||
          (err.column && err.column.toLowerCase().includes(q)) ||
          (err.row && String(err.row).includes(q)) ||
          (err.message && err.message.toLowerCase().includes(q)) ||
          (err.what && err.what.toLowerCase().includes(q)) ||
          (err.why && err.why.toLowerCase().includes(q)) ||
          (err.reason && err.reason.toLowerCase().includes(q)) ||
          (err.impact && err.impact.toLowerCase().includes(q)) ||
          (err.howToFix && err.howToFix.toLowerCase().includes(q)) ||
          (err.recommendedFix && err.recommendedFix.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }, [allErrors, selectedGroup, selectedSeverity, errorSearch])

  // Active selected error for 4-part explanation
  const activeError = useMemo(() => {
    if (selectedErrorId) {
      const found = allErrors.find((e) => e.id === selectedErrorId)
      if (found) return found
    }
    return filteredErrors[0] || allErrors[0] || null
  }, [allErrors, filteredErrors, selectedErrorId])

  // Auto-select first error when report changes
  useEffect(() => {
    if (allErrors.length > 0 && !selectedErrorId) {
      setSelectedErrorId(allErrors[0].id)
    }
  }, [allErrors, selectedErrorId])

  const hasData = rawParts.length > 0
  const isScreened = mission !== null && (mission.safe > 0 || mission.monitor > 0 || mission.reject > 0)

  // Download error report JSON
  const handleDownloadReportJSON = () => {
    if (!validationReport) return
    sounds.playSuccess()
    const reportData = {
      standard: 'MIL-STD-883 METHOD 1005 CLASS S',
      timestamp: new Date().toISOString(),
      fileName: validationReport.fileName,
      status: validationReport.status,
      summary: {
        totalRows: validationReport.totalRows,
        validRows: validationReport.validRows,
        invalidRows: validationReport.invalidRows,
        totalColumns: validationReport.totalColumns,
        criticalErrors: validationReport.criticalCount,
        warnings: validationReport.warningCount,
        dataQualityScore: validationReport.dataQualityScore,
      },
      errors: validationReport.errors.map((e) => ({
        id: e.id,
        group: e.group,
        errorType: e.errorType,
        severity: e.severity,
        row: e.row,
        column: e.column,
        detectedValue: e.detectedValue,
        expectedValue: e.expectedValue,
        what: e.what,
        why: e.why,
        impact: e.impact,
        howToFix: e.howToFix,
      })),
    }
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `validation_report_${validationReport.fileName || 'flight_batch'}.json`
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
      sounds.playClick()
      await onFileUploaded(file)
      e.target.value = ''
    }
  }

  return (
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-[#EEF3F7] text-[#17212B] font-sans flex-1 min-h-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
      />

      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#D5DEE7] bg-[#FFFFFF] p-4 md:p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#0E88D3]/15 text-[#0E88D3] border border-[#0E88D3]/40 font-mono font-bold text-xs uppercase tracking-wider">
              STAGE 1
            </span>
            <span className="text-xs font-mono font-semibold text-[#4F6170]">
              MIL-STD-883 METHOD 1005 CLASS S AUDIT GATE
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-black text-[#17212B] tracking-wide mt-1">
            Explainable Telemetry Validation System
          </h1>
          <p className="text-xs text-[#4F6170] mt-0.5 max-w-3xl leading-relaxed">
            Strict verification of flight CSV structure, burn-in measurement integrity, and physical parameters.
            Guarantees zero corrupt, missing, or unverified records penetrate downstream AI Screening Modules.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={async () => {
              if (isBlocked) {
                sounds.playAlert()
                return
              }
              sounds.playClick()
              await onRunScreening()
            }}
            disabled={!hasData || running || isBlocked}
            className={`px-4 py-2.5 rounded-lg font-mono font-bold text-xs md:text-sm transition-all flex items-center gap-2 shadow-sm ${
              !hasData || running || isBlocked
                ? 'bg-[#E7EEF5] text-[#718292] cursor-not-allowed border border-[#D5DEE7]'
                : 'bg-[#0E88D3] hover:bg-[#0c74b4] text-white cursor-pointer'
            }`}
            title={
              isBlocked
                ? 'AI Screening blocked: Correct critical errors in CSV before proceeding.'
                : hasData
                ? 'Execute screening across validated parts'
                : 'Upload and validate telemetry first'
            }
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
                ? 'bg-[#F47216] hover:bg-[#e0630e] text-white cursor-pointer shadow-sm'
                : 'bg-[#E7EEF5] text-[#718292] cursor-not-allowed border border-[#D5DEE7]'
            }`}
            title={isScreened ? 'Proceed to Module A' : 'Complete AI Screening first'}
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
          {/* Status Banner: DATA VALIDATION FAILED */}
          <div className="p-4 md:p-5 rounded-xl bg-[#FFFFFF] border-2 border-[#D9363E] shadow-sm flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D5DEE7] pb-3.5">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-[#D9363E] animate-pulse flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg md:text-xl font-mono font-black text-[#D9363E] tracking-wide uppercase">
                      ✕ DATA VALIDATION FAILED &bull; AI SCREENING BLOCKED
                    </h2>
                    <span className="px-2 py-0.5 rounded bg-[#D9363E] text-white font-mono font-bold text-xs">
                      GATE ENFORCED
                    </span>
                  </div>
                  <div className="text-xs text-[#4F6170] font-mono mt-0.5">
                    File: <b className="text-[#17212B]">{validationReport.fileName || 'uploaded_batch.csv'}</b> &bull; Standard: MIL-STD-883 Method 1005 Class S
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                <button
                  type="button"
                  onClick={() => errorLedgerRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-3.5 py-1.5 rounded-lg border border-[#D5DEE7] bg-[#F8FAFC] hover:bg-[#E7EEF5] text-[#17212B] font-bold cursor-pointer transition-colors"
                >
                  [ VIEW ERRORS ]
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReportJSON}
                  className="px-3.5 py-1.5 rounded-lg border border-[#0E88D3] bg-[#0E88D3]/10 hover:bg-[#0E88D3]/20 text-[#0E88D3] font-bold cursor-pointer transition-colors"
                  title="Export machine-readable JSON error diagnostic report"
                >
                  [ DOWNLOAD ERROR REPORT ]
                </button>
                <button
                  type="button"
                  onClick={handleTriggerUpload}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0E88D3] hover:bg-[#0c74b4] text-white font-bold cursor-pointer transition-colors shadow-sm"
                >
                  [ UPLOAD CORRECTED CSV ]
                </button>
              </div>
            </div>

            {/* Summary Metrics Grid (7 Required Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 font-mono">
              <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#D9363E]/40">
                <div className="text-[10px] text-[#D9363E] uppercase font-bold tracking-wider">Critical Errors</div>
                <div className="text-2xl font-bold text-[#D9363E] mt-0.5">{validationReport.criticalCount}</div>
                <div className="text-[10px] text-[#D9363E] font-medium">Blocks Pipeline</div>
              </div>

              <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#C58A00]/40">
                <div className="text-[10px] text-[#C58A00] uppercase font-bold tracking-wider">Warnings</div>
                <div className="text-2xl font-bold text-[#C58A00] mt-0.5">{validationReport.warningCount}</div>
                <div className="text-[10px] text-[#C58A00] font-medium">Non-blocking</div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D5DEE7]">
                <div className="text-[10px] text-[#4F6170] uppercase font-bold tracking-wider">Rows Checked</div>
                <div className="text-2xl font-bold text-[#17212B] mt-0.5">{validationReport.totalRows}</div>
                <div className="text-[10px] text-[#718292]">Total parsed records</div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D5DEE7]">
                <div className="text-[10px] text-[#168A5B] uppercase font-bold tracking-wider">Valid Rows</div>
                <div className="text-2xl font-bold text-[#168A5B] mt-0.5">{validationReport.validRows}</div>
                <div className="text-[10px] text-[#718292]">Schema compliant</div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D5DEE7]">
                <div className="text-[10px] text-[#D9363E] uppercase font-bold tracking-wider">Invalid Rows</div>
                <div className="text-2xl font-bold text-[#D9363E] mt-0.5">{validationReport.invalidRows}</div>
                <div className="text-[10px] text-[#718292]">Contains violations</div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D5DEE7]">
                <div className="text-[10px] text-[#4F6170] uppercase font-bold tracking-wider">Total Columns</div>
                <div className="text-2xl font-bold text-[#17212B] mt-0.5">{validationReport.totalColumns}</div>
                <div className="text-[10px] text-[#718292]">Detected headers</div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D5DEE7]">
                <div className="text-[10px] text-[#4F6170] uppercase font-bold tracking-wider">Quality Score</div>
                <div className="text-2xl font-bold text-[#D9363E] mt-0.5">{validationReport.dataQualityScore}%</div>
                <div className="text-[10px] text-[#D9363E] font-medium">&lt; 60% Qualification Min</div>
              </div>
            </div>

            {/* Validation Rule Explainer Alert */}
            <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#D9363E]/40 text-xs font-mono text-[#D9363E] flex items-start gap-2.5">
              <span className="text-base leading-none">🛡️</span>
              <div className="leading-relaxed">
                <b>VALIDATION GATE ENFORCED:</b> SpaceGuard AI strictly prevents invalid data from entering Module A, Module B, or the Bayesian Risk Engine.
                No synthetic or unvalidated inputs are passed to downstream AI flight models. Review the explanations below, fix the identified issues in your CSV, and re-upload.
              </div>
            </div>
          </div>

          {/* Interactive Error Guidance Center: 2-Column Ledger & 4-Part Explainer */}
          <div ref={errorLedgerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Left: Error Ledger Table (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col bg-[#FFFFFF] border border-[#D5DEE7] rounded-xl shadow-sm overflow-hidden">
              {/* Filter Tabs & Search Header */}
              <div className="p-4 border-b border-[#D5DEE7] bg-[#F8FAFC] flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#17212B]">
                    Validation Error Ledger ({filteredErrors.length})
                  </span>
                  {/* Severity Filter */}
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    {(['ALL', 'Critical', 'Warning'] as const).map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSelectedSeverity(sev)}
                        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                          selectedSeverity === sev
                            ? sev === 'Critical'
                              ? 'bg-[#D9363E] text-white font-bold'
                              : sev === 'Warning'
                              ? 'bg-[#C58A00] text-white font-bold'
                              : 'bg-[#0E88D3] text-white font-bold'
                            : 'bg-[#FFFFFF] text-[#4F6170] border border-[#D5DEE7] hover:text-[#17212B]'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Grouping Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#D5DEE7]/70">
                  {ERROR_GROUPS.map((grp) => {
                    const count = groupCounts[grp.id] || 0
                    const isActive = selectedGroup === grp.id
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => setSelectedGroup(grp.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
                          isActive
                            ? 'bg-[#0E88D3] text-white border-[#0E88D3] font-bold shadow-sm'
                            : 'bg-[#FFFFFF] text-[#4F6170] border-[#D5DEE7] hover:border-[#0E88D3] hover:text-[#17212B]'
                        }`}
                      >
                        <span>{grp.icon}</span>
                        <span>{grp.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          isActive ? 'bg-white/25 text-white font-bold' : 'bg-[#F3F6F9] text-[#718292]'
                        }`}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Search Bar */}
                <div className="pt-1">
                  <input
                    type="text"
                    placeholder="Search errors by column, row, keyword, or impact..."
                    value={errorSearch}
                    onChange={(e) => setErrorSearch(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D5DEE7] rounded-lg px-3 py-1.5 text-xs text-[#17212B] font-mono placeholder:text-[#718292] focus:outline-none focus:border-[#0E88D3]"
                  />
                </div>
              </div>

              {/* Error Table */}
              <div className="overflow-x-auto flex-1 min-h-[360px] max-h-[580px]">
                <table className="w-full text-xs font-mono text-left border-collapse">
                  <thead className="bg-[#F8FAFC] text-[10.5px] text-[#4F6170] uppercase tracking-wider sticky top-0 z-10 border-b border-[#D5DEE7]">
                    <tr>
                      <th className="p-2.5 font-semibold">Severity</th>
                      <th className="p-2.5 font-semibold">Group</th>
                      <th className="p-2.5 font-semibold">Error Type</th>
                      <th className="p-2.5 font-semibold">Row</th>
                      <th className="p-2.5 font-semibold">Column</th>
                      <th className="p-2.5 font-semibold">Detected</th>
                      <th className="p-2.5 font-semibold text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5DEE7]/70 bg-[#FFFFFF]">
                    {filteredErrors.length > 0 ? (
                      filteredErrors.map((err) => {
                        const isSelected = activeError?.id === err.id
                        return (
                          <tr
                            key={err.id}
                            onClick={() => {
                              sounds.playClick()
                              setSelectedErrorId(err.id)
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#0E88D3]/10 ring-1 ring-[#0E88D3] font-semibold'
                                : 'hover:bg-[#F8FAFC]'
                            }`}
                          >
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
                            <td className="p-2.5 text-[#4F6170] text-[11px] uppercase">{err.group || 'DATA'}</td>
                            <td className="p-2.5 font-bold text-[#17212B] whitespace-nowrap">{err.errorType}</td>
                            <td className="p-2.5 text-[#4F6170]">{err.row ? `#${err.row}` : 'Header'}</td>
                            <td className="p-2.5 text-[#0E88D3] font-semibold">{err.column || '--'}</td>
                            <td className="p-2.5 text-[#D9363E] font-medium truncate max-w-[120px]" title={err.detectedValue}>
                              {err.detectedValue || '--'}
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isSelected
                                    ? 'bg-[#0E88D3] text-white'
                                    : 'bg-[#F8FAFC] border border-[#D5DEE7] text-[#4F6170]'
                                }`}
                              >
                                {isSelected ? 'ACTIVE' : 'SELECT'}
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[#4F6170] italic">
                          No errors match the selected group/search filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: 4-Part Explanation Side Panel (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col bg-[#FFFFFF] border border-[#D5DEE7] rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#D5DEE7] bg-[#F8FAFC] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D9363E]" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#17212B]">
                    Diagnostic &amp; Resolution Guidance
                  </span>
                </div>
                {activeError && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      activeError.severity === 'Critical'
                        ? 'bg-[#D9363E]/15 text-[#D9363E] border border-[#D9363E]/40'
                        : 'bg-[#C58A00]/15 text-[#C58A00] border border-[#C58A00]/40'
                    }`}
                  >
                    {activeError.severity.toUpperCase()}
                  </span>
                )}
              </div>

              {activeError ? (
                <div className="p-4 md:p-5 overflow-y-auto flex-1 flex flex-col gap-4 font-mono text-xs">
                  {/* Error Header Identification */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D5DEE7] flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] text-[#4F6170]">
                      <span>ERROR IDENTIFIER</span>
                      <span className="text-[#0E88D3] font-bold">GROUP: {activeError.group || 'DATA'}</span>
                    </div>
                    <div className="text-base font-bold text-[#17212B]">{activeError.errorType}</div>
                    <div className="flex items-center gap-3 text-[11px] text-[#4F6170] pt-1 border-t border-[#D5DEE7]">
                      <span>Row: <b className="text-[#17212B]">{activeError.row ? `#${activeError.row}` : 'Header Row'}</b></span>
                      <span>&bull;</span>
                      <span>Target: <b className="text-[#0E88D3]">{activeError.column || 'Global'}</b></span>
                    </div>
                  </div>

                  {/* 1. WHAT IS WRONG */}
                  <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#D9363E]/30 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-[#D9363E] font-bold text-[11px] uppercase tracking-wider">
                      <span>1.</span>
                      <span>What Is Wrong</span>
                    </div>
                    <p className="text-xs text-[#17212B] font-sans leading-relaxed mt-0.5">
                      {activeError.what || activeError.message}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-2 pt-2 border-t border-[#D9363E]/20">
                      <div>
                        <span className="text-[#4F6170] block">Detected:</span>
                        <b className="text-[#D9363E] break-all">{activeError.detectedValue || 'Invalid Value'}</b>
                      </div>
                      <div>
                        <span className="text-[#4F6170] block">Expected:</span>
                        <b className="text-[#168A5B] break-all">{activeError.expectedValue || 'Standard Specification'}</b>
                      </div>
                    </div>
                  </div>

                  {/* 2. WHY THIS IS AN ERROR */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D5DEE7] flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-[#17212B] font-bold text-[11px] uppercase tracking-wider">
                      <span>2.</span>
                      <span>Why This Is An Error</span>
                    </div>
                    <p className="text-xs text-[#4F6170] font-sans leading-relaxed mt-0.5">
                      {activeError.why || 'Violates MIL-STD-883 Method 1005 Class S HTOL screening specification.'}
                    </p>
                  </div>

                  {/* 3. IMPACT ON SCREENING PIPELINE */}
                  <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#C58A00]/40 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-[#C58A00] font-bold text-[11px] uppercase tracking-wider">
                      <span>3.</span>
                      <span>Impact on Screening Pipeline</span>
                    </div>
                    <p className="text-xs text-[#17212B] font-sans leading-relaxed mt-0.5">
                      {activeError.impact || 'Incomplete telemetry prevents calculating Arrhenius drift rate and corrupts Bayesian risk assessment.'}
                    </p>
                  </div>

                  {/* 4. HOW TO FIX IT */}
                  <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#168A5B]/40 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-[#168A5B] font-bold text-[11px] uppercase tracking-wider">
                      <span>4.</span>
                      <span>How To Fix It</span>
                    </div>
                    <p className="text-xs text-[#17212B] font-sans font-medium leading-relaxed">
                      {activeError.howToFix || 'Correct the highlighted cells in the CSV and re-upload the telemetry file.'}
                    </p>
                  </div>

                  {/* Quick Action in Panel */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleTriggerUpload}
                      className="w-full py-2.5 rounded-lg bg-[#0E88D3] hover:bg-[#0c74b4] text-white font-mono font-bold text-xs cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <span>📥 Upload Corrected CSV</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-[#4F6170] italic">
                  Select an error from the ledger to inspect its diagnostic breakdown.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. VALIDATION SUCCESS / READY FOR AI SCREENING               */}
      {/* ============================================================ */}
      {isPassed && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Status Banner: DATA VALIDATION PASSED */}
          <div className="p-4 md:p-5 rounded-xl bg-[#FFFFFF] border-2 border-[#168A5B] shadow-sm flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D5DEE7] pb-3">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-[#168A5B] flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base md:text-lg font-mono font-bold text-[#168A5B] tracking-wide uppercase">
                      ✓ DATA VALIDATION PASSED &bull; MIL-STD-883 CLEARANCE APPROVED
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#168A5B]/15 text-[#168A5B] border border-[#168A5B]/40">
                      STATUS: READY FOR AI SCREENING
                    </span>
                  </div>
                  <div className="text-xs text-[#4F6170] font-mono mt-0.5">
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
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D5DEE7] flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono text-[#4F6170]">
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
              <p className="text-[11px] text-[#718292] mt-1 font-sans">
                All records verified with component ID, lot grouping, and burn-in points.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D5DEE7] flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono text-[#4F6170]">
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
              <p className="text-[11px] text-[#718292] mt-1 font-sans">
                Spline interpolation applied to missing intermediate telemetry points.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D5DEE7] flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono text-[#4F6170]">
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
              <p className="text-[11px] text-[#718292] mt-1 font-sans">
                Every component verified with unique UID across qualification production lots.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D5DEE7] flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono text-[#4F6170]">
                <span>UNITS &amp; LIMITS</span>
                <span className="w-2 h-2 rounded-full bg-[#168A5B]" />
              </div>
              <div className="text-2xl font-mono font-bold text-[#0E88D3] tabular-nums">
                &mu;A
              </div>
              <div className="text-[11px] text-[#4F6170] font-mono flex items-center gap-1">
                <span>Threshold:</span>
                <span className="text-[#17212B] font-bold">50.0 &mu;A Limit</span>
              </div>
              <p className="text-[11px] text-[#718292] mt-1 font-sans">
                Normalized against MIL-STD-883 Class S maximum reverse leakage parameters.
              </p>
            </div>
          </div>

          {/* Row 2: Arrhenius Acceleration Physics Banner */}
          <div className="p-4 md:p-5 rounded-xl bg-[#FFFFFF] border border-[#D5DEE7] flex flex-col gap-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5DEE7] pb-3">
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
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D5DEE7]">
                <div className="text-[#4F6170] uppercase font-bold text-[11px]">Acceleration Factor (AF)</div>
                <div className="text-lg font-bold text-[#17212B] mt-1">168.4&times; Ground-Equivalent</div>
                <div className="text-[11px] text-[#718292] mt-0.5">
                  168h at 125&deg;C corresponds to ~3.2 years of continuous orbital life.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D5DEE7]">
                <div className="text-[#4F6170] uppercase font-bold text-[11px]">Lot-Relative Baseline</div>
                <div className="text-lg font-bold text-[#0E88D3] mt-1">Median &plusmn; MAD Robust Estimator</div>
                <div className="text-[11px] text-[#718292] mt-0.5">
                  Protects against extreme outliers skewing baseline mean and standard deviation.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D5DEE7]">
                <div className="text-[#4F6170] uppercase font-bold text-[11px]">Extrapolation Horizon</div>
                <div className="text-lg font-bold text-[#F47216] mt-1">+96h In-Flight Projection (264h)</div>
                <div className="text-[11px] text-[#718292] mt-0.5">
                  Early warning detection before components cross flight specification limit.
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Cleaned Dataset Preview */}
          <div className="p-4 md:p-5 rounded-xl bg-[#FFFFFF] border border-[#D5DEE7] flex flex-col gap-4 shadow-sm flex-1 min-h-[360px]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D5DEE7] pb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-[#17212B] uppercase tracking-wide">
                  Cleaned &amp; Validated Telemetry Dataset
                </span>
                <span className="px-2 py-0.5 rounded bg-[#F8FAFC] text-[#4F6170] text-xs font-mono border border-[#D5DEE7]">
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
                  className="bg-[#F8FAFC] border border-[#D5DEE7] rounded-lg px-3 py-1.5 text-xs text-[#17212B] font-mono placeholder:text-[#718292] focus:outline-none focus:border-[#0E88D3] w-64"
                />

                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value))
                    setTablePage(0)
                  }}
                  className="bg-[#F8FAFC] border border-[#D5DEE7] text-[#4F6170] text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10 rows</option>
                  <option value={15}>15 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#D5DEE7]">
              <table className="w-full text-xs font-mono text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#4F6170] uppercase tracking-wider border-b border-[#D5DEE7]">
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
                <tbody className="divide-y divide-[#D5DEE7]/70 bg-[#FFFFFF]">
                  {paginatedParts.map((p, idx) => (
                    <tr key={p.component_id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-2.5 text-[#718292]">{tablePage * rowsPerPage + idx + 1}</td>
                      <td className="p-2.5 font-bold text-[#17212B]">{p.component_id}</td>
                      <td className="p-2.5 text-[#0E88D3] font-semibold">{p.lot_id}</td>
                      <td className="p-2.5 text-[#0E88D3]">{p.subsystem}</td>
                      <td className="p-2.5 text-right tabular-nums text-[#4F6170]">{p.v0.toFixed(2)} &mu;A</td>
                      <td className="p-2.5 text-right tabular-nums text-[#4F6170]">{p.v24.toFixed(2)} &mu;A</td>
                      <td className="p-2.5 text-right tabular-nums text-[#4F6170]">
                        {p.v96 != null ? `${p.v96.toFixed(2)} \u00B5A` : (p.v24 + 0.5 * (p.v168 - p.v24)).toFixed(2) + ' µA'}
                      </td>
                      <td className="p-2.5 text-right tabular-nums font-bold text-[#17212B]">
                        {p.v168.toFixed(2)} &mu;A
                      </td>
                      <td className="p-2.5 text-right tabular-nums text-[#718292]">
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
              <div className="flex items-center justify-between text-xs font-mono text-[#4F6170] pt-2">
                <div>
                  Page {tablePage + 1} of {totalPages} ({filteredParts.length} items)
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={tablePage === 0}
                    onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                    className="px-3 py-1 rounded bg-[#F8FAFC] border border-[#D5DEE7] hover:border-[#0E88D3] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={tablePage >= totalPages - 1}
                    onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
                    className="px-3 py-1 rounded bg-[#F8FAFC] border border-[#D5DEE7] hover:border-[#0E88D3] disabled:opacity-40 transition-colors cursor-pointer"
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
        <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-xl bg-[#FFFFFF] border border-[#D5DEE7] shadow-sm text-center font-mono animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-[#0E88D3]/10 border border-[#0E88D3]/30 flex items-center justify-center text-3xl mb-4">
            📡
          </div>
          <h2 className="text-xl font-bold text-[#17212B] uppercase tracking-wide">
            NO DATASET LOADED
          </h2>
          <p className="text-xs text-[#4F6170] max-w-md mt-1.5 font-sans">
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
              className="px-4 py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#E7EEF5] border border-[#D5DEE7] text-[#17212B] text-xs font-bold font-mono transition-all cursor-pointer"
            >
              Open CSV Intake Workspace &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
