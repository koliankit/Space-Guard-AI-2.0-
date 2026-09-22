import React from 'react'
import type { DashboardTab } from './Header'
import type { TeeSecurityStatus } from '../../types'
import { sounds } from '../../utils/soundEffects'

interface SidebarNavProps {
  activeTab: DashboardTab
  onSelectTab: (tab: DashboardTab) => void
  totalComponents?: number
  rejectCount?: number
  monitorCount?: number
  safeCount?: number
  activeMissionName?: string
  teeStatus?: TeeSecurityStatus | null
  onOpenTeeModal?: () => void
  onOpenPitchModal?: () => void
  isOpenMobile?: boolean
  onCloseMobile?: () => void
}

interface NavItem {
  id: DashboardTab
  label: string
  icon: string
  badge?: string | number
  badgeColor?: string
  description?: string
}

export default function SidebarNav({
  activeTab,
  onSelectTab,
  totalComponents = 0,
  rejectCount = 0,
  monitorCount: _monitorCount = 0,
  safeCount: _safeCount = 0,
  activeMissionName: _activeMissionName = 'Gaganyaan H1',
  teeStatus,
  onOpenTeeModal,
  onOpenPitchModal,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarNavProps) {
  const [soundOn, setSoundOn] = React.useState(() => sounds.isEnabled())

  const toggleSound = () => {
    const next = sounds.toggle()
    setSoundOn(next)
  }

  // The 8 Canonical ASTRA VIGIL Navigation items requested by user
  const primaryNavItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Dashboard',
      icon: '📊',
      description: 'Component Overview & KPIs',
    },
    {
      id: 'matrix',
      label: 'Components',
      icon: '▦',
      badge: totalComponents > 0 ? `${totalComponents}` : undefined,
      badgeColor: 'bg-[#1B3445] text-[#A8B6C5] border-[#2D4963]',
      description: 'Parametric Table & Search',
    },
    {
      id: 'burn_in_data',
      label: 'Burn-In Data',
      icon: '📥',
      badge: totalComponents > 0 ? `${totalComponents} parts` : undefined,
      badgeColor: 'bg-[#162B40] text-[#14B8A6] border-[#14B8A6]/40',
      description: 'Ingestion & Validation Pipeline',
    },
    {
      id: 'ai_analysis',
      label: 'AI Analysis',
      icon: '🔬',
      description: 'Module A (Lot) & Module B (Drift)',
    },
    {
      id: 'risk_engine',
      label: 'Risk Engine',
      icon: '⚖️',
      badge: rejectCount > 0 ? `${rejectCount} REJ` : undefined,
      badgeColor: 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40',
      description: 'Decision Support Synthesis',
    },
    {
      id: 'satellite',
      label: '3D Localization',
      icon: '🛰️',
      description: 'Spacecraft CAD Digital Twin',
    },
    {
      id: 'report',
      label: 'Reports',
      icon: '📄',
      description: 'Audit & Certification Reports',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      badge: teeStatus?.enabled ? 'ENCLAVE' : undefined,
      badgeColor: 'bg-[#2563EB]/20 text-[#22D3EE] border-[#2563EB]/40',
      description: 'Thresholds & Security',
    },
  ]

  // Map legacy aliases to canonical tab ids for highlight comparison
  const isItemActive = (itemId: DashboardTab) => {
    if (activeTab === itemId) return true
    if (itemId === 'overview' && (activeTab === 'wall' || activeTab === 'overview')) return true
    if (itemId === 'matrix' && activeTab === 'matrix') return true
    if (itemId === 'burn_in_data' && (activeTab === 'csv_intake' || activeTab === 'validation' || activeTab === 'burn_in_data')) return true
    if (itemId === 'ai_analysis' && (activeTab === 'module_a' || activeTab === 'module_b' || activeTab === 'ai_analysis')) return true
    if (itemId === 'satellite' && (activeTab === 'satellite' || activeTab === 'telemetry' || activeTab === 'locations' || activeTab === 'lots')) return true
    if (itemId === 'report' && (activeTab === 'report' || activeTab === 'orbital')) return true
    return false
  }

  const handleSelect = (id: DashboardTab) => {
    sounds.playClick()
    onSelectTab(id)
    if (onCloseMobile) onCloseMobile()
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Container - Medium-Dark Navy #102337 */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 md:w-72 bg-[#102337] border-r border-[#2D4963] flex flex-col justify-between transition-transform duration-200 ease-in-out font-sans ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } shadow-lg`}
      >
        {/* Top Branding Section */}
        <div className="p-4 border-b border-[#2D4963] bg-[#0B1726]/60 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Modern Aerospace Icon with controlled Cyan/Blue Glow */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#162B40] border border-[#2563EB]/60 flex items-center justify-center text-white text-base shadow-[0_0_12px_rgba(37,99,235,0.30)] flex-shrink-0">
                <span className="text-[#22D3EE]">✦</span>
              </div>
              <div className="min-w-0">
                <div className="font-mono font-black text-sm md:text-base text-[#F1F5F9] tracking-wider uppercase flex items-center gap-1.5">
                  ASTRA VIGIL
                </div>
                <div className="text-[9.5px] font-mono text-[#A8B6C5] uppercase tracking-wider font-semibold">
                  AI-POWERED COMPONENT RELIABILITY
                </div>
              </div>
            </div>

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1 rounded text-[#718398] hover:text-[#F1F5F9]"
                title="Close sidebar"
              >
                ✕
              </button>
            )}
          </div>

          {/* Core concept banner */}
          <div className="bg-[#162B40] border border-[#2D4963] rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#A8B6C5] truncate">
              CONCEPT: <b className="text-[#22D3EE]">Within Limit ≠ Healthy</b>
            </span>
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse flex-shrink-0" />
          </div>
        </div>

        {/* Scrollable Navigation - 8 Core Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 select-none scrollbar-thin scrollbar-thumb-[#2D4963] scrollbar-track-transparent">
          <div className="px-2 py-1 text-[10px] font-mono font-bold tracking-widest text-[#718398] uppercase flex items-center justify-between">
            <span>MISSION NAVIGATION</span>
            <span className="w-8 h-px bg-[#2D4963]" />
          </div>

          {primaryNavItems.map((item) => {
            const active = isItemActive(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full group text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all duration-150 cursor-pointer relative border ${
                  active
                    ? 'bg-[#162B40] border-[#2563EB] text-[#F1F5F9] font-semibold shadow-[0_0_12px_rgba(37,99,235,0.20)]'
                    : 'bg-transparent border-transparent text-[#A8B6C5] hover:text-[#F1F5F9] hover:bg-[#1B3445]/60 hover:border-[#2D4963]'
                }`}
              >
                {/* Active Cyan Edge Indicator */}
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#14B8A6] shadow-[0_0_8px_#14B8A6]" />
                )}

                <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
                  <span className="text-base flex-shrink-0 opacity-90">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-xs md:text-[13px] font-medium tracking-wide truncate ${
                        active ? 'text-[#F1F5F9] font-bold' : 'text-[#A8B6C5] group-hover:text-[#F1F5F9]'
                      }`}
                    >
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-[10px] text-[#718398] truncate mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional Badge */}
                {item.badge && (
                  <span
                    className={`ml-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex-shrink-0 ${
                      item.badgeColor || 'bg-[#1B3445] text-[#A8B6C5] border-[#2D4963]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom of Sidebar: ● System Online | On-Premise Deployment */}
        <div className="p-3.5 border-t border-[#2D4963] bg-[#0B1726]/80 flex flex-col gap-2.5 flex-shrink-0 text-xs font-mono">
          {/* Status Display: System Online */}
          <div className="bg-[#162B40] border border-[#2D4963] rounded-lg p-2.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981] animate-pulse" />
              <span className="text-xs font-bold text-[#F1F5F9]">System Online</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-semibold uppercase">
              Operational
            </span>
          </div>

          {/* Deployment Mode: On-Premise Deployment */}
          <div className="flex items-center justify-between text-[11px] text-[#A8B6C5] px-1">
            <span className="flex items-center gap-1.5">
              <span>🔒</span> On-Premise Deployment
            </span>
            <span className="text-[9.5px] font-mono text-[#718398]">V2.4-SEC</span>
          </div>

          {/* Quick Utility Row */}
          <div className="flex items-center justify-between pt-1 border-t border-[#2D4963]/60 text-[#718398] text-[11px]">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className="hover:text-[#F1F5F9] flex items-center gap-1 transition-colors cursor-pointer"
              title="Toggle Audio Feedback"
            >
              <span>{soundOn ? '🔊' : '🔇'}</span>
              <span>{soundOn ? 'Audio' : 'Muted'}</span>
            </button>

            {/* Pitch Modal Shortcut */}
            {onOpenPitchModal && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick()
                  onOpenPitchModal()
                }}
                className="hover:text-[#F59E0B] transition-colors cursor-pointer font-bold"
                title="Briefing Deck (Press 'P')"
              >
                DECK [P]
              </button>
            )}

            {/* TEE Attestation Status */}
            {teeStatus && onOpenTeeModal && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick()
                  onOpenTeeModal()
                }}
                className="hover:text-[#22D3EE] transition-colors cursor-pointer font-bold"
                title="TEE Hardware Security"
              >
                TEE 🛡️
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
