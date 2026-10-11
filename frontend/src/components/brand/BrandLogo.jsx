import PATHS from './brand-paths.js'

/** Brand names as the catalogue stores them, mapped to an icon. */
const BY_BRAND = {
  apple: 'apple',
  samsung: 'samsung',
  google: 'google',
  pixel: 'google',
  xiaomi: 'xiaomi',
  redmi: 'xiaomi',
  poco: 'xiaomi',
  oppo: 'oppo',
  vivo: 'vivo',
  oneplus: 'oneplus',
}

/**
 * Wordmark-shaped logos only fill a thin band of the 24px square, so they get a
 * cropped frame and a wide box; otherwise they would read as half the size of
 * the Apple or Xiaomi marks beside them.
 */
const WIDE = {
  samsung: '0 9.6 24 4.8',
  oppo: '0 8.8 24 6.4',
}

/** A peso sign in the same 24px box, for budget tiles that have no brand. */
const PESO = 'M6 3h7a6 6 0 0 1 0 12H9v6H6V3zm3 3v6h4a3 3 0 0 0 0-6H9zM3 7.5h18v1.6H3zM3 10.4h18V12H3z'

/**
 * A brand's one-colour mark, sized by `className` and coloured by the text
 * colour. `brand={null}` draws the peso sign. An unknown brand renders nothing,
 * so a new brand in the catalogue never shows a wrong logo.
 */
export function BrandLogo({ brand, className = 'size-10', wideClassName = 'h-7 w-28' }) {
  const key = brand == null ? null : BY_BRAND[String(brand).toLowerCase()]
  const path = brand == null ? PESO : PATHS[key]
  if (!path) return null
  const wide = WIDE[key]

  return (
    <svg
      viewBox={wide ?? '0 0 24 24'}
      className={wide ? wideClassName : className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  )
}
