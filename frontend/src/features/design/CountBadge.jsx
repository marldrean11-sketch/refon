/**
 * The count chip used by every navigation surface.
 *
 * Two headers carried two near-identical copies of this, and the cart badge was
 * navy in one and emerald in the other. One component now, so a count always
 * looks the same wherever it appears.
 *
 * Square, because a count is a reading rather than a notification dot. The
 * visible number is capped at `99+` so a badge can never widen a nav item and
 * push the header into overflow, and the real number is always available to a
 * screen reader through the `srLabel` text — the visible glyph alone would
 * otherwise read as a bare, meaningless digit.
 */
export function CountBadge({ count, tone = 'primary', srLabel }) {
  if (!count || count < 1) {
    return null
  }

  const toneClasses =
    tone === 'accent'
      ? 'bg-accent-600 text-white'
      : tone === 'flare'
        ? 'bg-flare-500 text-white'
        : 'bg-primary-950 text-white'

  return (
    <span
      className={`inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-[3px] px-1 py-px font-mono text-[10px] font-semibold leading-4 tabular-nums ${toneClasses}`}
    >
      {count > 99 ? '99+' : count}
      {srLabel && <span className="sr-only"> {srLabel}</span>}
    </span>
  )
}