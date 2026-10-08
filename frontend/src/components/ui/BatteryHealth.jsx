import { BatteryFull, BatteryLow, BatteryMedium } from 'lucide-react'
import { getBatteryBand } from '../../lib/listing-taxonomy.js'

/**
 * Battery health readout.
 *
 * The number is the measurement; the bar is the glance. This is presented as
 * instrumentation: a monospace percentage, a segmented label, and a flat bar
 * that only moves when the number moves. There is no rounded pill track and no
 * glow, because a battery reading is a measurement and measurements do not
 * decorate.
 *
 * `tone="inverse"` is for dark surfaces such as the hero card.
 */
export function BatteryHealth({
  percent,
  size = 'md',
  showLabel = true,
  tone = 'light',
  className = '',
}) {
  const value = Number(percent)
  const safeValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
  const band = getBatteryBand(safeValue)
  const Icon = safeValue >= 90 ? BatteryFull : safeValue >= 70 ? BatteryMedium : BatteryLow
  const textSize = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-sm' : 'text-lg'

  const isInverse = tone === 'inverse'
  const labelColor = isInverse ? 'text-primary-300' : 'text-muted'
  const trackColor = isInverse ? 'bg-white/15' : 'bg-surface-3'
  const fillColor = isInverse ? 'bg-accent-300' : band.bar
  const valueColor = isInverse ? 'text-accent-300' : band.tone

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        {showLabel && (
          <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] ${labelColor}`}>
            <Icon className="size-3.5" aria-hidden="true" />
            Battery
          </span>
        )}
        <span className={`font-mono font-semibold tabular-nums ${textSize} ${valueColor}`}>
          {safeValue}%
        </span>
      </div>
      <div
        className={`mt-2 h-1.5 overflow-hidden rounded-[2px] ${trackColor}`}
        role="progressbar"
        aria-label="Battery health percentage"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        aria-valuetext={`${safeValue} percent battery health. ${band.note}`}
      >
        <div className={`h-full rounded-[2px] ${fillColor}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  )
}