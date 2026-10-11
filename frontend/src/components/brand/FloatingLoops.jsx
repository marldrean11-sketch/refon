import { LogoGlyph } from '../ui/BrandMark.jsx'

/**
 * Where each rising Loop starts and how it moves. Fixed rather than random so
 * the server-free first paint and every later render agree, and so the
 * background looks the same in a screenshot as it did at the booth.
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

/**
 * The floating-loops background: lime outlines of the Loop logo drifting up over
 * a neon grid floor that scrolls toward the viewer.
 *
 * Purely decorative and `aria-hidden`. It fills its nearest positioned ancestor,
 * so a section opts in with `relative overflow-hidden` and puts its own content
 * in a `relative` layer above it. Reduced-motion collapses every animation in
 * `index.css`, which leaves a still grid and a few outlines.
 */
export function FloatingLoops({ className = '', floor = true, density = 'full' }) {
  const loops = density === 'light' ? LOOPS.filter((_, i) => i % 2 === 0) : LOOPS

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {floor && <div className="rf-floor" />}
      {loops.map((loop) => (
        <span
          key={loop.left}
          className="rf-rising-loop text-accent"
          style={{
            left: loop.left,
            width: loop.size,
            height: loop.size,
            opacity: loop.opacity,
            animationDuration: `${loop.duration}s`,
            animationDelay: `${loop.delay}s`,
            '--r': `${loop.rotate}deg`,
          }}
        >
          <LogoGlyph tile={false} draw={false} className="block size-full" />
        </span>
      ))}
    </div>
  )
}
