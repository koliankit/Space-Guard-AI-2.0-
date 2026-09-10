/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep Space Aerospace Canvas
        bg: '#070B14',
        bg2: '#0B1220',
        panel: '#0E1729',
        panel2: '#131F36',
        panel3: '#182744',
        border: '#1E2D4A',
        line: '#223554',
        muted: '#8B9BB4',
        dim: '#4B5E7D',

        // ISRO Aerospace Saffron & Gold Identity
        isro: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          saffron: '#F97316',
          gold: '#F59E0B',
        },

        // Aerospace Telemetry Slate (replaces toy electric cyan)
        telemetry: {
          slate: '#38A3FF',
          steel: '#2563EB',
          dark: '#1E3A8A',
          muted: '#64748B',
        },
        cyan: '#38A3FF',
        blue: '#2563EB',
        accent: '#F59E0B',
        'blue-deep': '#1E3A8A',

        // Clean Nominal / Flight Safe (Subdued Sage & Crisp Jade)
        safe: '#10B981',
        lime: '#059669',
        emerald: '#10B981',

        // Anomaly Reject (Aerospace Coral Crimson)
        reject: '#EF4444',
        danger: '#DC2626',
        crimson: '#B91C1C',

        // Latent Drift Warning (Mission Amber)
        monitor: '#F59E0B',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', 'Space Grotesk', 'sans-serif'],
        telemetry: ['Rajdhani', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'isro-gold': '0 0 16px rgba(245, 158, 11, 0.22)',
        'telemetry-blue': '0 0 16px rgba(56, 163, 255, 0.2)',
        'panel-subtle': '0 4px 20px rgba(0, 0, 0, 0.55)',
        'alert-glow': '0 0 20px rgba(239, 68, 68, 0.3)',
      },
    },
  },
  plugins: [],
}

