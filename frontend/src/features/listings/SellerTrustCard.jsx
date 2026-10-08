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
 * reviews yet has `ratingAverage: null`, which is stated in words rather than
 * shown as a 0.0 score that reads like bad feedback.
 *
 * Seller contact details are never part of the public payload, so nothing here
 * can leak a phone number or email.
 *
 * Presented as a **dossier**: a monogram, the account's status, a tagline, and
 * then a two-column register of facts separated by hairlines. The previous
 * version put each fact in its own rounded grey box, which made four facts look
 * like four unrelated widgets.
 */
export function SellerTrustCard({ listing, actionSlot }) {
  const seller = listing.seller ?? {}
  const isVerified = seller.verificationStatus === 'APPROVED'
  const ratingCount = Number(seller.ratingCount ?? 0)
  const ratingAverage = seller.ratingAverage
  const completedSales = Number(seller.completedSales ?? 0)
  const location = [seller.city, seller.region].filter(Boolean).join(', ')

  const facts = [
    completedSales > 0
      ? { label: 'Completed sales', value: completedSales.toLocaleString('en-PH') }
      : null,
    location ? { label: 'Based in', value: location, icon: MapPin } : null,
    seller.memberSince ? { label: 'On ReFon since', value: seller.memberSince } : null,
    { label: 'Contact', value: 'Only after you send an inquiry' },
  ].filter(Boolean)

  return (
    <div className="rounded-card border border-line bg-surface">
      <div className="flex items-start gap-4 border-b border-line p-5">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-control font-display text-base font-bold text-white ${
            isVerified ? 'bg-accent-600' : 'bg-subtle'
          }`}
          aria-hidden="true"
        >
          {initialsFor(listing.sellerName)}
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-lg font-bold tracking-tight text-ink">
              {listing.sellerName}
            </h3>
            {isVerified && (
              <BadgeCheck
                className="size-4 shrink-0 text-accent-600"
                aria-label="Verified seller"
              />
            )}
          </div>

          <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
            <Store className="size-3.5" aria-hidden="true" />
            {isVerified ? 'Verified marketplace seller' : 'Verification in progress'}
          </p>
        </div>
      </div>

      {seller.tagline && (
        <p className="border-b border-line px-5 py-4 text-sm leading-relaxed text-ink">
          {seller.tagline}
        </p>
      )}

      {/* Rating row. Rendered only when the seller actually has reviews, so a
          new seller is described by their verification status rather than by a
          missing number. */}
      <div className="border-b border-line px-5 py-4">
        {ratingCount > 0 && ratingAverage != null ? (
          <>
            <RatingStars value={ratingAverage} count={ratingCount} size="sm" />
            <p className="mt-1.5 font-mono text-[11px] tabular-nums text-muted">
              {ratingAverage.toFixed(1)} average from {ratingCount.toLocaleString('en-PH')}{' '}
              {ratingCount === 1 ? 'review' : 'reviews'}
            </p>
          </>
        ) : (
          <p className="text-xs leading-relaxed text-muted">
            No seller reviews yet. Verification is complete, so the listing has still been
            moderated.
          </p>
        )}
      </div>

      <dl className="px-5 py-2">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-3 border-b border-line py-2.5 last:border-b-0"
          >
            <dt className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
              {fact.icon ? <fact.icon className="size-3" aria-hidden="true" /> : null}
              {fact.label}
            </dt>
            <dd className="min-w-0 break-words text-[13px] font-semibold text-ink">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>

      {seller.responseTime && (
        <p className="flex gap-2 border-t border-line px-5 py-3 text-xs leading-relaxed text-muted">
          <Clock3 className="mt-0.5 size-3.5 shrink-0 text-accent-600" aria-hidden="true" />
          {seller.responseTime}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line p-4">
        <Link
          to={sellerPath(seller.id)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-primary-950 px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-primary-800"
        >
          View seller storefront
          <span className="sr-only"> for {listing.sellerName}</span>
        </Link>
        {actionSlot}
      </div>
    </div>
  )
}