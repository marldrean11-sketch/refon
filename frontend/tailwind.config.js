/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /**
         * ReFon brand navy.
         *
         * This scale is the identity and is deliberately unchanged. It carries the
         * brand mark, primary calls to action on light surfaces, headings, and the
         * deep panels that give the site its weight.
         */
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

        /**
         * ReFon emerald.
         *
         * A signal, not a surface. It is used for success, verification, a held
         * reservation, a genuine saving, and the primary action on dark panels —
         * never as a page background or a large fill. Keeping it scarce is what
         * stops the interface reading as "an emerald website" instead of a navy
         * marketplace that uses green to mean something.
         */
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

        /**
         * Neutrals.
         *
         * Re-anchored onto a slate-style ramp so surfaces, borders, and body text
         * share one neutral family. Previously `canvas` and `ink` carried a blue
         * cast that fought the navy brand; now navy is the only blue on screen and
         * everything else recedes behind it.
         */
        canvas: '#f8fafc',
        surface: '#ffffff',
        /** Secondary fill for chips, table headers, and inert panels. */
        'surface-2': '#f1f5f9',
        ink: '#0f172a',
        muted: '#64748b',
        /** Reserved for the least important text; never for a label a user acts on. */
        subtle: '#94a3b8',
        line: '#e2e8f0',
        /** A border the user can see: inputs at rest, table rules on hover. */
        'line-2': '#cbd5e1',

        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#0284c7',

        verified: {
          DEFAULT: '#10b981',
          soft: '#d1fae5',
          strong: '#047857',
        },

        /**
         * ReFon condition grading scale. A is the best tier.
         *
         * Every grade is also named in text by `ConditionBadge` and explained in
         * words on the product page, so colour is never the only signal.
         */
        grade: {
          a: '#059669',
          'a-soft': '#d1fae5',
          b: '#0284c7',
          'b-soft': '#e0f2fe',
          c: '#d97706',
          'c-soft': '#fef3c7',
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

      /**
       * Named type sizes.
       *
       * Pages previously hard-coded `text-4xl sm:text-5xl`, which is exactly why
       * headings drifted apart from one another. These are the canonical scale, and
       * the page components are migrated onto them as each surface is rebuilt.
       *
       * Tracking lives here rather than on individual headings so it cannot drift.
       * Display faces want negative tracking to sit tight, and -0.045em was loose
       * enough to read as a display treatment rather than an interface.
       */
      fontSize: {
        hero: ['clamp(2.5rem, 6vw, 4rem)', { lineHeight: '1.03', letterSpacing: '-0.035em' }],
        display: ['clamp(2.75rem, 5.5vw, 4rem)', { lineHeight: '1.04', letterSpacing: '-0.032em' }],
        headline: ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.12', letterSpacing: '-0.025em' }],
        title: ['clamp(1.5rem, 2.5vw, 2rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
      },

      lineHeight: {
        body: '1.65',
      },

      borderRadius: {
        /**
         * One radius for anything a finger or cursor presses or types into.
         *
         * Controls were 16px — a pill-adjacent shape, and the single biggest reason
         * the interface read as a template rather than a product. 8px is crisp, dense,
         * and standard for marketplace software.
         */
        control: '0.5rem',

        /** Cards and panels that hold content. */
        card: '0.75rem',
        /** Larger surfaces: dialogs, drawers, feature panels. */
        'card-lg': '1rem',
        /** The largest panels on the site. */
        'card-xl': '1.25rem',

        pill: '999px',
      },

      boxShadow: {
        /**
         * Cards sit on the canvas rather than float above it. A contact shadow alone
         * reads as a floating card, so elevation comes from a faint contact edge plus
         * a soft, tightly-clipped ambient shadow.
         */
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px -6px rgb(15 23 42 / 0.08)',
        'card-hover': '0 2px 4px rgb(15 23 42 / 0.05), 0 12px 28px -10px rgb(15 23 42 / 0.12)',
        /** Dialogs and dropdowns, which genuinely do sit above the page. */
        pop: '0 12px 32px -12px rgb(15 23 42 / 0.22)',
        focus: '0 0 0 3px rgb(31 78 120 / 0.22)',
      },

      /**
       * Stacking order, named once.
       *
       * The bottom edge of a mobile viewport is a genuine conflict: the tab bar and a
       * page's own action bar cannot both own it. Fixed layers therefore follow a
       * fixed ladder, and new components take a token rather than a raw number.
       */
      zIndex: {
        base: '0',
        raised: '10',
        header: '50',
        drawer: '80',
        modal: '100',
        toast: '200',
      },

      transitionDuration: {
        120: '120ms',
        150: '150ms',
        200: '200ms',
        250: '250ms',
      },

      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
