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
 */
export function WhyRefurbishedSection() {
  return (
    <Section tone="canvas">
      <SectionHeading
        eyebrow="Why refurbished"
        title="A better phone, without the new-phone price tag"
        description="Refurbished is not a compromise on quality. It is a different decision about where your money goes."
      />

      <ul className="mt-12 grid gap-5 sm:grid-cols-2">
        {WHY_REFURBISHED.map((point, index) => {
          const Icon = ICONS[index] ?? Sparkles

          return (
            <li
              key={point.title}
              className="flex items-start gap-5 rounded-card-lg border border-line bg-white p-6 shadow-card"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-600">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">{point.title}</h3>
                <p className="mt-2 text-sm leading-body text-muted">{point.body}</p>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
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
