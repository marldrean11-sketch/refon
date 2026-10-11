import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../lib/motion.ts'

const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], summary'

/**
 * The lime cursor dot: a small dot that follows the mouse and opens into a ring
 * over anything clickable.
 *
 * Desktop mice only. It never renders on touch screens, and reduced motion turns
 * it off entirely, since a trailing cursor is motion the visitor did not ask for.
 * The system cursor stays visible: the dot is an accent, not a replacement, so
 * nobody loses their pointer if a frame drops.
 */
export function CustomCursor() {
  const reduced = usePrefersReducedMotion()
  const [enabled, setEnabled] = useState(false)
  const dotRef = useRef(null)
  const [isOver, setIsOver] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(pointer: fine) and (hover: hover)')
    const update = () => setEnabled(query.matches && !reduced)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [reduced])

  useEffect(() => {
    if (!enabled) return undefined

    function onMove(event) {
      const dot = dotRef.current
      if (dot) {
        dot.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
        dot.style.opacity = '1'
      }
    }

    function onOver(event) {
      setIsOver(Boolean(event.target.closest?.(INTERACTIVE)))
    }

    function onLeave() {
      if (dotRef.current) dotRef.current.style.opacity = '0'
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      data-testid="custom-cursor"
      className="pointer-events-none fixed left-0 top-0 z-preloader opacity-0 transition-opacity duration-200"
    >
      <div
        className={`-translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
          isOver ? 'size-12 bg-accent/10' : 'size-3.5 bg-accent'
        }`}
      />
    </div>
  )
}
