import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'dark' | 'light'
  selected?: boolean
  interactive?: boolean
  children: React.ReactNode
  className?: string
}

/**
 * Clean aerospace card styling tokens
 */
export const CARD_STYLES = {
  dark: {
    box: 'bg-[#122238] border border-[#1E385B] text-[#F1F5F9] rounded-xl',
    subbox: 'bg-[#0E1A2B] border border-[#1A3150] text-[#F1F5F9] rounded-lg',
    heading: 'text-white font-bold',
    body: 'text-[#F1F5F9]',
    secondary: 'text-[#94A3B8]',
    icon: 'text-[#38BDF8]',
    selected: 'border-[#38BDF8] ring-1 ring-[#38BDF8]/50',
    hover: 'hover:border-[#38BDF8]/60 transition-colors',
  },
  light: {
    box: 'bg-[#FFFFFF] border border-[#D5DEE7] text-[#1E293B] rounded-xl',
    subbox: 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B] rounded-lg',
    heading: 'text-[#0F1D2E] font-bold',
    body: 'text-[#1E293B]',
    secondary: 'text-[#64748B]',
    icon: 'text-[#0E88D3]',
    selected: 'border-[#0E88D3] ring-1 ring-[#0E88D3]/40',
    hover: 'hover:border-[#0E88D3]/60 transition-colors',
  },
}

export const STATUS_STYLES = {
  dark: {
    safe: 'bg-[#168A5B]/20 text-[#34D399] border border-[#168A5B]/40',
    monitor: 'bg-[#C58A00]/20 text-[#FBBF24] border border-[#C58A00]/40',
    reject: 'bg-[#D9363E]/20 text-[#F87171] border border-[#D9363E]/40',
    accent: 'bg-[#0E88D3]/20 text-[#38BDF8] border border-[#0E88D3]/40',
  },
  light: {
    safe: 'bg-[#F0FDF4] text-[#168A5B] border border-[#168A5B]/30',
    monitor: 'bg-[#FFFBEB] text-[#C58A00] border border-[#C58A00]/30',
    reject: 'bg-[#FEF2F2] text-[#D9363E] border border-[#D9363E]/30',
    accent: 'bg-[#F0F7FD] text-[#0E88D3] border border-[#0E88D3]/30',
  },
}

export default function Card({
  variant = 'light',
  selected = false,
  interactive = false,
  children,
  className = '',
  ...props
}: CardProps) {
  const styles = CARD_STYLES[variant]
  const cardClass = variant === 'dark' ? 'card-dark' : 'card-light'

  const selectedClass = selected ? styles.selected : ''
  const interactiveClass = interactive ? styles.hover : ''

  return (
    <div
      className={`${cardClass} ${styles.box} ${selectedClass} ${interactiveClass} ${className}`}
      data-selected={selected ? 'true' : 'false'}
      {...props}
    >
      {children}
    </div>
  )
}
