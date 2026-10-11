import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { getLenis } from '../../lib/scroll.js'
import { usePrefersReducedMotion } from '../../lib/motion.ts'

const RADIUS = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * The back-to-top button.
 *
 * Appears once the visitor is about a screen and a half down, bottom-right,
 * clear of the mobile tab bar and the compare tray. A lime ring around the arrow
 * fills with progress down the page, so it doubles as a "how far am I" gauge.
 * The trip up is smooth (Lenis when it is running), and instant under reduced
 * motion; focus then moves to the top of the page so keyboard users land there.
 */
export function BackToTop() {
  const reduced = usePrefersReducedMotion()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0
    function measure() {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const y = window.scrollY
      setProgress(max > 0 ? Math.min(1, y / max) : 0)
      setVisible(y > window.innerHeight * 1.5)
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  function goUp() {
    const lenis = getLenis()
    if (lenis && !reduced) {
      lenis.scrollTo(0, { duration: 0.9 })
    } else {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
    }
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }

  return (
    <button
      type="button"
      data-testid="back-to-top"
      onClick={goUp}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`rf-bounce group fixed bottom-[calc(13rem+env(safe-area-inset-bottom))] right-4 z-header grid size-14 place-items-center rounded-full border border-line-2 bg-card/90 text-ink shadow-pop backdrop-blur transition-[opacity,transform] duration-300 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:bottom-24 lg:right-6 ${
        visible ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <svg viewBox="0 0 52 52" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="26" cy="26" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-line" />
        <circle
          cx="26"
          cy="26"
          r={RADIUS}
          fill="none"
          stroke="#c6ff3d"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${progress * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        />
      </svg>
      <ArrowUp
        className="relative size-5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-0.5"
        strokeWidth={2.25}
        aria-hidden="true"
      />
    </button>
  )
}
