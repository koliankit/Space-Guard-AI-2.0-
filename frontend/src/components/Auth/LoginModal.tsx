import React, { useState } from 'react'
import { sounds } from '../../utils/soundEffects'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess?: (user: string) => void
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState('aerospace.lead')
  const [password, setPassword] = useState('••••••••••••')
  const [isLoading, setIsLoading] = useState(false)
  const [authSuccess, setAuthSuccess] = useState(false)

  if (!isOpen) return null

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    sounds.playClick()

    setTimeout(() => {
      setIsLoading(false)
      setAuthSuccess(true)
      sounds.playSuccess()

      setTimeout(() => {
        setAuthSuccess(false)
        if (onLoginSuccess) onLoginSuccess(username)
        onClose()
      }, 700)
    }, 900)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1726]/80 backdrop-blur-md animate-fade-in font-sans select-none">
      {/* Background Orbital Watermark */}
      <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full border border-[#2563EB]/40 animate-spin-slow" />
        <div className="w-[320px] h-[320px] rounded-full border border-dashed border-[#14B8A6]/40" />
      </div>

      {/* Foreground Login Card */}
      <div className="relative w-full max-w-md bg-[#162B40]/95 border border-[#2D4963] rounded-2xl p-6 md:p-8 shadow-[0_8px_32px_rgba(7,16,27,0.70)] flex flex-col gap-5 text-xs">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#718398] hover:text-[#F1F5F9] p-1.5 rounded-lg transition-colors cursor-pointer"
          title="Close Login Modal"
        >
          ✕
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2">
          {/* Logo Badge with Cyan Glow */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#162B40] border border-[#2563EB] flex items-center justify-center text-[#22D3EE] text-xl shadow-[0_0_16px_rgba(37,99,235,0.40)]">
            ✦
          </div>

          <h2 className="font-mono font-black text-xl text-[#F1F5F9] tracking-widest uppercase mt-1">
            ASTRA VIGIL
          </h2>

          <div className="text-[11px] font-mono text-[#A8B6C5] tracking-wider uppercase">
            AI-POWERED COMPONENT RELIABILITY
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#102337] border border-[#2D4963] text-[10.5px] font-mono text-[#22D3EE] mt-1">
            <span>●</span>
            <span>AIR-GAPPED ON-PREMISE CONSOLE</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-2">
          {/* Username Input */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[11px] font-mono font-bold text-[#A8B6C5] uppercase tracking-wider">
              Engineer / Operator ID
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-[#718398]">👤</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1B3445] border border-[#2D4963] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[#F1F5F9] placeholder-[#718398] font-mono text-xs outline-hidden transition-all"
                placeholder="operator@aerospace.isro.in"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono font-bold text-[#A8B6C5] uppercase tracking-wider">
                Cryptographic Key / Passphrase
              </label>
              <span className="text-[10px] text-[#718398] font-mono">MIL-STD Enclave</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-[#718398]">🔑</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1B3445] border border-[#2D4963] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[#F1F5F9] placeholder-[#718398] font-mono text-xs outline-hidden transition-all"
                placeholder="Enter enclave passphrase"
              />
            </div>
          </div>

          {/* Action Button: Secure Login */}
          <button
            type="submit"
            disabled={isLoading || authSuccess}
            className={`w-full mt-2 py-2.5 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
              authSuccess
                ? 'bg-[#10B981] text-white'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-[0_0_12px_rgba(37,99,235,0.30)]'
            }`}
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Authenticating Enclave...</span>
              </>
            ) : authSuccess ? (
              <>
                <span>✓</span>
                <span>Access Granted &mdash; Entering Console</span>
              </>
            ) : (
              <>
                <span>🔒</span>
                <span>Secure Login</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info: Secure Access & Private Deployment */}
        <div className="pt-3 border-t border-[#2D4963]/80 flex items-center justify-between text-[11px] font-mono text-[#718398]">
          <span className="flex items-center gap-1.5">
            <span className="text-[#10B981]">●</span> Secure Access
          </span>
          <span>Private Deployment</span>
        </div>
      </div>
    </div>
  )
}
