/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f1f7fc',
          100: '#dfecf7',
          200: '#bfd9ee',
          300: '#92bfe0',
          400: '#5d9dcd',
          500: '#1f4e78',
          600: '#1a4367',
          700: '#173756',
          800: '#132c45',
          900: '#0e2235',
          950: '#071522',
        },
        accent: {
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
        canvas: '#f7f9fc',
        surface: '#ffffff',
        ink: '#0f1f33',
        muted: '#526174',
        line: '#e2e8f0',
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#0284c7',
        verified: {
          DEFAULT: '#10b981',
          soft: '#d1fae5',
          strong: '#047857',
        },
      },
      fontFamily: {
        display: [
          '"Space Grotesk"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        body: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      fontSize: {
        display: [
          'clamp(2.75rem, 6vw, 5.5rem)',
          { lineHeight: '1.02', letterSpacing: '-0.045em' },
        ],
        headline: [
          'clamp(2rem, 4vw, 3.5rem)',
          { lineHeight: '1.08', letterSpacing: '-0.035em' },
        ],
        title: [
          'clamp(1.5rem, 2.5vw, 2rem)',
          { lineHeight: '1.2', letterSpacing: '-0.02em' },
        ],
      },
      lineHeight: {
        body: '1.7',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        28: '7rem',
        30: '7.5rem',
        36: '9rem',
      },
      borderRadius: {
        card: '1rem',
        'card-lg': '1.5rem',
        'card-xl': '2rem',
      },
      boxShadow: {
        card: '0 8px 30px -12px rgb(15 31 51 / 0.16)',
        'card-hover': '0 20px 45px -18px rgb(15 31 51 / 0.26)',
        glass: '0 8px 30px -16px rgb(7 21 34 / 0.28)',
      },
      transitionDuration: {
        200: '200ms',
        250: '250ms',
        300: '300ms',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
