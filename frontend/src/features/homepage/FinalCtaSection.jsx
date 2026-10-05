import { ArrowRight, ShieldCheck, Store } from 'lucide-react'
import { Section, SectionHeading } from '../../components/ui/Section.jsx'
import { ButtonLink } from '../../components/ui/Button.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

/**
 * Final conversion CTA.
 *
 * Repeats the value proposition with the two actions that matter: start
 * shopping, or start selling. No countdown, no stock claim — the urgency is
 * real inventory, which the shop page already reflects.
 */
export function FinalCtaSection() {
  return (
    <Section tone="navy" id="start">
      <div className="mx-auto max-w-3xl text-center">
        <SectionHeading
          tone="light"
          align="center"
          eyebrow="Ready when you are"
          title="Premium Phones. Smarter Prices. Tested for You."
          description="Browse quality-tested refurbished smartphones with transparent condition grades, published battery health, warranty coverage, and verified sellers."
        />

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to={MARKETPLACE_ROUTES.shop} variant="accent" size="lg">
            Shop Refurbished Phones
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
          <ButtonLink
            to={MARKETPLACE_ROUTES.sellerApply}
            variant="secondary"
            size="lg"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Store className="size-4" aria-hidden="true" />
            Sell Your Phone
          </ButtonLink>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-semibold text-primary-100/70">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-accent-400" aria-hidden="true" />
            11-point inspection
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-accent-400" aria-hidden="true" />
            Published battery health
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-accent-400" aria-hidden="true" />
            7-day return guarantee
          </span>
        </div>
      </div>
    </Section>
  )
}
