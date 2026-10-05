import { Star } from 'lucide-react'

/**
 * Star-rating distribution.
 *
 * Every band from five stars down to one is rendered, including the empty ones.
 * Hiding zero bands would make a single five-star review look like a spread and
 * misrepresent the volume; the `count` beside each bar is what tells the buyer
 * how much of the rating is actually based on real feedback.
 *
 * The bars are decorative — the counts are the content — so each bar is hidden
 * from assistive technology and the whole block carries one summary label.
 */
export function RatingBreakdown({ breakdown = [], total = 0, className = '' }) {
  if (breakdown.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <ul className="space-y-1.5">
        {breakdown.map((row) => {
          const share = total > 0 ? Math.round((row.count / total) * 100) : 0

          return (
            <li key={row.stars} className="flex items-center gap-2.5 text-xs">
              <span className="inline-flex w-11 shrink-0 items-center gap-0.5 font-semibold text-muted">
                {row.stars}
                <Star className="size-3 fill-current text-warning" aria-hidden="true" />
              </span>
              <span
                className="h-2 flex-1 overflow-hidden rounded-pill bg-slate-100"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-pill bg-warning"
                  style={{ width: `${share}%` }}
                />
              </span>
              <span className="w-6 shrink-0 text-right font-semibold text-muted">
                {row.count}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="sr-only">
        Rating distribution across {total} published{' '}
        {total === 1 ? 'review' : 'reviews'}.
      </p>
    </div>
  )
}