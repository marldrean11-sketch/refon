import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'
import { Section, SectionHeading } from '../components/ui/Section.jsx'
import { ButtonLink } from '../components/ui/Button.jsx'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'

/**
 * Shared shell for the long-form policy and story pages, so About, Warranty,
 * Returns, Shipping, Privacy, and Terms all read as one publication.
 */
export function StaticPageLayout({
  eyebrow,
  title,
  lede,
  breadcrumb,
  updated,
  children,
  cta = {
    label: 'Shop refurbished phones',
    to: MARKETPLACE_ROUTES.shop,
  },
}) {
  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-18">
          {breadcrumb && <Breadcrumb items={breadcrumb} />}
          <div className="mt-6 max-w-3xl">
            {eyebrow && (
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              {title}
            </h1>
            {lede && <p className="mt-5 text-lg leading-body text-muted">{lede}</p>}
            {updated && <p className="mt-4 text-xs text-muted">Last updated {updated}</p>}
          </div>
        </div>
      </div>

      <Section tone="canvas">
        <div className="mx-auto max-w-3xl">{children}</div>
      </Section>

      <Section tone="navy">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            tone="light"
            align="center"
            eyebrow="Ready when you are"
            title="Every phone, graded and tested before you pay"
            description="Compare condition grades, battery health, and warranty terms across the full catalog."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink to={cta.to} variant="accent" size="lg">
                  {cta.label}
                </ButtonLink>
                <ButtonLink
                  to={MARKETPLACE_ROUTES.howItWorks}
                  variant="secondary"
                  size="lg"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  How it works
                </ButtonLink>
              </div>
            }
          />
        </div>
      </Section>
    </>
  )
}

/** Numbered policy block used by the Warranty, Returns, and Shipping pages. */
export function PolicyList({ items }) {
  return (
    <div className="space-y-5">
      {items.map((item, index) => (
        <section
          key={item.title}
          className="rounded-card-lg border border-line bg-white p-6 shadow-card"
        >
          <div className="flex items-start gap-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-50 font-display text-sm font-bold text-primary-700">
              {index + 1}
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">{item.title}</h2>
              <p className="mt-2 text-sm leading-body text-muted">{item.body}</p>
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
