import { Fragment, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Edit3,
  Inbox,
  Package,
  ListChecks,
  LockKeyhole,
  MessageCircleWarning,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrefersReducedMotion } from '../lib/motion.ts'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSellerListings } from '../features/seller/useSellerListings.js'
import { useSellerProfile } from '../features/seller/useSellerProfile.js'
import { useSellerInquiries } from '../features/inquiries/useSellerInquiries.js'
import { ConfirmDialog } from '../features/seller/components/ConfirmDialog.jsx'
import { SellerStatusBadge } from '../features/seller/components/SellerStatusBadge.jsx'
import { LowerPriceDialog } from '../features/seller/components/LowerPriceDialog.jsx'
import { PaymentDetailsCard } from '../features/seller/components/PaymentDetailsCard.jsx'
import { StorefrontSettingsCard } from '../features/seller/components/StorefrontSettingsCard.jsx'
import { AUTH_ROUTES, DASHBOARD_ROUTES } from '../features/auth/auth.routes.js'
import { StatStripSkeleton, Skeleton } from '../components/ui/Skeleton.jsx'
import { EmptyState, ErrorState } from '../components/ui/StateViews.jsx'
import { Container } from '../features/design/Container.jsx'
import { MetricStrip, Panel } from '../features/design/Surfaces.jsx'

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const editableStatuses = new Set(['PENDING', 'REJECTED'])

/**
 * The account state a seller must see before anything else.
 *
 * It used to be a tinted banner with a shield icon under a large heading, which
 * put a four-word status in the widest element on the page. Verification is one
 * field in the seller's account, so it is now one cell in the metric strip with
 * the wording that matters — approved, pending, or rejected with the reason —
 * and the rejection reason gets its own block because it is the only thing a
 * rejected seller actually needs to act on.
 */
function VerificationState(status, feedback) {
  if (status === null) {
    return {
      label: 'Verification',
      value: '—',
      hint: 'Checking your seller record',
      tone: null,
    }
  }

  if (status === 'APPROVED') {
    return {
      label: 'Verification',
      value: 'Approved',
      hint: 'You can submit listings for review',
      tone: 'accent',
    }
  }

  if (status === 'REJECTED') {
    return {
      label: 'Verification',
      value: 'Rejected',
      hint: feedback ? 'Reason below' : 'Contact a moderator',
      tone: 'danger',
    }
  }

  return {
    label: 'Verification',
    value: 'Pending',
    hint: 'Listing unlocks after approval',
    tone: 'flare',
  }
}

function ListingRowMeta({ listing }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        ['Price', currencyFormatter.format(listing.price)],
        ['Battery', `${listing.batteryPercent}%`],
        ['Storage', listing.storage],
        ['Updated', dateFormatter.format(new Date(listing.updatedAt))],
      ].map(([label, value]) => (
        <div key={label}>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
            {label}
          </p>
          <p className="mt-1 text-[13px] font-semibold tabular-nums text-ink">{value}</p>
        </div>
      ))}
    </div>
  )
}

function ListingActions({ listing, onDelete, onMarkSold, onLowerPrice, isUpdating }) {
  const canEdit = editableStatuses.has(listing.status)

  if (listing.status === 'APPROVED') {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onLowerPrice(listing)}
          disabled={isUpdating}
          className="inline-flex items-center gap-1.5 rounded-control border border-accent/60 bg-surface px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-accent transition hover:bg-accent hover:text-page disabled:opacity-50"
        >
          <TrendingDown className="size-3.5" aria-hidden="true" />
          Lower price
        </button>
        <button
          type="button"
          onClick={() => onMarkSold(listing)}
          disabled={isUpdating}
          className="inline-flex items-center gap-1.5 rounded-control border border-line-2 bg-surface px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary-900 transition hover:border-primary-950 hover:bg-primary-950 hover:text-white disabled:opacity-50"
        >
          <ShoppingBag className="size-3.5" aria-hidden="true" />
          Mark Sold
        </button>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle"
        title="Sold listings are locked."
      >
        <LockKeyhole className="size-3.5" aria-hidden="true" />
        Locked
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        to={`/seller/listings/${listing.id}/edit`}
        className="inline-flex items-center gap-1.5 rounded-control border border-line-2 bg-surface px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary-900 transition hover:border-primary-950 hover:bg-primary-950 hover:text-white"
      >
        <Edit3 className="size-3.5" aria-hidden="true" />
        Edit
      </Link>
      <button
        type="button"
        onClick={() => onDelete(listing)}
        disabled={isUpdating}
        className="grid size-9 place-items-center rounded-control border border-line-2 bg-surface text-muted transition hover:border-danger hover:bg-danger hover:text-white disabled:opacity-50"
        aria-label={`Delete ${listing.brand} ${listing.model}`}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function SellerDashboardPage() {
  const {
    listings,
    isLoading,
    error,
    deleteListing,
    markSold,
    lowerPrice,
    refresh: refreshListings,
  } = useSellerListings()
  const {
    seller,
    isLoading: isProfileLoading,
    error: profileError,
    refresh: refreshProfile,
  } = useSellerProfile()
  const { unreadCount } = useSellerInquiries()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [priceTarget, setPriceTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [updatingListingId, setUpdatingListingId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const reduceMotion = usePrefersReducedMotion()
  const location = useLocation()
  const navigate = useNavigate()
  const notice = location.state?.notice
  const verificationStatus = seller?.verificationStatus ?? null
  const canCreateListing = verificationStatus === 'APPROVED'
  const hasLoadError = Boolean(error || profileError)

  /**
   * What actually needs the seller's attention, in one place.
   *
   * The old dashboard opened with five equally sized stat cards — Total,
   * Pending, Approved, Sold, Unread — which said nothing about where to start.
   * These are ordered by what a seller checks first, and the two that can require
   * action (pending review, unread inquiries) carry their own colour and hint.
   */
  const stats = useMemo(
    () => [
      {
        label: 'Live listings',
        value: listings.filter((listing) => listing.status === 'APPROVED').length,
        hint: 'Visible to buyers now',
        tone: 'accent',
      },
      {
        label: 'Pending review',
        value: listings.filter((listing) => listing.status === 'PENDING').length,
        hint: 'Waiting on a moderator',
        tone: listings.some((listing) => listing.status === 'PENDING') ? 'flare' : undefined,
      },
      {
        label: 'Unread inquiries',
        value: unreadCount,
        hint: 'Buyers waiting on a reply',
        to: AUTH_ROUTES.sellerInquiries,
        tone: unreadCount > 0 ? 'accent' : undefined,
      },
      {
        label: 'Sold',
        value: listings.filter((listing) => listing.status === 'SOLD').length,
        hint: 'Completed on ReFon',
      },
      {
        label: 'Rejected',
        value: listings.filter((listing) => listing.status === 'REJECTED').length,
        hint: 'Needs a change and resubmit',
        tone: listings.some((listing) => listing.status === 'REJECTED') ? 'danger' : undefined,
      },
    ],
    [listings, unreadCount],
  )

  const needsAttention = listings.filter((listing) =>
    ['PENDING', 'REJECTED'].includes(listing.status),
  )
  const liveListings = listings.filter((listing) => listing.status === 'APPROVED')
  const soldListings = listings.filter((listing) => listing.status === 'SOLD')

  async function handleDelete() {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)
    setActionError(null)

    try {
      await deleteListing(deleteTarget.id)
      setDeleteTarget(null)
      navigate(AUTH_ROUTES.seller, {
        replace: true,
        state: {
          notice: {
            type: 'success',
            message: `${deleteTarget.brand} ${deleteTarget.model} was deleted.`,
          },
        },
      })
    } catch (requestError) {
      setActionError(requestError.message)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleMarkSold(listing) {
    setUpdatingListingId(listing.id)
    setActionError(null)

    try {
      await markSold(listing.id)
      navigate(AUTH_ROUTES.seller, {
        replace: true,
        state: {
          notice: {
            type: 'success',
            message: `${listing.brand} ${listing.model} was marked as sold.`,
          },
        },
      })
    } catch (requestError) {
      setActionError(requestError.message)
    } finally {
      setUpdatingListingId(null)
    }
  }

  async function handleLowerPrice(listing, price) {
    const { notified } = await lowerPrice(listing.id, price)
    setPriceTarget(null)
    const alerted =
      notified === 0
        ? 'No buyers have saved it yet.'
        : `${notified} ${notified === 1 ? 'buyer who saved it was' : 'buyers who saved it were'} alerted.`
    navigate(AUTH_ROUTES.seller, {
      replace: true,
      state: {
        notice: {
          type: 'success',
          message: `${listing.brand} ${listing.model} is now ${currencyFormatter.format(price)}. ${alerted}`,
        },
      },
    })
  }

  function dismissNotice() {
    navigate(AUTH_ROUTES.seller, { replace: true })
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-canvas">
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            role="status"
            aria-live="polite"
            className="border-b border-accent-300 bg-accent-50"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-900">
                <CheckCircle2 className="size-4 shrink-0 text-accent-700" aria-hidden="true" />
                <span className="min-w-0 break-words">{notice.message}</span>
              </div>
              <button
                type="button"
                onClick={dismissNotice}
                className="grid size-8 shrink-0 place-items-center rounded-control text-accent-800 transition hover:bg-accent-100"
                aria-label="Dismiss confirmation"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Masthead. Identity on the left, the two actions on the right, and no
          explanation of what a dashboard is. */}
      <div className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700">
                Seller workspace
              </p>
              <h1 className="mt-3 font-display text-[2.25rem] font-bold leading-[1.03] tracking-[-0.035em] text-ink sm:text-[2.75rem]">
                {seller?.businessName ?? 'Seller Dashboard'}
              </h1>
              <p className="mt-2.5 max-w-2xl leading-body text-muted">
                Every listing, from submission through moderation to sale.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {canCreateListing ? (
                <Link
                  to="/seller/listings/new"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-950 px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-primary-800"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Create New Listing
                </Link>
              ) : verificationStatus ? (
                <span className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line-2 bg-surface-2 px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
                  <Clock3 className="size-4" aria-hidden="true" />
                  Awaiting Approval
                </span>
              ) : (
                <span className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line-2 bg-surface-2 px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
                  <Clock3 className="size-4" aria-hidden="true" />
                  Loading profile…
                </span>
              )}

              <Link
                to={AUTH_ROUTES.sellerInquiries}
                className="relative inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line-2 bg-surface px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-900 transition hover:border-primary-950 hover:bg-primary-950 hover:text-white"
              >
                <Inbox className="size-4" aria-hidden="true" />
                Inquiries
                {unreadCount > 0 && (
                  <span className="rounded-[3px] bg-accent-600 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>

              <Link
                to={DASHBOARD_ROUTES.sellerOrders}
                className="relative inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line-2 bg-surface px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-900 transition hover:border-primary-950 hover:bg-primary-950 hover:text-white"
              >
                <Package className="size-4" aria-hidden="true" />
                Orders
              </Link>
            </div>
          </div>
        </Container>
      </div>

      <Container
        className="py-8 sm:py-10"
        // aria-busy is on the region that changes, not on the whole page.
      >
        <div aria-busy={isLoading || isProfileLoading}>
          {actionError && (
            <div
              className="mb-5 rounded-control border border-danger bg-red-50 p-4 text-sm text-danger"
              role="alert"
            >
              <p className="flex gap-2.5">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {actionError}
              </p>
            </div>
          )}

          {isLoading || isProfileLoading ? (
            <div
              role="status"
              aria-live="polite"
              aria-label="Loading seller inventory"
            >
              <StatStripSkeleton count={5} />
              <Panel className="mt-6 p-5">
                <Skeleton className="h-3 w-28" />
                <div className="mt-4 space-y-3">
                  {[1, 2, 3].map((row) => (
                    <Skeleton key={row} className="h-20 w-full" />
                  ))}
                </div>
              </Panel>
              <span className="sr-only">Loading your real seller inventory…</span>
            </div>
          ) : hasLoadError ? (
            <ErrorState
              title="We could not load your seller workspace."
              description="Check your connection and try again. Your existing listings remain safe in PostgreSQL."
              onRetry={() => {
                refreshListings().catch(() => {})
                refreshProfile().catch(() => {})
              }}
            />
          ) : (
            <>
              {/* ── The account state, then the numbers, then the work. */}
              <div className="grid gap-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
                <AccountStateCard
                  verification={VerificationState(
                    verificationStatus,
                    seller?.moderatorFeedback,
                  )}
                />
                <MetricStrip metrics={stats} />
              </div>

              {verificationStatus === 'REJECTED' && seller?.moderatorFeedback && (
                <div
                  className="mt-3 flex gap-3 rounded-control border border-danger bg-red-50 p-4 text-sm text-danger"
                  role="status"
                >
                  <MessageCircleWarning
                    className="mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-bold">Verification rejected.</p>
                    <p className="mt-1 leading-relaxed">
                      <span className="font-bold">Reason:</span> {seller.moderatorFeedback}{' '}
                      Listing creation is locked until an administrator reviews your seller
                      profile.
                    </p>
                  </div>
                </div>
              )}

              {verificationStatus === 'PENDING' && (
                <div className="mt-3 flex gap-3 rounded-control border border-flare-300 bg-flare-50 p-4 text-sm text-flare-900">
                  <Clock3 className="mt-0.5 size-5 shrink-0 text-flare-700" aria-hidden="true" />
                  <p className="leading-relaxed">
                    <span className="font-bold">Verification pending.</span> Listing
                    creation unlocks after administrator approval.
                  </p>
                </div>
              )}

              {verificationStatus === 'APPROVED' && (
                <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-800">
                  <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
                  <span className="font-bold">Seller verified.</span> New listings can be
                  submitted to the moderation queue.
                </p>
              )}

              {/* ── The inventory, split by what it needs from the seller. */}
              <div className="mt-8 space-y-6">
                {listings.length > 0 ? (
                  <>
                    <ListingGroup
                      title="Needs your attention"
                      description="Pending and rejected listings can be edited or deleted."
                      listings={needsAttention}
                      emptyLabel="Nothing waiting on you. Every listing is live or sold."
                      renderMeta={(listing) => (
                        <div className="rounded-control border border-line bg-surface-2 p-3.5">
                          <p className="text-xs leading-relaxed text-ink">
                            {listing.moderatorFeedback}
                          </p>
                        </div>
                      )}
                      {...{ onDelete: setDeleteTarget, onMarkSold: handleMarkSold, onLowerPrice: setPriceTarget, updatingListingId }}
                    />

                    <ListingGroup
                      title="Live on the marketplace"
                      description="Visible to every buyer. Lower a price any time; buyers who saved the phone get an alert."
                      listings={liveListings}
                      emptyLabel="No live listings right now."
                      {...{ onDelete: setDeleteTarget, onMarkSold: handleMarkSold, onLowerPrice: setPriceTarget, updatingListingId }}
                    />

                    <ListingGroup
                      title="Sold"
                      description="Locked. A completed sale cannot be edited or removed."
                      listings={soldListings}
                      emptyLabel="No completed sales yet."
                      {...{ onDelete: setDeleteTarget, onMarkSold: handleMarkSold, onLowerPrice: setPriceTarget, updatingListingId }}
                    />
                  </>
                ) : (
                  <EmptyFirstListing canCreateListing={canCreateListing} verificationStatus={verificationStatus} />
                )}
              </div>

              {verificationStatus === 'APPROVED' && (
                <div className="mt-8 space-y-6">
                  <StorefrontSettingsCard
                    seller={seller}
                    onSaved={() => refreshProfile({ silent: true }).catch(() => {})}
                  />
                  <PaymentDetailsCard
                    seller={seller}
                    onSaved={() => refreshProfile({ silent: true }).catch(() => {})}
                  />
                </div>
              )}

              <div className="mt-6 flex gap-3 rounded-control border border-line bg-surface px-4 py-3.5 text-sm">
                <ListChecks className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden="true" />
                <p className="leading-relaxed text-muted">
                  <span className="font-bold text-ink">Editing policy:</span> approved and sold
                  listings are locked, except that a live listing&rsquo;s price can be lowered.
                  A lower price goes live right away and alerts buyers who saved the phone.
                </p>
              </div>
            </>
          )}
        </div>
      </Container>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this listing?"
        message={
          deleteTarget
            ? `${deleteTarget.brand} ${deleteTarget.model} will be permanently removed. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete listing"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isProcessing={isDeleting}
      />

      <LowerPriceDialog
        listing={priceTarget}
        onClose={() => setPriceTarget(null)}
        onSubmit={handleLowerPrice}
      />
    </div>
  )
}

/**
 * The account cell.
 *
 * Verification is the only field of a seller account the seller can act on, so
 * it is separated from the metrics and given room to state the outcome and what
 * to do next — including the rejection reason, which is the single thing a
 * rejected seller needs to read.
 */
function AccountStateCard({ verification }) {
  const toneClasses = {
    accent: 'border-accent-300 bg-accent-50 text-accent-900',
    flare: 'border-flare-300 bg-flare-50 text-flare-900',
    danger: 'border-red-300 bg-red-50 text-red-900',
  }

  return (
    <Panel
      className={`flex flex-col justify-between p-5 ${toneClasses[verification.tone] ?? 'border-line bg-surface text-ink'}`}
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">
        Account state
      </p>
      <div className="mt-3">
        <p className="font-display text-3xl font-bold leading-none tracking-tight">
          {verification.value}
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.1em] opacity-75">
          {verification.label}
        </p>
      </div>
      <p className="mt-4 text-sm leading-relaxed opacity-90">{verification.hint}</p>
    </Panel>
  )
}

/** One inventory group: a titled panel of listing rows. */
function ListingGroup({
  title,
  description,
  listings,
  emptyLabel,
  renderMeta,
  onDelete,
  onMarkSold,
  onLowerPrice,
  updatingListingId,
}) {
  if (listings.length === 0) {
    return (
      <Panel className="p-5">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
          {title}
        </p>
        <p className="mt-2 text-sm text-muted">{emptyLabel}</p>
      </Panel>
    )
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
            {title}
          </p>
          <p className="mt-1.5 text-sm text-muted">{description}</p>
        </div>
        <span className="rounded-[3px] bg-surface-2 px-2 py-1 font-mono text-[11px] font-semibold tabular-nums text-muted ring-1 ring-inset ring-line">
          {listings.length}
        </span>
      </div>

      <ul className="divide-y divide-line">
        {listings.map((listing) => (
          <Fragment key={listing.id}>
            <li className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                    {listing.brand}
                  </p>
                  <p className="mt-1 font-display text-base font-bold tracking-tight text-ink">
                    {listing.model}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted">
                    {listing.year} · {listing.storage}
                  </p>
                </div>
                <SellerStatusBadge status={listing.status} />
              </div>

              <div className="mt-4">
                <ListingRowMeta listing={listing} />
              </div>

              {renderMeta?.(listing) ? (
                <div className="mt-3">
                  {renderMeta(listing)}
                </div>
              ) : null}

              <div className="mt-4 flex justify-end">
                <ListingActions
                  listing={listing}
                  onDelete={onDelete}
                  onMarkSold={onMarkSold}
                  onLowerPrice={onLowerPrice}
                  isUpdating={updatingListingId === listing.id}
                />
              </div>
            </li>
          </Fragment>
        ))}
      </ul>
    </Panel>
  )
}

/** The first-run state for a seller with no listings at all. */
function EmptyFirstListing({ canCreateListing, verificationStatus }) {
  return (
    <Panel>
      <div className="px-5 py-10 text-center sm:px-8 sm:py-14">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
          Your inventory starts here
        </p>
        <h2 className="mx-auto mt-3 max-w-lg font-display text-2xl font-bold tracking-tight text-ink">
          No listings yet
        </h2>
        <p className="mx-auto mt-3 max-w-lg leading-body text-muted">
          {canCreateListing
            ? 'Create your first listing with clear condition details and real photos. We’ll review it before buyers can see it.'
            : verificationStatus === 'REJECTED'
              ? 'Your seller profile needs administrator review before you can submit a listing. Contact the moderation team if you need help.'
              : 'Your seller profile is being reviewed. Once approved, you can add clear condition details and real photos for moderation.'}
        </p>

        {canCreateListing && (
          <>
            <ol className="mx-auto mt-8 grid max-w-2xl gap-px overflow-hidden rounded-card border border-line bg-line text-left sm:grid-cols-3">
              {[
                'Add the phone details',
                'Upload 1–6 real photos',
                'Send it to moderation',
              ].map((step, index) => (
                <li key={step} className="bg-surface p-4">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
                    Step {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-ink">{step}</p>
                </li>
              ))}
            </ol>

            <Link
              to="/seller/listings/new"
              className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-950 px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-primary-800"
            >
              <Plus className="size-4" aria-hidden="true" />
              Create your first listing
            </Link>
          </>
        )}

        {!canCreateListing && (
          <div className="mx-auto mt-7 flex max-w-lg items-start gap-3 rounded-control border border-flare-300 bg-flare-50 p-4 text-left text-sm text-flare-900">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-flare-700" aria-hidden="true" />
            <p>
              {verificationStatus === 'REJECTED'
                ? 'Listing creation is locked until an administrator reviews your seller profile.'
                : 'Listing creation unlocks as soon as an administrator approves your seller profile.'}
            </p>
          </div>
        )}
      </div>
    </Panel>
  )
}