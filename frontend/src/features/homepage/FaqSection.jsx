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
      <SectionHeading
        align="center"
        eyebrow="Questions"
        title="Frequently asked questions"
        description="What refurbished actually means, how we test, and what happens if something is wrong."
        action={
          <ButtonLink to={MARKETPLACE_ROUTES.faq} variant="secondary" size="md">
            Read all questions
          </ButtonLink>
        }
      />

      <div className="mx-auto mt-10 max-w-3xl">
        <AccordionList items={preview} openId={openId} onToggle={setOpenId} />
      </div>

      <div className="mt-10 flex flex-col items-center gap-2 text-center">
        <HelpCircle className="size-6 text-primary-600" aria-hidden="true" />
        <p className="text-sm text-muted">
          Still unsure about something?{' '}
          <Link
            to={MARKETPLACE_ROUTES.contact}
            className="font-bold text-primary-700 underline underline-offset-2"
          >
            Contact us
          </Link>{' '}
          — we answer within one business day.
        </p>
      </div>
    </Section>
  )
}
