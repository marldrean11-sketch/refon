import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  MessageCircle,
  RefreshCw,
  ShoppingBag,
  Smartphone,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { isImageReference } from '../features/listings/image-reference.js'
import { productPath } from '../lib/routes.js'
import {
  getMySentInquiriesRequest,
  replyToMyInquiryRequest,
} from '../features/inquiries/my-inquiries-api.js'
import { InquiryThread } from '../features/inquiries/InquiryThread.jsx'
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
  hour: 'numeric',
  minute: '2-digit',
})

function StatusChip({ status }) {
  if (status === 'SOLD') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800">
        <ShoppingBag className="size-3.5" aria-hidden="true" />
        Sold
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1.5 text-[11px] font-bold text-accent-800">
      <CheckCircle2 className="size-3.5" aria-hidden="true" />
      Available
    </span>
  )
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

export function MyInquiriesPage() {
  const [inquiries, setInquiries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await getMySentInquiriesRequest()
      setInquiries(response.inquiries)
    } catch (requestError) {
      setError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    load().catch(() => {})
  }, [load])

  async function handleReply(id, body) {
    const response = await replyToMyInquiryRequest(id, body)
    setInquiries((current) =>
      current.map((inquiry) => (inquiry.id === id ? response.inquiry : inquiry)),
    )
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-canvas">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-700">
            <MessageCircle className="size-4" aria-hidden="true" />
            Your questions
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
            My Inquiries
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-body text-muted">
            Every question you sent to a seller, their replies, and the current status
            of the phone you asked about.
          </p>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12"
        aria-busy={isLoading}
      >
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
            <span className="sr-only">Loading your sent inquiries…</span>
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
              Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => load().catch(() => {})}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger px-5 text-sm font-bold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : inquiries.length === 0 ? (
          <section
            className="rounded-card-xl border border-line bg-white px-5 py-14 text-center shadow-card sm:px-8"
            aria-live="polite"
          >
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-50 text-primary-600">
              <MessageCircle className="size-8" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold text-ink">No inquiries yet</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-body text-muted">
              When you ask a seller about a phone, your message and its status appear
              here.
            </p>
            <Link
              to={AUTH_ROUTES.buyer}
              className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 text-sm font-bold text-page shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-accent hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              Browse phones
            </Link>
          </section>
        ) : (
          <>
            <p className="mb-6 text-sm font-semibold text-muted" aria-live="polite">
              {inquiries.length} {inquiries.length === 1 ? 'inquiry' : 'inquiries'} sent
            </p>
            <div className="space-y-4">
              {inquiries.map((inquiry) => (
                <article
                  key={inquiry.id}
                  className="rounded-card-xl border border-line bg-white p-5 shadow-card sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <ListingThumbnail listing={inquiry.listing} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={productPath(inquiry.listing)}
                            className="font-display text-lg font-semibold text-ink transition hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                          >
                            {inquiry.listing.brand} {inquiry.listing.model}
                          </Link>
                          <p className="mt-1 text-sm font-semibold text-muted">
                            {currencyFormatter.format(inquiry.listing.price)}
                          </p>
                        </div>
                        <StatusChip status={inquiry.listing.status} />
                      </div>

                      <p className="mt-3 whitespace-pre-line text-sm leading-body text-ink">
                        {inquiry.message}
                      </p>

                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                        <Clock3 className="size-3.5" aria-hidden="true" />
                        Sent {dateFormatter.format(new Date(inquiry.createdAt))}
                        {inquiry.replies?.some((reply) => reply.fromSeller) && (
                          <span className="ml-2 text-accent">· Seller replied</span>
                        )}
                      </p>

                      <InquiryThread
                        replies={inquiry.replies}
                        viewer="buyer"
                        onSend={(body) => handleReply(inquiry.id, body)}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
