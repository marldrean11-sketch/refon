import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Ban, Search, ShieldCheck } from 'lucide-react'
import { Panel, PanelHeader } from '../design/Surfaces.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { formatDate } from '../../lib/format.js'
import { useAuth } from '../auth/useAuth.js'
import { getAdminUsersRequest, suspendUserRequest, unsuspendUserRequest } from './admin-api.js'

const ROLE_FILTERS = [
  { value: '', label: 'Everyone' },
  { value: 'BUYER', label: 'Buyers' },
  { value: 'SELLER', label: 'Sellers' },
  { value: 'ADMIN', label: 'Admins' },
]

const STATUS_FILTERS = [
  { value: '', label: 'Any status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

const SEARCH_DELAY_MS = 300

const chip = (active) =>
  `rounded-control px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
    active ? 'bg-accent text-page' : 'text-muted hover:bg-surface-2 hover:text-ink'
  }`

/**
 * Every account on ReFon, with a suspend switch. A suspended account is signed
 * out on its next request and cannot sign back in until it is reinstated.
 */
export function AdminUsersPanel() {
  const { user: me } = useAuth()
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async (filters) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getAdminUsersRequest(filters)
      setUsers(response.users)
    } catch (requestError) {
      setError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load({ role, status, q: query }).catch(() => {})
    }, SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [load, role, status, query])

  async function toggle(account) {
    setActionError('')
    let reason = ''
    if (!account.suspended) {
      const answer = window.prompt(
        `Suspend ${account.name}? They are signed out and cannot sign in until reinstated.\n\nReason (optional):`,
        '',
      )
      if (answer === null) return
      reason = answer
    }
    setBusyId(account.id)
    try {
      if (account.suspended) await unsuspendUserRequest(account.id)
      else await suspendUserRequest(account.id, reason)
      await load({ role, status, q: query })
    } catch (requestError) {
      setActionError(requestError.message ?? 'That change could not be saved.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Panel className="mt-6" data-testid="admin-users">
      <PanelHeader
        kicker="Accounts"
        title="Users"
        description="Every buyer, seller and admin. Suspend an account to sign it out and block it."
      />

      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:px-6">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Search users</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            className="h-10 w-full rounded-control border border-line-2 bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter users by role">
            {ROLE_FILTERS.map((filter) => (
              <button
                key={filter.value || 'all'}
                type="button"
                aria-pressed={role === filter.value}
                onClick={() => setRole(filter.value)}
                className={chip(role === filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter users by status">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value || 'any'}
                type="button"
                aria-pressed={status === filter.value}
                onClick={() => setStatus(filter.value)}
                className={chip(status === filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
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
        ) : isLoading && users.length === 0 ? (
          <div className="space-y-3" role="status" aria-label="Loading users">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No users match.</p>
        ) : (
          <ul className={`divide-y divide-line ${isLoading ? 'opacity-60' : ''}`}>
            {users.map((account) => {
              const canToggle = account.role !== 'ADMIN' && account.id !== me?.id
              return (
                <li
                  key={account.id}
                  className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-ink">{account.name}</span>
                      <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                        {account.role}
                      </span>
                      {account.suspended && (
                        <span className="rounded-sm bg-red-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-danger">
                          Suspended
                        </span>
                      )}
                      {!account.emailVerified && (
                        <span className="text-[11px] text-subtle">email not verified</span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {account.email}
                      {account.phone ? ` · ${account.phone}` : ''}
                      {account.seller ? ` · ${account.seller.businessName}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-subtle">
                      Joined {formatDate(account.joinedAt)} · {account.orders} orders · {account.reviews} reviews ·{' '}
                      {account.inquiries} inquiries
                      {account.suspendedReason ? ` · Reason: ${account.suspendedReason}` : ''}
                    </p>
                  </div>
                  {canToggle && (
                    <button
                      type="button"
                      onClick={() => toggle(account)}
                      disabled={busyId === account.id}
                      className={`inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-control border px-3 text-xs font-semibold transition disabled:opacity-50 sm:self-auto ${
                        account.suspended
                          ? 'border-accent/60 text-accent hover:bg-accent hover:text-page'
                          : 'border-danger/60 text-danger hover:bg-red-50'
                      }`}
                    >
                      {account.suspended ? (
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Ban className="size-3.5" aria-hidden="true" />
                      )}
                      {busyId === account.id ? 'Saving…' : account.suspended ? 'Reinstate' : 'Suspend'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Panel>
  )
}
