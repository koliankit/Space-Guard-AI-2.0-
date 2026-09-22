import { useState, useRef, useEffect } from 'react'
import { sounds } from '../../utils/soundEffects'
import type { TeeSecurityStatus } from '../../types'

export type DashboardTab =
  | 'overview'
  | 'matrix'
  | 'burn_in_data'
  | 'ai_analysis'
  | 'risk_engine'
  | 'satellite'
  | 'report'
  | 'settings'
  | 'csv_intake'
  | 'validation'
  | 'module_a'
  | 'module_b'
  | 'diagnostics'
  | 'telemetry'
  | 'locations'
  | 'wall'
  | 'lots'
  | 'subsystems'
  | 'orbital'

interface HeaderProps {
  streamActive: boolean
  activeTab: DashboardTab
  onSelectTab: (tab: DashboardTab) => void
  totalComponents?: number
  rejectCount?: number
  onOpenPitchModal?: () => void
  onOpenIngestModal?: () => void
  activeMissionName?: string
  onResetWorkflow?: () => void
  onOpenOnboarding?: () => void
  teeStatus?: TeeSecurityStatus | null
  onOpenTeeModal?: () => void
  onToggleSidebar?: () => void
  onRunScreening?: () => void
  onOpenLoginModal?: () => void
  running?: boolean
  isScreened?: boolean
}

export default function Header({
  streamActive: _streamActive,
  activeTab,
  onSelectTab,
  totalComponents = 0,
  rejectCount = 0,
  onOpenPitchModal: _onOpenPitchModal,
  onOpenIngestModal: _onOpenIngestModal,
  activeMissionName: _activeMissionName = 'Gaganyaan H1',
  onResetWorkflow: _onResetWorkflow,
  onOpenOnboarding: _onOpenOnboarding,
  teeStatus: _teeStatus,
  onOpenTeeModal: _onOpenTeeModal,
  onToggleSidebar,
  onRunScreening,
  onOpenLoginModal,
  running = false,
  isScreened = false,
}: HeaderProps) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Workflow steps
  const workflowSteps = [
    { label: 'DETECT', tab: 'burn_in_data' },
    { label: 'UNDERSTAND', tab: 'ai_analysis' },
    { label: 'PREDICT', tab: 'ai_analysis' },
    { label: 'LOCALIZE', tab: 'satellite' },
    { label: 'DECIDE', tab: 'risk_engine' },
  ]

  // Sample notifications
  const recentNotifications = [
    { id: 1, title: 'Lot Deviation Alert', desc: 'C-1045 exceeded +3.8σ lot variance threshold', time: '12m ago', type: 'reject' },
    { id: 2, title: 'HTOL Burn-in Drift', desc: 'C-0872 positive parametric drift at 168h', time: '45m ago', type: 'monitor' },
    { id: 3, title: 'Lot Ingestion Completed', desc: '1,232 parts parsed across 18 lots', time: '2h ago', type: 'safe' },
  ]

  return (
    <header className="border-b border-[#2D4963] bg-[#162B40] sticky top-0 z-40 font-sans select-none flex-shrink-0 shadow-sm">
      <div className="flex items-center justify-between px-3 md:px-5 py-2.5 gap-3 w-full">
        {/* Left Section: Mobile Menu, ASTRA VIGIL Logo */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 rounded-lg bg-[#1B3445] border border-[#2D4963] text-[#F1F5F9] hover:text-[#22D3EE] hover:border-[#22D3EE] transition-colors flex-shrink-0 cursor-pointer"
              title="Toggle Navigation Menu"
            >
              <span className="text-sm">☰</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            {/* Aerospace Badge */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1E3A8A] to-[#1B3445] border border-[#2563EB]/70 flex items-center justify-center text-[#22D3EE] text-sm shadow-[0_0_10px_rgba(37,99,235,0.30)] flex-shrink-0 font-bold">
              ✦
            </div>
            <div className="flex flex-col">
              <span className="text-sm md:text-base font-mono font-black tracking-widest text-[#F1F5F9] uppercase leading-none">
                ASTRA VIGIL
              </span>
              <span className="text-[9px] text-[#A8B6C5] font-mono tracking-wider uppercase mt-1 hidden sm:block">
                AI-POWERED COMPONENT RELIABILITY
              </span>
            </div>
          </div>
        </div>

        {/* Center Section: Core Workflow (DETECT → UNDERSTAND → PREDICT → LOCALIZE → DECIDE) */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#102337] border border-[#2D4963] text-xs font-mono">
          {workflowSteps.map((step, idx) => {
            const isLast = idx === workflowSteps.length - 1
            const isHighlighted =
              (step.label === 'DETECT' && (activeTab === 'burn_in_data' || activeTab === 'csv_intake' || activeTab === 'validation')) ||
              (step.label === 'UNDERSTAND' && (activeTab === 'ai_analysis' || activeTab === 'module_a')) ||
              (step.label === 'PREDICT' && (activeTab === 'ai_analysis' || activeTab === 'module_b')) ||
              (step.label === 'LOCALIZE' && (activeTab === 'satellite' || activeTab === 'telemetry')) ||
              (step.label === 'DECIDE' && (activeTab === 'risk_engine' || activeTab === 'matrix'))

            return (
              <div key={step.label} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSelectTab(step.tab as DashboardTab)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    isHighlighted
                      ? 'bg-[#2563EB] text-[#F1F5F9] shadow-[0_0_8px_rgba(37,99,235,0.40)] font-bold'
                      : 'text-[#A8B6C5] hover:text-[#F1F5F9] hover:bg-[#1B3445]'
                  }`}
                  title={`Navigate to ${step.label} workflow step`}
                >
                  {step.label}
                </button>
                {!isLast && <span className="text-[#718398] text-[10px]">→</span>}
              </div>
            )
          })}
        </div>

        {/* Right Section: System Online, Notifications, User/Profile Dropdown */}
        <div className="flex items-center gap-2.5 text-xs font-mono flex-shrink-0" ref={dropdownRef}>
          {/* Quick Trigger Run Screening button if components loaded */}
          {totalComponents > 0 && onRunScreening && !isScreened && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                onRunScreening()
              }}
              disabled={running}
              className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Run AI Screening"
            >
              <span>{running ? '⏳' : '⚡'}</span>
              <span className="hidden sm:inline">{running ? 'Screening...' : 'Run Screening'}</span>
            </button>
          )}

          {/* System Online Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#102337] border border-[#2D4963] text-xs">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981] animate-pulse" />
            <span className="text-[#F1F5F9] font-medium text-[11px]">System Online</span>
          </div>

          {/* Notification Icon */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                setNotificationsOpen((prev) => !prev)
                setProfileDropdownOpen(false)
              }}
              className="p-1.5 rounded-lg bg-[#102337] border border-[#2D4963] text-[#A8B6C5] hover:text-[#F1F5F9] hover:border-[#3E6182] transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <span className="text-sm">🔔</span>
              {rejectCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                  {rejectCount}
                </span>
              )}
            </button>

            {/* Notifications Menu */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-lg p-2.5 z-50 text-xs animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-[#2D4963] mb-2">
                  <span className="font-bold text-[#F1F5F9]">System Notifications</span>
                  <span className="text-[10px] text-[#22D3EE] font-medium">3 Unread</span>
                </div>
                <div className="space-y-1.5">
                  {recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-2 rounded-lg bg-[#1B3445] hover:bg-[#203C55] transition-colors cursor-pointer border border-transparent hover:border-[#2D4963]"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-semibold ${
                            notif.type === 'reject'
                              ? 'text-[#EF4444]'
                              : notif.type === 'monitor'
                              ? 'text-[#F59E0B]'
                              : 'text-[#10B981]'
                          }`}
                        >
                          {notif.title}
                        </span>
                        <span className="text-[9px] text-[#718398]">{notif.time}</span>
                      </div>
                      <p className="text-[10.5px] text-[#A8B6C5] mt-0.5 leading-snug">{notif.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                sounds.playClick()
                setProfileDropdownOpen((prev) => !prev)
                setNotificationsOpen(false)
              }}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#102337] border border-[#2D4963] hover:border-[#3E6182] text-[#F1F5F9] transition-colors cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-[10px]">
                RE
              </div>
              <span className="hidden md:inline font-semibold text-[11px] text-[#F1F5F9]">Engineer</span>
              <span className="text-[9px] text-[#718398]">▼</span>
            </button>

            {/* Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#162B40] border border-[#2D4963] shadow-lg p-2 z-50 text-xs animate-fade-in">
                <div className="px-2.5 py-2 border-b border-[#2D4963] mb-1">
                  <div className="font-bold text-[#F1F5F9]">Mission Reliability Engineer</div>
                  <div className="text-[10px] text-[#718398]">ID: RE-883-QUAL &bull; Level-S</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false)
                    onSelectTab('settings')
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-[#A8B6C5] hover:text-[#F1F5F9] hover:bg-[#1B3445] transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>⚙️</span> Platform Settings
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false)
                    if (onOpenLoginModal) onOpenLoginModal()
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-[#22D3EE] hover:bg-[#1B3445] transition-colors flex items-center gap-2 cursor-pointer mt-0.5"
                >
                  <span>🔒</span> Lock Console / Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
