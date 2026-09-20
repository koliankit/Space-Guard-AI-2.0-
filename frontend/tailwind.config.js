/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // SpaceGuard AI Exact Aerospace Palette
        bg: '#070D18',              // Primary Background - Deep Space Navy
        bg2: '#0D1726',             // Secondary Background - Navy
        panel: '#111E30',           // Panel / Card - Slate Navy
        panel2: '#16253A',          // Elevated Panel - Steel Navy
        'panel-critical': '#28131D', // Critical Panel - Dark Red Navy

        // Text Tiers
        'text-primary': '#E8EDF2',   // Primary Text - Off White
        'text-secondary': '#91A0B2', // Secondary Text - Cool Gray
        muted: '#91A0B2',
        dim: '#5A6E85',

        // Borders & Dividers
        border: '#26384D',          // Border / Divider - Steel Blue
        line: '#26384D',

        // Accents
        gold: {
          DEFAULT: '#C99A2E',       // Primary Accent - Muted Gold
          muted: '#C99A2E',
          hover: '#DBA935',
          dark: '#9E7720',
        },
        accent: '#C99A2E',
        'tech-blue': {
          DEFAULT: '#3B82B6',       // Technical Accent - Technical Blue
          muted: '#3B82B6',
          hover: '#4C95CC',
          dark: '#2A638C',
        },

        // Status Colors
        safe: {
          DEFAULT: '#3FA66B',       // Engineering Green
          muted: '#3FA66B',
          dark: '#2E8051',
        },
        monitor: {
          DEFAULT: '#D6A33A',       // Amber
          muted: '#D6A33A',
          dark: '#A67B24',
        },
        reject: {
          DEFAULT: '#D94B5B',       // Alert Red
          muted: '#D94B5B',
          dark: '#B03342',
        },

        // Legacy compatibility mappings tuned to the new palette
        isro: {
          50: '#FDFBF7',
          100: '#F9F4EB',
          200: '#EFE3CA',
          300: '#E2CD9E',
          400: '#D4B46E',
          500: '#C99A2E',
          600: '#A87F22',
          700: '#87651A',
          saffron: '#C99A2E',
          gold: '#C99A2E',
        },
        telemetry: {
          slate: '#E8EDF2',
          steel: '#D0D8E2',
          dark: '#91A0B2',
          muted: '#5A6E85',
        },
        cyan: '#3B82B6',
        blue: '#3B82B6',
        emerald: '#3FA66B',
        amber: {
          300: '#E4B858',
          400: '#D6A33A',
          500: '#C99A2E',
          600: '#A87F22',
        },
        rose: {
          400: '#E26170',
          500: '#D94B5B',
          600: '#B03342',
        },
      },
      fontFamily: {
        sans: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
        display: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
        telemetry: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
        mono: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
      },
      boxShadow: {
        'isro-gold': '0 0 12px rgba(201, 154, 46, 0.2)',
        'tech-blue': '0 0 12px rgba(59, 130, 182, 0.2)',
        'panel-subtle': '0 4px 20px rgba(7, 13, 24, 0.6)',
        'alert-glow': '0 0 16px rgba(217, 75, 91, 0.25)',
      },
    },
  },
  plugins: [],
}
