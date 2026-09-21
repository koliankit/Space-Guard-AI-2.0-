import React, { useState, useRef, useEffect, useMemo } from 'react'
import type { ComponentOut, MissionStatus, UploadResult } from '../../types'
import { downloadSampleCSV, ISRO_MISSIONS, type RawPart } from '../../offlineEngine'
import { sounds } from '../../utils/soundEffects'
import * as api from '../../api'

interface ISROOnboardingFlowProps {
  onFileUploaded: (file: File) => Promise<void>
  onLoadOfficialBatch: (missionId: string) => Promise<void>
  batchId: number | null
  uploadMeta: UploadResult | null
  mission: MissionStatus | null
  allComponents: ComponentOut[]
  flaggedList: ComponentOut[]
  onRunScreening: () => Promise<void>
  onCompleteToDashboard: () => void
  activeMissionName: string
  activeMissionId: string
  onSelectMission: (id: string) => void
}

export type OnboardingStep = 'csv_upload' | 'ai_screening' | 'final_screening'

const SCREENING_STAGES = [
  {
    title: 'DATA STREAM INGESTION & FORMAT VALIDATION',
    detail: 'Acquiring 0h, 24h, 96h, 168h silicon burn-in telemetry per MIL-STD-883 standards',
  },
  {
    title: 'OUTLIER & MISSING VALUE PREPROCESSING',
    detail: 'Imputing missing timepoints and regularizing sensor noise across qualification lots',
  },
  {
    title: 'POLYNOMIAL DRIFT & ARRHENIUS DEGRADATION EXTRACTION',
    detail: 'Fitting Arrhenius thermal acceleration models and parametric curvature rates',
  },
  {
    title: 'LOT-RELATIVE MEDIAN & MAD STATISTICAL ANALYSIS',
    detail: 'Benchmarking lot statistical medians and standard deviations against spaceflight baselines',
  },
  {
    title: 'HIGH-DIMENSIONAL ISOLATION FOREST ANOMALY SCORING',
    detail: 'Evaluating multi-dimensional isolation trees for subtle parametric outliers',
  },
  {
    title: 'SUPERVISED XGBOOST DEFECT CLASSIFIER',
    detail: 'Executing gradient-boosted decision trees for latent silicon micro-defects',
  },
  {
    title: 'BAYESIAN RISK AGGREGATION & CALIBRATION ENGINE',
    detail: 'Fusing evidence layers into calibrated 0-100 flight risk scores',
  },
  {
    title: '3D SPACECRAFT HARDWARE LOCALIZATION',
    detail: 'Mapping identified silicon components to satellite equipment bays and coordinates',
  },
  {
    title: 'DYNAMIC SCREENING VERDICT (SAFE / MONITOR / REJECT)',
    detail: 'Finalizing MIL-STD-883 qualification gates and quarantine directives',
  },
]

export default function ISROOnboardingFlow({
  onFileUploaded,
  onLoadOfficialBatch,
  batchId,
  uploadMeta,
  mission,
  allComponents,
  flaggedList,
  onRunScreening,
  onCompleteToDashboard,
  activeMissionName,
  activeMissionId,
  onSelectMission,
}: ISROOnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('csv_upload')
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // AI Screening state in Window 2
  const [screeningActive, setScreeningActive] = useState(false)
  const [screeningStageIdx, setScreeningStageIdx] = useState(0)
  const [screeningDone, setScreeningDone] = useState(false)
  const [screeningLogs, setScreeningLogs] = useState<string[]>([])

  // Final screening authorization in Window 3
  const [commandAuthorized, setCommandAuthorized] = useState(false)

  // Basic Readings Table pagination/view state
  const [tablePage, setTablePage] = useState(0)
  const ROWS_PER_PAGE = 10

  // Acquire raw parts or fallback to allComponents
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

  // Data Validation Audit metrics
  const validationAudit = useMemo(() => {
    return api.getDataValidationAudit()
  }, [rawParts, batchId, uploadMeta])

  // Summary statistics for Basic Readings
  const telemetrySummary = useMemo(() => {
    if (rawParts.length === 0) {
      return {
        count: 0,
        lotsCount: 0,
        avg0h: 0,
        avg24h: 0,
        avg96h: 0,
        avg168h: 0,
        maxDrift: 0,
        limit: 50,
      }
    }
    const count = rawParts.length
    const lots = new Set(rawParts.map((p) => p.lot_id)).size
    const avg0h = rawParts.reduce((a, b) => a + b.v0, 0) / count
    const avg24h = rawParts.reduce((a, b) => a + b.v24, 0) / count
    const v96s = rawParts.map((p) => (p.v96 != null ? p.v96 : p.v24 + 0.5 * (p.v168 - p.v24)))
    const avg96h = v96s.reduce((a, b) => a + b, 0) / count
    const avg168h = rawParts.reduce((a, b) => a + b.v168, 0) / count
    const maxDrift = Math.max(...rawParts.map((p) => Math.abs(p.v168 - p.v0)))
    const limit = rawParts[0]?.limit_ua || 50

    return {
      count,
      lotsCount: lots,
      avg0h: Number(avg0h.toFixed(2)),
      avg24h: Number(avg24h.toFixed(2)),
      avg96h: Number(avg96h.toFixed(2)),
      avg168h: Number(avg168h.toFixed(2)),
      maxDrift: Number(maxDrift.toFixed(2)),
      limit,
    }
  }, [rawParts])

  // Set screeningDone if mission status already exists
  useEffect(() => {
    if (mission && (mission.safe > 0 || mission.monitor > 0 || mission.reject > 0)) {
      setScreeningDone(true)
    }
  }, [mission])

  async function handleFileInput(file: File) {
    setUploadError(null)
    setUploading(true)
    setUploadedFileName(file.name)
    try {
      sounds.playClick()
      await onFileUploaded(file)
      sounds.playSuccess()
      // Keep on Step 1 so the operator can inspect the Basic Readings in clean format!
    } catch (err: any) {
      sounds.playAlert()
      setUploadError(err?.message || 'Failed to parse CSV file. Please verify schema.')
    } finally {
      setUploading(false)
    }
  }

  async function handleLoadOfficialDemo(mId: string) {
    setUploadError(null)
    setUploading(true)
    setUploadedFileName(`isro_${mId.toLowerCase()}_official_flight_batch.csv`)
    try {
      sounds.playClick()
      onSelectMission(mId)
      await onLoadOfficialBatch(mId)
      sounds.playSuccess()
      // Stays on Step 1 so user can review the basic readings
    } catch (err: any) {
      sounds.playAlert()
      setUploadError(err?.message || 'Failed to load official flight batch.')
    } finally {
      setUploading(false)
    }
  }

  async function handleStartAiScreening() {
    setScreeningActive(true)
    setScreeningStageIdx(0)
    setScreeningDone(false)
    setScreeningLogs(['[SYSTEM] Initializing SpaceGuard AI screening engine - MIL-STD-883 Method 1005'])
    sounds.playPing()

    const stepDuration = 320
    let step = 0
    const interval = setInterval(() => {
      step += 1
      setScreeningStageIdx(step)
      if (step < SCREENING_STAGES.length) {
        setScreeningLogs((prev) => [
          ...prev,
          `[STAGE ${step}] ${SCREENING_STAGES[step].title} ... OK`,
        ])
      } else {
        clearInterval(interval)
        onRunScreening().then(() => {
          setScreeningDone(true)
          setScreeningActive(false)
          sounds.playSuccess()
          setScreeningLogs((prev) => [
            ...prev,
            `[COMPLETED] 100% silicon components analyzed. Risk calibration finalized.`,
          ])
        })
      }
    }, stepDuration)
  }

  function handleFinalLaunch() {
    sounds.playSuccess()
    setCommandAuthorized(true)
    setTimeout(() => {
      onCompleteToDashboard()
    }, 450)
  }

  const worstPart = flaggedList.find((c) => c.status === 'reject') || flaggedList[0] || allComponents[0] || null
  const paginatedParts = rawParts.slice(tablePage * ROWS_PER_PAGE, (tablePage + 1) * ROWS_PER_PAGE)
  const totalPages = Math.ceil(rawParts.length / ROWS_PER_PAGE) || 1

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#17212B] flex flex-col items-center justify-start p-4 md:p-6 font-sans select-none relative">
      {/* Top ISRO Banner & 3-Step Clearance Gate */}
      <div className="w-full max-w-6xl flex flex-col gap-4 mb-5">
        {/* Aerospace Mission Header - Clean & Professional without flashy lighting */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D9E2EA] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFFFFF] border border-[#D9E2EA] flex items-center justify-center font-bold text-amber-400 font-mono text-sm">
              ISRO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-mono font-bold tracking-wider text-[#17212B] uppercase">
                  SPACEGUARD AI
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F8FAFC] text-[#5B6B7A] border border-[#D9E2EA]">
                  MISSION ONBOARDING GATEWAY
                </span>
              </div>
              <p className="text-xs font-mono text-[#5B6B7A]">
                SDSC SHAR / ISTRAC &bull; MIL-STD-883 METHOD 1005 CLASS S SCREENING PIPELINE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs font-mono">
            <div className="bg-[#FFFFFF] border border-[#D9E2EA] px-3 py-1.5 rounded-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#168A5B] animate-gentle-pulse" />
              <span className="text-[#5B6B7A]">SYSTEM OPERATIONAL</span>
            </div>
            <div className="bg-[#FFFFFF] border border-[#D9E2EA] px-3 py-1.5 rounded-md text-[#5B6B7A]">
              MISSION: <span className="text-[#17212B] font-bold">{activeMissionName}</span>
            </div>
            <button
              type="button"
              onClick={onCompleteToDashboard}
              className="bg-[#F8FAFC] hover:bg-[#0E88D3] text-[#17212B] hover:text-[#F4F7FA] border border-[#D9E2EA] hover:border-[#0E88D3] px-3.5 py-1.5 rounded-md font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm ml-2"
              title="Enter Mission Control Dashboard directly"
            >
              <span>ENTER DASHBOARD</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        {/* 3-Section Sequential Gateway Navigation matching User Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Section 1: Dashboard 1 - Upload CSV */}
          <button
            type="button"
            onClick={() => setCurrentStep('csv_upload')}
            className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
              currentStep === 'csv_upload'
                ? 'bg-[#E8F0F6] border-[#0E88D3] text-[#17212B]'
                : uploadMeta || rawParts.length > 0
                ? 'bg-[#FFFFFF] border-[#D5DEE7] hover:border-[#0E88D3] text-[#4F6170]'
                : 'bg-[#FFFFFF] border-[#D5DEE7] opacity-60 text-[#718292]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs ${
                  uploadMeta || rawParts.length > 0
                    ? 'bg-emerald-700 text-white'
                    : currentStep === 'csv_upload'
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-[#F8FAFC] text-[#5B6B7A]'
                }`}
              >
                {uploadMeta || rawParts.length > 0 ? '✓' : '1'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-mono tracking-wider text-[#5B6B7A]">
                  DASHBOARD 1 &bull; INTAKE
                </div>
                <div className="text-sm font-semibold truncate text-[#17212B]">
                  Upload CSV &amp; Basic Readings
                </div>
              </div>
            </div>
          </button>

          {/* Section 2: <2> Execute AI Screening & Data Validation */}
          <button
            type="button"
            onClick={() => {
              if (rawParts.length > 0 || uploadMeta) setCurrentStep('ai_screening')
            }}
            disabled={rawParts.length === 0 && !uploadMeta}
            className={`p-3 rounded-lg border text-left transition-colors ${
              currentStep === 'ai_screening'
                ? 'bg-[#E8F0F6] border-[#0E88D3] text-[#17212B] cursor-pointer'
                : screeningDone || mission
                ? 'bg-[#FFFFFF] border-[#D5DEE7] hover:border-[#0E88D3] text-[#4F6170] cursor-pointer'
                : rawParts.length > 0
                ? 'bg-[#FFFFFF] border-[#D5DEE7] hover:border-[#0E88D3] text-[#4F6170] cursor-pointer'
                : 'bg-[#FFFFFF] border-[#D5DEE7] opacity-50 text-[#718292] cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs ${
                  screeningDone || mission
                    ? 'bg-emerald-700 text-white'
                    : currentStep === 'ai_screening'
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-[#F8FAFC] text-[#5B6B7A]'
                }`}
              >
                {screeningDone || mission ? '✓' : '2'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-mono tracking-wider text-[#5B6B7A]">
                  &lang;2&rang; &bull; VALIDATION &amp; AI
                </div>
                <div className="text-sm font-semibold truncate text-[#17212B]">
                  Execute AI Screening
                </div>
              </div>
            </div>
          </button>

          {/* Section 3: <3> Launch Final Mission */}
          <button
            type="button"
            onClick={() => {
              if (screeningDone || mission) setCurrentStep('final_screening')
            }}
            disabled={!screeningDone && !mission}
            className={`p-3 rounded-lg border text-left transition-colors ${
              currentStep === 'final_screening'
                ? 'bg-[#E8F0F6] border-[#0E88D3] text-[#17212B] cursor-pointer'
                : screeningDone || mission
                ? 'bg-[#FFFFFF] border-[#D5DEE7] hover:border-[#0E88D3] text-[#4F6170] cursor-pointer'
                : 'bg-[#FFFFFF] border-[#D5DEE7] opacity-50 text-[#718292] cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs ${
                  currentStep === 'final_screening'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-[#F8FAFC] text-[#5B6B7A]'
                }`}
              >
                3
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-mono tracking-wider text-[#5B6B7A]">
                  &lang;3&rang; &bull; FINAL EXECUTION
                </div>
                <div className="text-sm font-semibold truncate text-[#17212B]">
                  Launch Final Mission
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WINDOW 1: DASHBOARD 1 - UPLOAD CSV & BASIC READINGS (CLEAN FORMAT)        */}
      {/* ========================================================================= */}
      {currentStep === 'csv_upload' && (
        <div className="w-full max-w-6xl bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl p-5 md:p-7 flex flex-col gap-6">
          {/* Header */}
          <div className="border-b border-[#D9E2EA]/90 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#5B6B7A]">
                DASHBOARD 1 &bull; TELEMETRY INTAKE &amp; BASIC READINGS
              </span>
              <h2 className="text-xl md:text-2xl font-mono font-bold text-[#17212B] mt-1">
                Upload Flight Telemetry CSV
              </h2>
              <p className="text-xs text-[#5B6B7A] mt-1 max-w-2xl">
                Clean, high-precision ingestion for ISRO space-grade microelectronics burn-in telemetry.
                Inspect the basic readings table before proceeding to AI screening and data validation.
              </p>
            </div>

            {rawParts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick()
                  setCurrentStep('ai_screening')
                }}
                className="px-4 py-2.5 rounded-lg bg-slate-200 hover:bg-white text-slate-900 font-mono font-bold text-xs md:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Proceed to Step 2: Execute AI Screening</span>
                <span>&rarr;</span>
              </button>
            )}
          </div>

          {/* Upload Area & Sample Selectors */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Drag & Drop Box (Clean, without lighting effects) */}
            <div
              className={`lg:col-span-2 border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-slate-400 bg-[#F8FAFC]'
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
              <div className="w-12 h-12 rounded-lg bg-[#F8FAFC] border border-[#D9E2EA] flex items-center justify-center text-xl mb-3 text-[#5B6B7A]">
                📄
              </div>
              <div className="text-base font-mono font-bold text-[#17212B]">
                Drag &amp; Drop CSV File or <span className="text-[#5B6B7A] underline underline-offset-2">Browse Files</span>
              </div>
              <p className="text-xs text-[#5B6B7A] mt-1">
                Standard format: <code className="text-[#5B6B7A]">component_id, lot_id, value_0h_ua, value_24h_ua, value_96h_ua, value_168h_ua, static_limit_ua, subsystem</code>
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileInput(e.target.files[0])
                  }
                }}
              />

              {uploading && (
                <div className="mt-3 text-xs font-mono text-[#5B6B7A] bg-[#F8FAFC] px-3 py-1.5 rounded border border-[#D9E2EA]">
                  Parsing and validating CSV schema...
                </div>
              )}

              {uploadedFileName && !uploading && (
                <div className="mt-3 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded border border-emerald-800/60">
                  Active file: {uploadedFileName}
                </div>
              )}
            </div>

            {/* Template & Mission Preset Loaders */}
            <div className="bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl p-4 flex flex-col justify-between gap-3 font-mono text-xs">
              <div>
                <span className="text-[#5B6B7A] font-bold uppercase tracking-wide">
                  Standard ISRO Telemetry Presets
                </span>
                <p className="text-[#81909D] text-[11px] mt-1 font-sans">
                  Quick-load official qualification flight batches or obtain the blank template.
                </p>
              </div>

              <div className="space-y-1.5">
                {ISRO_MISSIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleLoadOfficialDemo(m.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between text-xs ${
                      activeMissionId === m.id
                        ? 'bg-[#E8F0F6] border-[#0E88D3] text-[#17212B] font-bold'
                        : 'bg-[#FFFFFF] border-[#D5DEE7] text-[#4F6170] hover:bg-[#F8FAFC] hover:text-[#17212B]'
                    }`}
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="text-[10px] text-[#5B6B7A] shrink-0 ml-2">[{m.id}]</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => downloadSampleCSV(activeMissionId)}
                className="w-full text-center px-3 py-2 rounded-lg border border-[#D9E2EA] bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[#17212B] transition-colors cursor-pointer text-xs"
              >
                &darr; Download Official CSV Template
              </button>
            </div>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs font-mono flex items-center justify-between">
              <span>Error: {uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-[#5B6B7A] hover:text-[#17212B]"
              >
                ✕
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* BASIC READINGS IN CLEAN FORMAT (NO LIGHTING EFFECTS)              */}
          {/* ================================================================= */}
          <div className="bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl p-4 md:p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9E2EA] pb-3">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#5B6B7A]">
                  Basic Telemetry Readings &amp; Pre-Screening Summary
                </span>
                <p className="text-[11px] text-[#81909D] font-mono mt-0.5">
                  Raw un-interpolated silicon leakage telemetry &bull; MIL-STD-883 HTOL 168h Matrix
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-[#F8FAFC] text-[#5B6B7A] border border-[#D9E2EA]">
                  RAW STATUS: {rawParts.length > 0 ? 'LOADED & UNVALIDATED' : 'AWAITING CSV'}
                </span>
              </div>
            </div>

            {/* Basic Readings Numerical Statistics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 font-mono text-xs">
              <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#D9E2EA]">
                <span className="text-[10px] text-[#81909D] block uppercase">Components</span>
                <span className="text-base font-bold text-[#17212B]">{telemetrySummary.count}</span>
              </div>
              <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#D9E2EA]">
                <span className="text-[10px] text-[#81909D] block uppercase">Lots</span>
                <span className="text-base font-bold text-[#17212B]">{telemetrySummary.lotsCount}</span>
              </div>
              <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#D9E2EA]">
                <span className="text-[10px] text-[#81909D] block uppercase">Mean 0h (µA)</span>
                <span className="text-base font-bold text-[#5B6B7A]">{telemetrySummary.avg0h}</span>
              </div>
              <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#D9E2EA]">
                <span className="text-[10px] text-[#81909D] block uppercase">Mean 24h (µA)</span>
                <span className="text-base font-bold text-[#5B6B7A]">{telemetrySummary.avg24h}</span>
              </div>
              <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#D9E2EA]">
                <span className="text-[10px] text-[#81909D] block uppercase">Mean 96h (µA)</span>
                <span className="text-base font-bold text-[#5B6B7A]">{telemetrySummary.avg96h}</span>
              </div>
              <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#D9E2EA]">
                <span className="text-[10px] text-[#81909D] block uppercase">Mean 168h (µA)</span>
                <span className="text-base font-bold text-[#5B6B7A]">{telemetrySummary.avg168h}</span>
              </div>
              <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#D9E2EA]">
                <span className="text-[10px] text-[#81909D] block uppercase">Datasheet Limit</span>
                <span className="text-base font-bold text-[#5B6B7A]">{telemetrySummary.limit} µA</span>
              </div>
            </div>

            {/* Clean Telemetry Data Table */}
            {rawParts.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="overflow-x-auto rounded-lg border border-[#D9E2EA]">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#FFFFFF] text-[#5B6B7A] border-b border-[#D9E2EA]">
                        <th className="py-2.5 px-3 font-semibold uppercase">#</th>
                        <th className="py-2.5 px-3 font-semibold uppercase">Component ID</th>
                        <th className="py-2.5 px-3 font-semibold uppercase">Subsystem</th>
                        <th className="py-2.5 px-3 font-semibold uppercase">Lot ID</th>
                        <th className="py-2.5 px-3 font-semibold uppercase text-right">0h (µA)</th>
                        <th className="py-2.5 px-3 font-semibold uppercase text-right">24h (µA)</th>
                        <th className="py-2.5 px-3 font-semibold uppercase text-right">96h (µA)</th>
                        <th className="py-2.5 px-3 font-semibold uppercase text-right">168h (µA)</th>
                        <th className="py-2.5 px-3 font-semibold uppercase text-right">Limit (µA)</th>
                        <th className="py-2.5 px-3 font-semibold uppercase text-right">Drift (168-0h)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-[#F4F7FA]">
                      {paginatedParts.map((p, idx) => {
                        const drift = p.v168 - p.v0
                        const isOverLimit = p.v168 > p.limit_ua
                        const isMissing96 = p.v96 == null

                        return (
                          <tr key={p.component_id} className="hover:bg-[#FFFFFF]">
                            <td className="py-2 px-3 text-[#81909D]">
                              {tablePage * ROWS_PER_PAGE + idx + 1}
                            </td>
                            <td className="py-2 px-3 font-bold text-[#17212B]">
                              {p.component_id}
                            </td>
                            <td className="py-2 px-3 text-[#5B6B7A]">
                              <span className="px-1.5 py-0.5 rounded bg-[#F8FAFC] border border-[#D9E2EA] text-[10px]">
                                {p.subsystem}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[#5B6B7A]">
                              {p.lot_id}
                            </td>
                            <td className="py-2 px-3 text-right text-[#5B6B7A]">
                              {p.v0.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right text-[#5B6B7A]">
                              {p.v24.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {isMissing96 ? (
                                <span className="text-amber-400/80 italic text-[11px]" title="Missing in raw CSV - will be imputed in Window 2">
                                  -- (null)
                                </span>
                              ) : (
                                <span className="text-[#5B6B7A]">{p.v96?.toFixed(2)}</span>
                              )}
                            </td>
                            <td className={`py-2 px-3 text-right font-bold ${isOverLimit ? 'text-rose-400' : 'text-[#17212B]'}`}>
                              {p.v168.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right text-[#5B6B7A]">
                              {p.limit_ua.toFixed(1)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              <span className={drift > 5 ? 'text-amber-400' : 'text-[#5B6B7A]'}>
                                {drift >= 0 ? `+${drift.toFixed(2)}` : drift.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination Controls */}
                <div className="flex items-center justify-between text-xs font-mono text-[#5B6B7A] pt-1">
                  <span>
                    Showing {tablePage * ROWS_PER_PAGE + 1} to{' '}
                    {Math.min((tablePage + 1) * ROWS_PER_PAGE, rawParts.length)} of {rawParts.length} components
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                      disabled={tablePage === 0}
                      className="px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#D9E2EA] text-[#5B6B7A] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      &larr; Prev
                    </button>
                    <span>
                      Page {tablePage + 1} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={tablePage >= totalPages - 1}
                      className="px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#D9E2EA] text-[#5B6B7A] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs font-mono text-[#5B6B7A] border border-dashed border-[#D9E2EA] rounded-lg">
                No telemetry CSV loaded. Drag and drop a file or click one of the official flight batches above to populate basic readings.
              </div>
            )}
          </div>

          {/* Bottom Navigation */}
          {rawParts.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-[#D9E2EA]">
              <span className="text-xs font-mono text-[#5B6B7A]">
                {rawParts.length} components ready for Section 2 (Data Validation &amp; AI Screening).
              </span>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick()
                  setCurrentStep('ai_screening')
                }}
                className="px-5 py-2.5 rounded-lg bg-slate-200 hover:bg-white text-slate-900 font-mono font-bold text-xs md:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Proceed to Step 2: Execute AI Screening &amp; Data Validation</span>
                <span>&rarr;</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* WINDOW 2: <2> EXECUTE AI SCREENING & DATA VALIDATION/CLEANING            */}
      {/* ========================================================================= */}
      {currentStep === 'ai_screening' && (
        <div className="w-full max-w-6xl bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl p-5 md:p-7 flex flex-col gap-6">
          {/* Header */}
          <div className="border-b border-[#D9E2EA]/90 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#5B6B7A]">
                &lang;2&rang; &bull; DATA VALIDATION, AUTOMATED CLEANING &amp; AI SCREENING
              </span>
              <h2 className="text-xl md:text-2xl font-mono font-bold text-[#17212B] mt-1">
                Data Validation &amp; Execute AI Screening
              </h2>
              <p className="text-xs text-[#5B6B7A] mt-1 max-w-2xl">
                The telemetry dataset is audited for data cleanliness. Our automated preprocessing cleans the
                data, imputes missing intervals, and optimizes the dataset prior to running the AI screening models.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                setCurrentStep('csv_upload')
              }}
              className="text-xs font-mono text-[#5B6B7A] hover:text-[#17212B] px-3 py-1.5 rounded border border-[#D9E2EA] hover:border-[#D9E2EA] transition-colors"
            >
              &larr; Back to Step 1 (Upload CSV)
            </button>
          </div>

          {/* SECTION A: DATA VALIDATION & AUTOMATED CLEANING REPORT */}
          <div className="bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9E2EA]/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#17212B]">
                  Data Quality Audit &amp; Automated Cleaning Engine
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded">
                STATUS: DATA CLEANED &amp; VALIDATED
              </span>
            </div>

            {/* Quality Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 bg-[#FFFFFF] border border-[#D9E2EA] rounded-lg">
                <span className="text-[10px] text-[#81909D] uppercase block">Raw Telemetry Quality</span>
                <span className="text-lg font-bold text-amber-400">{validationAudit.rawQualityScore}%</span>
                <span className="text-[10px] text-[#5B6B7A] block mt-0.5">Unvalidated / Noise Present</span>
              </div>

              <div className="p-3 bg-[#FFFFFF] border border-[#D9E2EA] rounded-lg">
                <span className="text-[10px] text-[#81909D] uppercase block">Cleaned Data Quality</span>
                <span className="text-lg font-bold text-emerald-400">{validationAudit.cleanedQualityScore}%</span>
                <span className="text-[10px] text-[#5B6B7A] block mt-0.5">MIL-STD-883 Compliant</span>
              </div>

              <div className="p-3 bg-[#FFFFFF] border border-[#D9E2EA] rounded-lg">
                <span className="text-[10px] text-[#81909D] uppercase block">Missing Values Imputed</span>
                <span className="text-lg font-bold text-[#17212B]">
                  {validationAudit.missing96hCount > 0 ? `${validationAudit.missing96hCount} Points` : '0 (Nominal)'}
                </span>
                <span className="text-[10px] text-[#5B6B7A] block mt-0.5">Lot-median interpolation</span>
              </div>

              <div className="p-3 bg-[#FFFFFF] border border-[#D9E2EA] rounded-lg">
                <span className="text-[10px] text-[#81909D] uppercase block">Qualified Batch Size</span>
                <span className="text-lg font-bold text-[#17212B]">{rawParts.length} Parts</span>
                <span className="text-[10px] text-[#5B6B7A] block mt-0.5">Across {telemetrySummary.lotsCount} lots</span>
              </div>
            </div>

            {/* Detailed Cleaning & Process Improvement Actions */}
            <div className="bg-[#FFFFFF] border border-[#D9E2EA] rounded-lg p-3.5 flex flex-col gap-2 font-mono text-xs">
              <span className="text-[#5B6B7A] font-bold uppercase text-[11px]">
                Automated Cleaning Operations Applied:
              </span>
              <div className="space-y-1.5 text-[#5B6B7A] text-[11px]">
                {validationAudit.cleaningActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 font-bold">✓</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION B: EXECUTE AI SCREENING */}
          <div className="bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9E2EA]/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-slate-200" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#17212B]">
                  AI Reliability &amp; Defect Screening Engine
                </span>
              </div>

              <span className="text-[11px] font-mono text-[#5B6B7A]">
                {screeningDone ? 'STATUS: INFERENCE COMPLETED' : screeningActive ? 'STATUS: RUNNING INFERENCE...' : 'STATUS: READY TO EXECUTE'}
              </span>
            </div>

            {/* Primary Action Button: EXECUTE AI SCREENING */}
            {!screeningActive && !screeningDone && (
              <div className="flex flex-col items-center justify-center p-6 md:p-8 bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl gap-3 text-center">
                <div className="text-base font-mono font-bold text-[#17212B]">
                  Data Cleaned &bull; Ready to Execute AI Screening
                </div>
                <p className="text-xs text-[#5B6B7A] max-w-lg">
                  Executes Arrhenius thermal modeling, Lot-Relative MAD statistics, Multivariate Isolation Forest,
                  and Supervised XGBoost defect classification across all {rawParts.length} silicon components.
                </p>

                <button
                  type="button"
                  onClick={handleStartAiScreening}
                  className="mt-2 px-6 py-3 rounded-lg bg-slate-200 hover:bg-white text-slate-900 font-mono font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>▶</span>
                  <span>EXECUTE AI SCREENING</span>
                </button>
              </div>
            )}

            {/* Real-time Execution Stages */}
            {(screeningActive || screeningDone) && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#5B6B7A]">
                    SCREENING PIPELINE: {Math.min(100, Math.round(((screeningStageIdx + 1) / SCREENING_STAGES.length) * 100))}%
                  </span>
                  <span className="text-[#17212B] font-bold">
                    {screeningDone ? 'INFERENCE COMPLETED' : 'CALIBRATING SILICON RISK MODELS...'}
                  </span>
                </div>

                <div className="w-full bg-[#FFFFFF] rounded h-1.5 overflow-hidden border border-[#D9E2EA]">
                  <div
                    className="bg-slate-200 h-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round(((screeningStageIdx + 1) / SCREENING_STAGES.length) * 100))}%`,
                    }}
                  />
                </div>

                {/* Stage checklist */}
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 font-mono text-xs">
                  {SCREENING_STAGES.map((stg, i) => {
                    const isDone = i < screeningStageIdx || screeningDone
                    const isCur = i === screeningStageIdx && !screeningDone

                    return (
                      <div
                        key={stg.title}
                        className={`flex items-start gap-2.5 p-2 rounded border text-[11px] ${
                          isCur
                            ? 'bg-[#E8F0F6] border-[#0E88D3] text-[#17212B] font-bold'
                            : isDone
                            ? 'bg-[#FFFFFF] border-[#D5DEE7] text-[#168A5B]'
                            : 'bg-transparent border-transparent opacity-40 text-[#718292]'
                        }`}
                      >
                        <span className="mt-0.5 shrink-0 font-bold">
                          {isDone ? '✓' : isCur ? '▶' : '○'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{stg.title}</span>
                            <span className="text-[10px]">{isDone ? 'DONE' : isCur ? 'PROCESSING...' : 'QUEUED'}</span>
                          </div>
                          <p className="text-[10px] text-[#5B6B7A] font-sans">{stg.detail}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Post-Screening Results Summary */}
                {screeningDone && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-1">
                      <span className="text-[10px] font-mono uppercase text-emerald-400">Flight Cleared (Safe)</span>
                      <span className="text-xl font-mono font-bold text-[#17212B]">
                        {mission?.safe ?? allComponents.filter((c) => c.status === 'safe').length} Parts
                      </span>
                      <span className="text-[10px] text-[#5B6B7A]">Within drift envelopes</span>
                    </div>

                    <div className="p-3 rounded bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-1">
                      <span className="text-[10px] font-mono uppercase text-amber-400">Observation (Monitor)</span>
                      <span className="text-xl font-mono font-bold text-[#17212B]">
                        {mission?.monitor ?? allComponents.filter((c) => c.status === 'monitor').length} Parts
                      </span>
                      <span className="text-[10px] text-[#5B6B7A]">Periodic polling required</span>
                    </div>

                    <div className="p-3 rounded bg-[#FFFFFF] border border-[#D9E2EA] flex flex-col gap-1">
                      <span className="text-[10px] font-mono uppercase text-rose-400">Quarantine (Reject)</span>
                      <span className="text-xl font-mono font-bold text-[#17212B]">
                        {mission?.reject ?? allComponents.filter((c) => c.status === 'reject').length} Parts
                      </span>
                      <span className="text-[10px] text-[#5B6B7A]">Directives generated</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between pt-2 border-t border-[#D9E2EA]">
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                setCurrentStep('csv_upload')
              }}
              className="px-4 py-2 rounded border border-[#D9E2EA] text-[#5B6B7A] hover:text-[#17212B] hover:border-[#D9E2EA] font-mono text-xs"
            >
              &larr; Re-inspect Basic Readings (Step 1)
            </button>

            {screeningDone && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick()
                  setCurrentStep('final_screening')
                }}
                className="px-5 py-2.5 rounded-lg bg-slate-200 hover:bg-white text-slate-900 font-mono font-bold text-xs md:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Proceed to Step 3: Launch Final Mission</span>
                <span>&rarr;</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WINDOW 3: <3> LAUNCH FINAL MISSION (FINAL EXECUTION)                      */}
      {/* ========================================================================= */}
      {currentStep === 'final_screening' && (
        <div className="w-full max-w-6xl bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl p-5 md:p-7 flex flex-col gap-6">
          {/* Header */}
          <div className="border-b border-[#D9E2EA]/90 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#5B6B7A]">
                &lang;3&rang; &bull; MISSION CLEARANCE &amp; FINAL EXECUTION
              </span>
              <h2 className="text-xl md:text-2xl font-mono font-bold text-[#17212B] mt-1">
                Launch Final Mission
              </h2>
              <p className="text-xs text-[#5B6B7A] mt-1 max-w-2xl">
                Review the finalized AI screening verdict, verify spacecraft subsystem integrity, and issue
                the final execution command to unlock the live Mission Control Dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                setCurrentStep('ai_screening')
              }}
              className="text-xs font-mono text-[#5B6B7A] hover:text-[#17212B] px-3 py-1.5 rounded border border-[#D9E2EA] hover:border-[#D9E2EA] transition-colors"
            >
              &larr; Back to AI Screening (Step 2)
            </button>
          </div>

          {/* Mission Clearance Overview Card */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl p-4 font-mono text-xs">
            <div>
              <span className="text-[#81909D] text-[10px] uppercase block">Designated Spacecraft</span>
              <span className="text-sm font-bold text-[#17212B]">{activeMissionName}</span>
            </div>
            <div>
              <span className="text-[#81909D] text-[10px] uppercase block">Operational Orbit</span>
              <span className="text-sm font-bold text-[#5B6B7A]">
                {ISRO_MISSIONS.find((m) => m.id === activeMissionId)?.targetOrbit || 'LEO 400 km'}
              </span>
            </div>
            <div>
              <span className="text-[#81909D] text-[10px] uppercase block">Total Screened Units</span>
              <span className="text-sm font-bold text-emerald-400">{allComponents.length || rawParts.length} Components</span>
            </div>
            <div>
              <span className="text-[#81909D] text-[10px] uppercase block">Clearance Status</span>
              <span className="text-sm font-bold text-amber-400">FLIGHT ENDORSED</span>
            </div>
          </div>

          {/* Top Flagged Quarantine Alert Directive (if reject component found) */}
          {worstPart && worstPart.status === 'reject' && (
            <div className="bg-rose-950/30 border border-rose-800/80 rounded-xl p-4 flex flex-col gap-2 font-mono text-xs">
              <div className="flex items-center gap-2 text-rose-300 font-bold uppercase">
                <span>⚠️</span>
                <span>CRITICAL QUARANTINE DIRECTIVE GENERATED:</span>
              </div>
              <p className="text-[#5B6B7A] font-sans text-xs leading-relaxed">
                Component <b className="text-[#17212B] font-mono">{worstPart.component_id}</b> in{' '}
                <b className="text-[#17212B] font-mono">[{worstPart.subsystem}] {worstPart.subsystem_name}</b> exhibits a calibrated risk score of{' '}
                <b className="text-rose-400 font-mono">{worstPart.risk_score}/100</b> with anomalous drift of{' '}
                <b className="text-[#17212B] font-mono">{worstPart.v168.toFixed(1)} &micro;A</b>.
                Ground safety directive: Isolate and replace before flight bus countdown.
              </p>
            </div>
          )}

          {/* Endorsement Seal */}
          <div className="bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
            <div>
              <div className="text-[#17212B] font-bold">ISRO RELIABILITY &amp; FLIGHT ASSURANCE DIVISION</div>
              <div className="text-[#5B6B7A] text-[11px]">
                STANDARD: MIL-STD-883 CLASS S &bull; ISTRAC / SDSC SHAR OPERATIONS
              </div>
            </div>
            <div className="text-right text-[11px] text-[#5B6B7A]">
              <div>CHECKSUM: <span className="text-[#17212B]">SHA256:7F9A3B...C48E</span></div>
              <div>TIMESTAMP: <span className="text-[#17212B]">{new Date().toISOString().slice(0, 19)}Z</span></div>
            </div>
          </div>

          {/* Operational Command Console & Final Launch Button */}
          <div className="bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl p-5 flex flex-col gap-3 font-mono">
            <div className="text-xs text-[#5B6B7A]">
              TERMINAL EXECUTION COMMAND:
            </div>
            <div className="bg-black/50 border border-[#D9E2EA] rounded p-3 text-xs text-[#5B6B7A] flex items-center justify-between">
              <code>$ isro-spaceguard-ai --authorize-flight-clearance --launch-mission-control</code>
              <span className="text-emerald-400 font-bold">[READY FOR LAUNCH]</span>
            </div>

            <button
              type="button"
              onClick={handleFinalLaunch}
              disabled={commandAuthorized}
              className="mt-2 w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-black text-base md:text-lg transition-colors flex items-center justify-center gap-3 cursor-pointer shadow-sm uppercase tracking-wider"
            >
              <span>🚀</span>
              <span>
                {commandAuthorized
                  ? 'LAUNCH CLEARANCE CONFIRMED • OPENING MISSION CONTROL...'
                  : 'LAUNCH FINAL MISSION'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
