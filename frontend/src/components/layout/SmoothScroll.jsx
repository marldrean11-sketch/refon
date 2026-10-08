import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { usePrefersReducedMotion } from '../../lib/motion.ts'
import { setLenis } from '../../lib/scroll.js'

/**
 * Smooth scrolling for the whole application.
 *
 * Lenis wraps `requestAnimationFrame` and eases the scroll position towards
 * wherever the wheel is pushing it, which is what turns scrolling from a series
 * of jumps into continuous movement. It is deliberately the only thing this
 * provider does: it installs Lenis, registers it as the app's scroll authority,
 * and tears it down when the visitor asks for reduced motion. Routing stays with
 * the router.
 *
 * Four details are load-bearing:
 *
 *   - **Reduced motion disables it entirely.** Not "shortens it". A
 *     `prefers-reduced-motion` visitor has asked for no inertial movement, and
 *     an eased scroll position is exactly that. `usePrefersReducedMotion` reads
 *     the preference synchronously, so there is never a frame where Lenis is
 *     live and should not be.
 *
 *   - **Browser scroll restoration is switched off.** Left on, the browser
 *     re-applies the previous scroll offset after a route change and fights the
 *     reset — the usual cause of "the page is halfway down when I navigate".
 *
 *   - **In-page anchors are intercepted.** `href="#faq"` relies on native
 *     smooth scrolling. Once Lenis owns the position, a native anchor jump moves
 *     the document underneath the smoothing and the link feels broken. One
 *     delegated listener routes every anchor through Lenis with an offset that
 *     clears the sticky header.
 *
 *   - **Nothing else scrolls.** `src/lib/scroll.js` is the single scroll
 *     authority, and it falls back to native calls when Lenis is absent, so no
 *     caller has to know whether smoothing is installed.
 */
export function SmoothScroll({ children }) {
  const reducedMotion = usePrefersReducedMotion()
  const lenisRef = useRef(null)

  useEffect(() => {
    // Only this provider ever scrolls, so only this provider may restore.
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }

    return () => {
      if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
        history.scrollRestoration = 'auto'
      }
    }
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      setLenis(null)
      lenisRef.current = null
      return undefined
    }

    const instance = new Lenis({
      // Lenis drives its own rAF loop and parks it when the tab is hidden.
      autoRaf: true,
      // Wheel input is smoothed; touch is not, because a smoothed finger scroll
      // fights the platform's own inertia and reads as broken.
      smoothWheel: true,
      syncTouch: false,
      // Long enough to read as continuous, short enough that a flick is not a
      // waiting game.
      duration: 1.05,
      wheelMultiplier: 1,
      // Native anchor handling is replaced below so the offset clears the sticky
      // header consistently.
      anchors: false,
    })

    lenisRef.current = instance
    setLenis(instance)

    return () => {
      lenisRef.current = null
      setLenis(null)
      instance.destroy()
    }
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) {
      return undefined
    }

    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const link = event.target instanceof Element ? event.target.closest('a[href]') : null

      if (!link || link.target === '_blank' || link.hasAttribute('download')) {
        return
      }

      const href = link.getAttribute('href')

      if (!href || !href.startsWith('#') || href === '#') {
        return
      }

      const target = document.getElementById(decodeURIComponent(href.slice(1)))

      if (!target) {
        return
      }

      event.preventDefault()
      lenisRef.current?.scrollTo(target, { offset: -96 })
      window.history.replaceState(null, '', href)
    }

    document.addEventListener('click', onClick)

    return () => document.removeEventListener('click', onClick)
  }, [reducedMotion])

  return children
}