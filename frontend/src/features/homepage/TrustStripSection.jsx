import { BadgeCheck, BatteryCharging, ClipboardCheck, ShieldCheck } from 'lucide-react'
import { TRUST_STRIP } from '../../content/home-content.js'
import { Container } from '../design/Container.jsx'

const ICONS = {
  tested: ClipboardCheck,
  battery: BatteryCharging,
  graded: BadgeCheck,
  warranty: ShieldCheck,
}

/**
 * The standard.
 *
 * Sits directly under the hero because these four are the objections a buyer has
 * in the first five seconds: is it tested, is the battery real, do I know the
 * condition, and am I covered if it fails.
 *
 * It is rendered as one divided bar of four numbered cells rather than four
 * floating icon cards. The previous version used four identical rounded tiles
 * with coloured icon squares, which is the most recognisable "generic landing
 * page" component there is; a single hairline-divided bar reads as a published
 * standard instead, and the numbers make it scannable.
 */
export function TrustStripSection() {
  return (
    <section className="border-b border-line bg-surface" aria-label="Why buyers trust ReFon">
      <Container className="py-0">
        <ul className="grid gap-px border-x border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_STRIP.map((item, index) => {
            const Icon = ICONS[item.id] ?? ShieldCheck

            return (
              <li key={item.id} className="flex items-start gap-3 bg-surface px-5 py-5">
                <span className="flex shrink-0 flex-col items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold tabular-nums text-subtle">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Icon className="size-5 text-accent-600" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight text-ink">{item.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{item.detail}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}