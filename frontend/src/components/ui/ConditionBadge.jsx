import { getConditionGrade } from '../../lib/listing-taxonomy.js'

/**
 * The graded condition chip.
 *
 * Buyers scan for this before they scan for price, so it always shows the letter
 * grade alongside the plain-language label. The letter sits in a hard-edged
 * square rather than a circle: a grade is a classification, and giving it the
 * same shape as a badge dot would be styling it as decoration.
 */
export function ConditionBadge({ grade, size = 'md', className = '' }) {
  const record = getConditionGrade(grade)
  const padding = size === 'lg' ? 'px-2.5 py-1.5 text-[13px]' : 'px-2 py-1 text-[11px]'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm font-mono font-semibold uppercase tracking-[0.08em] ring-1 ring-inset ${record.chip} ${padding} ${className}`}
    >
      <span className="grid size-[1.15rem] shrink-0 place-items-center rounded-[2px] bg-primary-950 text-[10px] font-bold leading-none text-white">
        {record.id}
      </span>
      {record.label}
    </span>
  )
}