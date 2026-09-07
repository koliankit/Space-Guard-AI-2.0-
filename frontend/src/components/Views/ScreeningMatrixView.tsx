import { useMemo, useState } from 'react'
import type { ComponentOut } from '../../types'

interface ScreeningMatrixViewProps {
  components: ComponentOut[]
  onSelectComponent: (id: string) => void
  onFocusIn3D: (component: ComponentOut) => void
  selectedId: string | null
}

export default function ScreeningMatrixView({
  components,
  onSelectComponent,
  onFocusIn3D,
  selectedId,
}: ScreeningMatrixViewProps) {
  const [filterMode, setFilterMode] = useState<'ALL' | 'reject' | 'monitor' | 'safe' | 'abnormal_within_spec'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'risk' | 'z168' | 'slope' | 'v168' | 'id' | 'pred168'>('risk')
  const [sortAsc, setSortAsc] = useState(false)

  // Status counts
  const counts = useMemo(() => {
    return {
      all: components.length,
      reject: components.filter((c) => c.status === 'reject').length,
      monitor: components.filter((c) => c.status === 'monitor').length,
      safe: components.filter((c) => c.status === 'safe').length,
      abnormal_within_spec: components.filter(
        (c) => c.anomaly_category === 'abnormal_within_spec' || (c.traditional_decision === 'PASS' && c.status !== 'safe'),
      ).length,
    }
  }, [components])

  // Real Evaluation Metrics (SIH26170 Requirement 10)
  const metrics = useMemo(() => {
    if (components.length === 0) return null
    const errs = components.map((c) => c.prediction_error_168 ?? Math.abs(c.v168 - c.predicted168_from_early))
    const mae = errs.reduce((a, b) => a + b, 0) / errs.length
    const rmse = Math.sqrt(errs.reduce((a, b) => a + b * b, 0) / errs.length)

    const labeled = components.filter((c) => c.ground_truth != null)
    if (labeled.length >= 4) {
      const tp = labeled.filter((c) => c.status === 'reject' && c.ground_truth === 1).length
      const fp = labeled.filter((c) => c.status === 'reject' && c.ground_truth === 0).length
      const tn = labeled.filter((c) => c.status !== 'reject' && c.ground_truth === 0).length
      const fn = labeled.filter((c) => c.status !== 'reject' && c.ground_truth === 1).length
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0
      const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
      const fpr = fp + tn > 0 ? fp / (fp + tn) : 0
      const fnr = fn + tp > 0 ? fn / (fn + tp) : 0
      return { hasGt: true, precision, recall, f1, fpr, fnr, mae, rmse, count: labeled.length }
    }
    return { hasGt: false, mae, rmse, count: components.length }
  }, [components])

  // Filter & Search
  const filtered = useMemo(() => {
    return components.filter((c) => {
      let matchesFilter = true
      if (filterMode === 'abnormal_within_spec') {
        matchesFilter = c.anomaly_category === 'abnormal_within_spec' || (c.traditional_decision === 'PASS' && c.status !== 'safe')
      } else if (filterMode !== 'ALL') {
        matchesFilter = c.status === filterMode
      }

      const matchesSearch =
        !searchTerm ||
        c.component_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lot_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subsystem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.subsystem_name && c.subsystem_name.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchesFilter && matchesSearch
    })
  }, [components, filterMode, searchTerm])

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let vA: any = a.risk_score
      let vB: any = b.risk_score
      if (sortBy === 'z168') {
        vA = Math.abs(a.z168)
        vB = Math.abs(b.z168)
      } else if (sortBy === 'slope') {
        vA = a.slope
        vB = b.slope
      } else if (sortBy === 'v168') {
        vA = a.v168
        vB = b.v168
      } else if (sortBy === 'pred168') {
        vA = a.predicted168_from_early
        vB = b.predicted168_from_early
      } else if (sortBy === 'id') {
        vA = a.component_id
        vB = b.component_id
      }
      if (vA < vB) return sortAsc ? -1 : 1
      if (vA > vB) return sortAsc ? 1 : -1
      return 0
    })
  }, [filtered, sortBy, sortAsc])

  // Export CSV
  const handleExportCSV = () => {
    if (components.length === 0) return
    const headers = [
      'component_id',
      'subsystem',
      'lot_id',
      'parameter',
      'v0_uA',
      'v24_uA',
      'v96_uA',
      'v168_uA',
      'limit_uA',
      'lot_mean_uA',
      'lot_z_score',
      'drift_slope_uA_hr',
      'predicted168_early_uA',
      'prediction_error_uA',
      'predicted_future_uA',
      'iso_score',
      'risk_score',
      'status',
      'traditional_decision',
      'anomaly_category',
      'screening_reason',
    ]
    const csvRows = [headers.join(',')]
    sorted.forEach((c) => {
      csvRows.push(
        [
          `"${c.component_id}"`,
          `"${c.subsystem}"`,
          `"${c.lot_id}"`,
          `"${c.parameter || 'Leakage Current (µA)'}"`,
          c.v0,
          c.v24,
          c.v96 ?? '',
          c.v168,
          c.limit_ua,
          c.lot_mean ?? '',
          c.z168.toFixed(3),
          c.slope.toFixed(5),
          c.predicted168_from_early.toFixed(2),
          c.prediction_error_168 != null ? c.prediction_error_168.toFixed(2) : '',
          c.predicted_future.toFixed(2),
          c.iso_score.toFixed(1),
          c.risk_score,
          `"${c.status}"`,
          `"${c.traditional_decision}"`,
          `"${c.anomaly_category || ''}"`,
          `"${(c.reason || '').replace(/"/g, '""')}"`,
        ].join(','),
      )
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `ISRO_SpaceGuard_Screening_Matrix_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col flex-1 p-5 bg-[#060913] font-mono select-none overflow-hidden text-slate-100">
      {/* Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan led" />
            <h2 className="m-0 text-sm font-display font-black tracking-widest text-white uppercase">
              ISRO COMPONENT SCREENING MATRIX &amp; ANOMALY LEDGER
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/40 font-bold">
              MIL-STD-883 METHOD 1005 HTOL
            </span>
          </div>
          <div className="text-[10px] text-slate-400 tracking-wider mt-0.5">
            Dynamic Lot-Relative Anomaly Detection &bull; 0h+24h &rarr; 168h Drift Extrapolation &bull; Latent Silicon Breakdown Prevention
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={components.length === 0}
            className="hud-glass px-3 py-1.5 rounded border border-slate-700 text-cyan hover:border-cyan text-xs flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>&#8681;</span> EXPORT CSV LEDGER
          </button>
        </div>
      </div>

      {/* SIH26170 Requirement 11: Traditional vs AI Screening Paradigm Comparison Banner */}
      <div className="mb-3 p-3 rounded-xl bg-[#0B1528] border border-cyan/30 text-xs shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-display font-black px-2 py-0.5 rounded bg-cyan/20 text-cyan border border-cyan/40">
              SIH26170 ARCHITECTURE
            </span>
            <span className="font-bold text-white text-xs">
              AI-Assisted Decision-Support Layer for Aerospace Component Screening
            </span>
          </div>
          <span className="text-[10px] text-amber-400 font-semibold">
            &bull; Augments established aerospace screening &amp; QA &bull; WITHIN SPEC &ne; ALWAYS HEALTHY
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
          <div className="p-2.5 rounded-lg bg-[#060D1A] border border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
              <span className="text-rose-400">&#10006;</span> TRADITIONAL AEROSPACE SCREENING:
            </div>
            <div className="font-mono text-slate-300">
              Measurement &rarr; <span className="text-white font-bold">Fixed Datasheet Limit</span> &rarr; PASS/FAIL
            </div>
            <div className="text-[10px] text-slate-500 mt-1 italic">
              Critical Gap: A component with severe latent drift (e.g. 38.9 µA vs 10 µA lot baseline) PASSES if static limit is 50 µA.
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#061B24] border border-cyan/40">
            <div className="text-[10px] font-bold text-cyan uppercase mb-1 flex items-center gap-1">
              <span className="text-emerald-400">&#10003;</span> SPACEGUARD AI MULTI-STAGE LAYER:
            </div>
            <div className="font-mono text-cyan">
              Measurement &rarr; <b className="text-white">Lot Behavior Baseline</b> &rarr; <b className="text-white">Anomaly Detection</b> &rarr; <b className="text-white">Drift Prediction</b> &rarr; <b className="text-rose-300">Explainable Decision</b>
            </div>
            <div className="text-[10px] text-slate-300 mt-1">
              Catches latent silicon gate-oxide degradation, peer outliers, and projects orbital mission failure before flight integration.
            </div>
          </div>
        </div>
      </div>

      {/* SIH26170 Requirement 10: Real Evaluation Metrics Strip */}
      {metrics && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-[#091122] border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              AI ENGINE METRICS
            </span>
            <span className="text-slate-400 text-xs">
              0h+24h &rarr; 168h Drift Extrapolation:
            </span>
            <span className="text-white font-bold">
              MAE: <span className="text-cyan font-mono">{metrics.mae.toFixed(3)} µA</span> &bull; RMSE: <span className="text-cyan font-mono">{metrics.rmse.toFixed(3)} µA</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {metrics.hasGt ? (
              <div className="flex items-center gap-2 font-mono text-[10.5px]">
                <span className="text-slate-400">Precision: <b className="text-emerald-400">{(metrics.precision! * 100).toFixed(1)}%</b></span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">Recall: <b className="text-emerald-400">{(metrics.recall! * 100).toFixed(1)}%</b></span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">F1-Score: <b className="text-cyan">{(metrics.f1! * 100).toFixed(1)}%</b></span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">FPR: <b className="text-amber-400">{(metrics.fpr! * 100).toFixed(1)}%</b></span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 italic">
                Ground truth defect labels unavailable for this dataset &bull; Unsupervised lot-relative screening active
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`text-xs px-3 py-1 rounded border transition-all ${
              filterMode === 'ALL'
                ? 'bg-cyan/20 border-cyan text-cyan font-bold shadow-neon-cyan'
                : 'hud-glass border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            ALL [{counts.all}]
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('reject')}
            className={`text-xs px-3 py-1 rounded border transition-all ${
              filterMode === 'reject'
                ? 'bg-rose-500/25 border-rose-500 text-rose-400 font-bold shadow-alert-glow'
                : 'hud-glass border-slate-800 text-rose-400/80 hover:text-rose-400'
            }`}
          >
            &#9888; REJECT [{counts.reject}]
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('monitor')}
            className={`text-xs px-3 py-1 rounded border transition-all ${
              filterMode === 'monitor'
                ? 'bg-amber-500/25 border-amber-500 text-amber-400 font-bold'
                : 'hud-glass border-slate-800 text-amber-400/80 hover:text-amber-400'
            }`}
          >
            &#9670; MONITOR [{counts.monitor}]
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('safe')}
            className={`text-xs px-3 py-1 rounded border transition-all ${
              filterMode === 'safe'
                ? 'bg-emerald-500/25 border-emerald-500 text-emerald-400 font-bold'
                : 'hud-glass border-slate-800 text-emerald-400/80 hover:text-emerald-400'
            }`}
          >
            &#10003; SAFE [{counts.safe}]
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('abnormal_within_spec')}
            className={`text-xs px-3 py-1 rounded border transition-all ${
              filterMode === 'abnormal_within_spec'
                ? 'bg-purple-500/25 border-purple-400 text-purple-300 font-bold shadow-sm'
                : 'hud-glass border-slate-800 text-purple-400/80 hover:text-purple-300'
            }`}
            title="Components that PASS fixed datasheet limit but are ABNORMAL relative to lot peers (The Core SIH26170 Innovation)"
          >
            &#9881; WITHIN SPEC &bull; ABNORMAL LOT DRIFT [{counts.abnormal_within_spec}]
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[280px]">
          <input
            type="text"
            placeholder="Search Part ID, Subsystem, Lot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0A1020] border border-slate-700 text-slate-100 text-xs px-3 py-1.5 rounded focus:border-cyan focus:outline-none placeholder-slate-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-[#070D1A] shadow-lg">
        <table className="w-full text-left text-[11px] font-mono border-collapse">
          <thead className="sticky top-0 bg-[#0B1528] border-b border-slate-800 z-10 text-[10px] uppercase text-slate-400 tracking-wider">
            <tr>
              <th className="py-2.5 px-3">AI Status</th>
              <th className="py-2.5 px-3">Traditional vs AI</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-cyan"
                onClick={() => {
                  if (sortBy === 'id') setSortAsc(!sortAsc)
                  else {
                    setSortBy('id')
                    setSortAsc(true)
                  }
                }}
              >
                Component ID {sortBy === 'id' ? (sortAsc ? '\u25b2' : '\u25bc') : ''}
              </th>
              <th className="py-2.5 px-3">Subsystem</th>
              <th className="py-2.5 px-3">Lot ID</th>
              <th className="py-2.5 px-3">0h (&micro;A)</th>
              <th className="py-2.5 px-3">24h (&micro;A)</th>
              <th className="py-2.5 px-3">96h (&micro;A)</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-cyan"
                onClick={() => {
                  if (sortBy === 'v168') setSortAsc(!sortAsc)
                  else {
                    setSortBy('v168')
                    setSortAsc(false)
                  }
                }}
              >
                168h {sortBy === 'v168' ? (sortAsc ? '\u25b2' : '\u25bc') : ''}
              </th>
              <th className="py-2.5 px-3">Spec Limit</th>
              <th className="py-2.5 px-3">Lot Mean (&mu;)</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-cyan"
                onClick={() => {
                  if (sortBy === 'z168') setSortAsc(!sortAsc)
                  else {
                    setSortBy('z168')
                    setSortAsc(false)
                  }
                }}
              >
                Lot z-Score {sortBy === 'z168' ? (sortAsc ? '\u25b2' : '\u25bc') : ''}
              </th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-cyan"
                onClick={() => {
                  if (sortBy === 'pred168') setSortAsc(!sortAsc)
                  else {
                    setSortBy('pred168')
                    setSortAsc(false)
                  }
                }}
                title="Value_0h + Value_24h -> Predicted Value_168h"
              >
                Early Pred 168h {sortBy === 'pred168' ? (sortAsc ? '\u25b2' : '\u25bc') : ''}
              </th>
              <th className="py-2.5 px-3">Projected (264h)</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-cyan"
                onClick={() => {
                  if (sortBy === 'risk') setSortAsc(!sortAsc)
                  else {
                    setSortBy('risk')
                    setSortAsc(false)
                  }
                }}
              >
                Risk {sortBy === 'risk' ? (sortAsc ? '\u25b2' : '\u25bc') : ''}
              </th>
              <th className="py-2.5 px-3 text-right">3D Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={16} className="py-8 text-center text-slate-500">
                  No components found matching current filter &bull; Run AI Screening to populate matrix.
                </td>
              </tr>
            ) : (
              sorted.map((c) => {
                const isSelected = c.component_id === selectedId
                const isReject = c.status === 'reject'
                const isMonitor = c.status === 'monitor'
                const isAbnormalInSpec = c.traditional_decision === 'PASS' && c.status !== 'safe'

                return (
                  <tr
                    key={c.component_id}
                    onClick={() => onSelectComponent(c.component_id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan/15 text-white font-semibold'
                        : isReject
                        ? 'hover:bg-rose-500/10'
                        : isMonitor
                        ? 'hover:bg-amber-500/10'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Status badge */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isReject
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : isMonitor
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isReject ? 'bg-rose-500 led' : isMonitor ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                        />
                        {c.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Traditional vs AI Verdict */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      {isAbnormalInSpec ? (
                        <span className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/50 font-bold">
                          <span>PASS (Spec)</span>
                          <span>&rarr;</span>
                          <span className="text-rose-400">{c.status.toUpperCase()} (AI)</span>
                        </span>
                      ) : c.traditional_decision === 'FAIL' ? (
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold">
                          FAIL (SPEC LIMIT)
                        </span>
                      ) : (
                        <span className="text-[9.5px] text-slate-400 font-mono">
                          PASS &bull; NOMINAL
                        </span>
                      )}
                    </td>

                    {/* Component ID */}
                    <td className="py-2 px-3 font-bold text-white whitespace-nowrap">
                      {c.component_id}
                    </td>

                    {/* Subsystem */}
                    <td className="py-2 px-3 text-cyan whitespace-nowrap font-bold">
                      [{c.subsystem}]
                    </td>

                    {/* Lot ID */}
                    <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                      {c.lot_id}
                    </td>

                    {/* Readings */}
                    <td className="py-2 px-3 text-slate-400">{c.v0.toFixed(2)}</td>
                    <td className="py-2 px-3 text-slate-400">{c.v24.toFixed(2)}</td>
                    <td className="py-2 px-3 text-slate-400">{c.v96 != null ? c.v96.toFixed(2) : '--'}</td>
                    <td className={`py-2 px-3 font-bold ${isReject ? 'text-rose-400' : isMonitor ? 'text-amber-400' : 'text-slate-100'}`}>
                      {c.v168.toFixed(2)}
                    </td>

                    {/* Spec Limit */}
                    <td className="py-2 px-3 text-slate-400">{c.limit_ua.toFixed(0)}</td>

                    {/* Lot Mean */}
                    <td className="py-2 px-3 text-slate-300">
                      {c.lot_mean != null ? `${c.lot_mean.toFixed(2)}` : '--'}
                    </td>

                    {/* Lot z-Score */}
                    <td className={`py-2 px-3 font-bold ${Math.abs(c.z168) >= 3.0 ? 'text-rose-400' : Math.abs(c.z168) >= 2.0 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {c.z168 > 0 ? '+' : ''}{c.z168.toFixed(2)}&sigma;
                    </td>

                    {/* Early Pred 168h from 0h+24h */}
                    <td className="py-2 px-3 text-cyan font-bold" title={`Predicted from 0h+24h: ${c.predicted168_from_early.toFixed(2)} µA`}>
                      {c.predicted168_from_early.toFixed(2)}
                    </td>

                    {/* Projected future */}
                    <td className={`py-2 px-3 ${c.predicted_future > c.limit_ua ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                      {c.predicted_future.toFixed(2)}
                    </td>

                    {/* Composite risk */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isReject ? 'bg-rose-500' : isMonitor ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${c.risk_score}%` }}
                          />
                        </div>
                        <span
                          className={`font-bold ${
                            isReject ? 'text-rose-400' : isMonitor ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {c.risk_score}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onFocusIn3D(c)
                        }}
                        className="hud-glass px-2 py-0.5 rounded border border-slate-700 text-cyan hover:border-cyan text-[10px] transition-all"
                        title="Focus and highlight this component on the 3D Satellite Digital Twin"
                      >
                        3D SENSOR &rarr;
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-800 mt-3">
        <div>
          Showing <span className="text-white font-bold">{sorted.length}</span> of{' '}
          <span className="text-white font-bold">{components.length}</span> screened components &bull; Traditional Spec Limit: 50 &micro;A
        </div>
        <div>
          MIL-STD-883 Method 1005 HTOL Compliant &bull; Decision-Support Intelligence Layer
        </div>
      </div>
    </div>
  )
}
