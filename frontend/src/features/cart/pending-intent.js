/**
 * The pending "add this phone" intent.
 *
 * A visitor who clicks Add to Cart is sent to sign in, and the phone they wanted
 * should be in their cart when they arrive back. Something has to carry that intent
 * across the sign-in round trip, and it has to be short-lived, private, and
 * impossible to abuse.
 *
 * **Why sessionStorage rather than router state.**
 *
 * Router state (`location.state`) is the obvious choice and is used elsewhere in
 * this app for the plain "return to where you were" case, but it does not survive
 * a page load. A visitor who bookmarks `/cart`, opens it in a new tab, or refreshes
 * while sitting on the sign-in page reaches login with no state at all, and the
 * intent is silently lost. sessionStorage survives all three.
 *
 * sessionStorage is also the right *lifetime*: it is scoped to one tab and dies
 * with it. `localStorage` would leak an intent across tabs, so two people sharing a
 * machine could pick up each other's pending add, and it would outlive the session
 * and re-add a phone on some later, unrelated visit.
 *
 * **What is stored, and what is deliberately not.**
 *
 * A listing id and an action name. Nothing else. No price, no cart contents, no
 * totals. Those are all decided by the server, and a value a script can read and
 * write is the wrong place to state them even temporarily.
 *
 * **Why the id is validated on read.**
 *
 * sessionStorage is attacker-writable: any script on this origin, and the user
 * themselves from devtools, can put anything in it. The value is therefore treated
 * as untrusted input and checked against the same UUID shape the API requires, so a
 * tampered entry produces no request rather than a malformed one.
 */

/** A single canonical UUID, matching the shape the listings API accepts. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const STORAGE_KEY = 'refon:pending-cart-intent'

/** Actions that can be deferred. Anything else is discarded on read. */
const ACTIONS = new Set(['add-to-cart', 'save-wishlist'])

function storage() {
  // Present in every browser this app supports, but guarded so a privacy mode or
  // an embedded webview that refuses storage cannot break sign-in.
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/**
 * Records what the visitor was trying to do.
 *
 * A malformed listing id is not stored at all, so a bad id never survives to be
 * replayed later.
 */
export function rememberIntent(listingId, action) {
  const store = storage()

  if (!store) {
    return
  }

  if (typeof listingId !== 'string' || !UUID_PATTERN.test(listingId)) {
    return
  }

  if (!ACTIONS.has(action)) {
    return
  }

  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ listingId, action }))
  } catch {
    // A full or unavailable store must not break the click that triggered this.
  }
}

/**
 * Returns the recorded intent, or null.
 *
 * The entry is cleared before it is returned, so the intent survives exactly one
 * redirect-and-replay cycle. That is what makes a double replay impossible even if
 * two effects race: the second reader finds nothing.
 */
export function takeIntent() {
  const store = storage()

  if (!store) {
    return null
  }

  let raw = null

  try {
    raw = store.getItem(STORAGE_KEY)
    store.removeItem(STORAGE_KEY)
  } catch {
    return null
  }

  if (!raw) {
    return null
  }

  let parsed = null

  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  const { listingId, action } = parsed ?? {}

  if (typeof listingId !== 'string' || !UUID_PATTERN.test(listingId)) {
    return null
  }

  if (!ACTIONS.has(action)) {
    return null
  }

  return { listingId, action }
}

/**
 * Drops the intent without replaying it.
 *
 * Called on logout and whenever the signed-in role is not a buyer, so a stale entry
 * cannot resurface later under a different account.
 */
export function clearIntent() {
  const store = storage()

  if (!store) {
    return
  }

  try {
    store.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do: the entry is unreachable either way.
  }
}