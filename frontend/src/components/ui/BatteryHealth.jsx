import { BatteryFull, BatteryLow, BatteryMedium } from 'lucide-react'
import { getBatteryBand } from '../../lib/listing-taxonomy.js'

/**
 * Battery health indicator.
 *
 * The percentage is only trustworthy if the buyer can read it at a glance, so
 * the bar, the number, and the colour band all move together.
 *
 * `tone="inverse"` is for dark surfaces such as the hero card. The default green
 * band is invisible on navy, so the inverse variant uses white text and a light
 * bar rather than trying to recolour the semantic band.
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
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-xs' : 'text-base'

  const isInverse = tone === 'inverse'
  const labelColor = isInverse ? 'text-primary-100/75' : 'text-muted'
  const trackColor = isInverse ? 'bg-white/20' : 'bg-slate-200'
  const fillColor = isInverse ? 'bg-accent-300' : band.bar
  const valueColor = isInverse ? 'text-accent-200' : band.tone

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
        {showLabel && (
          <span className={`inline-flex items-center gap-1.5 ${labelColor}`}>
            <Icon className="size-4" aria-hidden="true" />
            Battery health
          </span>
        )}
        <span className={`font-display font-bold ${textSize} ${valueColor}`}>{safeValue}%</span>
      </div>
      <div
        className={`mt-2 h-2 overflow-hidden rounded-pill ${trackColor}`}
        role="progressbar"
        aria-label="Battery health percentage"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        aria-valuetext={`${safeValue} percent battery health. ${band.note}`}
      >
        <div className={`h-full rounded-pill ${fillColor}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  )
}
