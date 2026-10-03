import { ArrowUpRight, BadgeCheck, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../ui/BrandMark.jsx'
import { AUTH_ROUTES } from '../../features/auth/auth.routes.js'

export function MarketplaceFooter() {
  return (
    <footer className="relative overflow-hidden bg-primary-950 text-white">
      <div
        className="absolute -right-24 -top-24 size-80 rounded-full bg-primary-500/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[1.4fr_0.6fr_0.6fr]">
          <div>
            <BrandMark inverse />
            <p className="mt-5 max-w-md text-base leading-body text-primary-100/80">
              Better phones, backed by clear condition details, verified sellers,
              and thoughtful moderation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-primary-100">
                <ShieldCheck className="size-4 text-accent-400" aria-hidden="true" />
                Moderated marketplace
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-primary-100">
                <BadgeCheck className="size-4 text-accent-400" aria-hidden="true" />
                Verified trust signals
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-200/70">
              Marketplace
            </p>
            <div className="mt-4 space-y-3 text-sm font-semibold">
              <Link
                to={AUTH_ROUTES.home}
                className="block text-primary-100/80 transition hover:text-white"
              >
                Home
              </Link>
              <Link
                to={AUTH_ROUTES.buyer}
                className="block text-primary-100/80 transition hover:text-white"
              >
                Browse Phones
              </Link>
              <a
                href="/#moderation"
                className="inline-flex items-center gap-1 text-primary-100/80 transition hover:text-white"
              >
                How moderation works
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-200/70">
              Account
            </p>
            <div className="mt-4 space-y-3 text-sm font-semibold">
              <Link
                to={AUTH_ROUTES.login}
                className="block text-primary-100/80 transition hover:text-white"
              >
                Sign in
              </Link>
              <Link
                to={AUTH_ROUTES.register}
                className="block text-primary-100/80 transition hover:text-white"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-7 text-xs text-primary-200/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ReFon. Built for confident reuse.</p>
          <p>Transparent details. Secure sessions. Thoughtful moderation.</p>
        </div>
      </div>
    </footer>
  )
}
