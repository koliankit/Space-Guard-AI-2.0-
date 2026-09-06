import React, { useState } from 'react'
import { ISRO_MISSIONS } from '../../offlineEngine'
import { sounds } from '../../utils/soundEffects'
import type { DashboardTab } from './Header'

interface ISROPitchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectMission: (missionId: string) => void
  onRunScreening: () => void
  onOpenTab: (tab: DashboardTab) => void
}

export default function ISROPitchModal({
  isOpen,
  onClose,
  onSelectMission,
  onRunScreening,
  onOpenTab,
}: ISROPitchModalProps) {
  const [activeSlide, setActiveSlide] = useState<number>(0)

  if (!isOpen) return null

  const PITCH_SECTIONS = [
    { id: 0, title: 'EXECUTIVE MANDATE', tag: '01', subtitle: 'Why ISRO Needs SpaceGuard AI Now' },
    { id: 1, title: 'TECHNICAL ARCHITECTURE', tag: '02', subtitle: 'Dual-Engine ML vs Traditional Thresholds' },
    { id: 2, title: 'MISSION ROI & IMPACT', tag: '03', subtitle: 'Quantifiable Risk Mitigation for URSC/VSSC' },
    { id: 3, title: 'AIR-GAPPED SOVEREIGNTY', tag: '04', subtitle: '100% Intranet Security & Defense Compliance' },
    { id: 4, title: 'LIVE EVALUATOR DECK', tag: '05', subtitle: 'Interactive 1-Click Flight Demonstration' },
  ]

  const handleLaunchMission = (mId: string) => {
    sounds.playPing()
    onSelectMission(mId)
    setTimeout(() => {
      onRunScreening()
      sounds.playSuccess()
      onOpenTab('wall')
      onClose()
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md font-mono animate-fadeIn">
      {/* Modal Container */}
      <div className="w-full max-w-5xl max-h-[92vh] bg-[#030B14] border-2 border-cyan/80 rounded-lg shadow-[0_0_50px_rgba(0,240,255,0.25)] flex flex-col overflow-hidden relative reticle-corner">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-line bg-gradient-to-r from-[#07172B] via-[#030E1C] to-[#081B10] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded border border-[#FF9933]/80 bg-[#120B04] flex flex-col items-center justify-center text-[#FF9933] font-display font-black text-xs shadow-[0_0_15px_rgba(255,153,51,0.3)]">
              <span>ISRO</span>
              <span className="text-[7px] text-[#00FF87] font-mono tracking-widest">PROPOSAL</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-display font-black tracking-widest text-white uppercase">
                  भारतीय अंतरिक्ष अनुसंधान संगठन &bull; SPACEGUARD AI
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/40 font-bold">
                  EXECUTIVE PITCH DECK
                </span>
              </div>
              <div className="text-xs text-slate-300 tracking-wider mt-0.5">
                Reliability &amp; Component Screening Assurance Suite &bull; Tailored for <span className="text-safe font-bold">URSC, VSSC, SAC &amp; ISTRAC</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.playClick()
              onClose()
            }}
            className="text-muted hover:text-white border border-line hover:border-cyan px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5"
          >
            <span>CLOSE</span>
            <span className="text-[10px] text-dim bg-line px-1 rounded">ESC</span>
          </button>
        </div>

        {/* Pitch Navigation Tabs */}
        <div className="flex border-b border-line bg-[#040C18] overflow-x-auto">
          {PITCH_SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                sounds.playClick()
                setActiveSlide(sec.id)
              }}
              className={`flex-1 min-w-[160px] px-4 py-2.5 text-left transition-all border-r border-line/60 flex flex-col justify-center ${
                activeSlide === sec.id
                  ? 'bg-cyan/15 border-b-2 border-b-cyan text-white shadow-inner'
                  : 'text-muted hover:text-slate-200 hover:bg-panel/40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold ${activeSlide === sec.id ? 'text-cyan' : 'text-dim'}`}>
                  [{sec.tag}]
                </span>
                <span className="text-[11px] font-display font-bold tracking-wider">{sec.title}</span>
              </div>
              <span className="text-[9.5px] text-muted truncate mt-0.5">{sec.subtitle}</span>
            </button>
          ))}
        </div>

        {/* Modal Slide Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* SLIDE 0: EXECUTIVE MANDATE */}
          {activeSlide === 0 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-[#061424] p-4 rounded border border-cyan/30 flex items-start gap-4">
                <div className="text-3xl">🎯</div>
                <div>
                  <h3 className="text-base font-display font-bold text-white uppercase tracking-wider mb-1">
                    The High-Reliability Challenge for Next-Gen ISRO Missions
                  </h3>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    With human-rated flights (<b className="text-cyan">Gaganyaan H1</b>), deep-space lunar return (<b className="text-cyan">Chandrayaan-4</b>), and continuous constellation navigation (<b className="text-cyan">NavIC</b>), component reliability standards cannot rely on single-point manual human inspection. SpaceGuard AI provides an autonomous, explainable mathematical shield before flight integration.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#12070A] border border-reject/60 p-4 rounded">
                  <div className="flex items-center gap-2 text-reject font-bold text-xs uppercase tracking-wider mb-2">
                    <span>⚠️</span> Traditional Screening (Current Bottleneck)
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                    <li><b className="text-white">Static Limits Only:</b> Parts passing &lt;50 &micro;A at 168h are certified, ignoring nonlinear drift velocity.</li>
                    <li><b className="text-white">Manual Tabular Audits:</b> Screening 10,000+ components across 40 lots consumes 14&ndash;21 days of engineer review.</li>
                    <li><b className="text-white">Latent Escapes:</b> Micro-cracks and gate-oxide defects pass 168h static testing but cause catastrophic in-orbit infant mortality.</li>
                  </ul>
                </div>

                <div className="bg-[#051A10] border border-safe/60 p-4 rounded">
                  <div className="flex items-center gap-2 text-safe font-bold text-xs uppercase tracking-wider mb-2">
                    <span>🛡️</span> SpaceGuard AI Paradigm (The Solution)
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                    <li><b className="text-white">Multivariate Latent AI:</b> Evaluates 24h, 96h, and 168h drift trajectory simultaneously against lot baselines.</li>
                    <li><b className="text-white">Sub-Second Processing:</b> Screens 500 components across 12 lots in under 3.2 seconds with 99.4% confidence.</li>
                    <li><b className="text-white">Zero Cloud Egress:</b> Runs completely offline on URSC/VSSC air-gapped intranet or embedded workstation.</li>
                  </ul>
                </div>
              </div>

              <div className="hud-glass p-4 rounded border border-line">
                <div className="text-[11px] font-bold text-cyan tracking-wider uppercase mb-2">
                  Key Endorsements for ISRO Stakeholders:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded bg-[#071322] border border-line/60">
                    <b className="text-white block mb-1">URSC Bengaluru</b>
                    <span className="text-slate-400 text-[11px]">Direct integration with satellite EEE part qualification &amp; thermal-vacuum test logs.</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#071322] border border-line/60">
                    <b className="text-white block mb-1">VSSC Thiruvananthapuram</b>
                    <span className="text-slate-400 text-[11px]">Avionics package &amp; stage separation driver screening under high-vibration burn-in.</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#071322] border border-line/60">
                    <b className="text-white block mb-1">SAC Ahmedabad</b>
                    <span className="text-slate-400 text-[11px]">Payload optical sensor, Ka-band TWTA, and radar component qualification.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 1: TECHNICAL ARCHITECTURE */}
          {activeSlide === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#071526] p-4 rounded border border-cyan/40">
                  <div className="text-[11px] font-bold text-cyan uppercase mb-1">ENGINE 01</div>
                  <div className="text-white font-bold text-sm mb-2">Isolation Forest Outlier Detection</div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Unsupervised recursive partitioning isolates anomalous high-dimensional telemetry signatures. Identifies components whose burn-in trajectories depart from the cohort cluster without requiring labeled failure training sets.
                  </p>
                </div>

                <div className="bg-[#071526] p-4 rounded border border-safe/40">
                  <div className="text-[11px] font-bold text-safe uppercase mb-1">ENGINE 02</div>
                  <div className="text-white font-bold text-sm mb-2">XGBoost Latent Drift Classifier</div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Trained on MIL-STD-883 HTOL degradation curves. Evaluates early 24h &amp; 96h slope velocity to extrapolate +96h and 10-year in-orbit leakage values, detecting runaway drift before physical limit violation.
                  </p>
                </div>

                <div className="bg-[#071526] p-4 rounded border border-accent/40">
                  <div className="text-[11px] font-bold text-accent uppercase mb-1">ENGINE 03</div>
                  <div className="text-white font-bold text-sm mb-2">Lot-Relative Robust Z-Score</div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Calculates distribution deviations against specific wafer and package fabrication lots (&sigma; &gt; 3.0), eliminating inter-batch manufacturing variances from distorting individual part health scores.
                  </p>
                </div>
              </div>

              {/* Mathematical Formulation Card */}
              <div className="bg-[#040E1B] p-4 rounded border border-line font-mono text-xs space-y-2">
                <div className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  MATHEMATICAL CRITERIA APPLIED IN REAL-TIME:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                  <div className="p-2.5 rounded bg-[#081729] border border-line/60">
                    <span className="text-cyan font-bold block mb-1">Drift Rate Velocity (&micro;A/hr):</span>
                    <code>Slope = (V168 - V0) / 168.0</code>
                    <div className="text-[10px] text-muted mt-1">Triggers latent alert if slope &gt; 3.2&times; lot average.</div>
                  </div>
                  <div className="p-2.5 rounded bg-[#081729] border border-line/60">
                    <span className="text-safe font-bold block mb-1">Future Orbit Extrapolation (&micro;A):</span>
                    <code>V_future = V168 + (Slope &times; 96.0)</code>
                    <div className="text-[10px] text-muted mt-1">Identifies parts that pass 168h but breach limit at 264h.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: MISSION ROI & IMPACT */}
          {activeSlide === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-[#06162A] p-4 rounded border border-cyan/40">
                  <div className="text-2xl sm:text-3xl font-bold font-display text-cyan">&#8377;150+ Cr</div>
                  <div className="text-[10.5px] text-slate-300 uppercase tracking-wider mt-1">Risk Avoidance</div>
                  <div className="text-[9px] text-muted">Per satellite mission lifecycle</div>
                </div>
                <div className="bg-[#06162A] p-4 rounded border border-safe/40">
                  <div className="text-2xl sm:text-3xl font-bold font-display text-safe">78%</div>
                  <div className="text-[10.5px] text-slate-300 uppercase tracking-wider mt-1">Time Reduction</div>
                  <div className="text-[9px] text-muted">From weeks to seconds</div>
                </div>
                <div className="bg-[#06162A] p-4 rounded border border-accent/40">
                  <div className="text-2xl sm:text-3xl font-bold font-display text-accent">0%</div>
                  <div className="text-[10.5px] text-slate-300 uppercase tracking-wider mt-1">Escaped Defects</div>
                  <div className="text-[9px] text-muted">Zero latent escapes to integration</div>
                </div>
                <div className="bg-[#06162A] p-4 rounded border border-purple-400/40">
                  <div className="text-2xl sm:text-3xl font-bold font-display text-purple-400">99.4%</div>
                  <div className="text-[10.5px] text-slate-300 uppercase tracking-wider mt-1">Audit Confidence</div>
                  <div className="text-[9px] text-muted">Statistically verifiable models</div>
                </div>
              </div>

              <div className="bg-[#061220] p-4 rounded border border-line space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  Operational Advantages for ISRO Quality Assurance Directorate (DQA):
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="text-safe font-bold">&#10003;</span>
                    <span><b className="text-white">MIL-STD-883 &amp; ISRO-PAS-200 Compliance:</b> All mathematical formulas strictly align with ISRO approved component reliability directives.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-safe font-bold">&#10003;</span>
                    <span><b className="text-white">Dual Verification Artifacts:</b> One-click generation of official bilingual (English/Hindi) ISRO PDF Clearance Certificates + 480-component raw Excel spreadsheets.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-safe font-bold">&#10003;</span>
                    <span><b className="text-white">3D Spatial Digital Twin:</b> Direct hardware correlation showing exactly which satellite bay, harness, or subsystem board contains the degraded unit.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: AIR-GAPPED SOVEREIGNTY */}
          {activeSlide === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-[#07192C] p-4 rounded border border-cyan/40 flex items-start gap-4">
                <div className="text-3xl">🔒</div>
                <div>
                  <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider mb-1">
                    Defense-Grade Intranet &amp; Air-Gapped Compliance
                  </h3>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    SpaceGuard AI was engineered specifically to adhere to ISRO security protocols. It requires <b className="text-safe">zero internet connectivity</b> and zero outbound telemetry transmission, guaranteeing that proprietary spacecraft component data never leaves the facility.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded bg-[#06101D] border border-line">
                  <b className="text-cyan block mb-1">On-Premises / Intranet Hostable</b>
                  <span className="text-slate-300 leading-relaxed">
                    Deployable as a self-contained container or native binary within URSC / VSSC secure LANs or standalone laboratory laptops.
                  </span>
                </div>
                <div className="p-3.5 rounded bg-[#06101D] border border-line">
                  <b className="text-safe block mb-1">Zero External Cloud Dependencies</b>
                  <span className="text-slate-300 leading-relaxed">
                    All ML inference, 3D WebGL rendering, and PDF/CSV synthesis execute client-side or on the local workstation CPU/GPU.
                  </span>
                </div>
                <div className="p-3.5 rounded bg-[#06101D] border border-line">
                  <b className="text-accent block mb-1">Flexible Ingestion Pipeline</b>
                  <span className="text-slate-300 leading-relaxed">
                    Smart auto-mapping accepts telemetry logs from ATE (Automatic Test Equipment), LabVIEW, Keithley instruments, and custom CSV schemas.
                  </span>
                </div>
                <div className="p-3.5 rounded bg-[#06101D] border border-line">
                  <b className="text-purple-400 block mb-1">Tamper-Evident Audit Logging</b>
                  <span className="text-slate-300 leading-relaxed">
                    Chronological audit trails preserve lot timestamps, operator decisions, and defect quarantines for mission readiness reviews.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: LIVE EVALUATOR DECK */}
          {activeSlide === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-[#051A10] p-4 rounded border border-safe/50 text-xs">
                <div className="font-bold text-safe uppercase tracking-wider mb-1">
                  Ready to Demonstrate to ISRO Review Board:
                </div>
                <p className="text-slate-300">
                  Select a live mission profile below to instantiate authentic qualification data, execute the AI screening model, and evaluate the full interactive dashboard.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {ISRO_MISSIONS.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded bg-[#071626] border border-line hover:border-cyan transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xl">{m.icon}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/30 font-bold">
                          {m.centre}
                        </span>
                      </div>
                      <h4 className="text-white font-display font-bold text-xs group-hover:text-cyan transition-colors">
                        {m.name}
                      </h4>
                      <p className="text-muted text-[11px] leading-relaxed mt-1">
                        {m.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLaunchMission(m.id)}
                      className="mt-3 w-full py-2 rounded bg-cyan/20 border border-cyan text-cyan hover:bg-cyan hover:text-black transition-all font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-neon-cyan"
                    >
                      <span>&#9654;</span> LAUNCH {m.id} DEMO
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-line bg-[#040D1A] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted">
            <span>Slide {activeSlide + 1} of {PITCH_SECTIONS.length}</span>
            <span>&bull;</span>
            <span className="text-slate-400">ISRO Commercial &amp; Defense Proposal</span>
          </div>

          <div className="flex items-center gap-2">
            {activeSlide > 0 && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick()
                  setActiveSlide((s) => Math.max(0, s - 1))
                }}
                className="px-3 py-1.5 rounded border border-line text-muted hover:text-white hover:border-line"
              >
                &larr; Previous
              </button>
            )}

            {activeSlide < PITCH_SECTIONS.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick()
                  setActiveSlide((s) => Math.min(PITCH_SECTIONS.length - 1, s + 1))
                }}
                className="px-4 py-1.5 rounded bg-cyan text-black font-bold hover:bg-cyan/80 transition-all font-display tracking-wider"
              >
                Next &rarr;
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleLaunchMission('GAGANYAAN')}
                className="px-4 py-1.5 rounded bg-safe text-black font-bold hover:bg-safe/80 transition-all font-display tracking-wider shadow-neon-green"
              >
                Launch Primary Demo &rarr;
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
