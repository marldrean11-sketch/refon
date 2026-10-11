import { SITE_INFO } from '../content/site-info.js'
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
              className="rounded-card-lg border border-line bg-white p-6 shadow-card"
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
  return (
    <StaticPageLayout
      eyebrow="Support"
      title="Contact us"
      lede="Questions about a listing, an order, or selling on ReFon. We answer within one business day."
      breadcrumb={[
        { label: 'Home', to: MARKETPLACE_ROUTES.home },
        { label: 'Contact Us' },
      ]}
      cta={{ label: 'Shop refurbished phones', to: MARKETPLACE_ROUTES.shop }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-card-lg border border-line bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Email</h2>
          <p className="mt-2 text-sm leading-body text-muted">
            {SITE_INFO.contact.email}: best for order questions and seller applications.
          </p>
        </section>
        <section className="rounded-card-lg border border-line bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Phone</h2>
          <p className="mt-2 text-sm leading-body text-muted">
            +63 2 8123 4567 — Monday to Saturday, 9am to 6pm PHT.
          </p>
        </section>
        <section className="rounded-card-lg border border-line bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Office</h2>
          <p className="mt-2 text-sm leading-body text-muted">
            Quezon City, Philippines. Walk-ins by appointment.
          </p>
        </section>
        <section className="rounded-card-lg border border-line bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Report a listing</h2>
          <p className="mt-2 text-sm leading-body text-muted">
            Use the report option on any product page. It goes straight to the
            moderation team.
          </p>
        </section>
      </div>

      <div className="mt-8 rounded-card-lg border border-primary-100 bg-primary-50 p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          Already placed an order?
        </h2>
        <p className="mt-2 text-sm leading-body text-muted">
          Order questions are fastest through the order timeline in your account,
          where you can see the current status and request a return or warranty
          service.
        </p>
      </div>
    </StaticPageLayout>
  )
}
