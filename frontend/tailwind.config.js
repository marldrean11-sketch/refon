/**
 * ReFon design tokens: the dark "volt lime" theme.
 *
 * Raw values live here rather than `var(--…)` references on purpose: Tailwind
 * cannot resolve an alpha channel from a custom property. `src/index.css`
 * declares the same values as custom properties for hand-written CSS; the two
 * files are mirrors and are edited together.
 *
 * Near-black surfaces, chalk text, and one brand colour, volt lime, for primary
 * actions, "verified", and Grade A. Amber is value and Grade B; coral is Grade C
 * and errors.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /**
         * The four surfaces, darkest first. `page` is the void behind everything,
         * `panel` a step up for a section, `card` anything holding content, and
         * `well` a recess inside a card.
         */
        page: '#0a0b0d',
        panel: '#121418',
        card: '#16191e',
        well: '#1a1d23',

        /**
         * `white` is re-pointed at the card surface. The old light theme used
         * `bg-white` for cards and `text-white` for type on heavy dark buttons;
         * in the dark theme those buttons are lime, so both uses keep working
         * with one value: cards stay a step above the page, and type on a lime
         * fill is near-black.
         */
        white: '#16191e',
        /** True light type, for text on photos and device screens that stay dark. */
        chalk: '#f2f4f0',

        /** Text: chalk, then two greys. `subtle` is never used on a control. */
        ink: '#f2f4f0',
        muted: '#b9bec4',
        subtle: '#9ba1a8',

        /** Hairlines. `line` is decorative; `line-2` is a border you can see. */
        line: '#22262d',
        'line-2': '#3a3f48',

        /**
         * Volt lime: the one brand colour. Primary actions, verified, Grade A.
         * Low steps are dark tints for chips; high steps are text-safe lime.
         */
        accent: {
          DEFAULT: '#c6ff3d',
          hover: '#b4f03a',
          strong: '#c6ff3d',
          tint: '#1f2a0e',
          50: '#161d0a',
          100: '#1f2a0e',
          200: '#2e3f12',
          300: '#5c7f1a',
          400: '#a8e02e',
          500: '#c6ff3d',
          600: '#b4f03a',
          700: '#c6ff3d',
          800: '#d7ff7a',
          900: '#e3ff9e',
          950: '#f0ffd0',
        },
        lime: {
          DEFAULT: '#c6ff3d',
          hover: '#b4f03a',
          soft: '#1f2a0e',
        },

        /**
         * The heavy objects of the light theme (primary buttons, the footer)
         * were navy. They are lime now, so `dark` and `night` name the lime fill.
         */
        dark: '#c6ff3d',
        night: {
          DEFAULT: '#c6ff3d',
          700: '#b4f03a',
          800: '#a8e02e',
        },

        /**
         * The neutral ramp, inverted for a dark theme: 50 is the faintest raised
         * tint, 600 to 900 are readable text, and 950 is the primary fill (lime).
         */
        primary: {
          50: '#1c2026',
          100: '#22262d',
          200: '#2a2e36',
          300: '#3a3f48',
          400: '#5b616b',
          500: '#8a9099',
          600: '#b9bec4',
          700: '#cdd1d5',
          800: '#b4f03a',
          900: '#e6e9ec',
          950: '#c6ff3d',
        },

        brand: {
          DEFAULT: '#c6ff3d',
          hover: '#b4f03a',
          tint: '#1f2a0e',
        },
        tag: {
          DEFAULT: '#c6ff3d',
          hover: '#b4f03a',
          soft: '#1f2a0e',
        },

        /** Status. Coral rather than pure red: it reads on near-black. */
        red: {
          DEFAULT: '#ff6b5c',
          50: '#2a1412',
          100: '#3a1a17',
          200: '#5a2620',
          300: '#8a3a30',
          400: '#ff8a7a',
          500: '#ff6b5c',
          600: '#ff6b5c',
          700: '#ff6b5c',
          800: '#ff9c8c',
          900: '#ffb3a6',
          950: '#ffc9c0',
        },
        danger: '#ff6b5c',
        success: '#c6ff3d',
        warning: '#ffb547',
        info: '#f2f4f0',

        /** Amber: value, savings, and Grade B. */
        flare: {
          50: '#241a08',
          100: '#33240a',
          200: '#4a3410',
          300: '#7a5418',
          400: '#ffc066',
          500: '#ffb547',
          600: '#ffa526',
          700: '#ffb547',
          800: '#ffc978',
          900: '#ffd9a0',
          950: '#ffe8c4',
        },
        amber: {
          50: '#241a08',
          100: '#33240a',
          200: '#4a3410',
          300: '#7a5418',
          400: '#ffc066',
          500: '#ffb547',
          600: '#ffa526',
          700: '#ffb547',
          800: '#ffc978',
          900: '#ffd9a0',
          950: '#ffe8c4',
        },
        orange: {
          50: '#2a160e',
          100: '#3a1d12',
          200: '#5a2c1a',
          300: '#8a4428',
          400: '#ff9a7c',
          500: '#ff7a5c',
          600: '#ff7a5c',
          700: '#ff8f74',
          800: '#ffa890',
          900: '#ffbfac',
          950: '#ffd6c8',
        },
        green: {
          50: '#161d0a',
          100: '#1f2a0e',
          200: '#2e3f12',
          300: '#5c7f1a',
          400: '#a8e02e',
          500: '#c6ff3d',
          600: '#c6ff3d',
          700: '#c6ff3d',
          800: '#d7ff7a',
          900: '#e3ff9e',
          950: '#f0ffd0',
        },
        violet: {
          50: '#1d1630',
          100: '#2a1f45',
          700: '#c9adff',
        },

        verified: {
          DEFAULT: '#c6ff3d',
          soft: '#1f2a0e',
          strong: '#c6ff3d',
        },

        /** Condition grades: lime A, amber B, coral C. */
        grade: {
          a: '#c6ff3d',
          'a-soft': '#1f2a0e',
          b: '#ffb547',
          'b-soft': '#33240a',
          c: '#ff7a5c',
          'c-soft': '#3a1a12',
        },

        /** Legacy aliases for the same surfaces. */
        canvas: '#0a0b0d',
        surface: '#16191e',
        'surface-2': '#121418',
        'surface-3': '#1a1d23',
      },

      fontFamily: {
        /**
         * Three families, self-hosted, one job each.
         *
         * Unbounded (display) is round and loud for headlines and the wordmark;
         * Geist (sans, body) is calm for reading; Geist Mono (mono) makes every
         * measured figure look measured. All three are bundled through
         * `@fontsource`, so the site makes no request to a font CDN and renders
         * identically offline.
         */
        sans: ['Geist Variable', 'Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Unbounded Variable', 'Unbounded', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Geist Variable', 'Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        /**
         * The data face: eyebrow labels, grades, spec values, and the readings
         * on the ReFon Tag.
         */
        mono: ['Geist Mono Variable', 'Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      /**
       * Named type sizes.
       *
       * `base` is 17px rather than 16px. Body copy at 16px on a warm off-white
       * background is a screen full of edges; 17px with a 1.6 line height is the
       * smallest step that still reads as a page rather than as a document.
       */
      fontSize: {
        base: ['1.0625rem', { lineHeight: '1.6' }],
        hero: ['clamp(2.75rem, 6.5vw, 5rem)', { lineHeight: '0.98', letterSpacing: '-0.04em' }],
        display: ['clamp(2.5rem, 5vw, 3.75rem)', { lineHeight: '1.04', letterSpacing: '-0.035em' }],
        headline: ['clamp(1.875rem, 3.2vw, 2.625rem)', { lineHeight: '1.1', letterSpacing: '-0.028em' }],
        title: ['clamp(1.375rem, 2.2vw, 1.75rem)', { lineHeight: '1.2', letterSpacing: '-0.022em' }],
      },

      lineHeight: {
        body: '1.6',
      },

      /**
       * Corners.
       *
       * 20px on a card and 28px on a panel is the redesign's single strongest
       * silhouette change: rounded enough to read as a modern object, square
       * enough to still look like a considered product rather than a toy. Buttons
       * are fully pill-shaped, which is what makes an action read as a button at
       * a glance and separates it from the card it sits on.
       */
      borderRadius: {
        /** Buttons, pills, and compact controls. */
        control: '999px',
        /** Cards. */
        card: '20px',
        /** Panels and dialogs. */
        'card-lg': '28px',
        /** The largest panels on the site. */
        'card-xl': '28px',
        pill: '999px',
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
        /** Above the header: the progress bar reads as a property of the page. */
        progress: '60',
        drawer: '80',
        /**
         * Above the dimmed backdrop but below every modal surface.
         *
         * A toast used to sit at 200, on top of the cart drawer — which put
         * "added to your cart" directly over the Checkout button for the few
         * seconds it was on screen. A transient confirmation must never be able
         * to sit on top of a modal surface's own controls, and it should still
         * be readable through a dimmed backdrop.
         */
        toast: '90',
        modal: '100',
        /** The splash owns the screen until it leaves. */
        preloader: '300',
      },

      /**
       * Durations, named for intent.
       *
       * These mirror `src/lib/motion.ts`. A CSS transition and a Framer Motion
       * animation of the same intent should take the same time, or a hover on a
       * button will feel different from the entrance of the section below it.
       *
       * The numeric steps stay in the scale deliberately: a component that
       * already says `duration-150` should keep working, and 150ms is the right
       * answer for a control.
       */
      transitionDuration: {
        120: '120ms',
        150: '150ms',
        200: '200ms',
        250: '250ms',
        300: '300ms',
        500: '500ms',
        900: '900ms',
        micro: '160ms',
        standard: '360ms',
        hero: '650ms',
      },

      transitionTimingFunction: {
        entrance: 'cubic-bezier(0.22, 1, 0.36, 1)',
        ui: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },

    /**
     * The corner scale, replacing Tailwind's default.
     *
     * Replacing the scale rather than extending it is the whole point. There are
     * 200+ `rounded-2xl` and `rounded-xl` classes in the codebase, and leaving
     * them pointed at Tailwind's 16px/12px defaults would put two competing shape
     * languages on the same page — the exact "starter template" signal the
     * redesign exists to remove — without touching a single component.
     *
     *   12px  chips and badges, the smallest thing that is not a pill
     *   20px  cards
     *   28px  panels and dialogs
     *   999px buttons and anything whose shape carries meaning
     */
    borderRadius: {
      none: '0px',
      sm: '12px',
      DEFAULT: '12px',
      md: '12px',
      /** Cards. */
      lg: '20px',
      xl: '24px',
      /** Panels. */
      '2xl': '28px',
      '3xl': '28px',
      '4xl': '32px',
      /** Buttons, pills, and compact controls. */
      control: '999px',
      card: '20px',
      'card-lg': '28px',
      'card-xl': '28px',
      pill: '999px',
      full: '9999px',
    },

    /**
     * Elevation, replacing Tailwind's default.
     *
     * Wide and soft rather than tight. A tight shadow belongs to an object
     * sitting a millimetre above a surface; these are the only thing telling a
     * visitor that a card floats above the page, so they have to be wide enough
     * to be seen at all. Every value is low-opacity so it never reads as the
     * shadow of a physical object and never tints the warm background grey.
     */
    boxShadow: {
      none: 'none',
      /** Small chips and badges. Tight, because they are barely off the surface. */
      sm: '0 2px 8px rgb(0 0 0 / 0.4)',
      /** The soft elevation. */
      DEFAULT: '0 10px 40px rgb(0 0 0 / 0.45)',
      md: '0 10px 40px rgb(0 0 0 / 0.45)',
      lg: '0 10px 40px rgb(0 0 0 / 0.45)',
      /** The hover elevation. */
      xl: '0 20px 60px rgb(0 0 0 / 0.6)',
      '2xl': '0 20px 60px rgb(0 0 0 / 0.6)',
      /** Dialogs and dropdowns, which genuinely do sit above the page. */
      pop: '0 0 0 1px rgb(255 255 255 / 0.06), 0 20px 60px rgb(0 0 0 / 0.6)',
      /** The accent ring, so focus is green on every dark and light surface. */
      focus: '0 0 0 3px rgb(198 255 61 / 0.35)',
      inner: 'inset 0 2px 4px rgb(0 0 0 / 0.45)',
      card: '0 10px 40px rgb(0 0 0 / 0.45)',
      'card-hover': '0 20px 60px rgb(0 0 0 / 0.6)',
    },
  },
  plugins: [],
}