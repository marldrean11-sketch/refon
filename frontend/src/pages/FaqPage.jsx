import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { Section, SectionHeading } from '../components/ui/Section.jsx'
import { ButtonLink } from '../components/ui/Button.jsx'
import { FAQ_ITEMS } from '../content/policy-content.js'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'
import { StaticPageLayout } from './StaticPageLayout.jsx'

/** Accordion FAQ. One panel open at a time keeps the page scannable. */
export function FaqPage() {
  const [openId, setOpenId] = useState(FAQ_ITEMS[0].question)

  return (
    <StaticPageLayout
      eyebrow="Support"
      title="Frequently asked questions"
      lede="Everything buyers ask before committing to a refurbished phone, answered plainly."
      breadcrumb={[
        { label: 'Home', to: MARKETPLACE_ROUTES.home },
        { label: 'FAQ' },
      ]}
      cta={{ label: 'Shop refurbished phones', to: MARKETPLACE_ROUTES.shop }}
    >
      <AccordionList items={FAQ_ITEMS} openId={openId} onToggle={setOpenId} />

      <div className="mt-10 rounded-card-lg border border-line bg-white p-6 text-center">
        <HelpCircle className="mx-auto size-7 text-primary-600" aria-hidden="true" />
        <h2 className="mt-3 font-display text-xl font-semibold text-ink">
          Still have a question?
        </h2>
        <p className="mt-2 text-sm leading-body text-muted">
          Our support team answers within one business day.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <ButtonLink to={MARKETPLACE_ROUTES.contact} variant="primary" size="md">
            Contact us
          </ButtonLink>
          <ButtonLink to={MARKETPLACE_ROUTES.qualityCheck} variant="secondary" size="md">
            Read our testing process
          </ButtonLink>
        </div>
      </div>
    </StaticPageLayout>
  )
}

/**
 * Reusable FAQ accordion.
 *
 * `allowMultiple` lets the homepage embed a few answers without implying these
 * are the only ones.
 */
export function AccordionList({ items, openId, onToggle, allowMultiple = false }) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = openId === item.question

        return (
          <div
            key={item.question}
            className="overflow-hidden rounded-card-lg border border-line bg-white"
          >
            <h2>
              <button
                type="button"
                onClick={() => {
                  if (allowMultiple) {
                    onToggle(isOpen ? null : item.question)
                    return
                  }

                  onToggle(isOpen ? null : item.question)
                }}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${slugify(item.question)}`}
                id={`faq-button-${slugify(item.question)}`}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="font-display text-base font-semibold text-ink">
                  {item.question}
                </span>
                <ChevronDown
                  className={`size-5 shrink-0 text-muted transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
            </h2>
            {isOpen && (
              <div
                id={`faq-panel-${slugify(item.question)}`}
                role="region"
                aria-labelledby={`faq-button-${slugify(item.question)}`}
                className="border-t border-line px-6 py-5"
              >
                <p className="text-sm leading-body text-muted">{item.answer}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Homepage FAQ preview: first six questions, then a link to the full page. */
export function FaqPreviewSection() {
  const [openId, setOpenId] = useState(null)

  return (
    <Section tone="muted">
      <SectionHeading
        align="center"
        eyebrow="Questions"
        title="Frequently asked questions"
        description="The questions buyers ask us most, answered without hedging."
        action={
          <ButtonLink to={MARKETPLACE_ROUTES.faq} variant="secondary" size="md">
            Read all questions
          </ButtonLink>
        }
      />
      <div className="mx-auto mt-10 max-w-3xl">
        <AccordionList items={FAQ_ITEMS.slice(0, 6)} openId={openId} onToggle={setOpenId} />
      </div>
    </Section>
  )
}
