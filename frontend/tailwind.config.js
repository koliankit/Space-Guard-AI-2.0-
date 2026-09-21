/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // SpaceGuard AI ISRO Aerospace Background System
        bg: '#07111C',              // Main Background - Deep Space Navy
        bg2: '#0B1928',             // Secondary Background - Sub-panels & Toolbars
        panel: '#102337',           // Panel / Card - Surface Navy
        panel2: '#142B40',          // Elevated Panel - Interactive Hover Navy
        'panel-critical': '#24141E', // Critical Alert Panel

        // Text Hierarchy
        'text-primary': '#F1F5F9',   // Primary Text
        'text-secondary': '#9AAFC0', // Secondary Text
        muted: '#9AAFC0',
        dim: '#6F8495',             // Muted Text

        // Borders & Dividers
        border: '#1D3A52',          // Border / Divider - Clean Precision Blue
        line: '#1D3A52',

        // Primary Colors: ISRO Blue (#0E88D3)
        'isro-blue': {
          DEFAULT: '#0E88D3',
          hover: '#249CE6',
          dark: '#0A68A3',
          muted: 'rgba(14, 136, 211, 0.18)',
        },
        'tech-blue': {
          DEFAULT: '#0E88D3',
          hover: '#249CE6',
          dark: '#0A68A3',
          muted: 'rgba(14, 136, 211, 0.18)',
        },
        blue: {
          DEFAULT: '#0E88D3',
          400: '#249CE6',
          500: '#0E88D3',
          600: '#0A68A3',
        },
        cyan: '#0E88D3',

        // Primary Accent: ISRO Orange (#F47216 - ~7% ratio)
        'isro-orange': {
          DEFAULT: '#F47216',
          hover: '#FA8838',
          dark: '#C65507',
          muted: 'rgba(244, 114, 22, 0.18)',
        },
        accent: '#F47216',
        gold: {
          DEFAULT: '#F47216',
          hover: '#FA8838',
          dark: '#C65507',
          muted: 'rgba(244, 114, 22, 0.18)',
        },
        isro: {
          DEFAULT: '#0E88D3',
          blue: '#0E88D3',
          orange: '#F47216',
          amber: '#F47216',
          saffron: '#F47216',
          gold: '#F47216',
        },

        // Status Colors (Strictly Separated from Brand Blue & Orange)
        // SAFE: Green (#22A06B)
        safe: {
          DEFAULT: '#22A06B',
          hover: '#28BD7E',
          dark: '#187A50',
          muted: 'rgba(34, 160, 107, 0.18)',
        },
        emerald: {
          DEFAULT: '#22A06B',
          300: '#4ADE80',
          400: '#28BD7E',
          500: '#22A06B',
          600: '#187A50',
          700: '#15803D',
        },
        green: {
          DEFAULT: '#22A06B',
          400: '#28BD7E',
          500: '#22A06B',
          600: '#187A50',
        },

        // MONITOR / WARNING: Amber (#F2B84B)
        monitor: {
          DEFAULT: '#F2B84B',
          hover: '#F5C76E',
          dark: '#B88428',
          muted: 'rgba(242, 184, 75, 0.18)',
        },
        amber: {
          DEFAULT: '#F2B84B',
          200: '#FDE68A',
          300: '#F5C76E',
          400: '#F2B84B',
          500: '#F2B84B',
          600: '#B88428',
          700: '#B45309',
        },

        // REJECT / CRITICAL: Red (#E5484D)
        reject: {
          DEFAULT: '#E5484D',
          hover: '#EB6367',
          dark: '#B0282C',
          muted: 'rgba(229, 72, 77, 0.18)',
        },
        rose: {
          DEFAULT: '#E5484D',
          300: '#FDA4AF',
          400: '#EB6367',
          500: '#E5484D',
          600: '#B0282C',
          700: '#BE123C',
        },
        red: {
          DEFAULT: '#E5484D',
          400: '#EB6367',
          500: '#E5484D',
          600: '#B0282C',
        },

        // Slate Theme Override to ISRO Aerospace Palette
        slate: {
          950: '#07111C', // Main background
          900: '#0B1928', // Secondary background
          850: '#102337', // Panel / card
          800: '#142B40', // Elevated panel / subtle card
          700: '#1D3A52', // Border / divider
          600: '#2A4D6C',
          500: '#6F8495', // Muted text
          400: '#9AAFC0', // Secondary text
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9', // Primary text
          50: '#F8FAFC',
        },

        telemetry: {
          slate: '#F1F5F9',
          steel: '#D0D8E2',
          dark: '#9AAFC0',
          muted: '#6F8495',
        },
      },
      fontFamily: {
        sans: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
        display: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
        telemetry: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
        mono: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
      },
      boxShadow: {
        'isro-blue': '0 0 14px rgba(14, 136, 211, 0.2)',
        'isro-orange': '0 0 14px rgba(244, 114, 22, 0.2)',
        'panel-subtle': '0 4px 20px rgba(7, 17, 28, 0.6)',
        'alert-glow': '0 0 16px rgba(229, 72, 77, 0.25)',
      },
    },
  },
  plugins: [],
}
