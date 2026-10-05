import { HelpCircle, ShieldCheck } from 'lucide-react'
import { Section, SectionHeading } from '../../components/ui/Section.jsx'
import { ButtonLink } from '../../components/ui/Button.jsx'
import { BUYER_CONCERNS } from '../../content/home-content.js'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

/**
 * The objections that stop refurbished purchases.
 *
 * Deliberately not presented as customer reviews. ReFon has no delivered orders
 * yet, and inventing named buyers with purchase stories would be precisely the
 * kind of unverifiable claim this marketplace is built to remove. These cards
 * state the real objection and the real answer; Phase 9 swaps in live review
 * records once orders exist.
 */
export function TestimonialsSection() {
  return (
    <Section tone="canvas" id="testimonials">
      <SectionHeading
        align="center"
        eyebrow="Honest answers"
        title="The three things buyers worry about"
        description="And exactly what ReFon publishes to resolve each one."
      />

      <ul className="mt-12 grid gap-5 lg:grid-cols-3">
        {BUYER_CONCERNS.map((item) => (
          <li key={item.id}>
            <figure className="flex h-full flex-col rounded-card-lg border border-line bg-white p-6 shadow-card">
              <HelpCircle className="size-7 shrink-0 text-primary-300" aria-hidden="true" />
              <blockquote className="mt-4 flex-1">
                <p className="font-display text-lg font-semibold leading-snug text-ink">
                  {item.concern}
                </p>
                <p className="mt-3 text-sm leading-body text-muted">{item.answer}</p>
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-2 border-t border-line pt-5 text-xs font-bold text-accent-700">
                <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
                {item.speaker}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="text-xs text-muted">
          ReFon has no delivered orders yet, so this section states the answers rather
          than quoting customers. Verified-purchase reviews appear here once they exist.
        </p>
        <ButtonLink to={MARKETPLACE_ROUTES.faq} variant="secondary" size="md">
          Read all questions
        </ButtonLink>
      </div>
    </Section>
  )
}
