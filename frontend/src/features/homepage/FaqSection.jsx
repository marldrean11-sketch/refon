import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Section, SectionHeading } from '../../components/ui/Section.jsx'
import { ButtonLink } from '../../components/ui/Button.jsx'
import { AccordionList } from '../../pages/FaqPage.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { FAQ_ITEMS } from '../../content/policy-content.js'

/** FAQ preview: the six questions that decide most purchases. */
export function FaqSection() {
  const [openId, setOpenId] = useState(null)
  const preview = FAQ_ITEMS.slice(0, 6)

  return (
    <Section tone="muted" id="faq">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
        <div>
          <SectionHeading
            eyebrow="Questions"
            title="Frequently asked questions"
            description="What refurbished actually means, how we test, and what happens if something is wrong."
            action={
              <ButtonLink to={MARKETPLACE_ROUTES.faq} variant="secondary" size="md">
                Read all questions
              </ButtonLink>
            }
          />
        </div>

        <div>
          <AccordionList items={preview} openId={openId} onToggle={setOpenId} />

          <p className="mt-8 flex items-start gap-2 border-t border-line pt-6 text-sm leading-relaxed text-muted">
            <HelpCircle className="mt-0.5 size-4 shrink-0 text-accent-600" aria-hidden="true" />
            <span>
              Still unsure about something?{' '}
              <Link
                to={MARKETPLACE_ROUTES.contact}
                className="font-bold text-primary-800 underline underline-offset-2 hover:text-primary-950"
              >
                Contact us
              </Link>{' '}
              — we answer within one business day.
            </span>
          </p>
        </div>
      </div>
    </Section>
  )
}