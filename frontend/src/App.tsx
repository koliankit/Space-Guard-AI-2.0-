import { useCallback, useState, useEffect } from 'react'
import Header, { type DashboardTab } from './components/Dashboard/Header'
import UploadBar from './components/Dashboard/UploadBar'
import HealthBar from './components/Dashboard/HealthBar'
import MappingModal from './components/Dashboard/MappingModal'
import PipelineOverlay from './components/Dashboard/PipelineOverlay'
import AuditLog, { type AuditEntry } from './components/Dashboard/AuditLog'
import CriticalAlertModal from './components/Alerts/CriticalAlertModal'
import ComponentMonitor from './components/ComponentPanel/ComponentMonitor'
import IntelligencePanel from './components/ComponentPanel/IntelligencePanel'
import ComparePanel from './components/Charts/ComparePanel'
import TelemetryChart from './components/Charts/TelemetryChart'
import DataQuality from './components/Charts/DataQuality'
import MissionMap from './components/MissionMap/MissionMap'
import SatelliteScene from './components/Satellite/SatelliteScene'
import SatelliteEquipmentBoard from './components/Satellite/SatelliteEquipmentBoard'
import ScreeningMatrixView from './components/Views/ScreeningMatrixView'
import OrbitalTrackingView from './components/Views/OrbitalTrackingView'
import SubsystemsView from './components/Views/SubsystemsView'
import MissionReportView from './components/Views/MissionReportView'
import MultiScreenWall from './components/Dashboard/MultiScreenWall'
import { generateCertificatePdf } from './utils/pdfGenerator'
import { generateExcelReport } from './utils/excelGenerator'
import * as api from './api'
import type { ComponentOut, MissionStatus, UploadResult } from './types'

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('wall')
  const [batchId, setBatchId] = useState<number | null>(null)
  const [uploadMeta, setUploadMeta] = useState<UploadResult | null>(null)
  const [dataMetaText, setDataMetaText] = useState('No dataset loaded &mdash; upload a file or load ISRO flight batch.')

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

  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('ALL')

  const getTimestamp = () => new Date().toLocaleTimeString('en-GB', { hour12: false })

  const [audit, setAudit] = useState<AuditEntry[]>([
    { time: new Date().toLocaleTimeString('en-GB', { hour12: false }), text: 'ISRO SpaceGuard AI Mission Control initialized. Awaiting flight telemetry.' },
  ])

  function log(text: string, cls?: AuditEntry['cls']) {
    setAudit((a) => [...a, { time: getTimestamp(), text, cls }])
  }

  function resetForNewBatch(result: { batch_id: number; rows: number; valid: number; missing: number; lots: number }, label: string) {
    setBatchId(result.batch_id)
    setAnalysisRun(false)
    setMission(null)
    setFlaggedList([])
    setAllComponents([])
    setSelected(null)
    setFocusKey(null)
    setAudit([])
    setDataMetaText(
      `${label} loaded &mdash; <b style="color:#00FF87">${result.valid}</b> components across <b style="color:#00F0FF">${result.lots}</b> lots.`,
    )
    log(`Flight dataset uploaded \u2014 ${result.rows} components parsed.`)
    log(`${result.valid} components validated across ${result.lots} qualification lots (${result.missing} rows skipped).`, 'ok')
  }

  const handleFile = useCallback(async (file: File) => {
    try {
      const result = await api.uploadFile(file)
      if (result.error === 'column_mapping_required') {
        setPendingFile(file)
        setMappingModal(result)
        return
      }
      setUploadMeta(result)
      resetForNewBatch(result, 'Dataset')
    } catch (e: any) {
      alert('Upload failed: ' + e.message)
    }
  }, [])

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

  async function handleDemo() {
    try {
      log('Requesting ISRO Spaceflight Telemetry Batch (MIL-STD-883 HTOL)...')
      const result = await api.createDemoBatch()
      setUploadMeta(result)
      resetForNewBatch(result, 'ISRO Flight Telemetry batch')
      log(`Acquired ${result.rows} space-grade components across ${result.lots} qualification lots.`, 'ok')
      setTimeout(() => runScreening(result.batch_id), 500)
    } catch (e: any) {
      log('Could not load ISRO flight telemetry: ' + e.message, 'flag')
      alert('Could not load ISRO flight telemetry: ' + e.message)
    }
  }

  // Auto-initialize spaceflight telemetry on startup so dashboard is never empty
  useEffect(() => {
    handleDemo()
  }, [])

  async function runScreening(idOverride?: number) {
    const id = idOverride ?? batchId
    if (!id || running) return
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

      if (result.top_flagged) {
        const worst = result.top_flagged
        log(`${worst.component_id} flagged \u2014 risk score ${worst.risk_score}/100.`, 'flag')
        log(`Risk scoring complete across ${ms.safe + ms.monitor + ms.reject} spaceflight components.`)
        log(`${worst.component_id} localized to ${worst.subsystem_name} subsystem.`)
        log(`REJECT decision generated for ${worst.component_id} &bull; Quarantine initiated.`, 'flag')
        setSelected(worst)
        setFocusKey(worst.subsystem)
        setTimeout(() => setAlertComponent(worst), 400)
      } else {
        log('No component exceeded the anomaly threshold \u2014 spacecraft nominal.', 'ok')
      }
    } catch (e: any) {
      log('Analysis failed: ' + e.message, 'flag')
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
    const id = batchId ?? 1
    const url = api.reportUrl(id)
    const link = document.createElement('a')
    link.href = url
    link.download = `ISRO_SpaceGuard_Screening_Report_Batch_${id}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    log('ISRO Flight Screening report generated and downloaded (.MD).', 'ok')
  }

  function handleReportPdf() {
    generateCertificatePdf(mission, allComponents.length > 0 ? allComponents : flaggedList)
    log('Official ISRO SDSC SHAR Flight Clearance Certificate PDF generated.', 'ok')
  }

  function handleReportExcel() {
    generateExcelReport(mission, allComponents.length > 0 ? allComponents : flaggedList)
    log('Official ISRO SDSC SHAR Flight Clearance Excel Ledger (.CSV) generated.', 'ok')
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
    <div className="min-h-screen text-slate-100 flex flex-col bg-bg">
      <div className="grid-overlay" />
      <Header
        streamActive={batchId !== null}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        totalComponents={allComponents.length > 0 ? allComponents.length : flaggedList.length}
        rejectCount={mission?.reject ?? 0}
      />
      <UploadBar
        metaText={dataMetaText}
        canRun={batchId !== null}
        canReport={analysisRun}
        running={running}
        onFile={handleFile}
        onDemo={handleDemo}
        onRun={() => runScreening()}
        onReport={handleReport}
        onReportPdf={handleReportPdf}
        onReportExcel={handleReportExcel}
      />
      <HealthBar
        health={mission?.mission_health ?? null}
        safe={mission?.safe ?? null}
        monitor={mission?.monitor ?? null}
        reject={mission?.reject ?? null}
      />

      {/* Global AI Screening Overlay */}
      {running && <PipelineOverlay onDone={onPipelineDone} />}

      {/* Dynamic Workflow Views */}
      {activeTab === 'wall' && (
        <MultiScreenWall
          mission={mission}
          components={allComponents.length > 0 ? allComponents : flaggedList}
          selected={selected}
          onSelectComponent={selectComponent}
          onSelectSubsystem={selectSubsystem}
          focusKey={focusKey}
          running={running}
        />
      )}

      {activeTab === 'telemetry' && (
        <>
          <div className="grid grid-cols-[280px_1fr_320px] gap-px bg-line border-b border-line lg:grid-cols-[280px_1fr_320px] max-lg:grid-cols-1 flex-1">
            <ComponentMonitor
              subsystems={subsystems}
              components={flaggedList}
              analysisRun={analysisRun}
              selectedId={selected?.component_id ?? null}
              onSelectSubsystem={selectSubsystem}
              onSelectComponent={selectComponent}
              onSearch={(term) => {
                setSearchTerm(term)
                refreshFlaggedList(term, filterMode)
              }}
              onFilter={(mode) => {
                setFilterMode(mode)
                refreshFlaggedList(searchTerm, mode)
              }}
            />

            <div className="flex flex-col">
              <div className="relative h-[480px] bg-[radial-gradient(ellipse_at_50%_40%,#0C203E_0%,#060B14_85%)] border-b border-line overflow-hidden">
                <SatelliteScene subsystems={subsystems} onSelect={selectSubsystem} focusKey={focusKey} />
              </div>
              <ComparePanel component={selected} />
              <SatelliteEquipmentBoard
                subsystems={subsystems}
                components={allComponents.length > 0 ? allComponents : flaggedList}
                selectedComponent={selected}
                focusKey={focusKey}
                onSelectComponent={selectComponent}
                onSelectSubsystem={selectSubsystem}
              />
            </div>

            <IntelligencePanel component={selected} />
          </div>

          <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-px bg-line border-b border-line max-lg:grid-cols-1">
            <TelemetryChart component={selected} />
            <DataQuality
              rows={uploadMeta?.rows ?? null}
              valid={uploadMeta?.valid ?? null}
              missing={uploadMeta?.missing ?? null}
              lots={uploadMeta?.lots ?? null}
            />
            <MissionMap critical={(mission?.reject ?? 0) > 0} />
          </div>
        </>
      )}

      {activeTab === 'matrix' && (
        <ScreeningMatrixView
          components={allComponents.length > 0 ? allComponents : flaggedList}
          onSelectComponent={selectComponent}
          onFocusIn3D={focusIn3D}
          selectedId={selected?.component_id ?? null}
        />
      )}

      {activeTab === 'orbital' && <OrbitalTrackingView />}

      {activeTab === 'subsystems' && (
        <SubsystemsView
          subsystems={subsystems}
          components={allComponents.length > 0 ? allComponents : flaggedList}
          onFocusSubsystem={focusSubsystemIn3D}
          onSelectComponent={selectComponent}
        />
      )}

      {activeTab === 'report' && (
        <MissionReportView
          mission={mission}
          components={allComponents.length > 0 ? allComponents : flaggedList}
          onDownloadReport={handleReport}
        />
      )}

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

      {alertComponent && (
        <CriticalAlertModal
          component={alertComponent}
          onAcknowledge={() => {
            setFocusKey(alertComponent.subsystem)
            setAlertComponent(null)
          }}
        />
      )}
    </div>
  )
}

const EMPTY_SUBSYSTEMS: MissionStatus['subsystems'] = []
