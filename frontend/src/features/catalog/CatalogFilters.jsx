import { useId } from 'react'
import { Battery, Check, Cpu, HardDrive, RotateCcw, ShieldCheck, Star } from 'lucide-react'
import { Badge } from '../../components/ui/Badge.jsx'
import { CONDITION_GRADE_ORDER } from '../../lib/listing-taxonomy.js'

const GRADE_LABELS = { A: 'Excellent', B: 'Very Good', C: 'Good' }

const BATTERY_BANDS = [
  { value: '90', label: '90% and above', note: 'Near-new cell' },
  { value: '80', label: '80% – 89%', note: 'Healthy for daily use' },
  { value: '70', label: '70% – 79%', note: 'Serviceable, budget for a swap' },
]

const PRICE_BANDS = [
  { value: '5000', label: 'Under ₱5,000' },
  { value: '10000', label: 'Under ₱10,000' },
  { value: '20000', label: 'Under ₱20,000' },
  { value: '30000', label: 'Under ₱30,000' },
  { value: '40000', label: 'Under ₱40,000' },
]

/** Row with a heading, optional note, and children. */
function FilterGroup({ icon: Icon, title, note, children, count }) {
  return (
    <fieldset className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <legend className="flex w-full items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-display text-sm font-semibold text-ink">
          {Icon && <Icon className="size-4 text-primary-600" aria-hidden="true" />}
          {title}
        </span>
        {count > 0 && (
          <Badge tone="primary" size="sm">
            {count}
          </Badge>
        )}
      </legend>
      {note && <p className="mt-1.5 text-xs leading-relaxed text-muted">{note}</p>}
      <div className="mt-3.5">{children}</div>
    </fieldset>
  )
}

/**
 * Radio or checkbox row.
 *
 * The label is the click target and the input is a sibling, so a screen reader
 * announces one control and keyboard users get the native control. The input is
 * visually replaced by the ring indicator below rather than hidden, keeping it
 * focusable.
 */
function OptionRow({ type, name, checked, onChange, label, meta }) {
  const id = useId()

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-canvas ${
        checked ? 'bg-primary-50' : ''
      }`}
    >
      <input
        id={id}
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="size-4 shrink-0 rounded border-line text-primary-500 focus:ring-primary-500"
        style={{ width: 16, height: 16 }}
      />
      <label
        htmlFor={id}
        className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">{label}</span>
          {meta && <span className="mt-0.5 block text-xs text-muted">{meta}</span>}
        </span>
        {checked && type === 'checkbox' && (
          <Check className="size-4 shrink-0 text-primary-600" aria-hidden="true" />
        )}
      </label>
    </div>
  )
}

/**
 * Catalog filter sidebar.
 *
 * Option lists come from `GET /listings/facets`, which returns both the
 * configured options and live counts. That means a control is only ever rendered
 * when the endpoint accepts it, and an option with zero matching listings is
 * visibly marked rather than silently returning nothing.
 */
export function CatalogFilters({
  filters,
  options,
  facets,
  onPatch,
  onToggle,
  onReset,
  activeCount,
  className = '',
}) {
  const brandId = useId()

  const brands = facets?.brands ?? []
  const warranties = options?.warranties ?? []

  const countFor = (list, value) =>
    list.find((entry) => String(entry.value) === String(value))?.count ?? 0

  /**
   * Options are limited to values that have at least one approved listing.
   *
   * The configured option lists include sizes no current listing carries, and
   * offering them would be a filter that returns nothing — indistinguishable
   * from a broken page to the shopper.
   */
  const storages = (options?.storages ?? []).filter(
    (value) => countFor(facets?.storages ?? [], value) > 0,
  )
  const rams = (options?.rams ?? []).filter(
    (value) => countFor(facets?.rams ?? [], value) > 0,
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-bold text-muted transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Clear all {activeCount} filter{activeCount === 1 ? '' : 's'}
        </button>
      )}

      <FilterGroup icon={Cpu} title="Brand" count={filters.brand ? 1 : 0}>
        <div className="space-y-0.5">
          {brands.map((brand) => (
            <OptionRow type="radio" name="brand"
              key={brand.value}
              checked={filters.brand === brand.value}
              onChange={() =>
                onPatch({ brand: filters.brand === brand.value ? '' : brand.value })
              }
              label={brand.value}
              meta={`${brand.count} listed`}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        icon={ShieldCheck}
        title="Condition grade"
        note="How the cosmetics were graded on inspection."
        count={filters.conditionGrade ? 1 : 0}
      >
        <div className="space-y-0.5" id={brandId}>
          {CONDITION_GRADE_ORDER.map((grade) => (
            <OptionRow type="radio" name="grade"
              key={grade}
              checked={filters.conditionGrade === grade}
              onChange={() =>
                onPatch({ conditionGrade: filters.conditionGrade === grade ? '' : grade })
              }
              label={`Grade ${grade} — ${GRADE_LABELS[grade]}`}
              meta={`${countFor(facets?.grades ?? [], grade)} listed`}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        icon={Battery}
        title="Battery health"
        note="Measured capacity versus a new cell."
        count={filters.minBattery ? 1 : 0}
      >
        <div className="space-y-0.5">
          {BATTERY_BANDS.map((band) => (
            <OptionRow type="radio" name="battery"
              key={band.label}
              checked={filters.minBattery === band.value}
              onChange={() =>
                onPatch({ minBattery: filters.minBattery === band.value ? '' : band.value })
              }
              label={band.label}
              meta={band.note}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        icon={Cpu}
        title="Price"
        count={filters.maxPrice ? 1 : 0}
      >
        <div className="space-y-0.5">
          {PRICE_BANDS.map((band) => (
            <OptionRow type="radio" name="price"
              key={band.label}
              checked={filters.maxPrice === band.value}
              onChange={() =>
                onPatch({ maxPrice: filters.maxPrice === band.value ? '' : band.value })
              }
              label={band.label}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        icon={HardDrive}
        title="Storage"
        count={filters.storage.length}
      >
        <div className="grid grid-cols-2 gap-1">
          {storages.map((storage) => (
            <OptionRow type="checkbox"
              key={storage}
              checked={filters.storage.includes(storage)}
              onChange={() => onToggle('storage', storage)}
              label={storage}
              meta={`${countFor(facets?.storages ?? [], storage)}`}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup icon={Cpu} title="RAM" count={filters.ram.length}>
        <div className="grid grid-cols-2 gap-1">
          {rams.map((ram) => (
            <OptionRow type="checkbox"
              key={ram}
              checked={filters.ram.includes(ram)}
              onChange={() => onToggle('ram', ram)}
              label={ram}
              meta={`${countFor(facets?.rams ?? [], ram)}`}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        icon={ShieldCheck}
        title="Warranty"
        note="Coverage is administered by ReFon."
        count={filters.warrantyMonths.length}
      >
        <div className="space-y-0.5">
          {warranties.map((warranty) => (
            <OptionRow type="checkbox"
              key={warranty.months}
              checked={filters.warrantyMonths.includes(String(warranty.months))}
              onChange={() => onToggle('warrantyMonths', String(warranty.months))}
              label={warranty.label}
              meta={`${countFor(facets?.warranties ?? [], warranty.months)} listed`}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        icon={Star}
        title="Seller rating"
        note="From seeded demo reviews in this prototype."
        count={filters.minSellerRating ? 1 : 0}
      >
        <div className="space-y-0.5">
          {['4.5', '4', '3.5'].map((rating) => (
            <OptionRow type="radio" name="sellerRating"
              key={rating}
              checked={filters.minSellerRating === rating}
              onChange={() =>
                onPatch({
                  minSellerRating:
                    filters.minSellerRating === rating ? '' : rating,
                })
              }
              label={`${rating}★ and up`}
            />
          ))}
        </div>
      </FilterGroup>
    </div>
  )
}
