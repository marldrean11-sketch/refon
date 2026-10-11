import { BadgeCheck, ClipboardCheck, ScanSearch } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '../../lib/motion.ts'
import { BrandMark, LogoGlyph } from '../ui/BrandMark.jsx'

/**
 * The three promises on the lime panel: what is actually checked, said plainly,
 * because someone about to type a password has not yet decided to trust the site.
 */
const standard = [
  {
    icon: ClipboardCheck,
    title: 'Eleven functional checks',
    body: 'Display, touch, cameras, audio, charging, radios, buttons and biometrics.',
  },
  {
    icon: ScanSearch,
    title: 'IMEI checked, never published',
    body: 'Only the last four digits are ever stored.',
  },
  {
    icon: BadgeCheck,
    title: 'Sellers verified before listing',
    body: 'A moderator approves every listing before it goes live.',
  },
]

/**
 * The split-screen shell for sign-in, registration and account recovery.
 *
 * Left: a volt-lime panel with a Taglish greeting, two floating phones and the
 * ReFon standard. Right: the form on the dark page. Below `lg` the panel goes
 * and the form stands alone under the logo.
 */
export function AuthShell({
  children,
  eyebrow = 'Welcome back',
  headline = 'Tara, pasok!',
  lede = 'Your saved phones, your cart holds and your seller inquiries are waiting.',
}) {
  const reduceMotion = usePrefersReducedMotion()

  return (
    <div className="min-h-screen bg-page lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(30rem,1.05fr)]">
      <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-accent px-10 py-12 text-page lg:flex lg:flex-col xl:px-14">
        <div className="relative z-10">
          <BrandMark inverse />
        </div>

        <div className="relative z-10 mt-14 max-w-xl">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-page/70"
          >
            {eyebrow}
          </motion.p>
          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, type: 'spring', stiffness: 260, damping: 18 }}
            className="mt-4 font-display text-[clamp(2.75rem,4.6vw,4.25rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-page"
          >
            {headline}
          </motion.h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-page/80">{lede}</p>
        </div>

        <div className="relative z-10 my-8 min-h-[16rem] flex-1" aria-hidden="true">
          <div className="rf-float absolute left-[10%] top-6">
            <div className="relative h-60 w-32 -rotate-6 rounded-[28px] border-4 border-page bg-page shadow-2xl">
              <div className="absolute inset-x-3 bottom-4 rounded-xl bg-accent/90 px-2 py-1.5 text-center font-mono text-[11px] font-semibold text-page">
                BATT 91%
              </div>
            </div>
          </div>
          <div className="rf-float absolute left-[42%] top-14" style={{ animationDelay: '0.8s' }}>
            <div className="relative h-56 w-28 rotate-6 rounded-[26px] border-4 border-page bg-chalk shadow-2xl">
              <LogoGlyph className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2" draw={false} />
            </div>
          </div>
        </div>

        <ol className="relative z-10 grid gap-3 border-t border-page/15 pt-6">
          {standard.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-page" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-page/80">
                <span className="font-semibold text-page">{title}.</span> {body}
              </p>
            </li>
          ))}
        </ol>
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