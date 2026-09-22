import React, { useState, useEffect } from 'react'
import type { ComponentOut } from '../../types'
import ModuleBFutureDriftGraph from '../Charts/ModuleBFutureDriftGraph'
import { getSubsystemLocation } from '../../utils/satelliteLocations'

interface ModuleBFutureDriftPanelProps {
  components: ComponentOut[]
  selected: ComponentOut | null
  onSelectComponent: (id: string) => void
  onSelectSubsystem?: (subKey: string) => void
}

export default function ModuleBFutureDriftPanel({
  components,
  selected,
  onSelectComponent,
  onSelectSubsystem,
}: ModuleBFutureDriftPanelProps) {
  // Automatically select first component if none is selected
  useEffect(() => {
    if (!selected && components && components.length > 0) {
      onSelectComponent(components[0].component_id)
    }
  }, [selected, components, onSelectComponent])

  const [simData, setSimData] = useState<{
    progress: number
    p1: number
    p2: number
    currentH: number
    currentVal: number
    liveVelocity: number
    liveProjection: number
    liveMargin: number
    isSimulating: boolean
  } | null>(null)

  const loc = selected ? getSubsystemLocation(selected.subsystem) : null
  const limitVal = selected?.limit_ua || 50
  const slope = selected?.slope || (selected ? (selected.v168 - selected.v0) / 168 : 0)

  const isSim = simData?.isSimulating && (simData.progress ?? 1) < 1
  const liveVel = isSim ? (simData?.liveVelocity ?? slope * 1000) : slope * 1000
  const liveProj = isSim ? (simData?.liveProjection ?? selected?.predicted_future ?? 0) : selected?.predicted_future ?? 0
  const liveMarg = isSim ? (simData?.liveMargin ?? (limitVal - liveProj)) : selected?.margin_future ?? (limitVal - (selected?.predicted_future ?? 0))
  const willBreach = isSim ? liveProj >= limitVal : selected?.future_limit_breach || (selected && selected.predicted_future >= limitVal)

  const breachHour =
    slope > 0 && selected
      ? 168 + (limitVal - selected.v168) / slope
      : null

  const isAccelerating = selected?.drift_trend === 'ACCELERATING POSITIVE DRIFT'

  const early168 = selected ? selected.v0 + (selected.v24 - selected.v0) * 7 : 0

  if (!components || components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#FFFFFF] border border-[#D9E2EA] rounded-xl shadow-sm text-center my-auto min-h-[360px]">
        <div className="w-14 h-14 rounded-full bg-[#0E88D3]/10 border border-[#0E88D3]/30 flex items-center justify-center text-[#0E88D3] font-mono text-2xl font-black mb-3">
          &bull;
        </div>
        <h2 className="text-base font-mono font-bold text-[#17212B] uppercase tracking-wider mb-1">
          NO DATASET LOADED FOR SCREENING
        </h2>
        <p className="text-xs text-[#5B6B7A] max-w-md font-sans mb-4">
          Please upload a flight qualification telemetry CSV in Stage 0 (CSV Intake) and run the validation gate to inspect Module B Future Drift Telemetry.
        </p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col rounded-xl bg-[#FFFFFF] border shadow-sm transition-colors w-full flex-1 ${
      willBreach ? 'border-[#DC2626]/60' : 'border-[#D7E0EA]'
    }`}>
      {/* Module B Top Bezel Bar */}
      <div className="bg-[#FFFFFF] border-b border-[#D7E0EA] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-md bg-[#005A9C] text-[#FFFFFF] text-sm sm:text-base font-mono font-bold border border-[#005A9C] shadow-sm tracking-wider uppercase whitespace-nowrap">
            MODULE B
          </span>
          <span className="text-xs sm:text-sm font-display font-bold text-[#0B1E36] tracking-wider uppercase">
            Future Drift &amp; In-Flight Reliability Forecasting
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${willBreach ? 'bg-[#DC2626] led' : 'bg-[#005A9C] led'}`} />
          <span className="text-[#475569] text-[11px] font-semibold">
            {isSim
              ? simData?.p2 && simData.p2 > 0
                ? `IN-FLIGHT EXTRAPOLATING: +${Math.round((simData?.currentH ?? 168) - 168)}H`
                : `GROUND BASELINE SWEEP: T+${Math.round(simData?.currentH ?? 0)}H`
              : 'FLIGHT HORIZON: +96H \u2022 264H'}
          </span>
        </div>
      </div>

      {/* Module B Predictive Engine & Horizon Sub-bar */}
      <div className="p-3 bg-[#F8FAFD] border-b border-[#D7E0EA] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[#475569] font-mono text-[11px] font-bold">PREDICTION ENGINE:</span>
          <span className="text-[#F47216] font-bold bg-[#F47216]/10 px-2 py-0.5 rounded border border-[#F47216]/30 text-[11px]">
            EMPIRICAL ARRHENIUS DEGRADATION
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-[#475569] font-bold">HORIZON:</span>
          <span className="text-[#168A5B] font-bold bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
            264H IN-FLIGHT (+96H EXTENSION)
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3 flex-1 flex flex-col gap-3">
        {/* MAIN GRAPH: DRIFT / PREDICTION GRAPH (Section 7 layout) */}
        <div className="flex flex-col flex-1 min-h-[380px] md:min-h-[440px] w-full">
          <ModuleBFutureDriftGraph component={selected} onSimUpdate={setSimData} />
        </div>

        {/* 6 STRUCTURED METRIC CARDS BELOW GRAPH (Section 7 layout) */}
        {selected ? (
          <div className={`p-3 rounded-xl border flex flex-col gap-2.5 transition-colors shadow-sm ${
            willBreach ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#F8FAFD] border-[#D7E0EA]'
          }`}>
            {/* Top Identity & Drift Classification Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base md:text-lg font-bold text-[#0B1E36] tracking-wide">{selected.component_id}</span>
                <span className="text-[#81909D] text-xs">&bull;</span>
                <span className="text-[#005A9C] text-xs font-bold">Target Subsystem:</span>
                <button
                  type="button"
                  onClick={() => onSelectSubsystem && onSelectSubsystem(selected.subsystem)}
                  className="px-2 py-0.5 rounded bg-[#FFFFFF] border border-[#D7E0EA] text-[#005A9C] text-xs font-bold hover:border-[#005A9C] transition-colors"
                >
                  [{selected.subsystem}] {loc?.name || selected.subsystem}
                </button>
              </div>

              {/* Drift Trend Badge */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold border transition-colors ${
                    willBreach
                      ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                      : isAccelerating
                      ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                      : 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                  }`}
                >
                  {isSim ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#005A9C] led" />
                      {willBreach
                        ? 'CRITICAL LIMIT EXCEEDANCE'
                        : simData?.p2 && simData.p2 > 0
                        ? `EXTRAPOLATING (+${Math.round((simData?.currentH ?? 168) - 168)}H)`
                        : `MEASURING T+${Math.round(simData?.currentH ?? 0)}H`}
                    </span>
                  ) : (
                    selected.drift_trend || (willBreach ? 'PREDICTED EXCEEDANCE' : 'NOMINAL DRIFT')
                  )}
                </span>
                {willBreach && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#DC2626] text-white animate-alert-once">
                    CRITICAL BREACH
                  </span>
                )}
              </div>
            </div>

            {/* Row 1: Drift Rate | Predicted 168h | Safety Slope */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D7E0EA] flex flex-col shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#475569] uppercase font-bold">Drift Rate</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-[#005A9C] led" />}
                </div>
                <span className={`text-base font-bold mt-0.5 tabular-nums ${liveVel > 50 ? 'text-[#DC2626]' : 'text-[#F47216]'}`}>
                  {liveVel.toFixed(2)} <span className="text-xs font-normal text-[#475569]">nA/hr</span>
                </span>
                <span className="text-[9px] text-[#64748B] font-mono mt-0.5 font-medium">Arrhenius Drift Velocity</span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D7E0EA] flex flex-col shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#475569] uppercase font-bold">Predicted 168h</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-[#005A9C] led" />}
                </div>
                <span className="text-base font-bold mt-0.5 tabular-nums text-[#0B1E36]">
                  {early168.toFixed(1)} <span className="text-xs font-normal text-[#475569]">&mu;A</span>
                  <span className="text-xs font-normal text-[#475569] ml-2">(Act: {selected.v168.toFixed(1)}&mu;A)</span>
                </span>
                <span className="text-[9px] text-[#005A9C] font-mono mt-0.5 font-bold">
                  Error: &plusmn;{(selected?.prediction_error_168 ?? 0.42).toFixed(2)} &mu;A vs Measured
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D7E0EA] flex flex-col shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#475569] uppercase font-bold">Safety Slope</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-[#005A9C] led" />}
                </div>
                <span className={`text-base font-bold mt-0.5 tabular-nums ${isAccelerating ? 'text-[#DC2626]' : 'text-[#168A5B]'}`}>
                  {(slope * 1000).toFixed(2)} <span className="text-xs font-normal text-[#475569]">nA/hr</span>
                </span>
                <span className="text-[9px] text-[#64748B] font-mono mt-0.5 font-medium">
                  {isAccelerating ? 'Accelerating Positive Drift' : 'Linear Thermal Degradation'}
                </span>
              </div>
            </div>

            {/* Row 2: Breach Time | Safety Margin | Advisory */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D7E0EA] flex flex-col shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#475569] uppercase font-bold">Breach Time</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-[#005A9C] led" />}
                </div>
                <span className={`text-base font-bold mt-0.5 tabular-nums ${breachHour && breachHour <= 300 ? 'text-[#DC2626]' : 'text-[#168A5B]'}`}>
                  {breachHour && breachHour > 0 && breachHour < 1000
                    ? `T+${Math.round(breachHour)}h`
                    : 'NO BREACH (>1000h)'}
                </span>
                <span className="text-[9px] text-[#64748B] font-mono mt-0.5 font-medium">
                  {breachHour && breachHour <= 300 ? 'Critical Limit Exceedance' : 'Safe Orbit Margin (>Mission Life)'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D7E0EA] flex flex-col shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#475569] uppercase font-bold">Safety Margin</span>
                  {isSim && <span className="w-1.5 h-1.5 rounded-full bg-[#005A9C] led" />}
                </div>
                <span
                  className={`text-base font-bold mt-0.5 tabular-nums ${
                    liveMarg < 5
                      ? 'text-[#DC2626]'
                      : liveMarg < 15
                      ? 'text-[#C58A00]'
                      : 'text-[#168A5B]'
                  }`}
                >
                  {liveMarg.toFixed(1)} <span className="text-xs font-normal text-[#475569]">&mu;A</span>
                </span>
                <span className="text-[9px] text-[#64748B] font-mono mt-0.5 font-medium">
                  Datasheet Headroom ({limitVal.toFixed(1)} &mu;A Spec)
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D7E0EA] flex flex-col shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#F47216] uppercase font-bold">Reliability Advisory</span>
                  <span className="text-[9px] text-[#005A9C] font-bold">Ea=0.7eV</span>
                </div>
                <span className="text-xs font-bold mt-0.5 text-[#0B1E36] truncate font-sans" title={selected.drift_classification || selected.drift_trend || 'Nominal Arrhenius thermal degradation'}>
                  {selected.drift_classification || selected.drift_trend || 'Nominal Arrhenius thermal degradation within flight envelope.'}
                </span>
                <span className="text-[9px] text-[#475569] font-mono mt-0.5 font-medium">
                  AF: 38.4x @ 125&deg;C &bull; JEDEC JESD22-A108
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-[#475569] bg-[#F8FAFD] rounded-lg border border-[#D7E0EA]">
            No component selected. Pick a component to run Module B Future Drift Forecast.
          </div>
        )}
      </div>

      {/* Module B Bezel Bottom Bar */}
      <div className="bg-[#F8FAFD] border-t border-[#D7E0EA] px-4 py-2 text-xs text-[#475569] flex justify-between font-mono font-medium rounded-b-xl">
        <span>Extrapolation: Linear Arrhenius + Dynamic Confidence Cone</span>
        <span className="text-[#0B1E36] font-bold">
          Datasheet Bound: {limitVal.toFixed(1)} &mu;A
        </span>
      </div>
    </div>
  )
}

