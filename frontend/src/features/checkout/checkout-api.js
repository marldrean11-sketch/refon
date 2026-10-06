import { apiRequest } from '../../lib/api-client.js'

/**
 * Checkout endpoints.
 *
 * The request carries choices and contact details only. There is deliberately no
 * way to send a price, a fee, a quantity, or a listing id — the backend decides all
 * of those from the buyer's own cart.
 */

/** Delivery methods, payment methods, and zones for a region. */
export function getCheckoutOptionsRequest(zoneId) {
  const query = zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''
  return apiRequest(`/checkout/options${query}`)
}

/**
 * Prices a checkout and confirms it can proceed.
 *
 * Creates nothing: this returns a quote, not an order. Phase 7 turns the same
 * payload into a persisted order.
 */
export function getCheckoutQuoteRequest({ deliveryMethodId, paymentMethodId, details }) {
  return apiRequest('/checkout/quote', {
    method: 'POST',
    body: { deliveryMethodId, paymentMethodId, details },
  })
}
