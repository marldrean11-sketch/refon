import {
  getCheckoutOptions,
  quoteCheckout,
} from '../services/checkout.service.js'
import { placeOrder as placeOrderService } from '../services/order.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { ApiError } from '../utils/api-error.js'

/**
 * Checkout endpoints.
 *
 * The cart owner is the authenticated buyer, taken from the session and never from
 * the request body, so a client cannot price somebody else's cart.
 */

/**
 * Delivery methods, payment methods, and zones for the buyer's region.
 *
 * The fee a buyer will pay depends on their own cart subtotal, because standard
 * delivery is free above a threshold, so this reads the buyer's cart rather than
 * serving a static catalogue.
 */
export const getOptions = asyncHandler(async (req, res) => {
  const options = await getCheckoutOptions({
    userId: req.user.id,
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
  const { deliveryMethodId, paymentMethodId, details } = req.validatedBody

  try {
    const result = await quoteCheckout({
      userId: req.user.id,
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
 * Places the order: the same validation and pricing as the quote, then one order
 * per seller, the phones taken off sale and the cart emptied, in one transaction.
 */
export const placeOrder = asyncHandler(async (req, res) => {
  const { deliveryMethodId, paymentMethodId, details } = req.validatedBody

  try {
    const result = await placeOrderService({
      userId: req.user.id,
      deliveryMethodId,
      paymentMethodId,
      details,
    })

    return res.status(201).json(result)
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
