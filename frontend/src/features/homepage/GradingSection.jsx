import { ArrowRight, BatteryCharging } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Section, SectionHeading } from '../../components/ui/Section.jsx'
import { ConditionBadge } from '../../components/ui/ConditionBadge.jsx'
import { BatteryHealth } from '../../components/ui/BatteryHealth.jsx'
import { ButtonLink } from '../../components/ui/Button.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { categoryHref, getCategory } from '../../content/categories.js'
import {
  CONDITION_GRADE_ORDER,
  getConditionGrade,
} from '../../lib/listing-taxonomy.js'

/** A representative measured figure per grade, used only inside the explainer. */
const SAMPLE_BATTERY = { A: 94, B: 84, C: 76 }

/**
 * Condition grading.
 *
 * The grading scale is ReFon's core differentiator, so it gets a full section
 * rather than a footnote.
 *
 * It is typeset as a comparison table — three numbered columns sharing hairline
 * rules — because grading is a comparison. The previous version was three tall
 * cards with a badge, a heading, and a nested rounded battery panel each, which
 * made the tiers look like separate products rather than three rungs on one
 * scale. A large letter, the label, a one-line definition, and a measurement
 * band is what a reader actually compares.
 */
export function GradingSection() {
  return (
    <Section tone="white" id="grading">
      <SectionHeading
        eyebrow="Condition grading"
        title="Every phone gets an A, B, or C"
        description="Cosmetic condition used to be the one thing a marketplace could not agree on. Now it is a letter, published before you pay. Grading covers cosmetics only — every function is covered separately by the inspection checklist."
      />

      <ul className="mt-12 grid gap-px overflow-hidden rounded-card-lg border border-line bg-line lg:grid-cols-3">
        {CONDITION_GRADE_ORDER.map((gradeId, index) => {
          const grade = getConditionGrade(gradeId)

          return (
            <li key={gradeId} className="flex flex-col bg-surface p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <span className="font-display text-5xl font-bold leading-none tracking-tight text-ink">
                  {gradeId}
                </span>
                <ConditionBadge grade={gradeId} />
              </div>

              <h3 className="mt-5 text-title font-bold tracking-tight text-ink">
                {grade.label}
              </h3>
              <p className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-700">
                {grade.summary}
              </p>
              <p className="mt-4 flex-1 text-sm leading-body text-muted">
                {grade.description}
              </p>

              <div className="mt-6 border-t border-line pt-5">
                <BatteryHealth percent={SAMPLE_BATTERY[gradeId]} size="sm" />
                <p className="mt-2.5 text-xs leading-relaxed text-muted">
                  Typically seen in this band. Your listing shows the exact measured
                  figure for that phone.
                </p>
              </div>

              {/* Tier position on the A/B/C scale. Labelled, because a bare bar
                  next to the battery bar would read as a second measurement. */}
              <p className="mt-5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
                Tier {index + 1} of 3 · best first
              </p>
            </li>
          )
        })}
      </ul>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <ButtonLink to={MARKETPLACE_ROUTES.qualityCheck} variant="primary" size="lg">
          See how we test every phone
        </ButtonLink>
        <Link
          to={categoryHref(getCategory('premium-refurbished'))}
          className="group inline-flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-800 transition hover:text-primary-950"
        >
          Shop Grade A only
          <ArrowRight
            className="size-4 transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </Link>
      </div>

      <p className="mt-8 flex items-center gap-2 text-xs text-muted">
        <BatteryCharging className="size-4 shrink-0 text-accent-600" aria-hidden="true" />
        Battery health is measured on every phone and shown on every card and product
        page.
      </p>
    </Section>
  )
}