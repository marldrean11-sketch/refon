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

/** Warranty chip. Links to the policy so coverage is never a dead end. */
export function WarrantyBadge({ months, size = 'md', linkToPolicy = false, className = '' }) {
  const label = formatWarrantyLabel(months)

  if (!label) {
    return null
  }

  const padding = size === 'lg' ? 'px-3.5 py-2 text-sm' : 'px-2.5 py-1 text-[11px]'
  const classes = `inline-flex items-center gap-1.5 rounded-pill bg-primary-50 font-bold uppercase tracking-[0.08em] text-primary-800 ring-1 ring-inset ring-primary-200 ${padding} ${className}`

  if (!linkToPolicy) {
    return (
      <span className={classes}>
        <ShieldCheck className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
        {label}
      </span>
    )
  }

  return (
    <Link
      to={MARKETPLACE_ROUTES.warranty}
      className={`${classes} transition hover:bg-primary-100`}
    >
      <ShieldCheck className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
      {label}
      <span className="sr-only"> — view the warranty policy</span>
    </Link>
  )
}

export function ReturnPolicyBadge({ days = RETURN_WINDOW_DAYS, size = 'md', className = '' }) {
  const padding = size === 'lg' ? 'px-3.5 py-2 text-sm' : 'px-2.5 py-1 text-[11px]'

  return (
    <Link
      to={MARKETPLACE_ROUTES.returns}
      className={`inline-flex items-center gap-1.5 rounded-pill bg-accent-50 font-bold uppercase tracking-[0.08em] text-accent-800 ring-1 ring-inset ring-accent-200 ${padding} transition hover:bg-accent-100 ${className}`}
    >
      <Undo2 className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
      {days}-Day Return Guarantee
      <span className="sr-only"> — view the return policy</span>
    </Link>
  )
}
