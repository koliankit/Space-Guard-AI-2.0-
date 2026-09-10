import { useEffect, useState } from 'react'

interface GroundStation {
  name: string
  code: string
  lat: number
  lon: number
  country: string
  status: 'ACTIVE' | 'ACQUIRING' | 'STANDBY'
  elevation: number
  azimuth: number
}

const GROUND_STATIONS: GroundStation[] = [
  { name: 'Bengaluru (ISTRAC HQ)', code: 'BLR-NOCC', lat: 12.97, lon: 77.59, country: 'India', status: 'ACTIVE', elevation: 62.4, azimuth: 145.2 },
  { name: 'Sriharikota (SDSC SHAR)', code: 'SHAR-01', lat: 13.72, lon: 80.23, country: 'India', status: 'ACTIVE', elevation: 71.8, azimuth: 112.4 },
  { name: 'Port Blair', code: 'PBL-02', lat: 11.62, lon: 92.72, country: 'India', status: 'ACQUIRING', elevation: 34.1, azimuth: 98.7 },
  { name: 'Mauritius', code: 'MAU-03', lat: -20.34, lon: 57.55, country: 'Mauritius', status: 'STANDBY', elevation: 0.0, azimuth: 210.5 },
  { name: 'Brunei', code: 'BRN-04', lat: 4.53, lon: 114.72, country: 'Brunei', status: 'STANDBY', elevation: 0.0, azimuth: 84.1 },
  { name: 'Biak', code: 'BIK-05', lat: -0.99, lon: 136.08, country: 'Indonesia', status: 'STANDBY', elevation: 0.0, azimuth: 112.0 },
  { name: 'Svalbard', code: 'SVL-06', lat: 78.22, lon: 15.65, country: 'Norway', status: 'STANDBY', elevation: 0.0, azimuth: 340.2 },
]

export default function OrbitalTrackingView() {
  const [telemetryTick, setTelemetryTick] = useState(14820)
  const [currentLat, setCurrentLat] = useState(14.2)
  const [currentLon, setCurrentLon] = useState(78.5)

  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetryTick((t) => t + 1)
      setCurrentLat((lat) => {
        const next = lat + 0.04
        return next > 80 ? -80 : next
      })
      setCurrentLon((lon) => {
        const next = lon + 0.06
        return next > 180 ? -180 : next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col flex-1 p-4 sm:p-5 bg-[#060B16] font-mono select-none overflow-y-auto text-slate-100 w-full">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="m-0 text-sm font-display font-black tracking-widest text-slate-100 uppercase">
              ISRO TELEMETRY, TRACKING AND COMMAND NETWORK (ISTRAC)
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold">
              LEO 520KM &bull; POLAR SUN-SYNCHRONOUS
            </span>
          </div>
          <div className="text-[10px] text-slate-400 tracking-wider mt-0.5">
            Spacecraft: <span className="text-slate-100 font-bold">SPACEGUARD-1</span> &bull; Ground Station Downlink Lock &bull; Real-time Doppler &amp; Orbit Pass Geometry
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-2.5 text-xs">
          <div className="hud-glass px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 dot-pulse" />
            <span className="text-slate-400">CARRIER:</span>
            <span className="text-amber-400 font-bold">LOCKED (S/X-BAND)</span>
          </div>
          <div className="hud-glass px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">SNR:</span>
            <span className="text-emerald-400 font-bold">19.4 dB</span>
          </div>
          <div className="hud-glass px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">BER:</span>
            <span className="text-amber-300 font-bold">3.8 &times; 10&minus;8</span>
          </div>
        </div>
      </div>

      {/* Grid: Orbital Map (2/3) + Real-Time Telemetry Stream (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Large Global Ground Track Radar */}
        <div className="lg:col-span-2 bg-[#0A1020] p-4 rounded-xl border border-slate-800 shadow-md flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-display font-bold text-amber-400 tracking-wider uppercase flex items-center gap-2">
              <span className="text-amber-400">&gt;&gt;</span> Global Ground Station Footprint &amp; Sub-Satellite Track
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              LAT: <span className="text-slate-100 font-bold">{currentLat.toFixed(2)}&deg; N</span> &bull; LON:{' '}
              <span className="text-slate-100 font-bold">{currentLon.toFixed(2)}&deg; E</span>
            </div>
          </div>

          <div className="relative h-[290px] bg-[#060B16] rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
            {/* World Map SVG Canvas */}
            <svg viewBox="0 0 720 360" className="w-full h-full block">
              {/* Latitude & Longitude Gridlines */}
              {[-60, -30, 0, 30, 60].map((lat) => {
                const y = 180 - (lat / 90) * 180
                return (
                  <line
                    key={lat}
                    x1="0"
                    y1={y}
                    x2="720"
                    y2={y}
                    stroke="#1E293B"
                    strokeWidth="0.8"
                    strokeDasharray="4,4"
                  />
                )
              })}
              {[-120, -60, 0, 60, 120].map((lon) => {
                const x = 360 + (lon / 180) * 360
                return (
                  <line
                    key={lon}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="360"
                    stroke="#1E293B"
                    strokeWidth="0.8"
                    strokeDasharray="4,4"
                  />
                )
              })}

              {/* Equator & Prime Meridian Highlight */}
              <line x1="0" y1="180" x2="720" y2="180" stroke="#334155" strokeWidth="1.2" />
              <line x1="360" y1="0" x2="360" y2="360" stroke="#334155" strokeWidth="1.2" />

              {/* Stylized Continents Outlines in Deep Slate */}
              {/* Asia & India */}
              <path
                d="M 460 70 L 520 80 L 550 110 L 515 150 L 490 200 L 470 170 L 450 120 Z"
                fill="#0F1C30"
                stroke="#1E3456"
                strokeWidth="1"
              />
              {/* Africa */}
              <path
                d="M 340 120 L 400 130 L 420 180 L 390 250 L 360 270 L 330 190 Z"
                fill="#0F1C30"
                stroke="#1E3456"
                strokeWidth="1"
              />
              {/* Europe */}
              <path
                d="M 350 70 L 420 60 L 440 100 L 360 110 Z"
                fill="#0F1C30"
                stroke="#1E3456"
                strokeWidth="1"
              />
              {/* Americas */}
              <path
                d="M 160 60 L 220 70 L 200 140 L 150 120 Z"
                fill="#0F1C30"
                stroke="#1E3456"
                strokeWidth="1"
              />
              <path
                d="M 220 170 L 270 200 L 250 290 L 210 240 Z"
                fill="#0F1C30"
                stroke="#1E3456"
                strokeWidth="1"
              />
              {/* Australia */}
              <path
                d="M 570 230 L 640 240 L 620 290 L 560 280 Z"
                fill="#0F1C30"
                stroke="#1E3456"
                strokeWidth="1"
              />

              {/* Ground Stations on Map */}
              {GROUND_STATIONS.map((gs) => {
                const cx = 360 + (gs.lon / 180) * 360
                const cy = 180 - (gs.lat / 90) * 180
                const isActive = gs.status === 'ACTIVE'
                return (
                  <g key={gs.code}>
                    {/* Coverage circle radius */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="45"
                      fill={isActive ? '#F59E0B' : '#334155'}
                      fillOpacity={isActive ? '0.12' : '0.04'}
                      stroke={isActive ? '#F59E0B' : '#475569'}
                      strokeWidth="1"
                      strokeDasharray={isActive ? 'none' : '3,3'}
                    />
                    {/* Station marker */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="3.5"
                      fill={isActive ? '#F59E0B' : '#64748B'}
                      stroke="#060B16"
                      strokeWidth="1"
                    />
                    <text
                      x={cx}
                      y={cy - 7}
                      textAnchor="middle"
                      className={`text-[8px] font-mono font-bold ${
                        isActive ? 'fill-amber-400' : 'fill-slate-500'
                      }`}
                    >
                      {gs.code}
                    </text>
                  </g>
                )
              })}

              {/* Current Satellite Sub-point position */}
              {(() => {
                const satX = 360 + (currentLon / 180) * 360
                const satY = 180 - (currentLat / 90) * 180
                return (
                  <g>
                    {/* Orbital path projection in Amber/Gold */}
                    <path
                      d="M 0 120 Q 180 40 360 180 T 720 220"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="1.5"
                      strokeDasharray="6,4"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="40"
                        to="0"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </path>

                    {/* Target reticle beacon */}
                    <circle cx={satX} cy={satY} r="7" fill="none" stroke="#10B981" strokeWidth="1.5">
                      <animate attributeName="r" values="5;10;5" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={satX} cy={satY} r="3" fill="#10B981" />

                    {/* Radio beam to Bengaluru ISTRAC */}
                    <line
                      x1={satX}
                      y1={satY}
                      x2={360 + (77.59 / 180) * 360}
                      y2={180 - (12.97 / 90) * 180}
                      stroke="#38A3FF"
                      strokeWidth="1.5"
                      strokeDasharray="4,2"
                    />

                    <text
                      x={satX}
                      y={satY - 12}
                      textAnchor="middle"
                      className="fill-white font-mono text-[9px] font-bold"
                    >
                      SPACEGUARD-1
                    </text>
                  </g>
                )
              })()}
            </svg>
          </div>
        </div>

        {/* Real-time Telemetry Stream & Doppler Parameters */}
        <div className="bg-[#0A1020] p-4 rounded-xl border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="text-xs font-display font-bold text-amber-400 tracking-wider uppercase mb-3 flex items-center gap-2">
              <span className="text-amber-400">&gt;&gt;</span> Orbital Mechanics Telemetry
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-dashed border-slate-800">
                <span className="text-slate-400">Orbit Class:</span>
                <span className="text-slate-100 font-bold">Sun-Synchronous LEO (SSO)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-800">
                <span className="text-slate-400">Mean Altitude:</span>
                <span className="text-amber-300 font-bold">520.42 km</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-800">
                <span className="text-slate-400">Orbital Velocity:</span>
                <span className="text-slate-100 font-bold">7.612 km/s (27,403 km/h)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-800">
                <span className="text-slate-400">Inclination:</span>
                <span className="text-slate-100 font-bold">97.48&deg;</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-800">
                <span className="text-slate-400">Orbital Period:</span>
                <span className="text-slate-100 font-bold">95.02 min</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-800">
                <span className="text-slate-400">Apogee / Perigee:</span>
                <span className="text-slate-100 font-bold">524.1 km / 516.8 km</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-800">
                <span className="text-slate-400">Doppler Shift:</span>
                <span className="text-emerald-400 font-bold">+18.42 kHz</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-800">
                <span className="text-slate-400">Downlink Packets:</span>
                <span className="text-amber-300 font-bold">PKT #{telemetryTick}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Frame Sync Status:</span>
                <span className="text-emerald-400 font-bold">LOCKED &bull; 0 CRC ERR</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-lg bg-[#0F172A] border border-amber-500/30 text-[10px]">
            <div className="text-amber-400 font-bold mb-1 uppercase">Next Ground Station Pass:</div>
            <div className="text-slate-200">
              <b>Bengaluru ISTRAC NOCC</b> &bull; AOS in <span className="text-emerald-400 font-bold">04m 18s</span> &bull; Max Elevation: 74&deg;
            </div>
          </div>
        </div>
      </div>

      {/* Ground Station Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0A1020] p-4 shadow-md">
        <div className="text-xs font-display font-bold text-amber-400 tracking-wider uppercase mb-3">
          ISTRAC Ground Network Status
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
          {GROUND_STATIONS.map((gs) => (
            <div
              key={gs.code}
              className={`p-2.5 rounded-lg border font-mono text-[10.5px] transition-all ${
                gs.status === 'ACTIVE'
                  ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-sm'
                  : gs.status === 'ACQUIRING'
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                  : 'bg-[#070D1A] border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>{gs.code}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    gs.status === 'ACTIVE'
                      ? 'bg-amber-400'
                      : gs.status === 'ACQUIRING'
                      ? 'bg-emerald-400'
                      : 'bg-slate-600'
                  }`}
                />
              </div>
              <div className="truncate text-[9.5px] mt-0.5 text-slate-300">{gs.name}</div>
              <div className="text-[9px] text-slate-400 mt-1">
                EL: {gs.elevation.toFixed(1)}&deg; &bull; AZ: {gs.azimuth.toFixed(0)}&deg;
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
