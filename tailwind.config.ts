import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        primary: {
          DEFAULT: '#10b981',
          dark: '#059669',
          light: '#d1fae5',
        },
        accent: {
          DEFAULT: '#EF9F27',
          light: '#FEF3DC',
        },
        /* Amber accent for AI elements — Loi 6: Chrométrie Psychologique */
        ai: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        /* Shadcn-compatible tokens */
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // ─── APEX FOUNDATION : radius & elevation tokens ────────────────
      // Standardise 2 rayons (card / control) + pill. Les classes Tailwind
      // natives (rounded-xl/2xl…) restent disponibles ; migration module
      // par module vers ces tokens pour réduire les 5 échelles actuelles à 2.
      borderRadius: {
        card: '1rem',        // 16px — cards, sections, modales
        control: '0.75rem',  // 12px — boutons, inputs, chips
        pill: '9999px',      // badges, status pills
      },
      // Échelle d'élévation ultra-subtile (style Atlassian/Vercel) — permet
      // de retirer progressivement les overrides !important de globals.css.
      // En dark, la hiérarchie se fait surtout par variation de surface.
      boxShadow: {
        'elev-1': '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'elev-2': '0 2px 4px -1px rgb(0 0 0 / 0.06), 0 4px 6px -1px rgb(0 0 0 / 0.08)',
        'elev-3': '0 4px 8px -2px rgb(0 0 0 / 0.08), 0 10px 20px -4px rgb(0 0 0 / 0.10)',
        'ring-soft': '0 0 0 4px rgb(16 185 129 / 0.12)', // focus ring émeraude (brand)
      },
    },
  },
  plugins: [],
};

export default config;
