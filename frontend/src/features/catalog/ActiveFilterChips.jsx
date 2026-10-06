import { X } from 'lucide-react'
import { FILTER_LABELS } from './catalog-filters.js'

/**
 * Removable chips for the active filters.
 *
 * Without these, a shopper who has applied six filters sees a grid that looks
 * unfamiliar and has no obvious way back. Each chip states the filter and its
 * value, so the state of the page is always legible.
 *
 * Square-cornered with a hairline and a monospace label, matching the filter
 * rail they came from. A pill here would be the only rounded object in the
 * results toolbar.
 */
export function ActiveFilterChips({ chips, onRemove, onClearAll, className = '' }) {
  if (chips.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <ul className="flex flex-wrap items-center gap-2">
        <li className="mr-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
          Filtering by
        </li>

        {chips.map((chip) => (
          <li key={`${chip.key}:${chip.value}`}>
            <button
              type="button"
              onClick={() => onRemove(chip.key, chip.value)}
              className="group inline-flex items-center gap-2 rounded-control border border-line-2 bg-surface py-1.5 pl-2.5 pr-1.5 text-xs font-medium text-ink transition hover:border-primary-950 hover:bg-primary-950 hover:text-white"
            >
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle group-hover:text-primary-300">
                {FILTER_LABELS[chip.key]}:
              </span>
              <span>{chip.label}</span>
              <span className="grid size-4 place-items-center rounded-[2px] bg-surface-2 text-muted transition group-hover:bg-white/15 group-hover:text-white">
                <X className="size-3" aria-hidden="true" />
              </span>
              <span className="sr-only">Remove this filter</span>
            </button>
          </li>
        ))}

        {chips.length > 1 && (
          <li>
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-control px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted underline underline-offset-2 transition hover:text-danger"
            >
              Clear all
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}