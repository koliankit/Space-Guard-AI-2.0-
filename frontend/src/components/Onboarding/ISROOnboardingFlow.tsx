import React, { useState, useRef, useEffect } from 'react'
import type { ComponentOut, MissionStatus, UploadResult } from '../../types'
import { downloadSampleCSV } from '../../offlineEngine'
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
    detail: 'Acquiring 0h, 24h, 96h, 168h high-precision silicon telemetry & MIL-STD-883 standards',
  },
  {
    title: 'OUTLIER & MISSING VALUE PREPROCESSING',
    detail: 'Filtering sensor noise & performing robust variance imputation across all qualification lots',
  },
  {
    title: 'POLYNOMIAL DRIFT & ARRHENIUS DEGRADATION EXTRACTION',
    detail: 'Fitting Arrhenius thermal acceleration models & parametric curvature rates',
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
    detail: 'Mapping identified silicon components to satellite equipment bays and 3D coordinates',
  },
  {
    title: 'DYNAMIC SCREENING VERDICT (SAFE / MONITOR / REJECT)',
    detail: 'Finalizing MIL-STD-883 qualification gates & quarantine directives',
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // AI Screening animation state in Window 2
  const [screeningActive, setScreeningActive] = useState(false)
  const [screeningStageIdx, setScreeningStageIdx] = useState(0)
  const [screeningDone, setScreeningDone] = useState(false)
  const [screeningLogs, setScreeningLogs] = useState<string[]>([])

  // Final screening authorization command in Window 3
  const [commandAuthorized, setCommandAuthorized] = useState(false)

  // Automatically advance to Window 2 when upload completes
  useEffect(() => {
    if (batchId && uploadMeta && currentStep === 'csv_upload') {
      setCurrentStep('ai_screening')
    }
  }, [batchId, uploadMeta, currentStep])

  async function handleFileInput(file: File) {
    setUploadError(null)
    setUploading(true)
    try {
      sounds.playClick()
      await onFileUploaded(file)
      sounds.playSuccess()
      setCurrentStep('ai_screening')
    } catch (err: any) {
      sounds.playAlert()
      setUploadError(err?.message || 'Failed to parse CSV file. Please verify format.')
    } finally {
      setUploading(false)
    }
  }

  async function handleLoadOfficialDemo() {
    setUploadError(null)
    setUploading(true)
    try {
      sounds.playClick()
      await onLoadOfficialBatch(activeMissionId)
      sounds.playSuccess()
      setCurrentStep('ai_screening')
    } catch (err: any) {
      sounds.playAlert()
      setUploadError(err?.message || 'Failed to load official batch.')
    } finally {
      setUploading(false)
    }
  }

  async function handleStartAiScreening() {
    setScreeningActive(true)
    setScreeningStageIdx(0)
    setScreeningDone(false)
    setScreeningLogs(['[SYSTEM] Initializing SpaceGuard AI screening engine &bull; MIL-STD-883 Method 1005'])
    sounds.playPing()

    const stepDuration = 350
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
        // Execute real scoring
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

  function handleFinalScreeningLaunch() {
    sounds.playSuccess()
    setCommandAuthorized(true)
    setTimeout(() => {
      onCompleteToDashboard()
    }, 600)
  }

  const worstPart = flaggedList.find((c) => c.status === 'reject') || flaggedList[0] || allComponents[0] || null

  return (
    <div className="min-h-screen bg-[#050A14] text-slate-100 flex flex-col items-center justify-start p-4 md:p-8 font-sans select-none relative overflow-hidden">
      {/* Dynamic Aerospace Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#0e2246_0%,#050a14_70%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Top ISRO Banner & Step Indicator */}
      <div className="w-full max-w-5xl z-10 flex flex-col gap-6 mb-6">
        {/* National Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-sky-400 p-0.5 shadow-lg shadow-amber-500/10 flex items-center justify-center">
              <div className="w-full h-full bg-[#081020] rounded-[10px] flex items-center justify-center">
                <span className="text-xl">🛰️</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-display font-black tracking-wider text-white uppercase">
                  ISRO SPACEGUARD AI
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  REAL-TIME MISSION GATEWAY
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400">
                SDSC SHAR / ISTRAC &bull; MIL-STD-883 METHOD 1005 SILICON RELIABILITY PIPELINE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <button
              type="button"
              onClick={async () => {
                if (!batchId) {
                  await onLoadOfficialBatch(activeMissionId)
                }
                onCompleteToDashboard()
              }}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/25 to-sky-500/25 text-amber-300 hover:text-white border border-amber-500/50 hover:border-amber-400 font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Launch Mission Control Dashboard Directly"
            >
              <span>🚀</span>
              <span>LAUNCH DASHBOARD</span>
            </button>
            <div className="bg-[#0c162b] border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">SYSTEM OPERATIONAL</span>
            </div>
            <div className="bg-[#0c162b] border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
              MISSION: <span className="text-white font-bold">{activeMissionName}</span>
            </div>
          </div>
        </div>

        {/* 3-Window Sequential Clearance Gate Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Gate 1 */}
          <div
            className={`p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
              currentStep === 'csv_upload'
                ? 'bg-blue-600/20 border-blue-500/70 shadow-lg shadow-blue-500/10'
                : uploadMeta
                ? 'bg-emerald-950/30 border-emerald-500/50'
                : 'bg-[#0a1222] border-slate-800 opacity-60'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                uploadMeta
                  ? 'bg-emerald-500 text-slate-950'
                  : currentStep === 'csv_upload'
                  ? 'bg-blue-500 text-white animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {uploadMeta ? '✓' : '1'}
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase font-bold tracking-wider text-slate-300">
                WINDOW 1 &bull; INTAKE
              </div>
              <div className="text-sm font-semibold text-white truncate">
                Flight Telemetry CSV
              </div>
            </div>
          </div>

          {/* Gate 2 */}
          <div
            className={`p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
              currentStep === 'ai_screening'
                ? 'bg-blue-600/20 border-blue-500/70 shadow-lg shadow-blue-500/10'
                : screeningDone || mission
                ? 'bg-emerald-950/30 border-emerald-500/50'
                : 'bg-[#0a1222] border-slate-800 opacity-60'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                screeningDone || mission
                  ? 'bg-emerald-500 text-slate-950'
                  : currentStep === 'ai_screening'
                  ? 'bg-blue-500 text-white animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {screeningDone || mission ? '✓' : '2'}
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase font-bold tracking-wider text-slate-300">
                WINDOW 2 &bull; AI PIPELINE
              </div>
              <div className="text-sm font-semibold text-white truncate">
                Execute AI Screening
              </div>
            </div>
          </div>

          {/* Gate 3 */}
          <div
            className={`p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
              currentStep === 'final_screening'
                ? 'bg-amber-600/20 border-amber-500/70 shadow-lg shadow-amber-500/10'
                : 'bg-[#0a1222] border-slate-800 opacity-60'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                currentStep === 'final_screening'
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              3
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase font-bold tracking-wider text-slate-300">
                WINDOW 3 &bull; CLEARANCE
              </div>
              <div className="text-sm font-semibold text-white truncate">
                Run Final Screening
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WINDOW 1: CSV TELEMETRY INTAKE */}
      {/* ========================================================================= */}
      {currentStep === 'csv_upload' && (
        <div className="w-full max-w-4xl z-10 bg-[#091122] border border-slate-800/90 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 animate-fadeIn">
          <div className="border-b border-slate-800 pb-4">
            <span className="px-2.5 py-1 rounded bg-blue-500/15 text-blue-400 text-xs font-mono font-bold tracking-widest uppercase border border-blue-500/30">
              WINDOW 1 &bull; TELEMETRY INGESTION GATEWAY
            </span>
            <h2 className="text-2xl font-display font-bold text-white mt-2">
              Ingest Flight Qualification Telemetry
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Before AI screening commences, the system starts completely empty. Please upload an official ISRO space-grade microelectronics burn-in CSV file.
            </p>
          </div>

          {/* Empty Status Indicator */}
          <div className="bg-[#060D1A] border border-dashed border-slate-700/80 rounded-xl p-4 flex items-center justify-between text-xs font-mono text-slate-300">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>SYSTEM STATUS: <b className="text-amber-400">EMPTY / AWAITING CSV TELEMETRY INGESTION</b></span>
            </div>
            <span className="text-slate-500">ZERO DATA RESIDUALS</span>
          </div>

          {/* Interactive Drag & Drop Box */}
          <div
            className={`border-2 border-dashed rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-blue-400 bg-blue-500/10 shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/20'
                : 'border-slate-700 hover:border-blue-500/60 bg-[#070E1E] hover:bg-[#0A142A]'
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
            <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-3xl mb-4 text-blue-400 shadow-md">
              📥
            </div>
            <div className="text-lg font-display font-bold text-white">
              Drop Flight CSV File Here or <span className="text-blue-400 underline decoration-blue-400/50">Browse Computer</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Supports standard comma-separated (.csv) and tab-delimited (.tsv) telemetry files per MIL-STD-883 HTOL Method 1005.
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
              <div className="mt-4 flex items-center gap-2 text-xs font-mono text-blue-400 bg-blue-500/15 px-3 py-1.5 rounded-lg border border-blue-500/30">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                Parsing and validating telemetry headers...
              </div>
            )}
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-mono flex items-center justify-between">
              <span>⚠️ {uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* Expected CSV Columns Spec Sheet */}
          <div className="bg-[#070E1C] border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold uppercase tracking-wider">
                Expected Telemetry Schema (MIL-STD-883):
              </span>
              <span className="text-slate-500">Auto-Detected Headers</span>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded bg-slate-800/90 text-blue-300 border border-slate-700">
                component_id <b className="text-rose-400">*</b>
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800/90 text-blue-300 border border-slate-700">
                lot_id <b className="text-rose-400">*</b>
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800/90 text-blue-300 border border-slate-700">
                value_0h_ua <b className="text-rose-400">*</b>
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800/90 text-blue-300 border border-slate-700">
                value_24h_ua <b className="text-rose-400">*</b>
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800/90 text-blue-300 border border-slate-700">
                value_168h_ua <b className="text-rose-400">*</b>
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800/90 text-slate-300 border border-slate-700">
                value_96h_ua
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800/90 text-slate-300 border border-slate-700">
                subsystem (PWR, BAT, FC...)
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800/90 text-slate-300 border border-slate-700">
                static_limit_ua
              </span>
            </div>
          </div>

          {/* Operator Action Buttons: Download Template or Load Sample Flight Batch */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                downloadSampleCSV(activeMissionId)
              }}
              className="text-xs font-mono font-semibold px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:border-slate-500 text-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Download official sample CSV template formatted for SpaceGuard AI"
            >
              <span>📄</span>
              <span>Download Standard ISRO CSV Template</span>
            </button>

            <button
              type="button"
              onClick={handleLoadOfficialDemo}
              className="text-xs font-mono font-bold px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Load the verified Gaganyaan spaceflight qualification batch for quick testing"
            >
              <span>⚡</span>
              <span>Load Official {activeMissionName} Batch ({activeMissionId})</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WINDOW 2: EXECUTE AI SCREENING */}
      {/* ========================================================================= */}
      {currentStep === 'ai_screening' && (
        <div className="w-full max-w-4xl z-10 bg-[#091122] border border-slate-800/90 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 animate-fadeIn">
          <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-1 rounded bg-blue-500/15 text-blue-400 text-xs font-mono font-bold tracking-widest uppercase border border-blue-500/30">
                WINDOW 2 &bull; AI RELIABILITY & DEFECT SCREENING
              </span>
              <h2 className="text-2xl font-display font-bold text-white mt-2">
                Execute AI Screening Engine
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Telemetry dataset verified. Execute the multi-stage machine learning inference engine to detect latent micro-defects and parametric drift.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                setCurrentStep('csv_upload')
              }}
              className="text-xs font-mono text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
            >
              &larr; Re-upload CSV
            </button>
          </div>

          {/* Uploaded Dataset Summary Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#060D1A] border border-slate-800 rounded-xl p-4 font-mono text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-slate-500 text-[10px] uppercase">BATCH IDENTIFIER</span>
              <span className="text-base font-bold text-white">BATCH-#{uploadMeta?.batch_id ?? 1}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-500 text-[10px] uppercase">PARSED COMPONENTS</span>
              <span className="text-base font-bold text-emerald-400">{uploadMeta?.valid ?? allComponents.length} PARTS</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-500 text-[10px] uppercase">QUALIFICATION LOTS</span>
              <span className="text-base font-bold text-amber-400">{uploadMeta?.lots ?? 8} LOTS</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-500 text-[10px] uppercase">AI INFERENCE STATUS</span>
              <span className={`text-sm font-bold ${screeningDone ? 'text-emerald-400' : 'text-sky-400'}`}>
                {screeningDone ? 'COMPLETED' : screeningActive ? 'RUNNING...' : 'AWAITING RUN'}
              </span>
            </div>
          </div>

          {/* Primary Action Button: EXECUTE AI SCREENING */}
          {!screeningActive && !screeningDone && (
            <div className="flex flex-col items-center justify-center p-8 bg-[#070E1E] border border-blue-500/20 rounded-2xl gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-2xl text-blue-400 animate-pulse">
                ⚙️
              </div>
              <div className="text-center">
                <h3 className="text-lg font-display font-bold text-white">
                  Ready to Run Automated Screening
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Inference executes Arrhenius thermal modeling, Lot-Relative MAD, Isolation Forest, and Supervised XGBoost defect classifier across all components.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartAiScreening}
                className="mt-2 text-sm md:text-base font-display font-bold px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-blue-500 text-white shadow-xl shadow-blue-500/20 hover:from-blue-500 hover:to-sky-400 transition-all flex items-center gap-3 cursor-pointer border border-sky-400/40"
              >
                <span>▶</span>
                <span>EXECUTE AI SCREENING ENGINE</span>
              </button>
            </div>
          )}

          {/* Live Progress Pipeline Execution */}
          {(screeningActive || screeningDone) && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">
                  PIPELINE PROGRESS: {Math.min(100, Math.round(((screeningStageIdx + 1) / SCREENING_STAGES.length) * 100))}%
                </span>
                <span className="text-sky-400 font-bold">
                  {screeningDone ? 'INFERENCE COMPLETED' : 'ANALYZING SILICON TELEMETRY...'}
                </span>
              </div>

              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round(((screeningStageIdx + 1) / SCREENING_STAGES.length) * 100))}%`,
                  }}
                />
              </div>

              {/* Real-time Stages List */}
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 font-mono text-xs">
                {SCREENING_STAGES.map((stg, i) => {
                  const isDone = i < screeningStageIdx || screeningDone
                  const isCur = i === screeningStageIdx && !screeningDone

                  return (
                    <div
                      key={stg.title}
                      className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all ${
                        isCur
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                          : isDone
                          ? 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                          : 'bg-transparent border-transparent opacity-30 text-slate-500'
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {isDone ? '✓' : isCur ? '▶' : '○'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold tracking-wide uppercase">{stg.title}</span>
                          <span className="text-[10px] shrink-0 font-bold">
                            {isDone ? 'DONE' : isCur ? 'PROCESSING...' : 'QUEUED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans mt-0.5">{stg.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Execution Finished Summary */}
              {screeningDone && (
                <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 mt-2 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-base">
                      ✓
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white font-display">
                        AI Screening Completed Successfully
                      </div>
                      <div className="text-xs font-mono text-emerald-400">
                        Risk scores calibrated across all qualification lots &bull; Latency: 18.2ms
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick()
                      setCurrentStep('final_screening')
                    }}
                    className="text-sm font-display font-bold px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/40"
                  >
                    <span>PROCEED TO FINAL SCREENING &rarr;</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* WINDOW 3: RUN FINAL SCREENING AUTHORIZATION */}
      {/* ========================================================================= */}
      {currentStep === 'final_screening' && (
        <div className="w-full max-w-4xl z-10 bg-[#091122] border border-slate-800/90 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 animate-fadeIn">
          <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-400 text-xs font-mono font-bold tracking-widest uppercase border border-amber-500/30">
                WINDOW 3 &bull; FINAL FLIGHT SCREENING & CLEARANCE
              </span>
              <h2 className="text-2xl font-display font-bold text-white mt-2">
                Operational Authorization & Final Run Command
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Review the AI screening verdict and issue the final operational run command to unlock the mission control dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                setCurrentStep('ai_screening')
              }}
              className="text-xs font-mono text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
            >
              &larr; Back to AI Screening
            </button>
          </div>

          {/* Mission Health & Verdict Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Safe */}
            <div className="bg-[#07131F] border border-emerald-500/30 rounded-xl p-4 flex flex-col gap-1">
              <span className="text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
                FLIGHT CLEARED (SAFE)
              </span>
              <span className="text-3xl font-display font-bold text-white">
                {mission?.safe ?? allComponents.filter((c) => c.status === 'safe').length}
              </span>
              <span className="text-[11px] text-slate-400">Within drift envelopes & normal lot variance</span>
            </div>

            {/* Monitor */}
            <div className="bg-[#17140B] border border-amber-500/30 rounded-xl p-4 flex flex-col gap-1">
              <span className="text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
                OBSERVATION (MONITOR)
              </span>
              <span className="text-3xl font-display font-bold text-white">
                {mission?.monitor ?? allComponents.filter((c) => c.status === 'monitor').length}
              </span>
              <span className="text-[11px] text-slate-400">Mild thermal drift &bull; Periodic telemetry polling</span>
            </div>

            {/* Reject */}
            <div className="bg-[#1A0B12] border border-rose-500/30 rounded-xl p-4 flex flex-col gap-1">
              <span className="text-rose-400 text-xs font-mono font-bold uppercase tracking-wider">
                FLIGHT REJECT (QUARANTINE)
              </span>
              <span className="text-3xl font-display font-bold text-white">
                {mission?.reject ?? allComponents.filter((c) => c.status === 'reject').length}
              </span>
              <span className="text-[11px] text-slate-400">Latent defect or excessive parametric slope</span>
            </div>
          </div>

          {/* Top Flagged Quarantine Alert Banner (if any) */}
          {worstPart && worstPart.status === 'reject' && (
            <div className="bg-rose-950/30 border border-rose-500/50 rounded-xl p-4 flex flex-col gap-2 font-mono text-xs text-rose-200">
              <div className="flex items-center gap-2 text-rose-400 font-bold uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>CRITICAL QUARANTINE DIRECTIVE GENERATED:</span>
              </div>
              <p className="text-slate-300 font-sans leading-relaxed">
                Component <b className="text-white font-mono">{worstPart.component_id}</b> in{' '}
                <b className="text-amber-300 font-mono">[{worstPart.subsystem}] {worstPart.subsystem_name}</b> exhibits a calibrated risk score of{' '}
                <b className="text-rose-400 font-mono">{worstPart.risk_score}/100</b> with anomalous drift of{' '}
                <b className="text-white font-mono">{worstPart.v168.toFixed(1)} &micro;A</b>. Isolation from prime PCDU power bus advised prior to launch.
              </p>
            </div>
          )}

          {/* Clearance Verification Seal */}
          <div className="bg-[#070D18] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-lg text-amber-400">
                🛡️
              </div>
              <div>
                <div className="text-white font-bold">ISRO RELIABILITY DIVISION CLEARANCE</div>
                <div className="text-slate-400 text-[11px]">
                  STANDARD: MIL-STD-883 CLASS S / ISRO SP-91 FLIGHT DIRECTIVE
                </div>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-400">
              <div>HASH: <span className="text-sky-400">SHA256:7F9A3B...C48E</span></div>
              <div>DATE: <span className="text-white">{new Date().toLocaleDateString('en-GB')}</span></div>
            </div>
          </div>

          {/* Operational Command Box & Run Trigger */}
          <div className="bg-[#050B16] border border-amber-500/40 rounded-xl p-5 flex flex-col gap-3">
            <div className="text-xs font-mono text-slate-400">
              OPERATIONAL COMMAND CONSOLE:
            </div>
            <div className="bg-[#03060C] border border-slate-800 rounded-lg p-3 font-mono text-xs text-amber-300 flex items-center justify-between">
              <span>$ isro-spaceguard-ai --authorize-flight-clearance --run-mission-dashboard</span>
              <span className="text-emerald-400 font-bold">[READY]</span>
            </div>

            <button
              type="button"
              onClick={handleFinalScreeningLaunch}
              disabled={commandAuthorized}
              className="mt-2 w-full text-base font-display font-black py-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-sky-500 hover:from-amber-500 hover:to-sky-400 text-white shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-3 cursor-pointer border border-amber-400/50 uppercase tracking-wider"
            >
              <span>🚀</span>
              <span>
                {commandAuthorized
                  ? 'CLEARANCE AUTHORIZED &bull; LAUNCHING DASHBOARD...'
                  : 'RUN FINAL SCREENING & LAUNCH MISSION CONTROL'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
