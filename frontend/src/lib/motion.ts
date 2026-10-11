import { useCallback, useEffect, useState } from 'react'

/**
 * The one motion vocabulary for ReFon.
 *
 * Every animation in the product reads its easing, its duration, and its variant
 * shape from this file. That is not tidiness for its own sake: three easings
 * drifting across a site reads as three different products stapled together, and
 * it is the single most common reason a redesign still looks like a repaint of
 * the old one.
 *
 * The whole system obeys two rules, and they are not negotiable:
 *
 *   1. Only `transform` and `opacity` are animated. Anything that changes
 *      layout — width, height, top, left, margin — forces the browser to
 *      re-layout on every frame, which is what makes a page jank and what makes
 *      a scroll-linked effect stutter.
 *   2. Every variant has an opacity-only twin, returned by `useMotionSafe` when
 *      the visitor has asked for reduced motion. Movement is a garnish; someone
 *      who has turned motion off at the OS level should still get a legible
 *      page, not a broken one.
 */

/** Entrance easing. Decelerating, long tail: it arrives and then it settles. */
export const entrance = [0.22, 1, 0.36, 1]

/** UI easing. Symmetric, for state changes a visitor triggers deliberately. */
export const ui = [0.4, 0, 0.2, 1]

/** Named easings, so a call site reads as intent rather than as four numbers. */
export const easings = { entrance, ui }

/** Named durations. `micro` is a control, `standard` is a section, `hero` is the first paint. */
export const durations = {
  micro: 0.16,
  standard: 0.36,
  hero: 0.65,
}

/** The stagger between siblings, in seconds. */
export const staggerStep = 0.08

/**
 * Shared `whileInView` settings.
 *
 * `once: true` because a section that re-animates every time it scrolls back into
 * view makes a long page feel like it is never finished. `amount: 0.25` because a
 * section that starts animating from a single pixel of visibility reads as a
 * glitch rather than as an entrance.
 */
export const viewportDefault = { once: true, amount: 0.25 }

/** Ready-made transition objects, so a call site never repeats a duration. */
export const transitions = {
  micro: { duration: durations.micro, ease: ui },
  standard: { duration: durations.standard, ease: entrance },
  hero: { duration: durations.hero, ease: entrance },
}

/**
 * The short transitions that predate the shared variants.
 *
 * Popovers, menus, toasts and dialogs are already-open surfaces answering a
 * deliberate input, so they use `micro`. They live here rather than at each call
 * site so that "how fast does a menu open" has exactly one answer in the
 * codebase, and so that a component reaching for a transition cannot invent a
 * fourth duration.
 */
export const motionEase = ui

export const quickTransition = transitions.micro

export const standardTransition = transitions.standard

/**
 * Page-transition timing.
 *
 * `AnimatePresence` runs the exit before the entrance, so these two figures add
 * up. They are deliberately short: the sum is the budget for the whole
 * navigation, and a page transition is punctuation rather than an event.
 */
export const pageTransition = {
  exit: { duration: 0.16, ease: ui },
  enter: { duration: 0.22, ease: entrance },
}

/** The single most reused entrance: content that rises as it fades in. */
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: transitions.standard },
}

/**
 * A parent variant that spaces its children's entrances.
 *
 * Returned as a factory because the step is a per-list decision: a grid of
 * twelve cards wants a tighter stagger than three hero columns.
 */
export const stagger = (step = staggerStep, delayChildren = 0) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: step, delayChildren, ease: entrance },
  },
})

/**
 * The editorial entrance.
 *
 * The element must sit inside a clipping parent (`overflow-hidden`), which is
 * what makes `y: '100%'` read as a line of type sliding out from under an edge
 * instead of as a box teleporting.
 */
export const maskReveal = {
  hidden: { opacity: 0, y: '100%' },
  visible: { opacity: 1, y: '0%', transition: transitions.hero },
}

/** For imagery: a small scale-up rather than a slide. */
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transitions.standard },
}

/** Two directional entrances, for a two-column layout that should not feel mirrored. */
export const slideInLeft = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: transitions.standard },
}

export const slideInRight = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: transitions.standard },
}

/** Every shared variant, for the reduced-motion test to walk. */
export const sharedVariants = {
  fadeUp,
  maskReveal,
  scaleIn,
  slideInLeft,
  slideInRight,
  stagger: stagger(),
}

/**
 * The page-level entrance used by `PageTransition`.
 *
 * The outgoing page moves up as it fades; the incoming page fades in from a
 * slight offset. Both are transforms, so neither one can cause a layout shift
 * while the route swaps underneath it.
 */
export const pageVariants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: pageTransition.enter },
  exit: { opacity: 0, y: -12, transition: pageTransition.exit },
}

const REDUCED_MEDIA = '(prefers-reduced-motion: reduce)'

/** Transform keys are what get stripped when motion is reduced. */
const MOTION_KEYS = new Set([
  'x',
  'y',
  'z',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'rotateX',
  'rotateY',
  'rotateZ',
  'skew',
  'skewX',
  'skewY',
  'transformPerspective',
  'originX',
  'originY',
])

/**
 * Reads `prefers-reduced-motion` synchronously.
 *
 * `useSyncExternalStore` is used rather than a `useEffect` so the very first
 * render already knows the answer. That matters: a preloader or a page
 * transition that renders once with motion on and then corrects itself produces
 * exactly the flash that reduced motion is supposed to prevent.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }

    return window.matchMedia(REDUCED_MEDIA).matches
  })

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined
    }

    const query = window.matchMedia(REDUCED_MEDIA)
    const onChange = (event) => setReduced(event.matches)

    setReduced(query.matches)
    query.addEventListener('change', onChange)

    return () => query.removeEventListener('change', onChange)
  }, [])

  // Mirrored onto the root element so a stylesheet, an automated check, and a
  // human reading the DOM can all see the same answer instead of each asking
  // `matchMedia` again.
  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.dataset.reducedMotion = reduced ? 'reduce' : 'no-preference'
  }, [reduced])

  return reduced
}

/**
 * Reduces a variant tree to its opacity-only twin.
 *
 * `transition` is kept, because a shorter duration is not motion; only the
 * transform channels are removed. Nested variants (a `stagger` parent whose
 * children each carry their own variant) are walked, so a list that is animated
 * as a group is reduced as a group.
 */
export function reduceVariants(variants) {
  if (Array.isArray(variants)) {
    return variants.map(reduceVariants)
  }

  if (!variants || typeof variants !== 'object') {
    return variants
  }

  const reduced = {}

  for (const [key, value] of Object.entries(variants)) {
    if (key === 'transition' || key === 'transitionEnd') {
      reduced[key] = value
      continue
    }

    if (MOTION_KEYS.has(key)) {
      continue
    }

    reduced[key] = reduceVariants(value)
  }

  return reduced
}

/**
 * The motion-aware wrapper every animated component should read.
 *
 * `v()` returns the variant unchanged when motion is welcome and its
 * opacity-only twin when it is not, so a call site never has to branch:
 *
 *     const motion = useMotionSafe()
 *     <motion.article variants={motion.v(fadeUp)} />
 *
 * `shouldAnimate` is the escape hatch for effects that are motion *by nature* —
 * a scroll-progress bar, a preloader — and should simply not run at all.
 */
export function useMotionSafe() {
  const reduced = usePrefersReducedMotion()

  const v = useCallback(
    (variants) => (reduced ? reduceVariants(variants) : variants),
    [reduced],
  )

  return {
    reduced,
    v,
    shouldAnimate: !reduced,
    viewport: viewportDefault,
    transition: reduced ? transitions.micro : transitions.standard,
  }
}