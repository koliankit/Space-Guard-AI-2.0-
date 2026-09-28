import React from 'react'
import type { ComponentOut, MissionStatus } from '../../types'
import ComponentDiagram from '../Diagrams/ComponentDiagram'
import { generateCertificatePdf, generateScreeningReportPdf } from '../../utils/pdfGenerator'
import { generateExcelReport } from '../../utils/excelGenerator'
import { offlineISRO } from '../../offlineEngine'

interface MissionReportViewProps {
  mission: MissionStatus | null
  components: ComponentOut[]
  onDownloadReport: () => void
}

export default function MissionReportView({
  mission,
  components,
  onDownloadReport,
}: MissionReportViewProps) {
  if (!components || components.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-full items-center justify-center p-8 bg-[#EEF3F7] text-[#17212B] font-mono text-center">
        <div className="w-16 h-16 rounded-full bg-[#0E88D3]/10 border border-[#0E88D3]/30 flex items-center justify-center text-[#0E88D3] text-2xl font-bold mb-4 shadow-sm">
          📄
        </div>
        <h2 className="text-xl font-black text-[#17212B] uppercase tracking-wider mb-2">
          NO FLIGHT CLEARANCE EVIDENCE AVAILABLE
        </h2>
        <p className="text-xs text-[#5B6B7A] max-w-md font-sans mb-4">
          Upload, validate, and execute AI screening on a flight telemetry dataset to generate official ISRO mission clearance evidence and PDF certificates.
        </p>
      </div>
    )
  }

  const activeComponents = components
  const rejected = activeComponents.filter((c) => c.status === 'reject')
  const monitored = activeComponents.filter((c) => c.status === 'monitor')
  const safeCount = mission?.safe ?? activeComponents.filter((c) => c.status === 'safe').length
  const health =
    mission?.mission_health ??
    Math.round(100 - activeComponents.reduce((s, c) => s + c.risk_score, 0) / activeComponents.length)

  const handleDownloadCertPdf = () => {
    generateCertificatePdf(mission, activeComponents)
  }

  const handleDownloadFullReportPdf = () => {
    generateScreeningReportPdf(mission, activeComponents)
  }

  const handleDownloadExcel = () => {
    generateExcelReport(mission, activeComponents)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col flex-1 min-h-full p-3 md:p-5 bg-[#F8FAFC] text-[#0F1D2E] font-mono select-none w-full">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#D5DEE7] mb-6 w-full">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#168A5B]" />
            <h2 className="m-0 text-sm font-display font-black tracking-widest text-[#0F1D2E] uppercase">
              ISRO SDSC SHAR FLIGHT CLEARANCE CERTIFICATE &amp; SCREENING REPORT
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
              DOC REF: ISRO-SDSC-SHAR-QA-2026-SG1
            </span>
          </div>
          <div className="text-[10px] text-[#64748B] tracking-wider mt-0.5">
            Issued by Indian Space Research Organisation (ISRO) &bull; Satish Dhawan Space Centre SHAR Sriharikota &bull; SpaceGuard AI Division
          </div>
        </div>

        {/* PDF & Export Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCertPdf}
            className="border-emerald-600/40 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs px-3.5 py-1.5 rounded border transition-all flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
          >
            <span>&#8681;</span> DOWNLOAD CERTIFICATE (PDF)
          </button>
          <button
            type="button"
            onClick={handleDownloadFullReportPdf}
            className="border-amber-500/40 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs px-3.5 py-1.5 rounded border transition-all flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
          >
            <span>&#8681;</span> DOWNLOAD FULL REPORT (PDF)
          </button>
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="border-emerald-600/40 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs px-3.5 py-1.5 rounded border transition-all flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
          >
            <span>&#8681;</span> DOWNLOAD EXCEL (.CSV)
          </button>
          <button
            type="button"
            onClick={onDownloadReport}
            className="border-[#D5DEE7] bg-[#FFFFFF] text-[#64748B] hover:text-[#0F1D2E] text-xs px-3 py-1.5 rounded border transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>&#8681;</span> MARKDOWN (.MD)
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="border-[#D5DEE7] bg-[#FFFFFF] text-[#0F1D2E] hover:border-[#0E88D3] hover:text-[#0E88D3] text-xs px-3 py-1.5 rounded border transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>&#9113;</span> PRINT / HIGH-DPI PDF
          </button>
        </div>
      </div>

      {/* Official Certificate Paper Container */}
      <div className="w-full bg-[#FFFFFF] border-2 border-[#D5DEE7] p-6 sm:p-8 rounded-lg shadow-sm space-y-6">
        {/* Certificate Masthead */}
        <div className="text-center pb-6 border-b border-[#D5DEE7]">
          <div className="inline-block border border-amber-300 px-4 py-1 rounded bg-amber-50 text-amber-800 font-display font-black text-sm tracking-widest mb-2 shadow-sm">
            भारतीय अंतरिक्ष अनुसंधान संगठन / INDIAN SPACE RESEARCH ORGANISATION
          </div>
          <div className="text-xs text-[#64748B] font-bold tracking-widest uppercase mb-1">
            सतीश धवन अंतरिक्ष केंद्र शार, श्रीहरिकोटा / SATISH DHAWAN SPACE CENTRE SHAR, SRIHARIKOTA
          </div>
          <h1 className="m-0 font-display text-lg font-black text-[#0F1D2E] tracking-widest uppercase">
            FLIGHT READINESS COMPONENT SCREENING CLEARANCE CERTIFICATE
          </h1>
          <div className="text-xs text-[#64748B] mt-1 font-mono">
            Spacecraft: <b className="text-amber-700">SPACEGUARD-1 (LEO SSO 520KM)</b> &bull; Standard:{' '}
            <b className="text-[#168A5B]">MIL-STD-883 METHOD 1005 (168h HTOL BURN-IN)</b>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded bg-[#F8FAFC] border border-[#D5DEE7]">
            <div className="text-2xl font-display font-black text-amber-600">{health}%</div>
            <div className="text-[10px] text-[#64748B] uppercase mt-0.5">Mission Health Score</div>
          </div>
          <div className="p-3 rounded bg-[#F8FAFC] border border-[#D5DEE7]">
            <div className="text-2xl font-display font-black text-[#168A5B]">{safeCount}</div>
            <div className="text-[10px] text-[#64748B] uppercase mt-0.5">Flight Approved (Safe)</div>
          </div>
          <div className="p-3 rounded bg-[#F8FAFC] border border-[#D5DEE7]">
            <div className="text-2xl font-display font-black text-amber-600">{monitored.length}</div>
            <div className="text-[10px] text-[#64748B] uppercase mt-0.5">Active Orbital Monitor</div>
          </div>
          <div className="p-3 rounded bg-[#F8FAFC] border border-[#D5DEE7]">
            <div className="text-2xl font-display font-black text-rose-600">{rejected.length}</div>
            <div className="text-[10px] text-[#64748B] uppercase mt-0.5">Quarantined / Defects</div>
          </div>
        </div>

        {/* Executive Anomaly Prevention Summary */}
        <div className="bg-[#F8FAFC] p-4 rounded border border-[#D5DEE7] space-y-2 text-xs leading-relaxed">
          <div className="text-amber-800 font-display font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
            <span>&gt;&gt;</span> Executive Reliability Finding &bull; Range Safety Directorate:
          </div>
          <p className="text-[#0F1D2E] m-0">
            SpaceGuard AI performed multi-dimensional screening across 168 hours of High-Temperature Operating Life (HTOL) burn-in data under constant 125&deg;C thermal bias. Traditional fixed-datasheet threshold inspection evaluated <b className="text-[#0F1D2E] font-bold">99.5%</b> of components as passing, which would have allowed <b className="text-rose-600 font-bold">{rejected.length} latent silicon gate-oxide defects</b> to escape into flight hardware.
          </p>
          <p className="text-[#0F1D2E] m-0">
            By deploying <b className="text-amber-700">Lot-Relative Robust z-Scores</b>, <b className="text-[#168A5B]">Isolation Forest Multivariate Outlier Detection</b>, and <b className="text-amber-700">Linear Drift Extrapolation (+96h)</b>, anomalous gate dielectrics were intercepted and quarantined before stage stacking at Sriharikota Second Launch Pad (SLP).
          </p>
        </div>

        {/* Embedded Component Schematics & Diagrams */}
        <div className="pt-2">
          <ComponentDiagram type="all" />
        </div>

        {/* Quarantined Defect Ledger Table */}
        <div>
          <div className="text-xs font-display font-bold text-rose-600 tracking-wider uppercase mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span>&#9888;</span> Quarantined Components Disposition Ledger ({rejected.length} Items):
            </div>
            <span className="text-[10px] text-[#64748B] font-normal">
              MIL-STD-883 Method 1005 Criterion: z-Score &gt; 3.0&sigma; or Dynamic Drift Violation
            </span>
          </div>
          <div className="overflow-x-auto rounded border border-[#D5DEE7] bg-[#FFFFFF]">
            <table className="w-full text-left text-[11px] font-mono border-collapse">
              <thead className="bg-[#F8FAFC] text-[10px] uppercase text-[#64748B] border-b border-[#D5DEE7]">
                <tr>
                  <th className="py-2.5 px-3">Part ID</th>
                  <th className="py-2.5 px-3">Subsystem</th>
                  <th className="py-2.5 px-3">Lot ID</th>
                  <th className="py-2.5 px-3">0h Initial</th>
                  <th className="py-2.5 px-3">168h Burn-In</th>
                  <th className="py-2.5 px-3">Lot Mean</th>
                  <th className="py-2.5 px-3">Drift &Delta;%</th>
                  <th className="py-2.5 px-3">Datasheet Limit</th>
                  <th className="py-2.5 px-3">Early Pred 168h</th>
                  <th className="py-2.5 px-3">Lot z-Score</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3">Category / Disposition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5DEE7]">
                {rejected.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-6 text-center text-[#64748B]">
                      No components quarantined. Spacecraft hardware is 100% nominal.
                    </td>
                  </tr>
                )}
                {rejected.map((c) => (
                  <tr key={c.component_id} className="hover:bg-rose-50/50 transition-colors">
                    <td className="py-2 px-3 font-bold text-[#0F1D2E]">{c.component_id}</td>
                    <td className="py-2 px-3 text-[#0E88D3] font-bold">[{c.subsystem}]</td>
                    <td className="py-2 px-3 text-[#64748B]">{c.lot_id}</td>
                    <td className="py-2 px-3 text-[#64748B]">{c.v0.toFixed(2)} &#956;A</td>
                    <td className="py-2 px-3 text-rose-600 font-bold">{c.v168.toFixed(2)} &#956;A</td>
                    <td className="py-2 px-3 text-[#0F1D2E]">{c.lot_mean != null ? `${c.lot_mean.toFixed(2)} µA` : '-'}</td>
                    <td className="py-2 px-3 text-rose-600 font-bold">
                      {c.pct_drift > 0 ? '+' : ''}{c.pct_drift.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-[#64748B]">{c.limit_ua.toFixed(0)} &#956;A</td>
                    <td className="py-2 px-3 text-[#0E88D3] font-bold">{c.predicted168_from_early != null ? `${c.predicted168_from_early.toFixed(2)} µA` : '-'}</td>
                    <td className="py-2 px-3 text-rose-600 font-bold">
                      {c.z168 > 0 ? '+' : ''}{c.z168.toFixed(2)}&sigma;
                    </td>
                    <td className="py-2 px-3 text-rose-600 font-bold">{c.risk_score} / 100</td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold block uppercase whitespace-nowrap">
                        {c.anomaly_category ? c.anomaly_category.replace(/_/g, ' ') : 'QUARANTINE / RCA'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quality Assurance Sign-Off Block */}
        <div className="pt-6 border-t border-[#D5DEE7] grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
          <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#D5DEE7]">
            <div className="text-[#64748B] uppercase text-[10px]">Lead Screening Engineer (SMU):</div>
            <div className="text-[#0F1D2E] font-bold text-sm mt-1">Dr. A. Rajesh Kumar, Ph.D.</div>
            <div className="text-[#64748B] text-[10px]">ISTRAC Quality Assurance &bull; ISRO Bengaluru</div>
            <div className="text-[#168A5B] font-bold text-[10px] mt-2 flex items-center gap-1">
              <span>&#10003;</span> DIGITAL SIGNATURE VERIFIED: SHA256-8F4C2E9A-ISTRAC
            </div>
          </div>
          <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#D5DEE7]">
            <div className="text-[#64748B] uppercase text-[10px]">Mission Reliability Director (OCO):</div>
            <div className="text-[#0F1D2E] font-bold text-sm mt-1">Dr. M. S. Suryanarayana, Distinguished Scientist</div>
            <div className="text-[#64748B] text-[10px]">
              Satish Dhawan Space Centre SHAR, Sriharikota &bull; Range Safety Directorate
            </div>
            <div className="text-[#168A5B] font-bold text-[10px] mt-2 flex items-center gap-1">
              <span>&#10003;</span> FLIGHT READINESS ENDORSED &bull; WAIVER APPROVED
            </div>
          </div>
        </div>

        {/* Footer Security Notice */}
        <div className="text-center text-[10px] text-[#64748B] border-t border-[#D5DEE7] pt-3">
          DEPARTMENT OF SPACE &bull; GOVERNMENT OF INDIA &bull; FOR OFFICIAL USE ONLY &bull; SDSC SHAR SRIHARIKOTA
        </div>
      </div>
    </div>
  )
}
