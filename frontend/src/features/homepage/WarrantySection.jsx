import { ArrowRight, RotateCcw, ShieldCheck, Undo2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Section, SectionHeading } from '../../components/ui/Section.jsx'
import { ButtonLink } from '../../components/ui/Button.jsx'
import { ReturnPolicyBadge, WarrantyBadge } from '../../components/ui/WarrantyBadge.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { WARRANTY_HIGHLIGHTS } from '../../content/home-content.js'

/**
 * Warranty and returns.
 *
 * The single biggest reason people hesitate on refurbished phones is "what if
 * it stops working". This section answers that in the buyer's language before
 * they reach a product page.
 */
export function WarrantySection() {
  return (
    <Section tone="white" id="warranty">
      <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-pill bg-accent-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent-800">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Protection
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Warranty and returns, stated before you pay
          </h2>
          <p className="mt-4 text-lg leading-body text-muted">
            The risk in buying refurbished is not the phone. It is the uncertainty
            about what happens if something is wrong. We remove it with published
            terms and an administrator who answers.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <WarrantyBadge months={6} size="lg" linkToPolicy />
            <ReturnPolicyBadge size="lg" />
          </div>

          <ul className="mt-8 space-y-4">
            {WARRANTY_HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-accent-50 text-accent-700">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                </span>
                <p className="text-sm leading-body text-muted">
                  <span className="font-bold text-ink">{item.title}.</span> {item.body}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to={MARKETPLACE_ROUTES.warranty} variant="secondary" size="md">
              View warranty policy
            </ButtonLink>
            <Link
              to={MARKETPLACE_ROUTES.returns}
              className="group inline-flex items-center gap-2 px-1 text-sm font-bold text-primary-700 transition hover:text-primary-500"
            >
              <Undo2 className="size-4" aria-hidden="true" />
              Read the return policy
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-4 rounded-card-xl bg-primary-50"
            aria-hidden="true"
          />
          <div className="relative rounded-card-xl border border-line bg-white p-7 shadow-card sm:p-9">
            <div className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-50 text-accent-700">
                <RotateCcw className="size-6" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-3xl font-bold tracking-tight text-ink">7 days</p>
                <p className="text-sm text-muted">from delivery to start a return</p>
              </div>
            </div>

            <dl className="mt-7 space-y-5 border-t border-line pt-6">
              <div>
                <dt className="text-sm font-bold text-ink">Grounds for return</dt>
                <dd className="mt-1 text-sm leading-body text-muted">
                  Wrong grade, an undisclosed defect, or a battery health far below the
                  published figure.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-ink">Warranty covers</dt>
                <dd className="mt-1 text-sm leading-body text-muted">
                  Manufacturing defects and component failures in normal use. Not
                  cosmetic marks that were disclosed at purchase.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-ink">Who handles claims</dt>
                <dd className="mt-1 text-sm leading-body text-muted">
                  ReFon, not the seller. You are not negotiating a fault with a stranger.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-ink">Payments</dt>
                <dd className="mt-1 text-sm leading-body text-muted">
                  Cash on delivery, GCash, Maya, or bank transfer. This prototype simulates
                  payment and moves no money.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </Section>
  )
}
