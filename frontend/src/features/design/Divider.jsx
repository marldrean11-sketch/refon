/**
 * A hairline vertical divider used to separate zones inside a horizontal bar.
 *
 * `role="separator"` with `aria-orientation` is what makes it a divider to a
 * screen reader rather than an unlabelled empty element, and `aria-hidden` is
 * deliberately *not* used: it is a structural landmark in the bar, and hiding it
 * would leave the zones unannounced.
 */
export function Divider({ orientation = 'vertical', className = '' }) {
  return (
    <span
      role="separator"
      aria-orientation={orientation}
      className={
        orientation === 'vertical'
          ? `mx-1 hidden h-5 w-px shrink-0 bg-line-2 sm:block ${className}`
          : `my-1 h-px w-full shrink-0 bg-line ${className}`
      }
    />
  )
}