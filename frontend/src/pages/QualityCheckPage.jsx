import { useState } from 'react'
import {
  BatteryCharging,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Microscope,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { Section, SectionHeading } from '../components/ui/Section.jsx'
import { ButtonLink } from '../components/ui/Button.jsx'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'
import { ConditionBadge } from '../components/ui/ConditionBadge.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { INSPECTION_CHECKS, CONDITION_GRADE_ORDER, getConditionGrade } from '../lib/listing-taxonomy.js'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'
import { INSPECTION_STAGES } from '../content/policy-content.js'
import { FloatingLoops } from '../components/brand/FloatingLoops.jsx'
import { BatteryExplainer } from '../features/listings/BatteryExplainer.jsx'

const STAGE_ICONS = [Microscope, Cpu, ClipboardCheck, Badge, ShieldCheck]

/**
 * "How We Test Every Phone".
 *
 * This is the page that answers the objection the whole marketplace exists to
 * remove, so it states the process in plain language and shows the exact
 * checklist rather than describing it vaguely.
 */
export function QualityCheckPage() {
  const [activeStage, setActiveStage] = useState(0)
  const stage = INSPECTION_STAGES[activeStage]
  const StageIcon = STAGE_ICONS[activeStage] ?? Microscope

  return (
    <>
      <div className="relative overflow-hidden border-b border-line bg-page text-ink">
        <FloatingLoops />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Breadcrumb
            items={[
              { label: 'Home', to: MARKETPLACE_ROUTES.home },
              { label: 'How We Test' },
            ]}
          />
          <div className="mt-6 max-w-3xl">
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent">
              Our quality process
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              How We Test Every Phone
            </h1>
            <p className="mt-5 text-lg leading-body text-muted">
              Trust in refurbished phones comes down to one question: what actually
              happened to this device? We answer it with five documented stages,
              an eleven-point functional checklist, and a published condition grade.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to={MARKETPLACE_ROUTES.shop} variant="accent" size="lg">
                See graded phones
              </ButtonLink>
              <ButtonLink
                to={MARKETPLACE_ROUTES.howItWorks}
                variant="secondary"
                size="lg"
              >
                How buying works
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>

      <Section>
        <SectionHeading
          eyebrow="Five stages"
          title="From inspection to verified status"
          description="A phone only reaches the catalog after passing every stage. Select a stage to see exactly what it covers."
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <ol className="space-y-3">
            {INSPECTION_STAGES.map((entry, index) => {
              const Icon = STAGE_ICONS[index] ?? Microscope
              const isActive = index === activeStage

              return (
                <li key={entry.step}>
                  <button
                    type="button"
                    onClick={() => setActiveStage(index)}
                    aria-pressed={isActive}
                    className={`flex w-full items-start gap-4 rounded-card-lg border p-5 text-left transition duration-200 ${
                      isActive
                        ? 'border-primary-200 bg-white shadow-card-hover'
                        : 'border-line bg-white/60 hover:border-primary-100 hover:bg-white'
                    }`}
                  >
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                        isActive ? 'bg-accent text-page' : 'bg-primary-50 text-primary-600'
                      }`}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-[0.12em] text-primary-600">
                        Step {entry.step}
                      </span>
                      <span className="mt-1 block font-display text-lg font-semibold text-ink">
                        {entry.title}
                      </span>
                      <span className="mt-1 block text-sm leading-body text-muted">
                        {entry.summary}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <div
            className="rounded-card-xl border border-line bg-white p-7 shadow-card"
            aria-live="polite"
          >
            <div className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-50 text-accent-700">
                <StageIcon className="size-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-700">
                  Step {stage.step} of {INSPECTION_STAGES.length}
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold text-ink">
                  {stage.title}
                </h3>
              </div>
            </div>

            <p className="mt-4 text-sm leading-body text-muted">{stage.summary}</p>

            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {stage.checks.map((check) => (
                <li
                  key={check}
                  className="flex items-start gap-2.5 rounded-2xl bg-canvas px-4 py-3 text-sm font-semibold text-ink"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-600" aria-hidden="true" />
                  {check}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section>
        <div id="battery" className="scroll-mt-28">
          <BatteryExplainer />
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="The eleven-point checklist"
          title="What passes before a phone can be listed"
          description="This exact checklist runs on every device. A product page shows which points passed on that specific phone."
        />

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INSPECTION_CHECKS.map((check) => (
            <li
              key={check.id}
              className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-700">
                <CheckCircle2 className="size-4.5" style={{ width: 18, height: 18 }} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">{check.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  {check.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex items-center justify-center gap-3 rounded-card-lg border border-line bg-white px-6 py-5 text-center">
          <BatteryCharging className="size-5 text-accent-600" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink">
            Battery health is measured on every phone and published on the listing before
            you pay.
          </p>
        </div>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Condition grading"
          title="The A, B, C scale, explained"
          description="Cosmetics become a letter you can read at a glance. Nothing is described only as “good condition”."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {CONDITION_GRADE_ORDER.map((gradeId) => {
            const grade = getConditionGrade(gradeId)

            return (
              <article
                key={gradeId}
                className={`rf-spotlight rf-lift ${grade.hoverBorder} flex flex-col rounded-card-lg border border-line bg-white p-6 shadow-card`}
              >
                <ConditionBadge grade={gradeId} size="lg" className="self-start" />
                <h3 className="mt-4 font-display text-xl font-semibold text-ink">
                  {grade.headline}
                </h3>
                <p className="mt-1 text-sm font-semibold text-primary-700">{grade.summary}</p>
                <p className="mt-3 flex-1 text-sm leading-body text-muted">{grade.description}</p>
                <div
                  className="mt-5 h-2 overflow-hidden rounded-pill bg-well"
                  role="progressbar"
                  aria-label={`${grade.headline} tier on the grading scale`}
                  aria-valuemin={1}
                  aria-valuemax={3}
                  aria-valuenow={4 - CONDITION_GRADE_ORDER.indexOf(gradeId)}
                >
                  <div
                    className={`h-full rounded-pill ${grade.bar}`}
                    style={{
                      width: `${((4 - CONDITION_GRADE_ORDER.indexOf(gradeId)) / 3) * 100}%`,
                    }}
                  />
                </div>
              </article>
            )
          })}
        </div>
      </Section>

      <Section tone="navy">
        <div className="mx-auto max-w-3xl text-center">
          <Smartphone className="mx-auto size-10 text-accent-400" aria-hidden="true" />
          <h2 className="mt-5 font-display text-3xl font-bold text-ink sm:text-4xl">
            Every listing shows its own inspection results
          </h2>
          <p className="mt-4 text-lg leading-body text-muted">
            Open any phone and you will see its grade, its measured battery health, and
            which checks passed on that device — not a generic policy page.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink to={MARKETPLACE_ROUTES.shop} variant="accent" size="lg">
              Browse tested phones
            </ButtonLink>
            <ButtonLink
              to={MARKETPLACE_ROUTES.warranty}
              variant="secondary"
              size="lg"
            >
              View warranty policy
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  )
}
