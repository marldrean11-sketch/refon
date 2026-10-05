import { CalendarDays, FlaskConical, MessageSquareOff, ShieldCheck } from 'lucide-react'
import { RatingBreakdown } from '../../components/ui/RatingBreakdown.jsx'
import { RatingStars } from '../../components/ui/RatingStars.jsx'
import { formatDate } from '../../lib/format.js'

/**
 * Published reviews for a listing.
 *
 * Read-only, and honest about being empty: a listing with no published reviews
 * says so instead of showing a 0.0 average or a placeholder quote. Nothing here
 * offers a way to write a review, because a verified purchase cannot be claimed
 * until an order has been delivered.
 *
 * The "Verified purchase" badge is driven purely by the stored flag on each
 * record. It is never inferred from the rating or the wording of the comment, so
 * a positive review cannot accidentally read as a confirmed delivery.
 */
export function ProductReviews({ reviews, summary, isLoading, error }) {
  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-labelledby="reviews-heading"
        className="rounded-card border border-line bg-white p-6 shadow-card sm:p-7"
      >
        <h2
          id="reviews-heading"
          className="font-display text-2xl font-semibold tracking-tight text-ink"
        >
          Owner reviews
        </h2>
        <div className="mt-6 space-y-4" aria-hidden="true">
          {[0, 1].map((row) => (
            <div key={row} className="space-y-2">
              <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <span className="sr-only">Loading reviews…</span>
      </section>
    )
  }

  if (error) {
    return (
      <section
        role="status"
        aria-labelledby="reviews-heading"
        className="rounded-card border border-amber-200 bg-amber-50 p-6 sm:p-7"
      >
        <h2
          id="reviews-heading"
          className="font-display text-lg font-semibold text-amber-950"
        >
          Reviews are taking a moment to load
        </h2>
        <p className="mt-2 text-sm text-amber-900">
          Everything else on this page — grade, battery health, inspection results,
          and warranty — comes straight from the listing.
        </p>
      </section>
    )
  }

  const count = summary?.count ?? 0

  return (
    <section aria-labelledby="reviews-heading">
      <div className="rounded-card border border-line bg-white p-6 shadow-card sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
              Owner feedback
            </p>
            <h2
              id="reviews-heading"
              className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink"
            >
              Reviews
            </h2>
          </div>

          {summary?.average != null && (
            <div className="text-right">
              <p className="font-display text-4xl font-bold tracking-tight text-ink">
                {summary.average.toFixed(1)}
              </p>
              <RatingStars
                value={summary.average}
                count={count}
                size="sm"
                showValue={false}
              />
              <p className="mt-1 text-xs text-muted">
                {count.toLocaleString('en-PH')} published{' '}
                {count === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          )}
        </div>

        {count === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-canvas px-6 py-10 text-center">
            <MessageSquareOff className="size-7 text-muted" aria-hidden="true" />
            <div>
              <p className="font-display text-lg font-semibold text-ink">No reviews yet</p>
              <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted">
                ReFon is a working prototype with no delivered orders yet, so there is no
                genuine buyer feedback to show here. Nothing is invented to fill the gap.
              </p>
            </div>
          </div>
        ) : (
          <>
            <RatingBreakdown
              breakdown={summary?.breakdown}
              total={count}
              className="mt-6 max-w-xs"
            />

            <ul className="mt-7 divide-y divide-line border-t border-line">
              {reviews.map((review) => (
                <li key={review.id} className="py-6 first:pt-0 last:pb-0">
                  <article aria-label={`Review by ${review.author}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 font-display text-sm font-bold text-primary-700"
                        aria-hidden="true"
                      >
                        {review.author}
                      </span>
                      <div className="min-w-0">
                        <RatingStars value={review.rating} size="sm" showValue={false} />
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                          <span className="font-semibold text-ink">{review.author}</span>
                          {review.verifiedPurchase && (
                            <span className="inline-flex items-center gap-1 rounded-pill bg-accent-50 px-2 py-0.5 font-bold text-accent-800 ring-1 ring-inset ring-accent-200">
                              <ShieldCheck className="size-3" aria-hidden="true" />
                              Verified purchase
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3.5" aria-hidden="true" />
                            {formatDate(review.createdAt)}
                          </span>
                        </p>
                      </div>
                    </div>

                    {review.title && (
                      <h3 className="mt-4 font-display text-base font-semibold text-ink">
                        {review.title}
                      </h3>
                    )}
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{review.comment}</p>

                    {/* The extra scores a reviewer can give are shown only when
                        they were actually recorded. */}
                    {(review.conditionRating || review.sellerRating) && (
                      <dl className="mt-4 flex flex-wrap gap-4">
                        {review.conditionRating && (
                          <div>
                            <dt className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
                              <FlaskConical className="size-3.5" aria-hidden="true" />
                              Matches its grade
                            </dt>
                            <dd className="mt-0.5 text-sm font-bold text-ink">
                              {review.conditionRating} / 5
                            </dd>
                          </div>
                        )}
                        {review.sellerRating && (
                          <div>
                            <dt className="text-xs font-semibold text-muted">Seller</dt>
                            <dd className="mt-0.5 text-sm font-bold text-ink">
                              {review.sellerRating} / 5
                            </dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-7 flex gap-2 border-t border-line pt-5 text-xs leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden="true" />
          <span>
            Reviews shown are sample data seeded for this prototype. ReFon has not yet
            delivered a customer order, so a "Verified purchase" label here means the record
            was seeded that way — not that a real buyer has received this phone. Buyer
            reviews open once orders are delivered.
          </span>
        </p>
      </div>
    </section>
  )
}