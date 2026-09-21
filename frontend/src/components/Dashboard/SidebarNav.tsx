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
  tag?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

export default function SidebarNav({
  activeTab,
  onSelectTab,
  totalComponents = 0,
  rejectCount = 0,
  monitorCount: _monitorCount = 0,
  safeCount: _safeCount = 0,
  activeMissionName = 'Gaganyaan H1',
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

  // Canonical tabs matching user specifications exactly
  const navSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        {
          id: 'wall',
          label: 'Command Wall (Module A & B)',
          icon: '⚡',
          tag: '00',
          description: 'Multi-Screen Sector Wall & KPI Hub',
        },
        {
          id: 'locations',
          label: 'Lot & Locations',
          icon: '📦',
          tag: '01',
          description: 'Qualification Lot Architecture',
        },
        {
          id: 'satellite',
          label: '3D Satellite',
          icon: '🛰️',
          tag: '02',
          description: 'Interactive Digital Twin Hardware',
        },
        {
          id: 'matrix',
          label: 'AI Matrix',
          icon: '▦',
          tag: '03',
          badge: totalComponents > 0 ? `${totalComponents} parts` : undefined,
          badgeColor: 'bg-[#142B40] text-[#F1F5F9] border-[#1D3A52]',
          description: 'Comprehensive Screening Matrix',
        },
      ],
    },
    {
      title: 'DATA',
      items: [
        {
          id: 'csv_intake',
          label: 'CSV Intake',
          icon: '📥',
          badge: totalComponents > 0 ? `${totalComponents} loaded` : undefined,
          badgeColor: 'bg-[#102337] text-[#0E88D3] border-[#0E88D3]/40',
          description: 'Telemetry File Ingestion & Parsing',
        },
        {
          id: 'validation',
          label: 'Validation',
          icon: '🛡️',
          description: '3-Step Preprocessing Audit & Physics',
        },
        {
          id: 'module_a',
          label: 'Module A',
          icon: '🔬',
          description: 'Lot-Relative Dynamic Anomaly Detection',
        },
        {
          id: 'module_b',
          label: 'Module B',
          icon: '📈',
          description: 'Early Drift & 264h Failure Prediction',
        },
      ],
    },
    {
      title: 'ANALYSIS',
      items: [
        {
          id: 'risk_engine',
          label: 'Risk Engine',
          icon: '⚖️',
          description: 'Bayesian Multi-Factor Scoring Synthesis',
        },
        {
          id: 'matrix',
          label: 'Screening Matrix',
          icon: '▦',
          badge: rejectCount > 0 ? `${rejectCount} REJECT` : undefined,
          badgeColor: 'bg-[#E5484D]/20 text-[#E5484D] border-[#E5484D]/50',
          description: 'All-Component Decision Grid & Filters',
        },
        {
          id: 'diagnostics',
          label: 'Diagnostics',
          icon: '🩺',
          description: 'Physics Root Cause & Bus Failover',
        },
      ],
    },
    {
      title: 'SPACECRAFT',
      items: [
        {
          id: 'satellite',
          label: '3D Satellite',
          icon: '🛰️',
          description: '3D Hardware Localization & Bay Status',
        },
        {
          id: 'telemetry',
          label: 'Telemetry',
          icon: '📡',
          description: 'Parametric Oscilloscope DAQ Sweep',
        },
        {
          id: 'locations',
          label: 'Component Locations',
          icon: '📍',
          description: 'Subsystems & Lot Placement Map',
        },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        {
          id: 'orbital',
          label: 'Orbital DSN Tracking',
          icon: '🌐',
          tag: 'DSN',
          description: 'Ground Station Downlink & Orbit Geometry',
        },
        {
          id: 'subsystems',
          label: 'Subsystem Diagnostics',
          icon: '🔧',
          description: '11 Subsystems Health & Isolation Controls',
        },
        {
          id: 'report',
          label: 'Clearance Report & PDF',
          icon: '📄',
          badge: rejectCount > 0 ? `${rejectCount} REJ` : undefined,
          badgeColor: 'bg-[#E5484D] text-white border-transparent',
          description: 'Official ISRO Flight Readiness Certificate',
        },
      ],
    },
    {
      title: 'SETTINGS',
      items: [
        {
          id: 'settings',
          label: 'Settings & Security',
          icon: '⚙️',
          badge: teeStatus?.enabled ? 'ENCLAVE' : undefined,
          badgeColor: 'bg-[#0E88D3]/20 text-[#0E88D3] border-[#0E88D3]/40',
          description: 'TEE Enclave, Physics Limits & Display',
        },
      ],
    },
  ]

  // Map legacy aliases to canonical tab ids for highlight comparison
  const isItemActive = (itemId: DashboardTab) => {
    if (activeTab === itemId) return true
    if (itemId === 'wall' && (activeTab === 'overview' || activeTab === 'wall')) return true
    if (itemId === 'overview' && (activeTab === 'overview' || activeTab === 'wall')) return true
    if (itemId === 'locations' && (activeTab === 'locations' || activeTab === 'lots')) return true
    if (itemId === 'diagnostics' && (activeTab === 'diagnostics' || activeTab === 'subsystems')) return true
    if (itemId === 'subsystems' && (activeTab === 'diagnostics' || activeTab === 'subsystems')) return true
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
          className="fixed inset-0 bg-black/75 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Frame: full-height left navigation column docked seamlessly */}
      <aside
        className={`fixed lg:relative top-0 left-0 h-screen lg:h-full w-72 xl:w-80 bg-[#07111C] border-r border-[#1D3A52] z-40 lg:z-auto flex flex-col justify-between flex-shrink-0 min-h-0 transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header Identity */}
        <div className="p-3.5 border-b border-[#1D3A52] bg-[#0B1928] flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#102337] border border-[#F47216]/70 flex items-center justify-center font-bold text-[#F47216] font-mono text-xs shadow-orange">
                ISRO
              </div>
              <div>
                <div className="font-mono font-black text-sm text-[#F1F5F9] tracking-wider uppercase flex items-center gap-1.5">
                  SPACEGUARD <span className="text-[#F47216]">AI</span>
                </div>
                <div className="text-[10px] font-mono text-[#9AAFC0] uppercase tracking-wider">
                  Mission Control Deck
                </div>
              </div>
            </div>

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1 rounded text-[#9AAFC0] hover:text-white"
                title="Close sidebar"
              >
                ✕
              </button>
            )}
          </div>

          {/* Active Mission Pill */}
          <div className="bg-[#102337] border border-[#1D3A52] rounded-md px-2.5 py-1 flex items-center justify-between text-[11px] font-mono text-[#9AAFC0]">
            <span className="truncate max-w-[200px]" title={activeMissionName}>
              MISSION: <b className="text-[#F1F5F9]">{activeMissionName}</b>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-gentle-pulse" />
          </div>
        </div>

        {/* Scrollable Navigation Hierarchy */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2.5 select-none scrollbar-thin scrollbar-thumb-[#1D3A52] scrollbar-track-transparent">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              {/* Section Header with Accent Line */}
              <div className="flex items-center justify-between px-2 py-0.5">
                <span className="text-[9.5px] font-mono font-bold tracking-widest text-[#6F8495] uppercase">
                  {section.title}
                </span>
                <span className="w-10 h-px bg-[#1D3A52]" />
              </div>

              {/* Navigation Items */}
              <div className="space-y-0.5">
                {section.items.map((item, idx) => {
                  const active = isItemActive(item.id)
                  return (
                    <button
                      key={`${section.title}-${item.id}-${idx}`}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={`w-full group text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-all duration-150 cursor-pointer border ${
                        active
                          ? 'bg-[#142B40] border-[#0E88D3] text-[#F1F5F9] shadow-sm font-semibold ring-1 ring-[#0E88D3]/30'
                          : 'bg-transparent border-transparent text-[#9AAFC0] hover:text-[#F1F5F9] hover:bg-[#102337] hover:border-[#1D3A52]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs opacity-90 flex-shrink-0">{item.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {item.tag && (
                              <span
                                className={`text-[9px] font-mono px-1 rounded ${
                                  active
                                    ? 'bg-[#0E88D3]/20 text-[#0E88D3] font-bold'
                                    : 'bg-[#07111C] text-[#6F8495]'
                                }`}
                              >
                                {item.tag}
                              </span>
                            )}
                            <div
                              className={`text-[11.5px] font-mono tracking-wide truncate ${
                                active ? 'text-[#F1F5F9] font-bold' : 'group-hover:text-[#F1F5F9]'
                              }`}
                            >
                              {item.label}
                            </div>
                          </div>
                          {item.description && (
                            <div className="text-[9.5px] text-[#6F8495] truncate font-sans">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Optional Badge */}
                      {item.badge && (
                        <span
                          className={`ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border flex-shrink-0 ${
                            item.badgeColor || 'bg-[#102337] text-[#9AAFC0] border-[#1D3A52]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Active Indicator Bar */}
                      {active && (
                        <span className="w-1 h-3.5 rounded-full bg-[#0E88D3] ml-1.5 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Active Flight Telemetry HUD Widget - Uses the empty space intelligently */}
          <div className="mt-3 p-3 rounded-xl bg-[#0B1928] border border-[#1D3A52] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-[#1D3A52] pb-1 text-[10px] text-[#6F8495] uppercase tracking-wider font-bold">
              <span>ACTIVE TELEMETRY HUD</span>
              <span className="text-[#22A06B] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-gentle-pulse" />
                LIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="bg-[#07111C] p-1.5 rounded border border-[#1D3A52]">
                <div className="text-[9px] text-[#9AAFC0]">BATCH SIZE</div>
                <div className="font-bold text-[#F1F5F9] mt-0.5">{totalComponents > 0 ? `${totalComponents} Parts` : '0 Parts'}</div>
              </div>
              <div className="bg-[#07111C] p-1.5 rounded border border-[#1D3A52]">
                <div className="text-[9px] text-[#9AAFC0]">GATE STATUS</div>
                <div className={`font-bold mt-0.5 ${rejectCount > 0 ? 'text-[#E5484D]' : 'text-[#22A06B]'}`}>
                  {rejectCount > 0 ? `${rejectCount} REJECT` : 'FLIGHT OK'}
                </div>
              </div>
            </div>

            {/* Subsystem Quick Health Mini-Matrix */}
            <div className="bg-[#07111C] p-1.5 rounded border border-[#1D3A52] space-y-1">
              <div className="flex items-center justify-between text-[9px] text-[#9AAFC0]">
                <span>SUBSYSTEM HEALTH</span>
                <span className="text-[#22A06B]">NOMINAL</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[9px] text-center font-bold">
                <span className="bg-[#102337] text-[#22A06B] py-0.5 rounded border border-[#22A06B]/30">PWR 98%</span>
                <span className="bg-[#102337] text-[#E5484D] py-0.5 rounded border border-[#E5484D]/40">FC 84%</span>
                <span className="bg-[#102337] text-[#22A06B] py-0.5 rounded border border-[#22A06B]/30">COM 96%</span>
                <span className="bg-[#102337] text-[#22A06B] py-0.5 rounded border border-[#22A06B]/30">SEN 95%</span>
              </div>
            </div>

            <div className="bg-[#07111C] p-1.5 rounded border border-[#1D3A52] flex items-center justify-between text-[10px]">
              <span className="text-[#9AAFC0]">ENCLAVE CRYPTO:</span>
              <span className="text-[#0E88D3] font-bold">HMAC-SHA256</span>
            </div>

            <div className="bg-[#07111C] p-1.5 rounded border border-[#1D3A52] flex items-center justify-between text-[10px]">
              <span className="text-[#9AAFC0]">DSN LINK:</span>
              <span className="text-[#22A06B] font-bold">BYL-32 (LOCK)</span>
            </div>

            <div className="bg-[#07111C] p-1.5 rounded border border-[#1D3A52] flex items-center justify-between text-[10px]">
              <span className="text-[#9AAFC0]">BUS TELEMETRY:</span>
              <span className="text-[#0E88D3] font-bold">28.12V &bull; 23.4&deg;C</span>
            </div>
          </div>
        </nav>

        {/* Bottom Operational Footer */}
        <div className="p-3 border-t border-[#1D3A52] bg-[#0B1928] flex flex-col gap-2 flex-shrink-0 text-xs font-mono">
          {/* TEE Security Chip */}
          {teeStatus && onOpenTeeModal && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                onOpenTeeModal()
              }}
              className="w-full bg-[#102337] hover:bg-[#142B40] border border-[#1D3A52] hover:border-[#0E88D3] p-2 rounded-md flex items-center justify-between text-[11px] transition-colors cursor-pointer group"
              title="Click to view TEE Attestation and Confidential Computing parameters"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#0E88D3] animate-gentle-pulse flex-shrink-0" />
                <span className="text-[#9AAFC0] group-hover:text-[#F1F5F9] font-bold truncate">
                  TEE {(teeStatus?.mode || 'simulated').toUpperCase()}
                </span>
              </div>
              <span className="text-[10px] text-[#0E88D3] border border-[#0E88D3]/40 px-1 rounded uppercase flex-shrink-0">
                ENCLAVE
              </span>
            </button>
          )}

          {/* Quick Utility Row */}
          <div className="flex items-center justify-between pt-1 text-[#9AAFC0] text-[11px]">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className="hover:text-[#F1F5F9] flex items-center gap-1 transition-colors cursor-pointer"
              title="Toggle Audio Feedback"
            >
              <span>{soundOn ? '🔊' : '🔇'}</span>
              <span>{soundOn ? 'AUDIO' : 'MUTED'}</span>
            </button>

            {/* Pitch Modal Shortcut */}
            {onOpenPitchModal && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick()
                  onOpenPitchModal()
                }}
                className="hover:text-[#F47216] transition-colors cursor-pointer"
                title="ISRO Briefing Deck (Press 'P')"
              >
                DECK [P]
              </button>
            )}

            {/* Quick Settings shortcut */}
            <button
              type="button"
              onClick={() => handleSelect('settings')}
              className="hover:text-[#0E88D3] transition-colors cursor-pointer"
              title="Open System & Security Settings"
            >
              SETTINGS ⚙️
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
