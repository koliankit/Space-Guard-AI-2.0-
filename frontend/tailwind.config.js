/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ISRO Aerospace Light Engineering Background System
        bg: '#F4F7FB',              // Main Application Canvas
        bg2: '#EEF3F8',             // Secondary Section Background & Sub-panels
        panel: '#FFFFFF',           // Card Background - Clean White
        panel2: '#F8FAFD',          // Elevated Card Surface
        card: '#F8FAFD',            // Cool-gray Card
        hover: '#E8F0F8',           // Hover State
        'panel-critical': '#FEF2F2', // Critical Alert Panel Light Red Tint

        // Deep Navy / ISRO Blue Mission Accents
        navy: {
          DEFAULT: '#0B1E36',
          900: '#071526',
          800: '#0B1E36',
          700: '#0F2A4A',
          600: '#143860',
          light: '#1B4775',
        },

        // Text Hierarchy (Deep Navy Headings, Dark Charcoal Body)
        'text-primary': '#17212B',   // Primary Body Text - Dark Charcoal
        'text-secondary': '#334E68', // Secondary Text - Dark Blue-Gray
        muted: '#64748B',           // Muted Text
        dim: '#64748B',
        heading: '#0B1E36',         // Headings - Deep Navy
        label: '#475569',           // Labels - Dark Blue-Gray
        'table-text': '#1F2D38',    // Table Text
        'input-text': '#17212B',    // Input Text
        'input-placeholder': '#64748B', // Input Placeholder

        // Borders & Dividers - Thin visible boundaries
        border: '#D7E0EA',          // Visible Technical Border
        'border-strong': '#CBD5E1', // Strong Card Border
        line: '#D7E0EA',

        // Primary Colors: ISRO Blue (#005A9C / #0E88D3)
        'isro-blue': {
          DEFAULT: '#005A9C',
          light: '#0E88D3',
          hover: '#00477D',
          dark: '#00365F',
          muted: 'rgba(0, 90, 156, 0.10)',
        },
        'tech-blue': {
          DEFAULT: '#005A9C',
          hover: '#00477D',
          dark: '#00365F',
          muted: 'rgba(0, 90, 156, 0.10)',
        },
        blue: {
          DEFAULT: '#005A9C',
          50: '#F0F7FC',
          100: '#E1EFF8',
          200: '#BAE0F3',
          300: '#7CC4EB',
          400: '#38A5DE',
          500: '#0E88D3',
          600: '#005A9C',
          700: '#00477D',
          800: '#00365F',
          900: '#0B1E36',
        },
        cyan: '#0E88D3',

        // Primary Accent: Mission Orange (#F47216)
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
          DEFAULT: '#005A9C',
          blue: '#005A9C',
          orange: '#F47216',
          amber: '#F47216',
          saffron: '#F47216',
          gold: '#F47216',
        },

        // Status Colors
        // SAFE: Controlled Green (#168A5B)
        safe: {
          DEFAULT: '#168A5B',
          hover: '#1B9D68',
          dark: '#065F46',
          bg: '#ECFDF5',
          border: '#A7F3D0',
          muted: 'rgba(22, 138, 91, 0.12)',
        },
        emerald: {
          DEFAULT: '#168A5B',
          300: '#34D399',
          400: '#1B9D68',
          500: '#168A5B',
          600: '#116B46',
          700: '#065F46',
        },
        green: {
          DEFAULT: '#168A5B',
          400: '#1B9D68',
          500: '#168A5B',
          600: '#116B46',
        },

        // MONITOR: Amber / Orange (#C58A00 / #D97706)
        monitor: {
          DEFAULT: '#C58A00',
          hover: '#B45309',
          dark: '#92400E',
          bg: '#FFFBEB',
          border: '#FDE68A',
          muted: 'rgba(197, 138, 0, 0.12)',
        },
        amber: {
          DEFAULT: '#C58A00',
          200: '#FDE68A',
          300: '#F5C76E',
          400: '#DB9B05',
          500: '#C58A00',
          600: '#B45309',
          700: '#92400E',
        },

        // REJECT: Red (#D9363E / #DC2626)
        reject: {
          DEFAULT: '#D9363E',
          hover: '#C52B33',
          dark: '#991B1B',
          bg: '#FEF2F2',
          border: '#FECACA',
          muted: 'rgba(217, 54, 62, 0.12)',
        },
        rose: {
          DEFAULT: '#D9363E',
          300: '#FDA4AF',
          400: '#E8454D',
          500: '#D9363E',
          600: '#B0262D',
          700: '#991B1B',
        },
        red: {
          DEFAULT: '#D9363E',
          400: '#E8454D',
          500: '#D9363E',
          600: '#B0262D',
        },

        // Slate Theme Tokens
        slate: {
          950: '#0B1E36', // Deepest Navy
          900: '#17212B', // Dark charcoal text
          850: '#243B53',
          800: '#334E68', // Secondary heading
          700: '#475569', // Labels
          600: '#64748B', // Muted text
          500: '#78899A',
          400: '#94A3B8',
          300: '#CBD5E1', // Line / Strong border
          200: '#D7E0EA', // Visible border
          100: '#EEF3F8', // Elevated surface
          50: '#F8FAFD',  // Very light cool surface
        },

        telemetry: {
          slate: '#17212B',
          steel: '#334E68',
          dark: '#64748B',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
        display: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
        telemetry: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
        mono: ["'Sitka Small Semibold'", "'Sitka Small'", "'Sitka Text'", "'Sitka'", 'Georgia', 'serif'],
      },
      boxShadow: {
        'isro-blue': '0 2px 10px rgba(0, 90, 156, 0.15)',
        'isro-orange': '0 2px 10px rgba(244, 114, 22, 0.18)',
        'panel-card': '0 1px 3px rgba(11, 30, 54, 0.05), 0 4px 12px rgba(11, 30, 54, 0.03)',
        'panel-subtle': '0 2px 8px rgba(11, 30, 54, 0.06)',
        'alert-glow': '0 0 16px rgba(217, 54, 62, 0.20)',
      },
    },
  },
  plugins: [],
}
