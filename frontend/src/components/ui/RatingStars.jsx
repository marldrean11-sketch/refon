import { Star } from 'lucide-react'

const sizeClasses = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
}

function StarRow({ value, size }) {
  const rounded = Math.round(value * 2) / 2

  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((position) => {
        const filled = rounded >= position
        const half = !filled && rounded >= position - 0.5

        return (
          <span key={position} className="relative inline-block">
            <Star className={`${sizeClasses[size]} text-slate-300`} fill="currentColor" />
            {(filled || half) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: half ? '50%' : '100%' }}
              >
                <Star
                  className={`${sizeClasses[size]} text-warning`}
                  fill="currentColor"
                  strokeWidth={1.5}
                />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

/**
 * Accessible star rating. The visual row is decorative; screen readers get the
 * numeric value and the review count instead of five separate icons.
 */
export function RatingStars({
  value,
  count,
  size = 'md',
  showValue = true,
  className = '',
}) {
  const rating = Number(value)

  if (!Number.isFinite(rating) || rating <= 0) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-muted ${className}`}>
        <StarRow value={0} size={size} />
        <span>No reviews yet</span>
      </span>
    )
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      <StarRow value={rating} size={size} />
      {showValue && (
        <span className="text-xs font-bold text-ink">{rating.toFixed(1)}</span>
      )}
      {count !== undefined && count !== null && (
        <span className="text-xs text-muted">
          ({Number(count).toLocaleString('en-PH')} {Number(count) === 1 ? 'review' : 'reviews'})
        </span>
      )}
      <span className="sr-only">
        Rated {rating.toFixed(1)} out of 5{count != null ? ` from ${count} reviews` : ''}
      </span>
    </span>
  )
}
