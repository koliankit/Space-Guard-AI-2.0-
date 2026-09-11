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

        // Aerospace Telemetry White & High-Contrast Accents (replaces blue)
        telemetry: {
          slate: '#FFFFFF',
          steel: '#F8FAFC',
          dark: '#E2E8F0',
          muted: '#94A3B8',
        },
        cyan: '#FFFFFF',
        blue: '#F8FAFC',
        accent: '#F59E0B',
        'blue-deep': '#334155',

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
        sans: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
        display: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
        telemetry: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
        mono: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
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

