import { useEffect, useState } from 'react'
import { ArrowUpDown, SlidersHorizontal, X } from 'lucide-react'
import { Link } from 'react-router-dom'
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
} from '../features/catalog/catalog-filters.js'
import { useCatalog, useCatalogFacets } from '../features/catalog/useCatalog.js'
import { ListingCard } from '../features/listings/listing-card.jsx'
import { SearchBar } from '../components/layout/SearchBar.jsx'
import { Container } from '../features/design/Container.jsx'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'

/**
 * The shop.
 *
 * The old page opened with a full-width white band containing a breadcrumb, an
 * `h1`, a paragraph, and a search box, then dropped into a two-column grid whose
 * left column was a rounded card with an `h2` reading "Filters". That is a
 * generic listing layout and it wasted a third of the fold on furniture.
 *
 * What it does now:
 *
 *   - A compact masthead: breadcrumb, title, and live result count on one band,
 *     with the sort control inline on the right. The search field moves into the
 *     filter rail, where it belongs, because on this page it *is* a filter.
 *   - The filter rail becomes a real **control column**: a bordered panel with a
 *     search field, grouped filter sets, and a clear-all action pinned at the
 *     top. It is the instrument panel for the results grid beside it.
 *   - The result count and sort share a single toolbar above the grid, so the
 *     two facts about the result set are stated in one place.
 *   - The grid is denser on desktop (four columns) because the cards now carry
 *     their measurements in a compact strip rather than in stacked boxes.
 *
 * Filter state still lives entirely in the URL, so the back button, a refresh,
 * and a pasted link all produce the same result set.
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
      ? `${pagination.total} phone${pagination.total === 1 ? '' : 's'}`
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
    <div className="min-h-screen bg-canvas">
      {/* ── Masthead. One band, three facts: where you are, what this is, how
          many results exist. */}
      <div className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-10">
          <Breadcrumb
            items={[
              { label: 'Home', to: MARKETPLACE_ROUTES.home },
              { label: 'Shop Phones' },
            ]}
          />

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold tracking-[-0.03em] text-ink sm:text-[2.5rem] sm:leading-[1.05]">
                Shop tested refurbished phones
              </h1>
              <p className="mt-3 max-w-2xl leading-body text-muted">
                Every listing shows its condition grade, measured battery health, and
                warranty term. Filter down to what you can prove, not what is claimed.
              </p>
            </div>

            <div className="shrink-0 border-l-2 border-primary-950 pl-4 lg:mb-1">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
                Matching
              </p>
              <p
                className="font-display text-2xl font-bold tabular-nums leading-none tracking-tight text-ink"
                aria-live="polite"
              >
                {resultSummary}
              </p>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-8 sm:py-10">
        <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
          {/* ── The control column. */}
          <aside className="hidden lg:block" aria-label="Catalog filters">
            <div className="sticky top-24 overflow-hidden rounded-card border border-line bg-surface">
              <div className="border-b border-line px-4 py-3.5">
                <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
                  Refine
                </h2>
                <p className="mt-1 font-mono text-[11px] text-subtle">
                  {brands.length} brands in stock
                </p>
              </div>

              <div className="border-b border-line p-4">
                <SearchBar defaultValue={filters.search} />
              </div>

              <div className="max-h-[calc(100dvh-16rem)] overflow-y-auto px-4 py-4">
                {sidebar}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            {/* ── Toolbar. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-control border border-line-2 bg-surface px-3.5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-ink transition hover:border-primary-950 lg:hidden"
                  aria-expanded={isDrawerOpen}
                  aria-controls="catalog-filter-drawer"
                >
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Filters
                  {activeCount > 0 && (
                    <span className="rounded-[3px] bg-primary-950 px-1.5 py-0.5 font-mono text-[10px] text-white">
                      {activeCount}
                    </span>
                  )}
                </button>

                <p
                  className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted lg:hidden"
                  aria-live="polite"
                >
                  {resultSummary}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="size-4 shrink-0 text-subtle" aria-hidden="true" />
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
                  selectClassName="h-10 border-line-2 text-[13px]"
                  className="w-full sm:w-52"
                />
              </div>
            </div>

            {chips.length > 0 && (
              <ActiveFilterChips
                chips={chips}
                onRemove={clearOne}
                onClearAll={reset}
                className="mt-4"
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
                  <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
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
              <div className="mt-12 flex flex-col items-start gap-4 rounded-card border border-dashed border-line-2 bg-surface px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                    Looking for something specific
                  </p>
                  <h2 className="mt-1.5 font-display text-lg font-bold tracking-tight text-ink">
                    Cannot find the grade you need?
                  </h2>
                  <p className="mt-1.5 text-sm text-muted">
                    Tell us what you are looking for and we will tell you when it lands.
                  </p>
                </div>
                <Link
                  to={MARKETPLACE_ROUTES.contact}
                  className="inline-flex shrink-0 items-center gap-2 rounded-control border border-line-2 bg-surface px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary-900 transition hover:border-primary-950 hover:bg-primary-950 hover:text-white"
                >
                  Request a phone
                </Link>
              </div>
            )}
          </div>
        </div>
      </Container>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-modal lg:hidden">
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
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-surface shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
                Refine results
              </h2>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="grid size-10 place-items-center rounded-control border border-line-2 text-muted transition hover:bg-surface-2 hover:text-ink"
                aria-label="Close filters"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>

            <div className="border-b border-line px-5 py-4">
              <SearchBar defaultValue={filters.search} />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">{sidebar}</div>

            <footer className="flex items-center gap-3 border-t border-line bg-canvas px-5 py-4">
              <button
                type="button"
                onClick={reset}
                disabled={activeCount === 0}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-control border border-line-2 bg-surface px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-control bg-primary-950 px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-primary-800"
              >
                Show {pagination?.total ?? listings.length} results
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}