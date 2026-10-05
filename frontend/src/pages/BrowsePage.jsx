import { useEffect, useState } from 'react'
import { ChevronDown, LayoutGrid, SlidersHorizontal, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button.jsx'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'
import { ErrorState, NoResultsState } from '../components/ui/StateViews.jsx'
import { Pagination } from '../components/ui/Pagination.jsx'
import { SelectField } from '../components/ui/SelectField.jsx'
import { ProductGridSkeleton } from '../components/ui/Skeleton.jsx'
import { CatalogFilters } from '../features/catalog/CatalogFilters.jsx'
import { ActiveFilterChips } from '../features/catalog/ActiveFilterChips.jsx'
import {
  activeFilterChips,
  countActiveFilters,
  hasAnyFilter,
  toApiQuery,
} from '../features/catalog/catalog-filters.js'
import { useCatalog, useCatalogFacets } from '../features/catalog/useCatalog.js'
import { ListingCard } from '../features/listings/listing-card.jsx'
import { SearchBar } from '../components/layout/SearchBar.jsx'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'

/**
 * Shop page.
 *
 * Filter state lives entirely in the URL, so the back button, a refresh, and a
 * pasted link all produce the same result set. The sidebar reads its option
 * lists from the API rather than hardcoding them, which is what guarantees a
 * control never appears for a filter the endpoint would ignore.
 */
export function BrowsePage() {
  const {
    listings,
    pagination,
    brands,
    filters,
    isLoading,
    error,
    setFilters,
    setPage,
    toggleFilter,
    clearOne,
    reset,
    retry,
  } = useCatalog()

  const { facets, options } = useCatalogFacets()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const chips = activeFilterChips(filters)
  const activeCount = countActiveFilters(filters)
  const isFiltered = hasAnyFilter(filters)

  // Body scroll lock while the mobile filter drawer is open.
  useEffect(() => {
    if (!isDrawerOpen) {
      return undefined
    }

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setIsDrawerOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isDrawerOpen])

  const resultSummary = isLoading
    ? 'Loading phones…'
    : pagination
      ? `${pagination.total} phone${pagination.total === 1 ? '' : 's'} found`
      : ''

  const sortOptions = (options?.sorts ?? []).map((entry) => ({
    value: entry.value,
    label: entry.label,
  }))

  const sidebar = (
    <CatalogFilters
      filters={filters}
      options={options}
      facets={facets}
      activeCount={activeCount}
      onPatch={setFilters}
      onToggle={toggleFilter}
      onReset={reset}
    />
  )

  return (
    <div className="min-h-screen">
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <Breadcrumb
            items={[
              { label: 'Home', to: MARKETPLACE_ROUTES.home },
              { label: 'Shop Phones' },
            ]}
          />
          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Shop tested refurbished phones
              </h1>
              <p className="mt-3 text-base leading-body text-muted">
                Every listing shows its condition grade, measured battery health, and
                warranty term. Filter down to what you can prove, not what is claimed.
              </p>
            </div>

            <SearchBar
              className="w-full lg:max-w-sm"
              defaultValue={filters.search}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[17rem_1fr] lg:gap-10">
          <aside className="hidden lg:block" aria-label="Catalog filters">
            <div className="sticky top-24 rounded-card-lg border border-line bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Filters</h2>
              <p className="mt-1 text-xs text-muted">
                    {brands.length} brands in stock
              </p>
              <div className="mt-6">{sidebar}</div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-muted" aria-live="polite">
                {resultSummary}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-bold text-ink shadow-sm transition hover:border-primary-200 hover:bg-primary-50 lg:hidden"
                  aria-expanded={isDrawerOpen}
                  aria-controls="catalog-filter-drawer"
                >
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Filters
                  {activeCount > 0 && (
                    <span className="rounded-pill bg-primary-500 px-1.5 text-[10px] font-bold text-white">
                      {activeCount}
                    </span>
                  )}
                </button>

                <SelectField
                  label="Sort by"
                  srOnlyLabel
                  value={filters.sort}
                  onChange={(event) => setFilters({ sort: event.target.value })}
                  options={
                    sortOptions.length > 0
                      ? sortOptions
                      : [{ value: 'recommended', label: 'Recommended' }]
                  }
                  selectClassName="h-12 text-sm"
                  className="w-full sm:w-56"
                />
              </div>
            </div>

            {chips.length > 0 && (
              <ActiveFilterChips
                chips={chips}
                onRemove={clearOne}
                onClearAll={reset}
                className="mt-5"
              />
            )}

            <div className="mt-6">
              {error ? (
                <ErrorState
                  title="Phones could not be loaded"
                  description={error.message}
                  onRetry={retry}
                />
              ) : isLoading ? (
                <ProductGridSkeleton count={12} />
              ) : listings.length === 0 ? (
                <NoResultsState onClearFilters={isFiltered ? reset : undefined} />
              ) : (
                <>
                  <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {listings.map((listing) => (
                      <li key={listing.id} className="flex">
                        <ListingCard listing={listing} />
                      </li>
                    ))}
                  </ul>

                  {pagination && (
                    <Pagination
                      page={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={setPage}
                      className="mt-12"
                    />
                  )}
                </>
              )}
            </div>

            {!isLoading && listings.length > 0 && (
              <div className="mt-12 flex flex-col items-center gap-3 rounded-card-lg border border-line bg-white px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink">
                    Cannot find the grade you need?
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Tell us what you are looking for and we will tell you when it lands.
                  </p>
                </div>
                <Link
                  to={MARKETPLACE_ROUTES.contact}
                  className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-primary-700 transition hover:border-primary-200 hover:bg-primary-50"
                >
                  Request a phone
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-[120] lg:hidden">
          <div
            className="absolute inset-0 bg-primary-950/60 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            id="catalog-filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Catalog filters"
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <LayoutGrid className="size-4 text-primary-600" aria-hidden="true" />
                Filters
              </h2>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="grid size-10 place-items-center rounded-xl text-muted transition hover:bg-canvas hover:text-ink"
                aria-label="Close filters"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">{sidebar}</div>

            <footer className="flex items-center gap-3 border-t border-line bg-canvas px-5 py-4">
              <Button variant="secondary" size="md" fullWidth onClick={reset} disabled={activeCount === 0}>
                Clear all
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => setIsDrawerOpen(false)}
              >
                Show {pagination?.total ?? listings.length} results
                <ChevronDown className="size-4 -rotate-90" aria-hidden="true" />
              </Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
