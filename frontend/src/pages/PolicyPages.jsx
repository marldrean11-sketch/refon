import { SITE_INFO, boothLabel } from '../content/site-info.js'
import { PolicyList, StaticPageLayout } from './StaticPageLayout.jsx'
import {
  RETURN_TERMS,
  SHIPPING_TERMS,
  WARRANTY_TERMS,
} from '../content/policy-content.js'
import { formatPeso } from '../lib/format.js'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'

export function WarrantyPage() {
  return (
    <StaticPageLayout
      eyebrow="Coverage"
      title="Warranty policy"
      lede="Eligible phones ship with a ReFon-administered warranty. The period is stated in months on every listing, so you always know the term before you buy."
      updated="October 2026"
      breadcrumb={[
        { label: 'Home', to: MARKETPLACE_ROUTES.home },
        { label: 'Warranty' },
      ]}
      cta={{ label: 'Shop covered phones', to: MARKETPLACE_ROUTES.shop }}
    >
      <PolicyList items={WARRANTY_TERMS} />

      <div className="mt-8 rounded-card-lg border border-primary-100 bg-primary-50 p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          Why we administer warranty centrally
        </h2>
        <p className="mt-2 text-sm leading-body text-muted">
          A warranty only means something if someone is accountable for it. On ReFon
          the seller lists the warranty term, but ReFon handles claims, so you are not
          negotiating with a stranger over a six-month-old fault.
        </p>
      </div>
    </StaticPageLayout>
  )
}

export function ReturnsPage() {
  return (
    <StaticPageLayout
      eyebrow="Coverage"
      title="Returns and refunds"
      lede="Seven days from delivery. If the phone is materially different from how it was described, you can send it back."
      updated="October 2026"
      breadcrumb={[
        { label: 'Home', to: MARKETPLACE_ROUTES.home },
        { label: 'Returns' },
      ]}
      cta={{ label: 'Shop with confidence', to: MARKETPLACE_ROUTES.shop }}
    >
      <PolicyList items={RETURN_TERMS} />

      <div className="mt-8 rounded-card-lg border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          Refund timeline
        </h2>
        <p className="mt-2 text-sm leading-body text-muted">
          Approved refunds are returned to your original payment method within five to
          seven business days. Cash on delivery orders are refunded to the registered
          account used for the order.
        </p>
      </div>
    </StaticPageLayout>
  )
}

export function ShippingPage() {
  return (
    <StaticPageLayout
      eyebrow="Delivery"
      title="Shipping and delivery"
      lede="Tracked nationwide delivery, with the cost and estimate shown before you place the order."
      updated="October 2026"
      breadcrumb={[
        { label: 'Home', to: MARKETPLACE_ROUTES.home },
        { label: 'Shipping' },
      ]}
      cta={{ label: 'Shop refurbished phones', to: MARKETPLACE_ROUTES.shop }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {SHIPPING_TERMS.map((term) => {
          const feeMatch = term.body.match(/₱[\d,]+/)

          return (
            <section
              key={term.title}
              className="rf-spotlight rf-lift hover:border-accent/40 rounded-card-lg border border-line bg-white p-6 shadow-card"
            >
              <h2 className="font-display text-lg font-semibold text-ink">{term.title}</h2>
              <p className="mt-2 text-sm leading-body text-muted">{term.body}</p>
              {feeMatch && (
                <p className="mt-3 font-display text-xl font-bold text-primary-700">
                  {feeMatch[0]}
                </p>
              )}
            </section>
          )
        })}
      </div>

      <div className="mt-8 rounded-card-lg border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          Free standard shipping
        </h2>
        <p className="mt-2 text-sm leading-body text-muted">
          Metro Manila orders over {formatPeso(15000)} ship free on standard delivery.
          The exact shipping fee for your address is always shown in the checkout
          summary before you place the order.
        </p>
      </div>

      <div className="mt-8 rounded-card-lg border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Order tracking</h2>
        <p className="mt-2 text-sm leading-body text-muted">
          Every order has a status timeline in your account: confirmed, preparing,
          shipped, out for delivery, and delivered. You can see the current stage and
          its estimate at any time.
        </p>
      </div>
    </StaticPageLayout>
  )
}

export function PrivacyPage() {
  return (
    <StaticPageLayout
      eyebrow="Legal"
      title="Privacy policy"
      lede="What we collect, why we collect it, and what we never do with it."
      updated="October 2026"
      breadcrumb={[
        { label: 'Home', to: MARKETPLACE_ROUTES.home },
        { label: 'Privacy Policy' },
      ]}
      cta={{ label: 'Shop refurbished phones', to: MARKETPLACE_ROUTES.shop }}
    >
      <PolicyList
        items={[
          {
            title: 'What we collect',
            body: 'Account details (name, email, hashed password), the phones you browse and save, your orders and delivery addresses, and messages you send to sellers.',
          },
          {
            title: 'What we never store',
            body: 'Plaintext passwords are never written anywhere. Payment credentials are never collected or stored — this prototype simulates payment methods and moves no money.',
          },
          {
            title: 'How sessions work',
            body: 'Login state uses a signed token in an httpOnly cookie, so it is not readable by JavaScript. Signing out clears the cookie server-side.',
          },
          {
            title: 'Who can see your orders',
            body: 'Only you and the admin team managing the marketplace. Sellers see the items in their own orders and the delivery details needed to fulfil them.',
          },
          {
            title: 'Photos you upload',
            body: 'Listing photos are validated by file signature, renamed on upload, and stored in our uploads bucket or disk. They are served only to signed-in marketplace users.',
          },
          {
            title: 'Your choices',
            body: 'You can request export or deletion of your account data at any time by contacting support.',
          },
        ]}
      />
    </StaticPageLayout>
  )
}

export function TermsPage() {
  return (
    <StaticPageLayout
      eyebrow="Legal"
      title="Terms of service"
      lede="The rules that keep ReFon usable for both buyers and sellers."
      updated="October 2026"
      breadcrumb={[
        { label: 'Home', to: MARKETPLACE_ROUTES.home },
        { label: 'Terms' },
      ]}
      cta={{ label: 'Shop refurbished phones', to: MARKETPLACE_ROUTES.shop }}
    >
      <PolicyList
        items={[
          {
            title: 'This is a prototype',
            body: 'ReFon is a Technopreneurship project. Payment methods are simulated and no real transaction occurs. Order totals, inventory, and moderation behave realistically so the workflow can be evaluated end to end.',
          },
          {
            title: 'Condition grades are the source of truth',
            body: 'The grade and battery figure published on a listing describe the actual device at the time of listing. Buyers may return a phone that differs materially from that description within seven days.',
          },
          {
            title: 'Sellers must disclose',
            body: 'Sellers are responsible for accurately describing repair history, battery condition, and cosmetic marks. Listings that mislead buyers can be removed and the seller suspended.',
          },
          {
            title: 'Account security',
            body: 'Keep your password to yourself. Accounts are personal, and activity under your session is treated as your activity.',
          },
          {
            title: 'Reporting a problem',
            body: 'Buyers can report a listing from the product page. Reports go to the admin team, who can resolve, dismiss, or take the listing down.',
          },
          {
            title: 'Changes',
            body: 'These terms describe the behaviour of this prototype. Changes made during development will be reflected here as the project evolves.',
          },
        ]}
      />
    </StaticPageLayout>
  )
}

export function ContactPage() {
  const { contact, location, socials, credits } = SITE_INFO
  const card = 'rf-spotlight rf-lift rounded-card-lg border border-line bg-card p-6 hover:border-accent/40'
  const title = 'font-display text-lg font-semibold text-ink'
  const body = 'mt-2 text-sm leading-body text-muted'

  return (
    <StaticPageLayout
      eyebrow="Support"
      title="Contact us"
      lede="Questions about a listing, the health check, a trade-in or selling on ReFon. Message us, or find us at the Techno Fair."
      breadcrumb={[
        { label: 'Home', to: MARKETPLACE_ROUTES.home },
        { label: 'Contact Us' },
      ]}
      cta={{ label: 'Shop refurbished phones', to: MARKETPLACE_ROUTES.shop }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <section className={card} data-testid="contact-email">
          <h2 className={title}>Email</h2>
          <p className={body}>
            <a href={`mailto:${contact.email}`} className="font-semibold text-accent hover:underline">
              {contact.email}
            </a>
            <br />
            Best for listing questions and seller applications.
          </p>
        </section>
        <section className={card} data-testid="contact-phone">
          <h2 className={title}>Phone</h2>
          <p className={body}>
            <a href={contact.phoneHref} className="font-semibold text-accent hover:underline">
              {contact.phone}
            </a>
            <br />
            {contact.hours}
          </p>
        </section>
        <section className={card} data-testid="contact-location">
          <h2 className={title}>Find us</h2>
          <p className={body}>
            {location.venue}, {location.city}, {location.country}
            <br />
            {boothLabel(location)}
          </p>
        </section>
        <section className={card}>
          <h2 className={title}>Report a listing</h2>
          <p className={body}>
            Use the report option on any product page. It goes straight to the moderation team.
          </p>
        </section>
      </div>

      <div className="mt-8 rounded-card-lg border border-line-2 bg-panel p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Social media</h2>
        <p className="mt-2 text-sm leading-body text-muted">
          {socials.some((social) => social.href)
            ? 'Follow ReFon for new drops and booth updates.'
            : 'Our Facebook, Instagram and TikTok pages are coming soon.'}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {socials.map((social) => (
            <li key={social.id}>
              {social.href ? (
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rf-bounce inline-flex min-h-11 items-center rounded-full border border-line-2 px-4 text-sm font-semibold text-ink hover:border-accent hover:text-accent"
                >
                  {social.label}
                </a>
              ) : (
                <span className="inline-flex min-h-11 items-center rounded-full border border-dashed border-line-2 px-4 text-sm text-subtle">
                  {social.label} · soon
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-line pt-4 text-[13px] text-subtle">{credits}</p>
      </div>
    </StaticPageLayout>
  )
}
