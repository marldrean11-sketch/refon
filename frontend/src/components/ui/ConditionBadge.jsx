import { getConditionGrade } from '../../lib/listing-taxonomy.js'

/**
 * The graded condition chip. Buyers scan for this before they scan for price, so
 * it always shows the letter grade alongside the plain-language label.
 */
export function ConditionBadge({ grade, size = 'md', className = '' }) {
  const record = getConditionGrade(grade)
  const padding = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-[11px]'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill font-bold uppercase tracking-[0.1em] ring-1 ring-inset ${record.chip} ${padding} ${className}`}
    >
      <span className="grid size-4 place-items-center rounded-full bg-white/80 text-[9px] leading-none text-ink">
        {record.id}
      </span>
      {record.label}
    </span>
  )
}
