import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Flag,
  HardDrive,
  Heart,
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
import { AddToCartButton } from '../features/cart/components/AddToCartButton.jsx'
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
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'
import { Container } from '../features/design/Container.jsx'
import { AUTH_ROUTES, MARKETPLACE_ROUTES } from '../features/auth/auth.routes.js'
import { productPath } from '../lib/routes.js'
import { explainBatteryHealth } from '../lib/listing-taxonomy.js'
import { formatPeso } from '../lib/format.js'
import { HealthCheckCallout } from '../features/health-check/HealthCheckCallout.jsx'
import { ShareListingButton } from '../features/listings/ShareListingButton.jsx'
import { RecentlyViewedStrip } from '../features/listings/RecentlyViewedStrip.jsx'
import { rememberViewed } from '../lib/recently-viewed.js'

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
      <div className="w-full rounded-card-lg border border-line-2 bg-surface px-6 py-12">
        <span className="mx-auto grid size-14 place-items-center rounded-control bg-surface-2 text-primary-800">
          <SearchX className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
          {isMissing ? 'Listing not found or removed' : 'Listing temporarily unavailable'}
        </p>
        <h1
          id="listing-unavailable-title"
          className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
        >
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md leading-body text-muted">{description}</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {!isMissing && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line-2 bg-surface px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-900 transition hover:bg-surface-2"
            >
              Try again
            </button>
          )}
          <Link
            to={AUTH_ROUTES.buyer}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-950 px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-primary-800"
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
 * The purchase panel.
 *
 * The four facts that decide whether a buyer continues, in the order they ask
 * them: which phone, what condition, how the battery holds up, and what happens
 * if something goes wrong. Everything else on the page supports those four.
 *
 * Divided into four labelled cells rather than four rounded boxes, because they
 * are four readings from one device and the shared hairlines are what say so.
 */
function KeyFacts({ listing }) {
  const hasWarranty = Number(listing.warrantyMonths ?? 0) > 0

  return (
    <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line">
      <div className="bg-surface px-4 py-3.5">
        <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
          Condition grade
        </dt>
        <dd className="mt-2">
          <ConditionBadge grade={listing.grade} size="lg" />
        </dd>
        <p className="mt-2 text-xs text-muted">{listing.gradeLabel}</p>
      </div>

      <div className="bg-surface px-4 py-3.5">
        <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
          Battery health
        </dt>
        <dd className="mt-2.5">
          <BatteryHealth percent={listing.batteryPercent} size="sm" showLabel={false} />
        </dd>
      </div>

      <div className="bg-surface px-4 py-3.5">
        <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
          Warranty
        </dt>
        <dd className="mt-2">
          <WarrantyBadge months={listing.warrantyMonths} />
        </dd>
        {!hasWarranty && (
          <p className="mt-2 text-xs font-semibold text-muted">
            Sold as-is — no warranty on this unit
          </p>
        )}
      </div>

      <div className="bg-surface px-4 py-3.5">
        <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
          Seller
        </dt>
        <dd className="mt-2 flex items-center gap-1.5">
          {listing.seller?.verificationStatus === 'APPROVED' ? (
            <>
              <BadgeCheck className="size-4 shrink-0 text-accent-600" aria-hidden="true" />
              <span className="text-sm font-bold text-ink">Verified seller</span>
            </>
          ) : (
            <>
              <Clock3 className="size-4 shrink-0 text-flare-600" aria-hidden="true" />
              <span className="text-sm font-bold text-ink">Verification pending</span>
            </>
          )}
        </dd>
        {Number(listing.seller?.ratingCount ?? 0) > 0 && (
          <div className="mt-2">
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

  useEffect(() => {
    if (listing) rememberViewed(listing)
  }, [listing])

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
        {/* ── The product band. Gallery on the left at 7/12, purchase panel at
            5/12, and both stick so the gallery never scrolls away from the
            price. The ratio is deliberately wider than before: the device is the
            subject, and the old near-even split gave the image the same weight
            as the form. */}
        <section className="border-b border-line bg-surface">
          <Container className="py-6 sm:py-8 lg:py-10">
            <Breadcrumb
              items={[
                { label: 'Home', to: AUTH_ROUTES.home },
                { label: 'Shop Phones', to: MARKETPLACE_ROUTES.shop },
                { label: `${listing.brand} ${listing.model}` },
              ]}
            />

            <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1.18fr)_minmax(21rem,0.82fr)] lg:gap-12">
              <div className="lg:sticky lg:top-24">
                <ListingGallery listing={listing} />
              </div>

              <div className="lg:sticky lg:top-24">
                <div className="flex flex-wrap items-center gap-2">
                  {isVerifiedSeller && (
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-accent-600 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                      <BadgeCheck className="size-3.5" aria-hidden="true" />
                      Verified seller
                    </span>
                  )}
                  <ConditionBadge grade={listing.grade} size="lg" />
                  {summary?.average != null && (
                    <RatingStars value={summary.average} count={summary.count} size="sm" />
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-sm border border-line-2 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    Moderated
                  </span>
                </div>

                <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
                  {listing.brand}
                </p>
                <h1 className="mt-2 break-words font-display text-[2.25rem] font-bold leading-[1.02] tracking-[-0.035em] text-ink sm:text-5xl">
                  {listing.model}
                </h1>

                <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[12px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {listing.year}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <HardDrive className="size-3.5" aria-hidden="true" />
                    {listing.storage}
                  </span>
                  {listing.ram && (
                    <span className="inline-flex items-center gap-1.5">
                      <MemoryStick className="size-3.5" aria-hidden="true" />
                      {listing.ram} RAM
                    </span>
                  )}
                </div>

                {/* The class list on this block is load-bearing: the product
                    specs scope their price assertions to `div.border-y.border-line.py-6`
                    so a neighbour's discount in the related rail cannot satisfy
                    them. Renaming the classes silently widens what the assertions
                    read. */}
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
                    <div className="-mt-1 flex items-center gap-2">
                      <ShareListingButton listing={listing} />
                      {!isSold && <FavoriteButton listing={listing} />}
                    </div>
                  </div>

                  {/* A saving is only ever stated when a reference price is
                      genuinely higher than the selling price. */}
                  {!isSold && listing.saveCount > 0 && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent" data-testid="save-count">
                      <Heart className="size-3.5 fill-current" aria-hidden="true" />
                      {listing.saveCount === 1
                        ? '1 shopper saved this phone'
                        : `${listing.saveCount} shoppers saved this phone`}
                    </p>
                  )}

                  {listing.savings ? (
                    <p className="mt-3 text-sm font-semibold text-flare-700">
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
                      <span className="inline-flex items-center gap-1.5 rounded-sm bg-surface-2 px-2.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted ring-1 ring-inset ring-line-2">
                        Sold as-is · no warranty
                      </span>
                    )}
                    {!isSold && <ReturnPolicyBadge size="lg" />}
                  </div>

                  {isSold && (
                    <div
                      className="mt-4 flex gap-3 rounded-control border border-flare-300 bg-flare-50 p-4 text-flare-900"
                      role="status"
                    >
                      <ShoppingBag
                        className="mt-0.5 size-5 shrink-0 text-flare-700"
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

                    Two real actions, because those are the two that exist for a
                    shopper who wants this specific device: buying it, and asking
                    the seller about it. Both work end to end. */}
                <div className="mt-6 hidden lg:block">
                  {isSold ? (
                    <div className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-line-2 bg-surface-2 px-6 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
                      <ShoppingBag className="size-4" aria-hidden="true" />
                      No longer accepting inquiries
                    </div>
                  ) : (
                    <>
                      <AddToCartButton listing={listing} fullWidth />
                      <button
                        type="button"
                        onClick={() => setIsInquiryOpen(true)}
                        className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-line-2 bg-surface px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-900 transition hover:border-primary-950 hover:bg-primary-950 hover:text-white"
                      >
                        <MessageCircle className="size-4" aria-hidden="true" />
                        Inquire about this phone
                      </button>
                    </>
                  )}

                  {!isSold && (
                    <div className="mt-3">
                      <FavoriteButton listing={listing} variant="button" compact />
                    </div>
                  )}
                </div>

                <p className="mt-3 text-center text-xs leading-relaxed text-muted">
                  Adding to your cart holds this exact device for a short time · No account
                  required
                </p>

                <div className="mt-6 flex gap-3 rounded-card border border-line bg-surface-2 p-4">
                  <ShieldCheck
                    className="mt-0.5 size-5 shrink-0 text-accent-600"
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
          </Container>
        </section>

        {/* ── Evidence. The inspection record and the seller's record sit beside
            the reading material, because both answer the same question: can I
            trust this? */}
        <section className="border-b border-line">
          <Container className="py-12 sm:py-14 lg:py-16">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-5">
                <GradeExplainer grade={listing.grade} conditionNotes={listing.conditionNotes} />
                <InspectionPanel listing={listing} />
                <HealthCheckCallout />
                <SpecificationsGrid listing={listing} />
              </div>

              <div className="space-y-5">
                <div className="rounded-card border border-line bg-surface p-6">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                    Battery health
                  </p>
                  <BatteryHealth percent={listing.batteryPercent} size="lg" className="mt-4" />
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    {explainBatteryHealth(listing.batteryPercent)} The figure is measured
                    during inspection and published before purchase.
                  </p>
                  <Link
                    to="/quality-check#battery"
                    className="mt-3 inline-flex font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-accent underline underline-offset-2 hover:text-accent-hover"
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
                        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted transition hover:text-danger"
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
          </Container>
        </section>

        <section className="bg-surface" aria-busy={relatedLoading}>
          <Container className="py-12 sm:py-14 lg:py-16">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700">
                  Keep exploring
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  Similar phones
                </h2>
                <p className="mt-2.5 max-w-2xl leading-body text-muted">
                  Other devices from this seller and comparable phones at a similar price.
                </p>
              </div>
              <Link
                to={MARKETPLACE_ROUTES.shop}
                className="inline-flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-800 transition hover:text-primary-950"
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
                className="mt-8 rounded-card border border-flare-300 bg-flare-50 px-6 py-8 text-center"
                role="status"
              >
                <p className="font-display text-lg font-bold text-flare-950">
                  More phones are taking a moment to load.
                </p>
                <p className="mt-2 text-sm text-flare-900">
                  The listing you are viewing is unaffected.
                </p>
              </div>
            ) : relatedListings.length > 0 ? (
              <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
                {relatedListings.map((relatedListing) => (
                  <ListingCard key={relatedListing.id} listing={relatedListing} />
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-card border border-dashed border-line-2 bg-surface px-6 py-12 text-center">
                <p className="font-display text-lg font-bold text-ink">
                  This is the only phone we have right now.
                </p>
                <p className="mt-2 text-sm text-muted">
                  Browse the full catalog to see everything in stock.
                </p>
                <Link
                  to={MARKETPLACE_ROUTES.shop}
                  className="mt-5 inline-flex h-11 items-center rounded-control bg-primary-950 px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-primary-800"
                >
                  Shop all phones
                </Link>
              </div>
            )}
          </Container>
        </section>

        <RecentlyViewedStrip key={listing.id} currentId={listing.id} />
      </div>

      {/* Mobile action bar. The price stays visible while the buyer scrolls the
          inspection and specifications, which is the point of a sticky CTA. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_24px_-18px_rgb(17_22_26/0.4)] lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
              Asking price
            </p>
            <p className="truncate font-display text-xl font-bold tabular-nums text-ink">
              {formatPeso(listing.price)}
            </p>
          </div>

          {isSold ? (
            <div className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-control border border-line-2 bg-surface-2 px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
              <ShoppingBag className="size-4" aria-hidden="true" />
              Sold
            </div>
          ) : (
            <AddToCartButton
              listing={listing}
              size="sm"
              placement="mobile-bar"
              className="flex min-w-0 flex-1"
            />
          )}

          {!isSold && (
            <button
              type="button"
              onClick={() => setIsInquiryOpen(true)}
              aria-label="Inquire about this phone"
              className="grid size-12 shrink-0 place-items-center rounded-control border border-line-2 bg-surface text-muted transition hover:border-primary-950 hover:bg-primary-950 hover:text-white"
            >
              <MessageCircle className="size-5" aria-hidden="true" />
            </button>
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