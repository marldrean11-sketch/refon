/**
 * Reservation countdown timing.
 *
 * A reservation expires at a timestamp the **database** decided. Counting down from
 * `expiresAt - Date.now()` would trust the buyer's device clock, which can be
 * minutes or hours wrong and would make a hold appear to last far longer or far
 * shorter than it really does.
 *
 * So the offset between the two clocks is measured once per cart load:
 *
 *     offset = serverTime - localTimeAtReceipt
 *
 * and every remaining-time calculation uses `Date.now() + offset` as "now". Each
 * tick then advances by its own elapsed time, so a backgrounded tab that resumes
 * after the hold lapsed corrects itself on the next tick rather than drifting.
 *
 * `serverTime` is taken from the cart payload. When it is missing the offset falls
 * back to zero and the countdown is simply driven by the server-provided
 * `secondsRemaining`, which is still correct at the instant the response arrived.
 */

/** Milliseconds per second, named once for readability below. */
const SECOND = 1000

/** A frozen empty offset, used when the server gave no clock to compare against. */
export const NO_CLOCK_OFFSET = 0

/**
 * Difference between the server clock and this device's clock.
 *
 * @param {string|null} serverTime ISO timestamp from the API
 * @param {number} receivedAt `Date.now()` when the response arrived
 * @returns {number} milliseconds to add to the local clock to approximate the server
 */
export function computeClockOffset(serverTime, receivedAt = Date.now()) {
  const parsed = Date.parse(serverTime ?? '')

  if (!Number.isFinite(parsed)) {
    return NO_CLOCK_OFFSET
  }

  // Rounded so a fractional millisecond never turns into a 1ms jitter per tick.
  return Math.round(parsed - receivedAt)
}

/**
 * Seconds left on a reservation, measured against the server clock.
 *
 * Returns 0 rather than a negative number once the hold has lapsed, so callers never
 * have to guard before rendering.
 */
export function secondsRemaining(expiresAt, clockOffset = NO_CLOCK_OFFSET, now = Date.now()) {
  const expires = Date.parse(expiresAt ?? '')

  if (!Number.isFinite(expires)) {
    return 0
  }

  return Math.max(0, Math.floor((expires - (now + clockOffset)) / SECOND))
}

/** `mm:ss` for a countdown under an hour, then `h:mm:ss`. */
export function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * A short spoken form of the remaining time, for screen readers.
 *
 * The visible timer is updated every second, which would otherwise make a screen
 * reader announce the countdown continuously. Announcing on whole minutes instead
 * means a screen-reader user hears "14 minutes remaining" rather than eighty-five
 * interruptions.
 */
export function spokenRemaining(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0))

  if (safe === 0) {
    return 'expired'
  }

  if (safe < 60) {
    return 'less than a minute remaining'
  }

  const minutes = Math.floor(safe / 60)

  if (minutes === 1) {
    return 'about 1 minute remaining'
  }

  return `about ${minutes} minutes remaining`
}
