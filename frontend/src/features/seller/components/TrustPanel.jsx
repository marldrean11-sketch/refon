import { CalendarDays, MessageSquareOff, ShieldCheck, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RatingBreakdown } from '../../../components/ui/RatingBreakdown.jsx'
import { RatingStars } from '../../../components/ui/RatingStars.jsx'
import { Skeleton } from '../../../components/ui/Skeleton.jsx'
import { Panel, PanelHeader } from '../../design/Surfaces.jsx'
import { formatDate } from '../../../lib/format.js'
import { productPath } from '../../../lib/routes.js'

/** Skeleton for the trust panel. Shaped like the real rows so nothing shifts. */
export function TrustPanelSkeleton() {
  return (
    <Panel aria-busy="true">
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2.5 h-5 w-48" />
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex gap-6">
          <Skeleton className="w-40" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-4/5" />
          </div>
        </div>
        {[0, 1].map((row) => (
          <div key={row} className="space-y-2">
            <Skeleton className="h-2.5 w-32" />
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-2/3" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading seller reviews…</span>
    </Panel>
  )
}

/**
 * The seller's trust history.
 *
 * Two jobs, and they are deliberately not merged. The figure is the claim —
 * average rating, review count, distribution — and the reviews are the evidence.
 * A shopper who only wants the number reads the first; a shopper who wants to
 * know whether the number is honest reads the second.
 *
 * The summary average comes from the API's `summary`, which counts every
 * published review rather than the ones currently on screen. That distinction is
 * the whole point of the panel: a "Load more" press must not change the rating.
 *
 * Empty is stated plainly. A seller with no reviews is not described by a 0.0
 * score, and nothing is invented to fill the panel.
 */
export function TrustPanel({ reviews, summary, isLoading, isLoadingMore, hasMore, onLoadMore }) {
  const count = summary?.count ?? 0
  const average = summary?.average ?? null

  return (
    <Panel>
      <PanelHeader
        kicker="Trust history"
        title="Buyer feedback on this seller"
        description={
          count > 0
            ? `${count.toLocaleString('en-PH')} published ${count === 1 ? 'review' : 'reviews'} across this seller's listings.`
            : undefined
        }
      />

      {/* The claim. Large and unambiguous, or omitted entirely. */}
      <div className="flex flex-col gap-6 border-b border-line p-5 sm:flex-row sm:items-center sm:gap-10 sm:p-6">
        <div className="shrink-0">
          {average != null ? (
            <>
              <p className="font-display text-5xl font-bold tabular-nums leading-none tracking-tight text-ink">
                {average.toFixed(1)}
              </p>
              <div className="mt-2">
                <RatingStars value={average} size="sm" showValue={false} />
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted">
                out of 5 · {count.toLocaleString('en-PH')}{' '}
                {count === 1 ? 'review' : 'reviews'}
              </p>
            </>
          ) : (
            <div>
              <p className="font-display text-3xl font-bold leading-none tracking-tight text-subtle">
                —
              </p>
              <p className="mt-2 font-mono text-[11px] text-muted">No rating yet</p>
            </div>
          )}
        </div>

        {/* The evidence behind the figure. Every band is rendered, including the
            empty ones, so one five-star review cannot look like a spread. */}
        {count > 0 && <RatingBreakdown breakdown={summary?.breakdown} total={count} className="w-full max-w-xs" />}
      </div>

      {isLoading ? (
        <div className="space-y-6 p-5 sm:p-6" aria-hidden="true">
          {[0, 1].map((row) => (
            <div key={row} className="space-y-2">
              <Skeleton className="h-2.5 w-40" />
              <Skeleton className="h-2.5 w-full" />
              <Skeleton className="h-2.5 w-2/3" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span
            className="grid size-12 place-items-center rounded-control bg-surface-2 text-subtle"
            aria-hidden="true"
          >
            <MessageSquareOff className="size-5" strokeWidth={1.8} />
          </span>
          <p className="mt-5 font-display text-lg font-bold tracking-tight text-ink">
            No buyer reviews yet
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            ReFon has not delivered a customer order yet, so there is no genuine
            buyer feedback to show for this seller. Their verification is complete
            and every listing is moderated.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {reviews.map((review) => (
              <li key={review.id} className="px-5 py-6 sm:px-6">
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
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" aria-hidden="true" />
                          {formatDate(review.createdAt)}
                        </span>
                      </p>
                    </div>

                    {/* Driven purely by the stored flag. Never inferred from the
                        rating or the wording of the comment. */}
                    {review.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-accent-50 px-2 py-0.5 font-bold text-accent-800 ring-1 ring-inset ring-accent-200">
                        <ShieldCheck className="size-3" aria-hidden="true" />
                        Verified purchase
                      </span>
                    )}
                  </div>

                  {review.title && (
                    <h3 className="mt-4 font-display text-base font-bold text-ink">
                      {review.title}
                    </h3>
                  )}
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{review.comment}</p>

                  {/* Which device the review was about, so a shopper can connect a
                      complaint to a listing rather than to a name. */}
                  {review.listing && (
                    <Link
                      to={productPath({ slug: review.listing.slug, id: review.listing.id })}
                      className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary-800 transition hover:text-primary-950"
                    >
                      <Smartphone className="size-3.5 shrink-0" aria-hidden="true" />
                      {review.listing.name}
                    </Link>
                  )}

                  {(review.conditionRating || review.sellerRating) && (
                    <dl className="mt-4 flex flex-wrap gap-6">
                      {review.conditionRating && (
                        <div>
                          <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
                            Matched its grade
                          </dt>
                          <dd className="mt-1 font-display text-sm font-bold tabular-nums text-ink">
                            {review.conditionRating} / 5
                          </dd>
                        </div>
                      )}
                      {review.sellerRating && (
                        <div>
                          <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
                            This seller
                          </dt>
                          <dd className="mt-1 font-display text-sm font-bold tabular-nums text-ink">
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

          {/* More reviews is a real action with a real end, so the control only
              appears while there is genuinely more to load. */}
          {hasMore && (
            <div className="border-t border-line p-5 text-center sm:p-6">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line-2 bg-surface px-6 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary-900 transition hover:border-primary-950 hover:bg-primary-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMore ? 'Loading…' : 'Load more reviews'}
              </button>
              <p className="mt-3 font-mono text-[11px] text-subtle">
                Showing {reviews.length} of {count}
              </p>
            </div>
          )}
        </>
      )}

      <p className="flex gap-2 border-t border-line px-5 py-4 text-xs leading-relaxed text-muted sm:px-6">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-600" aria-hidden="true" />
        <span>
          Reviews shown are seeded sample data for this prototype. A
          &ldquo;Verified purchase&rdquo; label means the record was seeded that way,
          not that a real buyer has received a device. Buyer reviews open once
          orders are delivered.
        </span>
      </p>
    </Panel>
  )
}