import { ArrowRight } from 'lucide-react'
import { Section, SectionHeading } from '../../components/ui/Section.jsx'
import { ButtonLink } from '../../components/ui/Button.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { BUYER_STEPS } from '../../content/policy-content.js'

/**
 * How it works.
 *
 * Six short buyer steps. Deliberately plain: the buyer journey is the thing a
 * first-time refurbished-phone shopper needs to feel safe about, and detail
 * here would obscure it.
 *
 * Laid out as a single horizontal run of six numbered columns on wide screens and
 * a vertical run on narrow ones, which is what makes it read as one process
 * rather than as six independent features. The connecting hairline between the
 * numbers is the only decoration; it does the work that a stack of cards was
 * previously doing badly.
 */
export function HowItWorksSection() {
  return (
    <Section tone="canvas" id="how-it-works">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="How it works"
          title="Six steps from browsing to owning"
          description="No surprises between choosing a phone and receiving it."
          className="sm:max-w-2xl"
        />
        <ButtonLink to={MARKETPLACE_ROUTES.howItWorks} variant="secondary" size="md">
          Full buyer and seller guide
          <ArrowRight className="size-4" aria-hidden="true" />
        </ButtonLink>
      </div>

      <ol className="mt-12 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-6">
        {BUYER_STEPS.map((step) => (
          <li key={step.step} className="relative border-t border-line pt-5">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-2xl font-bold tabular-nums leading-none tracking-tight text-ink">
                {String(step.step).padStart(2, '0')}
              </span>
              <span
                className="h-px flex-1 self-center bg-line-2"
                aria-hidden="true"
              />
            </div>
            <h3 className="mt-4 font-display text-base font-bold leading-snug tracking-tight text-ink">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-body text-muted">{step.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}