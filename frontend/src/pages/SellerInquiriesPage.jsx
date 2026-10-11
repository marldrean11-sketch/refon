import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCheck,
  ClipboardCheck,
  Copy,
  Inbox,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Smartphone,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSellerInquiries } from '../features/inquiries/useSellerInquiries.js'
import { useSellerListings } from '../features/seller/useSellerListings.js'
import { isImageReference } from '../features/listings/image-reference.js'
import { AUTH_ROUTES } from '../features/auth/auth.routes.js'
import { Skeleton } from '../components/ui/Skeleton.jsx'

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

const ALL_LISTINGS = 'all'

function formatRelativeTimestamp(value) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(elapsed / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) {
    return 'Just now'
  }

  if (hours < 1) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  }

  if (days < 1) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }

  if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function getContactKind(contact) {
  const value = String(contact ?? '').trim()

  if (value.includes('@')) {
    return 'email'
  }

  return value.replace(/\D/g, '').length >= 7 ? 'phone' : 'unknown'
}

function getContactNumber(contact) {
  const value = String(contact ?? '').trim()
  const digits = value.replace(/\D/g, '')
  return value.startsWith('+') ? `+${digits}` : digits
}

function ListingThumbnail({ listing }) {
  if (isImageReference(listing.mainPhoto)) {
    return (
      <img
        src={listing.mainPhoto}
        alt={`${listing.brand} ${listing.model}`}
        loading="lazy"
        decoding="async"
        className="size-16 shrink-0 rounded-2xl border border-line object-cover"
      />
    )
  }

  return (
    <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700">
      <Smartphone className="size-6" aria-hidden="true" />
    </div>
  )
}

function ContactActions({ inquiry, onAct, onCopy, isCopied }) {
  const kind = getContactKind(inquiry.buyerContact)
  const subject = `Re: ${inquiry.listing.brand} ${inquiry.listing.model} on ReFon`
  const buttonClass =
    'inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-primary-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {kind === 'email' && (
        <a
          href={`mailto:${inquiry.buyerContact}?subject=${encodeURIComponent(subject)}`}
          onClick={() => onAct()}
          className={buttonClass}
        >
          <Mail className="size-3.5" aria-hidden="true" />
          Reply by email
        </a>
      )}

      {kind === 'phone' && (
        <>
          <a
            href={`tel:${getContactNumber(inquiry.buyerContact)}`}
            onClick={() => onAct()}
            className={buttonClass}
          >
            <Phone className="size-3.5" aria-hidden="true" />
            Call
          </a>
          <a
            href={`sms:${getContactNumber(inquiry.buyerContact)}`}
            onClick={() => onAct()}
            className={buttonClass}
          >
            <MessageCircle className="size-3.5" aria-hidden="true" />
            SMS
          </a>
        </>
      )}

      <button
        type="button"
        onClick={() => onCopy()}
        className={buttonClass}
      >
        {isCopied ? (
          <ClipboardCheck className="size-3.5 text-accent-700" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
        {isCopied ? 'Copied' : 'Copy contact'}
      </button>

      {!inquiry.isRead && (
        <button
          type="button"
          onClick={() => onAct()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-page shadow-sm transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <CheckCheck className="size-3.5" aria-hidden="true" />
          Mark as read
        </button>
      )}
    </div>
  )
}

function InquiryCard({ inquiry, onMarkRead, onCopy, isCopied }) {
  const { listing } = inquiry

  return (
    <article
      className={`rounded-card-xl border bg-white p-5 shadow-card transition sm:p-6 ${
        inquiry.isRead ? 'border-line' : 'border-primary-200 bg-accent-50/25'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <ListingThumbnail listing={listing} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to={`/listings/${listing.id}`}
                className="font-display text-lg font-semibold text-ink transition hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                {listing.brand} {listing.model}
              </Link>
              <p className="mt-1 text-sm font-semibold text-muted">
                {currencyFormatter.format(listing.price)}
                <span className="mx-2 text-line" aria-hidden="true">
                  ·
                </span>
                {inquiry.buyerName}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {!inquiry.isRead && (
                <span
                  className="size-2.5 rounded-full bg-accent-500"
                  aria-label="Unread inquiry"
                />
              )}
              <span className="text-xs font-semibold text-muted">
                {formatRelativeTimestamp(inquiry.createdAt)}
              </span>
            </div>
          </div>

          <p className="mt-3 whitespace-pre-line text-sm leading-body text-ink">
            {inquiry.message}
          </p>

          <ContactActions
            inquiry={inquiry}
            onAct={() => onMarkRead(inquiry)}
            onCopy={() => onCopy(inquiry)}
            isCopied={isCopied}
          />
        </div>
      </div>
    </article>
  )
}

export function SellerInquiriesPage() {
  const {
    inquiries,
    unreadCount,
    isLoading,
    error,
    refresh,
    markRead,
    markAllRead,
  } = useSellerInquiries()
  const { listings } = useSellerListings()
  const [statusFilter, setStatusFilter] = useState('all')
  const [listingFilter, setListingFilter] = useState(ALL_LISTINGS)
  const [copiedId, setCopiedId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const copyTimerRef = useRef(null)

  const activeListingId = listingFilter === ALL_LISTINGS ? undefined : listingFilter

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    refresh({ status: statusFilter, listingId: activeListingId }).catch(() => {})
  }, [activeListingId, refresh, statusFilter])

  useEffect(
    () => () => {
      window.clearTimeout(copyTimerRef.current)
    },
    [],
  )

  const listingOptions = useMemo(
    () =>
      listings
        .filter((listing) => inquiries.some((inquiry) => inquiry.listingId === listing.id))
        .map((listing) => ({
          id: listing.id,
          label: `${listing.brand} ${listing.model}`,
        })),
    [inquiries, listings],
  )

  async function handleMarkRead(inquiry) {
    setActionError('')

    try {
      await markRead(inquiry.id)

      if (statusFilter === 'unread') {
        await refresh({ status: statusFilter, listingId: activeListingId })
      }
    } catch (requestError) {
      setActionError(requestError.message ?? 'The inquiry could not be marked as read.')
    }
  }

  async function handleMarkAllRead() {
    setIsMarkingAll(true)
    setActionError('')

    try {
      await markAllRead()
      await refresh({ status: statusFilter, listingId: activeListingId })
    } catch (requestError) {
      setActionError(requestError.message ?? 'Your inquiries could not be updated.')
    } finally {
      setIsMarkingAll(false)
    }
  }

  async function handleCopy(inquiry) {
    setActionError('')

    try {
      await navigator.clipboard.writeText(inquiry.buyerContact)
      setCopiedId(inquiry.id)
      window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setActionError('Your browser blocked clipboard access. Copy the contact manually.')
    }
  }

  function retry() {
    refresh({ status: statusFilter, listingId: activeListingId }).catch(() => {})
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-canvas">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-700">
                <Inbox className="size-4" aria-hidden="true" />
                Buyer messages
              </span>
              <h1 className="mt-5 flex flex-wrap items-center gap-3 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
                Inquiry Inbox
                <span
                  className="inline-flex min-w-8 items-center justify-center rounded-full bg-accent-700 px-3 py-1 text-lg font-bold text-white"
                  aria-live="polite"
                >
                  {unreadCount}
                  <span className="sr-only"> unread inquiries</span>
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-body text-muted">
                Every buyer who asked about your listings, newest first. Reaching out
                marks the inquiry as read.
              </p>
            </div>

            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll || unreadCount === 0}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white px-6 text-sm font-bold text-primary-700 shadow-sm transition duration-200 hover:border-primary-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <CheckCheck className="size-5" aria-hidden="true" />
              Mark all read
            </button>
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12"
        aria-busy={isLoading}
      >
        {actionError && (
          <div
            className="mb-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
            <p>{actionError}</p>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="inline-flex rounded-2xl border border-line bg-white p-1 shadow-sm"
            role="group"
            aria-label="Filter inquiries by read state"
          >
            {[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread' },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                aria-pressed={statusFilter === tab.value}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                  statusFilter === tab.value
                    ? 'bg-accent text-page shadow-sm'
                    : 'text-muted hover:bg-primary-50 hover:text-primary-700'
                }`}
              >
                {tab.label}
                {tab.value === 'unread' && unreadCount > 0 && (
                  <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-bold text-accent-800">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="sm:w-72">
            <label htmlFor="inquiry-listing-filter" className="sr-only">
              Filter inquiries by listing
            </label>
            <select
              id="inquiry-listing-filter"
              value={listingFilter}
              onChange={(event) => setListingFilter(event.target.value)}
              className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm font-semibold text-ink shadow-sm transition hover:border-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <option value={ALL_LISTINGS}>All listings</option>
              {listingOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div
              className="space-y-4 rounded-card border border-line bg-white p-6 shadow-card sm:p-8"
              role="status"
              aria-live="polite"
              aria-label="Loading your inquiries"
            >
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-start gap-4">
                  <Skeleton className="size-16 shrink-0 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-2/5" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
              <span className="sr-only">Loading your buyer inquiries…</span>
            </div>
          ) : error ? (
            <div
              className="rounded-card border border-red-200 bg-red-50 p-6 text-center shadow-sm sm:p-10"
              role="alert"
            >
              <AlertCircle className="mx-auto size-8 text-danger" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-red-950">
                We could not load your inquiries.
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-body text-red-800">
                Check your connection and try again. No messages were lost.
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger px-5 text-sm font-bold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Try again
              </button>
            </div>
          ) : inquiries.length === 0 && statusFilter === 'unread' ? (
            <section
              className="rounded-card-xl border border-line bg-white px-5 py-14 text-center shadow-card sm:px-8"
              aria-live="polite"
            >
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent-50 text-accent-700">
                <CheckCheck className="size-8" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-2xl font-semibold text-ink">No unread inquiries</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-body text-muted">
                You are all caught up. New buyer messages will appear here automatically.
              </p>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="mt-7 inline-flex h-12 items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-primary-700 shadow-sm transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                View all inquiries
              </button>
            </section>
          ) : inquiries.length === 0 ? (
            <section
              className="rounded-card-xl border border-line bg-white px-5 py-14 text-center shadow-card sm:px-8"
              aria-live="polite"
            >
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-50 text-primary-600">
                <Inbox className="size-8" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-2xl font-semibold text-ink">No inquiries yet</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-body text-muted">
                When a buyer asks about one of your live listings, their message lands here
                with their contact details.
              </p>
              <Link
                to={AUTH_ROUTES.seller}
                className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 text-sm font-bold text-page shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-accent hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                Back to dashboard
              </Link>
            </section>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inquiry) => (
                <InquiryCard
                  key={inquiry.id}
                  inquiry={inquiry}
                  onMarkRead={handleMarkRead}
                  onCopy={handleCopy}
                  isCopied={copiedId === inquiry.id}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
