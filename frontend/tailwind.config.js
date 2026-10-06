/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /**
         * ReFon Obsidian.
         *
         * The structural colour of the product: near-black with a very slight
         * cool cast. It replaced a navy blue, and the change is deliberate —
         * a dark *blue* reads as corporate software, while a dark neutral reads
         * as a hardware brand. Obsidian carries every primary action, every
         * dark panel, and every high-contrast heading.
         *
         * Because it is a neutral rather than a hue, the two signal colours
         * below are the only saturated things on screen, which is what keeps
         * them meaningful when they appear.
         */
        primary: {
          50: '#f5f6f6',
          100: '#e6e9e9',
          200: '#ccd1d1',
          300: '#a5aeb0',
          400: '#78858a',
          500: '#576367',
          600: '#424d51',
          700: '#323b3f',
          800: '#21282b',
          900: '#141a1c',
          950: '#090d0e',
        },

        /**
         * ReFon Jade — the trust signal.
         *
         * Deeper and bluer than the emerald it replaced, so it reads as
         * "inspected and cleared" rather than "growth chart". It is spent on
         * exactly three ideas: a seller has been verified, a device passed its
         * checks, and a grade is top-tier. It is never a page background.
         */
        accent: {
          50: '#edfdf4',
          100: '#d2fbe3',
          200: '#a6f5ca',
          300: '#6ee9ab',
          400: '#33d489',
          500: '#10b76b',
          600: '#069257',
          700: '#047547',
          800: '#065d3a',
          900: '#064c32',
          950: '#022c1c',
        },

        /**
         * ReFon Solar — the value signal.
         *
         * Reserved for money: savings, discount percentages, the "refurbished
         * beats new" argument, and the Grade C band once it stops being the
         * only warm thing in the palette. Warm against a cool neutral reads as
         * value without needing a gradient or a glow to sell it.
         */
        flare: {
          50: '#fffaeb',
          100: '#fff0c7',
          200: '#ffde8b',
          300: '#ffc64d',
          400: '#ffac1f',
          500: '#f98a07',
          600: '#dd6202',
          700: '#b74206',
          800: '#94330c',
          900: '#7a2b0d',
          950: '#431504',
        },

        /**
         * Neutrals.
         *
         * A faintly warm paper ramp. The canvas is off-white rather than pure
         * white and the surface is pure white, so panels read as *sheets on
         * paper* instead of floating in a void — the difference between a
         * document and a template is usually exactly this.
         */
        canvas: '#f5f5f1',
        surface: '#ffffff',
        /** Secondary fill for chips, table headers, and inert panels. */
        'surface-2': '#eeeee8',
        /** A third step down, for wells inside a surface. */
        'surface-3': '#e5e5dd',
        ink: '#11161a',
        muted: '#585f66',
        /** Reserved for the least important text; never for a label a user acts on. */
        subtle: '#868d94',
        line: '#e2e2da',
        /** A border the user can see: inputs at rest, table rules on hover. */
        'line-2': '#c9c9bf',

        success: '#059257',
        warning: '#f98a07',
        danger: '#d0342c',
        info: '#2563eb',

        verified: {
          DEFAULT: '#10b76b',
          soft: '#d2fbe3',
          strong: '#047547',
        },

        /**
         * ReFon condition grading scale. A is the best tier.
         *
         * Every grade is also named in text by `ConditionBadge` and explained in
         * words on the product page, so colour is never the only signal.
         */
        grade: {
          a: '#069257',
          'a-soft': '#d2fbe3',
          b: '#2563eb',
          'b-soft': '#dbe6fe',
          c: '#94330c',
          'c-soft': '#ffde8b',
        },
      },

      fontFamily: {
        display: [
          '"Sora"',
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
        /**
         * The inspection voice.
         *
         * A monospace face is used for eyebrow labels, prices, grades, and
         * specification values. Aligned digits and a fixed character width are
         * what make a catalogue of measurements look like a spec sheet rather
         * than a list of marketing copy.
         */
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      /**
       * Named type sizes.
       *
       * Every heading in the product takes one of these. Pages that hard-coded
       * `text-5xl` next to `text-3xl` are the reason heading hierarchy used to
       * drift; the ramp plus the base rule in `index.css` is what keeps a
       * section heading from outshouting the page title above it.
       */
      fontSize: {
        hero: ['clamp(2.75rem, 7vw, 5.25rem)', { lineHeight: '0.98', letterSpacing: '-0.045em' }],
        display: ['clamp(2.5rem, 5.5vw, 4rem)', { lineHeight: '1.02', letterSpacing: '-0.038em' }],
        headline: ['clamp(1.875rem, 3.4vw, 2.75rem)', { lineHeight: '1.08', letterSpacing: '-0.03em' }],
        title: ['clamp(1.375rem, 2.4vw, 1.75rem)', { lineHeight: '1.2', letterSpacing: '-0.022em' }],
      },

      lineHeight: {
        body: '1.65',
      },

      borderRadius: {
        /**
         * Corners are close to square.
         *
         * The previous system rounded everything to 12px and above, which is the
         * single strongest "starter template" signal in an interface. A 4px
         * control and a 6px card read as instrumentation and hardware; 24px
         * rounded cards read as a social app. Pills are still available, but
         * only where the shape carries meaning (chips, counts, tags).
         */
        control: '0.25rem',
        /** Cards and panels that hold content. */
        card: '0.375rem',
        /** Larger surfaces: dialogs, drawers, feature panels. */
        'card-lg': '0.5rem',
        /** The largest panels on the site. */
        'card-xl': '0.75rem',
        pill: '999px',
      },

      boxShadow: {
        /**
         * Elevation is a hairline first and a shadow second.
         *
         * Soft ambient shadows were what made the previous interface look
         * weightless. These are tight, low-opacity, and close to the element, so
         * a raised surface reads as a thicker material rather than a floating
         * plane.
         */
        card: '0 1px 0 0 rgb(17 22 26 / 0.04), 0 1px 2px -1px rgb(17 22 26 / 0.08)',
        'card-hover': '0 1px 0 0 rgb(17 22 26 / 0.05), 0 6px 16px -8px rgb(17 22 26 / 0.18)',
        /** Dialogs and dropdowns, which genuinely do sit above the page. */
        pop: '0 0 0 1px rgb(17 22 26 / 0.07), 0 18px 40px -16px rgb(17 22 26 / 0.28)',
        focus: '0 0 0 3px rgb(9 13 14 / 0.18)',
      },

      /**
       * Stacking order, named once.
       *
       * The bottom edge of a mobile viewport is a genuine conflict: the tab bar
       * and a page's own action bar cannot both own it. Fixed layers follow a
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