import { useEffect, useState } from 'react'
import { BadgeCheck, Clock3, MapPin, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RatingStars } from '../../../components/ui/RatingStars.jsx'
import { Skeleton } from '../../../components/ui/Skeleton.jsx'
import { Container } from '../../design/Container.jsx'
import { PageHeader } from '../../design/PageHeader.jsx'
import { MetricStrip } from '../../design/Surfaces.jsx'
import { Breadcrumb } from '../../../components/ui/Breadcrumb.jsx'
import { formatNumber } from '../../../lib/format.js'
import { MARKETPLACE_ROUTES } from '../../../lib/routes.js'
import { BANNER_LOGO, SellerAvatar, brandColorFor } from '../brand.jsx'
import { getFollowStateRequest } from '../storefront-api.js'
import { FollowStoreButton } from './FollowStoreButton.jsx'

/** The store's Follow button, loading whether this shopper already follows it. */
function StoreFollowControl({ sellerId }) {
  const [state, setState] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getFollowStateRequest(sellerId, controller.signal)
      .then(setState)
      .catch(() => {})
    return () => controller.abort()
  }, [sellerId])

  if (!state) return null
  return (
    <FollowStoreButton
      sellerId={sellerId}
      following={state.following}
      followerCount={state.followerCount}
      onChange={setState}
    />
  )
}

/** The header skeleton. Mirrors the real header so nothing jumps on load. */
export function StorefrontHeaderSkeleton() {
  return (
    <div className="border-b border-line bg-surface" aria-busy="true">
      <Container className="py-10 sm:py-14">
        <Skeleton className="h-3 w-40" />
        <div className="mt-6 flex items-start gap-5">
          <Skeleton className="size-16 shrink-0" rounded="rounded-control" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-8 w-3/4 max-w-md" />
            <Skeleton className="mt-3 h-3 w-2/5 max-w-xs" />
            <Skeleton className="mt-5 h-3 w-full max-w-lg" />
          </div>
        </div>
      </Container>
      <span className="sr-only">Loading seller storefront…</span>
    </div>
  )
}

/**
 * The storefront masthead.
 *
 * Answers the four questions a shopper has before they look at a single phone:
 * who is this, are they real, how long have they been here, and what is their
 * reputation. Those are the header's whole job, so they are the header's only
 * content — the figures sit in a `MetricStrip` rather than in four rounded
 * cards, because inventory, rating, and sales are three readings from one
 * account, not three unrelated widgets.
 *
 * The verified badge states its own status in words next to the icon, so the
 * claim survives greyscale and a screen reader rather than resting on a tick.
 */
export function StorefrontHeader({ seller }) {
  const ratingCount = Number(seller.ratingCount ?? 0)
  const hasRating = ratingCount > 0 && seller.ratingAverage != null
  const listingCount = Number(seller.approvedListings ?? 0)
  const color = brandColorFor(seller)

  return (
    <div className="border-b border-line bg-surface">
      {/* The store's banner, or a wash of its colour when it has none. */}
      <div
        className="relative h-32 overflow-hidden sm:h-48"
        style={{ background: `linear-gradient(120deg, ${color.hex}55, ${color.hex}10 55%, transparent)` }}
        data-testid="storefront-banner"
      >
        {seller.bannerUrl && (
          <img
            src={seller.bannerUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
      </div>
      <Container className="relative -mt-14 pb-10 sm:-mt-20 sm:pb-14">
        <Breadcrumb
          items={[
            { label: 'Home', to: MARKETPLACE_ROUTES.home },
            { label: 'Phone Stores', to: MARKETPLACE_ROUTES.stores },
            { label: seller.businessName },
          ]}
        />

        <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-7">
          <SellerAvatar seller={seller} rounded="rounded-2xl" className={`${BANNER_LOGO} border-surface`} />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              {seller.isVerified && (
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-accent-600 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                  <BadgeCheck className="size-3.5 shrink-0" aria-hidden="true" />
                  Verified seller
                </span>
              )}
              <StoreFollowControl sellerId={seller.id} />
            </div>

            {/* The `h1` is the store's name, not the page's purpose. A shopper who
                lands here from a listing wants to know whose shop this is, and a
                generic "Seller storefront" heading would answer nothing. */}
            <PageHeader
              title={seller.businessName}
              className="[&_h1]:mt-3 [&_h1]:text-[2rem] sm:[&_h1]:text-[2.75rem]"
              description={seller.tagline ?? undefined}
            />

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Store className="size-3.5 shrink-0" aria-hidden="true" />
                {listingCount === 1 ? '1 phone listed' : `${formatNumber(listingCount)} phones listed`}
              </span>

              {seller.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  {seller.location}
                </span>
              )}

              {seller.memberSince && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
                  On ReFon since {seller.memberSince}
                </span>
              )}
            </div>

            {/* The rating is stated in words as well as stars. A seller with no
                reviews is described by their verification status rather than by
                a 0.0 score that reads like bad feedback. */}
            <div className="mt-5">
              {hasRating ? (
                <RatingStars value={seller.ratingAverage} count={ratingCount} size="md" />
              ) : (
                <p className="text-sm text-muted">
                  No buyer reviews yet. This seller is verified and every listing
                  below has been moderated.
                </p>
              )}
            </div>
          </div>
        </div>

        <MetricStrip
          className="mt-9"
          metrics={[
            {
              label: 'Listed now',
              value: formatNumber(listingCount),
              hint: 'Approved and purchasable',
            },
            {
              label: 'Rating',
              value: hasRating ? Number(seller.ratingAverage).toFixed(1) : '—',
              hint: hasRating
                ? `From ${formatNumber(ratingCount)} ${ratingCount === 1 ? 'review' : 'reviews'}`
                : 'No reviews yet',
              tone: hasRating ? 'accent' : undefined,
            },
            {
              label: 'Completed sales',
              value: formatNumber(seller.completedSales ?? 0),
              hint: 'Devices delivered to buyers',
            },
            {
              label: 'Member since',
              value: seller.memberSince ?? '—',
              hint: 'Verified marketplace account',
            },
          ]}
        />
      </Container>
    </div>
  )
}

/** The full-page "there is no such storefront" state. */
export function StorefrontNotFound() {
  return (
    <section className="border-b border-line bg-surface">
      <Container className="py-16 sm:py-24">
        <div
          className="mx-auto max-w-xl border border-line-2 bg-canvas px-6 py-12 text-center sm:px-10"
          role="status"
          aria-live="polite"
        >
          <span
            className="mx-auto grid size-14 place-items-center rounded-control bg-surface-2 text-primary-700"
            aria-hidden="true"
          >
            <Store className="size-6" strokeWidth={1.8} />
          </span>
          <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
            Seller not found
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            This seller does not have a storefront.
          </h1>
          <p className="mt-3 leading-body text-muted">
            The seller may not exist, or their account has not completed
            verification. Only verified sellers have a public storefront on ReFon.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to={MARKETPLACE_ROUTES.shop}
              className="inline-flex h-11 items-center justify-center rounded-control bg-primary-950 px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-primary-800"
            >
              Browse all phones
            </Link>
            <Link
              to={MARKETPLACE_ROUTES.home}
              className="inline-flex h-11 items-center justify-center rounded-control border border-line-2 bg-surface px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-900 transition hover:bg-surface-2"
            >
              Back to home
            </Link>
          </div>
        </div>
      </Container>
    </section>
  )
}