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
  const [filterMode, setFilterMode] = useState<'ALL' | 'reject' | 'monitor' | 'safe' | 'abnormal_within_spec' | 'degrading'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'risk' | 'z168' | 'slope' | 'v168' | 'id' | 'pred168'>('risk')
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedLotFilter, setSelectedLotFilter] = useState<string>('ALL')
  const [viewGrouping, setViewGrouping] = useState<'flat' | 'lot_grouped'>('flat')
  const [collapsedLots, setCollapsedLots] = useState<Record<string, boolean>>({})

  // Unique available qualification lots with counts
  const availableLots = useMemo(() => {
    const map = new Map<string, { lot_id: string; count: number; status: 'safe' | 'monitor' | 'reject' }>()
    components.forEach((c) => {
      const lot = c.lot_id || 'UNKNOWN'
      let item = map.get(lot)
      if (!item) {
        item = { lot_id: lot, count: 0, status: 'safe' }
        map.set(lot, item)
      }
      item.count++
      if (c.status === 'reject') item.status = 'reject'
      else if (c.status === 'monitor' && item.status !== 'reject') item.status = 'monitor'
    })
    return Array.from(map.values()).sort((a, b) => a.lot_id.localeCompare(b.lot_id))
  }, [components])

  // Status counts
  const counts = useMemo(() => {
    return {
      all: components.length,
      reject: components.filter((c) => c.status === 'reject').length,
      monitor: components.filter((c) => c.status === 'monitor').length,
      safe: components.filter((c) => c.status === 'safe').length,
      degrading: components.filter(
        (c) => c.behavioral_health === 'DEGRADING' || c.drift_trend === 'ACCELERATING POSITIVE DRIFT'
      ).length,
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
      return { hasGt: true, precision, recall, f1, fpr, fnr, mae, rmse, count: labeled.length, status_message: undefined as string | undefined }
    }
    return { hasGt: false, mae, rmse, count: components.length, status_message: 'Evaluation pending dataset • Unsupervised lot-relative screening active' }
  }, [components])

  // Filter & Search (including selectedLotFilter)
  const filtered = useMemo(() => {
    return components.filter((c) => {
      let matchesFilter = true
      if (filterMode === 'abnormal_within_spec') {
        matchesFilter = c.anomaly_category === 'abnormal_within_spec' || (c.traditional_decision === 'PASS' && c.status !== 'safe')
      } else if (filterMode === 'degrading') {
        matchesFilter = c.behavioral_health === 'DEGRADING' || c.drift_trend === 'ACCELERATING POSITIVE DRIFT'
      } else if (filterMode !== 'ALL') {
        matchesFilter = c.status === filterMode
      }

      if (selectedLotFilter !== 'ALL' && c.lot_id !== selectedLotFilter) {
        return false
      }

      const matchesSearch =
        !searchTerm ||
        c.component_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lot_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subsystem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.subsystem_name && c.subsystem_name.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchesFilter && matchesSearch
    })
  }, [components, filterMode, selectedLotFilter, searchTerm])

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

  // Components grouped by lot for lot-wise classification view
  const lotGroupsForDisplay = useMemo(() => {
    const map = new Map<string, ComponentOut[]>()
    sorted.forEach((c) => {
      const lot = c.lot_id || 'UNKNOWN-LOT'
      if (!map.has(lot)) map.set(lot, [])
      map.get(lot)!.push(c)
    })
    return Array.from(map.entries()).map(([lot_id, parts]) => {
      const rejects = parts.filter((p) => p.status === 'reject').length
      const monitors = parts.filter((p) => p.status === 'monitor').length
      const safe = parts.filter((p) => p.status === 'safe').length
      const mean = parts[0]?.lot_mean ?? (parts.reduce((a, b) => a + b.v168, 0) / parts.length)
      return {
        lot_id,
        parts,
        rejects,
        monitors,
        safe,
        mean,
        status: (rejects > 0 ? 'reject' : monitors > 0 ? 'monitor' : 'safe') as 'safe' | 'monitor' | 'reject',
      }
    })
  }, [sorted])

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
              AI detects abnormal component behavior, predicts future degradation, explains the risk, and localizes the exact component on the spacecraft.
            </span>
          </div>
          <span className="text-[10px] text-amber-400 font-semibold">
            &bull; Augments established aerospace screening &bull; WITHIN LIMIT &ne; ALWAYS HEALTHY
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
              <span className="text-emerald-400">&#10003;</span> SPACEGUARD AI DECISION-SUPPORT LAYER:
            </div>
            <div className="font-mono text-cyan">
              Detect &rarr; <b className="text-white">Understand</b> &rarr; <b className="text-white">Predict (168h)</b> &rarr; <b className="text-white">Localize (3D)</b> &rarr; <b className="text-rose-300">Decide</b>
            </div>
            <div className="text-[10px] text-slate-300 mt-1">
              Domain-specific integration of Z-score, Isolation Forest, and regression into an aerospace predictive screening pipeline to catch latent escapes.
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
              0h+24h &rarr; 168h Extrapolation:
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
                <span className="text-slate-400" title="False Negative Rate - Critical metric for zero-defect space screening">
                  FNR (Escapes): <b className={((1 - (metrics.recall ?? 1)) * 100) > 0 ? 'text-rose-400' : 'text-emerald-400'}>{((1 - (metrics.recall ?? 1)) * 100).toFixed(1)}%</b>
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">F1: <b className="text-cyan">{(metrics.f1! * 100).toFixed(1)}%</b></span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 italic">
                {metrics.status_message || 'Evaluation pending dataset • Unsupervised lot-relative screening active'}
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
            onClick={() => setFilterMode('degrading')}
            className={`text-xs px-3 py-1 rounded border transition-all ${
              filterMode === 'degrading'
                ? 'bg-orange-500/25 border-orange-500 text-orange-400 font-bold'
                : 'hud-glass border-slate-800 text-orange-400/80 hover:text-orange-400'
            }`}
          >
            &#9650; DEGRADING [{counts.degrading}]
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
            title="Components that PASS fixed datasheet limit but are ABNORMAL relative to lot peers (Latent Defects)"
          >
            &#9881; WITHIN LIMIT &bull; ABNORMAL DRIFT [{counts.abnormal_within_spec}]
          </button>
        </div>

        {/* Lot Filter Dropdown and Grouping Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Lot Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Lot:</span>
            <select
              value={selectedLotFilter}
              onChange={(e) => setSelectedLotFilter(e.target.value)}
              className="bg-[#0A1020] border border-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded focus:border-cyan outline-none font-mono cursor-pointer"
            >
              <option value="ALL">📦 All Lots ({availableLots.length})</option>
              {availableLots.map((l) => (
                <option key={l.lot_id} value={l.lot_id}>
                  {l.lot_id} ({l.count} parts) {l.status === 'reject' ? '⚠️ REJECT' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* View Grouping Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setViewGrouping('flat')}
              className={`px-2.5 py-1 rounded text-[10.5px] uppercase font-bold transition-all ${
                viewGrouping === 'flat'
                  ? 'bg-cyan/20 border border-cyan/40 text-cyan shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📋 Flat View
            </button>
            <button
              type="button"
              onClick={() => setViewGrouping('lot_grouped')}
              className={`px-2.5 py-1 rounded text-[10.5px] uppercase font-bold transition-all ${
                viewGrouping === 'lot_grouped'
                  ? 'bg-cyan/20 border border-cyan/40 text-cyan shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📦 Group by Lot ({lotGroupsForDisplay.length})
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
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

      {/* Selected Lot Active Indicator Banner */}
      {selectedLotFilter !== 'ALL' && (
        <div className="mb-3 px-3 py-1.5 bg-sky-500/10 border border-sky-500/30 rounded-lg flex items-center justify-between text-xs">
          <span className="font-mono text-sky-300">
            Filtered by Qualification Lot: <b>{selectedLotFilter}</b> ({filtered.length} matching components)
          </span>
          <button
            type="button"
            onClick={() => setSelectedLotFilter('ALL')}
            className="text-slate-400 hover:text-white text-[11px] font-bold bg-slate-800/80 px-2 py-0.5 rounded"
          >
            Show All Lots &times;
          </button>
        </div>
      )}

      {/* High-Density Data Display: Either Lot-Grouped Accordions or Flat Table */}
      {viewGrouping === 'lot_grouped' ? (
        <div className="flex-1 overflow-auto space-y-3 pr-1">
          {lotGroupsForDisplay.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-[#070D1A] rounded-xl border border-slate-800">
              No qualification lots found matching current criteria.
            </div>
          ) : (
            lotGroupsForDisplay.map((lot) => {
              const isCollapsed = collapsedLots[lot.lot_id]
              const isRej = lot.status === 'reject'
              const isMon = lot.status === 'monitor'

              return (
                <div
                  key={lot.lot_id}
                  className={`rounded-xl border transition-all overflow-hidden bg-[#070D1A] ${
                    isRej
                      ? 'border-rose-500/40 shadow-alert-glow'
                      : isMon
                      ? 'border-amber-500/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Lot Card Header Bar */}
                  <div
                    onClick={() =>
                      setCollapsedLots((prev) => ({ ...prev, [lot.lot_id]: !prev[lot.lot_id] }))
                    }
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#0B1528] cursor-pointer select-none border-b border-slate-800/80 hover:bg-[#0E1A32] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono text-xs">
                        {isCollapsed ? '▶' : '▼'}
                      </span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isRej ? 'bg-rose-500 led' : isMon ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                      />
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">
                          {lot.lot_id}
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                          {lot.parts.length} components in this lot
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Lot Baseline &mu;: <b className="text-cyan">{lot.mean.toFixed(2)} &micro;A</b>
                      </span>
                      {lot.rejects > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                          {lot.rejects} REJECT
                        </span>
                      )}
                      {lot.monitors > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                          {lot.monitors} MONITOR
                        </span>
                      )}
                      <span className="text-emerald-400 text-[10.5px]">
                        {lot.safe} Safe
                      </span>
                    </div>
                  </div>

                  {/* Lot Components Table */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] font-mono border-collapse">
                        <thead className="bg-[#091122] border-b border-slate-800 text-[10px] uppercase text-slate-400 tracking-wider">
                          <tr>
                            <th className="py-2 px-3">Verdict</th>
                            <th className="py-2 px-3">Traditional vs AI</th>
                            <th className="py-2 px-3">Component ID</th>
                            <th className="py-2 px-3">Subsystem</th>
                            <th className="py-2 px-3">0h (&micro;A)</th>
                            <th className="py-2 px-3">24h (&micro;A)</th>
                            <th className="py-2 px-3">96h (&micro;A)</th>
                            <th className="py-2 px-3">168h (&micro;A)</th>
                            <th className="py-2 px-3">Spec</th>
                            <th className="py-2 px-3">Lot z-Score</th>
                            <th className="py-2 px-3">Pred 168h</th>
                            <th className="py-2 px-3">Proj (264h)</th>
                            <th className="py-2 px-3">Risk</th>
                            <th className="py-2 px-3 text-right">3D Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {lot.parts.map((c) => {
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
                                <td className="py-1.5 px-3 whitespace-nowrap">
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
                                <td className="py-1.5 px-3 whitespace-nowrap">
                                  {isAbnormalInSpec ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/50 font-bold">
                                      <span>PASS</span> &rarr; <span className="text-rose-400">REJECT AI</span>
                                    </span>
                                  ) : (
                                    <span className="text-[9.5px] text-slate-400 font-mono">
                                      {c.traditional_decision}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1.5 px-3 font-bold text-white whitespace-nowrap">
                                  {c.component_id}
                                </td>
                                <td className="py-1.5 px-3 text-cyan whitespace-nowrap font-bold">
                                  [{c.subsystem}]
                                </td>
                                <td className="py-1.5 px-3 text-slate-400">{c.v0.toFixed(2)}</td>
                                <td className="py-1.5 px-3 text-slate-400">{c.v24.toFixed(2)}</td>
                                <td className="py-1.5 px-3 text-slate-400">{c.v96 != null ? c.v96.toFixed(2) : '--'}</td>
                                <td className={`py-1.5 px-3 font-bold ${isReject ? 'text-rose-400' : isMonitor ? 'text-amber-400' : 'text-slate-100'}`}>
                                  {c.v168.toFixed(2)}
                                </td>
                                <td className="py-1.5 px-3 text-slate-400">{c.limit_ua.toFixed(0)}</td>
                                <td className={`py-1.5 px-3 font-bold ${Math.abs(c.z168) >= 3.0 ? 'text-rose-400' : Math.abs(c.z168) >= 2.0 ? 'text-amber-400' : 'text-slate-300'}`}>
                                  {c.z168 > 0 ? '+' : ''}{c.z168.toFixed(2)}&sigma;
                                </td>
                                <td className="py-1.5 px-3 text-cyan font-bold">{c.predicted168_from_early.toFixed(2)}</td>
                                <td className="py-1.5 px-3 text-slate-300">{c.predicted_future.toFixed(2)}</td>
                                <td className="py-1.5 px-3 font-bold text-rose-400">{c.risk_score}</td>
                                <td className="py-1.5 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onFocusIn3D(c)
                                    }}
                                    className="hud-glass px-2 py-0.5 rounded border border-slate-700 text-cyan hover:border-cyan text-[10px]"
                                  >
                                    3D &rarr;
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      ) : (
        /* High-Density Flat Data Table */
        <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-[#070D1A] shadow-lg">
          <table className="w-full text-left text-[11px] font-mono border-collapse">
            <thead className="sticky top-0 bg-[#0B1528] border-b border-slate-800 z-10 text-[10px] uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="py-2.5 px-3">AI Verdict &amp; Health</th>
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
                      {/* Status badge & Behavioral Health */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
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
                          {c.behavioral_health && (
                            <span className={`text-[8.5px] font-bold tracking-wider px-1 py-0.5 rounded ${
                              c.behavioral_health === 'CRITICAL' ? 'text-rose-300 bg-rose-950/50 border border-rose-800/60' :
                              c.behavioral_health === 'DEGRADING' ? 'text-orange-300 bg-orange-950/50 border border-orange-800/60' :
                              c.behavioral_health === 'MONITOR' ? 'text-amber-300 bg-amber-950/50 border border-amber-800/60' :
                              'text-emerald-300 bg-emerald-950/50 border border-emerald-800/60'
                            }`}>
                              {c.behavioral_health === 'CRITICAL' ? '🔴 CRITICAL' :
                               c.behavioral_health === 'DEGRADING' ? '🟠 DEGRADING' :
                               c.behavioral_health === 'MONITOR' ? '🟡 MONITOR' : '🟢 NORMAL'}
                            </span>
                          )}
                        </div>
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
                      <td className="py-2 px-3">
                        <div className="flex flex-col">
                          <span className={`font-mono ${c.future_limit_breach || c.predicted_future > c.limit_ua ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                            {c.predicted_future.toFixed(2)}
                          </span>
                          {(c.future_limit_breach || c.predicted_future > c.limit_ua) && (
                            <span className="text-[8px] text-rose-400 font-bold tracking-tight">
                              &gt; LIMIT BREACH
                            </span>
                          )}
                        </div>
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
      )}

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
