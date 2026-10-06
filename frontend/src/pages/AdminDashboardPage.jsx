import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BadgeCheck,
  Check,
  CheckCircle2,
  Flag,
  ListChecks,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { SellerStatusBadge } from '../features/seller/components/SellerStatusBadge.jsx'
import { PhoneArtwork } from '../features/listings/PhoneArtwork.jsx'
import { isImageReference } from '../features/listings/image-reference.js'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { Container } from '../features/design/Container.jsx'
import { MetricStrip, Panel } from '../features/design/Surfaces.jsx'
import {
  approveListingRequest,
  approveSellerRequest,
  getAdminStatsRequest,
  getPendingListingsRequest,
  getPendingSellersRequest,
  getReportsRequest,
  rejectListingRequest,
  rejectSellerRequest,
  resolveReportRequest,
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
    kicker: 'Verification queue',
    heading: 'Pending seller applications',
    help: 'Review business and contact details before the seller can list anything.',
  },
  {
    id: 'LISTINGS',
    label: 'Pending Listings',
    icon: ListChecks,
    kicker: 'Listing moderation',
    heading: 'Pending listings',
    help: 'Confirm the condition detail is specific enough for a buyer to act on.',
  },
  {
    id: 'REPORTS',
    label: 'Reports',
    icon: ShieldAlert,
    kicker: 'Safety queue',
    heading: 'Buyer reports',
    help: 'Act on reports against live listings, with a note explaining the outcome.',
  },
]

const reasonLabels = {
  SCAM: 'Scam or fraud',
  MISLEADING: 'Misleading listing',
  WRONG_INFO: 'Wrong device information',
  PROHIBITED_ITEM: 'Prohibited item',
  OTHER: 'Something else',
}

const reportStatusFilters = [
  { value: 'OPEN', label: 'Open' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
]

/**
 * Approve / reject with an optional note.
 *
 * `aria-label`s are the wiring the keyboard spec relies on: "Reject <name>" and
 * "Approve <name>" distinguish two buttons that would otherwise share the same
 * accessible name inside a page full of cards.
 */
function ReviewActions({
  subject,
  onApprove,
  onReject,
  feedbackId,
  feedback,
  onFeedbackChange,
  isProcessing = false,
  showFeedback = true,
}) {
  return (
    <div className="border-t border-line px-5 py-4 sm:px-6">
      {showFeedback && (
        <>
          <label
            htmlFor={feedbackId}
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle"
          >
            Moderator feedback <span className="font-normal normal-case tracking-normal text-subtle">(optional)</span>
          </label>
          <textarea
            id={feedbackId}
            rows={3}
            value={feedback}
            onChange={(event) => onFeedbackChange(event.target.value)}
            placeholder="Explain what the seller should change before resubmitting…"
            className="mt-2 w-full resize-none rounded-control border border-line-2 bg-surface p-3 text-sm leading-relaxed text-ink transition duration-150 placeholder:text-subtle hover:border-line-2 focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/15"
          />
        </>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          aria-label={`Reject ${subject}`}
          onClick={onReject}
          disabled={isProcessing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-red-300 bg-surface px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-danger transition hover:bg-red-50 disabled:opacity-50"
        >
          <X className="size-3.5" aria-hidden="true" />
          Reject
        </button>
        <button
          type="button"
          aria-label={`Approve ${subject}`}
          onClick={onApprove}
          disabled={isProcessing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-primary-950 px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-primary-800 disabled:opacity-50"
        >
          <Check className="size-3.5" aria-hidden="true" />
          Approve
        </button>
      </div>
    </div>
  )
}

function ReportCard({ report, note, onNoteChange, onAction, isProcessing, isOpen }) {
  const { listing, reporter } = report
  const reduceMotion = useReducedMotion()

  return (
    <motion.article
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
      className="flex flex-col overflow-hidden rounded-card border border-line bg-surface"
    >
      <div className="flex gap-4 p-5">
        <div className="size-16 shrink-0 overflow-hidden rounded-control border border-line">
          {isImageReference(listing.mainPhoto) ? (
            <img
              src={listing.mainPhoto}
              alt={`${listing.brand} ${listing.model}`}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <PhoneArtwork
              brand={listing.brand}
              model={listing.model}
              view="front"
              showLabel={false}
              className="size-full"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                {listing.brand}
              </p>
              <a
                href={`/listings/${listing.id}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-words font-display text-lg font-bold tracking-tight text-ink transition hover:text-primary-800"
              >
                {listing.model}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <p className="mt-1 font-mono text-[11px] tabular-nums text-muted">
                {currencyFormatter.format(listing.price)} · {listing.sellerName}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-red-50 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-danger ring-1 ring-inset ring-red-300">
              <Flag className="size-3.5" aria-hidden="true" />
              {reasonLabels[report.reason] ?? report.reason}
            </span>
          </div>

          {report.details && (
            <p className="mt-3 whitespace-pre-line rounded-control border border-line bg-surface-2 p-3 text-sm leading-relaxed text-ink">
              {report.details}
            </p>
          )}

          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
                Reported by
              </dt>
              <dd className="mt-0.5 break-words font-medium text-ink">
                {reporter?.name} · {reporter?.email}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
                Reported
              </dt>
              <dd className="mt-0.5 font-medium text-ink">
                {dateFormatter.format(new Date(report.createdAt))}
              </dd>
            </div>
          </dl>

          <p className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-surface-2 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted ring-1 ring-inset ring-line">
            <ShieldAlert className="size-3.5" aria-hidden="true" />
            {report.openReportsForListing} open on this listing
          </p>
        </div>
      </div>

      {isOpen ? (
        <div className="border-t border-line bg-surface-2 px-5 py-4 sm:px-6">
          <label
            htmlFor={`report-note-${report.id}`}
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle"
          >
            Moderator note{' '}
            <span className="font-normal normal-case tracking-normal text-danger">
              (required to take down)
            </span>
          </label>
          <textarea
            id={`report-note-${report.id}`}
            rows={3}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Explain what the seller must fix, or why this listing stays up…"
            className="mt-2 w-full resize-none rounded-control border border-line-2 bg-surface p-3 text-sm leading-relaxed text-ink transition duration-150 placeholder:text-subtle hover:border-line-2 focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/15"
          />
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            <button
              type="button"
              aria-label={`Take down ${listing.brand} ${listing.model}`}
              onClick={() => onAction('TAKE_DOWN')}
              disabled={isProcessing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-danger px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              <ShieldAlert className="size-3.5" aria-hidden="true" />
              Take down
            </button>
            <button
              type="button"
              aria-label={`Resolve ${listing.brand} ${listing.model}`}
              onClick={() => onAction('RESOLVE')}
              disabled={isProcessing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-line-2 bg-surface px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary-900 transition hover:bg-primary-950 hover:text-white disabled:opacity-50"
            >
              <Check className="size-3.5" aria-hidden="true" />
              Resolve
            </button>
            <button
              type="button"
              aria-label={`Dismiss ${listing.brand} ${listing.model}`}
              onClick={() => onAction('DISMISS')}
              disabled={isProcessing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-line-2 bg-surface px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted transition hover:bg-surface-3 disabled:opacity-50"
            >
              <X className="size-3.5" aria-hidden="true" />
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-line bg-surface-2 px-5 py-3.5 text-xs text-muted sm:px-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
            {report.status === 'RESOLVED' ? 'Resolved' : 'Dismissed'}
          </p>
          {report.resolutionNote && (
            <p className="mt-1.5 leading-relaxed text-ink">{report.resolutionNote}</p>
          )}
        </div>
      )}
    </motion.article>
  )
}

export function AdminDashboardPage() {
  const [activeQueue, setActiveQueue] = useState('SELLERS')
  const [feedback, setFeedback] = useState({})
  const [notice, setNotice] = useState('')
  const [pendingApplications, setPendingApplications] = useState([])
  const [pendingListings, setPendingListings] = useState([])
  const [reports, setReports] = useState([])
  const [reportStatus, setReportStatus] = useState('OPEN')
  const [resolvingReportId, setResolvingReportId] = useState(null)
  const [overview, setOverview] = useState({
    totalSellers: 0,
    pendingSellers: 0,
    totalListings: 0,
    pendingListings: 0,
    totalSold: 0,
    openReports: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reviewingId, setReviewingId] = useState(null)
  const reduceMotion = useReducedMotion()

  const refresh = useCallback(
    async ({ silent = false, status = reportStatus } = {}) => {
      if (!silent) {
        setIsLoading(true)
      }
      setError(null)

      try {
        const [statsResponse, sellersResponse, listingsResponse, reportsResponse] =
          await Promise.all([
            getAdminStatsRequest(),
            getPendingSellersRequest(),
            getPendingListingsRequest(),
            getReportsRequest(status),
          ])
        setOverview(statsResponse.stats)
        setPendingApplications(sellersResponse.sellers)
        setPendingListings(listingsResponse.listings)
        setReports(reportsResponse.reports)
      } catch (requestError) {
        setError(requestError)
      } finally {
        if (!silent) {
          setIsLoading(false)
        }
      }
    },
    [reportStatus],
  )

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

  /**
   * Platform totals and the three queues.
   *
   * Order is deliberate: the three numbers that can require action today sit in
   * the middle, between the two totals that are context and the last number that
   * is context too. The old six-card grid put "Total sellers" first, which is
   * the least useful figure on the page for the person whose job is clearing
   * queues.
   */
  const stats = useMemo(
    () => [
      {
        label: 'Pending sellers',
        value: overview.pendingSellers,
        hint: 'Awaiting verification review',
        tone: overview.pendingSellers > 0 ? 'flare' : undefined,
      },
      {
        label: 'Pending listings',
        value: overview.pendingListings,
        hint: 'Awaiting moderation',
        tone: overview.pendingListings > 0 ? 'flare' : undefined,
      },
      {
        label: 'Open reports',
        value: overview.openReports,
        hint: 'Buyer reports unresolved',
        tone: overview.openReports > 0 ? 'danger' : undefined,
      },
      { label: 'Sellers', value: overview.totalSellers, hint: 'All accounts' },
      { label: 'Listings', value: overview.totalListings, hint: 'All records' },
      { label: 'Sold', value: overview.totalSold, hint: 'Completed trades' },
    ],
    [overview],
  )

  const queueCounts = {
    SELLERS: pendingApplications.length,
    LISTINGS: pendingListings.length,
    REPORTS: overview.openReports,
  }

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
    const key = `seller:${application.id}`
    setReviewingId(application.id)
    setError(null)

    try {
      if (decision === 'APPROVED') {
        await approveSellerRequest(application.id)
      } else {
        await rejectSellerRequest(application.id, feedback[key] ?? '')
      }
      setFeedback((current) => ({ ...current, [key]: '' }))
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

  async function handleReportStatusChange(nextStatus) {
    setReportStatus(nextStatus)
  }

  async function handleReportAction(report, action) {
    const noteKey = `report:${report.id}`
    // The note textarea writes into the same `feedback` map this reads from.
    const note = feedback[noteKey]?.trim() ?? ''

    // The API rejects a note-less take-down too; blocking here avoids a round trip.
    if (action === 'TAKE_DOWN' && !note) {
      setError({
        message: 'Add a note explaining why this listing is being taken down.',
      })
      return
    }

    setResolvingReportId(report.id)
    setError(null)

    try {
      await resolveReportRequest(report.id, { action, note })
      setFeedback((current) => ({ ...current, [noteKey]: '' }))
      const notices = {
        TAKE_DOWN: `${report.listing.brand} ${report.listing.model} was taken down.`,
        RESOLVE: 'Report marked as resolved.',
        DISMISS: 'Report dismissed.',
      }
      setNotice(notices[action])
      notifyMarketplaceChange()
      await refresh()
    } catch (requestError) {
      setError(requestError)
    } finally {
      setResolvingReportId(null)
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

  const activeTab = queueTabs.find((tab) => tab.id === activeQueue)

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
              <span className="inline-flex min-w-0 items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-900">
                <CheckCircle2 className="size-4 shrink-0 text-accent-700" aria-hidden="true" />
                <span className="min-w-0 break-words">{notice}</span>
              </span>
              <button
                type="button"
                onClick={() => setNotice('')}
                className="grid size-8 shrink-0 place-items-center rounded-control text-accent-800 transition hover:bg-accent-100"
                aria-label="Dismiss confirmation"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700">
                Moderator workspace
              </p>
              <h1 className="mt-3 font-display text-[2.25rem] font-bold leading-[1.03] tracking-[-0.035em] text-ink sm:text-[2.75rem]">
                Admin Dashboard
              </h1>
              <p className="mt-2.5 max-w-2xl leading-body text-muted">
                Review seller applications and listing submissions before they become
                visible to buyers.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 border-l-2 border-primary-950 pl-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              <UsersRound className="size-3.5" aria-hidden="true" />
              PostgreSQL moderation queue
            </span>
          </div>
        </Container>
      </div>

      <Container className="py-8 sm:py-10">
        {error && (
          <div
            className="mb-5 rounded-control border border-danger bg-red-50 p-4 text-sm text-danger"
            role="alert"
          >
            <p className="flex gap-2.5">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error.message}
            </p>
          </div>
        )}

        {isLoading ? (
          <div role="status" aria-live="polite" aria-label="Loading moderation queues">
            <Panel className="p-5">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index}>
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="mt-3 h-8 w-10" />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel className="mt-6 p-5">
              <Skeleton className="h-11 w-full" />
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                {Array.from({ length: 2 }, (_, index) => (
                  <div key={index} className="border border-line p-5">
                    <Skeleton className="size-11 rounded-control" />
                    <Skeleton className="mt-5 h-4 w-2/5" />
                    <Skeleton className="mt-3 h-3 w-full" />
                  </div>
                ))}
              </div>
            </Panel>
            <span className="sr-only">Loading moderation queues from PostgreSQL…</span>
          </div>
        ) : (
          <>
            <MetricStrip metrics={stats} />

            {/* ── The queues. */}
            <Panel className="mt-6">
              <div className="border-b border-line px-4 pt-3 sm:px-5 sm:pt-4">
                <div
                  className="flex gap-1 overflow-x-auto"
                  role="tablist"
                  aria-label="Moderation queues"
                >
                  {queueTabs.map(({ id, label, icon: Icon }) => {
                    const count = queueCounts[id] ?? 0
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
                        className={`relative inline-flex shrink-0 items-center gap-2 px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition duration-150 ${
                          isActive ? 'text-ink' : 'text-subtle hover:text-ink'
                        }`}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                        {label}
                        <span
                          className={`grid min-w-5 place-items-center rounded-[3px] px-1 py-0.5 text-[10px] tabular-nums ${
                            isActive
                              ? 'bg-primary-950 text-white'
                              : 'bg-surface-2 text-subtle'
                          }`}
                        >
                          {count}
                        </span>
                        {isActive && (
                          <motion.span
                            layoutId="admin-active-queue"
                            className="absolute inset-x-3 bottom-0 h-0.5 bg-primary-950"
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
                className="p-5 sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                      {activeTab.kicker}
                    </p>
                    <h2 className="mt-1.5 font-display text-xl font-bold tracking-tight text-ink">
                      {activeTab.heading}
                    </h2>
                  </div>
                  <p className="max-w-md text-sm leading-body text-muted">{activeTab.help}</p>
                </div>

                {activeQueue === 'SELLERS' && (
                  <section aria-labelledby="pending-sellers-heading" className="contents">
                    <h2 id="pending-sellers-heading" className="sr-only">
                      Pending seller applications
                    </h2>
                    {pendingApplications.length > 0 ? (
                      <div className="mt-6 grid gap-4 xl:grid-cols-2">
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
                                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                                className="flex flex-col overflow-hidden rounded-card border border-line bg-surface"
                              >
                                <div className="flex items-start gap-4 p-5">
                                  <span className="grid size-11 shrink-0 place-items-center rounded-control bg-primary-950 font-mono text-xs font-bold text-white">
                                    {initials}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <h3 className="font-display text-lg font-bold tracking-tight text-ink">
                                        {application.businessName}
                                      </h3>
                                      <SellerStatusBadge status="PENDING" />
                                    </div>
                                    <dl className="mt-4 grid gap-3 border-t border-line pt-3 text-sm sm:grid-cols-2">
                                      <div>
                                        <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
                                          Contact info
                                        </dt>
                                        <dd className="mt-1 break-words font-medium text-ink">
                                          {application.contactInfo}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
                                          Date applied
                                        </dt>
                                        <dd className="mt-1 font-medium text-ink">
                                          {dateFormatter.format(new Date(application.appliedAt))}
                                        </dd>
                                      </div>
                                    </dl>
                                  </div>
                                </div>
                                <div className="mt-auto">
                                  <ReviewActions
                                    subject={application.businessName}
                                    feedbackId={feedbackKey}
                                    feedback={feedback[feedbackKey] ?? ''}
                                    onFeedbackChange={(value) => updateFeedback(feedbackKey, value)}
                                    onReject={() => handleApplicationReview(application, 'REJECTED')}
                                    onApprove={() => handleApplicationReview(application, 'APPROVED')}
                                    isProcessing={reviewingId === application.id}
                                  />
                                </div>
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
                )}

                {activeQueue === 'LISTINGS' && (
                  <section aria-labelledby="pending-listings-heading" className="contents">
                    <h2 id="pending-listings-heading" className="sr-only">
                      Pending listings
                    </h2>
                    {pendingListings.length > 0 ? (
                      <div className="mt-6 grid gap-4 xl:grid-cols-2">
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
                                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                                className="flex flex-col overflow-hidden rounded-card border border-line bg-surface"
                              >
                                <div className="relative border-b border-line">
                                  <div
                                    className={`grid aspect-[16/8] gap-px bg-line ${
                                      reviewPhotos.length === 1 ? 'grid-cols-1' : 'grid-cols-3'
                                    }`}
                                  >
                                    {reviewPhotos.map((photo, index) =>
                                      isImageReference(photo) ? (
                                        <div
                                          key={`${photo}-${index}`}
                                          className="relative min-w-0 overflow-hidden bg-surface"
                                        >
                                          <img
                                            src={photo}
                                            alt={`${listing.brand} ${listing.model} ${index === 0 ? 'main' : 'gallery'} photo`}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-full object-cover"
                                          />
                                          {index === 0 && (
                                            <span className="absolute bottom-2 left-2 rounded-[2px] bg-primary-950 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-white">
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
                                          showLabel={false}
                                          className="h-full w-full"
                                        />
                                      ),
                                    )}
                                  </div>
                                  {reviewPhotos.length > 3 && (
                                    <span className="absolute bottom-2 right-2 rounded-[2px] bg-primary-950 px-2 py-1 font-mono text-[10px] font-semibold text-white">
                                      {reviewPhotos.length} photos
                                    </span>
                                  )}
                                  <div className="absolute right-3 top-3">
                                    <SellerStatusBadge status={listing.status} />
                                  </div>
                                </div>

                                <div className="flex flex-1 flex-col p-5">
                                  <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                                        {listing.brand}
                                      </p>
                                      <h3 className="mt-1 break-words font-display text-lg font-bold tracking-tight text-ink">
                                        {listing.model}
                                      </h3>
                                      <p className="mt-1 font-mono text-[11px] text-muted">
                                        {listing.year} · {listing.storage} · {listing.batteryPercent}% battery
                                      </p>
                                    </div>
                                    <p className="shrink-0 font-display text-xl font-bold tabular-nums text-ink">
                                      {currencyFormatter.format(listing.price)}
                                    </p>
                                  </div>

                                  <dl className="mt-4 border-t border-line pt-3 text-sm">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
                                          Seller
                                        </dt>
                                        <dd className="mt-1 font-semibold text-ink">
                                          {listing.sellerName}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
                                          Condition
                                        </dt>
                                        <dd className="mt-1 font-semibold text-ink">
                                          {listing.condition}
                                        </dd>
                                      </div>
                                    </div>
                                    <div className="mt-3 border-t border-line pt-3">
                                      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
                                        Cosmetic notes
                                      </dt>
                                      <dd className="mt-1 leading-relaxed text-ink">
                                        {listing.conditionNotes}
                                      </dd>
                                    </div>
                                  </dl>

                                  <p className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
                                    <MessageSquareText className="size-3.5" aria-hidden="true" />
                                    {reviewPhotos.length} photos attached
                                  </p>
                                </div>

                                <div className="mt-auto">
                                  <ReviewActions
                                    subject={`${listing.brand} ${listing.model}`}
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

                {activeQueue === 'REPORTS' && (
                  <section aria-labelledby="reports-heading" className="contents">
                    <h2 id="reports-heading" className="sr-only">
                      Buyer reports
                    </h2>
                    <div className="mt-4 flex sm:justify-end">
                      <div
                        className="inline-flex rounded-control border border-line-2 bg-surface p-1"
                        role="group"
                        aria-label="Filter reports by status"
                      >
                        {reportStatusFilters.map((filter) => (
                          <button
                            key={filter.value}
                            type="button"
                            onClick={() => handleReportStatusChange(filter.value)}
                            aria-pressed={reportStatus === filter.value}
                            className={`rounded-[3px] px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition ${
                              reportStatus === filter.value
                                ? 'bg-primary-950 text-white'
                                : 'text-muted hover:bg-surface-2 hover:text-ink'
                            }`}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {reports.length > 0 ? (
                      <div className="mt-6 grid gap-4 xl:grid-cols-2">
                        <AnimatePresence mode="popLayout">
                          {reports.map((report) => (
                            <ReportCard
                              key={report.id}
                              report={report}
                              note={feedback[`report:${report.id}`] ?? ''}
                              onNoteChange={(value) =>
                                updateFeedback(`report:${report.id}`, value)
                              }
                              onAction={(action) => handleReportAction(report, action)}
                              isProcessing={resolvingReportId === report.id}
                              isOpen={report.status === 'OPEN'}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <AdminEmptyState
                        icon={ShieldCheck}
                        title={`No ${reportStatus.toLowerCase()} reports`}
                        description="Buyer reports on live listings will appear here for review."
                      />
                    )}
                  </section>
                )}
              </div>
            </Panel>
          </>
        )}
      </Container>
    </div>
  )
}

function AdminEmptyState({ icon: Icon, title, description }) {
  return (
    <div className="mt-6 border border-dashed border-line-2 bg-surface-2 px-6 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-control bg-surface text-subtle ring-1 ring-inset ring-line">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-body text-muted">{description}</p>
    </div>
  )
}