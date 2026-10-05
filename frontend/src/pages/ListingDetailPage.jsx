import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  BatteryCharging,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flag,
  HardDrive,
  MemoryStick,
  MessageCircle,
  ScanLine,
  SearchX,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { InquiryModal } from '../features/listings/InquiryModal.jsx'
import { ReportListingModal } from '../features/listings/ReportListingModal.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import { ListingCard } from '../features/listings/listing-card.jsx'
import { ListingGallery } from '../features/listings/listing-gallery.jsx'
import { useListing } from '../features/listings/useListing.js'
import { FavoriteButton } from '../features/favorites/FavoriteButton.jsx'
import { useApprovedListings } from '../features/listings/useApprovedListings.js'
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
import { InspectionPanel } from '../features/listings/InspectionPanel.jsx'
import { AUTH_ROUTES } from '../features/auth/auth.routes.js'
import { productPath } from '../lib/routes.js'
import { formatPeso } from '../lib/format.js'

function getBatteryPresentation(percentage) {
  if (percentage >= 90) {
    return { label: 'Excellent', bar: 'bg-accent-500', text: 'text-accent-700' }
  }

  if (percentage >= 80) {
    return { label: 'Very good', bar: 'bg-primary-500', text: 'text-primary-700' }
  }

  if (percentage >= 70) {
    return { label: 'Good', bar: 'bg-warning', text: 'text-amber-700' }
  }

  return { label: 'Fair', bar: 'bg-danger', text: 'text-danger' }
}

function getSellerInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

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
    listings: approvedListings,
    isLoading: relatedLoading,
    error: relatedError,
  } = useApprovedListings({ sort: 'recommended', pageSize: 6 })

  // Arriving via the legacy /listings/:id URL replaces the address with the
  // canonical slug so the shareable form becomes the one in the address bar.
  useEffect(() => {
    if (listing?.slug && !slug && location.pathname.startsWith('/listings/')) {
      navigate(productPath(listing), { replace: true })
    }
  }, [listing, slug, location.pathname, navigate])

  if (isLoading) {
    return <ListingDetailSkeleton />
  }

  if (error || !listing) {
    return <ListingUnavailableState error={error} onRetry={retry} />
  }

  const battery = getBatteryPresentation(listing.batteryPercent)
  const seller = listing.seller
  const isSold = listing.status === 'SOLD'

  const specificationRows = [
    { label: 'Processor', value: listing.processor },
    { label: 'Operating system', value: listing.operatingSystem },
    { label: 'Display', value: listing.displaySpec },
    { label: 'Camera', value: listing.cameraSpec },
    { label: 'Network', value: listing.networkType },
    { label: 'Warranty', value: listing.warrantyLabel },
  ].filter((row) => Boolean(row.value))

  const hasSpecifications = specificationRows.length > 0
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
  const otherListings = approvedListings.filter((item) => item.id !== listing.id)
  const relatedListings = [
    ...otherListings.filter((item) => item.brand === listing.brand),
    ...otherListings.filter((item) => item.brand !== listing.brand),
  ].slice(0, 3)

  return (
    <>
      <div className="bg-canvas pb-28 lg:pb-0">
        <section className="border-b border-line bg-white">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted" aria-label="Breadcrumb">
              <Link to={AUTH_ROUTES.home} className="transition hover:text-primary-700">
                Home
              </Link>
              <span aria-hidden="true">/</span>
              <Link to={AUTH_ROUTES.buyer} className="transition hover:text-primary-700">
                Browse Phones
              </Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page" className="break-words text-ink">{listing.brand} {listing.model}</span>
            </nav>

            <div className="mt-8 grid items-start gap-9 lg:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.88fr)] lg:gap-12">
              <ListingGallery listing={listing} />

              <div className="lg:sticky lg:top-24">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                    <BadgeCheck className="size-4" aria-hidden="true" />
                    Verified Seller
                  </span>
                  <ConditionBadge grade={listing.grade} size="lg" />
                  {listing.ratingAverage ? (
                    <RatingStars
                      value={listing.ratingAverage}
                      count={listing.ratingCount}
                      size="sm"
                    />
                  ) : null}
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
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-muted">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    {listing.year} model
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
                  <span className="inline-flex items-center gap-2">
                    <BatteryCharging className="size-4" aria-hidden="true" />
                    {listing.batteryPercent}% battery
                  </span>
                  {listing.imeiVerified && (
                    <span className="inline-flex items-center gap-2">
                      <ScanLine className="size-4" aria-hidden="true" />
                      IMEI verified
                      {listing.imeiLast4 ? (
                        <span className="font-mono text-xs">···{listing.imeiLast4}</span>
                      ) : null}
                    </span>
                  )}
                </div>

                <div className="mt-7 border-y border-line py-6">
                  <div className="flex items-start justify-between gap-4">
                    <PriceDisplay
                      price={listing.price}
                      originalPrice={listing.originalPrice}
                      size="lg"
                      showSavings={false}
                      className="flex-1"
                    />
                    {!isSold && <FavoriteButton listing={listing} />}
                  </div>

                  {listing.savings ? (
                    <p className="mt-3 text-sm font-semibold text-accent-700">
                      You save {formatPeso(listing.savings)} versus the original{' '}
                      {formatPeso(listing.originalPrice)} price.
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-muted">
                      No original price recorded for this device, so no saving is claimed.
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <WarrantyBadge months={listing.warrantyMonths} size="lg" linkToPolicy />
                    {listing.warrantyMonths === 0 && (
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
                      <ShoppingBag className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
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

                {isSold ? (
                  <div className="mt-6 hidden h-14 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-canvas px-6 text-sm font-bold text-muted lg:inline-flex">
                    <ShoppingBag className="size-5" aria-hidden="true" />
                    No longer accepting inquiries
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsInquiryOpen(true)}
                    className="mt-6 hidden h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-6 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 lg:inline-flex"
                  >
                    <MessageCircle className="size-5" aria-hidden="true" />
                    Inquire Now
                  </button>
                )}
                <p className="mt-3 text-center text-xs leading-relaxed text-muted">
                  No account required · Your details go only to this seller
                </p>

                <div className="mt-6 flex gap-3 rounded-2xl border border-line bg-canvas p-4">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold text-ink">ReFon moderated</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Listing details were reviewed for clarity and marketplace standards.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-700">
              Transparent condition
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              Condition details
            </h2>
            <p className="mt-3 max-w-2xl leading-body text-muted">
              The important numbers and cosmetic notes are presented visually so
              buyers can compare with confidence.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <div className="rounded-card border border-line bg-white p-6 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-accent-50 text-accent-700">
                  <BatteryCharging className="size-6" aria-hidden="true" />
                </span>
                <span className={`rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold ${battery.text}`}>
                  {battery.label}
                </span>
              </div>
              <p className="mt-6 text-sm font-semibold text-muted">Battery health</p>
              <p className="mt-1 font-display text-4xl font-bold tracking-tight text-ink">
                {listing.batteryPercent}%
              </p>
              <div
                className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                aria-label="Battery health"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={listing.batteryPercent}
              >
                <div
                  className={`h-full rounded-full ${battery.bar}`}
                  style={{ width: `${listing.batteryPercent}%` }}
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Based on the seller-provided health reading and moderated listing data.
              </p>
            </div>

            <div className="rounded-card border border-line bg-white p-6 shadow-card">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-50 text-primary-700">
                <HardDrive className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-6 text-sm font-semibold text-muted">Storage capacity</p>
              <p className="mt-1 font-display text-4xl font-bold tracking-tight text-ink">
                {listing.storage}
              </p>
              <div className="mt-5 flex h-12 items-end gap-2" aria-hidden="true">
                {[28, 48, 68, 88].map((height, index) => (
                  <span
                    key={height}
                    className={`w-full rounded-t-lg ${index < 3 ? 'bg-primary-500' : 'bg-primary-100'}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Capacity is included as a core listing detail for easy comparison.
              </p>
            </div>

            <div className="rounded-card border border-line bg-white p-6 shadow-card">
              <span className="grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-700">
                <Sparkles className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-6 text-sm font-semibold text-muted">Cosmetic condition</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
                {listing.condition}
              </p>
              <p className="mt-4 text-sm leading-body text-muted">
                {listing.conditionNotes}
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs font-bold text-primary-700">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Notes reviewed for clarity
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-5">
              <div className="rounded-card border border-line bg-white p-6 shadow-card sm:p-7">
                <h3 className="font-display text-xl font-semibold text-ink">
                  Listing overview
                </h3>
                <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-canvas p-4">
                    <dt className="text-xs font-semibold text-muted">Brand</dt>
                    <dd className="mt-1 font-semibold text-ink">{listing.brand}</dd>
                  </div>
                  <div className="rounded-2xl bg-canvas p-4">
                    <dt className="text-xs font-semibold text-muted">Model year</dt>
                    <dd className="mt-1 font-semibold text-ink">{listing.year}</dd>
                  </div>
                  <div className="rounded-2xl bg-canvas p-4">
                    <dt className="text-xs font-semibold text-muted">Color</dt>
                    <dd className="mt-1 font-semibold text-ink">{listing.color}</dd>
                  </div>
                  <div className="rounded-2xl bg-canvas p-4">
                    <dt className="text-xs font-semibold text-muted">Storage</dt>
                    <dd className="mt-1 font-semibold text-ink">{listing.storage}</dd>
                  </div>
                  <div className="rounded-2xl bg-canvas p-4">
                    <dt className="text-xs font-semibold text-muted">RAM</dt>
                    <dd className="mt-1 font-semibold text-ink">{listing.ram ?? '—'}</dd>
                  </div>
                  <div className="rounded-2xl bg-canvas p-4">
                    <dt className="text-xs font-semibold text-muted">Condition grade</dt>
                    <dd className="mt-1 font-semibold text-ink">
                      Grade {listing.grade} · {listing.gradeLabel}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Specifications are only rendered when the seller supplied them.
                  An empty specification table would imply the phone has no
                  processor or camera, which is not the same as "not recorded". */}
              {hasSpecifications && (
                <div className="rounded-card border border-line bg-white p-6 shadow-card sm:p-7">
                  <h3 className="font-display text-xl font-semibold text-ink">
                    Full specifications
                  </h3>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    {specificationRows.map(({ label, value }) => (
                      <div key={label} className="rounded-2xl bg-canvas p-4">
                        <dt className="text-xs font-semibold text-muted">{label}</dt>
                        <dd className="mt-1 font-semibold text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <InspectionPanel listing={listing} />
            </div>

            <div className="space-y-5">
              <div className="rounded-card border border-accent-200 bg-accent-50 p-6">
                <BadgeCheck className="size-7 text-accent-700" aria-hidden="true" />
                <h3 className="mt-4 font-display text-lg font-semibold text-accent-950">
                  Moderation checked
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-accent-900/75">
                  Core condition fields are complete and the listing follows ReFon
                  marketplace standards.
                </p>
              </div>

              <div className="rounded-card border border-line bg-white p-6 shadow-card">
                <h3 className="font-display text-lg font-semibold text-ink">
                  Battery health
                </h3>
                <BatteryHealth percent={listing.batteryPercent} size="lg" className="mt-4" />
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  {battery.note} This figure was measured during inspection and is
                  published before purchase.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-white py-12 sm:py-16 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
                Meet the seller
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Seller information</h2>
              <p className="mt-3 max-w-2xl leading-body text-muted">
                ReFon keeps seller and listing verification visible so buyers know
                who they are contacting.
              </p>
            </div>

            <div className="rounded-card border border-line bg-canvas p-5 shadow-card">
              <div className="flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-500 font-display text-lg font-bold text-white shadow-card">
                  {getSellerInitials(listing.sellerName)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-display text-lg font-semibold text-ink">
                      {listing.sellerName}
                    </h3>
                    <BadgeCheck className="size-5 shrink-0 text-accent-600" aria-label="Verified seller" />
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                    <Store className="size-3.5" aria-hidden="true" />
                    Verified marketplace seller
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-muted">Member since</p>
                  <p className="mt-1 font-semibold text-ink">{seller?.memberSince ?? '—'}</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-muted">Completed sales</p>
                  <p className="mt-1 font-semibold text-ink">{seller.completedSales}</p>
                </div>
              </div>
              <p className="mt-4 flex gap-2 text-xs leading-relaxed text-muted">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden="true" />
                {seller.responseTime}
              </p>
              {canReport && (
                <button
                  type="button"
                  onClick={handleReportClick}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  <Flag className="size-3.5" aria-hidden="true" />
                  Report this listing
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="bg-canvas py-12 sm:py-16 lg:py-20" aria-busy={relatedLoading}>
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-700">
                  Keep exploring
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                  More verified phones
                </h2>
              </div>
              <Link
                to={AUTH_ROUTES.buyer}
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
              <div className="mt-8 rounded-card border border-amber-200 bg-amber-50 px-6 py-8 text-center" role="status">
                <p className="text-lg font-semibold text-amber-950">More phones are taking a moment to load.</p>
                <p className="mt-2 text-sm text-amber-900">The main listing is still available to browse above.</p>
              </div>
            ) : relatedListings.length > 0 ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {relatedListings.map((relatedListing) => (
                  <ListingCard key={relatedListing.id} listing={relatedListing} />
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-card border border-dashed border-primary-200 bg-white px-6 py-12 text-center">
                <p className="text-lg font-semibold text-ink">You have reached the end of this shelf.</p>
                <p className="mt-2 text-sm text-muted">Browse all phones to keep exploring.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-18px_rgb(15_31_51/0.35)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Asking price</p>
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
            <button
              type="button"
              onClick={() => setIsInquiryOpen(true)}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Inquire Now
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
