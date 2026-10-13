import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getLenis } from '../../lib/scroll.js'
import { usePrefersReducedMotion } from '../../lib/motion.ts'

/** Arrow keys on the slider move the page by this share of its length. */
const KEY_STEP = 0.1

/**
 * The page slider on the left edge.
 *
 * An up arrow, a track with a lime thumb that shows how far down the page is,
 * and a down arrow. Dragging the thumb, or clicking anywhere on the track,
 * scrolls the page to that point; the arrows jump to the top and the bottom.
 * It only appears on pages long enough to need it, and only from `md` up, where
 * the left edge has room to spare. Phones keep the back-to-top button.
 */
export function PageSlider() {
  const reduced = usePrefersReducedMotion()
  const trackRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    let frame = 0
    function measure() {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0)
      setVisible(max > window.innerHeight * 0.5)
    }
    function onChange() {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onChange, { passive: true })
    window.addEventListener('resize', onChange)
    // Pages grow after their data loads, which fires no scroll or resize.
    const observer = new ResizeObserver(onChange)
    observer.observe(document.body)
    return () => {
      window.removeEventListener('scroll', onChange)
      window.removeEventListener('resize', onChange)
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  function scrollToFraction(fraction, smooth) {
    const max = document.documentElement.scrollHeight - window.innerHeight
    const y = Math.min(1, Math.max(0, fraction)) * max
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(y, smooth && !reduced ? { duration: 0.9 } : { immediate: true })
    } else {
      window.scrollTo({ top: y, behavior: smooth && !reduced ? 'smooth' : 'auto' })
    }
  }

  function fractionAt(clientY) {
    const box = trackRef.current.getBoundingClientRect()
    return (clientY - box.top) / box.height
  }

  function onPointerDown(event) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    scrollToFraction(fractionAt(event.clientY), false)
  }

  function onPointerMove(event) {
    if (dragging) scrollToFraction(fractionAt(event.clientY), false)
  }

  function onPointerUp(event) {
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setDragging(false)
  }

  function onKeyDown(event) {
    const moves = {
      ArrowUp: progress - KEY_STEP,
      ArrowLeft: progress - KEY_STEP,
      ArrowDown: progress + KEY_STEP,
      ArrowRight: progress + KEY_STEP,
      PageUp: progress - KEY_STEP * 3,
      PageDown: progress + KEY_STEP * 3,
      Home: 0,
      End: 1,
    }
    if (!(event.key in moves)) return
    event.preventDefault()
    scrollToFraction(moves[event.key], true)
  }

  const percent = Math.round(progress * 100)
  const arrow =
    'rf-bounce grid size-9 place-items-center rounded-full text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30 disabled:hover:text-muted'

  return (
    <div
      data-testid="page-slider"
      aria-hidden={!visible}
      className={`fixed left-3 top-1/2 z-header hidden -translate-y-1/2 flex-col items-center gap-1 rounded-full border border-line-2 bg-card/80 p-1 shadow-pop backdrop-blur transition-opacity duration-300 md:flex print:hidden ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <button
        type="button"
        onClick={() => scrollToFraction(0, true)}
        disabled={progress <= 0}
        tabIndex={visible ? 0 : -1}
        aria-label="Scroll to top"
        className={arrow}
      >
        <ChevronUp className="size-5" strokeWidth={2.25} aria-hidden="true" />
      </button>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={visible ? 0 : -1}
        aria-label="Page position"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}% down the page`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={`relative h-40 w-6 touch-none rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          dragging ? 'cursor-grabbing' : 'cursor-pointer'
        }`}
      >
        {/* The rail, with the part already scrolled past filled in lime. */}
        <span className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-line-2" />
        <span
          className="absolute left-1/2 top-0 w-1 -translate-x-1/2 rounded-full bg-accent"
          style={{ height: `${percent}%` }}
        />
        <span
          className={`absolute left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-page bg-accent shadow-pop transition-transform ${
            dragging ? 'scale-125' : ''
          }`}
          style={{ top: `${percent}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => scrollToFraction(1, true)}
        disabled={progress >= 1}
        tabIndex={visible ? 0 : -1}
        aria-label="Scroll to bottom"
        className={arrow}
      >
        <ChevronDown className="size-5" strokeWidth={2.25} aria-hidden="true" />
      </button>
    </div>
  )
}
