import { BadgeCheck, BatteryCharging, ClipboardCheck, ShieldCheck } from 'lucide-react'
import { TRUST_STRIP } from '../../content/home-content.js'

const ICONS = {
  tested: ClipboardCheck,
  battery: BatteryCharging,
  graded: BadgeCheck,
  warranty: ShieldCheck,
}

/**
 * Trust strip.
 *
 * Sits directly under the hero because these four are the objections a buyer
 * has in the first five seconds: is it tested, is the battery real, do I know
 * the condition, and am I covered if it fails.
 */
export function TrustStripSection() {
  return (
    <section className="border-b border-line bg-white" aria-label="Why buyers trust ReFon">
      <div className="mx-auto grid max-w-7xl gap-4 px-5 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {TRUST_STRIP.map((item) => {
          const Icon = ICONS[item.id] ?? ShieldCheck

          return (
            <div key={item.id} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{item.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.detail}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
