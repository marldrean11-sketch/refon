import { ShieldCheck, Undo2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { RETURN_WINDOW_DAYS } from '../../content/policy-content.js'

export function formatWarrantyLabel(months) {
  const value = Number(months)

  if (!Number.isFinite(value) || value <= 0) {
    return null
  }

  if (value >= 12) {
    const years = value / 12
    return `${Number.isInteger(years) ? years : years.toFixed(1)}-Year Warranty`
  }

  return `${Math.round(value)}-Month Warranty`
}

/**
 * Coverage chips.
 *
 * Coverage is the reason a buyer trusts a refurb marketplace more than a
 * classifieds site, so it is stated in words rather than left to an icon's
 * accessible name. Square-cornered, hairline, monospace — the same instrument
 * label treatment as every other measurement on a listing.
 */
export function WarrantyBadge({ months, size = 'md', linkToPolicy = false, className = '' }) {
  const label = formatWarrantyLabel(months)

  if (!label) {
    return null
  }

  const padding = size === 'lg' ? 'px-3 py-2 text-xs' : 'px-2 py-1 text-[11px]'
  const classes = `inline-flex items-center gap-1.5 rounded-sm font-mono font-semibold uppercase tracking-[0.08em] ${padding} ring-1 ring-inset`
  // Quiet by design. Coverage is one of four trust signals on a card, so it is
  // drawn as an outline rather than a filled block; a filled jade chip next to a
  // filled jade grade chip would make two of them look like the primary action.
  const tone = 'bg-surface-2 text-accent-800 ring-accent-300'

  if (!linkToPolicy) {
    return (
      <span className={`${classes} ${tone} ${className}`}>
        <ShieldCheck className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
        {label}
      </span>
    )
  }

  return (
    <Link
      to={MARKETPLACE_ROUTES.warranty}
      className={`${classes} ${tone} transition hover:bg-accent-100 ${className}`}
    >
      <ShieldCheck className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
      {label}
      <span className="sr-only"> — view the warranty policy</span>
    </Link>
  )
}

export function ReturnPolicyBadge({ days = RETURN_WINDOW_DAYS, size = 'md', className = '' }) {
  const padding = size === 'lg' ? 'px-3 py-2 text-xs' : 'px-2 py-1 text-[11px]'

  return (
    <Link
      to={MARKETPLACE_ROUTES.returns}
      className={`inline-flex items-center gap-1.5 rounded-sm font-mono font-semibold uppercase tracking-[0.08em] ${padding} bg-primary-950 text-white ring-1 ring-inset ring-primary-950 transition hover:bg-primary-800 ${className}`}
    >
      <Undo2 className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
      {days}-Day Returns
      <span className="sr-only"> — view the return policy</span>
    </Link>
  )
}