import { ArrowRight, RotateCcw, ShieldCheck, Undo2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Section } from '../../components/ui/Section.jsx'
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
 *
 * The right-hand column is a **terms sheet**: a numbered list of what is
 * covered, who handles it, and how long the window is. Terms are read like
 * terms — down a column, with a label and a value — and the previous version
 * buried the same four facts inside a floating card with a decorative panel
 * behind it, which made them look like decoration.
 */
export function WarrantySection() {
  return (
    <Section tone="white" id="warranty">
      <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700">
            Protection
          </p>
          <h2 className="mt-4 text-headline font-bold tracking-tight text-ink">
            Warranty and returns, stated before you pay
          </h2>
          <p className="mt-5 leading-body text-muted">
            The risk in buying refurbished is not the phone. It is the uncertainty
            about what happens if something is wrong. We remove it with published
            terms and an administrator who answers.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <WarrantyBadge months={6} size="lg" linkToPolicy />
            <ReturnPolicyBadge size="lg" />
          </div>

          <ul className="mt-8 border-t border-line">
            {WARRANTY_HIGHLIGHTS.map((item, index) => (
              <li
                key={item.title}
                className="flex gap-4 border-b border-line py-4"
              >
                <span className="w-7 shrink-0 pt-0.5 font-mono text-xs font-semibold tabular-nums text-subtle">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="text-sm leading-body text-muted">
                  <span className="font-bold text-ink">{item.title}.</span> {item.body}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink to={MARKETPLACE_ROUTES.warranty} variant="secondary" size="md">
              View warranty policy
            </ButtonLink>
            <Link
              to={MARKETPLACE_ROUTES.returns}
              className="group inline-flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-800 transition hover:text-primary-950"
            >
              <Undo2 className="size-4" aria-hidden="true" />
              Read the return policy
              <ArrowRight
                className="size-4 transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transform-none"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>

        {/* The terms sheet. */}
        <div className="overflow-hidden rounded-card-lg border border-line bg-surface">
          <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
            <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
              <RotateCcw className="size-4 text-accent-600" aria-hidden="true" />
              Terms
            </p>
            <div className="text-right">
              <p className="font-display text-3xl font-bold leading-none tabular-nums tracking-tight text-ink">
                7 days
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-subtle">
                From delivery to return
              </p>
            </div>
          </div>

          <dl className="px-6 py-2">
            {[
              {
                label: 'Grounds for return',
                value:
                  'Wrong grade, an undisclosed defect, or a battery health far below the published figure.',
              },
              {
                label: 'Warranty covers',
                value:
                  'Manufacturing defects and component failures in normal use. Not cosmetic marks that were disclosed at purchase.',
              },
              {
                label: 'Who handles claims',
                value:
                  'ReFon, not the seller. You are not negotiating a fault with a stranger.',
              },
              {
                label: 'Payments',
                value:
                  'Cash on delivery, GCash, Maya, or bank transfer. This prototype simulates payment and moves no money.',
              },
            ].map((row) => (
              <div
                key={row.label}
                className="grid gap-2 border-b border-line py-4 last:border-b-0 sm:grid-cols-[9rem_1fr] sm:gap-6"
              >
                <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">
                  {row.label}
                </dt>
                <dd className="text-sm leading-body text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>

          <p className="flex gap-2.5 border-t border-line bg-surface-2 px-6 py-4 text-xs leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-600" aria-hidden="true" />
            Coverage is administered by ReFon, so a claim does not depend on a seller
            you never met still being reachable.
          </p>
        </div>
      </div>
    </Section>
  )
}