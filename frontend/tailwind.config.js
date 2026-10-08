/**
 * ReFon design tokens.
 *
 * Raw values live here rather than `var(--…)` references on purpose: Tailwind
 * cannot resolve an alpha channel from a custom property, so a `var()`-backed
 * palette silently drops every `bg-accent/10` and `border-danger/40` in the
 * codebase. The stylesheet in `src/index.css` declares the same values as custom
 * properties for hand-written CSS; the two files are mirrors and are edited
 * together.
 *
 * The palette is a warm off-white paper, one green that means "verified", and a
 * near-black that carries every heavy object. There is no second accent hue:
 * with one, nothing on screen is load-bearing.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /**
         * The four surfaces.
         *
         * `page` is the canvas and the only thing that may sit behind a whole
         * page. `panel` is the step up from it, for a section that needs to read
         * as a different plane without a border. `card` is white and is used for
         * anything that holds content of its own. The gap between `page` and
         * `panel` is deliberately narrow — 4% of luminance — because a wide step
         * makes a page look like a stack of unrelated documents.
         */
        page: '#f6f5f1',
        panel: '#eceae4',
        card: '#ffffff',
        /** A third step down, for wells inside a panel. */
        well: '#e3e1da',

        /**
         * Text.
         *
         * `ink` is near-black rather than pure black: `#111` reads as printed
         * ink at 17px, where `#000` reads as an error message. `muted` is
         * secondary text and `subtle` is the floor — it is never allowed on
         * anything a visitor has to act on.
         */
        ink: '#111111',
        muted: '#6b6b66',
        subtle: '#94938c',

        /** Hairlines. `line` is decorative; `line-2` is a border you can see. */
        line: '#e6e4dd',
        'line-2': '#d2cfc6',

        /** The one signal colour. Verified, inspected, cleared. */
        accent: {
          DEFAULT: '#10b981',
          /** The hover/active step, for controls where the default is too light. */
          hover: '#0ea371',
          /** Text-safe green for coloured type on a light surface. */
          strong: '#0b8a5e',
          /** The tint. Backgrounds, chips, and anything behind green type. */
          tint: '#d1fae5',
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#0ea371',
          700: '#0b8a5e',
          800: '#0a6e4b',
          900: '#08583c',
          950: '#04321f',
        },

        /** The heavy dark. Buttons, the footer, and the splash panel's mark. */
        dark: '#0b0f0e',
        primary: {
          50: '#f2f3f2',
          100: '#e6e8e6',
          200: '#cbcecb',
          300: '#a9aeaa',
          400: '#828985',
          500: '#5e6663',
          600: '#464d4a',
          700: '#333936',
          800: '#232827',
          900: '#151a1a',
          950: '#0b0f0e',
        },

        /** Status. `red` is also the notification-badge colour. */
        red: '#ef4444',
        danger: '#ef4444',
        success: '#059669',
        warning: '#f59e0b',
        info: '#2563eb',

        /**
         * The amber family, used for value: discounts, savings, and the two
         * lower condition grades. Warm against a cool neutral reads as money
         * without needing a gradient or a glow to sell it.
         */
        flare: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },

        verified: {
          DEFAULT: '#10b981',
          soft: '#d1fae5',
          strong: '#0b8a5e',
        },

        /**
         * Condition grading. A is the best tier and is the only grade allowed to
         * be green — the colour means "passed", not "good".
         */
        grade: {
          a: '#059669',
          'a-soft': '#d1fae5',
          b: '#f59e0b',
          'b-soft': '#fef3c7',
          c: '#f97316',
          'c-soft': '#ffedd5',
        },

        /**
         * Legacy aliases.
         *
         * `surface*` were the pre-redesign names for the same four surfaces. They
         * are kept so no component has to change to adopt the new palette; new
         * code uses `page` / `panel` / `card` / `well`.
         */
        surface: '#ffffff',
        'surface-2': '#eceae4',
        'surface-3': '#e3e1da',
      },

      fontFamily: {
        /**
         * One family, self-hosted.
         *
         * Manrope is bundled through `@fontsource-variable`, so the site makes
         * no request to a font CDN and renders identically offline. The variable
         * build covers 200–800, which is the whole range the product uses.
         */
        sans: ['Manrope Variable', 'Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Manrope Variable', 'Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        body: ['Manrope Variable', 'Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        /**
         * The former monospace role — eyebrow labels, prices, grades, spec values
         * — is now the same variable family. A second face for the small caps
         * labels was reading as a different product rather than as data, and the
         * existing `tabular-nums` base rule already keeps digits aligned, which
         * was the only reason the mono was there.
         */
        mono: ['Manrope Variable', 'Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        /**
         * Reserved for a single accent word — a word in a heading that should
         * read as an annotation rather than as part of the sentence. Bundled
         * lazily by the page that uses it; unused otherwise, so nothing here
         * depends on a remote font.
         */
        accent: ['Instrument Serif', 'ui-serif', 'Georgia', 'serif'],
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
        micro: '200ms',
        standard: '500ms',
        hero: '900ms',
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
      sm: '0 2px 8px rgb(0 0 0 / 0.05)',
      /** The soft elevation. */
      DEFAULT: '0 10px 40px rgb(0 0 0 / 0.06)',
      md: '0 10px 40px rgb(0 0 0 / 0.06)',
      lg: '0 10px 40px rgb(0 0 0 / 0.06)',
      /** The hover elevation. */
      xl: '0 20px 60px rgb(0 0 0 / 0.1)',
      '2xl': '0 20px 60px rgb(0 0 0 / 0.1)',
      /** Dialogs and dropdowns, which genuinely do sit above the page. */
      pop: '0 0 0 1px rgb(17 17 17 / 0.05), 0 20px 60px rgb(0 0 0 / 0.1)',
      /** The accent ring, so focus is green on every dark and light surface. */
      focus: '0 0 0 3px rgb(16 185 129 / 0.35)',
      inner: 'inset 0 2px 4px rgb(0 0 0 / 0.06)',
      card: '0 10px 40px rgb(0 0 0 / 0.06)',
      'card-hover': '0 20px 60px rgb(0 0 0 / 0.1)',
    },
  },
  plugins: [],
}