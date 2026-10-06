import { Link, useParams } from 'react-router-dom'
import { ButtonLink } from '../components/ui/Button.jsx'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'
import { PageTransition } from '../components/layout/PageTransition.jsx'

/**
 * Placeholder for routes whose real pages land in a later phase.
 *
 * Keeps every navigation target in the header and footer a working page, so the
 * site has no dead ends while the remaining phases are built out.
 *
 * `/cart`, `/checkout`, and the confirmation screen moved out in Phase 6 and now
 * have real pages; what remains here is comparison, seller application, and the
 * seller storefront.
 */
function PendingPage({ title, phase, description, links = [] }) {
  return (
    <PageTransition>
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <p className="rounded-pill bg-primary-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-700">
          Arriving in {phase}
        </p>
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-body text-muted">{description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {links.map((link) => (
            <ButtonLink key={link.label} to={link.to} variant={link.variant ?? 'secondary'} size="md">
              {link.label}
            </ButtonLink>
          ))}
          <ButtonLink to={MARKETPLACE_ROUTES.shop} variant="primary" size="md">
            Shop refurbished phones
          </ButtonLink>
        </div>
        <p className="mt-8 text-xs text-muted">
          Prefer to look around first?{' '}
          <Link
            to={MARKETPLACE_ROUTES.howItWorks}
            className="font-semibold text-primary-700 underline underline-offset-2"
          >
            See how ReFon works
          </Link>
        </p>
      </div>
    </PageTransition>
  )
}

export function ComparePage() {
  return (
    <PendingPage
      phase="Phase 8 — Comparison"
      title="Phone comparison is coming"
      description="Select up to four phones and compare price, grade, battery health, camera, display, processor, and warranty side by side."
      links={[{ label: 'Browse phones', to: MARKETPLACE_ROUTES.shop }]}
    />
  )
}

export function SellerApplyPage() {
  return (
    <PendingPage
      phase="Phase 10 — Seller experience"
      title="Sell your phone on ReFon"
      description="Seller registration, verification status, and the full listing flow with condition grade, battery health, and warranty are being built now."
      links={[{ label: 'How selling works', to: MARKETPLACE_ROUTES.howItWorks }]}
    />
  )
}

/**
 * Public seller storefront.
 *
 * Wired in Phase 10 alongside the seller dashboard. Renders a phase notice
 * rather than a 404 so a storefront link from the homepage is never a dead end.
 */
export function SellerStorefrontPage() {
  const { sellerId } = useParams()

  return (
    <PendingPage
      phase="Phase 10 — Seller experience"
      title="Seller storefront"
      description={`Storefront pages for verified sellers, with their full approved inventory and trust history, are being built now. This link points at seller ${sellerId ?? ''}.`}
      links={[{ label: 'Browse phones', to: MARKETPLACE_ROUTES.shop }]}
    />
  )
}
