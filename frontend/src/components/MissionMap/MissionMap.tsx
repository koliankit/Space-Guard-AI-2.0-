export default function MissionMap({ critical }: { critical: boolean }) {
  const satCol = critical ? '#EF4444' : '#10B981'
  const beamCol = critical ? '#EF4444' : '#F59E0B'
  const coreCol = critical ? '#EF4444' : '#F59E0B'

  return (
    <div className="bg-[#0B1120] p-4 border-l border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-xs font-display font-bold tracking-wider uppercase text-amber-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Orbital Telemetry Ground Track
        </h3>
        <span className="font-mono text-[9px] text-slate-400">PASS #14 &bull; LEO 520KM</span>
      </div>

      <div className="relative h-[195px] bg-[#060B16] border border-slate-800 rounded-lg overflow-hidden">
        <div className="absolute top-2 left-2.5 font-mono text-[9px] text-slate-400 tracking-wider">
          ISRO / ISTRAC DSN TRACKING &bull; <span className="text-amber-400 font-bold">UPLINK SYNCHRONIZED</span>
        </div>

        <svg width="100%" height="100%" viewBox="0 0 300 195" className="block">
          <defs>
            <linearGradient id="map-orbit-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>

          {/* Earth Grid Coordinates */}
          <line x1="10" y1="95" x2="290" y2="95" stroke="#1E293B" strokeDasharray="3,3" />
          <line x1="150" y1="15" x2="150" y2="180" stroke="#1E293B" strokeDasharray="3,3" />

          {/* Continents stylized deep slate landmasses */}
          <rect x="35" y="45" width="45" height="30" fill="#0F1C30" rx="3" />
          <rect x="95" y="35" width="70" height="35" fill="#0F1C30" rx="3" />
          <rect x="180" y="40" width="85" height="45" fill="#0F1C30" rx="3" />
          <rect x="55" y="105" width="40" height="50" fill="#0F1C30" rx="3" />
          <rect x="120" y="90" width="45" height="45" fill="#0F1C30" rx="3" />
          <rect x="205" y="115" width="45" height="35" fill="#0F1C30" rx="3" />

          {/* DSN Ground Station */}
          <circle cx="55" cy="148" r="6" fill="#060B16" stroke="#F59E0B" strokeWidth="1.8" />
          <circle cx="55" cy="148" r="2.5" fill="#F59E0B" />
          <text x="55" y="170" textAnchor="middle" className="fill-amber-400 text-[8.5px] font-mono font-bold">
            SHAR GROUND
          </text>

          {/* Telemetry Radio Wave Uplink */}
          <path d="M 55 142 Q 145 25 245 55" fill="none" stroke={beamCol} strokeWidth="1.6" strokeDasharray="6,4">
            <animate attributeName="stroke-dashoffset" from="60" to="0" dur="1.8s" repeatCount="indefinite" />
          </path>

          {/* Satellite Orbit Footprint Circle */}
          <ellipse cx="245" cy="55" rx="22" ry="12" fill={satCol} fillOpacity="0.08" stroke={satCol} strokeWidth="0.8" strokeDasharray="2,2" />

          {/* Satellite Icon & Beacon */}
          <circle cx="245" cy="55" r="5" fill={satCol}>
            <animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <text x="245" y="38" textAnchor="middle" fill="#F8FAFC" className="text-[9px] font-mono font-bold">
            SPACEGUARD-1
          </text>

          {/* Downlink to AI Reliability Engine */}
          <path d="M 245 61 Q 220 115 150 132" fill="none" stroke={beamCol} strokeWidth="1.6" strokeDasharray="6,4">
            <animate attributeName="stroke-dashoffset" from="0" to="60" dur="1.8s" repeatCount="indefinite" />
          </path>

          <rect x="100" y="128" width="100" height="26" rx="3" fill="#0A1020" stroke={coreCol} strokeWidth="1.4" />
          <text x="150" y="145" textAnchor="middle" fill={coreCol} className="text-[8.5px] font-mono font-bold tracking-wider">
            AI SCREENING CORE
          </text>

          {critical && (
            <text x="150" y="180" textAnchor="middle" fontSize="9.5" fill="#EF4444" fontFamily="monospace" fontWeight="bold">
              &#9888; DEFECT DETECTED IN FLIGHT
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}
