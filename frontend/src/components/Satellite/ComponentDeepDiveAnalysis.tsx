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
    <div className="bg-[#0B1120] border border-slate-700/80 rounded-xl p-5 font-sans text-xs select-none animate-fade-in flex flex-col gap-4 shadow-lg">
      {/* --- Section Header: Component Identity & Status Badges --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800 bg-[#0F172A] -m-5 p-5 mb-0 rounded-t-xl">
        <div className="flex items-center gap-3.5">
          <span
            className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${
              isReject ? 'bg-rose-500' : isMonitor ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-bold text-base text-white tracking-tight">
                {component.component_id}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                [{component.subsystem}] {component.subsystem_name}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Qualification Lot: <span className="font-mono text-slate-200 font-semibold">{component.lot_id}</span> &bull; Telemetry Parameter:{' '}
              <span className="text-slate-300 font-medium">{component.parameter || 'Leakage Current (µA)'}</span>
            </div>
          </div>
        </div>

        {/* Status Badges & Screening Risk */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">AI Screening Risk</div>
            <div
              className={`font-mono text-xl font-extrabold ${
                risk > 60 ? 'text-rose-400' : risk > 35 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {risk} <span className="text-xs font-normal text-slate-500">/ 100</span>
            </div>
          </div>

          <span
            className={`text-xs font-bold uppercase px-3 py-1.5 rounded-md border tracking-wide ${
              isReject
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : isMonitor
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {component.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* --- Section Subtitle Bar --- */}
      <div className="flex items-center justify-between text-xs text-slate-300 bg-[#070D1A] px-3.5 py-2 rounded-lg border border-slate-800">
        <span className="text-slate-200 font-semibold tracking-wide flex items-center gap-2">
          <span>📋</span> Engineering Root Cause, Telemetry Justification &amp; Corrective Disposition
        </span>
        <span className="text-slate-400 text-[11px] font-mono">
          MIL-STD-883 HTOL 168H &bull; RELIABILITY ASSURANCE
        </span>
      </div>

      {/* --- 4 Distinct Information Sections --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ================= SECTION 1: PHYSICAL ROOT CAUSE ================= */}
        <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-700/80 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
              <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>1. Physical Failure Root Cause</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase font-medium">
                Physics of Failure
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {domain.cause}
            </p>

            <div className="text-[11.5px] text-slate-300 bg-[#070D1A] p-3 rounded-lg border border-slate-800 leading-relaxed">
              <span className="text-slate-400 font-semibold block mb-1">Underlying Degradation Mechanism:</span>
              {domain.mechanism}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono">
            <span>Thermal Activation: <b className="text-slate-200">Ea = 0.72 eV</b></span>
            <span>Junction Temp: <b className="text-slate-200">Tj = 125°C</b></span>
          </div>
        </div>

        {/* ================= SECTION 2: AI METRICS & DATA JUSTIFICATION ================= */}
        <div className="p-4 rounded-xl bg-[#0A1020] border border-slate-700/80 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
              <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>2. AI Screening &amp; Telemetry Data</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 uppercase font-medium">
                Cohort Analytics
              </span>
            </div>

            {/* Metrics Breakdown Grid with LARGE READABLE NUMBERS */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-[#070D1A] p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-medium">Lot z-Score</span>
                <div className={`font-mono text-lg font-bold mt-0.5 ${Math.abs(parseFloat(zScore)) > 2.5 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {parseFloat(zScore) > 0 ? '+' : ''}{zScore}&sigma;
                </div>
                <span className="text-slate-500 text-[9.5px] block mt-0.5">Divergence from lot median</span>
              </div>

              <div className="bg-[#070D1A] p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-medium">168h Drift Extrapolation</span>
                <div className="font-mono text-lg font-bold text-rose-400 mt-0.5">
                  +{driftPct}%
                </div>
                <span className="text-slate-500 text-[9.5px] block mt-0.5">From 0h baseline burn-in</span>
              </div>

              <div className="bg-[#070D1A] p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-medium">Measured 168h Value</span>
                <div className="font-mono text-lg font-bold text-white mt-0.5">
                  {v168} <span className="text-xs font-normal text-slate-400">&micro;A</span>
                </div>
                <span className="text-slate-500 text-[9.5px] block mt-0.5">Datasheet limit: {limit} &micro;A</span>
              </div>

              <div className="bg-[#070D1A] p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-medium">Projected Future (264h)</span>
                <div className={`font-mono text-lg font-bold mt-0.5 ${parseFloat(predFuture) > parseFloat(limit) ? 'text-rose-400' : 'text-amber-300'}`}>
                  {predFuture} <span className="text-xs font-normal text-slate-400">&micro;A</span>
                </div>
                <span className="text-slate-500 text-[9.5px] block mt-0.5">
                  {parseFloat(predFuture) > parseFloat(limit) ? '⚠️ In-Flight Limit Breach' : 'Within margin'}
                </span>
              </div>
            </div>

            <div className="text-[11.5px] text-slate-300 bg-[#070D1A] p-3 rounded-lg border border-slate-800 leading-relaxed">
              <span className="text-sky-400 font-semibold">Decision Justification: </span>
              {component.traditional_decision === 'PASS' && isReject ? (
                <span>
                  Component passes traditional static limit ({v168} &micro;A &le; {limit} &micro;A), but exhibits abnormal parametric drift relative to lot median (<b className="text-rose-400 font-mono">+{zScore}&sigma;</b>), indicating latent defect.
                </span>
              ) : (
                <span>
                  Measured leakage of {v168} &micro;A combined with non-linear drift slope violates zero-defect spaceflight reliability criteria.
                </span>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono">
            <span>Datasheet Decision: <b className="text-slate-200">{component.traditional_decision}</b></span>
            <span>AI Model: <b className="text-slate-200">Isolation Forest + MAD</b></span>
          </div>
        </div>

        {/* ================= SECTION 3: SATELLITE MISSION IMPACT ================= */}
        <div className="p-4 rounded-xl bg-[#121420] border border-slate-700/80 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
              <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>3. Spacecraft &amp; Orbit Mission Impact</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase font-medium">
                System Hazard
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {domain.satelliteImpact}
            </p>

            <div className="text-[11.5px] text-slate-300 bg-[#070D1A] p-3 rounded-lg border border-slate-800 leading-relaxed">
              <span className="text-amber-300 font-semibold block mb-1">Worst-Case Orbit Mission Consequence:</span>
              {domain.missionConsequence}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono">
            <span>Criticality Level: <b className="text-rose-400">CRITICAL SINGLE POINT</b></span>
            <span>FMEA Severity: <b className="text-amber-300">CATEGORY I (CATASTROPHIC)</b></span>
          </div>
        </div>

        {/* ================= SECTION 4: IMPROVEMENT & MITIGATION ================= */}
        <div className="p-4 rounded-xl bg-[#0D1824] border border-slate-700/80 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
              <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>4. Engineering Improvement &amp; Mitigation</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase font-medium">
                Disposition
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {domain.improvement}
            </p>

            <div className="text-[11.5px] text-slate-300 bg-[#070D1A] p-3 rounded-lg border border-slate-800 leading-relaxed mb-3">
              <span className="text-emerald-400 font-semibold block mb-1">Immediate Spacecraft Failover Protocol:</span>
              {domain.mitigation}
            </div>
          </div>

          {/* Interactive Mitigation Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800/80">
            {onIsolateBus && (
              <button
                type="button"
                onClick={() => {
                  sounds.playPing()
                  onIsolateBus(component.component_id)
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all border flex items-center justify-center gap-2 ${
                  isIsolated
                    ? 'bg-rose-500 text-white border-rose-600 font-bold'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500 hover:text-white'
                }`}
              >
                <span>⚡</span> {isIsolated ? '✓ Power Bus Isolated' : 'Isolate Power Bus'}
              </button>
            )}

            {onFailover && (
              <button
                type="button"
                onClick={() => {
                  sounds.playSuccess()
                  onFailover(component.component_id)
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all border flex items-center justify-center gap-2 ${
                  isFailover
                    ? 'bg-sky-600 text-white border-sky-500 font-bold'
                    : 'bg-sky-500/15 text-sky-300 border-sky-500/30 hover:bg-sky-600 hover:text-white'
                }`}
              >
                <span>🔄</span> {isFailover ? '✓ Cold Spare B Active' : 'Engage Cold Spare B'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
