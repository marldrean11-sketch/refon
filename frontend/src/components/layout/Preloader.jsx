import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { easings, usePrefersReducedMotion } from '../../lib/motion.ts'
import { LogoGlyph } from '../ui/BrandMark.jsx'

const STORAGE_KEY = 'refon:preloader-seen'

/**
 * Whether this page load has already claimed the splash.
 *
 * Module scope on purpose, and this is the subtle part of the component.
 * `React.StrictMode` mounts an effect, runs its cleanup, and mounts it again in
 * development. An effect that claims the splash on its first pass and *then*
 * records `seen` in sessionStorage will, on its second pass, read back the flag
 * it just wrote, decide the splash had already been shown, and return early —
 * while the cleanup it just ran has already cancelled the timers that were going
 * to dismiss the panel. The result is a splash screen that never leaves and a
 * site that cannot be clicked. A module-level claim survives the simulated
 * remount, so the second pass knows the first pass is still in charge.
 */
let claimed = false

/** Logo arrives, panel leaves, element unmounts. */
const HOLD_MS = 520
const PANEL_OUT_MS = 420
const UNMOUNT_MS = 980
const LOGO_IN_MS = 380

/** Hard ceiling. The splash is never the reason a page feels slow. */
export const MAX_MS = 1200

/**
 * The first-visit splash.
 *
 * It runs once per browser session, not once per page load. The distinction
 * matters: a preloader that reappears on every navigation is a tax, but one that
 * appears on the first visit and never again is a statement — it is the only
 * moment in the product where nothing is being asked of the visitor.
 *
 * Five decisions worth stating:
 *
 *   - **Session-scoped, via `sessionStorage`.** Opening a second tab in the same
 *     session does not replay it, and closing the browser does. `sessionStorage`
 *     is the only storage that gives that behaviour for free.
 *
 *   - **It unmounts, it does not fade out and linger.** The element is removed
 *     from the DOM on a fixed schedule rather than left at `opacity: 0`, so it
 *     cannot appear in a screenshot and cannot be found by an accessibility tool
 *     as an empty landmark.
 *
 *   - **It never intercepts a click.** The panel is `pointer-events-none`
 *     throughout. It is decoration, it lasts under a second, and a splash that
 *     swallows the first click of a session is a worse first impression than no
 *     splash at all. It also means the page underneath is genuinely interactive
 *     rather than nominally interactive.
 *
 *   - **Reduced motion skips it outright.** Not a shorter version — no version.
 *     A visitor who has turned motion off at the OS level should land on the
 *     page, and a panel sliding up over them is the exact thing they asked not
 *     to see.
 *
 *   - **The backdrop is the panel, not the overlay.** The overlay is transparent
 *     and only the panel carries a surface, so sliding the panel up reveals the
 *     real page underneath it. A filled wrapper around a filled panel would make
 *     the exit invisible.
 *
 * The logo fades and scales in rather than "drawing in": a stroke draw is a
 * `stroke-dashoffset` animation, which is a paint on every frame and would be the
 * one thing in this sequence that is not composited. Only `transform` and
 * `opacity` move here, so the whole sequence cannot cause a layout shift on the
 * page underneath it.
 */
export function Preloader() {
  const reducedMotion = usePrefersReducedMotion()
  const [leaving, setLeaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  /**
   * Whether this component instance is still on screen.
   *
   * The timers are deliberately *not* cancelled on cleanup — StrictMode's
   * simulated unmount would cancel them and strand the panel. Instead cleanup
   * flips this flag, and the callbacks check it before touching state: a real
   * unmount makes them no-ops, and a StrictMode remount leaves them running.
   */
  const alive = useRef(false)

  useEffect(() => {
    alive.current = true

    if (reducedMotion || claimed) {
      return undefined
    }

    let seen = false

    try {
      seen = window.sessionStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      // A blocked storage partition is not a reason to break the page: fall
      // through and play the splash once for this load.
    }

    if (seen) {
      return undefined
    }

    claimed = true

    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Same reasoning. Worst case the splash replays on the next load.
    }

    setMounted(true)

    window.setTimeout(() => {
      if (alive.current) setLeaving(true)
    }, HOLD_MS)

    window.setTimeout(() => {
      if (alive.current) setMounted(false)
    }, UNMOUNT_MS)

    return undefined
  }, [reducedMotion])

  useEffect(
    () => () => {
      alive.current = false
    },
    [],
  )

  if (!mounted || reducedMotion) {
    return null
  }

  return (
    <div
      data-testid="preloader"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-preloader"
    >
      <motion.div
        data-testid="preloader-panel"
        initial={{ y: '0%' }}
        animate={{ y: leaving ? '-100%' : '0%' }}
        transition={{ duration: PANEL_OUT_MS / 1000, ease: easings.entrance }}
        className="absolute inset-0 flex items-center justify-center bg-page"
      >
        <motion.div
          data-testid="preloader-mark"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: LOGO_IN_MS / 1000, ease: easings.entrance }}
          className="flex items-center gap-3 text-ink"
        >
          <span className="grid size-11 place-items-center rounded-card bg-dark text-white">
            <LogoGlyph className="size-6" />
          </span>
          <span className="text-2xl font-bold tracking-[-0.03em]">ReFon</span>
        </motion.div>
      </motion.div>
    </div>
  )
}