import { Link } from 'react-router-dom'

/**
 * The glyph, on its own: the tag-phone.
 *
 * A phone cut like a shop tag. The chamfered top corners are the tag's
 * silhouette, the earpiece is its punch hole, and the screen is a battery
 * reading with two bars lit and one faded. It reads as a phone at a glance and
 * as a measurement up close, which is the one idea the brand sells.
 *
 * It is exported separately from `BrandMark` because `BrandMark` is a `Link` —
 * a navigation control — and the splash screen needs the same mark without
 * something underneath it that a visitor could click. The viewBox is padded to a
 * square so the glyph drops into the same `size-*` boxes the old one did.
 */
export function LogoGlyph({ className = 'size-5' }) {
  return (
    <svg viewBox="-6 0 44 44" className={className} fill="none" aria-hidden="true">
      <path
        d="M8 1.5h16L30.5 8v30.5a4 4 0 0 1-4 4h-21a4 4 0 0 1-4-4V8Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="8.5" r="2.4" fill="currentColor" />
      <rect x="8" y="31" width="16" height="4.5" rx="1" fill="currentColor" />
      <rect x="8" y="24.5" width="16" height="4.5" rx="1" fill="currentColor" />
      <rect x="8" y="18" width="16" height="4.5" rx="1" fill="currentColor" opacity=".28" />
    </svg>
  )
}

/**
 * The wordmark, without a link: "re" in the text colour and "fon" in the brand
 * colour, so the name reads as re + phone. Lowercase and set at Archivo's widest
 * width, which is what makes it look like a printed tag rather than a heading.
 */
export function Wordmark({ inverse = false, className = 'text-[1.4rem] sm:text-[1.6rem]' }) {
  return (
    <span
      className={`font-display font-black leading-none tracking-[-0.03em] [font-stretch:125%] ${
        inverse ? 'text-white' : 'text-ink'
      } ${className}`}
    >
      re<span className={inverse ? 'text-tag' : 'text-brand'}>fon</span>
    </span>
  )
}

/**
 * The lockup: glyph beside the wordmark, as a link home.
 */
export function BrandMark({
  inverse = false,
  compact = false,
  className = '',
  wordmarkClassName = '',
  onClick,
}) {
  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label="ReFon home"
      className={`group inline-flex items-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${className}`}
    >
      <LogoGlyph className={`size-8 shrink-0 sm:size-9 ${inverse ? 'text-white' : 'text-ink'}`} />
      {!compact && (
        <Wordmark inverse={inverse} className={`text-[1.4rem] sm:text-[1.6rem] ${wordmarkClassName}`} />
      )}
    </Link>
  )
}
