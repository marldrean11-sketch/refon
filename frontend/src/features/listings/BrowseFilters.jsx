import { RotateCcw, SlidersHorizontal } from 'lucide-react'

const years = Array.from({ length: 10 }, (_, index) => 2015 + index)

const controlClassName =
  'h-12 w-full rounded-xl border border-line bg-white px-3.5 text-base font-semibold text-ink shadow-sm sm:text-sm transition duration-200 hover:border-line-2 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100'

export function BrowseFilters({ filters, brands, onChange, onReset, activeCount }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <SlidersHorizontal className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Filters</h2>
            <p className="text-xs text-muted">Refine the marketplace</p>
          </div>
        </div>
        {activeCount > 0 && (
          <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-page">
            {activeCount}
          </span>
        )}
      </div>

      <div className="mt-6 space-y-6">
        <fieldset>
          <legend className="text-sm font-semibold text-ink">Brand</legend>
          <select
            aria-label="Filter by brand"
            value={filters.brand}
            onChange={(event) => onChange('brand', event.target.value)}
            className={`${controlClassName} mt-2.5`}
          >
            <option value="ALL">All brands</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-ink">Year range</legend>
          <div className="mt-2.5 grid grid-cols-2 gap-3">
            <label>
              <span className="sr-only">Minimum year</span>
              <select
                aria-label="Minimum model year"
                value={filters.minYear}
                onChange={(event) => onChange('minYear', Number(event.target.value))}
                className={controlClassName}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Maximum year</span>
              <select
                aria-label="Maximum model year"
                value={filters.maxYear}
                onChange={(event) => onChange('maxYear', Number(event.target.value))}
                className={controlClassName}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-ink">Price range</legend>
          <div className="mt-2.5 grid grid-cols-2 gap-3">
            <label>
              <span className="sr-only">Minimum price</span>
              <span className="relative block">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">₱</span>
                <input
                  aria-label="Minimum price"
                  type="number"
                  min="0"
                  step="10"
                  inputMode="numeric"
                  value={filters.minPrice}
                  onChange={(event) => onChange('minPrice', event.target.value)}
                  placeholder="Min"
                  className={`${controlClassName} pl-7`}
                />
              </span>
            </label>
            <label>
              <span className="sr-only">Maximum price</span>
              <span className="relative block">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">₱</span>
                <input
                  aria-label="Maximum price"
                  type="number"
                  min="0"
                  step="10"
                  inputMode="numeric"
                  value={filters.maxPrice}
                  onChange={(event) => onChange('maxPrice', event.target.value)}
                  placeholder="Max"
                  className={`${controlClassName} pl-7`}
                />
              </span>
            </label>
          </div>
        </fieldset>

        <button
          type="button"
          onClick={onReset}
          disabled={activeCount === 0}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-4 text-sm font-bold text-muted transition duration-200 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset filters
        </button>
      </div>
    </div>
  )
}
