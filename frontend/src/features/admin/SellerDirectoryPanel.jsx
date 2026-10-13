import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ExternalLink, Search, Store, UsersRound } from 'lucide-react'
import { Panel, PanelHeader } from '../design/Surfaces.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { SellerStatusBadge } from '../seller/components/SellerStatusBadge.jsx'
import { formatDate, formatPeso } from '../../lib/format.js'
import { productPath, sellerPath } from '../../lib/routes.js'
import { getSellerDirectoryRequest, getSellerForAdminRequest } from './admin-api.js'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' },
]

const LISTING_STATUS_LABELS = {
  APPROVED: 'Live',
  PENDING: 'In review',
  REJECTED: 'Rejected',
  SOLD: 'Sold',
}

/** Debounce for the search box, so typing does not fire a request per key. */
const SEARCH_DELAY_MS = 300

/**
 * The admin's seller directory.
 *
 * Every seller account, not only the pending queue: business and account
 * details, verification status, listing counts and sales. "View" opens the
 * full record with the seller's recent listings.
 */
export function SellerDirectoryPanel() {
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [sellers, setSellers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const load = useCallback(async (filters) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getSellerDirectoryRequest(filters)
      setSellers(response.sellers)
    } catch (requestError) {
      setError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load({ status, q: query }).catch(() => {})
    }, SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [load, status, query])

  return (
    <Panel className="mt-6" data-testid="admin-seller-directory">
      <PanelHeader
        kicker="Directory"
        title="Sellers"
        description="Every seller account, with contact details, verification status and listings."
      />

      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Search sellers</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by store, name, email or contact"
            className="h-10 w-full rounded-control border border-line-2 bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter sellers by status">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value || 'all'}
              type="button"
              aria-pressed={status === filter.value}
              onClick={() => setStatus(filter.value)}
              className={`rounded-control px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                status === filter.value
                  ? 'bg-accent text-page'
                  : 'text-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6">
        {error ? (
          <p role="alert" className="flex gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error.message}
          </p>
        ) : isLoading && sellers.length === 0 ? (
          <div className="space-y-3" role="status" aria-label="Loading sellers">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : sellers.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No sellers match.</p>
        ) : (
          <ul className={`divide-y divide-line ${isLoading ? 'opacity-60' : ''}`}>
            {sellers.map((seller) => (
              <li
                key={seller.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-2 text-muted ring-1 ring-inset ring-line">
                    <Store className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-ink">{seller.businessName}</span>
                      <SellerStatusBadge status={seller.verificationStatus} />
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {seller.user.name} · {seller.user.email}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-subtle">
                      {seller.listingCounts.APPROVED} live · {seller.listingCounts.PENDING} in review ·{' '}
                      {seller.listingCounts.SOLD} sold · joined {formatDate(seller.user.joinedAt)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(seller.id)}
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-control border border-line-2 px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-ink transition hover:border-accent hover:text-accent"
                >
                  <UsersRound className="size-3.5" aria-hidden="true" />
                  View
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SellerDetailModal sellerId={selectedId} onClose={() => setSelectedId(null)} />
    </Panel>
  )
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-ink">{children}</dd>
    </div>
  )
}

function SellerDetailModal({ sellerId, onClose }) {
  const [seller, setSeller] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sellerId) return undefined
    let cancelled = false
    // eslint-disable-next-line react/set-state-in-effect
    setSeller(null)
    setError(null)
    getSellerForAdminRequest(sellerId)
      .then((response) => {
        if (!cancelled) setSeller(response.seller)
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError)
      })
    return () => {
      cancelled = true
    }
  }, [sellerId])

  const location = seller ? [seller.city, seller.region].filter(Boolean).join(', ') : ''

  return (
    <Modal
      open={Boolean(sellerId)}
      onClose={onClose}
      title={seller?.businessName ?? 'Seller'}
      description="Seller account details, visible to admins only."
      size="lg"
    >
      {error ? (
        <p role="alert" className="flex gap-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      ) : !seller ? (
        <div className="space-y-3" role="status" aria-label="Loading seller">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <SellerStatusBadge status={seller.verificationStatus} />
            {seller.verificationStatus === 'APPROVED' && (
              <Link
                to={sellerPath(seller.id)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
              >
                Open storefront
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner">{seller.user.name}</Field>
            <Field label="Account email">
              {seller.user.email}{' '}
              <span className={seller.user.emailVerified ? 'text-accent' : 'text-muted'}>
                ({seller.user.emailVerified ? 'verified' : 'not verified'})
              </span>
            </Field>
            <Field label="Contact info">{seller.contactInfo}</Field>
            <Field label="Location">{location || '—'}</Field>
            <Field label="Joined">{formatDate(seller.user.joinedAt)}</Field>
            <Field label="Applied as seller">{formatDate(seller.appliedAt)}</Field>
            <Field label="Rating">
              {seller.ratingCount > 0
                ? `${seller.ratingAverage.toFixed(1)} from ${seller.ratingCount} reviews`
                : 'No reviews yet'}
            </Field>
            <Field label="Completed sales">{seller.completedSales}</Field>
            {seller.tagline && <Field label="Tagline">{seller.tagline}</Field>}
            {seller.moderatorFeedback && (
              <Field label="Moderator feedback">{seller.moderatorFeedback}</Field>
            )}
          </dl>

          <div>
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
              Listings ({seller.listingCounts.APPROVED} live · {seller.listingCounts.PENDING} in
              review · {seller.listingCounts.SOLD} sold · {seller.listingCounts.REJECTED} rejected)
            </h3>
            {seller.listings.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No listings yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line rounded-control border border-line">
                {seller.listings.map((listing) => (
                  <li key={listing.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      {listing.status === 'APPROVED' || listing.status === 'SOLD' ? (
                        <Link to={productPath(listing)} className="truncate font-medium text-ink hover:text-accent">
                          {listing.brand} {listing.model} · {listing.storage}
                        </Link>
                      ) : (
                        <span className="truncate font-medium text-ink">
                          {listing.brand} {listing.model} · {listing.storage}
                        </span>
                      )}
                      <p className="text-xs text-subtle">Added {formatDate(listing.createdAt)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums text-ink">{formatPeso(listing.price)}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                        {LISTING_STATUS_LABELS[listing.status] ?? listing.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
