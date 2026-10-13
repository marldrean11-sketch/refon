import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Repeat } from 'lucide-react'
import { Panel, PanelHeader } from '../design/Surfaces.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { formatDateTime, formatPeso } from '../../lib/format.js'
import { getAdminTradeInsRequest, updateTradeInRequest } from './admin-api.js'

const STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'DONE', label: 'Done' },
  { value: 'DECLINED', label: 'Declined' },
]

const STATUS_STYLES = {
  NEW: 'bg-accent-tint text-accent',
  CONTACTED: 'bg-amber-50 text-amber-700',
  DONE: 'bg-surface-2 text-muted',
  DECLINED: 'bg-red-50 text-danger',
}

/** Trade-in requests sent from the estimator, for the team to follow up. */
export function AdminTradeInsPanel() {
  const [filter, setFilter] = useState('')
  const [requests, setRequests] = useState([])
  const [newCount, setNewCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async (status) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getAdminTradeInsRequest(status)
      setRequests(response.requests)
      setNewCount(response.newCount)
    } catch (requestError) {
      setError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load(filter).catch(() => {})
  }, [load, filter])

  async function setStatus(request, status) {
    setBusyId(request.id)
    try {
      const response = await updateTradeInRequest(request.id, { status })
      setRequests((current) => current.map((entry) => (entry.id === request.id ? response.request : entry)))
      setNewCount((count) => count + (status === 'NEW' ? 1 : 0) - (request.status === 'NEW' ? 1 : 0))
    } catch (requestError) {
      setError(requestError)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Panel className="mt-6" data-testid="admin-trade-ins">
      <PanelHeader
        kicker="Trade-ins"
        title={newCount ? `Trade-in requests · ${newCount} new` : 'Trade-in requests'}
        description="Sent from the trade-in estimator. Reach out, check the phone, then mark it done."
      />

      <div className="flex flex-wrap gap-1.5 border-b border-line px-5 py-3 sm:px-6" role="group" aria-label="Filter trade-ins">
        {[{ value: '', label: 'All' }, ...STATUSES].map((option) => (
          <button
            key={option.value || 'all'}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`rounded-control px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
              filter === option.value ? 'bg-accent text-page' : 'text-muted hover:bg-surface-2 hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="px-5 py-4 sm:px-6">
        {error ? (
          <p role="alert" className="flex gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error.message}
          </p>
        ) : isLoading && requests.length === 0 ? (
          <div className="space-y-3" role="status" aria-label="Loading trade-ins">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
            <Repeat className="size-4" aria-hidden="true" />
            No trade-in requests yet.
          </p>
        ) : (
          <ul className={`divide-y divide-line ${isLoading ? 'opacity-60' : ''}`}>
            {requests.map((request) => (
              <li key={request.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">
                      {request.brand} {request.model}
                    </span>
                    <span
                      className={`rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        STATUS_STYLES[request.status] ?? ''
                      }`}
                    >
                      {request.status}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-accent">
                      {formatPeso(request.estimateLow)}–{formatPeso(request.estimateHigh)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {[request.answers?.storage, request.answers?.grade, request.answers?.battery, request.answers?.working]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="mt-1 text-sm text-ink">
                    {request.name} · <span className="select-all">{request.contact}</span>
                    {request.hasAccount ? <span className="text-subtle"> · has an account</span> : null}
                  </p>
                  {request.note && <p className="mt-1 text-sm italic text-muted">&ldquo;{request.note}&rdquo;</p>}
                  <p className="mt-1 text-xs text-subtle">{formatDateTime(request.createdAt)}</p>
                </div>
                <label className="shrink-0 text-xs text-muted">
                  <span className="sr-only">Status</span>
                  <select
                    value={request.status}
                    disabled={busyId === request.id}
                    onChange={(event) => setStatus(request, event.target.value)}
                    className="h-9 rounded-control border border-line-2 bg-surface-2 px-2 text-sm text-ink focus:border-accent focus:outline-none"
                  >
                    {STATUSES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
