import { useId } from 'react'
import { Battery, Cpu, HardDrive, RotateCcw, ShieldCheck, Star, Tag } from 'lucide-react'
import { CONDITION_GRADE_ORDER } from '../../lib/listing-taxonomy.js'

const GRADE_LABELS = { A: 'Excellent', B: 'Very Good', C: 'Good' }

const BATTERY_BANDS = [
  { value: '90', label: '90% and above', note: 'near-new cell' },
  { value: '80', label: '80% – 89%', note: 'healthy for daily use' },
  { value: '70', label: '70% – 79%', note: 'budget for a swap' },
]

const PRICE_BANDS = [
  { value: '5000', label: 'Under ₱5,000' },
  { value: '10000', label: 'Under ₱10,000' },
  { value: '20000', label: 'Under ₱20,000' },
  { value: '30000', label: 'Under ₱30,000' },
  { value: '40000', label: 'Under ₱40,000' },
]

const ICONS = {
  Brand: Cpu,
  'Condition grade': ShieldCheck,
  'Battery health': Battery,
  Price: Tag,
  Storage: HardDrive,
  RAM: Cpu,
  Warranty: ShieldCheck,
  'Seller rating': Star,
}

/** One filter set: a labelled group of rows, separated by a hairline. */
function FilterGroup({ title, note, children, count }) {
  const Icon = ICONS[title]

  return (
    <fieldset className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <legend className="flex w-full items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
          {Icon && <Icon className="size-3.5 text-subtle" aria-hidden="true" />}
          {title}
        </span>
        {count > 0 && (
          <span className="rounded-[3px] bg-primary-950 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-white">
            {count}
          </span>
        )}
      </legend>
      {note && <p className="mt-1.5 text-xs leading-relaxed text-muted">{note}</p>}
      <div className="mt-3">{children}</div>
    </fieldset>
  )
}

/**
 * Radio or checkbox row.
 *
 * The label is the click target and the input is a sibling, so a screen reader
 * announces one control and keyboard users get the native control. The input is
 * visually replaced by the indicator below rather than hidden, keeping it
 * focusable.
 *
 * The selected row inverts to Obsidian with white text instead of gaining a
 * coloured background. On a filter rail where every option is a peer, an
 * inverted row is legible from across a laptop screen and does not add a
 * saturated colour to a page whose only colours mean something.
 */
function OptionRow({ type, name, checked, onChange, label, meta, columns }) {
  const id = useId()

  return (
    <div className="min-w-0">
      <input
        id={id}
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className={`flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-control px-2.5 py-2 text-sm transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-950 ${
          checked
            ? 'bg-primary-950 text-white'
            : 'text-ink hover:bg-surface-2'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className={`grid size-4 shrink-0 place-items-center border ${
              type === 'radio' ? 'rounded-full' : 'rounded-[2px]'
            } ${
              checked ? 'border-white bg-white' : 'border-line-2 bg-surface'
            }`}
            aria-hidden="true"
          >
            {checked ? (
              <span
                className={`block bg-primary-950 ${
                  type === 'radio' ? 'size-1.5 rounded-full' : 'size-1.5 rounded-[1px]'
                }`}
              />
            ) : null}
          </span>
          <span className="min-w-0 truncate">{label}</span>
        </span>
        {meta && (
          <span
            className={`shrink-0 font-mono text-[11px] tabular-nums ${
              checked ? 'text-primary-300' : 'text-subtle'
            }`}
          >
            {meta}
          </span>
        )}
      </label>
    </div>
  )
}

/**
 * Catalog filter rail.
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
    <div className={`space-y-5 ${className}`}>
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex w-full items-center justify-center gap-2 rounded-control border border-line-2 bg-surface px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted transition hover:border-primary-950 hover:bg-primary-950 hover:text-white"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Clear all {activeCount} filter{activeCount === 1 ? '' : 's'}
        </button>
      )}

      <FilterGroup title="Brand" count={filters.brand ? 1 : 0}>
        <div className="space-y-0.5">
          {brands.map((brand) => (
            <OptionRow
              type="radio"
              name="brand"
              key={brand.value}
              checked={filters.brand === brand.value}
              onChange={() =>
                onPatch({ brand: filters.brand === brand.value ? '' : brand.value })
              }
              label={brand.value}
              meta={String(brand.count)}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        title="Condition grade"
        note="How the cosmetics were graded on inspection."
        count={filters.conditionGrade ? 1 : 0}
      >
        <div className="space-y-0.5">
          {CONDITION_GRADE_ORDER.map((grade) => (
            <OptionRow
              type="radio"
              name="grade"
              key={grade}
              checked={filters.conditionGrade === grade}
              onChange={() =>
                onPatch({ conditionGrade: filters.conditionGrade === grade ? '' : grade })
              }
              label={`${grade} — ${GRADE_LABELS[grade]}`}
              meta={String(countFor(facets?.grades ?? [], grade))}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        title="Battery health"
        note="Measured capacity versus a new cell. 90% is near-new; below 80% is priced for a possible swap."
        count={filters.minBattery ? 1 : 0}
      >
        <div className="space-y-0.5">
          {BATTERY_BANDS.map((band) => (
            <OptionRow
              type="radio"
              name="battery"
              key={band.label}
              checked={filters.minBattery === band.value}
              onChange={() =>
                onPatch({ minBattery: filters.minBattery === band.value ? '' : band.value })
              }
              label={`${band.label} · ${band.note}`}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Price" count={filters.maxPrice ? 1 : 0}>
        <div className="space-y-0.5">
          {PRICE_BANDS.map((band) => (
            <OptionRow
              type="radio"
              name="price"
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

      <FilterGroup title="Storage" count={filters.storage.length}>
        <div className="grid grid-cols-2 gap-0.5">
          {storages.map((storage) => (
            <OptionRow
              type="checkbox"
              key={storage}
              checked={filters.storage.includes(storage)}
              onChange={() => onToggle('storage', storage)}
              label={storage}
              meta={String(countFor(facets?.storages ?? [], storage))}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="RAM" count={filters.ram.length}>
        <div className="grid grid-cols-2 gap-0.5">
          {rams.map((ram) => (
            <OptionRow
              type="checkbox"
              key={ram}
              checked={filters.ram.includes(ram)}
              onChange={() => onToggle('ram', ram)}
              label={ram}
              meta={String(countFor(facets?.rams ?? [], ram))}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        title="Warranty"
        note="Coverage is administered by ReFon."
        count={filters.warrantyMonths.length}
      >
        <div className="space-y-0.5">
          {warranties.map((warranty) => (
            <OptionRow
              type="checkbox"
              key={warranty.months}
              checked={filters.warrantyMonths.includes(String(warranty.months))}
              onChange={() => onToggle('warrantyMonths', String(warranty.months))}
              label={warranty.label}
              meta={String(countFor(facets?.warranties ?? [], warranty.months))}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        title="Seller rating"
        note="From seeded demo reviews in this prototype."
        count={filters.minSellerRating ? 1 : 0}
      >
        <div className="space-y-0.5">
          {['4.5', '4', '3.5'].map((rating) => (
            <OptionRow
              type="radio"
              name="sellerRating"
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