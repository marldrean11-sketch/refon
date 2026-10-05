import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Flag,
  HardDrive,
  MemoryStick,
  MessageCircle,
  SearchX,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { InquiryModal } from '../features/listings/InquiryModal.jsx'
import { ReportListingModal } from '../features/listings/ReportListingModal.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import { ListingCard } from '../features/listings/listing-card.jsx'
import { ListingGallery } from '../features/listings/listing-gallery.jsx'
import { useListing } from '../features/listings/useListing.js'
import { FavoriteButton } from '../features/favorites/FavoriteButton.jsx'
import { GradeExplainer } from '../features/listings/GradeExplainer.jsx'
import { InspectionPanel } from '../features/listings/InspectionPanel.jsx'
import { ProductMeta } from '../features/listings/ProductMeta.jsx'
import { ProductReviews } from '../features/listings/ProductReviews.jsx'
import { SellerTrustCard } from '../features/listings/SellerTrustCard.jsx'
import { SpecificationsGrid } from '../features/listings/SpecificationsGrid.jsx'
import { TrustSummary } from '../features/listings/TrustSummary.jsx'
import {
  useListingReviews,
  useRelatedListings,
} from '../features/listings/useListingExtras.js'
import {
  ListingDetailSkeleton,
  RelatedListingsSkeleton,
} from '../features/listings/listing-skeletons.jsx'
import { ConditionBadge } from '../components/ui/ConditionBadge.jsx'
import { PriceDisplay } from '../components/ui/PriceDisplay.jsx'
import { RatingStars } from '../components/ui/RatingStars.jsx'
import { BatteryHealth } from '../components/ui/BatteryHealth.jsx'
import {
  ReturnPolicyBadge,
  WarrantyBadge,
} from '../components/ui/WarrantyBadge.jsx'
import { AUTH_ROUTES } from '../features/auth/auth.routes.js'
import { productPath } from '../lib/routes.js'
import { explainBatteryHealth } from '../lib/listing-taxonomy.js'
import { formatPeso } from '../lib/format.js'

function ListingUnavailableState({ error, onRetry }) {
  const isMissing =
    !error ||
    [400, 404, 422].includes(error.status) ||
    error.code === 'LISTING_NOT_FOUND'
  const title = isMissing ? 'This listing is no longer available.' : 'We could not load this listing.'
  const description = isMissing
    ? 'It may have sold or been removed by the seller. Browse the marketplace to find another verified phone.'
    : 'The marketplace could not reach this listing right now. Check your connection and try again.'

  return (
    <section
      className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center px-5 py-16 text-center sm:px-6"
      role="status"
      aria-live="polite"
      aria-labelledby="listing-unavailable-title"
    >
      <div className="w-full rounded-card-xl border border-line bg-white px-6 py-12 shadow-card sm:px-12">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-50 text-primary-600">
          <SearchX className="size-8" aria-hidden="true" />
        </span>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
          {isMissing ? 'Listing not found or removed' : 'Listing temporarily unavailable'}
        </p>
        <h1
          id="listing-unavailable-title"
          className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
        >
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-body text-muted">{description}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {!isMissing && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold text-primary-700 shadow-sm transition duration-200 hover:border-primary-200 hover:bg-primary-50"
            >
              Try again
            </button>
          )}
          <Link
            to={AUTH_ROUTES.buyer}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to browse
          </Link>
        </div>
      </div>
    </section>
  )
}

/**
 * The four facts that decide whether a buyer continues, in the order they ask
 * them: which phone, what condition, how the battery holds up, and what happens
 * if something goes wrong. Everything else on the page supports those four.
 */
function KeyFacts({ listing }) {
  const hasWarranty = Number(listing.warrantyMonths ?? 0) > 0

  return (
    <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-2xl bg-canvas p-4">
        <dt className="text-xs font-semibold text-muted">Condition grade</dt>
        <dd className="mt-1.5">
          <ConditionBadge grade={listing.grade} size="lg" />
        </dd>
        <p className="mt-1.5 text-xs text-muted">{listing.gradeLabel}</p>
      </div>

      <div className="rounded-2xl bg-canvas p-4">
        <dt className="mb-2 text-xs font-semibold text-muted">Battery health</dt>
        <BatteryHealth
          percent={listing.batteryPercent}
          size="md"
          showLabel={false}
        />
      </div>

      <div className="rounded-2xl bg-canvas p-4">
        <dt className="text-xs font-semibold text-muted">Warranty</dt>
        <dd className="mt-1.5">
          <WarrantyBadge months={listing.warrantyMonths} />
        </dd>
        {!hasWarranty && (
          <p className="mt-1.5 text-xs font-semibold text-muted">
            Sold as-is — no warranty on this unit
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-canvas p-4">
        <dt className="text-xs font-semibold text-muted">Seller</dt>
        <dd className="mt-1.5 flex items-center gap-1.5">
          {listing.seller?.verificationStatus === 'APPROVED' ? (
            <>
              <BadgeCheck className="size-4 shrink-0 text-accent-600" aria-hidden="true" />
              <span className="text-sm font-bold text-ink">Verified seller</span>
            </>
          ) : (
            <>
              <Clock3 className="size-4 shrink-0 text-warning" aria-hidden="true" />
              <span className="text-sm font-bold text-ink">Verification pending</span>
            </>
          )}
        </dd>
        {Number(listing.seller?.ratingCount ?? 0) > 0 && (
          <div className="mt-1.5">
            <RatingStars
              value={listing.seller.ratingAverage}
              count={listing.seller.ratingCount}
              size="sm"
              showValue={false}
            />
          </div>
        )}
      </div>
    </dl>
  )
}

export function ListingDetailPage() {
  // The same component serves the canonical slug route and the legacy id route.
  const { slug, id } = useParams()
  const identifier = slug ?? id
  const [isInquiryOpen, setIsInquiryOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { listing, isLoading, error, retry } = useListing(identifier)
  const {
    listings: relatedListings,
    isLoading: relatedLoading,
    error: relatedError,
  } = useRelatedListings(listing?.id, 6)
  const { reviews, summary, isLoading: reviewsLoading, error: reviewsError } =
    useListingReviews(listing?.id)

  // Arriving via the legacy /listings/:id URL replaces the address with the
  // canonical slug so the shareable form becomes the one in the address bar.
  const shouldRedirect = Boolean(listing?.slug) && !slug && location.pathname.startsWith('/listings/')

  useEffect(() => {
    if (shouldRedirect) {
      navigate(productPath(listing), { replace: true })
    }
  }, [shouldRedirect, listing, navigate])

  // Ownership is not exposed on the public listing payload, so the server rejects
  // a seller's own report with CANNOT_REPORT_OWN_LISTING.
  const canReport = Boolean(user) && user.role !== 'ADMIN'

  function handleReportClick() {
    if (!user) {
      navigate(AUTH_ROUTES.login, {
        state: { from: `${location.pathname}${location.search}` },
      })
      return
    }

    setIsReportOpen(true)
  }

  if (isLoading) {
    return <ListingDetailSkeleton />
  }

  if (error || !listing) {
    return <ListingUnavailableState error={error} onRetry={retry} />
  }

  const isSold = listing.status === 'SOLD'
  const isVerifiedSeller = listing.seller?.verificationStatus === 'APPROVED'
  const hasWarranty = Number(listing.warrantyMonths ?? 0) > 0

  return (
    <>
      <ProductMeta listing={listing} />

      {/* `lib/bottom-action-bar.js` makes the mobile tab bar yield on this route, so
          this sticky bar owns the bottom edge rather than overlapping it. */}
      <div className="bg-canvas pb-8">
        <section className="border-b border-line bg-white">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <nav
              className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted"
              aria-label="Breadcrumb"
            >
              <Link to={AUTH_ROUTES.home} className="transition hover:text-primary-700">
                Home
              </Link>
              <span aria-hidden="true">/</span>
              <Link to={AUTH_ROUTES.shop} className="transition hover:text-primary-700">
                Shop Phones
              </Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page" className="break-words text-ink">
                {listing.brand} {listing.model}
              </span>
            </nav>

            <div className="mt-8 grid items-start gap-9 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)] lg:gap-12">
              {/* Both columns stick on desktop. Without this the gallery scrolls
                  away while the purchase panel stays put, leaving the left half
                  of the viewport empty through the whole trust section. */}
              <div className="lg:sticky lg:top-24">
                <ListingGallery listing={listing} />
              </div>

              <div className="lg:sticky lg:top-24">
                <div className="flex flex-wrap items-center gap-2">
                  {isVerifiedSeller && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                      <BadgeCheck className="size-4" aria-hidden="true" />
                      Verified Seller
                    </span>
                  )}
                  <ConditionBadge grade={listing.grade} size="lg" />
                  {summary?.average != null && (
                    <RatingStars value={summary.average} count={summary.count} size="sm" />
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-200 bg-accent-50 px-3 py-1.5 text-xs font-bold text-accent-800">
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    Moderated
                  </span>
                </div>

                <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
                  {listing.brand}
                </p>
                <h1 className="mt-2 break-words text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
                  {listing.model}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-muted">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    {listing.year}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <HardDrive className="size-4" aria-hidden="true" />
                    {listing.storage}
                  </span>
                  {listing.ram && (
                    <span className="inline-flex items-center gap-2">
                      <MemoryStick className="size-4" aria-hidden="true" />
                      {listing.ram} RAM
                    </span>
                  )}
                </div>

                <div className="mt-7 border-y border-line py-6">
                  <div className="flex items-start justify-between gap-4">
                    <PriceDisplay
                      price={listing.price}
                      originalPrice={listing.originalPrice}
                      discountPercent={listing.discountPercent}
                      size="lg"
                      showSavings={false}
                      className="flex-1"
                    />
                    {!isSold && (
                      <FavoriteButton listing={listing} className="-mt-1" />
                    )}
                  </div>

                  {/* A saving is only ever stated when a reference price is
                      genuinely higher than the selling price. */}
                  {listing.savings ? (
                    <p className="mt-3 text-sm font-semibold text-accent-700">
                      You save {formatPeso(listing.savings)} against the original{' '}
                      {formatPeso(listing.originalPrice)} price.
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-muted">
                      No original price recorded for this device, so no saving is claimed.
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <WarrantyBadge months={listing.warrantyMonths} size="lg" linkToPolicy />
                    {!hasWarranty && (
                      <span className="inline-flex items-center gap-1.5 rounded-pill bg-canvas px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted ring-1 ring-inset ring-line">
                        Sold as-is · no warranty
                      </span>
                    )}
                    {!isSold && <ReturnPolicyBadge size="lg" />}
                  </div>

                  {isSold && (
                    <div
                      className="mt-4 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
                      role="status"
                    >
                      <ShoppingBag
                        className="mt-0.5 size-5 shrink-0 text-amber-700"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-bold">This phone has been sold</p>
                        <p className="mt-1 text-xs leading-relaxed">
                          This listing is no longer accepting inquiries. Browse the
                          marketplace to find another verified phone.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <KeyFacts listing={listing} />

                {/* Conversion panel.

                    Two real actions, because those are the two that exist: the
                    wishlist already works end to end, and an inquiry already
                    reaches the seller's inbox. Cart and checkout ship in a later
                    phase, so they are named as unavailable rather than rendered
                    as buttons that would appear to complete a purchase. */}
                <div className="mt-6 hidden lg:block">
                  {isSold ? (
                    <div className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-canvas px-6 text-sm font-bold text-muted">
                      <ShoppingBag className="size-5" aria-hidden="true" />
                      No longer accepting inquiries
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsInquiryOpen(true)}
                      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-6 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    >
                      <MessageCircle className="size-5" aria-hidden="true" />
                      Inquire about this phone
                    </button>
                  )}

                  {!isSold && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <FavoriteButton listing={listing} variant="button" />
                      <span
                        className="inline-flex h-12 items-center justify-center rounded-2xl border border-dashed border-line px-3 text-center text-xs font-bold text-muted"
                        aria-disabled="true"
                      >
                        Cart &amp; checkout
                        <span className="sr-only"> — coming soon, not yet available</span>
                      </span>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-center text-xs leading-relaxed text-muted">
                  No account required · Your details go only to this seller
                </p>

                <div className="mt-6 flex gap-3 rounded-2xl border border-line bg-canvas p-4">
                  <ShieldCheck
                    className="mt-0.5 size-5 shrink-0 text-primary-600"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-bold text-ink">ReFon moderated</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Listing details were reviewed for clarity and marketplace standards
                      before publication.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="space-y-5">
              <GradeExplainer grade={listing.grade} conditionNotes={listing.conditionNotes} />
              <InspectionPanel listing={listing} />
              <SpecificationsGrid listing={listing} />
            </div>

            <div className="space-y-5">
              <div className="rounded-card border border-line bg-white p-6 shadow-card">
                <h2 className="font-display text-lg font-semibold text-ink">Battery health</h2>
                <BatteryHealth percent={listing.batteryPercent} size="lg" className="mt-4" />
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  {explainBatteryHealth(listing.batteryPercent)} The figure is measured
                  during inspection and published before purchase.
                </p>
                <Link
                  to="/quality-check"
                  className="mt-3 inline-flex text-xs font-bold text-primary-700 underline underline-offset-2 hover:text-primary-500"
                >
                  How we measure battery health
                </Link>
              </div>

              <SellerTrustCard
                listing={listing}
                actionSlot={
                  canReport ? (
                    <button
                      type="button"
                      onClick={handleReportClick}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    >
                      <Flag className="size-3.5" aria-hidden="true" />
                      Report this listing
                    </button>
                  ) : null
                }
              />
            </div>
          </div>

          <div className="mt-5">
            <TrustSummary listing={listing} />
          </div>

          <div className="mt-5">
            <ProductReviews
              reviews={reviews}
              summary={summary}
              isLoading={reviewsLoading}
              error={reviewsError}
            />
          </div>
        </section>

        <section
          className="border-t border-line bg-white py-12 sm:py-16 lg:py-20"
          aria-busy={relatedLoading}
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-700">
                  Keep exploring
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                  Similar phones
                </h2>
                <p className="mt-3 max-w-2xl leading-body text-muted">
                  Other devices from this seller and comparable phones at a similar price.
                </p>
              </div>
              <Link
                to={AUTH_ROUTES.shop}
                className="inline-flex items-center gap-2 text-sm font-bold text-primary-700 transition hover:text-primary-500"
              >
                View all phones
              </Link>
            </div>

            {relatedLoading ? (
              <div className="mt-8">
                <RelatedListingsSkeleton />
              </div>
            ) : relatedError ? (
              <div
                className="mt-8 rounded-card border border-amber-200 bg-amber-50 px-6 py-8 text-center"
                role="status"
              >
                <p className="text-lg font-semibold text-amber-950">
                  More phones are taking a moment to load.
                </p>
                <p className="mt-2 text-sm text-amber-900">
                  The listing you are viewing is unaffected.
                </p>
              </div>
            ) : relatedListings.length > 0 ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {relatedListings.map((relatedListing) => (
                  <ListingCard key={relatedListing.id} listing={relatedListing} />
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-card border border-dashed border-primary-200 bg-white px-6 py-12 text-center">
                <p className="text-lg font-semibold text-ink">
                  This is the only phone we have right now.
                </p>
                <p className="mt-2 text-sm text-muted">
                  Browse the full catalog to see everything in stock.
                </p>
                <Link
                  to={AUTH_ROUTES.shop}
                  className="mt-5 inline-flex h-11 items-center rounded-2xl bg-primary-500 px-5 text-sm font-bold text-white transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  Shop all phones
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Mobile action bar. The price stays visible while the buyer scrolls the
          inspection and specifications, which is the point of a sticky CTA. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-18px_rgb(15_31_51/0.35)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Asking price
            </p>
            <p className="truncate font-display text-xl font-bold text-ink">
              {formatPeso(listing.price)}
            </p>
          </div>

          {isSold ? (
            <div className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-5 text-sm font-bold text-muted">
              <ShoppingBag className="size-4" aria-hidden="true" />
              Sold
            </div>
          ) : (
            <>
              <FavoriteButton listing={listing} variant="button" compact className="shrink-0" />
              <button
                type="button"
                onClick={() => setIsInquiryOpen(true)}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Inquire
              </button>
            </>
          )}
        </div>
      </div>

      {!isSold && (
        <InquiryModal
          listing={listing}
          open={isInquiryOpen}
          onClose={() => setIsInquiryOpen(false)}
        />
      )}

      {canReport && (
        <ReportListingModal
          listing={listing}
          open={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </>
  )
}