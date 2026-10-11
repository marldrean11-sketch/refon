import { useEffect, useRef, useState } from 'react'
import { LogoGlyph } from '../ui/BrandMark.jsx'
import { Confetti } from '../ui/Confetti.jsx'

/**
 * Where each rising Loop starts and how it moves. Fixed rather than random so
 * the first paint and every later render agree, and so the background looks
 * the same in a screenshot as it did at the booth.
 */
const LOOPS = Object.freeze([
  { left: '6%', size: 44, duration: 10, delay: 0, rotate: -10, opacity: 0.45 },
  { left: '19%', size: 28, duration: 13, delay: 3, rotate: 12, opacity: 0.3 },
  { left: '33%', size: 54, duration: 11, delay: 6, rotate: -4, opacity: 0.35 },
  { left: '51%', size: 34, duration: 14, delay: 1, rotate: 20, opacity: 0.25 },
  { left: '67%', size: 48, duration: 9, delay: 4, rotate: -18, opacity: 0.4 },
  { left: '81%', size: 30, duration: 12, delay: 8, rotate: 6, opacity: 0.3 },
  { left: '92%', size: 40, duration: 10, delay: 2, rotate: -8, opacity: 0.35 },
])

/** Clicks on these go to the control, never to a loop drifting behind it. */
const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], [role="switch"]'

/** A little slack around each loop so a moving target is easy to hit. */
const HIT_SLOP = 10

/**
 * The floating-loops background: lime outlines of the Loop logo drifting up over
 * a neon grid floor that scrolls toward the viewer.
 *
 * The loops are a small toy as well as a background. Pointing at one makes it
 * glow and wiggle; clicking or tapping it pops it into confetti, and a fresh one
 * floats up from the bottom a moment later.
 *
 * The layer sits *behind* the section's content, so instead of taking pointer
 * events itself it hit-tests pointer positions from its parent section: a press
 * on empty space or plain text over a loop pops it, while a press on a link or
 * button always reaches that control. It stays `aria-hidden`: it is decoration
 * with a bonus, and nothing on the page depends on it.
 */
export function FloatingLoops({ className = '', floor = true, density = 'full', loopClassName = 'text-accent' }) {
  const loops = density === 'light' ? LOOPS.filter((_, i) => i % 2 === 0) : LOOPS
  const layerRef = useRef(null)
  const loopRefs = useRef([])
  const [generation, setGeneration] = useState(() => loops.map(() => 0))
  const [hovered, setHovered] = useState(-1)
  const [bursts, setBursts] = useState([])

  useEffect(() => {
    const layer = layerRef.current
    const host = layer?.parentElement
    if (!layer || !host) return undefined

    /** Index of the loop under a viewport point, or -1. */
    function loopAt(x, y) {
      for (let i = loopRefs.current.length - 1; i >= 0; i -= 1) {
        const node = loopRefs.current[i]
        if (!node || node.dataset.popped === 'true') continue
        const r = node.getBoundingClientRect()
        if (
          x >= r.left - HIT_SLOP &&
          x <= r.right + HIT_SLOP &&
          y >= r.top - HIT_SLOP &&
          y <= r.bottom + HIT_SLOP
        ) {
          return i
        }
      }
      return -1
    }

    function onMove(event) {
      if (event.pointerType !== 'mouse') return
      const i = event.target.closest?.(INTERACTIVE) ? -1 : loopAt(event.clientX, event.clientY)
      setHovered((current) => (current === i ? current : i))
      host.style.cursor = i >= 0 ? 'pointer' : ''
    }

    function onDown(event) {
      if (event.target.closest?.(INTERACTIVE)) return
      const i = loopAt(event.clientX, event.clientY)
      if (i < 0) return

      const node = loopRefs.current[i]
      const box = node.getBoundingClientRect()
      const base = layer.getBoundingClientRect()
      node.dataset.popped = 'true'
      const id = `${i}-${Date.now()}`
      setBursts((list) => [
        ...list,
        { id, x: box.left - base.left + box.width / 2, y: box.top - base.top + box.height / 2 },
      ])
      setHovered(-1)
      host.style.cursor = ''

      // Clear the confetti, then send a fresh loop up from the bottom.
      window.setTimeout(() => setBursts((list) => list.filter((burst) => burst.id !== id)), 900)
      window.setTimeout(() => {
        node.dataset.popped = 'false'
        setGeneration((list) => list.map((value, index) => (index === i ? value + 1 : value)))
      }, 1200)
    }

    function onLeave() {
      setHovered(-1)
      host.style.cursor = ''
    }

    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerdown', onDown)
    host.addEventListener('pointerleave', onLeave)
    return () => {
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerdown', onDown)
      host.removeEventListener('pointerleave', onLeave)
      host.style.cursor = ''
    }
  }, [])

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      data-testid="floating-loops"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {floor && <div className="rf-floor" />}
      {loops.map((loop, i) => (
        <span
          // A new key restarts the rise from the bottom after a pop.
          key={`${loop.left}-${generation[i]}`}
          ref={(node) => {
            loopRefs.current[i] = node
          }}
          data-loop-index={i}
          className={`rf-rising-loop ${loopClassName}`}
          style={{
            left: loop.left,
            width: loop.size,
            height: loop.size,
            opacity: loop.opacity,
            animationDuration: `${loop.duration}s`,
            animationDelay: generation[i] ? '0s' : `${loop.delay}s`,
            '--r': `${loop.rotate}deg`,
          }}
        >
          <span className={`rf-loop-toy block size-full ${hovered === i ? 'is-hovered' : ''}`}>
            <LogoGlyph tile={false} draw={false} className="block size-full" />
          </span>
        </span>
      ))}
      {bursts.map((burst) => (
        <span
          key={burst.id}
          className="absolute size-0"
          style={{ left: burst.x, top: burst.y }}
        >
          <span className="rf-loop-popped absolute -left-6 -top-6 size-12 rounded-full border-2 border-accent" />
          <Confetti active burstKey={burst.id} sound="pop" />
        </span>
      ))}
    </div>
  )
}
