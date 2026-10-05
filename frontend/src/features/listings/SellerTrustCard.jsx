import { BadgeCheck, Clock3, MapPin, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RatingStars } from '../../components/ui/RatingStars.jsx'
import { sellerPath } from '../../lib/routes.js'

function initialsFor(name) {
  return String(name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

/**
 * Who is selling this phone.
 *
 * Every figure here is read from the listing's public seller payload, and the
 * row that would need a value the API does not return is omitted instead of
 * showing a zero or a dash. That matters most for the rating: a seller with no
 * reviews yet has `ratingAverage: null`, which is displayed as "No reviews yet"
 * rather than as a 0.0 score that reads like bad feedback.
 *
 * Seller contact details are never part of the public payload, so nothing here
 * can leak a phone number or email.
 */
export function SellerTrustCard({ listing, actionSlot }) {
  const seller = listing.seller ?? {}
  const isVerified = seller.verificationStatus === 'APPROVED'
  const ratingCount = Number(seller.ratingCount ?? 0)
  const ratingAverage = seller.ratingAverage
  const completedSales = Number(seller.completedSales ?? 0)
  const location = [seller.city, seller.region].filter(Boolean).join(', ')

  return (
    <div className="rounded-card border border-line bg-white p-6 shadow-card">
      <div className="flex items-center gap-4">
        <span
          className={`grid size-14 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold text-white shadow-card ${
            isVerified ? 'bg-primary-500' : 'bg-slate-400'
          }`}
          aria-hidden="true"
        >
          {initialsFor(listing.sellerName)}
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-lg font-semibold text-ink">
              {listing.sellerName}
            </h3>
            {isVerified && (
              <BadgeCheck
                className="size-5 shrink-0 text-accent-600"
                aria-label="Verified seller"
              />
            )}
          </div>

          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Store className="size-3.5" aria-hidden="true" />
            {isVerified ? 'Verified marketplace seller' : 'Verification in progress'}
          </p>
        </div>
      </div>

      {seller.tagline && (
        <p className="mt-4 text-sm leading-relaxed text-ink">{seller.tagline}</p>
      )}

      {/* Rating row. Rendered only when the seller actually has reviews, so a
          new seller is described by their verification status rather than by a
          missing number. */}
      <div className="mt-5 rounded-2xl bg-canvas p-4">
        {ratingCount > 0 && ratingAverage != null ? (
          <>
            <RatingStars value={ratingAverage} count={ratingCount} size="sm" />
            <p className="mt-1.5 text-xs text-muted">
              {ratingAverage.toFixed(1)} average from {ratingCount.toLocaleString('en-PH')}{' '}
              {ratingCount === 1 ? 'review' : 'reviews'}
            </p>
          </>
        ) : (
          <p className="text-xs font-semibold text-muted">
            No seller reviews yet. Verification is complete, so the listing has still been
            moderated.
          </p>
        )}
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {completedSales > 0 && (
          <div className="rounded-2xl bg-canvas p-3">
            <dt className="text-xs text-muted">Completed sales</dt>
            <dd className="mt-1 font-semibold text-ink">
              {completedSales.toLocaleString('en-PH')}
            </dd>
          </div>
        )}
        {location && (
          <div className="rounded-2xl bg-canvas p-3">
            <dt className="inline-flex items-center gap-1 text-xs text-muted">
              <MapPin className="size-3.5" aria-hidden="true" />
              Based in
            </dt>
            <dd className="mt-1 font-semibold text-ink">{location}</dd>
          </div>
        )}
        {seller.memberSince && (
          <div className="rounded-2xl bg-canvas p-3">
            <dt className="text-xs text-muted">On ReFon since</dt>
            <dd className="mt-1 font-semibold text-ink">{seller.memberSince}</dd>
          </div>
        )}
        <div className="rounded-2xl bg-canvas p-3">
          <dt className="text-xs text-muted">Contact</dt>
          <dd className="mt-1 text-xs font-semibold leading-relaxed text-ink">
            Only after you send an inquiry
          </dd>
        </div>
      </dl>

      {seller.responseTime && (
        <p className="mt-4 flex gap-2 text-xs leading-relaxed text-muted">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden="true" />
          {seller.responseTime}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          to={sellerPath(seller.id)}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-line bg-white px-4 text-sm font-bold text-primary-700 transition hover:border-primary-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          View seller storefront
          <span className="sr-only"> for {listing.sellerName}</span>
        </Link>
        {actionSlot}
      </div>
    </div>
  )
}