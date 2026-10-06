/**
 * The standard.
 *
 * Sits directly under the hero because these four are the objections a buyer has in
 * the first five seconds: is it tested, am I covered if it fails, can I send it
 * back, and what does delivery cost.
 *
 * One divided bar of four numbered cells rather than four floating icon cards.
 * Four identical rounded tiles with coloured icon squares is the most recognisable
 * "generic landing page" component there is; a single hairline-divided bar reads as
 * a published standard instead, and the numbers make it scannable.
 *
 * Every figure here is one the site already publishes — see the citations on
 * `TRUST_STRIP` in `content/home-content.js`. The Phase 3 brief asked for "30-day
 * returns" and a "40+ point test"; neither is true of this codebase, which
 * publishes a 7-day window and an 11-point inspection, so neither is printed here.
 */
import { motion } from 'framer-motion'
import { ClipboardCheck, ShieldCheck, Truck, Undo2 } from 'lucide-react'
import { TRUST_STRIP } from '../../content/home-content.js'
import { Container } from '../design/Container.jsx'
import { fadeUp, stagger, usePrefersReducedMotion } from '../../lib/motion.ts'

const ICONS = {
  tested: ClipboardCheck,
  warranty: ShieldCheck,
  returns: Undo2,
  delivery: Truck,
}

export function TrustStripSection() {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <section className="border-b border-line bg-page pb-4 pt-4 lg:pb-6 lg:pt-6" aria-label="Why buyers trust ReFon">
      <Container size="full" className="px-4 sm:px-6 lg:px-8">
        <motion.ul
          variants={reducedMotion ? undefined : stagger(0.08)}
          initial={reducedMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="grid gap-px overflow-hidden rounded-card-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4"
        >
          {TRUST_STRIP.map((item, index) => {
            const Icon = ICONS[item.id] ?? ShieldCheck

            return (
              <motion.li
                key={item.id}
                variants={reducedMotion ? undefined : fadeUp}
                className="flex items-start gap-3.5 bg-card px-6 py-7"
              >
                <span className="flex shrink-0 flex-col items-center gap-2">
                  {/* `text-muted`, not `text-subtle`: #94938c is 3.08:1 on the
                      white cell behind it, which is under the 4.5:1 AA threshold at
                      this size. `text-muted` is 5.36:1 on the same ground. */}
                  <span className="text-[10px] font-semibold tabular-nums text-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Icon className="size-5 text-accent-strong" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight text-ink">{item.label}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{item.detail}</p>
                </div>
              </motion.li>
            )
          })}
        </motion.ul>
      </Container>
    </section>
  )
}
