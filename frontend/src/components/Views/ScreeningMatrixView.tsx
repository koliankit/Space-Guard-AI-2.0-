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
  const [filterMode, setFilterMode] = useState<'ALL' | 'reject' | 'monitor' | 'safe'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'risk' | 'z168' | 'slope' | 'v168' | 'id'>('risk')
  const [sortAsc, setSortAsc] = useState(false)

  // Status counts
  const counts = useMemo(() => {
    return {
      all: components.length,
      reject: components.filter((c) => c.status === 'reject').length,
      monitor: components.filter((c) => c.status === 'monitor').length,
      safe: components.filter((c) => c.status === 'safe').length,
    }
  }, [components])

  // Filter & Search
  const filtered = useMemo(() => {
    return components.filter((c) => {
      const matchesFilter = filterMode === 'ALL' || c.status === filterMode
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
      'v0_uA',
      'v24_uA',
      'v96_uA',
      'v168_uA',
      'limit_uA',
      'z_score',
      'drift_slope_uA_hr',
      'iso_score',
      'risk_score',
      'status',
      'traditional_decision',
      'screening_reason',
    ]
    const csvRows = [headers.join(',')]
    sorted.forEach((c) => {
      csvRows.push(
        [
          `"${c.component_id}"`,
          `"${c.subsystem}"`,
          `"${c.lot_id}"`,
          c.v0,
          c.v24,
          c.v96 ?? '',
          c.v168,
          c.limit_ua,
          c.z168.toFixed(3),
          c.slope.toFixed(5),
          c.iso_score.toFixed(1),
          c.risk_score,
          `"${c.status}"`,
          `"${c.traditional_decision}"`,
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
    <div className="flex flex-col flex-1 p-5 bg-bg font-mono select-none overflow-hidden">
      {/* Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-line mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan led" />
            <h2 className="m-0 text-sm font-display font-black tracking-widest text-slate-100 uppercase">
              ISRO COMPONENT SCREENING MATRIX &amp; ANOMALY LEDGER
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/40 font-bold">
              MIL-STD-883 METHOD 1005
            </span>
          </div>
          <div className="text-[10px] text-muted tracking-wider mt-0.5">
            Full-Spectrum Burn-In Screening &bull; Isolation Forest Multivariate Outlier Detection &bull; Latent Drift Ledger
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={components.length === 0}
            className="hud-glass-interactive border-line text-cyan hover:border-cyan font-mono text-xs px-3 py-1.5 rounded border transition-all flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>&#8681;</span> EXPORT CSV LEDGER
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`text-xs px-3 py-1 rounded border transition-all ${
              filterMode === 'ALL'
                ? 'bg-cyan/20 border-cyan text-cyan font-bold shadow-neon-cyan'
                : 'hud-glass-interactive border-line text-muted hover:text-white'
            }`}
          >
            ALL [{counts.all}]
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('reject')}
            className={`text-xs px-3 py-1 rounded border transition-all ${
              filterMode === 'reject'
                ? 'bg-reject/25 border-reject text-reject font-bold shadow-alert-glow'
                : 'hud-glass-interactive border-line text-reject/80 hover:text-reject'
            }`}
          >
            &#9888; REJECT [{counts.reject}]
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('monitor')}
            className={`text-xs px-3 py-1 rounded border transition-all ${
              filterMode === 'monitor'
                ? 'bg-monitor/25 border-monitor text-monitor font-bold'
                : 'hud-glass-interactive border-line text-monitor/80 hover:text-monitor'
            }`}
          >
            &#9670; MONITOR [{counts.monitor}]
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('safe')}
            className={`text-xs px-3 py-1 rounded border transition-all ${
              filterMode === 'safe'
                ? 'bg-safe/25 border-safe text-safe font-bold shadow-neon-green'
                : 'hud-glass-interactive border-line text-safe/80 hover:text-safe'
            }`}
          >
            &#10003; SAFE [{counts.safe}]
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[280px]">
          <input
            type="text"
            placeholder="Search Part ID, Subsystem, Lot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#061224] border border-line text-slate-100 text-xs px-3 py-1.5 rounded focus:border-cyan focus:outline-none placeholder-muted"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-white text-xs"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="flex-1 overflow-auto rounded border border-line bg-[#020D05] reticle-corner shadow-panel-subtle">
        <table className="w-full text-left text-[11px] font-mono border-collapse">
          <thead className="sticky top-0 bg-[#051C0C] border-b border-line z-10 text-[10px] uppercase text-muted tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Status</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-accent"
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
              <th className="py-2.5 px-3">0h (&#956;A)</th>
              <th className="py-2.5 px-3">24h (&#956;A)</th>
              <th className="py-2.5 px-3">96h (&#956;A)</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-accent"
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
              <th className="py-2.5 px-3">Limit</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-accent"
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
                className="py-2.5 px-3 cursor-pointer hover:text-accent"
                onClick={() => {
                  if (sortBy === 'slope') setSortAsc(!sortAsc)
                  else {
                    setSortBy('slope')
                    setSortAsc(false)
                  }
                }}
              >
                Drift Rate {sortBy === 'slope' ? (sortAsc ? '\u25b2' : '\u25bc') : ''}
              </th>
              <th className="py-2.5 px-3">Iso-Score</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-accent"
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
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-8 text-center text-muted">
                  No components found matching current filter &bull; Run AI Screening to populate matrix.
                </td>
              </tr>
            ) : (
              sorted.map((c) => {
                const isSelected = c.component_id === selectedId
                const isReject = c.status === 'reject'
                const isMonitor = c.status === 'monitor'

                return (
                  <tr
                    key={c.component_id}
                    onClick={() => onSelectComponent(c.component_id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-accent/15 text-white font-semibold'
                        : isReject
                        ? 'hover:bg-reject/10'
                        : isMonitor
                        ? 'hover:bg-monitor/10'
                        : 'hover:bg-[#062414]'
                    }`}
                  >
                    {/* Status badge */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isReject
                            ? 'bg-reject/20 text-reject border border-reject/40'
                            : isMonitor
                            ? 'bg-monitor/20 text-monitor border border-monitor/40'
                            : 'bg-safe/20 text-safe border border-safe/40'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isReject ? 'bg-reject led' : isMonitor ? 'bg-monitor' : 'bg-safe'
                          }`}
                        />
                        {c.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Component ID */}
                    <td className="py-2 px-3 font-bold text-slate-100 whitespace-nowrap">
                      {c.component_id}
                    </td>

                    {/* Subsystem */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="text-cyan font-bold">[{c.subsystem}]</span>{' '}
                      <span className="text-muted text-[10px]">{c.subsystem_name}</span>
                    </td>

                    {/* Lot ID */}
                    <td className="py-2 px-3 text-muted whitespace-nowrap">{c.lot_id}</td>

                    {/* Telemetry stages */}
                    <td className="py-2 px-3 text-slate-200">{c.v0.toFixed(2)}</td>
                    <td className="py-2 px-3 text-slate-200">{c.v24.toFixed(2)}</td>
                    <td className="py-2 px-3 text-slate-200">{c.v96 != null ? c.v96.toFixed(2) : '\u2014'}</td>
                    <td
                      className={`py-2 px-3 font-bold ${
                        c.v168 > c.limit_ua ? 'text-reject' : isReject ? 'text-amber-400' : 'text-slate-100'
                      }`}
                    >
                      {c.v168.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-muted">{c.limit_ua.toFixed(0)}</td>

                    {/* Lot z-Score */}
                    <td
                      className={`py-2 px-3 font-bold ${
                        Math.abs(c.z168) > 3.0 ? 'text-reject' : Math.abs(c.z168) > 2.0 ? 'text-monitor' : 'text-muted'
                      }`}
                    >
                      {c.z168 > 0 ? '+' : ''}
                      {c.z168.toFixed(2)}&sigma;
                    </td>

                    {/* Drift rate */}
                    <td className="py-2 px-3 text-slate-200">{c.slope.toFixed(4)}</td>

                    {/* Iso-score */}
                    <td className="py-2 px-3 text-muted">{c.iso_score.toFixed(1)}</td>

                    {/* Composite risk */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-line overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isReject ? 'bg-reject' : isMonitor ? 'bg-monitor' : 'bg-safe'
                            }`}
                            style={{ width: `${c.risk_score}%` }}
                          />
                        </div>
                        <span
                          className={`font-bold ${
                            isReject ? 'text-reject' : isMonitor ? 'text-monitor' : 'text-safe'
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
                        className="hud-glass-interactive border-line text-cyan hover:border-cyan text-[10px] px-2 py-0.5 rounded border"
                        title="Focus this component on the 3D Satellite Digital Twin"
                      >
                        3D VIEW &rarr;
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
      <div className="flex items-center justify-between text-[10px] text-muted pt-3 border-t border-line mt-3">
        <div>
          Showing <span className="text-slate-100 font-bold">{sorted.length}</span> of{' '}
          <span className="text-slate-100 font-bold">{components.length}</span> screened aerospace components
        </div>
        <div>
          MIL-STD-883 Method 1005 HTOL Compliant &bull; ISRO Satellite Reliability Engine
        </div>
      </div>
    </div>
  )
}
