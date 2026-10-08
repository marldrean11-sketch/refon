/**
 * The navbar's scroll-driven appearance.
 *
 * Three states, all derived from the scroll position and never from a click:
 *
 *   - **transparent** at the top of the page, so the hero owns the first screen
 *   - **solid** once scrolled, so text scrolling underneath stays readable
 *   - **hidden while scrolling down**, revealed on any scroll up
 *
 * A hide-on-down header is the one piece of scroll behaviour users expect without
 * being told, but it is only a *help* if it is not twitchy. Two rules keep it
 * from becoming one:
 *
 *   - **8px of dead zone.** Trackpads and momentum scrolling emit a stream of
 *     sub-pixel deltas; reacting to those makes the header strobe. Below the
 *     threshold the direction is remembered but nothing moves.
 *   - **Reveal always wins.** Scrolling up shows the header no matter where the
 *     page is, because a person scrolling up is looking for the navigation.
 *
 * `useScroll` is the source of truth rather than a scroll listener, so this
 * shares the compositor's scroll signal with the progress bar and costs nothing.
 */
import { useEffect, useState } from 'react'

/** Deltas below this do not change the header's state. */
const DEAD_ZONE = 8

/** Where the header becomes solid. */
const SOLID_AT = 40

export function useNavbarScrollState() {
  /**
   * Initialised from the live scroll position rather than from `false`.
   *
   * A reload mid-page, or a back-navigation that restores a scroll offset, would
   * otherwise mount a transparent header at the top of a page the visitor has
   * already scrolled past.
   */
  const [state, setState] = useState(() => ({
    isScrolled: typeof window !== 'undefined' && window.scrollY > SOLID_AT,
    isHidden: false,
  }))

  useEffect(() => {
    // Anything remembered across frames, kept out of React state so a scroll
    // stream cannot cause a render per event.
    let lastY = window.scrollY
    let lastDirection = 0
    let frame = 0
    let current = { isScrolled: false, isHidden: false }

    function apply(next) {
      if (next.isScrolled === current.isScrolled && next.isHidden === current.isHidden) {
        return
      }

      current = next
      setState(next)
    }

    function onScroll() {
      if (frame) {
        return
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0

        const y = Math.max(0, window.scrollY)
        const delta = y - lastY

        if (Math.abs(delta) >= DEAD_ZONE) {
          lastDirection = delta > 0 ? 1 : -1
          lastY = y
        } else if (y !== lastY) {
          // Inside the dead zone: track the position for the solid threshold, but
          // leave the remembered direction alone.
          lastY = y
        }

        const isScrolled = y > SOLID_AT

        // Never hide on the way to the top: a header that disappears as the
        // shopper is returning to the start of the page is a trap.
        const isHidden =
          lastDirection > 0 && isScrolled && y > SOLID_AT + DEAD_ZONE

        apply({ isScrolled, isHidden })
      })
    }

    // Adopt the live position on mount, which matters for a reload mid-page or a
    // back-navigation that restores a scroll offset. `current` is seeded from
    // the same measurement the initial state used, so this cannot cause a second
    // render.
    lastY = window.scrollY
    lastDirection = window.scrollY > SOLID_AT ? -1 : 0
    current = {
      isScrolled: window.scrollY > SOLID_AT,
      isHidden: false,
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [])

  return state
}