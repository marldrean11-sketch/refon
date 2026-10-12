import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Confetti } from './Confetti.jsx'

/** The Loop's path: a phone outline drawn as one stroke that ends in an arrow. */
const LOOP_PATH =
  'M62 20H66A10 10 0 0 1 76 30V82A10 10 0 0 1 66 92H46A10 10 0 0 1 36 82V30A10 10 0 0 1 46 20H48'

/**
 * The glyph on its own: the Loop.
 *
 * A lime tile holding a phone whose outline is a single stroke that comes back
 * around and ends in an arrowhead: a phone, given another round. On first paint
 * the stroke draws itself and the arrowhead pops in (`.rf-loop-draw` in
 * index.css); it turns once when its parent link is hovered, and `loading`
 * keeps it turning, which is how the same mark doubles as the spinner.
 *
 * `inverse` swaps the tile to near-black with a lime outline, for lime panels.
 * `tile={false}` drops the lime square and draws the outline in `currentColor`,
 * for decorative uses such as the floating-loops background.
 */
export function LogoGlyph({ className = 'size-9', tile = true, draw = true, loading = false, inverse = false }) {
  const stroke = !tile ? 'currentColor' : inverse ? '#c6ff3d' : '#0a0b0d'
  return (
    <svg
      viewBox="0 0 112 112"
      className={`${className} ${draw ? 'rf-loop-draw' : ''} ${loading ? 'rf-loop-spin' : 'rf-loop-hover'}`}
      fill="none"
      aria-hidden="true"
    >
      {tile && <rect width="112" height="112" rx="30" fill={inverse ? '#0a0b0d' : '#c6ff3d'} />}
      <path
        className="rf-loop-stroke"
        d={LOOP_PATH}
        stroke={stroke}
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path className="rf-loop-head" d="M47 10L59 20L47 30Z" fill={stroke} />
      <circle cx="56" cy="80" r="4.5" fill={stroke} />
    </svg>
  )
}

/** The wordmark: "re" in chalk and "fon" in lime, so it reads as re + phone. */
export function Wordmark({ inverse = false, className = 'text-[1.35rem] sm:text-[1.5rem]' }) {
  return (
    <span
      className={`font-display font-extrabold leading-none tracking-[-0.04em] ${
        inverse ? 'text-page' : 'text-ink'
      } ${className}`}
    >
      re<span className={inverse ? 'text-page/70' : 'text-accent'}>fon</span>
    </span>
  )
}

/**
 * The lockup: Loop beside the wordmark, as a link home.
 *
 * A click squashes the tile, spins it once with a bounce and pops a little lime
 * confetti, while the link still takes the visitor home. Reduced motion keeps
 * the navigation and drops the effect (index.css).
 */
export function BrandMark({
  inverse = false,
  compact = false,
  className = '',
  wordmarkClassName = '',
  glyphClassName = 'size-9 sm:size-10',
  wordmarkSize = 'text-[1.35rem] sm:text-[1.5rem]',
  onClick,
}) {
  // `burst` only ever counts up, so each click remounts the glyph to replay the
  // spin; `active` turns the confetti off again once its flight is over.
  const [burst, setBurst] = useState(0)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!active) return undefined
    const timer = window.setTimeout(() => setActive(false), 900)
    return () => window.clearTimeout(timer)
  }, [active, burst])

  return (
    <Link
      to="/"
      onClick={(event) => {
        setBurst((count) => count + 1)
        setActive(true)
        onClick?.(event)
      }}
      aria-label="ReFon home"
      data-testid="brand-mark"
      className={`group inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page ${className}`}
    >
      <span className="relative shrink-0">
        <span key={burst} className={`block ${burst ? 'rf-logo-click' : ''}`}>
          <LogoGlyph className={glyphClassName} inverse={inverse} draw={burst === 0} />
        </span>
        <Confetti active={active} burstKey={burst} />
      </span>
      {!compact && (
        <Wordmark inverse={inverse} className={`${wordmarkSize} ${wordmarkClassName}`} />
      )}
    </Link>
  )
}
