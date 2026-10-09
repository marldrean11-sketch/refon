import { Leaf, PiggyBank, ShieldCheck, Sparkles } from 'lucide-react'
import { Section, SectionHeading } from '../../components/ui/Section.jsx'
import { ButtonLink } from '../../components/ui/Button.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { WHY_REFURBISHED } from '../../content/home-content.js'

const ICONS = [Sparkles, PiggyBank, ShieldCheck, Leaf]

/**
 * Why buy refurbished.
 *
 * Answers the question a buyer asks before they trust us: is this actually a
 * good idea for me? The answers are practical rather than moral, and the
 * sustainability point is last because it is a secondary reason to buy.
 *
 * Set as a numbered editorial list with a hanging index rather than four icon
 * cards. An icon in a coloured rounded square is the least informative element
 * on the page — it says nothing the heading does not — and four of them in a row
 * was the single strongest "template" signal left on the homepage.
 */
export function WhyRefurbishedSection() {
  return (
    <Section tone="muted">
      <SectionHeading
        eyebrow="Why refurbished"
        title="A better phone, without the new-phone price tag"
        description="Refurbished is not a compromise on quality. It is a different decision about where your money goes."
      />

      <ol className="mt-12 border-t border-line">
        {WHY_REFURBISHED.map((point, index) => {
          const Icon = ICONS[index] ?? Sparkles

          return (
            <li
              key={point.title}
              className="grid gap-x-6 gap-y-2 border-b border-line py-7 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-baseline"
            >
              <span className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold tabular-nums text-subtle">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Icon className="size-5 text-accent-600" aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold tracking-tight text-ink">
                  {point.title}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-body text-muted">{point.body}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink to={MARKETPLACE_ROUTES.shop} variant="primary" size="lg">
          Shop refurbished phones
        </ButtonLink>
        <ButtonLink to={MARKETPLACE_ROUTES.sustainability} variant="secondary" size="lg">
          Read our sustainability commitment
        </ButtonLink>
      </div>
    </Section>
  )
}