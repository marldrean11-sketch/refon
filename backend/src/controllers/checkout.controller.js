import {
  getCheckoutOptions,
  quoteCheckout,
} from '../services/checkout.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import {
  hashGuestCartToken,
  readGuestCartToken,
} from '../utils/cart-token.js'
import { ApiError } from '../utils/api-error.js'

/**
 * Checkout endpoints.
 *
 * Like the cart, the owner is resolved from the session or the guest cookie and
 * never from the request body, so a client cannot price somebody else's cart.
 */

/**
 * Cart identity for a checkout request.
 *
 * Mirrors the cart controller's resolution. A signed-in non-admin owns an account
 * cart; otherwise the guest cookie identifies the cart.
 */
function checkoutOwnerFor(req) {
  if (req.user && req.user.role !== 'ADMIN') {
    return { userId: req.user.id, guestTokenHash: null }
  }

  const guestToken = readGuestCartToken(req)

  return {
    userId: null,
    guestTokenHash: guestToken ? hashGuestCartToken(guestToken) : null,
  }
}

/**
 * Delivery methods, payment methods, and zones for the buyer's region.
 *
 * Public on purpose: the buyer needs to see fees before signing in, which is the
 * same reason the catalog and product pages are public.
 */
export const getOptions = asyncHandler(async (req, res) => {
  const owner = checkoutOwnerFor(req)

  const options = await getCheckoutOptions({
    ...owner,
    zoneId: req.validatedQuery?.zoneId,
  })

  return res.status(200).json(options)
})

/**
 * Prices a checkout and validates that it can proceed.
 *
 * Creates nothing. Phase 7 replaces this with an order write; the response shape is
 * already what an order creation would return, so the frontend does not have to be
 * rebuilt when that lands.
 */
export const getQuote = asyncHandler(async (req, res) => {
  const owner = checkoutOwnerFor(req)
  const { deliveryMethodId, paymentMethodId, details } = req.validatedBody

  try {
    const result = await quoteCheckout({
      ...owner,
      deliveryMethodId,
      paymentMethodId,
      details,
    })

    return res.status(200).json(result)
  } catch (error) {
    const flattened = toFieldErrors(error)

    if (flattened) {
      return res.status(flattened.status).json({
        message: flattened.message,
        code: flattened.code,
        errors: flattened.errors,
      })
    }

    throw error
  }
})

/**
 * Rewrites validation errors so every one is keyed by the form field it belongs to.
 *
 * The validator reports a bad contact field as `details.mobile` because that is its
 * path in the request body, while the service reports the same field as `mobile`. A
 * client should not have to know which layer caught the problem in order to point at
 * the right input, so this endpoint publishes one convention: bare field names.
 *
 * Kept here rather than in the shared validator because stripping a `details.`
 * prefix is specific to this endpoint's request shape, not a general rule.
 */
function toFieldErrors(error) {
  if (!(error instanceof ApiError) || !error.details) {
    return null
  }

  const flattened = {}

  for (const [key, message] of Object.entries(error.details)) {
    flattened[key.replace(/^details\./, '')] = message
  }

  return {
    status: error.statusCode,
    code: error.code,
    message: error.message,
    errors: flattened,
  }
}
