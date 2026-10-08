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
 * kind of unverifiable claim this marketplace is built to remove. These entries
 * state the real objection and the real answer; Phase 9 swaps in live review
 * records once orders exist.
 *
 * Set as an objection/response ledger rather than as quote cards, because a
 * question-and-answer pair is what this is — and putting it in a card with a
 * quotation mark would be nudging the reader to mistake it for a testimonial.
 */
export function TestimonialsSection() {
  return (
    <Section tone="canvas" id="testimonials">
      <SectionHeading
        eyebrow="Honest answers"
        title="The three things buyers worry about"
        description="And exactly what ReFon publishes to resolve each one."
      />

      <ol className="mt-12 border-t border-line">
        {BUYER_CONCERNS.map((item, index) => (
          <li
            key={item.id}
            className="grid gap-x-8 gap-y-3 border-b border-line py-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
          >
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                Concern {String(index + 1).padStart(2, '0')}
              </p>
              <p className="mt-2 font-display text-lg font-bold leading-snug tracking-tight text-ink">
                {item.concern}
              </p>
              <p className="mt-3 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
                <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
                {item.speaker}
              </p>
            </div>

            <div className="min-w-0 lg:border-l lg:border-line lg:pl-8">
              <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                <HelpCircle className="size-3.5 shrink-0" aria-hidden="true" />
                What ReFon publishes
              </p>
              <p className="mt-2 text-sm leading-body text-muted">{item.answer}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
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