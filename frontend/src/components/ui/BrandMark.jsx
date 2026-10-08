import { Link } from 'react-router-dom'

/**
 * The glyph, on its own.
 *
 * A device outline with a reFon tick cut into it — the one idea the brand
 * actually sells, which is "inspected, so it's cleared". It is drawn with a
 * square silhouette and a hairline rather than a soft filled tile, so the logo
 * belongs to the same object language as the cards and buttons around it.
 *
 * It is exported separately from `BrandMark` because `BrandMark` is a `Link` —
 * a navigation control — and the splash screen needs the same mark without
 * something underneath it that a visitor could click. Two copies of the path
 * data would be two things to keep in step; one copy with two callers cannot.
 */
export function LogoGlyph({ className = 'size-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <rect x="6.5" y="2.5" width="11" height="19" rx="1.5" />
      <path d="M10.5 18.2h3" />
      <path d="m8.6 12.4 2.1 2.2 4.5-4.9" className="text-accent-500" />
    </svg>
  )
}

/**
 * The wordmark: the glyph inside its tile, beside the name.
 */
export function BrandMark({
  inverse = false,
  compact = false,
  className = '',
  onClick,
}) {
  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label="ReFon home"
      className={`group inline-flex items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-950 focus-visible:ring-offset-2 ${className}`}
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-control ${
          inverse
            ? 'bg-white text-primary-950'
            : 'bg-primary-950 text-white'
        }`}
      >
        <LogoGlyph />
      </span>
      {!compact && (
        <span
          className={`font-display text-xl font-bold tracking-[-0.03em] ${
            inverse ? 'text-white' : 'text-ink'
          }`}
        >
          ReFon
        </span>
      )}
    </Link>
  )
}