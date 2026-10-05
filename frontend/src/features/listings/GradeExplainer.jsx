import { useState } from 'react'
import { ChevronDown, ShieldCheck } from 'lucide-react'
import {
  CONDITION_GRADES,
  CONDITION_GRADE_ORDER,
} from '../../lib/listing-taxonomy.js'

/**
 * What the condition grade actually means.
 *
 * A letter is meaningless on its own. The buyer's real question is "how used will
 * this look, and what am I agreeing to?", so every tier is spelled out and the
 * phone's own grade is called out rather than making the shopper hunt for it.
 *
 * The definitions come from `lib/listing-taxonomy.js`, the same source the
 * catalog filters and the grader use, so the explanation cannot drift from the
 * grading policy it is describing.
 */
export function GradeExplainer({ grade, conditionNotes }) {
  const [isOpen, setIsOpen] = useState(false)
  const current = CONDITION_GRADES[grade] ?? CONDITION_GRADES.C

  return (
    <section
      aria-labelledby="grade-explainer-heading"
      className="rounded-card border border-line bg-white p-6 shadow-card sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
            Condition grading
          </p>
          <h2
            id="grade-explainer-heading"
            className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink"
          >
            This phone is Grade {current.id}
          </h2>
          <p className="mt-1.5 text-sm font-semibold text-accent-700">{current.label}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {CONDITION_GRADE_ORDER.map((id) => {
            const isCurrent = id === current.id
            const tier = CONDITION_GRADES[id]

            return (
              <span
                key={id}
                aria-current={isCurrent ? 'true' : undefined}
                className={`inline-flex size-11 items-center justify-center rounded-2xl font-display text-lg font-bold ring-1 ring-inset ${
                  isCurrent
                    ? 'bg-ink text-white ring-ink'
                    : 'bg-canvas text-muted ring-line'
                }`}
              >
                {id}
                <span className="sr-only">
                  {tier.label}
                  {isCurrent ? ' — this phone' : ''}
                </span>
              </span>
            )
          })}
        </div>
      </div>

      <div className={`mt-6 rounded-2xl ${current.chip} p-5 ring-1 ring-inset`}>
        <p className="flex items-center gap-2 font-display text-base font-bold text-ink">
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          What Grade {current.id} means
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">{current.description}</p>
      </div>

      {conditionNotes && (
        <div className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
            Seller notes on this specific device
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink">{conditionNotes}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="grade-scale"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary-700 transition hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        {isOpen ? 'Hide the full grading scale' : 'What do grades A, B, and C mean?'}
        <ChevronDown
          className={`size-4 transition-transform duration-200 motion-reduce:transform-none ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      <div id="grade-scale" hidden={!isOpen}>
        <dl className="mt-4 space-y-3">
          {CONDITION_GRADE_ORDER.map((id) => {
            const tier = CONDITION_GRADES[id]

            return (
              <div
                key={id}
                className={`rounded-2xl border p-4 ${
                  id === current.id ? 'border-primary-300 bg-primary-50' : 'border-line bg-canvas'
                }`}
              >
                <dt className="flex items-center gap-2">
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-lg font-display text-sm font-bold ${
                      id === current.id ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-line'
                    }`}
                  >
                    {id}
                  </span>
                  <span className="font-display text-sm font-bold text-ink">{tier.label}</span>
                  {id === current.id && (
                    <span className="rounded-pill bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                      This phone
                    </span>
                  )}
                </dt>
                <dd className="mt-2 pl-9 text-sm leading-relaxed text-muted">
                  {tier.description}
                </dd>
              </div>
            )
          })}
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Grading covers cosmetics only. Every function is covered separately by the
          inspection checklist, which is published per device.
        </p>
      </div>
    </section>
  )
}