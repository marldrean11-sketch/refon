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

      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BUYER_STEPS.map((step) => (
          <li
            key={step.step}
            className="relative overflow-hidden rounded-card-lg border border-line bg-white p-6 shadow-card"
          >
            <span
              className="absolute -right-2 -top-4 font-display text-6xl font-bold text-primary-50"
              aria-hidden="true"
            >
              {step.step}
            </span>
            <span className="relative text-xs font-bold uppercase tracking-[0.14em] text-primary-600">
              Step {step.step}
            </span>
            <h3 className="relative mt-2 font-display text-lg font-semibold text-ink">
              {step.title}
            </h3>
            <p className="relative mt-2 text-sm leading-body text-muted">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
