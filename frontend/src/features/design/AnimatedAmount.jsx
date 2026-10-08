/**
 * A number that eases to a new value.
 *
 * Written directly against a `requestAnimationFrame` loop rather than with a
 * spring, because a currency figure should not overshoot: it counts up to the new
 * total and stops. A spring would take the subtotal past ₱33,000 on its way to
 * ₱32,990, which reads as a price changing rather than as a figure settling.
 *
 * The displayed value is rounded to whole pesos on every frame, so what is on
 * screen is always a figure that could be real.
 */
import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../lib/motion.ts'

/** How long a count takes. */
const DURATION = 420

/** Below this, change instantly: animating ₱0 to ₱1 is noise. */
const MIN_DELTA = 1

export function AnimatedAmount({ value, format }) {
  const reducedMotion = usePrefersReducedMotion()
  const [displayed, setDisplayed] = useState(value)
  const frameRef = useRef(0)
  const fromRef = useRef(value)

  useEffect(() => {
    const target = Number(value ?? 0)
    const from = fromRef.current

    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
    }

    if (reducedMotion || Math.abs(target - from) < MIN_DELTA) {
      fromRef.current = target
      setDisplayed(target)
      return undefined
    }

    const startedAt = performance.now()

    const tick = (now) => {
      const elapsed = now - startedAt
      const progress = Math.min(1, elapsed / DURATION)

      // Same decelerating curve as the entrance easing, so the figure settles
      // rather than arriving at a constant speed and stopping dead.
      const eased = 1 - (1 - progress) ** 3

      setDisplayed(Math.round(from + (target - from) * eased))

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick)
      } else {
        frameRef.current = 0
        fromRef.current = target
      }
    }

    frameRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
      }
    }
  }, [reducedMotion, value])

  return <>{format(displayed)}</>
}