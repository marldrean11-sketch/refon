import { useState } from 'react'

/** The storefront colour presets. Keys match the API's `brandColor` values. */
export const BRAND_COLORS = Object.freeze({
  lime: { label: 'Lime', hex: '#c6ff3d', ink: '#0a0b0d' },
  sky: { label: 'Sky', hex: '#5cc8ff', ink: '#0a0b0d' },
  violet: { label: 'Violet', hex: '#a78bfa', ink: '#0a0b0d' },
  coral: { label: 'Coral', hex: '#ff7a6b', ink: '#0a0b0d' },
  amber: { label: 'Amber', hex: '#ffc247', ink: '#0a0b0d' },
  mint: { label: 'Mint', hex: '#4ee6b0', ink: '#0a0b0d' },
})

export function brandColorFor(seller) {
  return BRAND_COLORS[seller?.brandColor] ?? BRAND_COLORS.lime
}

/** First two letters of the store name, for the monogram. */
export function monogramFor(name) {
  const parts = String(name ?? '')
    .split(' ')
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

/**
 * The store's logo, or its monogram on the store's colour when there is no
 * logo (or the logo fails to load).
 */
export function SellerAvatar({ seller, name, className = 'size-12 text-base' }) {
  const [failed, setFailed] = useState(null)
  const color = brandColorFor(seller)
  const logo = seller?.logoUrl

  if (logo && failed !== logo) {
    return (
      <img
        src={logo}
        alt=""
        onError={() => setFailed(logo)}
        className={`shrink-0 rounded-control bg-white object-cover ${className}`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-control font-display font-bold ${className}`}
      style={{ backgroundColor: color.hex, color: color.ink }}
    >
      {monogramFor(name ?? seller?.businessName)}
    </span>
  )
}
