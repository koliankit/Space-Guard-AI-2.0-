// Browser-native Web Audio API synthesizer for ISRO SpaceGuard AI Mission Control
// Zero external sound files needed, instant response, air-gapped compliant.

class SoundSystem {
  private ctx: AudioContext | null = null
  private enabled = true

  constructor() {
    // Check if user preferred muted in localStorage
    const saved = localStorage.getItem('spaceguard_sound_enabled')
    if (saved !== null) {
      this.enabled = saved === 'true'
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
    localStorage.setItem('spaceguard_sound_enabled', String(enable))
    if (!enable && this.ctx) {
      this.ctx.suspend().catch(() => {})
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled)
    return this.enabled
  }

  // Subtle telemetry radar/lock ping
  public playPing() {
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.06, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.13)
    } catch {
      // AudioContext blocked or not supported
    }
  }

  // Mechanical cybernetic button click
  public playClick() {
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(540, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.04)
      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.05)
    } catch {
      // Ignore
    }
  }

  // Critical anomaly alert siren
  public playAlert() {
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(650, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.12)
      osc.frequency.linearRampToValueAtTime(650, ctx.currentTime + 0.24)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.36)
    } catch {
      // Ignore
    }
  }

  // Clearance report & flight certification completion chime
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
      osc1.frequency.setValueAtTime(523.25, now) // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.1) // E5
      osc2.frequency.setValueAtTime(783.99, now + 0.2) // G5
      osc2.frequency.setValueAtTime(1046.50, now + 0.3) // C6

      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc1.stop(now + 0.25)
      osc2.start(now + 0.2)
      osc2.stop(now + 0.52)
    } catch {
      // Ignore
    }
  }
}

export const sounds = new SoundSystem()
