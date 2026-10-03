import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownUp,
  Search,
  SearchX,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { BrowseFilters } from '../features/listings/BrowseFilters.jsx'
import { ListingCard } from '../features/listings/listing-card.jsx'
import { useApprovedListings } from '../features/listings/useApprovedListings.js'
import { BrowseResultsSkeleton } from '../features/listings/listing-skeletons.jsx'

const initialFilters = {
  brand: 'ALL',
  minYear: 2015,
  maxYear: 2024,
  minPrice: '',
  maxPrice: '',
}

const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
]

function getActiveFilterCount(filters) {
  return [
    filters.brand !== 'ALL',
    filters.minYear !== 2015,
    filters.maxYear !== 2024,
    filters.minPrice !== '',
    filters.maxPrice !== '',
  ].filter(Boolean).length
}

export function BrowsePage() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const [sortBy, setSortBy] = useState('newest')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterButtonRef = useRef(null)
  const filterCloseButtonRef = useRef(null)
  const filterDialogRef = useRef(null)
  const requestFilters = useMemo(
    () => ({
      brand: filters.brand,
      minYear: filters.minYear,
      maxYear: filters.maxYear,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      search: query.trim(),
      sort: sortBy,
    }),
    [filters, query, sortBy],
  )
  const {
    listings: visibleListings,
    brands,
    isLoading,
    error,
    retry,
  } = useApprovedListings(requestFilters)

  const activeFilterCount = getActiveFilterCount(filters)
  const hasActiveSearch = activeFilterCount > 0 || query.trim().length > 0

  useEffect(() => {
    if (!isFilterOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    const previouslyFocusedElement = document.activeElement
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => {
      filterCloseButtonRef.current?.focus()
    }, 0)

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsFilterOpen(false)
        return
      }

      if (event.key !== 'Tab' || !filterDialogRef.current) {
        return
      }

      const focusableElements = [
        ...filterDialogRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]',
        ),
      ].filter((element) => element.offsetParent !== null)

      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocusedElement instanceof HTMLElement) {
        previouslyFocusedElement.focus()
      }
    }
  }, [isFilterOpen])

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  function resetAll() {
    setQuery('')
    setFilters(initialFilters)
    setSortBy('newest')
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-white">
        <div
          className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(31,78,120,0.12),transparent_60%)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent-800">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Moderated marketplace
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
              Browse verified phones
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-body text-muted sm:text-lg">
              Search models from 2015–2024 and compare the details that matter:
              price, year, storage, condition, and battery health.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-canvas py-10 sm:py-12 lg:py-14">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row">
              <label htmlFor="browse-search" className="relative block flex-1">
                <span className="sr-only">Search by brand or model</span>
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="browse-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by brand or model — try “iPhone” or “Samsung”"
                  className="h-14 w-full rounded-2xl border border-line bg-canvas py-3.5 pl-12 pr-12 text-base text-ink shadow-sm transition duration-200 placeholder:text-slate-400 hover:border-slate-300 sm:text-[15px] focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-100"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl text-muted transition hover:bg-primary-50 hover:text-primary-700"
                    aria-label="Clear search"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </label>

              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:flex">
                <button
                  ref={filterButtonRef}
                  type="button"
                  onClick={() => setIsFilterOpen(true)}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 text-sm font-bold text-ink shadow-sm transition duration-200 hover:border-primary-200 hover:bg-primary-50 lg:hidden"
                  aria-expanded={isFilterOpen}
                  aria-haspopup="dialog"
                  aria-controls="browse-filter-drawer"
                >
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="grid size-6 place-items-center rounded-full bg-primary-500 text-[11px] text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <label htmlFor="browse-sort" className="relative block lg:w-56">
                  <span className="sr-only">Sort listings</span>
                  <ArrowDownUp
                    className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <select
                    id="browse-sort"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="h-14 w-full appearance-none rounded-2xl border border-line bg-white pl-11 pr-9 text-base font-semibold text-ink shadow-sm transition duration-200 hover:border-slate-300 sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted" aria-hidden="true">▼</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="sticky top-24 hidden rounded-card border border-line bg-white p-5 shadow-card lg:block">
              <BrowseFilters
                filters={filters}
                brands={brands}
                onChange={updateFilter}
                onReset={resetAll}
                activeCount={activeFilterCount}
              />
            </aside>

            <div aria-busy={isLoading}>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 aria-live="polite" aria-atomic="true" className="font-display text-2xl font-semibold tracking-tight text-ink">
                    {isLoading
                      ? 'Finding verified phones…'
                      : `${visibleListings.length} ${visibleListings.length === 1 ? 'phone' : 'phones'} found`}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {isLoading
                      ? 'Loading the latest moderated marketplace results.'
                      : 'Every result includes core condition and trust details.'}
                  </p>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="self-start rounded-xl px-3 py-2 text-sm font-bold text-primary-700 transition hover:bg-primary-50"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {error ? (
                <div className="rounded-card border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
                  <p className="font-bold">Listings could not be loaded.</p>
                  <p className="mt-1">{error.message}</p>
                  <button
                    type="button"
                    onClick={retry}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-800 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
                  >
                    Try again
                  </button>
                </div>
              ) : isLoading ? (
                <BrowseResultsSkeleton />
              ) : visibleListings.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              ) : (
                <div className="rounded-card-xl border border-dashed border-primary-200 bg-white px-6 py-16 text-center shadow-sm">
                  <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-50 text-primary-600">
                    <SearchX className="size-8" aria-hidden="true" />
                  </span>
                  <h2 className="mt-6 font-display text-2xl font-semibold text-ink">
                    {hasActiveSearch ? 'No phones match those filters' : 'No approved listings yet'}
                  </h2>
                  <p className="mx-auto mt-3 max-w-md leading-body text-muted">
                    {hasActiveSearch
                      ? 'Try a broader year or price range, or search with a different brand or model.'
                      : 'Approved seller listings will appear here as soon as they pass moderation.'}
                  </p>
                  <button
                    type="button"
                    onClick={hasActiveSearch ? resetAll : retry}
                    className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover"
                  >
                    <SlidersHorizontal className="size-4" aria-hidden="true" />
                    {hasActiveSearch ? 'Reset all filters' : 'Refresh listings'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 z-[60] bg-primary-950/50 backdrop-blur-sm lg:hidden"
              tabIndex={-1}
              aria-label="Close filters"
            />
            <motion.aside
              ref={filterDialogRef}
              id="browse-filter-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Listing filters"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
              className="fixed inset-y-0 right-0 z-[70] w-[min(24rem,92vw)] overflow-y-auto bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl lg:hidden"
            >
              <div className="mb-4 flex justify-end">
                <button
                  ref={filterCloseButtonRef}
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="grid size-11 place-items-center rounded-xl border border-line bg-white text-muted transition hover:bg-canvas hover:text-ink"
                  aria-label="Close filters"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <BrowseFilters
                filters={filters}
                brands={brands}
                onChange={updateFilter}
                onReset={resetAll}
                activeCount={activeFilterCount}
              />
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                disabled={isLoading}
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary-500 px-4 text-sm font-bold text-white shadow-card transition duration-200 hover:bg-primary-600 disabled:cursor-wait disabled:opacity-60"
              >
                {isLoading
                  ? 'Finding phones…'
                  : `Show ${visibleListings.length} ${visibleListings.length === 1 ? 'result' : 'results'}`}
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
