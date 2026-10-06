import { formatPeso } from '../../lib/format.js'

/**
 * Price block.
 *
 * Price is the loudest number in a marketplace, so it is set in the display face
 * at display weight with tabular figures, and the reference price is struck
 * through in a muted tone with the saving stated in words beneath it.
 *
 * The peso amount stays a single text node on purpose: several assertions read
 * the selling price straight out of the card, and splitting the currency symbol
 * into its own element is exactly the kind of cosmetic improvement that makes a
 * price silently unparseable. The visual work is done by weight, size, and
 * tabular alignment instead.
 *
 * Discounts are only rendered when the reference price is genuinely higher. No
 * invented urgency, no fake strikethroughs: the solar "save" chip appears here
 * because this is the one place on the page where money is the subject.
 */
export function PriceDisplay({
  price,
  originalPrice,
  discountPercent,
  size = 'md',
  showSavings = true,
  className = '',
}) {
  const current = Number(price)
  const reference = Number(originalPrice)
  const hasDiscount =
    Number.isFinite(reference) && Number.isFinite(current) && reference > current && reference > 0
  const savings = hasDiscount ? reference - current : 0
  // Prefer the percentage the API calculated and the catalog sorted by, so the
  // figure on the card is the same one that determined its position in
  // "Biggest discount". Falls back to deriving it when a caller has no API value.
  const derivedPercent = hasDiscount ? Math.round((savings / reference) * 100) : 0
  const percentOff =
    hasDiscount && Number.isInteger(discountPercent) && discountPercent > 0
      ? discountPercent
      : derivedPercent

  const priceSize =
    size === 'lg'
      ? 'text-[2.5rem] leading-none sm:text-5xl'
      : size === 'sm'
        ? 'text-xl leading-none'
        : 'text-2xl leading-none'

  // On a card the saving moves onto its own line beneath the price. Three
  // numbers will not sit on one row at card width, and a chip that wraps onto a
  // line of its own reads as a separate element rather than as part of the price.
  const inlineChip = size !== 'sm'

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <p className={`font-display font-bold tabular-nums tracking-tight text-ink ${priceSize}`}>
          {formatPeso(current)}
        </p>
        {hasDiscount && (
          <p className="font-mono text-sm font-medium tabular-nums text-subtle line-through decoration-subtle/60">
            {formatPeso(reference)}
          </p>
        )}
        {hasDiscount && inlineChip && (
          <span className="rounded-sm bg-flare-500 px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-white">
            Save {percentOff}%
          </span>
        )}
      </div>
      {hasDiscount && showSavings && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs font-semibold text-flare-700">
          {!inlineChip && (
            <span className="rounded-sm bg-flare-500 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-white">
              Save {percentOff}%
            </span>
          )}
          <span>
            You save {formatPeso(savings)}
            {size === 'sm' ? '' : ' versus a brand-new unit'}
          </span>
        </p>
      )}
    </div>
  )
}

/** Compact inline price for cart lines, order rows, and tables. */
export function PriceInline({ value, className = '', muted = false }) {
  return (
    <span
      className={`font-display font-bold tabular-nums tracking-tight ${
        muted ? 'text-muted' : 'text-ink'
      } ${className}`}
    >
      {formatPeso(value)}
    </span>
  )
}