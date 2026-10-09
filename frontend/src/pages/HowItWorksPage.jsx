import { ClipboardCheck, ShoppingBag, Store, Truck } from 'lucide-react'
import { Section, SectionHeading } from '../components/ui/Section.jsx'
import { ButtonLink } from '../components/ui/Button.jsx'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'
import { TRUST_PILLARS } from '../content/policy-content.js'
import { BUYER_STEPS, SELLER_STEPS } from '../content/policy-content.js'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'

const BUYER_ICONS = [ShoppingBag, ClipboardCheck, Truck]

/** How buying and selling work, side by side. */
export function HowItWorksPage() {
  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-18">
          <Breadcrumb
            items={[
              { label: 'Home', to: MARKETPLACE_ROUTES.home },
              { label: 'How It Works' },
            ]}
          />
          <div className="mt-6 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
              For buyers and sellers
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              How ReFon works
            </h1>
            <p className="mt-5 text-lg leading-body text-muted">
              Buying a refurbished phone should feel ordinary. Six steps, published
              condition data, and a warranty on eligible devices.
            </p>
          </div>
        </div>
      </div>

      <Section>
        <SectionHeading
          eyebrow="For buyers"
          title="From browsing to enjoying your phone"
          description="Nothing hidden, nothing rushed."
        />

        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {BUYER_STEPS.map((entry, index) => {
            const Icon = BUYER_ICONS[index] ?? ShoppingBag

            return (
              <li
                key={entry.step}
                className="relative overflow-hidden rounded-card-lg border border-line bg-white p-6 shadow-card"
              >
                <span
                  className="absolute -right-3 -top-5 font-display text-7xl font-bold text-primary-50"
                  aria-hidden="true"
                >
                  {entry.step}
                </span>
                <span className="relative grid size-11 place-items-center rounded-2xl bg-primary-50 text-primary-600">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h2 className="relative mt-4 font-display text-lg font-semibold text-ink">
                  {entry.title}
                </h2>
                <p className="relative mt-2 text-sm leading-body text-muted">
                  {entry.description}
                </p>
              </li>
            )
          })}
        </ol>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink to={MARKETPLACE_ROUTES.shop} variant="primary" size="lg">
            Start browsing
          </ButtonLink>
          <ButtonLink to={MARKETPLACE_ROUTES.qualityCheck} variant="secondary" size="lg">
            How we test
          </ButtonLink>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="For sellers"
          title="Sell a phone on ReFon"
          description="Verified sellers only. Every listing is moderated before it reaches buyers."
        />

        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {SELLER_STEPS.map((entry) => (
            <li
              key={entry.step}
              className="rounded-card-lg border border-line bg-white p-6 shadow-card"
            >
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent-700">
                Step {entry.step}
              </span>
              <h2 className="mt-2 font-display text-lg font-semibold text-ink">
                {entry.title}
              </h2>
              <p className="mt-2 text-sm leading-body text-muted">{entry.description}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex justify-center">
          <ButtonLink to={MARKETPLACE_ROUTES.sellerApply} variant="accent" size="lg">
            Sell your phone
          </ButtonLink>
        </div>
      </Section>

      <Section>
        <SectionHeading
          align="center"
          eyebrow="The reason it works"
          title="Why you can trust ReFon refurbished phones"
          description="Six commitments that apply to every listing on the platform."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST_PILLARS.map((pillar, index) => (
            <article
              key={pillar.id}
              className="rounded-card-lg border border-line bg-white p-6 shadow-card"
            >
              <span className="font-display text-sm font-bold text-primary-600">
                0{index + 1}
              </span>
              <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm leading-body text-muted">{pillar.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="navy">
        <div className="mx-auto max-w-3xl text-center">
          <Store className="mx-auto size-10 text-accent-400" aria-hidden="true" />
          <h2 className="mt-5 font-display text-3xl font-bold text-white sm:text-4xl">
            Know the phone before you buy it.
          </h2>
          <p className="mt-4 text-lg leading-body text-primary-100/85">
            Join students and young professionals buying capable phones without
            paying brand-new prices or guessing what they are getting.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink to={MARKETPLACE_ROUTES.shop} variant="accent" size="lg">
              Shop refurbished phones
            </ButtonLink>
            <ButtonLink
              to={MARKETPLACE_ROUTES.about}
              variant="secondary"
              size="lg"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              About ReFon
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  )
}
