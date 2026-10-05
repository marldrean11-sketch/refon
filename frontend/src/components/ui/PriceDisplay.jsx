import { formatPeso } from '../../lib/format.js'

/**
 * Price block with the reference price and savings, which is the core
 * affordability message. Discounts are only rendered when the reference price is
 * genuinely higher — no invented urgency, no fake strikethroughs.
 */
export function PriceDisplay({
  price,
  originalPrice,
  size = 'md',
  showSavings = true,
  className = '',
}) {
  const current = Number(price)
  const reference = Number(originalPrice)
  const hasDiscount =
    Number.isFinite(reference) && Number.isFinite(current) && reference > current && reference > 0
  const savings = hasDiscount ? reference - current : 0
  const percentOff = hasDiscount ? Math.round((savings / reference) * 100) : 0

  const priceSize =
    size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-lg' : 'text-2xl'

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className={`font-display font-bold tracking-tight text-ink ${priceSize}`}>
          {formatPeso(current)}
        </p>
        {hasDiscount && (
          <p className="text-sm font-medium text-muted line-through decoration-slate-400">
            {formatPeso(reference)}
          </p>
        )}
        {hasDiscount && (
          <span className="rounded-pill bg-accent-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
            Save {percentOff}%
          </span>
        )}
      </div>
      {hasDiscount && showSavings && (
        <p className="mt-1.5 text-xs font-semibold text-accent-700">
          You save {formatPeso(savings)} versus a brand-new unit
        </p>
      )}
    </div>
  )
}

/** Compact inline price for cart lines, order rows, and tables. */
export function PriceInline({ value, className = '', muted = false }) {
  return (
    <span className={`font-display font-bold tracking-tight ${muted ? 'text-muted' : 'text-ink'} ${className}`}>
      {formatPeso(value)}
    </span>
  )
}
