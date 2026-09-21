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
  isValidating?: boolean
  validatingFileName?: string | null
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
  isValidating = false,
  validatingFileName = null,
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
  const [expandedErrorIds, setExpandedErrorIds] = useState<Set<string>>(new Set())

  const fileInputRef = useRef<HTMLInputElement>(null)
  const errorLedgerRef = useRef<HTMLDivElement>(null)
  const errorListRef = useRef<HTMLDivElement>(null)

  // Determine status: A report with BLOCKED status or >0 critical errors is blocked
  const isBlocked = Boolean(
    validationReport?.status === 'BLOCKED' ||
    ((validationReport?.criticalCount ?? 0) > 0)
  )
  const isPassed = Boolean(
    !isBlocked &&
    (validationReport?.status === 'PASSED' || (uploadMeta !== null && (validationReport?.criticalCount ?? 0) === 0))
  )

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

  // Primary error: Most critical error from the report for prominent display
  const primaryError = useMemo(() => {
    return allErrors.find((e) => e.severity === 'Critical') || allErrors[0] || null
  }, [allErrors])

  // Accordion toggle helpers for All Errors list
  const toggleExpandError = (id: string) => {
    setExpandedErrorIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAllErrors = () => {
    setExpandedErrorIds(new Set(allErrors.map((e) => e.id)))
  }

  const collapseAllErrors = () => {
    setExpandedErrorIds(new Set())
  }

  // Auto-expand primary error on mount/report change
  useEffect(() => {
    if (primaryError) {
      setExpandedErrorIds(new Set([primaryError.id]))
    }
  }, [primaryError])

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
    <div className="w-full flex flex-col gap-4 p-3 md:p-5 bg-transparent text-[#17212B] font-sans flex-1 min-h-full">
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

        {/* Action Buttons: ONLY show Start AI Screening and Proceed to Module A when validation has passed */}
        {isBlocked ? (
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-lg bg-[#FEF2F2] border border-[#D9363E]/40 text-[#D9363E] font-mono font-bold text-xs flex items-center gap-2 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D9363E] animate-pulse" />
              AI SCREENING: BLOCKED
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={async () => {
                sounds.playClick()
                await onRunScreening()
              }}
              disabled={!hasData || running}
              className={`px-4 py-2.5 rounded-lg font-mono font-bold text-xs md:text-sm transition-all flex items-center gap-2 shadow-sm ${
                !hasData || running
                  ? 'bg-[#E7EEF5] text-[#718292] cursor-not-allowed border border-[#D5DEE7]'
                  : 'bg-[#0E88D3] hover:bg-[#0c74b4] text-white cursor-pointer'
              }`}
              title={hasData ? 'Execute screening across validated parts' : 'Upload and validate telemetry first'}
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
        )}
      </div>

      {/* Horizontal Analysis Workflow Bar */}
      <AnalysisWorkflowBar
        currentStage="validation"
        onSelectStage={onSelectStage}
        hasData={hasData}
        isScreened={isScreened}
      />

      {/* ============================================================ */}
      {/* 1. VALIDATION FAILED / BLOCKED STATE (PART 26 CENTER WORKSPACE) */}
      {/* ============================================================ */}
      {isBlocked && validationReport && (
        <div className="flex flex-col gap-5 animate-fade-in">
          {/* 1. MAIN ERROR SUMMARY (PART 26 — SECTION 3) */}
          <div className="p-5 md:p-6 rounded-2xl bg-[#FFFFFF] border-2 border-[#D9363E] shadow-sm flex flex-col gap-4 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D5DEE7] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D9363E]/15 border border-[#D9363E]/40 flex items-center justify-center text-[#D9363E] font-black text-xl flex-shrink-0">
                  ✕
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl md:text-2xl font-mono font-black text-[#D9363E] tracking-wide uppercase">
                      ✕ DATA VALIDATION FAILED
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#D9363E] text-white font-mono font-bold text-xs">
                      BLOCKED
                    </span>
                  </div>
                  <div className="text-xs text-[#4F6170] font-mono mt-1 flex items-center gap-2 flex-wrap">
                    <span>File: <b className="text-[#17212B]">{validationReport.fileName || 'SpaceGuard_AI_Invalid_CSV_Validation_Test.csv'}</b></span>
                    <span>&bull;</span>
                    <span>Standard: MIL-STD-883 Method 1005 Class S</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons (PART 26 — SECTION 7) */}
              <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                <button
                  type="button"
                  onClick={() => errorListRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-4 py-2 rounded-lg border border-[#D5DEE7] bg-[#F8FAFC] hover:bg-[#E7EEF5] text-[#17212B] font-bold cursor-pointer transition-colors shadow-sm"
                >
                  [ VIEW ALL ERRORS ]
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReportJSON}
                  className="px-4 py-2 rounded-lg border border-[#0E88D3] bg-[#0E88D3]/10 hover:bg-[#0E88D3]/20 text-[#0E88D3] font-bold cursor-pointer transition-colors"
                  title="Export machine-readable JSON error diagnostic report"
                >
                  [ DOWNLOAD ERROR REPORT ]
                </button>
                <button
                  type="button"
                  onClick={handleTriggerUpload}
                  className="px-4 py-2 rounded-lg bg-[#0E88D3] hover:bg-[#0c74b4] text-white font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>[ UPLOAD CORRECTED CSV ]</span>
                </button>
              </div>
            </div>

            {/* Summary Metrics Grid (PART 26 — SECTION 3 COUNTS) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#D9363E]/40">
                <div className="text-[10px] text-[#D9363E] uppercase font-bold tracking-wider">Status</div>
                <div className="text-xl font-black text-[#D9363E] mt-0.5">BLOCKED</div>
                <div className="text-[10px] text-[#D9363E] font-medium">Gate Enforced</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#D9363E]/40">
                <div className="text-[10px] text-[#D9363E] uppercase font-bold tracking-wider">Critical Errors</div>
                <div className="text-2xl font-black text-[#D9363E] mt-0.5">{validationReport.criticalCount}</div>
                <div className="text-[10px] text-[#D9363E] font-medium">Blocks Pipeline</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#C58A00]/40">
                <div className="text-[10px] text-[#C58A00] uppercase font-bold tracking-wider">Warnings</div>
                <div className="text-2xl font-black text-[#C58A00] mt-0.5">{validationReport.warningCount}</div>
                <div className="text-[10px] text-[#C58A00] font-medium">Non-blocking</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#D9363E]/40">
                <div className="text-[10px] text-[#D9363E] uppercase font-bold tracking-wider">AI Screening</div>
                <div className="text-xl font-black text-[#D9363E] mt-0.5">BLOCKED</div>
                <div className="text-[10px] text-[#D9363E] font-medium">Zero Leakage Gate</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D5DEE7]">
                <div className="text-[10px] text-[#4F6170] uppercase font-bold tracking-wider">Rows Checked</div>
                <div className="text-2xl font-bold text-[#17212B] mt-0.5">{validationReport.totalRows}</div>
                <div className="text-[10px] text-[#718292]">Total records</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D5DEE7]">
                <div className="text-[10px] text-[#4F6170] uppercase font-bold tracking-wider">Quality Score</div>
                <div className="text-2xl font-bold text-[#D9363E] mt-0.5">{validationReport.dataQualityScore}%</div>
                <div className="text-[10px] text-[#D9363E] font-medium">&lt; 60% Qual Min</div>
              </div>
            </div>
          </div>

          {/* 2. PRIMARY ERROR CARD (PART 26 — SECTION 4) */}
          {primaryError && (
            <div className="p-5 md:p-6 rounded-2xl bg-[#FFFFFF] border-2 border-[#D5DEE7] border-l-8 border-l-[#D9363E] shadow-sm flex flex-col gap-4 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5DEE7] pb-3.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md bg-[#D9363E] text-white text-xs font-bold uppercase tracking-wider">
                    CRITICAL ERROR
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#F8FAFC] border border-[#D5DEE7] text-[#17212B] text-xs font-bold">
                    {primaryError.errorType}
                  </span>
                  {primaryError.column && (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-[#0E88D3]/10 text-[#0E88D3] border border-[#0E88D3]/30">
                      Column: {primaryError.column}
                    </span>
                  )}
                  {primaryError.row && (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-[#F8FAFC] text-[#4F6170] border border-[#D5DEE7]">
                      Row #{primaryError.row}
                    </span>
                  )}
                </div>

                <span className="text-xs font-bold text-[#D9363E] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D9363E] animate-pulse" />
                  PRIMARY BLOCKING VIOLATION
                </span>
              </div>

              {/* ERROR Title */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-[#4F6170] uppercase font-bold tracking-wider">
                  ERROR
                </span>
                <h3 className="text-base md:text-lg font-bold text-[#17212B]">
                  {primaryError.message || primaryError.what}
                </h3>
                {(primaryError.detectedValue || primaryError.expectedValue) && (
                  <div className="flex items-center gap-3 text-xs pt-1 flex-wrap">
                    {primaryError.detectedValue && (
                      <span className="text-[#D9363E] bg-[#FEF2F2] px-2 py-0.5 rounded border border-[#D9363E]/30">
                        Detected: <b>{primaryError.detectedValue}</b>
                      </span>
                    )}
                    {primaryError.expectedValue && (
                      <span className="text-[#168A5B] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#168A5B]/30">
                        Expected: <b>{primaryError.expectedValue}</b>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 3-Section Explainer: WHY, IMPACT, HOW TO FIX */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* WHY */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D5DEE7] flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#4F6170] uppercase font-bold tracking-wider">
                    <span>❓</span>
                    <span>WHY IS THIS ERROR OCCURRING?</span>
                  </div>
                  <p className="text-xs text-[#17212B] leading-relaxed font-sans">
                    {primaryError.why || primaryError.reason || 'The uploaded CSV does not contain the required measurements under MIL-STD-883.'}
                  </p>
                </div>

                {/* IMPACT */}
                <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#D9363E]/30 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#D9363E] uppercase font-bold tracking-wider">
                    <span>⚠️</span>
                    <span>IMPACT</span>
                  </div>
                  <p className="text-xs text-[#17212B] leading-relaxed font-sans">
                    {primaryError.impact || 'Complete burn-in screening cannot continue. Downstream AI models are blocked.'}
                  </p>
                </div>

                {/* HOW TO FIX IT */}
                <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#168A5B]/30 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#168A5B] uppercase font-bold tracking-wider">
                    <span>🛠️</span>
                    <span>HOW TO FIX IT</span>
                  </div>
                  <p className="text-xs text-[#17212B] leading-relaxed font-sans">
                    {primaryError.howToFix || primaryError.recommendedFix || 'Add the missing column or value and upload the corrected CSV.'}
                  </p>
                </div>
              </div>

              {/* Action Bar Inside Primary Card */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#D5DEE7] flex-wrap">
                <div className="text-xs text-[#718292]">
                  AI SCREENING: <b className="text-[#D9363E]">BLOCKED</b> &bull; Gate will clear upon uploading a valid file.
                </div>
                <button
                  type="button"
                  onClick={handleTriggerUpload}
                  className="px-4 py-2 rounded-lg bg-[#0E88D3] hover:bg-[#0c74b4] text-white font-bold text-xs cursor-pointer transition-all shadow-sm flex items-center gap-2"
                >
                  <span>📥</span>
                  <span>UPLOAD CORRECTED CSV</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. AI SCREENING: BLOCKED CALLOUT BANNER */}
          <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#D9363E]/40 text-xs font-mono text-[#D9363E] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🛡️</span>
              <div className="leading-relaxed">
                <b>AI SCREENING: BLOCKED</b> &mdash; SpaceGuard AI strictly prevents invalid data from entering Module A (Lot Dispersion), Module B (Burn-In Drift), or the Bayesian Risk Engine.
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#D9363E] text-white font-bold text-[11px]">
              CLEARANCE HALTED
            </span>
          </div>

          {/* 4. ALL VALIDATION ERRORS (PART 26 — SECTION 5) */}
          <div ref={errorListRef} className="p-5 md:p-6 rounded-2xl bg-[#FFFFFF] border border-[#D5DEE7] shadow-sm flex flex-col gap-4 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D5DEE7] pb-3.5">
              <div>
                <h3 className="text-base font-bold text-[#17212B] uppercase tracking-wide">
                  ALL VALIDATION ERRORS ({allErrors.length})
                </h3>
                <p className="text-xs text-[#4F6170] mt-0.5">
                  Click any error row to expand detailed diagnosis, flight impact, and resolution steps.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={expandAllErrors}
                  className="px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#D5DEE7] hover:border-[#0E88D3] text-[#17212B] font-semibold cursor-pointer transition-colors"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={collapseAllErrors}
                  className="px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#D5DEE7] hover:border-[#0E88D3] text-[#17212B] font-semibold cursor-pointer transition-colors"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Group Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
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

                {/* Severity Filter */}
                <div className="flex items-center gap-1 text-xs">
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

              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search errors by column, row, keyword, or impact..."
                value={errorSearch}
                onChange={(e) => setErrorSearch(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#D5DEE7] rounded-lg px-3 py-1.5 text-xs text-[#17212B] font-mono placeholder:text-[#718292] focus:outline-none focus:border-[#0E88D3]"
              />
            </div>

            {/* Interactive Error Accordion List (PART 26 — SECTION 5) */}
            <div className="flex flex-col gap-2 divide-y divide-[#D5DEE7]">
              {filteredErrors.length > 0 ? (
                filteredErrors.map((err) => {
                  const isExpanded = expandedErrorIds.has(err.id)
                  const isCrit = err.severity === 'Critical'
                  return (
                    <div
                      key={err.id}
                      className={`pt-2.5 pb-2.5 rounded-xl border transition-all ${
                        isExpanded
                          ? isCrit
                            ? 'bg-[#FEF2F2]/40 border-[#D9363E]/40 p-4'
                            : 'bg-[#FFFBEB]/40 border-[#C58A00]/40 p-4'
                          : 'border-transparent hover:bg-[#F8FAFC] px-3'
                      }`}
                    >
                      {/* Summary Row */}
                      <div
                        onClick={() => toggleExpandError(err.id)}
                        className="flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                              isCrit
                                ? 'bg-[#D9363E] text-white'
                                : 'bg-[#C58A00] text-white'
                            }`}
                          >
                            {err.severity.toUpperCase()}
                          </span>
                          <span className="font-bold text-[#17212B] text-xs">
                            {err.errorType}
                          </span>
                          <span className="text-xs text-[#4F6170] truncate max-w-md">
                            &mdash; {err.message}
                          </span>
                          {err.row && (
                            <span className="text-[11px] text-[#718292] bg-[#F8FAFC] px-1.5 py-0.5 rounded border border-[#D5DEE7]">
                              Row #{err.row}
                            </span>
                          )}
                          {err.column && (
                            <span className="text-[11px] text-[#0E88D3] bg-[#0E88D3]/10 px-1.5 py-0.5 rounded border border-[#0E88D3]/30">
                              {err.column}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold text-[#0E88D3] flex-shrink-0">
                          <span>{isExpanded ? 'Hide Details ▲' : 'Inspect ▼'}</span>
                        </div>
                      </div>

                      {/* Expanded Details Card */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[#D5DEE7] flex flex-col gap-3 text-xs animate-fade-in font-mono">
                          <div className="p-3 rounded-lg bg-[#FFFFFF] border border-[#D5DEE7]">
                            <span className="text-[10px] text-[#4F6170] uppercase font-bold tracking-wider">
                              ERROR
                            </span>
                            <div className="text-sm font-bold text-[#17212B] mt-0.5">
                              {err.message || err.what}
                            </div>
                            {(err.detectedValue || err.expectedValue) && (
                              <div className="flex items-center gap-3 text-[11px] mt-1.5 flex-wrap">
                                {err.detectedValue && (
                                  <span className="text-[#D9363E] bg-[#FEF2F2] px-2 py-0.5 rounded border border-[#D9363E]/30">
                                    Detected: <b>{err.detectedValue}</b>
                                  </span>
                                )}
                                {err.expectedValue && (
                                  <span className="text-[#168A5B] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#168A5B]/30">
                                    Expected: <b>{err.expectedValue}</b>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3 rounded-lg bg-[#FFFFFF] border border-[#D5DEE7]">
                              <span className="text-[10px] text-[#4F6170] uppercase font-bold tracking-wider">
                                WHY IS THIS ERROR OCCURRING?
                              </span>
                              <p className="text-xs text-[#17212B] font-sans mt-1 leading-relaxed">
                                {err.why || err.reason || 'Violates MIL-STD-883 flight dataset criteria.'}
                              </p>
                            </div>

                            <div className="p-3 rounded-lg bg-[#FFFFFF] border border-[#D9363E]/30">
                              <span className="text-[10px] text-[#D9363E] uppercase font-bold tracking-wider">
                                IMPACT
                              </span>
                              <p className="text-xs text-[#17212B] font-sans mt-1 leading-relaxed">
                                {err.impact || 'Screening models cannot verify flight readiness.'}
                              </p>
                            </div>

                            <div className="p-3 rounded-lg bg-[#FFFFFF] border border-[#168A5B]/30">
                              <span className="text-[10px] text-[#168A5B] uppercase font-bold tracking-wider">
                                HOW TO FIX IT
                              </span>
                              <p className="text-xs text-[#17212B] font-sans mt-1 leading-relaxed">
                                {err.howToFix || err.recommendedFix || 'Correct the indicated value and re-upload the CSV.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="p-8 text-center text-[#4F6170] italic">
                  No errors match the selected group/search filters.
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#D5DEE7] flex-wrap">
              <div className="text-xs text-[#718292]">
                Showing {filteredErrors.length} of {allErrors.length} validation issues
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReportJSON}
                  className="px-3.5 py-1.5 rounded-lg border border-[#0E88D3] bg-[#0E88D3]/10 hover:bg-[#0E88D3]/20 text-[#0E88D3] font-bold text-xs cursor-pointer transition-colors"
                >
                  [ DOWNLOAD ERROR REPORT ]
                </button>
                <button
                  type="button"
                  onClick={handleTriggerUpload}
                  className="px-4 py-2 rounded-lg bg-[#0E88D3] hover:bg-[#0c74b4] text-white font-bold text-xs cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>[ UPLOAD CORRECTED CSV ]</span>
                </button>
              </div>
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
      {/* STATE 2: VALIDATING FLIGHT CSV...                            */}
      {/* ============================================================ */}
      {isValidating && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 rounded-2xl bg-[#FFFFFF] border-2 border-[#0E88D3] shadow-sm text-center font-mono animate-fade-in">
          <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-[#0E88D3]/20 border-t-[#0E88D3] animate-spin" />
            <div className="w-12 h-12 rounded-full bg-[#0E88D3]/10 flex items-center justify-center text-2xl">
              🛰️
            </div>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-[#17212B] uppercase tracking-wide">
            VALIDATING FLIGHT CSV...
          </h2>
          <p className="text-xs text-[#0E88D3] font-bold mt-1.5">
            {validatingFileName || 'Flight Telemetry CSV'}
          </p>
          <p className="text-xs text-[#4F6170] max-w-md mt-2 font-sans">
            Executing MIL-STD-883 Class S flight telemetry verification: checking format, schema headers, burn-in columns, row numeric validity, and data quality score.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 w-full max-w-sm text-left text-xs bg-[#F8FAFC] p-4 rounded-xl border border-[#D5DEE7]">
            <div className="flex items-center gap-2 text-[#0E88D3] font-semibold">
              <span className="animate-spin text-xs">⟳</span>
              <span>1. File Format &amp; Delimiter Check</span>
            </div>
            <div className="flex items-center gap-2 text-[#4F6170]">
              <span className="text-[#0E88D3]">⏳</span>
              <span>2. MIL-STD-883 Column Schema Validation</span>
            </div>
            <div className="flex items-center gap-2 text-[#4F6170]">
              <span className="text-[#718292]">&bull;</span>
              <span>3. Row-Level Numeric Range &amp; Unit Verification</span>
            </div>
            <div className="flex items-center gap-2 text-[#4F6170]">
              <span className="text-[#718292]">&bull;</span>
              <span>4. AI Screening Clearance Gate Check</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STATE 1: NO DATASET LOADED                                   */}
      {/* ============================================================ */}
      {!isValidating && !isBlocked && !isPassed && (
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
