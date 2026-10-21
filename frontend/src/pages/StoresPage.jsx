import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, Search, Store } from 'lucide-react'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'
import { Pagination } from '../components/ui/Pagination.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { Container } from '../features/design/Container.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import { StoreCard } from '../features/seller/components/StoreCard.jsx'
import { getStoreDirectoryRequest } from '../features/seller/storefront-api.js'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'

const SORTS = [
  { value: 'rating', label: 'Top rated' },
  { value: 'sales', label: 'Most sales' },
  { value: 'newest', label: 'Newest' },
]

const SEARCH_DELAY_MS = 300

/**
 * "Visit Stores": every verified phone store on ReFon. Search by name, filter by
 * city, sort, and — when signed in — switch to just the stores you follow. The
 * filters live in the URL, so a filtered list can be shared.
 */
export function StoresPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const sort = params.get('sort') ?? 'rating'
  const city = params.get('city') ?? ''
  const following = params.get('following') === '1' && Boolean(user)
  const page = Math.max(1, Number(params.get('page')) || 1)
  const q = params.get('q') ?? ''

  const [query, setQuery] = useState(q)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  function update(changes) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value === null || value === undefined || value === false) next.delete(key)
      else next.set(key, String(value))
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }

  // Typing updates the URL after a short pause, not on every key.
  useEffect(() => {
    if (query === q) return undefined
    const timer = window.setTimeout(() => update({ q: query.trim() }), SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  useEffect(() => {
    const controller = new AbortController()
    // eslint-disable-next-line react/set-state-in-effect
    setIsLoading(true)
    // eslint-disable-next-line react/set-state-in-effect
    setError(null)
    getStoreDirectoryRequest({ q, city, sort, page, following: following ? 'true' : '' }, controller.signal)
      .then((response) => setData(response))
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [q, city, sort, page, following])

  const stores = data?.stores ?? []
  const chip = (active) =>
    `rf-bounce inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
      active ? 'bg-chalk text-page' : 'border border-line-2 text-ink hover:border-subtle'
    }`

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-line bg-page">
        <Container className="py-10 sm:py-12">
          <Breadcrumb items={[{ label: 'Home', to: MARKETPLACE_ROUTES.home }, { label: 'Phone Stores' }]} />
          <p className="mt-6 font-mono text-[12px] uppercase tracking-[0.14em] text-accent">Visit stores</p>
          <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
            Phone Stores
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted">
            Every store here is verified by ReFon. Browse their shelves, check their ratings, and follow the
            ones you like to hear when they list a new phone.
          </p>
        </Container>
      </div>

      <Container className="py-8">
        <div className="flex flex-col gap-4">
          {user && user.role !== 'ADMIN' && (
            <div className="flex gap-2" role="group" aria-label="Which stores">
              <button type="button" aria-pressed={!following} onClick={() => update({ following: '' })} className={chip(!following)}>
                All stores
              </button>
              <button type="button" aria-pressed={following} onClick={() => update({ following: '1' })} className={chip(following)}>
                Following
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block w-full sm:max-w-sm">
              <span className="sr-only">Search stores</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search store name"
                data-testid="store-search"
                className="h-11 w-full rounded-full border border-line-2 bg-well pl-10 pr-4 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>

            <label className="block sm:w-48">
              <span className="sr-only">City</span>
              <select
                value={city}
                onChange={(event) => update({ city: event.target.value })}
                data-testid="store-city"
                className="h-11 w-full rounded-full border border-line-2 bg-well px-4 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="">All cities</option>
                {(data?.cities ?? []).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-1.5 sm:ml-auto" role="group" aria-label="Sort stores">
              {SORTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={sort === option.value}
                  onClick={() => update({ sort: option.value === 'rating' ? '' : option.value })}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                    sort === option.value ? 'bg-accent text-page' : 'text-muted hover:bg-surface-2 hover:text-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8" aria-busy={isLoading}>
          {error ? (
            <p role="alert" className="flex gap-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error.message ?? 'The stores could not be loaded.'}
            </p>
          ) : isLoading && !data ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading stores">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-96 w-full" />
              ))}
            </div>
          ) : stores.length === 0 ? (
            <div className="rounded-card-lg border border-dashed border-line-2 px-6 py-14 text-center">
              <Store className="mx-auto size-8 text-subtle" aria-hidden="true" />
              <p className="mt-3 font-display text-lg font-bold text-ink">
                {following ? "You don't follow any stores yet." : 'No stores match.'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {following ? 'Tap Follow on a store to see it here.' : 'Try another name or city.'}
              </p>
              {following && (
                <button type="button" onClick={() => update({ following: '' })} className="mt-4 text-sm font-semibold text-accent hover:underline">
                  See all stores
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted">
                {data.pagination.total === 1 ? '1 store' : `${data.pagination.total} stores`}
              </p>
              <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${isLoading ? 'opacity-60' : ''}`}>
                {stores.map((store) => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </div>
              <Pagination
                className="mt-8"
                page={page}
                totalPages={data.pagination.totalPages}
                onPageChange={(next) => {
                  update({ page: next })
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            </>
          )}
        </div>

        <p className="mt-10 text-center text-sm text-muted">
          Want your own store on ReFon?{' '}
          <Link to={MARKETPLACE_ROUTES.sellerApply} className="font-semibold text-accent hover:underline">
            Start selling
          </Link>
        </p>
      </Container>
    </div>
  )
}
