import { Link } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'
import { useOwnsBottomActionBar } from '../../lib/bottom-action-bar.js'
import { COMPARE_LIMIT, comparePath } from './compare-context.js'
import { useCompare } from './useCompare.js'

/**
 * A slim bar that appears once a phone is picked for comparison.
 *
 * Below `lg` it docks above the mobile tab bar; from `lg` it floats as a pill at
 * the bottom centre. It stays off pages that own the bottom edge (product pages,
 * with their own action bar) and off the compare page itself.
 */
export function CompareTray({ hidden = false }) {
  const compare = useCompare()
  const ownsBottom = useOwnsBottomActionBar()
  const count = compare.ids.length

  if (hidden || ownsBottom || count === 0) {
    return null
  }

  return (
    <div
      role="region"
      aria-label="Phones to compare"
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-header mx-auto flex max-w-md items-center gap-3 rounded-control border border-line-2 bg-card py-2 pl-5 pr-2 shadow-pop lg:bottom-6"
    >
      <p className="min-w-0 flex-1 text-sm text-ink" aria-live="polite">
        <span className="font-bold tabular-nums">{count}</span> of {COMPARE_LIMIT} picked
        {count < 2 && <span className="text-muted"> · pick one more</span>}
      </p>

      <button
        type="button"
        onClick={compare.clear}
        aria-label="Clear the comparison"
        className="grid size-9 shrink-0 place-items-center rounded-control text-muted transition-colors hover:bg-panel hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X className="size-4" aria-hidden="true" />
      </button>

      {count >= 2 ? (
        <Link
          to={comparePath(compare.ids)}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-primary-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Compare
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className="inline-flex h-10 shrink-0 items-center rounded-control bg-panel px-4 text-sm font-semibold text-muted">
          Compare
        </span>
      )}
    </div>
  )
}
