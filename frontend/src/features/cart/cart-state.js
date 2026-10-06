/**
 * Cart state helpers.
 *
 * The backend already decides availability, price changes, and reservation state
 * and reports them per item. These functions only give that state names and shapes
 * the UI can branch on, so no component has to re-derive it from raw flags.
 *
 * Nothing here computes money or decides whether something is buyable — those
 * always come from the server.
 */

/** Availability values the cart API reports for a line. */
export const AVAILABILITY = Object.freeze({
  available: 'AVAILABLE',
  expired: 'RESERVATION_EXPIRED',
  unavailable: 'UNAVAILABLE',
})

/** Reservation states the cart API reports for a line. */
export const RESERVATION_STATUS = Object.freeze({
  active: 'ACTIVE',
  expired: 'EXPIRED',
})

/** An empty cart, so a non-cart route never has to null-check. */
export const EMPTY_CART = Object.freeze({
  id: null,
  owner: 'GUEST',
  currency: 'PHP',
  itemCount: 0,
  purchasableCount: 0,
  hasUnavailableItems: false,
  subtotal: 0,
  serverTime: null,
  items: [],
})

/** True when the line cannot be bought and must be removed before checkout. */
export function isItemUnavailable(item) {
  return item?.availability === AVAILABILITY.unavailable
}

/**
 * True when the buyer's hold on this device has lapsed.
 *
 * The device may be free again or already taken by somebody else. Either way the
 * buyer has to act, so the cart cannot be checked out with this line as-is.
 */
export function isReservationExpired(item) {
  return item?.availability === AVAILABILITY.expired
}

/** True when the line is in a state that blocks checkout. */
export function isItemBlockingCheckout(item) {
  return isItemUnavailable(item) || isReservationExpired(item)
}

/** Lines that block checkout, so the UI can name them rather than guess. */
export function blockingItems(items = []) {
  return items.filter(isItemBlockingCheckout)
}

/** True when every line in the cart can proceed to checkout. */
export function isCartCheckoutable(cart) {
  return cart.itemCount > 0 && blockingItems(cart.items).length === 0
}

/** The price a buyer will actually pay for this line: the live listing price. */
export function lineTotal(item) {
  return Number(item.currentPrice ?? 0) * Number(item.quantity ?? 1)
}

/** Lines whose price moved since they were added, split by direction. */
export function changedPriceItems(items = []) {
  return {
    increased: items.filter((item) => item.issues?.includes('PRICE_INCREASED')),
    decreased: items.filter((item) => item.issues?.includes('PRICE_DECREASED')),
  }
}

/** Device label used across the cart, checkout, and confirmation screens. */
export function deviceName(listing) {
  if (!listing) {
    return 'Phone'
  }

  return `${listing.brand} ${listing.model}`.trim()
}

/**
 * The model alone, for a heading that already shows the brand above it.
 *
 * Rendering "Apple iPhone 13" under an "Apple" eyebrow reads as a stutter, and at
 * narrow widths it wraps to three lines.
 */
export function deviceModel(listing) {
  return listing?.model?.trim() || 'Phone'
}

/** "128 GB · Midnight" — omitted entirely when neither fact is recorded. */
export function deviceVariant(listing) {
  return [listing?.storage, listing?.color]
    .filter((value) => typeof value === 'string' && value.trim() && value !== 'As pictured')
    .join(' · ')
}
