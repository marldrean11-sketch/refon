import { useEffect, useState } from 'react'
import { Timer, TimerOff } from 'lucide-react'
import { useCart } from '../useCart.js'
import {
  formatCountdown,
  secondsRemaining,
  spokenRemaining,
} from '../reservation-timing.js'
import { RESERVATION_STATUS } from '../cart-state.js'

/**
 * Live reservation countdown for one cart line.
 *
 * The hold belongs to the database, so the countdown is driven by the server's
 * `expiresAt` timestamp measured against the server clock rather than by this
 * device's clock. A wrong local clock would otherwise show a buyer a window that
 * does not exist.
 *
 * Accessibility notes, because a ticking timer is exactly the kind of thing that
 * makes a page unusable with a screen reader:
 *
 *  - The seconds are rendered with `aria-hidden`, because they change every second
 *    and announcing them would be constant noise.
 *  - A single polite live region announces the remaining time on whole minutes
 *    only, so a screen-reader user hears "about 14 minutes remaining" rather than
 *    eighty-five separate updates.
 *  - Visual urgency changes at thresholds rather than every tick, which is both
 *    calmer to look at and less likely to cause a re-announcement.
 */

/** Minutes below which the timer is styled as running out. */
const URGENT_MINUTES = 3

/** Minutes below which the timer is styled as critical. */
const CRITICAL_MINUTES = 1

function urgencyFor(seconds) {
  const minutes = Math.floor(seconds / 60)

  if (seconds <= 0) {
    return 'expired'
  }

  if (minutes < CRITICAL_MINUTES) {
    return 'critical'
  }

  if (minutes < URGENT_MINUTES) {
    return 'urgent'
  }

  return 'calm'
}

const urgencyClasses = {
  calm: 'bg-accent-50 text-accent-800 ring-accent-200',
  urgent: 'bg-amber-50 text-amber-900 ring-amber-200',
  critical: 'bg-red-50 text-danger ring-red-200',
  expired: 'bg-canvas text-muted ring-line',
}

/**
 * Ticks once a second while mounted.
 *
 * A one-second interval is only started when there is something to count down, so a
 * cart page with no reservations costs nothing.
 */
function useCountdown(expiresAt, clockOffset, isActive) {
  const [remaining, setRemaining] = useState(() =>
    isActive ? secondsRemaining(expiresAt, clockOffset) : 0,
  )

  useEffect(() => {
    if (!isActive) {
      setRemaining(0)
      return undefined
    }

    // Recomputed immediately on mount so a value passed in from an older render is
    // corrected before the first tick lands.
    setRemaining(secondsRemaining(expiresAt, clockOffset))

    const timer = window.setInterval(() => {
      const next = secondsRemaining(expiresAt, clockOffset)

      setRemaining(next)

      if (next <= 0) {
        window.clearInterval(timer)
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [expiresAt, clockOffset, isActive])

  return remaining
}

export function ReservationCountdown({ item, size = 'md' }) {
  const { clockOffset } = useCart()
  const reservation = item.reservation
  const isActive = reservation?.status === RESERVATION_STATUS.active

  const remaining = useCountdown(reservation?.expiresAt, clockOffset, isActive)

  if (!reservation) {
    return null
  }

  const urgency = isActive ? urgencyFor(remaining) : 'expired'
  const Icon = urgency === 'expired' ? TimerOff : Timer

  const label = isActive
    ? `Reserved for you · ${formatCountdown(remaining)} remaining`
    : 'Your reservation on this phone expired'

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-pill px-3 py-1.5 font-bold ring-1 ring-inset ${
        size === 'sm' ? 'text-[11px]' : 'text-xs'
      } ${urgencyClasses[urgency]}`}
      data-testid="reservation-countdown"
      data-status={isActive ? 'ACTIVE' : 'EXPIRED'}
      data-seconds-remaining={remaining}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2.4} aria-hidden="true" />

      {isActive ? (
        <>
          <span className="hidden sm:inline">Reserved for you</span>
          <span className="sm:hidden">Reserved</span>
          <span className="tabular-nums" aria-hidden="true">
            {formatCountdown(remaining)}
          </span>
        </>
      ) : (
        <span>Reservation expired</span>
      )}

      {/* One polite announcement per whole minute, instead of one per second. */}
      <span className="sr-only" role="status" aria-live="polite">
        {isActive ? spokenRemaining(remaining) : 'Your reservation expired'}
      </span>

      <span className="sr-only">{label}</span>
    </div>
  )
}
