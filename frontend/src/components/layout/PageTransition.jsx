import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { pageVariants, usePrefersReducedMotion } from '../../lib/motion.ts'

/**
 * The crossfade between two routes.
 *
 * `mode="wait"` rather than `mode="popLayout"` because the two pages do not
 * coexist: `wait` finishes the outgoing page before the incoming one mounts, so
 * there is never a frame where two page trees are laid out at once. That is what
 * keeps the header, the footer, and the scroll position from jumping underneath
 * the animation, and it is why the total budget is short — `exit` and `enter`
 * run back to back, so together they have to stay under 400ms.
 *
 * Only `opacity` and `y` move. A page that slid in on `width` or `margin` would
 * re-layout on every frame of a navigation, which is the single most reliable way
 * to make a route change feel like the site flinched.
 *
 * Reduced motion gets no animation at all — not a faster one. The wrapper passes
 * `initial={false}` and an undefined `exit`, and `AnimatePresence` swaps its child
 * without an intermediate frame.
 *
 * The transition is keyed on the pathname alone. A search filter that only
 * rewrites the query string is not a new page, and animating it would blank the
 * grid every time someone typed.
 */
export function PageTransition({ children }) {
  const location = useLocation()
  const reducedMotion = usePrefersReducedMotion()

  /*
   * `initial={false}` was removed from this `AnimatePresence`.
   *
   * On `AnimatePresence` that prop means "disable any initial animations on
   * children present when the component first mounts" — and it propagates, not
   * just to the direct child. With it set, every `initial` state inside a freshly
   * loaded route was suppressed: the homepage's headline mounted straight at its
   * final position, so the maskReveal never ran and no screenshot or DOM snapshot
   * showed anything other than a finished hero.
   *
   * Reduced motion is still handled, and still handled *here*: the wrapper passes
   * `initial={false}` itself under reduced motion, and the home page's own
   * components read `usePrefersReducedMotion` and render statically. Phase 3A
   * asserts both — that the reveal animates normally, and that under
   * `reducedMotion: 'reduce'` nothing moves at all.
   */
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        data-testid="page-transition"
        data-page={location.pathname}
        initial={reducedMotion ? false : pageVariants.initial}
        animate={reducedMotion ? undefined : pageVariants.enter}
        exit={reducedMotion ? undefined : pageVariants.exit}
        className="min-h-[inherit]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}