import { Check } from 'lucide-react'
import { useToast } from '../../components/ui/Toast.jsx'
import { COMPARE_LIMIT } from './compare-context.js'
import { useCompare } from './useCompare.js'

/**
 * The "Compare" checkbox on a listing card.
 *
 * A real checkbox to assistive technology (`role="checkbox"`), sized as a 32px
 * target, and stacked above the card's full-size link so a tap on it never opens
 * the product page. A full list is explained with a toast rather than silently
 * ignoring the tap.
 */
export function CompareToggle({ listing, className = '' }) {
  const compare = useCompare()
  const toast = useToast()
  const checked = compare.has(listing.id)

  function toggle(event) {
    event.preventDefault()
    event.stopPropagation()

    if (checked) {
      compare.remove(listing.id)
      return
    }

    if (!compare.add(listing.id)) {
      toast.info(`You can compare up to ${COMPARE_LIMIT} phones`, {
        description: 'Remove one from the comparison tray first.',
      })
    }
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`Compare ${listing.brand} ${listing.model}`}
      onClick={toggle}
      className={`relative z-40 inline-flex min-h-8 items-center gap-1.5 rounded-control px-1 text-xs font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      <span
        aria-hidden="true"
        className={`grid size-4 place-items-center rounded-[5px] border transition-colors duration-150 ${
          checked ? 'border-ink bg-ink text-white' : 'border-line-2 bg-card'
        }`}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      Compare
    </button>
  )
}
