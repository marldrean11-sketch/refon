import { apiRequest } from '../../lib/api-client.js'

/**
 * Cart endpoints.
 *
 * Thin wrappers only. The response shape is decided by the backend presenter, so
 * there is no client-side model of a cart item to keep in sync with the API.
 */

/** Reads the current cart. Works for a guest and for a signed-in buyer. */
export function getCartRequest() {
  return apiRequest('/cart')
}

/**
 * Adds a listing and takes a reservation on it.
 *
 * Resolves with `created: false` when the cart already held this listing, which is
 * a successful no-op rather than an error.
 */
export function addToCartRequest(listingId) {
  return apiRequest('/cart/items', { method: 'POST', body: { listingId } })
}

/** Removes a line and releases its reservation. */
export function removeFromCartRequest(listingId) {
  return apiRequest(`/cart/items/${listingId}`, { method: 'DELETE' })
}

/** Empties the cart and releases every reservation. */
export function emptyCartRequest() {
  return apiRequest('/cart', { method: 'DELETE' })
}

// There is deliberately no merge call here. Sign-in merges the guest cart into the
// account cart on the server as part of establishing the session, so a client-initiated
// merge would be a second way to do a thing that already happens exactly once. The
// server keeps `POST /api/cart/merge` for a buyer who signed in on another tab.
