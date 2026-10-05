import { getConditionGrade } from '../../lib/listing-taxonomy.js'

/**
 * Compact grade chip for dense contexts like filter bars and comparison tables,
 * where the full label would crowd the row.
 */
export function GradeBadge({ grade, className = '' }) {
  const record = getConditionGrade(grade)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ring-1 ring-inset ${record.chip} ${className}`}
    >
      <span className="size-3.5 rounded-full bg-white/80 text-center text-[9px] leading-[0.875rem] text-ink">
        {record.id}
      </span>
      {record.label}
    </span>
  )
}
