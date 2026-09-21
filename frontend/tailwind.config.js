/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // SpaceGuard AI Part 17 Light Engineering Background System
        bg: '#F4F7FA',              // Main Background - Light Blue-Gray
        bg2: '#F8FAFC',             // Secondary Background - Sub-panels & Toolbars
        panel: '#FFFFFF',           // Panel / Card - Clean White
        panel2: '#F8FAFC',          // Elevated Panel - Very Subtle Light Blue-Gray
        'panel-critical': '#FEF2F2', // Critical Alert Panel Light Red Tint

        // Text Hierarchy (Dark Navy & Cool Gray)
        'text-primary': '#17212B',   // Primary Text - Dark Navy
        'text-secondary': '#5B6B7A', // Secondary Text
        muted: '#81909D',           // Muted Text
        dim: '#81909D',

        // Borders & Dividers
        border: '#D9E2EA',          // Border / Divider - Clean Precision Light Border
        line: '#D9E2EA',

        // Primary Colors: ISRO Blue (#0E88D3)
        'isro-blue': {
          DEFAULT: '#0E88D3',
          hover: '#0A73B5',
          dark: '#085B90',
          muted: 'rgba(14, 136, 211, 0.12)',
        },
        'tech-blue': {
          DEFAULT: '#0E88D3',
          hover: '#0A73B5',
          dark: '#085B90',
          muted: 'rgba(14, 136, 211, 0.12)',
        },
        blue: {
          DEFAULT: '#0E88D3',
          400: '#249CE6',
          500: '#0E88D3',
          600: '#0A73B5',
        },
        cyan: '#0E88D3',

        // Primary Accent: ISRO Orange (#F47216 - ~3% ratio)
        'isro-orange': {
          DEFAULT: '#F47216',
          hover: '#DE610D',
          dark: '#BE5006',
          muted: 'rgba(244, 114, 22, 0.12)',
        },
        accent: '#F47216',
        gold: {
          DEFAULT: '#F47216',
          hover: '#DE610D',
          dark: '#BE5006',
          muted: 'rgba(244, 114, 22, 0.12)',
        },
        isro: {
          DEFAULT: '#0E88D3',
          blue: '#0E88D3',
          orange: '#F47216',
          amber: '#F47216',
          saffron: '#F47216',
          gold: '#F47216',
        },

        // Status Colors (Part 17 Engineering Status Colors)
        // SAFE: Green (#168A5B)
        safe: {
          DEFAULT: '#168A5B',
          hover: '#1B9D68',
          dark: '#116B46',
          muted: 'rgba(22, 138, 91, 0.12)',
        },
        emerald: {
          DEFAULT: '#168A5B',
          300: '#34D399',
          400: '#1B9D68',
          500: '#168A5B',
          600: '#116B46',
          700: '#0E5537',
        },
        green: {
          DEFAULT: '#168A5B',
          400: '#1B9D68',
          500: '#168A5B',
          600: '#116B46',
        },

        // MONITOR: Amber (#C58A00)
        monitor: {
          DEFAULT: '#C58A00',
          hover: '#DB9B05',
          dark: '#996C00',
          muted: 'rgba(197, 138, 0, 0.12)',
        },
        amber: {
          DEFAULT: '#C58A00',
          200: '#FDE68A',
          300: '#F5C76E',
          400: '#DB9B05',
          500: '#C58A00',
          600: '#996C00',
          700: '#7A5600',
        },

        // REJECT / CRITICAL: Red (#D9363E)
        reject: {
          DEFAULT: '#D9363E',
          hover: '#E8454D',
          dark: '#B0262D',
          muted: 'rgba(217, 54, 62, 0.12)',
        },
        rose: {
          DEFAULT: '#D9363E',
          300: '#FDA4AF',
          400: '#E8454D',
          500: '#D9363E',
          600: '#B0262D',
          700: '#8E1E23',
        },
        red: {
          DEFAULT: '#D9363E',
          400: '#E8454D',
          500: '#D9363E',
          600: '#B0262D',
        },

        // Slate Theme Tokens
        slate: {
          950: '#17212B', // Darkest navy text
          900: '#233140', // Deep navy
          850: '#344557',
          800: '#465A6E',
          700: '#5B6B7A', // Secondary text
          600: '#6E8092',
          500: '#81909D', // Muted text
          400: '#9BA9B6',
          300: '#CBD5E1',
          200: '#D9E2EA', // Border
          100: '#F1F5F9', // Elevated surface
          50: '#F8FAFC',  // Very light surface
        },

        telemetry: {
          slate: '#17212B',
          steel: '#5B6B7A',
          dark: '#81909D',
          muted: '#81909D',
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
