import { CheckCircle2, Microscope } from 'lucide-react'
import { Section, SectionHeading } from '../../components/ui/Section.jsx'
import { ButtonLink } from '../../components/ui/Button.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { INSPECTION_STAGES } from '../../content/policy-content.js'
import { INSPECTION_CHECKS } from '../../lib/listing-taxonomy.js'

/**
 * Quality inspection.
 *
 * States the eleven checks that run on every phone, then compresses the
 * five-stage process into a single row so a visitor sees both the detail and
 * the shape of the process without a second page load.
 *
 * The checklist is presented as a numbered two-column table on Obsidian rather
 * than as a grid of cards. It is a checklist — a thing you read down — so it is
 * typeset like one, and the numbering makes the count of eleven something you
 * can verify by looking rather than something you have been told.
 */
export function InspectionSection() {
  return (
    <Section tone="muted" id="testing">
      <SectionHeading
        eyebrow="Quality tested"
        title="Eleven checks run before a phone can be listed"
        description="A listing only goes live after the device passes a functional inspection, a lock and IMEI check, and a moderator review. This is the checklist, written out."
        className="max-w-3xl"
        action={
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-strong">
            <Microscope className="size-4" aria-hidden="true" />
            Standard RF-INSP-11
          </span>
        }
      />

      <ol className="mt-12 grid gap-x-8 gap-y-0 border-t border-line-2 sm:grid-cols-2">
        {INSPECTION_CHECKS.map((check, index) => (
          <li
            key={check.id}
            className="flex items-start gap-4 border-b border-line-2 py-4"
          >
            <span className="w-7 shrink-0 pt-0.5 font-mono text-xs font-semibold tabular-nums text-subtle">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                <CheckCircle2 className="size-4 shrink-0 text-accent" aria-hidden="true" />
                {check.label}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">
                {check.detail}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <ol className="mt-14 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
        {INSPECTION_STAGES.map((stage) => (
          <li key={stage.step}>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-strong">
              Step {stage.step}
            </span>
            <p className="mt-2.5 font-display text-base font-bold tracking-tight text-ink">
              {stage.title}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              {stage.summary}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-wrap gap-3">
        <ButtonLink to={MARKETPLACE_ROUTES.qualityCheck} variant="primary" size="lg">
          How we test every phone
        </ButtonLink>
        <ButtonLink to={MARKETPLACE_ROUTES.healthCheck} variant="secondary" size="lg">
          Test your own phone
        </ButtonLink>
      </div>
    </Section>
  )
}