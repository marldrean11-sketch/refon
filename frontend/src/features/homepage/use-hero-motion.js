/**
 * The hero's featured-listing carousel.
 *
 * Extracted from the component because the state is the interesting part and it
 * has nothing to do with markup: which slide is showing, whether it is allowed to
 * advance, and how far the panel has been dragged by the pointer.
 *
 * Three rules that the carousel would break without them:
 *
 *   - **One timer, always stopped before it starts.** A carousel that keeps
 *     running after it unmounts fires `setState` on a dead component and keeps a
 *     live interval alive for the rest of the session.
 *   - **Hover and focus both pause.** Keyboard users tabbing through the dots
 *     would otherwise be interrupted by a slide changing under them, which is
 *     worse than never advancing at all.
 *   - **Reduced motion does not advance.** An auto-advancing carousel is exactly
 *     the kind of thing the reduced-motion preference is asking to be spared; it is
 *     left to the visitor's own hands.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../lib/motion.ts'

/** Milliseconds a slide is held before the carousel moves on. */
export const SLIDE_INTERVAL = 5000

/**
 * @param {number} count how many slides there are
 * @returns the index, the handlers, and whether it is currently advancing
 */
export function useHeroCarousel(count) {
  const reducedMotion = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // One previous, not always 0: wrapping forwards past the end should show the
  // last slide, not jump to the first.
  const previousIndex = (index - 1 + count) % count
  const nextIndex = (index + 1) % count

  const goTo = useCallback(
    (target) => {
      if (count > 0) {
        setIndex(((target % count) + count) % count)
      }
    },
    [count],
  )

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const previous = useCallback(() => goTo(index - 1), [goTo, index])

  // A shrinking catalog must not strand the carousel on a slide that no longer
  // exists, which is what happens if the index is left alone when `count` drops.
  const lastCount = useRef(count)
  useEffect(() => {
    if (count !== lastCount.current) {
      lastCount.current = count
      setIndex((current) => (count > 0 ? current % count : 0))
    }
  }, [count])

  useEffect(() => {
    if (count <= 1 || isPaused || reducedMotion) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count)
    }, SLIDE_INTERVAL)

    return () => window.clearInterval(timer)
  }, [count, isPaused, reducedMotion])

  const pause = useCallback(() => setIsPaused(true), [])
  const resume = useCallback(() => setIsPaused(false), [])

  return { index, previousIndex, nextIndex, goTo, next, previous, pause, resume, isPaused }
}

/**
 * Pointer parallax for the hero panel.
 *
 * Two speeds, because one speed reads as the whole panel sliding rather than as
 * layers at different depths. Returns a function that sets the transform directly
 * on two elements, so the scroll handler and the pointer handler never cause a
 * React render — a scroll stream that re-renders is the thing that makes a
 * parallax effect feel cheap.
 *
 * `enabled` is false below 1024px: a parallax that responds to a finger dragging
 * the page fights the scroll, and on a phone there is no hover to read it against.
 */
export function useHeroParallax({ enabled }) {
  const layerRefs = useRef({ far: null, near: null })

  const setLayer = useCallback((name) => (node) => {
    layerRefs.current[name] = node
  }, [])

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let frame = 0
    // Kept out of React state on purpose; see above.
    let pointer = { x: 0, y: 0 }
    let scroll = 0

    function paint() {
      frame = 0

      const far = layerRefs.current.far
      const near = layerRefs.current.near

      if (far) {
        far.style.transform = `translate3d(${pointer.x * -6}px, ${scroll * 0.06 + pointer.y * -6}px, 0)`
      }
      if (near) {
        near.style.transform = `translate3d(${pointer.x * 14}px, ${scroll * -0.13 + pointer.y * 14}px, 0)`
      }
    }

    function schedule() {
      if (!frame) {
        frame = window.requestAnimationFrame(paint)
      }
    }

    function onPointerMove(event) {
      // Normalised to -1..1 from the panel's centre, so the pull is the same at
      // every viewport size.
      pointer = {
        x: (event.clientX / window.innerWidth - 0.5) * 2,
        y: (event.clientY / window.innerHeight - 0.5) * 2,
      }
      schedule()
    }

    function onPointerLeave() {
      pointer = { x: 0, y: 0 }
      schedule()
    }

    function onScroll() {
      scroll = Math.max(0, window.scrollY)
      schedule()
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('scroll', onScroll)
    }
  }, [enabled])

  return { setLayer }
}

/**
 * The magnetic pull on the hero's primary button.
 *
 * The button leans toward the pointer, capped at `MAX_PULL` so it stays a button
 * and does not become a drag target. The cap is the whole point of the effect:
 * uncapped, a slow pointer drag across the CTA pulls it far enough that the
 * pointer slips off the edge and the button snaps back, which feels broken.
 *
 * No effect and no subscription — this is pure event handling, so the offset is
 * derived from the last event and nothing has to be torn down. Under reduced
 * motion `enabled` is false and the returned offset is simply always zero, which
 * is why there is no `setState` in an effect to reset it.
 */
export const MAX_PULL = 12

const NO_OFFSET = Object.freeze({ x: 0, y: 0 })

export function useMagneticPull(enabled) {
  const [offset, setOffset] = useState(NO_OFFSET)

  const onPointerMove = useCallback(
    (event) => {
      if (!enabled) {
        return
      }

      const box = event.currentTarget.getBoundingClientRect()

      const dx = event.clientX - (box.left + box.width / 2)
      const dy = event.clientY - (box.top + box.height / 2)

      // Normalised by half the button, then clamped: 1.0 means "as far as it
      // goes", which is MAX_PULL pixels from centre.
      const nx = Math.max(-1, Math.min(1, dx / (box.width / 2)))
      const ny = Math.max(-1, Math.min(1, dy / (box.height / 2)))

      const next = { x: nx * MAX_PULL, y: ny * MAX_PULL }

      // Skip the render when the pull has not meaningfully moved, so a pointer
      // sitting still over the button does not re-render on every event.
      setOffset((current) =>
        Math.abs(current.x - next.x) < 0.5 && Math.abs(current.y - next.y) < 0.5 ? current : next,
      )
    },
    [enabled],
  )

  const reset = useCallback(() => setOffset(NO_OFFSET), [])

  return { offset: enabled ? offset : NO_OFFSET, onPointerMove, reset }
}
