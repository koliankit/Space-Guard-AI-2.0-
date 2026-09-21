import { useCallback, useState, useEffect } from 'react'
import Header, { type DashboardTab } from './components/Dashboard/Header'
import HealthBar from './components/Dashboard/HealthBar'
import MappingModal from './components/Dashboard/MappingModal'
import PipelineOverlay from './components/Dashboard/PipelineOverlay'
import AuditLog, { type AuditEntry } from './components/Dashboard/AuditLog'
import DataIngestModal from './components/Dashboard/DataIngestModal'
import LotClassificationModal from './components/Dashboard/LotClassificationModal'
import ComponentMonitor from './components/ComponentPanel/ComponentMonitor'
import IntelligencePanel, { ComponentOverviewCard, MathematicalReadingsPanel } from './components/ComponentPanel/IntelligencePanel'
import TelemetryChart from './components/Charts/TelemetryChart'
import DataQuality from './components/Charts/DataQuality'
import MissionMap from './components/MissionMap/MissionMap'
import SatelliteScene from './components/Satellite/SatelliteScene'
import AIRecommendationSystem from './components/Satellite/AIRecommendationSystem'
import SatelliteEquipmentBoard from './components/Satellite/SatelliteEquipmentBoard'
import ScreeningMatrixView from './components/Views/ScreeningMatrixView'
import OrbitalTrackingView from './components/Views/OrbitalTrackingView'
import SubsystemsView from './components/Views/SubsystemsView'
import MissionReportView from './components/Views/MissionReportView'
import LotArchitectureView from './components/Views/LotArchitectureView'
import MultiScreenWall from './components/Dashboard/MultiScreenWall'
import SidebarNav from './components/Dashboard/SidebarNav'
import SettingsView from './components/Views/SettingsView'
import CsvIntakeView from './components/Views/CsvIntakeView'
import ValidationView from './components/Views/ValidationView'
import ModuleAView from './components/Views/ModuleAView'
import ModuleBView from './components/Views/ModuleBView'
import RiskEngineView from './components/Views/RiskEngineView'
import DiagnosticsView from './components/Views/DiagnosticsView'
import SatelliteView from './components/Views/SatelliteView'
import TelemetryView from './components/Views/TelemetryView'
import ISROPitchModal from './components/Dashboard/ISROPitchModal'
import ISROOnboardingFlow from './components/Onboarding/ISROOnboardingFlow'
import TeeSecurityModal from './components/Dashboard/TeeSecurityModal'
import { ISRO_MISSIONS } from './offlineEngine'
import { sounds } from './utils/soundEffects'
import { generateCertificatePdf, generateTechnicalReportPdf } from './utils/pdfGenerator'
import { generateExcelReport } from './utils/excelGenerator'
import * as api from './api'
import type { ComponentOut, MissionStatus, UploadResult, TeeSecurityStatus, ValidationReport } from './types'

export default function App() {
  const [operationalPhase, setOperationalPhase] = useState<'onboarding' | 'dashboard'>('dashboard')
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [batchId, setBatchId] = useState<number | null>(null)
  const [uploadMeta, setUploadMeta] = useState<UploadResult | null>(null)
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null)
  const [dataMetaText, setDataMetaText] = useState(
    '<span class="text-[#5B6B7A] font-semibold text-base">No dataset loaded &mdash; ingest CSV telemetry to commence qualification clearance.</span>'
  )

  const [activeMissionId, setActiveMissionId] = useState<string>('GAGANYAAN')
  const [pitchModalOpen, setPitchModalOpen] = useState(false)
  const [ingestModalOpen, setIngestModalOpen] = useState(false)
  const [lotModalOpen, setLotModalOpen] = useState(false)
  const [teeModalOpen, setTeeModalOpen] = useState(false)
  const [teeStatus, setTeeStatus] = useState<TeeSecurityStatus | null>(null)

  const activeMission = ISRO_MISSIONS.find((m) => m.id === activeMissionId) || ISRO_MISSIONS[0]

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [mappingModal, setMappingModal] = useState<UploadResult | null>(null)

  const [analysisRun, setAnalysisRun] = useState(false)
  const [running, setRunning] = useState(false)
  const [mission, setMission] = useState<MissionStatus | null>(null)
  const [flaggedList, setFlaggedList] = useState<ComponentOut[]>([])
  const [allComponents, setAllComponents] = useState<ComponentOut[]>([])
  const [selected, setSelected] = useState<ComponentOut | null>(null)
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [alertComponent, setAlertComponent] = useState<ComponentOut | null>(null)
  const [quarantineToast, setQuarantineToast] = useState<ComponentOut | null>(null)
  const [modalTimerId, setModalTimerId] = useState<any>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('ALL')

  const getTimestamp = () => new Date().toLocaleTimeString('en-GB', { hour12: false })

  const [audit, setAudit] = useState<AuditEntry[]>([
    { time: new Date().toLocaleTimeString('en-GB', { hour12: false }), text: 'ISRO SpaceGuard AI Mission Control initialized. Awaiting flight telemetry.' },
  ])

  function log(text: string, cls?: AuditEntry['cls']) {
    setAudit((a) => [...a, { time: getTimestamp(), text, cls }])
  }

  async function resetForNewBatch(result: { batch_id: number; rows: number; valid: number; missing: number; lots: number }, label: string) {
    if (modalTimerId) clearTimeout(modalTimerId)
    setQuarantineToast(null)
    setAlertComponent(null)
    setBatchId(result.batch_id)
    setAnalysisRun(false)
    setMission(null)
    setFlaggedList([])
    setSelected(null)
    setFocusKey(null)
    setAudit([])
    setDataMetaText(
      `<span class="font-bold text-[#17212B] text-base md:text-lg tracking-wide">${label} loaded</span> &mdash; <span class="inline-flex items-center font-mono font-black text-lg md:text-xl text-[#168A5B] bg-[#168A5B]/15 px-3 py-1 rounded-lg border border-[#168A5B]/40 leading-none shadow-sm mx-1">${result.valid}</span> <span class="text-[#17212B] font-semibold text-base">components across</span> <button type="button" class="lot-clickable inline-flex items-center gap-1.5 font-mono font-black text-lg md:text-xl text-[#0E88D3] hover:text-[#0c74b4] bg-[#0E88D3]/10 hover:bg-[#0E88D3]/20 px-3 py-1 rounded-lg border border-[#0E88D3]/40 leading-none shadow-sm mx-1 transition-all cursor-pointer group" title="Inspect qualification lots in dedicated workspace"><span class="underline decoration-[#0E88D3]/60">${result.lots}</span> <span class="text-xs uppercase font-sans font-bold tracking-wider text-[#0E88D3]">lots 📦</span></button>`
    )
    log(`Flight dataset uploaded \u2014 ${result.rows} components parsed.`)
    log(`${result.valid} components validated across ${result.lots} qualification lots (${result.missing} rows skipped).`, 'ok')
    try {
      const list = await api.listComponents(result.batch_id, { limit: 1000 })
      if (list?.components?.length) {
        setAllComponents(list.components)
        setSelected((prev) => prev || list.components[0])
      }
    } catch {
      // fallback
    }
  }

  const handleFile = useCallback(async (file: File) => {
    try {
      const result = await api.uploadFile(file)
      if (result.error === 'column_mapping_required') {
        setPendingFile(file)
        setMappingModal(result)
        return
      }

      if (result.error === 'validation_failed') {
        if (modalTimerId) clearTimeout(modalTimerId)
        setValidationReport(result.validation_report || null)
        setUploadMeta(null)
        setBatchId(null)
        setAllComponents([])
        setFlaggedList([])
        setSelected(null)
        setMission(null)
        setAnalysisRun(false)
        setDataMetaText(
          `<span class="font-bold text-[#D9363E] text-base md:text-lg tracking-wide">Validation BLOCKED</span> &mdash; <span class="text-[#17212B] font-semibold text-base">${file.name} contains critical schema/data integrity error(s).</span>`
        )
        log(`Data validation FAILED for ${file.name}. AI screening blocked.`, 'flag')
        sounds.playAlert()
        setActiveTab('validation')
        return
      }

      // Valid dataset passed validation gate
      if (modalTimerId) clearTimeout(modalTimerId)
      setQuarantineToast(null)
      setAlertComponent(null)
      setValidationReport(result.validation_report || null)
      setUploadMeta(result)
      setBatchId(result.batch_id)
      setAnalysisRun(false)
      setMission(null)
      setFlaggedList([])
      setSelected(null)
      setFocusKey(null)
      setDataMetaText(
        `<span class="font-bold text-[#168A5B] text-base md:text-lg tracking-wide">${file.name} VALIDATED</span> &mdash; <span class="inline-flex items-center font-mono font-black text-lg md:text-xl text-[#168A5B] bg-[#168A5B]/15 px-3 py-1 rounded-lg border border-[#168A5B]/40 leading-none shadow-sm mx-1">${result.valid}</span> <span class="text-[#17212B] font-semibold text-base">components across</span> <span class="inline-flex items-center font-mono font-bold text-[#0E88D3] px-2 py-0.5 rounded bg-[#0E88D3]/10 border border-[#0E88D3]/30 mx-1">${result.lots} lots</span>`
      )
      log(`Flight dataset "${file.name}" uploaded \u2014 ${result.rows} components parsed.`)
      log(`Validation PASSED across ${result.lots} qualification lots. Ready for AI screening.`, 'ok')
      sounds.playSuccess()

      try {
        const list = await api.listComponents(result.batch_id, { limit: 1000 })
        if (list?.components?.length) {
          setAllComponents(list.components)
          setSelected(list.components[0])
        }
      } catch {
        // fallback
      }

      setActiveTab('validation')
    } catch (e: any) {
      alert('Upload failed: ' + e.message)
    }
  }, [modalTimerId])

  async function applyMapping(mapping: Record<string, string>) {
    if (!pendingFile) return
    try {
      const result = await api.uploadFile(pendingFile, mapping)
      setMappingModal(null)
      setPendingFile(null)
      if (result.error) {
        alert('Still missing required fields: ' + (result.missing_fields ?? []).join(', '))
        return
      }
      setUploadMeta(result)
      resetForNewBatch(result, 'Dataset')
    } catch (e: any) {
      alert('Upload failed: ' + e.message)
    }
  }

  async function handleSelectMission(mId: string) {
    setActiveMissionId(mId)
    const m = ISRO_MISSIONS.find((x) => x.id === mId) || ISRO_MISSIONS[0]
    log(`Selected mission qualification profile: ${m.name} (${m.code}) \u2014 ${m.centre}.`, 'ok')
  }

  async function handleDemo(missionIdOverride?: string, autoScreen = false) {
    const mId = missionIdOverride || activeMissionId
    const m = ISRO_MISSIONS.find((x) => x.id === mId) || ISRO_MISSIONS[0]
    try {
      log(`Requesting ${m.name} qualification batch (${m.code}) \u2014 MIL-STD-883 HTOL...`)
      const result = await api.createDemoBatch(mId)
      setUploadMeta(result)
      resetForNewBatch(result, `${m.name} [${m.code}] flight batch`)
      log(`Acquired ${result.rows} space-grade components across ${result.lots} qualification lots (${m.targetOrbit}).`, 'ok')
      if (autoScreen) {
        setTimeout(() => runScreening(result.batch_id), 600)
      }
    } catch (e: any) {
      log('Could not load ISRO flight telemetry: ' + e.message, 'flag')
      alert('Could not load ISRO flight telemetry: ' + e.message)
    }
  }

  function resetWorkflow() {
    api.resetTelemetryState()
    if (modalTimerId) clearTimeout(modalTimerId)
    setBatchId(null)
    setUploadMeta(null)
    setValidationReport(null)
    setMission(null)
    setFlaggedList([])
    setAllComponents([])
    setSelected(null)
    setFocusKey(null)
    setAlertComponent(null)
    setQuarantineToast(null)
    setAnalysisRun(false)
    setDataMetaText(
      '<span class="text-[#5B6B7A] font-semibold text-base">No dataset loaded &mdash; ingest CSV telemetry to commence qualification clearance.</span>'
    )
    setOperationalPhase('dashboard')
    log('Flight telemetry purged. System reset.', 'ok')
  }

  // Keyboard shortcut listener for ISRO Briefing Deck (Press 'P')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'p' || e.key === 'P') && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        sounds.playClick()
        setPitchModalOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Initial mount: query TEE status without auto-loading predefined demo batch
  useEffect(() => {
    api.getTeeSecurityStatus().then(setTeeStatus).catch(() => {})
  }, [])

  async function runScreening(idOverride?: number) {
    const id = idOverride ?? batchId
    if (!id || running) return
    if (validationReport && validationReport.status === 'BLOCKED') {
      alert('Cannot start AI screening: Uploaded dataset has critical validation errors.')
      return
    }
    setRunning(true)
    log('ISRO AI screening pipeline initialized &bull; MIL-STD-883 Method 1005.')
  }

  // called by PipelineOverlay once its animation finishes — this is where the real API call happens
  async function onPipelineDone() {
    const id = batchId
    if (!id) {
      setRunning(false)
      return
    }
    try {
      const result = await api.analyzeBatch(id)
      const ms = await api.missionStatus(id)
      const list = await api.listComponents(id, { limit: 500 })
      setMission(ms)
      setAllComponents(list.components)
      setFlaggedList(list.components.filter((c) => c.status !== 'safe').slice(0, 60))
      setAnalysisRun(true)
      log('ISRO Anomaly detection completed across all qualification lots.', 'ok')

      const chosen = result.top_flagged || list.components[0]
      if (chosen) {
        setSelected(chosen)
        setFocusKey(chosen.subsystem)
      }

      if (result.top_flagged) {
        const worst = result.top_flagged
        sounds.playAlert()
        log(`${worst.component_id} flagged \u2014 risk score ${worst.risk_score}/100.`, 'flag')
        log(`Risk scoring complete across ${ms.safe + ms.monitor + ms.reject} spaceflight components.`)
        log(`${worst.component_id} localized to ${worst.subsystem_name} subsystem.`)
        log(`REJECT decision generated for ${worst.component_id} &bull; Quarantine initiated.`, 'flag')
        setQuarantineToast(worst)
      } else {
        sounds.playSuccess()
        log('No component exceeded the anomaly threshold \u2014 spacecraft nominal.', 'ok')
      }

      // Automatically transition to Module A so graphs are visible immediately
      setActiveTab('module_a')
    } catch (e: any) {
      log('AI Screening encountered an error: ' + e.message, 'flag')
      alert('Screening error: ' + e.message)
    } finally {
      setRunning(false)
    }
  }

  async function selectComponent(id: string) {
    if (!batchId) return
    try {
      const detail = await api.componentDetail(batchId, id)
      setSelected(detail)
      setFocusKey(detail.subsystem)
    } catch (e: any) {
      alert('Could not load component: ' + e.message)
    }
  }

  async function selectSubsystem(key: string) {
    if (!key) {
      setFocusKey(null)
      return
    }
    const sub = mission?.subsystems.find((s) => s.key === key)
    if (sub?.top_component) {
      await selectComponent(sub.top_component)
    } else {
      setFocusKey(key)
    }
  }

  async function refreshFlaggedList(nextSearch = searchTerm, nextFilter = filterMode) {
    if (!batchId) return
    const status = nextFilter === 'ALL' ? undefined : nextFilter.toLowerCase()
    const list = await api.listComponents(batchId, { status, search: nextSearch || undefined, limit: 60 })
    setFlaggedList(list.components)
  }

  function handleReport() {
    generateTechnicalReportPdf(mission, allComponents.length > 0 ? allComponents : flaggedList)
    log('Official ISRO SDSC SHAR Technical Mission Report (.PDF) generated.', 'ok')
  }

  function handleReportPdf() {
    generateCertificatePdf(mission, allComponents.length > 0 ? allComponents : flaggedList)
    log('Official ISRO SDSC SHAR Flight Clearance Certificate PDF generated.', 'ok')
  }

  function handleReportExcel() {
    generateExcelReport(mission, allComponents.length > 0 ? allComponents : flaggedList)
    log('Official ISRO SDSC SHAR Flight Clearance Excel Ledger (.CSV) generated.', 'ok')
  }

  function handleReportCsv() {
    if (batchId) {
      window.open(api.downloadCsvReportUrl(batchId), '_blank')
      log(`Official Screening CSV Dataset Export (Batch #${batchId}) initiated.`, 'ok')
    } else {
      handleReportExcel()
    }
  }

  const subsystems = mission?.subsystems ?? EMPTY_SUBSYSTEMS

  function focusIn3D(comp: ComponentOut) {
    setSelected(comp)
    setFocusKey(comp.subsystem)
    setActiveTab('telemetry')
  }

  function focusSubsystemIn3D(subKey: string) {
    selectSubsystem(subKey)
    setActiveTab('telemetry')
  }



  return (
    <div className="h-screen w-screen overflow-hidden text-[#17212B] flex flex-col bg-[#EEF3F7]">
      <div className="grid-overlay" />
      <Header
        streamActive={batchId !== null}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        totalComponents={allComponents.length > 0 ? allComponents.length : flaggedList.length}
        rejectCount={mission?.reject ?? 0}
        onOpenPitchModal={() => setPitchModalOpen(true)}
        onOpenIngestModal={() => setIngestModalOpen(true)}
        activeMissionName={activeMission.name}
        onResetWorkflow={resetWorkflow}
        onOpenOnboarding={() => setActiveTab('csv_intake')}
        teeStatus={teeStatus}
        onOpenTeeModal={() => setTeeModalOpen(true)}
        onToggleSidebar={() => setMobileSidebarOpen((v) => !v)}
        onRunScreening={() => runScreening()}
        running={running}
        isScreened={analysisRun}
      />

      {/* Horizontal Health Metrics Bar — only appears after data has been loaded and screened */}
      {analysisRun && mission && (
        <HealthBar
          health={mission?.mission_health ?? null}
          safe={mission?.safe ?? null}
          monitor={mission?.monitor ?? null}
          reject={mission?.reject ?? null}
        />
      )}

      {/* Non-Blocking Critical Anomaly Alert Banner (Appears first before full modal) */}
      {quarantineToast && !alertComponent && (
        <div className="bg-[#FEF2F2] border-b border-[#D9363E]/40 px-5 py-2 flex items-center justify-between gap-3 text-xs font-mono text-[#17212B] animate-alert-once z-30">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D9363E] animate-gentle-pulse" />
            <span className="font-bold text-[#D9363E] uppercase tracking-wider">
              CRITICAL ANOMALY IDENTIFIED:
            </span>
            <span>
              Part <b className="text-[#17212B] font-bold">{quarantineToast.component_id}</b> in <b className="text-[#C58A00]">[{quarantineToast.subsystem}] {quarantineToast.subsystem_name}</b> has Risk Score <b className="text-[#D9363E]">{quarantineToast.risk_score}/100</b> ({quarantineToast.v168.toFixed(1)} &micro;A drift).
            </span>
          </div>
          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() => {
                if (modalTimerId) clearTimeout(modalTimerId)
                setQuarantineToast(null)
              }}
              className="px-2 py-1 rounded text-[#5B6B7A] hover:text-[#17212B] text-xs hover:bg-black/5 transition-colors"
              title="Dismiss Banner"
            >
              &#10005;
            </button>
          </div>
        </div>
      )}

      {/* Global AI Screening Overlay */}
      {running && <PipelineOverlay onDone={onPipelineDone} />}

      {/* Main Single Application Frame: LEFT NAVIGATION + RIGHT FULL WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-row w-full overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <SidebarNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab)
            setMobileSidebarOpen(false)
          }}
          totalComponents={allComponents.length > 0 ? allComponents.length : flaggedList.length}
          rejectCount={mission?.reject ?? 0}
          monitorCount={mission?.monitor ?? 0}
          safeCount={mission?.safe ?? 0}
          activeMissionName={activeMission.name}
          teeStatus={teeStatus}
          onOpenTeeModal={() => setTeeModalOpen(true)}
          onOpenPitchModal={() => setPitchModalOpen(true)}
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Right Full Dashboard Workspace */}
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto bg-[#EEF3F7] flex flex-col">
          {/* OVERVIEW */}
          {(activeTab === 'overview' || activeTab === 'wall') && (
            <MultiScreenWall
              mission={mission}
              components={allComponents.length > 0 ? allComponents : flaggedList}
              selected={selected}
              onSelectComponent={selectComponent}
              onSelectSubsystem={selectSubsystem}
              focusKey={focusKey}
              running={running}
              onRunScreening={() => runScreening()}
              onUploadFile={handleFile}
              onOpenLotsModal={() => setActiveTab('locations')}
              onNavigateToLotsTab={() => setActiveTab('locations')}
              onNavigateToTab={(tab) => setActiveTab(tab as DashboardTab)}
            />
          )}

          {/* DATA: CSV Intake */}
          {activeTab === 'csv_intake' && (
            <CsvIntakeView
              onFileUploaded={handleFile}
              onLoadOfficialBatch={handleDemo}
              batchId={batchId}
              uploadMeta={uploadMeta}
              allComponents={allComponents}
              activeMissionName={activeMission.name}
              activeMissionId={activeMissionId}
              onSelectMission={handleSelectMission}
              onContinueToValidation={() => setActiveTab('validation')}
            />
          )}

          {/* DATA: Validation */}
          {activeTab === 'validation' && (
            <ValidationView
              batchId={batchId}
              uploadMeta={uploadMeta}
              validationReport={validationReport}
              onFileUploaded={handleFile}
              allComponents={allComponents}
              mission={mission}
              running={running}
              onRunScreening={() => runScreening()}
              onSelectStage={setActiveTab}
              activeMissionName={activeMission.name}
            />
          )}

          {/* DATA: Module A */}
          {activeTab === 'module_a' && (
            <ModuleAView
              components={allComponents.length > 0 ? allComponents : flaggedList}
              selected={selected}
              onSelectComponent={selectComponent}
              onSelectSubsystem={selectSubsystem}
              onSelectStage={setActiveTab}
              mission={mission}
            />
          )}

          {/* DATA: Module B */}
          {activeTab === 'module_b' && (
            <ModuleBView
              components={allComponents.length > 0 ? allComponents : flaggedList}
              selected={selected}
              onSelectComponent={selectComponent}
              onSelectSubsystem={selectSubsystem}
              onSelectStage={setActiveTab}
              mission={mission}
            />
          )}

          {/* ANALYSIS: Risk Engine */}
          {activeTab === 'risk_engine' && (
            <RiskEngineView
              components={allComponents.length > 0 ? allComponents : flaggedList}
              selected={selected}
              onSelectComponent={selectComponent}
              mission={mission}
            />
          )}

          {/* ANALYSIS: Screening Matrix */}
          {activeTab === 'matrix' && (
            <ScreeningMatrixView
              components={allComponents.length > 0 ? allComponents : flaggedList}
              onSelectComponent={selectComponent}
              onFocusIn3D={focusIn3D}
              selectedId={selected?.component_id ?? null}
            />
          )}

          {/* ANALYSIS: Diagnostics */}
          {(activeTab === 'diagnostics' || activeTab === 'subsystems') && (
            <DiagnosticsView
              subsystems={subsystems}
              components={allComponents.length > 0 ? allComponents : flaggedList}
              selected={selected}
              onSelectComponent={selectComponent}
              onFocusSubsystem={focusSubsystemIn3D}
            />
          )}

          {/* SPACECRAFT: 3D Satellite */}
          {activeTab === 'satellite' && (
            <SatelliteView
              subsystems={subsystems}
              components={allComponents.length > 0 ? allComponents : flaggedList}
              selected={selected}
              focusKey={focusKey}
              onSelectComponent={selectComponent}
              onSelectSubsystem={selectSubsystem}
            />
          )}

          {/* OPERATIONS: Orbital DSN Tracking */}
          {activeTab === 'orbital' && (
            <OrbitalTrackingView />
          )}

          {/* SETTINGS: Configuration & Enclave */}
          {activeTab === 'settings' && (
            <SettingsView
              teeStatus={teeStatus}
              onOpenTeeModal={() => setTeeModalOpen(true)}
              activeMissionId={activeMissionId}
              onSelectMission={handleSelectMission}
              onResetWorkflow={resetWorkflow}
              totalComponents={allComponents.length}
            />
          )}

          {/* SPACECRAFT: Telemetry */}
          {activeTab === 'telemetry' && (
            <TelemetryView
              subsystems={subsystems}
              components={allComponents.length > 0 ? allComponents : flaggedList}
              analysisRun={analysisRun}
              selected={selected}
              onSelectSubsystem={selectSubsystem}
              onSelectComponent={selectComponent}
            />
          )}

          {/* SPACECRAFT: Component Locations & Dedicated Lot Inspection Workspace */}
          {(activeTab === 'locations' || activeTab === 'lots') && (
            <LotArchitectureView
              components={allComponents.length > 0 ? allComponents : flaggedList}
              subsystems={subsystems}
              onSelectComponent={selectComponent}
              onFocusSubsystem={selectSubsystem}
              onFocusIn3D={focusIn3D}
              onRunScreening={() => runScreening()}
              running={running}
              selectedId={selected?.component_id ?? null}
              onNavigateToTab={setActiveTab}
            />
          )}

          {/* OUTPUT: Clearance Report */}
          {activeTab === 'report' && (
            <MissionReportView
              mission={mission}
              components={allComponents.length > 0 ? allComponents : flaggedList}
              onDownloadReport={handleReport}
            />
          )}
        </main>
      </div>

      <AuditLog entries={audit} />

      {mappingModal && mappingModal.detected_headers && (
        <MappingModal
          headers={mappingModal.detected_headers}
          autoMapping={mappingModal.auto_mapping ?? {}}
          missingFields={mappingModal.missing_fields ?? []}
          onApply={applyMapping}
          onCancel={() => {
            setMappingModal(null)
            setPendingFile(null)
          }}
        />
      )}



      <DataIngestModal
        isOpen={ingestModalOpen}
        onClose={() => setIngestModalOpen(false)}
        onUploadFile={(file) => {
          setIngestModalOpen(false)
          handleFile(file)
        }}
        onSelectMission={(mId) => {
          setIngestModalOpen(false)
          handleSelectMission(mId)
        }}
        activeMissionId={activeMissionId}
      />

      <ISROPitchModal
        isOpen={pitchModalOpen}
        onClose={() => setPitchModalOpen(false)}
        onSelectMission={handleSelectMission}
        onRunScreening={() => runScreening()}
        onOpenTab={setActiveTab}
      />

      <TeeSecurityModal
        isOpen={teeModalOpen}
        onClose={() => setTeeModalOpen(false)}
        status={teeStatus}
      />
    </div>
  )
}

const EMPTY_SUBSYSTEMS: MissionStatus['subsystems'] = []
