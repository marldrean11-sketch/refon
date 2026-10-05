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
 */
export function InspectionSection() {
  return (
    <Section tone="navy" id="testing">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent-300">
          <Microscope className="size-4" aria-hidden="true" />
          Quality tested
        </span>
        <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Eleven checks run before a phone can be listed
        </h2>
        <p className="mt-4 text-lg leading-body text-primary-100/85">
          A listing only goes live after the device passes a functional inspection, a
          lock and IMEI check, and a moderator review. This is the checklist, written
          out.
        </p>
      </div>

      <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INSPECTION_CHECKS.map((check) => (
          <li
            key={check.id}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent-500/20 text-accent-300">
              <CheckCircle2 className="size-4.5" style={{ width: 18, height: 18 }} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-white">{check.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-primary-200/70">
                {check.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <ol className="mt-12 grid gap-4 border-t border-white/10 pt-10 sm:grid-cols-2 lg:grid-cols-5">
        {INSPECTION_STAGES.map((stage) => (
          <li key={stage.step}>
            <span className="font-display text-xs font-bold uppercase tracking-[0.14em] text-accent-300">
              Step {stage.step}
            </span>
            <p className="mt-2 font-display text-base font-semibold text-white">
              {stage.title}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-primary-200/70">
              {stage.summary}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex justify-center">
        <ButtonLink to={MARKETPLACE_ROUTES.qualityCheck} variant="accent" size="lg">
          How we test every phone
        </ButtonLink>
      </div>
    </Section>
  )
}
