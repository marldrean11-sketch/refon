import { useState } from 'react'
import {
  ArrowUpRight,
  BadgeCheck,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../ui/BrandMark.jsx'
import { FacebookIcon, InstagramIcon } from '../ui/SocialIcons.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { categoryHref, getCategory } from '../../content/categories.js'

/**
 * Footer links resolve through `categoryHref`, the same helper the category
 * cards use, so a footer link and a category card can never point at different
 * or non-existent URLs.
 */
const SHOP_LINKS = [
  { label: 'iPhone', to: categoryHref(getCategory('iphone')) },
  { label: 'Samsung Galaxy', to: categoryHref(getCategory('samsung-galaxy')) },
  { label: 'Google Pixel', to: categoryHref(getCategory('google-pixel')) },
  { label: 'Gaming Phones', to: categoryHref(getCategory('gaming-phones')) },
  { label: 'Budget Phones', to: categoryHref(getCategory('budget-phones')) },
  { label: 'Shop All Phones', to: MARKETPLACE_ROUTES.shop },
]

const SUPPORT_LINKS = [
  { label: 'Contact Us', to: MARKETPLACE_ROUTES.contact },
  { label: 'FAQ', to: MARKETPLACE_ROUTES.faq },
  { label: 'Warranty', to: MARKETPLACE_ROUTES.warranty },
  { label: 'Returns', to: MARKETPLACE_ROUTES.returns },
  { label: 'Shipping', to: MARKETPLACE_ROUTES.shipping },
  { label: 'How We Test', to: MARKETPLACE_ROUTES.qualityCheck },
]

const COMPANY_LINKS = [
  { label: 'About', to: MARKETPLACE_ROUTES.about },
  { label: 'How It Works', to: MARKETPLACE_ROUTES.howItWorks },
  { label: 'Sell With Us', to: MARKETPLACE_ROUTES.sellerApply },
  { label: 'Sustainability', to: MARKETPLACE_ROUTES.sustainability },
  { label: 'Quality Grades', to: MARKETPLACE_ROUTES.qualityCheck },
]

const LEGAL_LINKS = [
  { label: 'Privacy Policy', to: MARKETPLACE_ROUTES.privacy },
  { label: 'Terms of Service', to: MARKETPLACE_ROUTES.terms },
  { label: 'Refund Policy', to: MARKETPLACE_ROUTES.returns },
]

const TRUST_CHIPS = [
  { icon: ShieldCheck, label: 'Moderated marketplace' },
  { icon: BadgeCheck, label: 'Verified trust signals' },
]

function FooterColumn({ title, links }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-200/70">{title}</p>
      <ul className="mt-4 space-y-3 text-sm font-semibold">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              to={link.to}
              className="block rounded text-primary-100/80 transition hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MarketplaceFooter() {
  const [email, setEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)

  function handleSubscribe(event) {
    event.preventDefault()
    setIsSubscribed(true)
    setEmail('')
  }

  return (
    <footer className="relative overflow-hidden bg-primary-950 text-white">
      <div
        className="absolute -right-24 -top-24 size-80 rounded-full bg-primary-500/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-5 py-14 pb-28 sm:px-6 md:pb-24 lg:px-8 lg:py-18 lg:pb-14">
        <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div>
            <BrandMark inverse />
            <p className="mt-5 max-w-sm text-base leading-body text-primary-100/80">
              Premium phones. Smarter prices. Tested for you. Every device on ReFon
              carries a published condition grade, battery health, and warranty.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {TRUST_CHIPS.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-pill border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-primary-100"
                >
                  <Icon className="size-4 text-accent-400" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>

            <form onSubmit={handleSubscribe} className="mt-7 max-w-sm">
              <label
                htmlFor="footer-email"
                className="text-xs font-bold uppercase tracking-[0.14em] text-primary-200/70"
              >
                Price drop alerts
              </label>
              <div className="mt-3 flex gap-2">
                <input
                  id="footer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-white/15 bg-white/[0.07] px-4 text-sm text-white placeholder:text-primary-200/50 focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-500/20"
                />
                <button
                  type="submit"
                  className="h-12 shrink-0 rounded-2xl bg-accent-500 px-5 text-sm font-bold text-white transition hover:bg-accent-600"
                >
                  Notify me
                </button>
              </div>
              <p className="mt-2 text-xs text-primary-200/70" role="status">
                {isSubscribed
                  ? 'You are on the list. We will email you when a Grade A phone lands.'
                  : 'Demo form — nothing is emailed in this prototype.'}
              </p>
            </form>
          </div>

          <FooterColumn title="Shop" links={SHOP_LINKS} />
          <FooterColumn title="Customer Support" links={SUPPORT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
        </div>

        <div className="flex flex-col gap-6 pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 text-xs text-primary-200/70 sm:flex-row sm:items-center sm:gap-6">
            <span className="inline-flex items-center gap-2">
              <Mail className="size-4" aria-hidden="true" />
              hello@refon.ph
            </span>
            <span className="inline-flex items-center gap-2">
              <Phone className="size-4" aria-hidden="true" />
              +63 2 8123 4567
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4" aria-hidden="true" />
              Quezon City, Philippines
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.07] text-primary-100 transition hover:bg-white/15 hover:text-white"
              aria-label="ReFon on Facebook (opens in a new tab)"
            >
              <FacebookIcon className="size-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.07] text-primary-100 transition hover:bg-white/15 hover:text-white"
              aria-label="ReFon on Instagram (opens in a new tab)"
            >
              <InstagramIcon className="size-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <Link
              to={MARKETPLACE_ROUTES.about}
              className="inline-flex items-center gap-1 rounded text-xs font-semibold text-primary-100/80 transition hover:text-white"
            >
              About ReFon
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-primary-200/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ReFon. A Technopreneurship prototype.</p>
          <p>Transparent details. Secure sessions. Thoughtful moderation.</p>
        </div>
      </div>
    </footer>
  )
}
