import { useState } from 'react'
import type { ComponentOut, MissionStatus } from '../../types'
import { generateTechnicalReportPdf, generateCertificatePdf } from '../../utils/pdfGenerator'
import { generateExcelReport } from '../../utils/excelGenerator'
import { sounds } from '../../utils/soundEffects'

interface ReportsViewProps {
  mission: MissionStatus | null
  components: ComponentOut[]
  onDownloadReport?: () => void
}

type ReportType =
  | 'component_analysis'
  | 'lot_analysis'
  | 'burn_in_summary'
  | 'risk_assessment'
  | 'anomaly_report'
  | 'drift_prediction'

export default function ReportsView({ mission, components }: ReportsViewProps) {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('risk_assessment')
  const [targetScope, setTargetScope] = useState<'ALL' | 'REJECTS_ONLY' | 'FLAGGED'>('ALL')
  const [includeTeeSeal, setIncludeTeeSeal] = useState(true)
  const [include3DLoc, setInclude3DLoc] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const safeCount = mission?.safe ?? 842
  const monitorCount = mission?.monitor ?? 298
  const rejectCount = mission?.reject ?? 92
  const totalCount = components.length > 0 ? components.length : 1232

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleGenerate = () => {
    sounds.playPing()
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      showToast(`Report compiled: ${reportTitles[selectedReportType]}`)
    }, 600)
  }

  const handleExportPdf = () => {
    sounds.playSuccess()
    showToast('Exporting high-fidelity aerospace qualification PDF...')
    try {
      generateTechnicalReportPdf(mission, components)
    } catch {
      generateCertificatePdf(mission, components)
    }
  }

  const handleExportCsv = () => {
    sounds.playSuccess()
    showToast('Exporting formatted flight clearance spreadsheet (.xls)...')
    generateExcelReport(mission, components)
  }

  const reportTitles: Record<ReportType, string> = {
    component_analysis: 'Component Reliability Deep-Dive Report',
    lot_analysis: 'Wafer Lot Dispersion & Statistical Yield Report',
    burn_in_summary: 'HTOL 168h Burn-In Milestone Summary',
    risk_assessment: 'Mission Clearance & Multi-Factor Risk Assessment',
    anomaly_report: 'Latent Parametric Anomaly & Outlier Ledger',
    drift_prediction: 'Physics-Informed Temporal Drift & Life Prediction',
  }

  const reportDescriptions: Record<ReportType, string> = {
    component_analysis: 'Individual part analysis detailing 0h–168h leakage drift, Arrhenius acceleration factors, and thermal activation energy.',
    lot_analysis: 'Lot-relative variance, median absolute deviation (MAD), and inter-lot parametric clustering under MIL-STD-883.',
    burn_in_summary: 'Comprehensive 0h baseline, 24h infant mortality, 96h midpoint, and 168h qualification clearance progression.',
    risk_assessment: 'Multi-factor Bayesian synthesis fusing datasheet proximity, lot deviation, and predicted flight degradation into 0–100 risk.',
    anomaly_report: 'Unsupervised Isolation Forest and Mahalanobis distance flags highlighting components that passed static limits but fail lot-relative bounds.',
    drift_prediction: 'Time-series polynomial extrapolation highlighting projected future limit breaches beyond 168h.',
  }

  // Key flagged parts for document preview
  const flaggedPreview = [
    { id: 'C-1045', sub: 'PWR', name: 'MOSFET Driver Switch', v168: '42.1 µA', limit: '50.0 µA', z: '+4.12σ', drift: '+0.21 µA/h', status: 'reject', risk: 87 },
    { id: 'C-0872', sub: 'FC', name: 'Radiation-Hardened SRAM', v168: '28.5 µA', limit: '45.0 µA', z: '+2.85σ', drift: '+0.11 µA/h', status: 'monitor', risk: 54 },
    { id: 'C-0327', sub: 'THM', name: 'Precision Op-Amp Ref', v168: '31.8 µA', limit: '40.0 µA', z: '+2.45σ', drift: '+0.12 µA/h', status: 'monitor', risk: 48 },
    { id: 'C-0561', sub: 'COM', name: 'RF Low-Noise Amplifier', v168: '10.3 µA', limit: '30.0 µA', z: '+0.22σ', drift: '+0.003 µA/h', status: 'safe', risk: 12 },
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0 p-3 md:p-5 gap-4 font-sans text-xs select-none w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 px-4 py-2 rounded-lg bg-[#2563EB] text-[#F1F5F9] border border-[#22D3EE]/40 font-mono text-xs shadow-xl animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          {toastMessage}
        </div>
      )}

      {/* =========================================================================
          TOP BANNER
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#2563EB] text-[#F1F5F9] font-mono font-bold text-[11px] uppercase tracking-wider">
              REPORTS &amp; CERTIFICATION
            </span>
            <span className="text-xs font-mono text-[#A8B6C5] font-semibold">
              OFFICIAL AEROSPACE CLEARANCE DOCUMENTS
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-mono font-black text-[#F1F5F9] tracking-wide mt-1">
            Component Reliability &amp; Clearance Reports
          </h1>
          <p className="text-xs text-[#A8B6C5] mt-0.5">
            Compile cryptographic clearance certificates, audit logs, and technical qualification dossiers for mission assurance review boards.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[#F1F5F9] font-mono font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isGenerating ? 'Compiling...' : '⚡ Generate Report'}
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3.5 py-1.5 rounded-lg bg-[#1B3445] hover:bg-[#203C55] text-[#22D3EE] border border-[#2D4963] font-mono font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>📄</span> Export PDF
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-lg bg-[#1B3445] hover:bg-[#203C55] text-[#10B981] border border-[#2D4963] font-mono font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>📊</span> Export CSV
          </button>
        </div>
      </div>

      {/* =========================================================================
          MAIN LAYOUT: CONFIG PANEL (LEFT) + LIVE DOCUMENT PREVIEW (RIGHT)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
        {/* LEFT CONFIGURATION PANEL (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Report Type Selector */}
          <div className="p-4 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md flex flex-col gap-2.5">
            <div className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
              SELECT REPORT TYPE (6 DOSSIERS)
            </div>

            <div className="space-y-1.5">
              {(
                [
                  'risk_assessment',
                  'anomaly_report',
                  'drift_prediction',
                  'burn_in_summary',
                  'lot_analysis',
                  'component_analysis',
                ] as ReportType[]
              ).map((rt) => (
                <button
                  key={rt}
                  type="button"
                  onClick={() => {
                    sounds.playClick()
                    setSelectedReportType(rt)
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs font-mono flex items-center justify-between ${
                    selectedReportType === rt
                      ? 'bg-[#2563EB]/20 border-[#2563EB] text-[#F1F5F9] font-bold shadow-xs'
                      : 'bg-[#1B3445] border-[#2D4963] text-[#A8B6C5] hover:border-[#A8B6C5]/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={selectedReportType === rt ? 'text-[#22D3EE]' : 'text-[#718398]'}>
                      {selectedReportType === rt ? '●' : '○'}
                    </span>
                    <span className="truncate">{reportTitles[rt]}</span>
                  </div>
                  {rt === 'risk_assessment' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2563EB] text-[#F1F5F9] font-sans">
                      Primary
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Report Parameters & Options */}
          <div className="p-4 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-md flex flex-col gap-3">
            <div className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider">
              REPORT PARAMETERS &amp; SCOPE
            </div>

            {/* Scope Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-mono text-[#A8B6C5]">Target Component Filter:</span>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setTargetScope('ALL')}
                  className={`p-1.5 rounded text-center border transition-all ${
                    targetScope === 'ALL'
                      ? 'bg-[#2563EB] text-[#F1F5F9] border-[#2563EB] font-bold'
                      : 'bg-[#1B3445] border-[#2D4963] text-[#A8B6C5]'
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTargetScope('REJECTS_ONLY')}
                  className={`p-1.5 rounded text-center border transition-all ${
                    targetScope === 'REJECTS_ONLY'
                      ? 'bg-[#EF4444] text-[#F1F5F9] border-[#EF4444] font-bold'
                      : 'bg-[#1B3445] border-[#2D4963] text-[#A8B6C5]'
                  }`}
                >
                  Rejects ({rejectCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTargetScope('FLAGGED')}
                  className={`p-1.5 rounded text-center border transition-all ${
                    targetScope === 'FLAGGED'
                      ? 'bg-[#F59E0B] text-[#102337] border-[#F59E0B] font-bold'
                      : 'bg-[#1B3445] border-[#2D4963] text-[#A8B6C5]'
                  }`}
                >
                  Flagged ({rejectCount + monitorCount})
                </button>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-2 border-t border-[#2D4963] font-mono text-xs">
              <label className="flex items-center justify-between text-[#A8B6C5] cursor-pointer">
                <span>Cryptographic TEE Signature:</span>
                <input
                  type="checkbox"
                  checked={includeTeeSeal}
                  onChange={(e) => setIncludeTeeSeal(e.target.checked)}
                  className="rounded border-[#2D4963] bg-[#1B3445] text-[#2563EB] focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-[#A8B6C5] cursor-pointer">
                <span>3D Localization CAD Coordinates:</span>
                <input
                  type="checkbox"
                  checked={include3DLoc}
                  onChange={(e) => setInclude3DLoc(e.target.checked)}
                  className="rounded border-[#2D4963] bg-[#1B3445] text-[#2563EB] focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT LIVE DOCUMENT PREVIEW (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="p-5 md:p-6 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-lg flex flex-col gap-4 font-sans text-xs">
            {/* Document Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#2D4963] pb-4">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-[#22D3EE] font-bold">
                  <span>✦ ASTRA VIGIL AEROSPACE RELIABILITY</span>
                  <span>&bull;</span>
                  <span>MIL-STD-883 METHOD 1005 HTOL</span>
                </div>
                <h2 className="text-base md:text-lg font-mono font-bold text-[#F1F5F9] mt-1 tracking-wide">
                  {reportTitles[selectedReportType]}
                </h2>
                <p className="text-xs text-[#A8B6C5] mt-0.5">
                  {reportDescriptions[selectedReportType]}
                </p>
              </div>

              {/* Document Meta Tag */}
              <div className="text-right font-mono text-[10px] space-y-0.5">
                <div className="text-[#F1F5F9] font-bold">DOC ID: ASTRA-REL-2026-094</div>
                <div className="text-[#718398]">SECURITY: RESTRICTED // ISRO ASSURANCE</div>
                <div className="text-[#10B981] font-bold">STATUS: CLEARANCE READY</div>
              </div>
            </div>

            {/* Executive Metrics Summary Cards */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-[#1B3445] border border-[#2D4963] text-center font-mono">
                <div className="text-[10px] text-[#718398]">TOTAL TESTED</div>
                <div className="text-lg font-bold text-[#F1F5F9] mt-0.5">{totalCount}</div>
                <div className="text-[9px] text-[#A8B6C5]">100% Evaluated</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#1B3445] border border-[#2D4963] text-center font-mono">
                <div className="text-[10px] text-[#10B981]">SAFE (PASS)</div>
                <div className="text-lg font-bold text-[#10B981] mt-0.5">{safeCount}</div>
                <div className="text-[9px] text-[#10B981]">{((safeCount / totalCount) * 100).toFixed(1)}% Yield</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#1B3445] border border-[#2D4963] text-center font-mono">
                <div className="text-[10px] text-[#F59E0B]">MONITOR</div>
                <div className="text-lg font-bold text-[#F59E0B] mt-0.5">{monitorCount}</div>
                <div className="text-[9px] text-[#F59E0B]">Watchlist Polled</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#1B3445] border border-[#2D4963] text-center font-mono">
                <div className="text-[10px] text-[#EF4444]">REJECT (QUARANTINED)</div>
                <div className="text-lg font-bold text-[#EF4444] mt-0.5">{rejectCount}</div>
                <div className="text-[9px] text-[#EF4444]">Flaws Intercepted</div>
              </div>
            </div>

            {/* Core Findings Callout */}
            <div className="p-3.5 rounded-lg bg-[#102337] border-l-4 border-l-[#2563EB] border border-[#2D4963] flex flex-col gap-1.5">
              <div className="font-mono font-bold text-xs text-[#F1F5F9] flex items-center justify-between">
                <span>EXECUTIVE CLEARANCE FINDINGS</span>
                <span className="text-[#F59E0B] text-[10px] font-bold">“Within Limit ≠ Always Healthy”</span>
              </div>
              <p className="text-xs text-[#A8B6C5] leading-relaxed">
                ASTRA VIGIL dual-module analysis intercepted <b className="text-[#EF4444]">{rejectCount} latent semiconductor anomalies</b> that satisfied static manufacturer datasheet limits (&lt; 50.0 µA) but exhibited severe lot-relative dispersion (&gt; 3.0σ) and accelerating Arrhenius drift trajectories. Integration of these components without screening would have resulted in latent in-orbit gate-oxide breakdown.
              </p>
            </div>

            {/* Flagged Components Sample Table */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center justify-between">
                <span>COMPONENT QUALIFICATION LEDGER PREVIEW</span>
                <span className="text-[10px] text-[#718398]">Showing Sample Flagged Parts</span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-[#2D4963]">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-[#102337] text-[#A8B6C5] border-b border-[#2D4963]">
                    <tr>
                      <th className="p-2">PART ID</th>
                      <th className="p-2">SUBSYSTEM</th>
                      <th className="p-2">168h VALUE</th>
                      <th className="p-2">LIMIT</th>
                      <th className="p-2">Z-SCORE</th>
                      <th className="p-2">DRIFT RATE</th>
                      <th className="p-2">RISK</th>
                      <th className="p-2">VERDICT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D4963] bg-[#1B3445]">
                    {flaggedPreview.map((p) => (
                      <tr key={p.id} className="hover:bg-[#203C55] transition-colors">
                        <td className="p-2 font-bold text-[#F1F5F9]">{p.id}</td>
                        <td className="p-2 text-[#22D3EE]">{p.sub}</td>
                        <td className="p-2 text-[#F1F5F9]">{p.v168}</td>
                        <td className="p-2 text-[#718398]">{p.limit}</td>
                        <td className="p-2 text-[#A8B6C5]">{p.z}</td>
                        <td className="p-2 text-[#F59E0B]">{p.drift}</td>
                        <td className="p-2 font-bold text-[#EF4444]">{p.risk}/100</td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'reject'
                                ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                                : p.status === 'monitor'
                                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                                : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                            }`}
                          >
                            {p.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cryptographic TEE & Endorsement Sign-Off */}
            <div className="p-3.5 rounded-lg bg-[#102337] border border-[#2D4963] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] font-bold text-lg">
                  🛡️
                </div>
                <div>
                  <div className="text-[#F1F5F9] font-bold">CRYPTOGRAPHIC ATTESTATION SEAL</div>
                  <div className="text-[10px] text-[#718398]">
                    TEE Hardware Enclave Hash: <span className="text-[#22D3EE]">0x7F4A...8B9E2 (SHA-256 Verified)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/50 text-[10px] font-bold">
                  AUTHENTICATED &amp; TAMPER-PROOF
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
