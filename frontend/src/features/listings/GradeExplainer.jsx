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
      className="rounded-card border border-line bg-surface"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
            Condition grading
          </p>
          <h2
            id="grade-explainer-heading"
            className="mt-1.5 font-display text-xl font-bold tracking-tight text-ink"
          >
            This phone is Grade {current.id}
          </h2>
          <p className="mt-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
            {current.label}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-px overflow-hidden rounded-control border border-line bg-line">
          {CONDITION_GRADE_ORDER.map((id) => {
            const isCurrent = id === current.id
            const tier = CONDITION_GRADES[id]

            return (
              <span
                key={id}
                aria-current={isCurrent ? 'true' : undefined}
                className={`grid size-11 place-items-center font-display text-base font-bold ${
                  isCurrent ? 'bg-primary-950 text-white' : 'bg-surface text-muted'
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

      <div className="px-5 py-5 sm:px-6">
        <div className={`rounded-control p-4 ring-1 ring-inset ${current.chip}`}>
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            What Grade {current.id} means
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink/80">{current.description}</p>
        </div>

        {conditionNotes && (
          <div className="mt-5 border-t border-line pt-5">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
              Seller notes on this specific device
            </h3>
            <p className="mt-2 text-sm leading-body text-ink">{conditionNotes}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="grade-scale"
          className="mt-5 inline-flex items-center gap-2 rounded-control border border-line-2 px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary-900 transition hover:border-primary-950 hover:bg-primary-950 hover:text-white"
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
          <dl className="mt-4 border-t border-line">
            {CONDITION_GRADE_ORDER.map((id) => {
              const tier = CONDITION_GRADES[id]

              return (
                <div
                  key={id}
                  className={`grid gap-x-5 gap-y-1.5 border-b border-line py-4 sm:grid-cols-[3rem_1fr] ${
                    id === current.id ? 'bg-surface-2' : ''
                  }`}
                >
                  <dt className="flex items-center gap-2">
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-[2px] font-display text-sm font-bold ${
                        id === current.id
                          ? 'bg-primary-950 text-white'
                          : 'bg-surface-2 text-muted ring-1 ring-inset ring-line'
                      }`}
                    >
                      {id}
                    </span>
                    <span className="text-sm font-bold text-ink">{tier.label}</span>
                  </dt>
                  <dd className="text-sm leading-body text-muted sm:col-start-2">
                    {tier.description}
                    {id === current.id && (
                      <span className="mt-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-700">
                        This phone
                      </span>
                    )}
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
      </div>
    </section>
  )
}