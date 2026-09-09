import React, { useMemo } from 'react'
import type { ComponentOut } from '../../types'
import { sounds } from '../../utils/soundEffects'

interface ComponentDeepDiveAnalysisProps {
  component: ComponentOut | null
  onIsolateBus?: (componentId: string) => void
  onFailover?: (componentId: string) => void
  isIsolated?: boolean
  isFailover?: boolean
}

interface SubsystemDomainInfo {
  cause: string
  mechanism: string
  satelliteImpact: string
  missionConsequence: string
  improvement: string
  mitigation: string
}

const DOMAIN_KNOWLEDGE: Record<string, SubsystemDomainInfo> = {
  PWR: {
    cause: 'Latent gate-oxide dielectric breakdown and pinhole tunneling in SiC power MOSFET switches under sustained 125°C high-junction stress.',
    mechanism: 'Pre-existing wafer fab sub-micron gate oxide defects expand under thermal bias, elevating gate-to-source leakage and thermal impedance.',
    satelliteImpact: 'Direct threat to PCDU 28V main power distribution bus. Can trigger localized bus voltage drops (<22V) or catastrophic bus short-circuit.',
    missionConsequence: 'Cascading power brownout to downstream subsystems during solar eclipse exit; loss of flight computer power rail stability.',
    improvement: 'Reject component and quarantine lot. Mandate 100% rescreening under AEC-Q101 with pre-seal gate stress voltage elevated by +15%.',
    mitigation: 'Isolate primary PCDU power branch via Solid-State Power Controller (SSPC) and transfer spacecraft bus feed to redundant Shunt Regulator Bank B.',
  },
  FC: {
    cause: 'Interconnect electromigration and sub-threshold leakage rise in rad-hard ASIC DSP digital core logic cells.',
    mechanism: 'Thermal stress accelerates metallic void formation at via junctions, causing non-linear propagation delay and internal gate leakage divergence.',
    satelliteImpact: 'Loss of Onboard Computer (OBC) instruction execution cycle margins; timing jitter on Mil-Std-1553B avionics telemetry bus.',
    missionConsequence: 'Spontaneous processor watchdog resets in orbit; potential corruption of autonomous attitude control vectors and guidance routines.',
    improvement: 'Replace with hermetically qualified Level S microcircuit. Extend HTOL qualification burn-in duration from 168h to 240h for OBC flight batches.',
    mitigation: 'Execute autonomous avionics failover to Cold Backup Processor Core B. Reload flight control software image from rad-hard EEPROM bank.',
  },
  BAT: {
    cause: 'Micro-separator ceramic layer thinning and localized lithium dendrite propagation across secondary cell terminals.',
    mechanism: 'High-temperature burn-in accelerates internal parasitic side reactions, escalating self-discharge rate and parasitic shunt leakage.',
    satelliteImpact: 'Severe cell capacity imbalance across the 28V 8S2P battery pack; thermal dissipation spikes during rapid solar recharge cycles.',
    missionConsequence: 'Premature cell voltage collapse during 35-minute orbital eclipse passes; inability to sustain scientific payload power requirements.',
    improvement: 'Perform non-destructive high-resolution Electrochemical Impedance Spectroscopy (EIS). Tighten lot cell-matching delta tolerance to <0.8%.',
    mitigation: 'Bypass defective cell string via autonomous cell-balancing shunt switch. Lower peak charge voltage setpoint by 150mV to prevent thermal stress.',
  },
  SOLAR: {
    cause: 'Shunt resistance degradation across triple-junction InGaP/InGaAs/Ge photovoltaic cells and interconnect thermal fatigue.',
    mechanism: 'Thermal expansion mismatch creates micro-cracks across cell busbars, bleeding photogenerated current to satellite chassis ground.',
    satelliteImpact: 'Current mismatch on port solar wing string; localized thermal hotspot generation exceeding +95°C on rear honeycomb substrate.',
    missionConsequence: 'Loss of 12% to 18% total solar array power generation capacity; spacecraft enters persistent negative power budget in winter solstice.',
    improvement: 'Audit supplier wafer epitaxy quality. Introduce electroluminescence crack detection prior to multi-panel wing integration.',
    mitigation: 'Engage bypass protection diodes to isolate anomalous string. Adjust Solar Array Drive Mechanism (SADM) sun-tracking slew rates.',
  },
  COM: {
    cause: 'Gallium Arsenide (GaAs) High Electron Mobility Transistor (HEMT) gate Schottky barrier degradation in RF Low Noise Amplifier.',
    mechanism: 'Continuous 125°C bake promotes gate metal interdiffusion, shifting pinch-off voltage and elevating quiescent DC leakage current.',
    satelliteImpact: 'Degradation of S/X-band transponder receiver noise figure by +3.8 dB; carrier frequency tracking phase jitter.',
    missionConsequence: 'Degraded Ground Station uplink SNR; loss of telecommand synchronization during low-elevation ISTRAC pass windows.',
    improvement: 'Switch component source to space-qualified space-grade hermetic ceramic packaging. Implement 100% RF S-parameter burn-in testing.',
    mitigation: 'Switch active RF communications channel to redundant Traveling Wave Tube Amplifier (TWTA Channel B). Increase ground uplink power.',
  },
  TEL: {
    cause: 'Dielectric polarization relaxation in telemetry encoder timing capacitors and VCO varactor diode leakage creep.',
    mechanism: 'Non-linear capacitance drift under thermal stress shifts subcarrier modulator center frequency out of receiver passband.',
    satelliteImpact: 'Telemetry carrier phase noise and frame synchronization lock dropouts on the S-band omnidirectional downlink stream.',
    missionConsequence: 'Loss of real-time spacecraft health telemetry during critical orbital maneuvers and ground station transition passes.',
    improvement: 'Mandate temperature-compensated COG/NPO dielectric grade capacitors. Tighten frequency stability tolerance to ±5 ppm.',
    mitigation: 'Cross-strap telemetry stream to backup transponder transmitter. Command higher forward error correction (FEC) rate on downlink.',
  },
  NAV: {
    cause: 'Fiber Optic Gyro (FOG) photodetector dark current leakage accumulation and Star Tracker CMOS pixel sensitivity drift.',
    mechanism: 'Thermal migration of charge traps within detector depletion region increases quiescent dark current under continuous bake.',
    satelliteImpact: 'Autonomous attitude determination drift exceeding 0.08°/hour; star centroid identification false positives in AOCS processor.',
    missionConsequence: 'Loss of fine pointing accuracy (<0.02°) for payload imaging; spacecraft tumbles into Safe Sun-Acquisition recovery mode.',
    improvement: 'Rescreen optical sensor batches with cryogenic-to-high-temp thermal cycling. Reject components with dark current z-score > +2.0σ.',
    mitigation: 'Reconfigure AOCS Kalman filter to down-weight degraded gyro channel and rely on digital Sun Sensors and backup Star Tracker B.',
  },
  THM: {
    cause: 'Micro-strain elongation in Platinum Resistance Thermometer (RTD) sensing film and Kapton heater element trace degradation.',
    mechanism: 'Thermal-mechanical stress during HTOL cycling shifts nominal resistance baseline, causing systematic positive temperature calibration drift.',
    satelliteImpact: 'Erroneous telemetry reporting falsely elevated temperatures; uncommanded inhibition of satellite thermal survival heaters.',
    missionConsequence: 'Component cooling below -35°C survival limits during deep eclipse passes; freezing risk for propulsion hydrazine lines.',
    improvement: 'Adopt four-wire Kelvin sensing architecture with wire-wound space-qualified platinum RTD sensors. Rescreen heater batches.',
    mitigation: 'Switch autonomous thermal control loop to redundant Temperature Sensor B. Override automated heater logic via ground telecommand.',
  },
  SEN: {
    cause: 'Magnetic core permeability shift in triaxial fluxgate magnetometer sensor heads and differential amplifier input bias current drift.',
    mechanism: 'Annealing relaxation in permalloy cores alters magnetic saturation hysteresis characteristics under continuous HTOL exposure.',
    satelliteImpact: 'Distortion of Earth magnetic field vector readings; degradation of B-dot magnetic detumbling control torques.',
    missionConsequence: 'Slowed rate of initial orbital detumbling; residual angular rate oscillations after launch vehicle stage separation.',
    improvement: 'Subject magnetic sensor cores to pre-assembly magnetic stabilization burn-in. Enforce zero-drift offset screening criteria.',
    mitigation: 'Apply digital polynomial offset correction matrix in software. Transfer primary rate damping to inertial gyros.',
  },
  PAY: {
    cause: 'Analog-to-Digital Converter (ADC) reference voltage drift and multispectral imaging sensor readout amplifier leakage rise.',
    mechanism: 'Bandgap reference transistor leakage shifts ADC quantization thresholds, causing non-linear radiometric transfer errors.',
    satelliteImpact: 'Elevated noise floor and striping artifacts on high-resolution multispectral Earth observation imagery.',
    missionConsequence: 'Scientific and reconnaissance data degradation; reduced contrast resolution across ocean and land observation bands.',
    improvement: 'Implement radiation-hardened zener voltage references with low thermal coefficients (<2 ppm/°C). 100% linearity screening.',
    mitigation: 'Adjust digital radiometric calibration LUT tables in payload FPGA. Switch image acquisition to redundant Sensor Bank B.',
  },
  CTL: {
    cause: 'Gate dielectric degradation in reaction wheel motor H-bridge power MOSFET drivers and tachometer optocoupler aging.',
    mechanism: 'Flyback inductive transients during motor commutation combine with HTOL stress to degrade driver gate insulating oxide.',
    satelliteImpact: 'Unbalanced phase current drive to Reaction Wheel RW-1, generating motor torque ripple and high-frequency mechanical vibration.',
    missionConsequence: 'Jitter induced across spacecraft optical bench; failure to meet stringent ground pointing stability specifications.',
    improvement: 'Incorporate dedicated transient voltage suppression (TVS) diodes and switch to rad-hard GaN power drive stages.',
    mitigation: 'Reconfigure AOCS 4-wheel pyramidal array to operate in degraded 3-wheel mode, isolating anomalous wheel RW-1.',
  },
}

export default function ComponentDeepDiveAnalysis({
  component,
  onIsolateBus,
  onFailover,
  isIsolated = false,
  isFailover = false,
}: ComponentDeepDiveAnalysisProps) {
  if (!component) return null

  const isReject = component.status === 'reject'
  const isMonitor = component.status === 'monitor'

  const subKey = component.subsystem || 'PWR'
  const domain = DOMAIN_KNOWLEDGE[subKey] || DOMAIN_KNOWLEDGE.PWR

  // Dynamic values
  const zScore = component.z168 != null ? component.z168.toFixed(2) : '2.85'
  const driftPct = component.pct_drift != null ? component.pct_drift.toFixed(1) : '18.4'
  const v168 = component.v168 != null ? component.v168.toFixed(2) : '42.10'
  const limit = component.limit_ua != null ? component.limit_ua.toFixed(0) : '50'
  const predFuture = component.predicted_future != null ? component.predicted_future.toFixed(2) : '54.20'
  const risk = Math.round(component.risk_score || (isReject ? 84 : isMonitor ? 48 : 12))

  return (
    <div className="bg-[#050B17] border border-cyan/40 rounded-xl p-4 shadow-2xl font-mono text-xs select-none animate-fade-in flex flex-col gap-4">
      {/* --- Section Header: Component Identity & Status Badges --- */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 bg-[#081226]/80 -m-4 p-4 mb-0 rounded-t-xl">
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full ${
              isReject ? 'bg-rose-500 led' : isMonitor ? 'bg-amber-400 led' : 'bg-emerald-400 led'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-sm text-white tracking-wider">
                {component.component_id}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan/20 text-cyan border border-cyan/40 font-bold">
                [{component.subsystem}] {component.subsystem_name}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              QUALIFICATION LOT: <b className="text-white">{component.lot_id}</b> &bull; PARAMETER:{' '}
              <span className="text-emerald-400 font-semibold">{component.parameter || 'Leakage Current (µA)'}</span>
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[9px] text-slate-400 uppercase">SCREENING RISK</div>
            <div
              className={`font-mono text-sm font-black ${
                risk > 60 ? 'text-rose-400 text-glow-red' : risk > 35 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {risk} / 100
            </div>
          </div>

          <span
            className={`text-xs font-black uppercase px-2.5 py-1 rounded border tracking-wider ${
              isReject
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/60 shadow-alert-glow'
                : isMonitor
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
            }`}
          >
            {component.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* --- Title Bar: Diagnostic Deep-Dive Overview --- */}
      <div className="flex items-center justify-between text-[11px] text-slate-300 bg-[#09152E] px-3 py-1.5 rounded border border-slate-800">
        <span className="text-cyan font-bold tracking-wider uppercase flex items-center gap-2">
          <span>&#9881;</span> ENGINEERING ROOT CAUSE, SATELLITE IMPACT &amp; MITIGATION ANALYSIS
        </span>
        <span className="text-slate-400 text-[10px]">
          MIL-STD-883 HTOL 168H &bull; RELIABILITY ASSURANCE
        </span>
      </div>

      {/* --- 4 Core Information Grid Cards --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* ================= CARD 1: ROOT CAUSE ================= */}
        <div className="p-3.5 rounded-lg bg-[#081224] border border-rose-500/30 flex flex-col justify-between gap-2 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-rose-500/20 mb-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 led" />
                <span>1. ROOT CAUSE OF ANOMALY / REJECTION</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase">
                SILICON PHYSICS
              </span>
            </div>

            <p className="text-[11px] text-slate-200 leading-relaxed mb-2 font-medium">
              {domain.cause}
            </p>

            <div className="text-[10px] text-slate-400 bg-black/40 p-2 rounded border border-slate-800/80 leading-relaxed">
              <b className="text-slate-300 block mb-0.5">Physical Failure Mechanism:</b>
              {domain.mechanism}
            </div>
          </div>

          <div className="text-[9.5px] text-rose-300/80 pt-1 border-t border-slate-800/60 flex items-center justify-between">
            <span>Thermal Activation Energy: <b>Ea = 0.72 eV</b></span>
            <span>Junction Temp: <b>Tj = 125°C</b></span>
          </div>
        </div>

        {/* ================= CARD 2: REASON & ML JUSTIFICATION ================= */}
        <div className="p-3.5 rounded-lg bg-[#081224] border border-cyan/30 flex flex-col justify-between gap-2 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-cyan/20 mb-2">
              <div className="flex items-center gap-2 text-cyan font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan led" />
                <span>2. REASON &amp; AI SCREENING JUSTIFICATION</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/30 uppercase">
                LOT-RELATIVE
              </span>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 gap-1.5 mb-2.5 text-[10px]">
              <div className="bg-[#050D1D] p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[9px]">Lot-Relative z-Score:</span>
                <b className={`text-xs ${Math.abs(parseFloat(zScore)) > 2.5 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {parseFloat(zScore) > 0 ? '+' : ''}{zScore}&sigma;
                </b>
                <span className="text-slate-500 text-[8.5px] block mt-0.5">Diverges from cohort baseline</span>
              </div>

              <div className="bg-[#050D1D] p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[9px]">168h Drift Extrapolation:</span>
                <b className="text-xs text-rose-400">+{driftPct}%</b>
                <span className="text-slate-500 text-[8.5px] block mt-0.5">From 0h baseline reading</span>
              </div>

              <div className="bg-[#050D1D] p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[9px]">Measured 168h Value:</span>
                <b className="text-xs text-white">{v168} &micro;A</b>
                <span className="text-slate-500 text-[8.5px] block mt-0.5">Datasheet Limit: {limit} &micro;A</span>
              </div>

              <div className="bg-[#050D1D] p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[9px]">Projected Future (264h):</span>
                <b className={`text-xs ${parseFloat(predFuture) > parseFloat(limit) ? 'text-rose-400 font-black' : 'text-amber-300'}`}>
                  {predFuture} &micro;A
                </b>
                <span className="text-slate-500 text-[8.5px] block mt-0.5">
                  {parseFloat(predFuture) > parseFloat(limit) ? '⚠️ In-Flight Limit Breach' : 'Within margin'}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-300 bg-black/40 p-2 rounded border border-slate-800/80">
              <b className="text-cyan">Decision Rationale: </b>
              {component.traditional_decision === 'PASS' && isReject ? (
                <span>
                  Component passes traditional static limit ({v168} &micro;A &le; {limit} &micro;A), but exhibits abnormal parametric drift relative to lot median (<b className="text-rose-400">+{zScore}&sigma;</b>), indicating latent defect.
                </span>
              ) : (
                <span>
                  Measured leakage of {v168} &micro;A combined with non-linear drift slope violates zero-defect spaceflight reliability criteria.
                </span>
              )}
            </div>
          </div>

          <div className="text-[9.5px] text-cyan pt-1 border-t border-slate-800/60 flex items-center justify-between">
            <span>Traditional: <b className="text-white">{component.traditional_decision}</b></span>
            <span>AI Model: <b className="text-emerald-400">Isolation Forest + Robust MAD</b></span>
          </div>
        </div>

        {/* ================= CARD 3: SATELLITE & MISSION IMPACT ================= */}
        <div className="p-3.5 rounded-lg bg-[#081224] border border-amber-500/30 flex flex-col justify-between gap-2 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20 mb-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 led" />
                <span>3. IMPACT ON SATELLITE &amp; MISSION</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
                SYSTEM HAZARD
              </span>
            </div>

            <p className="text-[11px] text-slate-200 leading-relaxed mb-2 font-medium">
              {domain.satelliteImpact}
            </p>

            <div className="text-[10px] text-slate-400 bg-black/40 p-2 rounded border border-slate-800/80 leading-relaxed">
              <b className="text-amber-300 block mb-0.5">Worst-Case Orbit Mission Consequence:</b>
              {domain.missionConsequence}
            </div>
          </div>

          <div className="text-[9.5px] text-amber-300/90 pt-1 border-t border-slate-800/60 flex items-center justify-between">
            <span>Criticality Level: <b className="text-rose-400">CRITICAL SINGLE POINT</b></span>
            <span>FMEA Severity: <b className="text-amber-300">CATEGORY I (CATASTROPHIC)</b></span>
          </div>
        </div>

        {/* ================= CARD 4: IMPROVEMENT & CORRECTIVE ACTIONS ================= */}
        <div className="p-3.5 rounded-lg bg-[#081224] border border-emerald-500/30 flex flex-col justify-between gap-2 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-emerald-500/20 mb-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 led" />
                <span>4. ENGINEERING IMPROVEMENT &amp; MITIGATION PROTOCOL</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase">
                DISPOSITION
              </span>
            </div>

            <p className="text-[11px] text-slate-200 leading-relaxed mb-2 font-medium">
              {domain.improvement}
            </p>

            <div className="text-[10px] text-slate-400 bg-black/40 p-2 rounded border border-slate-800/80 leading-relaxed mb-3">
              <b className="text-emerald-400 block mb-0.5">Immediate Spacecraft Failover Mitigation:</b>
              {domain.mitigation}
            </div>
          </div>

          {/* Interactive Mitigation Command Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
            {onIsolateBus && (
              <button
                type="button"
                onClick={() => {
                  sounds.playPing()
                  onIsolateBus(component.component_id)
                }}
                className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  isIsolated
                    ? 'bg-rose-500/30 text-rose-300 border-rose-500 shadow-alert-glow font-black'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/40 hover:bg-rose-500 hover:text-black'
                }`}
              >
                <span>⚡</span> {isIsolated ? '✓ BUS ISOLATED' : 'ISOLATE POWER BUS'}
              </button>
            )}

            {onFailover && (
              <button
                type="button"
                onClick={() => {
                  sounds.playSuccess()
                  onFailover(component.component_id)
                }}
                className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  isFailover
                    ? 'bg-cyan/30 text-cyan border-cyan shadow-neon-cyan font-black'
                    : 'bg-cyan/15 text-cyan border-cyan/40 hover:bg-cyan hover:text-black'
                }`}
              >
                <span>🔄</span> {isFailover ? '✓ SPARE UNIT B ACTIVE' : 'ENGAGE COLD SPARE B'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
