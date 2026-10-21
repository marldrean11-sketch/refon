import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Flag, Heart, MessageCircle, Search, ShieldOff } from 'lucide-react'
import { Panel, PanelHeader } from '../design/Surfaces.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { formatDate, formatPeso } from '../../lib/format.js'
import { productPath } from '../../lib/routes.js'
import { getAdminListingsRequest, takeDownListingRequest } from './admin-api.js'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'APPROVED', label: 'Live' },
  { value: 'PENDING', label: 'In review' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'REJECTED', label: 'Rejected' },
]

const STATUS_STYLES = {
  APPROVED: 'bg-accent-tint text-accent',
  PENDING: 'bg-amber-50 text-amber-700',
  SOLD: 'bg-surface-2 text-muted',
  REJECTED: 'bg-red-50 text-danger',
}

const STATUS_LABELS = Object.fromEntries(
  STATUS_FILTERS.filter((filter) => filter.value).map((filter) => [filter.value, filter.label]),
)

const SEARCH_DELAY_MS = 300

/**
 * Every listing on ReFon for the admin, not only the pending queue: who sells
 * it, its status, and how much attention it gets (open reports, inquiries,
 * saves). Live and sold listings link to their product page.
 */
export function AdminListingsPanel() {
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [listings, setListings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async (filters) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getAdminListingsRequest(filters)
      setListings(response.listings)
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

  async function handleTakeDown(listing) {
    const feedback = window.prompt(
      `Take down ${listing.brand} ${listing.model}? It leaves the shop and the seller is told why.\n\nReason for the seller:`,
      '',
    )
    if (feedback === null) return
    setActionError('')
    setBusyId(listing.id)
    try {
      await takeDownListingRequest(listing.id, feedback)
      await load({ status, q: query })
    } catch (requestError) {
      setActionError(requestError.errors?.feedback ?? requestError.message ?? 'The listing could not be taken down.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Panel className="mt-6" data-testid="admin-all-listings">
      <PanelHeader
        kicker="Catalogue"
        title="All listings"
        description="Every phone on ReFon, with its seller, status, reports, inquiries and saves."
      />

      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Search listings</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by brand, model or store"
            className="h-10 w-full rounded-control border border-line-2 bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter listings by status">
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
        {actionError && (
          <p role="alert" className="mb-3 text-sm text-danger">
            {actionError}
          </p>
        )}
        {error ? (
          <p role="alert" className="flex gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error.message}
          </p>
        ) : isLoading && listings.length === 0 ? (
          <div className="space-y-3" role="status" aria-label="Loading listings">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No listings match.</p>
        ) : (
          <ul className={`divide-y divide-line ${isLoading ? 'opacity-60' : ''}`}>
            {listings.map((listing) => {
              const title = `${listing.brand} ${listing.model} · ${listing.storage}`
              const linkable = listing.status === 'APPROVED' || listing.status === 'SOLD'
              return (
                <li
                  key={listing.id}
                  className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      {linkable ? (
                        <Link to={productPath(listing)} className="truncate font-semibold text-ink hover:text-accent">
                          {title}
                        </Link>
                      ) : (
                        <span className="truncate font-semibold text-ink">{title}</span>
                      )}
                      <span
                        className={`rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
                          STATUS_STYLES[listing.status] ?? 'bg-surface-2 text-muted'
                        }`}
                      >
                        {STATUS_LABELS[listing.status] ?? listing.status}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {listing.seller.businessName} · added {formatDate(listing.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs text-muted">
                    <span className={`inline-flex items-center gap-1 ${listing.openReports ? 'font-semibold text-danger' : ''}`}>
                      <Flag className="size-3.5" aria-hidden="true" />
                      {listing.openReports}
                      <span className="sr-only">open reports</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                      {listing.inquiries}
                      <span className="sr-only">inquiries</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="size-3.5" aria-hidden="true" />
                      {listing.saves}
                      <span className="sr-only">saves</span>
                    </span>
                    <span className="w-20 text-right text-sm font-semibold tabular-nums text-ink">
                      {formatPeso(listing.price)}
                    </span>
                    {(listing.status === 'APPROVED' || listing.status === 'PENDING') && (
                      <button
                        type="button"
                        onClick={() => handleTakeDown(listing)}
                        disabled={busyId === listing.id}
                        className="inline-flex h-8 items-center gap-1 rounded-control border border-danger/60 px-2.5 text-xs font-semibold text-danger transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <ShieldOff className="size-3.5" aria-hidden="true" />
                        {busyId === listing.id ? 'Removing…' : 'Take down'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Panel>
  )
}
