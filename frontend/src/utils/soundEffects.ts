// Browser-native Web Audio API synthesizer for ISRO SpaceGuard AI Mission Control
// Authentic Aerospace Telemetry & Electronic Space Instrument Sound Profile
// Zero external sound files needed, low volume, air-gapped compliant, respects autoplay policies.

class SoundSystem {
  private ctx: AudioContext | null = null
  private enabled = true

  constructor() {
    // Check if user preferred muted in localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spaceguard_sound_enabled')
      if (saved !== null) {
        this.enabled = saved === 'true'
      }
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  public setEnabled(enable: boolean) {
    this.enabled = enable
    if (typeof window !== 'undefined') {
      localStorage.setItem('spaceguard_sound_enabled', String(enable))
    }
    if (!enable && this.ctx) {
      this.ctx.suspend().catch(() => {})
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled)
    return this.enabled
  }

  // 1. Normal events: very soft electronic tick/pulse (Section 25)
  public playClick() {
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      // High-frequency subtle instrumentation tick
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1200, now)
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.025)

      // Very soft volume (0.025 max)
      gain.gain.setValueAtTime(0.025, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.035)
    } catch {
      // AudioContext blocked or suspended
    }
  }

  // Alias for soft electronic tick
  public playTick() {
    this.playClick()
  }

  // 2. Telemetry: subtle synthesized data pulse (Section 25)
  public playPing() {
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(987.77, now) // B5
      osc.frequency.exponentialRampToValueAtTime(1479.98, now + 0.06) // F#6

      gain.gain.setValueAtTime(0.03, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.095)
    } catch {
      // Ignore
    }
  }

  // Alias for telemetry data pulse
  public playTelemetry() {
    this.playPing()
  }

  // 3. Module transition: short clean electronic instrument tone (Section 25)
  public playTransition() {
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc2.type = 'sine'

      // Warm dual harmonic tone (F#5 to A#5)
      osc1.frequency.setValueAtTime(739.99, now)
      osc1.frequency.exponentialRampToValueAtTime(932.33, now + 0.08)

      osc2.frequency.setValueAtTime(1108.73, now)
      osc2.frequency.exponentialRampToValueAtTime(1396.91, now + 0.08)

      gain.gain.setValueAtTime(0.028, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.125)
      osc2.stop(now + 0.125)
    } catch {
      // Ignore
    }
  }

  // 4. Critical anomaly: short professional alert tone (Section 25)
  // Clean dual pulse, polite volume, no aggressive siren
  public playAlert() {
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      // Dual chirp: 659Hz (E5) -> 880Hz (A5)
      osc.frequency.setValueAtTime(659.25, now)
      osc.frequency.setValueAtTime(880.0, now + 0.07)
      osc.frequency.setValueAtTime(659.25, now + 0.14)

      gain.gain.setValueAtTime(0.045, now)
      gain.gain.setValueAtTime(0.045, now + 0.14)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.25)
    } catch {
      // Ignore
    }
  }

  // Alias for critical anomaly tone
  public playCritical() {
    this.playAlert()
  }

  // 5. Validation error: short low electronic warning tone (Section 25)
  public playWarning() {
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(320, now)
      osc.frequency.linearRampToValueAtTime(220, now + 0.12)

      gain.gain.setValueAtTime(0.035, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.15)
    } catch {
      // Ignore
    }
  }

  // 6. Flight clearance & qualification endorsement chime (Ascending peaceful triad)
  public playSuccess() {
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc2.type = 'sine'

      osc1.frequency.setValueAtTime(587.33, now) // D5
      osc1.frequency.setValueAtTime(739.99, now + 0.08) // F#5
      osc2.frequency.setValueAtTime(880.0, now + 0.16) // A5
      osc2.frequency.setValueAtTime(1174.66, now + 0.24) // D6

      gain.gain.setValueAtTime(0.035, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc1.stop(now + 0.2)
      osc2.start(now + 0.15)
      osc2.stop(now + 0.43)
    } catch {
      // Ignore
    }
  }
}

export const sounds = new SoundSystem()
