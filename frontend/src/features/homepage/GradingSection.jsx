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
 * rather than a footnote. Each tier shows its letter, its plain-language
 * meaning, and a battery figure in the band that tier typically occupies, so a
 * buyer can match the grade to what they will actually receive.
 */
export function GradingSection() {
  return (
    <Section tone="white" id="grading">
      <SectionHeading
        eyebrow="Condition grading"
        title="Every phone gets an A, B, or C"
        description="Cosmetic condition used to be the one thing a marketplace could not agree on. Now it is a letter, published before you pay."
      />

      <ul className="mt-12 grid gap-5 lg:grid-cols-3">
        {CONDITION_GRADE_ORDER.map((gradeId) => {
          const grade = getConditionGrade(gradeId)
          const tierIndex = CONDITION_GRADE_ORDER.indexOf(gradeId)

          return (
            <li
              key={gradeId}
              className="flex flex-col rounded-card-lg border border-line bg-white p-6 shadow-card"
            >
              <ConditionBadge grade={gradeId} size="lg" className="self-start" />
              <h3 className="mt-4 font-display text-xl font-semibold text-ink">
                {grade.headline}
              </h3>
              <p className="mt-1 text-sm font-semibold text-primary-700">{grade.summary}</p>
              <p className="mt-3 flex-1 text-sm leading-body text-muted">
                {grade.description}
              </p>

              <div className="mt-5 rounded-2xl bg-canvas p-4">
                <BatteryHealth percent={SAMPLE_BATTERY[gradeId]} size="sm" />
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Typically seen in this band. Your listing shows the exact measured
                  figure for that phone.
                </p>
              </div>

              {/* Tier position on the A/B/C scale. Labelled, because a bare bar
                  next to the battery bar would read as a second measurement. */}
              <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-muted">
                <span
                  className={`inline-block size-2.5 rounded-full ${grade.bar}`}
                  aria-hidden="true"
                />
                Tier {tierIndex + 1} of 3, best first
              </p>
            </li>
          )
        })}
      </ul>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink to={MARKETPLACE_ROUTES.qualityCheck} variant="primary" size="lg">
          See how we test every phone
        </ButtonLink>
        <Link
          to={categoryHref(getCategory('premium-refurbished'))}
          className="group inline-flex items-center gap-2 text-sm font-bold text-primary-700 transition hover:text-primary-500"
        >
          Shop Grade A only
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </Link>
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-muted">
        <BatteryCharging className="size-4 shrink-0 text-accent-600" aria-hidden="true" />
        Battery health is measured on every phone and shown on every card and product
        page.
      </p>
    </Section>
  )
}
