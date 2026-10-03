import { BadgeCheck, ScanSearch, ShieldCheck } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { BrandMark } from '../ui/BrandMark.jsx'

const trustPoints = [
  {
    icon: ShieldCheck,
    title: 'Moderated listings',
    description: 'Every phone is reviewed before it reaches buyers.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified sellers',
    description: 'A clear trust signal you can check at a glance.',
  },
  {
    icon: ScanSearch,
    title: 'Condition transparency',
    description: 'Battery, storage, and cosmetic details made clear.',
  },
]

export function AuthShell({ children }) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(32rem,1.08fr)]">
      <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-primary-950 px-10 py-12 text-white lg:flex lg:flex-col xl:px-16">
        <div
          className="absolute -right-32 -top-32 size-96 rounded-full bg-primary-500/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-40 -left-20 size-[28rem] rounded-full bg-accent-500/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10">
          <BrandMark inverse />
        </div>

        <div className="relative z-10 my-auto max-w-xl py-14">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary-100 backdrop-blur"
          >
            <span className="size-1.5 rounded-full bg-accent-400" aria-hidden="true" />
            Trusted second-hand tech
          </motion.p>
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="max-w-lg text-5xl font-semibold leading-[1.04] tracking-[-0.045em] text-white xl:text-6xl"
          >
            Better phones, backed by trust.
          </motion.h1>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-6 max-w-lg text-lg leading-body text-primary-100"
          >
            ReFon brings verified sellers, transparent condition details, and
            thoughtful moderation together in one calm marketplace.
          </motion.p>

          <div className="mt-10 space-y-4">
            {trustPoints.map(({ icon: Icon, title, description }, index) => (
              <motion.div
                key={title}
                initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 + index * 0.07 }}
                className="flex max-w-lg gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-500/15 text-accent-300">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-primary-100/80">
                    {description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-primary-200/70">
          © {new Date().getFullYear()} ReFon. Built for confident reuse.
        </p>
      </aside>

      <main
        id="main-content"
        tabIndex={-1}
        className="relative flex min-h-[100dvh] flex-col overflow-hidden px-5 py-6 focus:outline-none sm:px-8 lg:px-12 lg:py-10 xl:px-20"
      >
        <div
          className="pointer-events-none absolute right-0 top-0 size-72 rounded-full bg-primary-100/70 blur-3xl lg:hidden"
          aria-hidden="true"
        />
        <div className="relative z-10 flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <span className="hidden rounded-full border border-line bg-white/80 px-3 py-1.5 text-xs font-semibold text-muted shadow-sm backdrop-blur sm:inline-flex lg:hidden">
            Secure account access
          </span>
        </div>

        <div className="relative z-10 my-auto flex w-full justify-center py-10 sm:py-14">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="w-full max-w-lg"
          >
            {children}
          </motion.div>
        </div>

        <p className="relative z-10 text-center text-xs leading-relaxed text-muted lg:text-right">
          Protected with encrypted credentials and secure session cookies.
        </p>
      </main>
    </div>
  )
}
