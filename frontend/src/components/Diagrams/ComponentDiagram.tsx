import React from 'react'

interface ComponentDiagramProps {
  type?: 'avionics' | 'htol' | 'all'
  className?: string
}

export default function ComponentDiagram({ type = 'all', className = '' }: ComponentDiagramProps) {
  return (
    <div className={`flex flex-col gap-4 font-mono select-none ${className}`}>
      {(type === 'avionics' || type === 'all') && (
        <div className="rounded-xl border border-slate-800 bg-[#0A1020] p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-display font-bold tracking-wider text-slate-100 uppercase">
                DIAGRAM 1: SPACEGUARD-1 AVIONICS &amp; SUBSYSTEM INTERCONNECT BUS
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
              ISRO-SPEC-DWG-0419-REV-C
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 760 260"
              className="w-full min-w-[700px] h-auto text-slate-200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background Grid Pattern */}
              <defs>
                <pattern id="diag-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1E293B" strokeWidth="0.5" />
                </pattern>
                <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#0B1120" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="safeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0B1120" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="rejectGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0B1120" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              <rect width="760" height="260" fill="#070D1A" rx="6" />
              <rect width="760" height="260" fill="url(#diag-grid)" rx="6" />

              {/* CENTRAL SPACECRAFT MIL-STD-1553B / CAN BUS */}
              <path
                d="M 60 130 L 700 130"
                stroke="#F59E0B"
                strokeWidth="3"
                strokeDasharray="6 3"
              />
              <text x="380" y="122" fill="#F59E0B" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                ISRO DUAL-REDUNDANT MIL-STD-1553B SYSTEM AVIONICS DATA BUS
              </text>

              {/* 1. POWER SUBSYSTEM (PCDU) */}
              <g transform="translate(40, 20)">
                <rect width="130" height="75" rx="4" fill="url(#safeGrad)" stroke="#10B981" strokeWidth="1.5" />
                <text x="65" y="22" fill="#10B981" fontSize="10" fontWeight="bold" textAnchor="middle">
                  PCDU [PWR]
                </text>
                <text x="65" y="37" fill="#94A3B8" fontSize="8.5" textAnchor="middle">
                  28V Regulated Bus
                </text>
                <text x="65" y="50" fill="#E2E8F0" fontSize="8" textAnchor="middle">
                  Solar Wing MPPT
                </text>
                <text x="65" y="63" fill="#10B981" fontSize="8" textAnchor="middle" fontWeight="bold">
                  STATUS: NOMINAL
                </text>
                <line x1="65" y1="75" x2="65" y2="110" stroke="#10B981" strokeWidth="1.5" />
                <circle cx="65" cy="110" r="3" fill="#10B981" />
              </g>

              {/* 2. FLIGHT COMPUTER (OBC) */}
              <g transform="translate(200, 20)">
                <rect width="150" height="75" rx="4" fill="url(#amberGrad)" stroke="#F59E0B" strokeWidth="1.5" />
                <text x="75" y="22" fill="#F59E0B" fontSize="10" fontWeight="bold" textAnchor="middle">
                  MAIN OBC [FC]
                </text>
                <text x="75" y="37" fill="#94A3B8" fontSize="8.5" textAnchor="middle">
                  SPARC V8 Dual-Core
                </text>
                <text x="75" y="50" fill="#E2E8F0" fontSize="8" textAnchor="middle">
                  Rad-Hard ASIC Engine
                </text>
                <text x="75" y="63" fill="#F59E0B" fontSize="8" textAnchor="middle" fontWeight="bold">
                  AI SCREEN: ACTIVE
                </text>
                <line x1="75" y1="75" x2="75" y2="110" stroke="#F59E0B" strokeWidth="1.5" />
                <circle cx="75" cy="110" r="3" fill="#F59E0B" />
              </g>

              {/* 3. S/X-BAND RF TELEMETRY (COMM) */}
              <g transform="translate(380, 20)">
                <rect width="140" height="75" rx="4" fill="url(#amberGrad)" stroke="#38A3FF" strokeWidth="1.5" />
                <text x="70" y="22" fill="#38A3FF" fontSize="10" fontWeight="bold" textAnchor="middle">
                  RF COMM [ISTRAC]
                </text>
                <text x="70" y="37" fill="#94A3B8" fontSize="8.5" textAnchor="middle">
                  S/X-Band Transponder
                </text>
                <text x="70" y="50" fill="#E2E8F0" fontSize="8" textAnchor="middle">
                  Ground Station DSN
                </text>
                <text x="70" y="63" fill="#10B981" fontSize="8" textAnchor="middle" fontWeight="bold">
                  LINK: LOCKED
                </text>
                <line x1="70" y1="75" x2="70" y2="110" stroke="#38A3FF" strokeWidth="1.5" />
                <circle cx="70" cy="110" r="3" fill="#38A3FF" />
              </g>

              {/* 4. AOCS & PROPULSION */}
              <g transform="translate(550, 20)">
                <rect width="150" height="75" rx="4" fill="url(#safeGrad)" stroke="#10B981" strokeWidth="1.5" />
                <text x="75" y="22" fill="#10B981" fontSize="10" fontWeight="bold" textAnchor="middle">
                  AOCS &amp; RCS [NAV]
                </text>
                <text x="75" y="37" fill="#94A3B8" fontSize="8.5" textAnchor="middle">
                  Star Trackers + IMU
                </text>
                <text x="75" y="50" fill="#E2E8F0" fontSize="8" textAnchor="middle">
                  Reaction Wheels (4x)
                </text>
                <text x="75" y="63" fill="#10B981" fontSize="8" textAnchor="middle" fontWeight="bold">
                  ATTITUDE: NOMINAL
                </text>
                <line x1="75" y1="75" x2="75" y2="110" stroke="#10B981" strokeWidth="1.5" />
                <circle cx="75" cy="110" r="3" fill="#10B981" />
              </g>

              {/* 5. QUARANTINED SILICON MODULE */}
              <g transform="translate(100, 160)">
                <rect width="160" height="75" rx="4" fill="url(#rejectGrad)" stroke="#EF4444" strokeWidth="1.5" />
                <line x1="80" y1="0" x2="80" y2="-30" stroke="#EF4444" strokeWidth="1.5" />
                <circle cx="80" cy="-30" r="3" fill="#EF4444" />
                <text x="80" y="22" fill="#EF4444" fontSize="10" fontWeight="bold" textAnchor="middle">
                  SILICON SCREENING
                </text>
                <text x="80" y="37" fill="#94A3B8" fontSize="8.5" textAnchor="middle">
                  HTOL 168H Chamber
                </text>
                <text x="80" y="50" fill="#E2E8F0" fontSize="8" textAnchor="middle">
                  Latent Defect Filter
                </text>
                <text x="80" y="63" fill="#EF4444" fontSize="8" textAnchor="middle" fontWeight="bold">
                  DEFECT QUARANTINE
                </text>
              </g>

              {/* 6. PAYLOAD INSTRUMENT BENCH */}
              <g transform="translate(300, 160)">
                <rect width="160" height="75" rx="4" fill="url(#amberGrad)" stroke="#F59E0B" strokeWidth="1.5" />
                <line x1="80" y1="0" x2="80" y2="-30" stroke="#F59E0B" strokeWidth="1.5" />
                <circle cx="80" cy="-30" r="3" fill="#F59E0B" />
                <text x="80" y="22" fill="#F59E0B" fontSize="10" fontWeight="bold" textAnchor="middle">
                  PAYLOAD [INSTR]
                </text>
                <text x="80" y="37" fill="#94A3B8" fontSize="8.5" textAnchor="middle">
                  Multi-Spectral Imager
                </text>
                <text x="80" y="50" fill="#E2E8F0" fontSize="8" textAnchor="middle">
                  Radiation Dosimeter
                </text>
                <text x="80" y="63" fill="#F59E0B" fontSize="8" textAnchor="middle" fontWeight="bold">
                  PRIMARY MISSION: GO
                </text>
              </g>

              {/* 7. THERMAL CONTROL (TCS) */}
              <g transform="translate(500, 160)">
                <rect width="140" height="75" rx="4" fill="url(#amberGrad)" stroke="#38A3FF" strokeWidth="1.5" />
                <line x1="70" y1="0" x2="70" y2="-30" stroke="#38A3FF" strokeWidth="1.5" />
                <circle cx="70" cy="-30" r="3" fill="#38A3FF" />
                <text x="70" y="22" fill="#38A3FF" fontSize="10" fontWeight="bold" textAnchor="middle">
                  THERMAL CONTROL
                </text>
                <text x="70" y="37" fill="#94A3B8" fontSize="8.5" textAnchor="middle">
                  Heat Pipes &amp; Louvers
                </text>
                <text x="70" y="50" fill="#E2E8F0" fontSize="8" textAnchor="middle">
                  Operational: -20&deg;C / +55&deg;C
                </text>
                <text x="70" y="63" fill="#10B981" fontSize="8" textAnchor="middle" fontWeight="bold">
                  HTOL CHAMBER: 125&deg;C
                </text>
              </g>
            </svg>
          </div>
        </div>
      )}

      {(type === 'htol' || type === 'all') && (
        <div className="rounded-xl border border-slate-800 bg-[#0A1020] p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-xs font-display font-bold tracking-wider text-slate-100 uppercase">
                DIAGRAM 2: MIL-STD-883 METHOD 1005 HTOL SILICON GATE-OXIDE TEST CIRCUIT
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 font-mono">
              IN-SITU LEAKAGE TELEMETRY ACQUISITION SCHEMATIC
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 760 210"
              className="w-full min-w-[700px] h-auto text-slate-200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="760" height="210" fill="#070D1A" rx="6" />

              {/* Stress Thermal Chamber Boundary */}
              <rect
                x="30"
                y="15"
                width="420"
                height="180"
                rx="6"
                fill="#0F172A"
                stroke="#EF4444"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
              <text x="45" y="35" fill="#EF4444" fontSize="9" fontWeight="bold" fontFamily="monospace">
                [HTOL BURN-IN OVEN: 125&deg;C CONSTANT &bull; 168 HOURS DURATION]
              </text>

              {/* Power Supply VDD rail */}
              <line x1="60" y1="65" x2="380" y2="65" stroke="#10B981" strokeWidth="2" />
              <circle cx="60" cy="65" r="4" fill="#10B981" />
              <text x="60" y="55" fill="#10B981" fontSize="9" fontWeight="bold">
                VDD (+3.30V &plusmn;0.01V)
              </text>

              {/* DUT Transistor Device Under Test */}
              <rect x="150" y="80" width="130" height="70" rx="4" fill="#0A1020" stroke="#10B981" strokeWidth="1.5" />
              <text x="215" y="102" fill="#10B981" fontSize="10" fontWeight="bold" textAnchor="middle">
                RAD-HARD CMOS DUT
              </text>
              <text x="215" y="117" fill="#94A3B8" fontSize="8" textAnchor="middle">
                Thin SiO2 Gate Dielectric
              </text>
              <text x="215" y="132" fill="#EF4444" fontSize="8" fontWeight="bold" textAnchor="middle">
                Latent Trap Defect Site
              </text>

              {/* Connection from VDD to DUT */}
              <line x1="215" y1="65" x2="215" y2="80" stroke="#10B981" strokeWidth="1.5" />

              {/* In-situ Precision Sensing Resistor Rsense */}
              <g transform="translate(320, 95)">
                <rect width="40" height="25" fill="#0A1020" stroke="#10B981" strokeWidth="1.5" />
                <text x="20" y="16" fill="#10B981" fontSize="8" fontWeight="bold" textAnchor="middle">
                  Rsense
                </text>
              </g>
              <line x1="280" y1="110" x2="320" y2="110" stroke="#10B981" strokeWidth="1.5" />
              <line x1="360" y1="110" x2="400" y2="110" stroke="#10B981" strokeWidth="1.5" />
              <line x1="400" y1="110" x2="400" y2="160" stroke="#10B981" strokeWidth="1.5" />
              <line x1="385" y1="160" x2="415" y2="160" stroke="#10B981" strokeWidth="2" />
              <line x1="390" y1="165" x2="410" y2="165" stroke="#10B981" strokeWidth="2" />
              <line x1="395" y1="170" x2="405" y2="170" stroke="#10B981" strokeWidth="2" />
              <text x="400" y="185" fill="#94A3B8" fontSize="8" textAnchor="middle">
                GND
              </text>

              {/* OUT OF CHAMBER: ISRO SpaceGuard AI Digitizer */}
              <g transform="translate(480, 25)">
                <rect width="250" height="160" rx="6" fill="#0A1020" stroke="#F59E0B" strokeWidth="1.5" />
                <text x="125" y="25" fill="#F59E0B" fontSize="10" fontWeight="bold" textAnchor="middle">
                  SPACEGUARD AI TELEMETRY DAQ
                </text>
                <text x="125" y="40" fill="#94A3B8" fontSize="8" textAnchor="middle">
                  24-Bit Sigma-Delta ADC Picoammeter
                </text>

                {/* Sub-blocks in DAQ */}
                <rect x="20" y="55" width="95" height="38" rx="3" fill="#070D1A" stroke="#F59E0B" strokeWidth="1" />
                <text x="67" y="72" fill="#F59E0B" fontSize="8" fontWeight="bold" textAnchor="middle">
                  Analog Front-End
                </text>
                <text x="67" y="84" fill="#94A3B8" fontSize="7" textAnchor="middle">
                  I_leak Sensing (&plusmn;0.05&mu;A)
                </text>

                <rect x="135" y="55" width="95" height="38" rx="3" fill="#070D1A" stroke="#F59E0B" strokeWidth="1" />
                <text x="182" y="72" fill="#F59E0B" fontSize="8" fontWeight="bold" textAnchor="middle">
                  Digital Filter
                </text>
                <text x="182" y="84" fill="#94A3B8" fontSize="7" textAnchor="middle">
                  0h / 48h / 96h / 168h
                </text>

                <rect x="20" y="105" width="210" height="42" rx="3" fill="#070D1A" stroke="#F59E0B" strokeWidth="1" />
                <text x="125" y="122" fill="#F59E0B" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                  ISRO AI SCREENING ENGINE
                </text>
                <text x="125" y="136" fill="#EF4444" fontSize="7.5" textAnchor="middle" fontWeight="bold">
                  Robust z-Score &bull; Isolation Forest &bull; Drift Vector
                </text>
              </g>

              {/* Sensing Leads */}
              <path
                d="M 340 95 L 340 70 L 480 70"
                stroke="#10B981"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
              <circle cx="340" cy="95" r="2.5" fill="#10B981" />
              <text x="410" y="64" fill="#10B981" fontSize="7.5" textAnchor="middle">
                Differential Tap (I_leak)
              </text>
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
