/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep Space Aerospace Canvas
        bg: '#060B14',
        bg2: '#0B1528',
        panel: '#0B192E',
        panel2: '#0F223D',
        line: '#1B3252',
        muted: '#94A3B8',
        dim: '#475569',
        // Blue / Cyan Palette (Command & Telemetry Architecture)
        cyan: '#00F0FF',
        blue: '#38BDF8',
        accent: '#00F0FF',
        'blue-deep': '#1D4ED8',
        // Green Palette (Nominal, Safe & Sensor Vitality)
        safe: '#00FF87',
        lime: '#39FF14',
        emerald: '#10B981',
        // Red Palette (Alerts, Anomalies & Risk Thresholds)
        reject: '#FF334B',
        danger: '#FF2A55',
        crimson: '#E11D48',
        // Amber (Latent Drift Warning)
        monitor: '#FFB020',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'Rajdhani', 'sans-serif'],
        mono: ['Share Tech Mono', 'JetBrains Mono', 'IBM Plex Mono', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 16px rgba(0, 240, 255, 0.45)',
        'neon-blue': '0 0 16px rgba(56, 189, 248, 0.45)',
        'neon-green': '0 0 16px rgba(0, 255, 135, 0.5)',
        'neon-lime': '0 0 16px rgba(57, 255, 20, 0.5)',
        'alert-glow': '0 0 24px rgba(255, 51, 75, 0.55)',
        'hud-glow': '0 0 20px rgba(0, 240, 255, 0.35)',
        'panel-subtle': '0 4px 20px rgba(0, 0, 0, 0.65)',
      },
    },
  },
  plugins: [],
}
