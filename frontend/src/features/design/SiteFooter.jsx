import { Link } from 'react-router-dom'
import { BrandMark } from '../../components/ui/BrandMark.jsx'
import { AUTH_ROUTES } from '../../lib/routes.js'
import { Container } from './Container.jsx'
import { useAuth } from '../auth/useAuth.js'
import { FOOTER_GROUPS } from './navigation-config.js'

const linkClasses =
  'inline-block rounded-[3px] text-sm text-primary-300/85 transition duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-950'

function FooterColumn({ title, links }) {
  return (
    <nav aria-label={title}>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-500">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={`${link.key ?? link.label}-${link.to}`}>
            <Link to={link.to} className={linkClasses}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * The one global footer.
 *
 * Replaces `MarketplaceFooter`, which carried a newsletter form that submitted
 * nowhere, an invented phone number and postal address, social profiles pointing
 * at `facebook.com` and `instagram.com` rather than at ReFon, and two vague trust
 * chips. Each of those is a claim the product cannot back, and a footer is the
 * last place a marketplace should make one.
 *
 * The footer is composed as a technical plate: a monospace identity column with
 * the inspection standard stated as a numbered list, then the real navigation
 * surface drawn from the shared navigation config so it cannot drift from the
 * drawer.
 *
 * The Account column follows the visitor: sign-in and registration while signed
 * out, account settings and the role's own dashboard while signed in, so the
 * footer never advertises a workspace the reader cannot open.
 */
export function SiteFooter() {
  const { user } = useAuth()

  const shop = FOOTER_GROUPS[0]
  const help = FOOTER_GROUPS[1]
  const company = FOOTER_GROUPS[2]
  const legal = FOOTER_GROUPS[3]

  const account = {
    title: 'Account',
    links: user
      ? [
          { key: 'account', label: 'Account settings', to: AUTH_ROUTES.account },
          {
            key: 'workspace',
            label: user.role === 'ADMIN' ? 'Admin dashboard' : 'Seller dashboard',
            to: user.role === 'ADMIN' ? AUTH_ROUTES.admin : AUTH_ROUTES.seller,
          },
        ]
      : [
          { key: 'login', label: 'Sign in', to: AUTH_ROUTES.login },
          { key: 'register', label: 'Create an account', to: AUTH_ROUTES.register },
        ],
  }

  return (
    <footer className="mt-auto bg-primary-950 text-white">
      {/* The extra bottom clearance clears the mobile tab bar, which is fixed to
          the viewport until the desktop navigation takes over at `lg`. */}
      <Container className="pb-32 pt-14 lg:pb-10">
        <div className="grid gap-10 border-b border-primary-800 pb-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)] lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandMark inverse />
            <p className="mt-5 max-w-sm text-sm leading-body text-primary-300/85">
              A marketplace for tested refurbished phones. Every listing publishes its
              condition grade, measured battery health, and warranty term before you
              decide anything.
            </p>

            <dl className="mt-7 max-w-sm border-t border-primary-800 pt-5">
              {[
                ['11', 'inspection checks per phone'],
                ['A / B / C', 'published condition grade'],
                ['7', 'day return window'],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 py-1.5"
                >
                  <dt className="font-mono text-sm font-semibold tabular-nums text-accent-300">
                    {value}
                  </dt>
                  <dd className="font-mono text-[11px] uppercase tracking-[0.1em] text-primary-400">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <FooterColumn title={shop.title} links={shop.links} />
          <FooterColumn title={help.title} links={help.links} />
          <FooterColumn title={company.title} links={company.links} />
          <FooterColumn title={account.title} links={account.links} />
        </div>

        <div className="grid gap-8 border-b border-primary-800 py-8 lg:grid-cols-[1.5fr_1fr_1fr]">
          <p className="max-w-sm text-xs leading-relaxed text-primary-400">
            Every grade is explained in writing on the listing it applies to, and no
            seller can publish a phone that has not been reviewed by a moderator.
          </p>
          <FooterColumn title={legal.title} links={legal.links} />
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-500">
              Standard
            </p>
            <p className="mt-4 font-mono text-[11px] leading-relaxed text-primary-400">
              Grade A — minimal signs of use
              <br />
              Grade B — minor cosmetic marks
              <br />
              Grade C — visible wear, fully tested
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-primary-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ReFon</p>
          <p>Transparent details · Secure sessions · Thoughtful moderation</p>
        </div>
      </Container>
    </footer>
  )
}