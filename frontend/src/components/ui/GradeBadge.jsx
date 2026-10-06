import { getConditionGrade } from '../../lib/listing-taxonomy.js'

/**
 * Compact grade chip for dense contexts like filter bars and comparison tables,
 * where the full label would crowd the row.
 */
export function GradeBadge({ grade, className = '' }) {
  const record = getConditionGrade(grade)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ring-1 ring-inset ${record.chip} ${className}`}
    >
      <span className="grid size-3.5 place-items-center rounded-[2px] bg-primary-950 text-[9px] font-bold leading-none text-white">
        {record.id}
      </span>
      {record.label}
    </span>
  )
}