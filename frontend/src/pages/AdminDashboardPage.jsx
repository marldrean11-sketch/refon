import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  FileWarning,
  ListChecks,
  MessageSquareText,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { SellerStatusBadge } from '../features/seller/components/SellerStatusBadge.jsx'
import { PhoneArtwork } from '../features/listings/listing-card.jsx'
import { isImageReference } from '../features/listings/image-reference.js'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import {
  approveListingRequest,
  approveSellerRequest,
  getAdminStatsRequest,
  getPendingListingsRequest,
  getPendingSellersRequest,
  rejectListingRequest,
  rejectSellerRequest,
} from '../features/admin/admin-api.js'
import {
  notifyMarketplaceChange,
  subscribeToMarketplaceChanges,
} from '../lib/marketplace-sync.js'

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

const queueTabs = [
  {
    id: 'SELLERS',
    label: 'Pending Sellers',
    icon: Store,
  },
  {
    id: 'LISTINGS',
    label: 'Pending Listings',
    icon: ListChecks,
  },
]

function ReviewActions({
  onApprove,
  onReject,
  feedbackId,
  feedback,
  onFeedbackChange,
  isProcessing = false,
  showFeedback = true,
}) {
  return (
    <div className="mt-5 border-t border-line pt-5">
      {showFeedback && (
        <>
          <label htmlFor={feedbackId} className="text-xs font-bold uppercase tracking-[0.1em] text-muted">
            Moderator feedback <span className="font-medium normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            id={feedbackId}
            rows={3}
            value={feedback}
            onChange={(event) => onFeedbackChange(event.target.value)}
            placeholder="Explain what the seller should change before resubmitting…"
            className="mt-2 w-full resize-none rounded-2xl border border-line bg-white p-3.5 text-sm leading-relaxed text-ink shadow-sm transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
          />
        </>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onReject}
          disabled={isProcessing}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition duration-200 hover:border-red-300 hover:bg-red-100 disabled:opacity-50"
        >
          <X className="size-4" aria-hidden="true" />
          Reject
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={isProcessing}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent-700 px-4 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-accent-800 disabled:opacity-50"
        >
          <Check className="size-4" aria-hidden="true" />
          Approve
        </button>
      </div>
    </div>
  )
}

export function AdminDashboardPage() {
  const [activeQueue, setActiveQueue] = useState('SELLERS')
  const [feedback, setFeedback] = useState({})
  const [notice, setNotice] = useState('')
  const [pendingApplications, setPendingApplications] = useState([])
  const [pendingListings, setPendingListings] = useState([])
  const [overview, setOverview] = useState({
    totalSellers: 0,
    pendingSellers: 0,
    totalListings: 0,
    pendingListings: 0,
    totalSold: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reviewingId, setReviewingId] = useState(null)
  const reduceMotion = useReducedMotion()

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const [statsResponse, sellersResponse, listingsResponse] = await Promise.all([
        getAdminStatsRequest(),
        getPendingSellersRequest(),
        getPendingListingsRequest(),
      ])
      setOverview(statsResponse.stats)
      setPendingApplications(sellersResponse.sellers)
      setPendingListings(listingsResponse.listings)
    } catch (requestError) {
      setError(requestError)
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    refresh()

    const refreshInBackground = () => {
      refresh({ silent: true })
    }
    const unsubscribe = subscribeToMarketplaceChanges(refreshInBackground)
    const intervalId = window.setInterval(refreshInBackground, 30_000)

    window.addEventListener('focus', refreshInBackground)

    return () => {
      unsubscribe()
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshInBackground)
    }
  }, [refresh])

  const stats = useMemo(
    () => [
      {
        label: 'Total sellers',
        value: overview.totalSellers,
        icon: UsersRound,
        iconClass: 'bg-primary-50 text-primary-700',
      },
      {
        label: 'Pending applications',
        value: overview.pendingSellers,
        icon: Clock3,
        iconClass: 'bg-amber-50 text-amber-700',
      },
      {
        label: 'Total listings',
        value: overview.totalListings,
        icon: ListChecks,
        iconClass: 'bg-primary-50 text-primary-700',
      },
      {
        label: 'Pending listings',
        value: overview.pendingListings,
        icon: FileWarning,
        iconClass: 'bg-amber-50 text-amber-700',
      },
      {
        label: 'Total sold',
        value: overview.totalSold,
        icon: ShoppingBag,
        iconClass: 'bg-accent-50 text-accent-700',
      },
    ],
    [overview],
  )

  function handleQueueKeyDown(event, queueId) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
      return
    }

    event.preventDefault()
    const currentIndex = queueTabs.findIndex((tab) => tab.id === queueId)
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % queueTabs.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + queueTabs.length) % queueTabs.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = queueTabs.length - 1
    }

    const nextQueue = queueTabs[nextIndex]
    setActiveQueue(nextQueue.id)
    document.getElementById(`admin-tab-${nextQueue.id.toLowerCase()}`)?.focus()
  }

  function updateFeedback(key, value) {
    setFeedback((current) => ({ ...current, [key]: value }))
  }

  async function handleApplicationReview(application, decision) {
    setReviewingId(application.id)
    setError(null)

    try {
      if (decision === 'APPROVED') {
        await approveSellerRequest(application.id)
      } else {
        await rejectSellerRequest(application.id)
      }
      setNotice(
        `${application.businessName} was ${decision === 'APPROVED' ? 'approved' : 'rejected'}.`,
      )
      notifyMarketplaceChange()
      await refresh()
    } catch (requestError) {
      setError(requestError)
    } finally {
      setReviewingId(null)
    }
  }

  async function handleListingReview(listing, decision) {
    const key = `listing:${listing.id}`
    setReviewingId(listing.id)
    setError(null)

    try {
      if (decision === 'APPROVED') {
        await approveListingRequest(listing.id)
      } else {
        await rejectListingRequest(listing.id, feedback[key] ?? '')
      }
      setFeedback((current) => ({ ...current, [key]: '' }))
      setNotice(
        `${listing.brand} ${listing.model} was ${decision === 'APPROVED' ? 'approved' : 'rejected'}.`,
      )
      notifyMarketplaceChange()
      await refresh()
    } catch (requestError) {
      setError(requestError)
    } finally {
      setReviewingId(null)
    }
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
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 text-sm font-semibold text-accent-900 sm:px-6 lg:px-8">
              <span className="inline-flex min-w-0 items-center gap-3">
                <CheckCircle2 className="size-5 text-accent-700" aria-hidden="true" />
                <span className="min-w-0 break-words">{notice}</span>
              </span>
              <button
                type="button"
                onClick={() => setNotice('')}
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
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-700">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Moderator workspace
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
                Admin Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-body text-muted">
                Review seller applications and listing submissions before they become
                visible to buyers.
              </p>
            </div>
            <div className="inline-flex self-start items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700 lg:self-auto">
              <PackageCheck className="size-4" aria-hidden="true" />
              PostgreSQL moderation queue
            </div>
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12"
        aria-busy={isLoading}
      >
        {error && (
          <div className="mb-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
            <p>{error.message}</p>
          </div>
        )}

        {isLoading ? (
          <div
            className="rounded-card border border-line bg-white p-6 shadow-card sm:p-8"
            role="status"
            aria-live="polite"
            aria-label="Loading moderation queues"
          >
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="rounded-card border border-line p-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-10 w-16" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-8 h-12 w-full rounded-2xl" />
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              {Array.from({ length: 2 }, (_, index) => (
                <div key={index} className="rounded-card border border-line p-6">
                  <Skeleton className="size-12 rounded-2xl" />
                  <Skeleton className="mt-5 h-5 w-2/5" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-4/5" />
                </div>
              ))}
            </div>
            <span className="sr-only">Loading moderation queues from PostgreSQL…</span>
          </div>
        ) : (
        <>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {stats.map(({ label, value, icon: Icon, iconClass }) => (
            <motion.div
              key={label}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-card border border-line bg-white p-5 shadow-card"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted">{label}</p>
                  <p className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">
                    {value}
                  </p>
                </div>
                <span className={`grid size-11 place-items-center rounded-2xl ${iconClass}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-card-xl border border-line bg-white shadow-card">
          <div className="border-b border-line px-4 pt-4 sm:px-6 sm:pt-5">
            <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Moderation queues">
              {queueTabs.map(({ id, label, icon: Icon }) => {
                const count = id === 'SELLERS' ? pendingApplications.length : pendingListings.length
                const isActive = activeQueue === id

                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`admin-tab-${id.toLowerCase()}`}
                     aria-selected={isActive}
                     aria-controls={`admin-panel-${id.toLowerCase()}`}
                     tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveQueue(id)}
                     onKeyDown={(event) => handleQueueKeyDown(event, id)}
                    className={`relative inline-flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-bold transition duration-200 ${
                      isActive
                        ? 'text-primary-700'
                        : 'text-muted hover:text-primary-600'
                    }`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                    <span
                      className={`grid min-w-6 place-items-center rounded-full px-1.5 py-0.5 text-[11px] ${
                        isActive ? 'bg-primary-100 text-primary-800' : 'bg-canvas text-muted'
                      }`}
                    >
                      {count}
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="admin-active-queue"
                        className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary-500"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div
            id={`admin-panel-${activeQueue.toLowerCase()}`}
            role="tabpanel"
            aria-labelledby={`admin-tab-${activeQueue.toLowerCase()}`}
            tabIndex={0}
            className="bg-canvas/50 p-5 sm:p-6 lg:p-8"
          >
            {activeQueue === 'SELLERS' ? (
              <section aria-labelledby="pending-sellers-heading">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-700">
                      Verification queue
                    </p>
                    <h2 id="pending-sellers-heading" className="mt-2 text-2xl font-semibold text-ink">
                      Pending seller applications
                    </h2>
                  </div>
                  <p className="text-sm text-muted">Review business and contact details.</p>
                </div>

                {pendingApplications.length > 0 ? (
                  <div className="mt-6 grid gap-5 xl:grid-cols-2">
                    <AnimatePresence mode="popLayout">
                      {pendingApplications.map((application) => {
                        const feedbackKey = `seller:${application.id}`
                        const initials = application.businessName
                          .split(' ')
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join('')
                          .toUpperCase()

                        return (
                          <motion.article
                            layout
                            key={application.id}
                            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                            className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6"
                          >
                            <div className="flex items-start gap-4">
                              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-500 font-display text-sm font-bold text-white">
                                {initials}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <h3 className="font-display text-xl font-semibold text-ink">
                                      {application.businessName}
                                    </h3>
                                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted">
                                      <Store className="size-4" aria-hidden="true" />
                                      Seller application
                                    </p>
                                  </div>
                                  <SellerStatusBadge status="PENDING" />
                                </div>
                                <dl className="mt-5 grid gap-3 rounded-2xl bg-canvas p-4 text-sm sm:grid-cols-2">
                                  <div>
                                    <dt className="text-xs font-semibold text-muted">Contact info</dt>
                                    <dd className="mt-1 break-words font-medium text-ink">
                                      {application.contactInfo}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-semibold text-muted">Date applied</dt>
                                    <dd className="mt-1 font-medium text-ink">
                                      {dateFormatter.format(new Date(application.appliedAt))}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                            </div>
                            <ReviewActions
                              feedbackId={feedbackKey}
                              feedback={feedback[feedbackKey] ?? ''}
                              onFeedbackChange={(value) => updateFeedback(feedbackKey, value)}
                              showFeedback={false}
                               onReject={() => handleApplicationReview(application, 'REJECTED')}
                              onApprove={() => handleApplicationReview(application, 'APPROVED')}
                              isProcessing={reviewingId === application.id}
                            />
                          </motion.article>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  <AdminEmptyState
                    icon={UserCheck}
                    title="No pending seller applications"
                    description="New seller verification requests will appear in this queue."
                  />
                )}
              </section>
            ) : (
              <section aria-labelledby="pending-listings-heading">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-700">
                      Listing moderation
                    </p>
                    <h2 id="pending-listings-heading" className="mt-2 text-2xl font-semibold text-ink">
                      Pending listings
                    </h2>
                  </div>
                  <p className="text-sm text-muted">
                    Connected directly to the PostgreSQL listing inventory.
                  </p>
                </div>

                {pendingListings.length > 0 ? (
                  <div className="mt-6 grid gap-5 xl:grid-cols-2">
                    <AnimatePresence mode="popLayout">
                      {pendingListings.map((listing) => {
                        const feedbackKey = `listing:${listing.id}`
                        const reviewPhotos = listing.photos?.length
                          ? listing.photos
                          : [null]

                        return (
                          <motion.article
                            layout
                            key={listing.id}
                            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                            className="overflow-hidden rounded-card border border-line bg-white shadow-card"
                          >
                            <div className="relative">
                              <div className={`grid aspect-[16/8] gap-1 bg-canvas p-1 ${reviewPhotos.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
                                {reviewPhotos.map((photo, index) =>
                                  isImageReference(photo) ? (
                                    <div key={`${photo}-${index}`} className="relative min-w-0 overflow-hidden rounded-xl bg-white">
                                      <img
                                        src={photo}
                                        alt={`${listing.brand} ${listing.model} ${index === 0 ? 'main' : 'gallery'} photo`}
                                        loading="lazy"
                                        decoding="async"
                                        className="h-full w-full object-cover"
                                      />
                                      {index === 0 && (
                                        <span className="absolute bottom-2 left-2 rounded-full bg-primary-600/90 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-white">
                                          Main
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <PhoneArtwork
                                      key={`placeholder-${index}`}
                                      brand={listing.brand}
                                      model={listing.model}
                                      color={listing.color}
                                      view="front"
                                      className="h-full w-full"
                                    />
                                  ),
                                )}
                              </div>
                              {reviewPhotos.length > 3 && (
                                <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-bold text-white">
                                  {reviewPhotos.length} photos
                                </span>
                              )}
                              <div className="absolute right-4 top-4">
                                <SellerStatusBadge status={listing.status} />
                              </div>
                            </div>
                            <div className="p-5 sm:p-6">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-600">
                                    {listing.brand}
                                  </p>
                                  <h3 className="mt-1 break-words font-display text-xl font-semibold text-ink">
                                    {listing.model}
                                  </h3>
                                  <p className="mt-1 text-sm text-muted">
                                    {listing.year} · {listing.storage} · {listing.batteryPercent}% battery
                                  </p>
                                </div>
                                <p className="shrink-0 font-display text-xl font-bold text-ink">
                                  {currencyFormatter.format(listing.price)}
                                </p>
                              </div>

                              <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-canvas p-4 text-sm">
                                <div>
                                  <p className="text-xs font-semibold text-muted">Seller</p>
                                  <p className="mt-1 font-semibold text-ink">{listing.sellerName}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-muted">Condition</p>
                                  <p className="mt-1 font-semibold text-ink">{listing.condition}</p>
                                </div>
                                <div className="col-span-2 border-t border-line pt-3">
                                  <p className="text-xs font-semibold text-muted">Cosmetic notes</p>
                                  <p className="mt-1 leading-relaxed text-ink">{listing.conditionNotes}</p>
                                </div>
                              </div>

                              <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-muted">
                                <MessageSquareText className="size-4" aria-hidden="true" />
                                {reviewPhotos.length} photos attached
                              </p>

                              <ReviewActions
                                feedbackId={feedbackKey}
                                feedback={feedback[feedbackKey] ?? ''}
                                onFeedbackChange={(value) => updateFeedback(feedbackKey, value)}
                                onReject={() => handleListingReview(listing, 'REJECTED')}
                                onApprove={() => handleListingReview(listing, 'APPROVED')}
                                isProcessing={reviewingId === listing.id}
                              />
                            </div>
                          </motion.article>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  <AdminEmptyState
                    icon={BadgeCheck}
                    title="No pending listings"
                    description="New seller submissions will appear here automatically from PostgreSQL."
                  />
                )}
              </section>
            )}
          </div>
        </div>

        <section className="mt-8 rounded-card-xl border border-line bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700">
                <ShieldAlert className="size-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-violet-700">
                  Reports & safety
                </p>
                <h2 className="mt-1 break-words font-display text-xl font-semibold text-ink">Reported listings and users</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  The report-management queue is reserved for a later moderation stage.
                </p>
              </div>
            </div>
            <span className="inline-flex self-start items-center gap-2 rounded-full border border-line bg-canvas px-3 py-2 text-xs font-bold text-muted sm:self-auto">
              <AlertCircle className="size-4" aria-hidden="true" />
              0 open reports
            </span>
          </div>
        </section>
        </>
        )}
      </section>
    </div>
  )
}

function AdminEmptyState({ icon: Icon, title, description }) {
  return (
    <div className="mt-6 rounded-card border border-dashed border-primary-200 bg-white px-6 py-14 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-50 text-primary-600">
        <Icon className="size-8" aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-2xl font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-body text-muted">{description}</p>
    </div>
  )
}
