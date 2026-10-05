import { X } from 'lucide-react'
import { FILTER_LABELS } from './catalog-filters.js'

/**
 * Removable chips for the active filters.
 *
 * Without these, a shopper who has applied six filters sees a grid that looks
 * unfamiliar and has no obvious way back. Each chip states the filter and its
 * value, so the state of the page is always legible.
 */
export function ActiveFilterChips({ chips, onRemove, onClearAll, className = '' }) {
  if (chips.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
          Filtering by
        </span>

        {chips.map((chip) => (
          <button
            key={`${chip.key}:${chip.value}`}
            type="button"
            onClick={() => onRemove(chip.key, chip.value)}
            className="group inline-flex items-center gap-1.5 rounded-pill bg-primary-50 py-1.5 pl-3 pr-2 text-xs font-bold text-primary-800 ring-1 ring-inset ring-primary-200 transition hover:bg-primary-100"
          >
            <span className="text-primary-600">{FILTER_LABELS[chip.key]}:</span>
            {chip.label}
            <span className="grid size-4 place-items-center rounded-full bg-white/70 transition group-hover:bg-white">
              <X className="size-3" aria-hidden="true" />
            </span>
            <span className="sr-only">Remove this filter</span>
          </button>
        ))}

        {chips.length > 1 && (
          <button
            type="button"
            onClick={onClearAll}
            className="rounded-pill px-2.5 py-1.5 text-xs font-bold text-muted underline underline-offset-2 transition hover:text-danger"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
