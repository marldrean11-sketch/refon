import { useId, useState } from 'react'
import { BatteryFull, BatteryLow, BatteryMedium, Clock3, Wrench } from 'lucide-react'
import { getBatteryBand } from '../../lib/listing-taxonomy.js'

/**
 * Screen-on hours a typical phone gets from a brand-new battery in mixed use.
 * A round, deliberately modest figure: the point of the explainer is the
 * *proportion* lost as health drops, not a promise about any one model.
 */
const NEW_BATTERY_HOURS = 7

function iconFor(value) {
  if (value >= 90) return BatteryFull
  if (value >= 80) return BatteryMedium
  return BatteryLow
}

function hoursLabel(hours) {
  const whole = Math.floor(hours)
  const minutes = Math.round((hours - whole) * 60 / 15) * 15
  return minutes === 60 ? `${whole + 1}h` : minutes ? `${whole}h ${minutes}m` : `${whole}h`
}

/**
 * "What does 85% battery health actually mean?" Drag the slider and see the
 * health band ReFon uses, roughly how much screen time that leaves compared
 * with a new battery, and whether a battery swap is worth budgeting for.
 *
 * It is a guide, and says so: real battery life depends on the model, the
 * screen brightness and the apps. The bands are the same ones the shop filters
 * and the product pages use (`lib/listing-taxonomy.js`).
 */
export function BatteryExplainer({ initial = 85, className = '' }) {
  const id = useId()
  const [value, setValue] = useState(initial)
  const band = getBatteryBand(value)
  const hours = (NEW_BATTERY_HOURS * value) / 100
  const lostMinutes = Math.round(((NEW_BATTERY_HOURS - hours) * 60) / 5) * 5
  const Icon = iconFor(value)
  const tone = value >= 90 ? 'text-accent' : value >= 80 ? 'text-ink' : value >= 70 ? 'text-warning' : 'text-danger'
  const fill = value >= 90 ? 'bg-accent' : value >= 80 ? 'bg-primary-700' : value >= 70 ? 'bg-warning' : 'bg-danger'

  return (
    <div data-testid="battery-explainer" className={`rf-spotlight rounded-card-lg border border-line bg-card p-6 sm:p-8 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-md">
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent">Battery health explainer</p>
          <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
            What does {value}% actually mean?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Battery health is how much charge the cell still holds compared with a new one. Drag to compare.
          </p>
        </div>
        <div className={`flex items-center gap-3 ${tone}`}>
          <Icon className="size-10 transition-colors duration-300" strokeWidth={1.6} aria-hidden="true" />
          <span className="font-display text-5xl font-extrabold tabular-nums">{value}%</span>
        </div>
      </div>

      <label htmlFor={id} className="sr-only">
        Battery health percentage
      </label>
      <input
        id={id}
        type="range"
        min={60}
        max={100}
        step={1}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        className="mt-6 w-full"
      />
      <div className="mt-1 flex justify-between font-mono text-[11px] text-subtle">
        <span>60%</span>
        <span>70%</span>
        <span>80%</span>
        <span>90%</span>
        <span>100%</span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-well p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">ReFon band</p>
          <p className={`mt-1 font-semibold ${tone}`}>{band.label}</p>
          <p className="mt-1 text-[13px] text-muted">{band.note}</p>
        </div>
        <div className="rounded-2xl bg-well p-4">
          <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">
            <Clock3 className="size-3.5" aria-hidden="true" /> Screen time, roughly
          </p>
          <p className="mt-1 font-semibold text-ink">
            {hoursLabel(hours)} <span className="font-normal text-muted">vs {NEW_BATTERY_HOURS}h new</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
            <div
              className={`h-full w-full origin-left rounded-full transition-transform duration-300 ${fill}`}
              style={{ transform: `scaleX(${value / 100})` }}
            />
          </div>
          <p className="mt-1.5 text-[13px] text-muted">
            {lostMinutes > 0 ? `About ${lostMinutes} min less per charge.` : 'Same as a new battery.'}
          </p>
        </div>
        <div className="rounded-2xl bg-well p-4">
          <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">
            <Wrench className="size-3.5" aria-hidden="true" /> Battery swap?
          </p>
          <p className="mt-1 font-semibold text-ink">
            {value >= 85 ? 'Not needed' : value >= 80 ? 'Not yet' : value >= 70 ? 'Worth budgeting for' : 'Plan for one soon'}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            {value >= 80
              ? 'Most phones are rated to stay above 80% for their first years of use.'
              : 'Below 80%, many phones start to feel it by evening.'}
          </p>
        </div>
      </div>

      <p className="mt-4 text-[12px] text-subtle">
        A rough guide: real battery life depends on the model, screen brightness and apps. Every ReFon listing shows
        the figure measured on that exact phone.
      </p>
    </div>
  )
}
