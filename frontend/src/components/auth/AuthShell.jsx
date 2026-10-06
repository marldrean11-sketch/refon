import { BadgeCheck, ClipboardCheck, ScanSearch } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '../../lib/motion.ts'
import { BrandMark } from '../ui/BrandMark.jsx'

/**
 * The published standard.
 *
 * The left panel used to be a marketing panel: a gradient, a headline about
 * trust, and three cards with icons in coloured rounded squares. It is now the
 * thing the form is actually about — the inspection standard, typeset as a
 * numbered list with the same monospace voice the rest of the product uses.
 *
 * That is a real argument, not decoration: someone about to type a password has
 * not yet decided to trust the site, and reading what is actually checked is a
 * better reason than being told to feel reassured.
 */
const standard = [
  {
    icon: ClipboardCheck,
    title: 'Eleven functional checks',
    body: 'Display, touch, cameras, audio, charging, radios, buttons, and biometrics. Every one is recorded per device.',
  },
  {
    icon: ScanSearch,
    title: 'IMEI checked, never published',
    body: 'The identifier is confirmed against carrier records. Only the last four digits are ever stored.',
  },
  {
    icon: BadgeCheck,
    title: 'Sellers verified before listing',
    body: 'Identity and business details are reviewed, and a moderator approves every listing before it goes live.',
  },
]

export function AuthShell({ children }) {
  const reduceMotion = usePrefersReducedMotion()

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(30rem,1.05fr)]">
      <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-primary-950 px-10 py-12 text-white lg:flex lg:flex-col xl:px-14">
        <div
          className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:72px_72px]"
          aria-hidden="true"
        />
        <div
          className="absolute -left-24 top-1/4 size-[26rem] rounded-full bg-accent-600/10 blur-[100px]"
          aria-hidden="true"
        />

        <div className="relative z-10">
          <BrandMark inverse />
        </div>

        <div className="relative z-10 my-auto max-w-xl py-14">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300"
          >
            The ReFon standard
          </motion.p>

          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mt-5 font-display text-4xl font-bold leading-[1.03] tracking-[-0.04em] text-white xl:text-5xl"
          >
            Refurbished, with the measurements published.
          </motion.h2>

          <ol className="mt-10 border-t border-primary-800">
            {standard.map(({ icon: Icon, title, body }, index) => (
              <motion.li
                key={title}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + index * 0.07 }}
                className="flex gap-4 border-b border-primary-800 py-5"
              >
                <span className="flex shrink-0 flex-col items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold tabular-nums text-primary-500">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Icon className="size-5 text-accent-400" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-base font-bold tracking-tight text-white">
                    {title}
                  </p>
                  <p className="mt-1.5 text-sm leading-body text-primary-400">{body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        <p className="relative z-10 font-mono text-[11px] uppercase tracking-[0.1em] text-primary-500">
          © {new Date().getFullYear()} ReFon
        </p>
      </aside>

      <main
        id="main-content"
        tabIndex={-1}
        className="relative flex min-h-[100dvh] flex-col overflow-hidden px-5 py-6 focus:outline-none sm:px-8 lg:px-12 lg:py-10 xl:px-20"
      >
        <div className="relative z-10 flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <span className="hidden font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle sm:inline-flex lg:hidden">
            Secure account access
          </span>
        </div>

        <div className="relative z-10 my-auto flex w-full justify-center py-10 sm:py-14">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="w-full max-w-md"
          >
            {children}
          </motion.div>
        </div>

        <p className="relative z-10 text-center text-xs leading-relaxed text-subtle lg:text-right">
          Protected with encrypted credentials and secure session cookies.
        </p>
      </main>
    </div>
  )
}