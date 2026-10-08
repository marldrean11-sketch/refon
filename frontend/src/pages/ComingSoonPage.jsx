import { CheckCircle2, Search, ShieldCheck, Store } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '../lib/motion.ts'
import { useAuth } from '../features/auth/useAuth.js'

const pageContent = {
  ADMIN: {
    icon: ShieldCheck,
    eyebrow: 'Admin access secured',
    title: 'Admin Dashboard',
    description:
      'The moderation workspace is the next ReFon build. Your administrator session and route access are working.',
  },
  SELLER: {
    icon: Store,
    eyebrow: 'Seller space secured',
    title: 'Seller Dashboard',
    description:
      'Your seller profile is linked and pending verification. Listing tools will be added in the next build.',
  },
  BUYER: {
    icon: Search,
    eyebrow: 'Buyer access secured',
    title: 'Browse Phones',
    description:
      'Your buyer account is ready. The moderated phone marketplace will appear here in the next build.',
  },
}

export function ComingSoonPage() {
  const { user } = useAuth()
  const content = pageContent[user.role] ?? pageContent.BUYER
  const Icon = content.icon
  const reduceMotion = usePrefersReducedMotion()

  return (
    <section className="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-7xl items-center px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative w-full overflow-hidden rounded-card-xl border border-line bg-white p-7 shadow-card sm:p-10 lg:max-w-3xl lg:p-14"
      >
        <div
          className="absolute -right-20 -top-20 size-64 rounded-full bg-primary-100/80 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary-500 text-white shadow-card">
            <Icon className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-accent-700">
            {content.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {content.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-body text-muted">
            {content.description}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-accent-800">
              <span className="size-1.5 rounded-full bg-accent-500" aria-hidden="true" />
              Signed in as {user.role.toLowerCase()}
            </span>
            {user.role === 'SELLER' && (
              <span className="rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-muted">
                Verification: {user.sellerVerificationStatus ?? 'PENDING'}
              </span>
            )}
          </div>
          <div className="mt-10 inline-flex items-center gap-2 rounded-xl bg-primary-50 px-5 py-3 text-sm font-bold text-primary-700">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Role access confirmed
          </div>
        </div>
      </motion.div>
    </section>
  )
}
