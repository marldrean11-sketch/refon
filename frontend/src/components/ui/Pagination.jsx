import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Pagination control.
 *
 * Always renders a first/previous/next/last cluster plus a page window so a
 * shopper who lands on page 7 of a filtered search is never stuck.
 */
export function Pagination({ page, totalPages, onPageChange, className = '' }) {
  const safeTotal = Math.max(1, Number(totalPages) || 1)
  const current = Math.min(Math.max(1, Number(page) || 1), safeTotal)

  if (safeTotal <= 1) {
    return null
  }

  const pages = pageWindow(current, safeTotal)

  const buttonClasses =
    'inline-flex size-10 items-center justify-center rounded-xl text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40'
  const activeClasses = 'bg-primary-500 text-white shadow-card'
  const idleClasses = 'border border-line bg-white text-muted hover:border-primary-200 hover:text-primary-700'

  return (
    <nav className={`flex flex-wrap items-center justify-center gap-2 ${className}`} aria-label="Pagination">
      <button
        type="button"
        className={`${buttonClasses} ${idleClasses}`}
        onClick={() => onPageChange(1)}
        disabled={current === 1}
        aria-label="Go to first page"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        <span className="sr-only">First page</span>
      </button>
      <button
        type="button"
        className={`${buttonClasses} ${idleClasses}`}
        onClick={() => onPageChange(current - 1)}
        disabled={current === 1}
      >
        <span aria-hidden="true">‹</span>
        <span className="sr-only">Previous page</span>
      </button>

      {pages.map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            className={`${buttonClasses} ${entry === current ? activeClasses : idleClasses}`}
            onClick={() => onPageChange(entry)}
            aria-current={entry === current ? 'page' : undefined}
            aria-label={`Page ${entry}`}
          >
            {entry}
          </button>
        ),
      )}

      <button
        type="button"
        className={`${buttonClasses} ${idleClasses}`}
        onClick={() => onPageChange(current + 1)}
        disabled={current === safeTotal}
      >
        <span aria-hidden="true">›</span>
        <span className="sr-only">Next page</span>
      </button>
      <button
        type="button"
        className={`${buttonClasses} ${idleClasses}`}
        onClick={() => onPageChange(safeTotal)}
        disabled={current === safeTotal}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
        <span className="sr-only">Last page</span>
      </button>
    </nav>
  )
}

/** Builds a short page window with ellipses: 1 … 6 7 8 … 20 */
function pageWindow(current, total, span = 2) {
  const pages = new Set([1, total, current])

  for (let offset = 1; offset <= span; offset += 1) {
    pages.add(current - offset)
    pages.add(current + offset)
  }

  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)
  const window = []
  let previous = 0

  for (const page of sorted) {
    if (previous && page - previous > 1) {
      window.push('gap')
    }

    window.push(page)
    previous = page
  }

  return window
}
