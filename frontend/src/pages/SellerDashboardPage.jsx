import { Fragment, useMemo, useState } from 'react'
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Edit3,
  ListChecks,
  LockKeyhole,
  MessageCircleWarning,
  MessagesSquare,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSellerListings } from '../features/seller/useSellerListings.js'
import { useSellerProfile } from '../features/seller/useSellerProfile.js'
import { useSellerInquiries } from '../features/inquiries/useSellerInquiries.js'
import { ConfirmDialog } from '../features/seller/components/ConfirmDialog.jsx'
import { SellerStatusBadge } from '../features/seller/components/SellerStatusBadge.jsx'
import { AUTH_ROUTES } from '../features/auth/auth.routes.js'
import { Skeleton } from '../components/ui/Skeleton.jsx'

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

function ListingThumbnail() {
  return (
    <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700">
      <Smartphone className="size-6" aria-hidden="true" />
    </div>
  )
}

function ListingActions({ listing, onDelete, onMarkSold, isUpdating }) {
  const canEdit = editableStatuses.has(listing.status)

  if (listing.status === 'APPROVED') {
    return (
      <button
        type="button"
        onClick={() => onMarkSold(listing)}
        disabled={isUpdating}
        className="inline-flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700 shadow-sm transition hover:bg-primary-100 disabled:opacity-50"
      >
        <ShoppingBag className="size-3.5" aria-hidden="true" />
        Mark Sold
      </button>
    )
  }

  if (!canEdit) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted"
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
        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-primary-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50"
      >
        <Edit3 className="size-3.5" aria-hidden="true" />
        Edit
      </Link>
      <button
        type="button"
        onClick={() => onDelete(listing)}
        disabled={isUpdating}
        className="grid size-9 place-items-center rounded-xl border border-line bg-white text-muted shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-danger disabled:opacity-50"
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
  const [isDeleting, setIsDeleting] = useState(false)
  const [updatingListingId, setUpdatingListingId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const reduceMotion = useReducedMotion()
  const location = useLocation()
  const navigate = useNavigate()
  const notice = location.state?.notice
  const verificationStatus = seller?.verificationStatus ?? null
  const canCreateListing = verificationStatus === 'APPROVED'
  const hasLoadError = Boolean(error || profileError)

  const stats = useMemo(
    () => ({
      total: listings.length,
      pending: listings.filter((listing) => listing.status === 'PENDING').length,
      approved: listings.filter((listing) => listing.status === 'APPROVED').length,
      sold: listings.filter((listing) => listing.status === 'SOLD').length,
    }),
    [listings],
  )

  const statCards = [
    {
      label: 'Total listings',
      value: stats.total,
      icon: ListChecks,
      iconClass: 'bg-primary-50 text-primary-700',
    },
    {
      label: 'Pending review',
      value: stats.pending,
      icon: Clock3,
      iconClass: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Approved / live',
      value: stats.approved,
      icon: BadgeCheck,
      iconClass: 'bg-accent-50 text-accent-700',
    },
    {
      label: 'Sold',
      value: stats.sold,
      icon: ShoppingBag,
      iconClass: 'bg-primary-50 text-primary-700',
    },
  ]

  const statCardsWithInquiries = [
    ...statCards,
    {
      label: 'Unread inquiries',
      value: unreadCount,
      icon: MessagesSquare,
      iconClass: 'bg-accent-50 text-accent-700',
      to: AUTH_ROUTES.sellerInquiries,
    },
  ]

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

  function dismissNotice() {
    navigate(AUTH_ROUTES.seller, { replace: true })
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-canvas">
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            role="status"
             aria-live="polite"
             className="border-b border-accent-200 bg-accent-50"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3 text-sm font-semibold text-accent-900">
                <CheckCircle2 className="size-5 shrink-0 text-accent-700" aria-hidden="true" />
                <span className="min-w-0 break-words">{notice.message}</span>
              </div>
              <button
                type="button"
                onClick={dismissNotice}
                className="grid size-8 place-items-center rounded-lg text-accent-800 transition hover:bg-accent-100"
                aria-label="Dismiss confirmation"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-accent-800">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Seller workspace
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
                Seller Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-body text-muted">
                Track every listing from submission through moderation, approval,
                and sale.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
            {canCreateListing ? (
              <Link
                to="/seller/listings/new"
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-6 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:w-auto"
              >
                <Plus className="size-5" aria-hidden="true" />
                Create New Listing
              </Link>
            ) : verificationStatus ? (
              <span className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-line bg-canvas px-6 text-sm font-bold text-muted">
                <Clock3 className="size-5" aria-hidden="true" />
                Awaiting Approval
              </span>
            ) : (
              <span className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-line bg-canvas px-6 text-sm font-bold text-muted">
                <Clock3 className="size-5" aria-hidden="true" />
                Loading seller profile…
              </span>
            )}
            <Link
              to={AUTH_ROUTES.sellerInquiries}
              className="relative inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white px-6 text-sm font-bold text-primary-700 shadow-sm transition duration-200 hover:border-primary-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:w-auto"
            >
              <MessagesSquare className="size-5" aria-hidden="true" />
              Inquiries
              {unreadCount > 0 && (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-accent-700 px-2 py-0.5 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
            </div>
          </div>

          <div
            className={`mt-8 flex gap-3 rounded-2xl border p-4 text-sm ${
              verificationStatus === 'APPROVED'
                ? 'border-accent-200 bg-accent-50 text-accent-900'
                : verificationStatus === 'REJECTED'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : verificationStatus === null
                   ? 'border-line bg-canvas text-muted'
                   : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            {verificationStatus === 'APPROVED' ? (
              <BadgeCheck className="mt-0.5 size-5 shrink-0 text-accent-700" aria-hidden="true" />
            ) : (
              <Clock3 className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
            )}
            <p className="leading-relaxed">
              {verificationStatus === 'APPROVED' && (
                <>
                  <span className="font-bold">Seller verified.</span> New listings
                  can be submitted to the moderation queue.
                </>
              )}
              {verificationStatus === null && (
                 <>
                   <span className="font-bold">Loading profile.</span>{' '}
                   We’re checking your seller verification status.
                 </>
               )}
               {verificationStatus === 'PENDING' && (
                <>
                  <span className="font-bold">Verification pending.</span>{' '}
                  Listing creation unlocks after administrator approval.
                </>
              )}
              {verificationStatus === 'REJECTED' && (
                <>
                  <span className="font-bold">Verification rejected.</span>{' '}
                  Contact an administrator before creating listings.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12"
        aria-busy={isLoading || isProfileLoading}
      >
        {actionError && (
          <div className="mb-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
            <p>{actionError}</p>
          </div>
        )}

        {isLoading || isProfileLoading ? (
          <div
            className="rounded-card border border-line bg-white p-6 shadow-card sm:p-8"
            role="status"
            aria-live="polite"
            aria-label="Loading seller inventory"
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="rounded-card border border-line p-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-10 w-16" />
                </div>
              ))}
            </div>
            <div className="mt-8 space-y-4">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="flex items-center gap-4 rounded-2xl border border-line p-4">
                  <Skeleton className="size-14 shrink-0 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-2/5" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
            <span className="sr-only">Loading your real seller inventory…</span>
          </div>
        ) : hasLoadError ? (
          <div className="rounded-card border border-red-200 bg-red-50 p-6 text-center shadow-sm sm:p-10" role="alert">
            <AlertCircle className="mx-auto size-8 text-danger" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-red-950">We could not load your seller workspace.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-body text-red-800">
              Check your connection and try again. Your existing listings remain safe in PostgreSQL.
            </p>
            <button
              type="button"
              onClick={() => {
                refreshListings().catch(() => {})
                refreshProfile().catch(() => {})
              }}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-danger px-5 text-sm font-bold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
            >
              Try again
            </button>
          </div>
        ) : (
        <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCardsWithInquiries.map(({ label, value, icon: Icon, iconClass, to }) => {
            const body = (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted">{label}</p>
                  <p className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">
                    {value}
                  </p>
                </div>
                <span className={`grid size-12 place-items-center rounded-2xl ${iconClass}`}>
                  <Icon className="size-6" aria-hidden="true" />
                </span>
              </div>
            )

            return (
              <motion.div
                key={label}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-card border border-line bg-white p-5 shadow-card ${
                  to
                    ? 'transition duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card-hover'
                    : ''
                }`}
              >
                {to ? (
                  <Link
                    to={to}
                    className="block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  >
                    {body}
                    <span className="sr-only">Open {label.toLowerCase()}</span>
                  </Link>
                ) : (
                  body
                )}
              </motion.div>
            )
          })}
        </div>

        <div className="mt-10 overflow-hidden rounded-card-xl border border-line bg-white shadow-card">
          <div className="flex flex-col gap-4 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Your listings
              </h2>
              <p className="mt-1 text-sm text-muted">
                Pending and rejected listings can be edited or deleted.
              </p>
            </div>
            <span className="self-start rounded-full bg-canvas px-3 py-1.5 text-xs font-bold text-muted sm:self-auto">
              {listings.length} total
            </span>
          </div>

          {listings.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[920px] border-collapse text-left">
                  <caption className="sr-only">Your seller listings</caption>
                  <thead>
                    <tr className="border-b border-line bg-canvas/70 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                      <th scope="col" className="px-6 py-4">Listing</th>
                      <th scope="col" className="px-5 py-4">Status</th>
                      <th scope="col" className="px-5 py-4">Price</th>
                      <th scope="col" className="px-5 py-4">Battery</th>
                      <th scope="col" className="px-5 py-4">Updated</th>
                      <th scope="col" className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((listing) => (
                      <Fragment key={listing.id}>
                        <tr className="border-b border-line last:border-0 hover:bg-canvas/50">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <ListingThumbnail />
                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-600">
                                  {listing.brand}
                                </p>
                                <p className="mt-0.5 font-display text-base font-semibold text-ink">
                                  {listing.model}
                                </p>
                                <p className="mt-0.5 text-xs text-muted">
                                  {listing.year} · {listing.storage}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-5">
                            <SellerStatusBadge status={listing.status} />
                          </td>
                          <td className="px-5 py-5 font-semibold text-ink">
                            {currencyFormatter.format(listing.price)}
                          </td>
                          <td className="px-5 py-5">
                            <span className="text-sm font-bold text-ink">
                              {listing.batteryPercent}%
                            </span>
                          </td>
                          <td className="px-5 py-5 text-sm text-muted">
                            {dateFormatter.format(new Date(listing.updatedAt))}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <ListingActions
                              listing={listing}
                              onDelete={setDeleteTarget}
                              onMarkSold={handleMarkSold}
                              isUpdating={updatingListingId === listing.id}
                            />
                          </td>
                        </tr>
                        {listing.status === 'REJECTED' && listing.moderatorFeedback && (
                          <tr className="border-b border-line bg-red-50/70">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="flex gap-3 text-sm text-red-800">
                                <MessageCircleWarning className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
                                <div>
                                  <p className="font-bold">Moderator feedback</p>
                                  <p className="mt-1 leading-relaxed">{listing.moderatorFeedback}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-line lg:hidden">
                {listings.map((listing) => (
                  <div key={listing.id} className="p-5">
                    <div className="flex items-start gap-3">
                      <ListingThumbnail />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-600">
                              {listing.brand}
                            </p>
                            <h3 className="mt-0.5 font-display text-lg font-semibold text-ink">
                              {listing.model}
                            </h3>
                            <p className="mt-0.5 text-xs text-muted">
                              {listing.year} · {listing.storage}
                            </p>
                          </div>
                          <SellerStatusBadge status={listing.status} />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-canvas p-3 text-center">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted">Price</p>
                            <p className="mt-1 text-sm font-bold text-ink">
                              {currencyFormatter.format(listing.price)}
                            </p>
                          </div>
                          <div className="border-x border-line">
                            <p className="text-[10px] uppercase tracking-wide text-muted">Battery</p>
                            <p className="mt-1 text-sm font-bold text-ink">
                              {listing.batteryPercent}%
                            </p>
                          </div>
                          <div className="col-span-2 border-t border-line pt-3">
                            <p className="text-[10px] uppercase tracking-wide text-muted">Updated</p>
                            <p className="mt-1 text-sm font-bold text-ink">
                              {dateFormatter.format(new Date(listing.updatedAt))}
                            </p>
                          </div>
                        </div>

                        {listing.status === 'REJECTED' && listing.moderatorFeedback && (
                          <div className="mt-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            <MessageCircleWarning className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
                            <div>
                              <p className="font-bold">Moderator feedback</p>
                              <p className="mt-1 leading-relaxed">{listing.moderatorFeedback}</p>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex justify-end">
                          <ListingActions
                              listing={listing}
                              onDelete={setDeleteTarget}
                              onMarkSold={handleMarkSold}
                              isUpdating={updatingListingId === listing.id}
                            />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <section
              className="px-5 py-12 text-center sm:px-8 sm:py-16"
              aria-labelledby="empty-listings-title"
              aria-live="polite"
            >
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-50 text-primary-600">
                <Smartphone className="size-8" aria-hidden="true" />
              </span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-primary-600">
                Your inventory starts here
              </p>
              <h2 id="empty-listings-title" className="mt-2 text-2xl font-semibold text-ink">
                No listings yet
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-body text-muted">
                {canCreateListing
                  ? 'Create your first listing with clear condition details and real photos. We’ll review it before buyers can see it.'
                  : verificationStatus === 'REJECTED'
                    ? 'Your seller profile needs administrator review before you can submit a listing. Contact the moderation team if you need help.'
                    : 'Your seller profile is being reviewed. Once approved, you can add clear condition details and real photos for moderation.'}
              </p>
              {canCreateListing && (
                <ol className="mx-auto mt-7 grid max-w-xl gap-3 text-left sm:grid-cols-3">
                  {[
                    'Add the phone details',
                    'Upload 1–6 real photos',
                    'Send it to moderation',
                  ].map((step, index) => (
                    <li key={step} className="rounded-2xl border border-line bg-canvas p-4">
                      <span className="grid size-7 place-items-center rounded-full bg-primary-100 text-xs font-bold text-primary-800">
                        {index + 1}
                      </span>
                      <p className="mt-3 text-sm font-semibold text-ink">{step}</p>
                    </li>
                  ))}
                </ol>
              )}
              {canCreateListing ? (
                <Link
                  to="/seller/listings/new"
                  className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover sm:w-auto"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Create your first listing
                </Link>
              ) : (
                <div className="mx-auto mt-7 flex max-w-md items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
                  <Clock3 className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
                  <p>
                    {verificationStatus === 'REJECTED'
                      ? 'Listing creation is locked until an administrator reviews your seller profile.'
                      : 'Listing creation unlocks as soon as an administrator approves your seller profile.'}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
        </>
        )}

        <div className="mt-5 flex gap-3 rounded-2xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-900">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-primary-700" aria-hidden="true" />
          <p className="leading-relaxed">
            <span className="font-bold">Editing policy:</span> approved and sold
            listings are locked. A future revision workflow will allow approved
            listings to be changed by creating a new draft that returns to Pending
            review.
          </p>
        </div>
      </section>

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
    </div>
  )
}
