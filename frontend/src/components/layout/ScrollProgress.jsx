import { motion, useScroll } from 'framer-motion'

/**
 * The reading-progress bar.
 *
 * Three pixels, fixed to the top edge, driven by `useScroll`. It answers one
 * question — "how much of this page is left?" — without adding a single pixel of
 * layout, because the element is taken out of flow entirely.
 *
 * `scaleX` rather than `width`. Animating `width` re-runs layout on every frame
 * of a scroll, which is exactly the jank a scroll-linked element exists to
 * avoid; `scaleX` is a pure compositor transform and stays smooth on a long
 * catalogue page. `transform-origin` is pinned to `0% 50%` so the bar fills from
 * the left edge of the viewport instead of growing out of its own centre.
 *
 * The raw scroll progress is used rather than a spring on purpose. A spring lags
 * the viewport by a few frames, which on a fast flick reads as the bar disagreeing
 * with the page. It is already tracking the scroll position exactly; there is
 * nothing left to smooth.
 *
 * The bar survives reduced motion, and that is deliberate. It is an indicator,
 * not an animation: it reports a position the visitor can already see for
 * themselves, it moves only in response to their own input, and removing it
 * would take away information rather than take away motion.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()

  return (
    <motion.div
      data-testid="scroll-progress"
      aria-hidden="true"
      style={{ scaleX: scrollYProgress }}
      className="pointer-events-none fixed inset-x-0 top-0 z-progress print:hidden h-[3px] origin-left bg-accent"
    />
  )
}