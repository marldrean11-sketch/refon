import { BadgeCheck, BatteryCharging, Camera, ClipboardCheck, Clock, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Section, SectionHeading } from '../components/ui/Section.jsx'
import { ButtonLink } from '../components/ui/Button.jsx'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'
import { SELLER_STEPS } from '../content/policy-content.js'
import { useAuth } from '../features/auth/useAuth.js'
import { AUTH_ROUTES, MARKETPLACE_ROUTES } from '../lib/routes.js'

/** What a seller should have ready before listing a phone. */
const CHECKLIST = [
  { icon: Camera, title: 'Clear photos', body: 'Front, back and any marks. Up to six JPG, PNG or WebP photos per phone.' },
  { icon: BatteryCharging, title: 'Battery health', body: 'The percentage from Settings › Battery, measured, not guessed.' },
  { icon: ClipboardCheck, title: 'The 11-point check', body: 'Screen, touch, cameras, audio, charging, buttons and more. Answer each one honestly.' },
  { icon: BadgeCheck, title: 'A fair grade', body: 'A, B or C, using the grade guide on the Quality Check page.' },
]

/**
 * `/sell`: what selling on ReFon involves, and the next step for whoever is
 * looking. A visitor gets "Create a seller account" (the register page opens
 * with Seller picked); a seller gets their dashboard; a buyer is told that
 * seller accounts are separate, rather than being sent to a form that would
 * bounce them.
 */
export function SellPage() {
  const { user } = useAuth()

  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-18">
          <Breadcrumb
            items={[
              { label: 'Home', to: MARKETPLACE_ROUTES.home },
              { label: 'Sell on ReFon' },
            ]}
          />
          <div className="mt-6 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
              For sellers
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Sell your phone on ReFon
            </h1>
            <p className="mt-5 text-lg leading-body text-muted">
              List a pre-loved phone with its grade, battery health and checks shown up front.
              Buyers trust what they can see, so you get fewer &ldquo;legit ba &rsquo;to?&rdquo;
              messages.
            </p>
            <SellNextStep user={user} />
          </div>
        </div>
      </div>

      <Section>
        <SectionHeading
          eyebrow="How it works"
          title="From sign-up to sold"
          description="Every seller is verified and every listing is checked before buyers see it."
        />
        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {SELLER_STEPS.map((entry) => (
            <li
              key={entry.step}
              className="rf-spotlight rf-lift hover:border-accent/40 rounded-card-lg border border-line bg-white p-6 shadow-card"
            >
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent-700">
                Step {entry.step}
              </span>
              <h2 className="mt-2 font-display text-lg font-semibold text-ink">{entry.title}</h2>
              <p className="mt-2 text-sm leading-body text-muted">{entry.description}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="Before you list"
          title="What you'll need for each phone"
          description="A few minutes per phone. It is what lets buyers decide without a dozen questions."
        />
        <ul className="mt-12 grid gap-5 sm:grid-cols-2">
          {CHECKLIST.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rf-spotlight rf-lift hover:border-accent/40 flex gap-4 rounded-card-lg border border-line bg-white p-6 shadow-card"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-600">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-body text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-sm text-muted">
          Not sure which grade fits?{' '}
          <Link to={MARKETPLACE_ROUTES.qualityCheck} className="font-semibold text-accent hover:underline">
            See the grade guide
          </Link>
        </p>
      </Section>
    </>
  )
}

/** The call to action, which depends on who is looking. */
function SellNextStep({ user }) {
  if (!user) {
    return (
      <div className="mt-8 flex flex-wrap items-center gap-3" data-testid="sell-cta-guest">
        <ButtonLink to={`${AUTH_ROUTES.register}?role=seller`} variant="accent" size="lg">
          <Store className="size-5" aria-hidden="true" />
          Create a seller account
        </ButtonLink>
        <p className="text-sm text-muted">
          Already selling?{' '}
          <Link to={AUTH_ROUTES.login} className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  if (user.role === 'SELLER') {
    const pending = user.sellerVerificationStatus && user.sellerVerificationStatus !== 'APPROVED'
    return (
      <div className="mt-8 flex flex-wrap items-center gap-3" data-testid="sell-cta-seller">
        <ButtonLink to={AUTH_ROUTES.seller} variant="accent" size="lg">
          <Store className="size-5" aria-hidden="true" />
          Go to your seller dashboard
        </ButtonLink>
        {pending && (
          <p className="inline-flex items-center gap-2 text-sm text-muted">
            <Clock className="size-4 text-accent" aria-hidden="true" />
            Your seller account is waiting for admin approval.
          </p>
        )}
      </div>
    )
  }

  if (user.role === 'ADMIN') {
    return (
      <div className="mt-8" data-testid="sell-cta-admin">
        <ButtonLink to={AUTH_ROUTES.admin} variant="secondary" size="lg">
          Review sellers in the admin dashboard
        </ButtonLink>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-line-2 bg-well p-4 text-sm leading-relaxed text-muted" data-testid="sell-cta-buyer">
      You&rsquo;re signed in with a <span className="font-semibold text-ink">buyer</span> account.
      Seller accounts are separate: sign out, then create a seller account with a different email
      address.
    </div>
  )
}
