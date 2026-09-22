/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ASTRA VIGIL Medium-Dark Navy + Blue-Gray Reference Palette
        bg: '#0B1726',              // Primary Background - Deep Navy
        bg2: '#102337',             // Secondary Background - Dark Navy
        panel: '#162B40',           // Application Surface / Panels - Blue-Gray
        panel2: '#1B3445',          // Secondary Panel
        card: '#1B3445',            // Primary Card Surface
        card2: '#1B344B',           // Alternate Card Surface
        elevated: '#203C55',        // Elevated Surface / Hover
        hover: '#203C55',           // Hover State
        'panel-critical': 'rgba(239, 68, 68, 0.08)',

        // Deep Navy & Aerospace Blues
        navy: {
          DEFAULT: '#0B1726',
          950: '#07101B',
          900: '#0B1726',
          800: '#102337',
          700: '#162B40',
          600: '#1B3445',
          500: '#203C55',
          light: '#284867',
        },

        // Typography Hierarchy
        'text-primary': '#F1F5F9',   // Primary Text - High Contrast White
        'text-secondary': '#A8B6C5', // Secondary Text - Cool Blue-Gray
        muted: '#718398',           // Muted Text
        dim: '#718398',
        heading: '#F1F5F9',         // Headings
        label: '#A8B6C5',           // Labels
        'table-text': '#E2E8F0',
        'input-text': '#F1F5F9',
        'input-placeholder': '#718398',

        // Borders & Dividers
        border: '#2D4963',          // Subtle Border
        'border-strong': '#3E6182', // Strong Border
        line: '#2D4963',

        // Brand Accents: Primary Blue (#2563EB) & Teal (#14B8A6) / Cyan (#22D3EE)
        blue: {
          DEFAULT: '#2563EB',
          deep: '#1E3A8A',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        primary: {
          DEFAULT: '#2563EB',
          deep: '#1E3A8A',
          hover: '#1D4ED8',
        },
        teal: {
          DEFAULT: '#14B8A6',
          light: '#2DD4BF',
          dark: '#0F766E',
          hover: '#0D9488',
        },
        cyan: {
          DEFAULT: '#22D3EE',
          light: '#67E8F9',
          dark: '#0891B2',
        },
        accent: '#14B8A6',

        // ISRO / Legacy Alias
        'isro-blue': {
          DEFAULT: '#2563EB',
          light: '#3B82F6',
          hover: '#1D4ED8',
          dark: '#1E3A8A',
          muted: 'rgba(37, 99, 235, 0.15)',
        },
        'tech-blue': {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          dark: '#1E3A8A',
          muted: 'rgba(37, 99, 235, 0.15)',
        },

        // Status Colors: Consistent Across Application
        // SAFE: Controlled Emerald/Green (#10B981)
        safe: {
          DEFAULT: '#10B981',
          hover: '#059669',
          dark: '#047857',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)',
          muted: 'rgba(16, 185, 129, 0.12)',
        },
        emerald: {
          DEFAULT: '#10B981',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        green: {
          DEFAULT: '#10B981',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },

        // MONITOR: Warm Amber (#F59E0B)
        monitor: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
          dark: '#B45309',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
          muted: 'rgba(245, 158, 11, 0.12)',
        },
        amber: {
          DEFAULT: '#F59E0B',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },

        // REJECT: High-Reliability Red (#EF4444)
        reject: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
          dark: '#B91C1C',
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.3)',
          muted: 'rgba(239, 68, 68, 0.12)',
        },
        rose: {
          DEFAULT: '#EF4444',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        red: {
          DEFAULT: '#EF4444',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
        },

        // Warning (#F97316)
        warning: {
          DEFAULT: '#F97316',
          hover: '#EA580C',
          dark: '#C2410C',
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
