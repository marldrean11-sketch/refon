import { ArrowRight, Store } from 'lucide-react'
import { Section } from '../../components/ui/Section.jsx'
import { ButtonLink } from '../../components/ui/Button.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

/**
 * Final conversion CTA.
 *
 * The closing band is a plate, not a poster: a two-column split with the
 * proposition on the left and the two actions on the right, over a measured
 * grid. Centred text with two buttons and three shield icons underneath was the
 * other half of the "SaaS landing page" shape, and having already used a
 * centred hero, ending on a second centred block made the page rhyme with the
 * template instead of with itself.
 *
 * No countdown, no stock claim — the urgency is real inventory, which the shop
 * page already reflects.
 */
export function FinalCtaSection() {
  return (
    <section id="start" className="relative overflow-hidden border-y border-line bg-page">
      {/* The measured grid, drawn in ink at a low opacity so it reads as a
          technical surface on paper rather than as a lit background. */}
      <div
        className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(17,17,17,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(17,17,17,0.9)_1px,transparent_1px)] [background-size:72px_72px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
              Ready when you are
            </p>
            <h2 className="mt-4 font-display text-[2.25rem] font-bold leading-[1.02] tracking-[-0.04em] text-ink sm:text-5xl">
              Premium Phones.
              <br />
              Smarter Prices.
              <br />
              Tested for You.
            </h2>
            <p className="mt-5 max-w-xl leading-body text-muted">
              Browse quality-tested refurbished smartphones with transparent condition
              grades, published battery health, warranty coverage, and verified sellers.
            </p>
          </div>

          <div className="rounded-card-lg border border-line bg-card p-6 shadow-card sm:p-8">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Two ways in
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <ButtonLink
                to={MARKETPLACE_ROUTES.shop}
                variant="light"
                size="lg"
                className="group"
              >
                Shop Refurbished Phones
                <ArrowRight
                  className="size-4 transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transform-none"
                  aria-hidden="true"
                />
              </ButtonLink>

              <ButtonLink
                to={MARKETPLACE_ROUTES.sellerApply}
                variant="secondary"
                size="lg"
                className="border-line-2 bg-card text-ink hover:border-ink hover:bg-surface-2 hover:text-ink"
              >
                <Store className="size-4" aria-hidden="true" />
                Sell Your Phone
              </ButtonLink>
            </div>

            <dl className="mt-7 grid grid-cols-3 gap-px overflow-hidden rounded-control border border-line bg-line">
              {[
                ['11', 'Inspection checks'],
                ['A/B/C', 'Condition grades'],
                ['7', 'Day returns'],
              ].map(([value, label]) => (
                <div key={label} className="bg-card px-3 py-3">
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <span className="block font-display text-xl font-bold tabular-nums leading-none text-accent-strong">
                      {value}
                    </span>
                    <span className="mt-1.5 block font-mono text-[9px] font-semibold uppercase leading-tight tracking-[0.1em] text-muted">
                      {label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}