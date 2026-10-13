import { Router } from 'express'
import { getOptions, getQuote, placeOrder } from '../controllers/checkout.controller.js'
import { authenticate, requireBuyer } from '../middlewares/auth.middleware.js'
import { checkoutLimiter } from '../middlewares/rate-limit.middleware.js'
import {
  validateCheckoutOptionsQuery,
  validateCheckoutQuote,
} from '../validators/checkout.validator.js'

const router = Router()

/**
 * Checkout is a buyer action end to end.
 *
 * `authenticate` before `requireBuyer`: 401 for a visitor, 403 for a signed-in
 * seller or admin. Gating `/options` as well as `/quote` is deliberate - both read
 * or price the buyer's own cart, and the only frontend consumer of `/options` is
 * the checkout page, which is itself buyer-only.
 */
router.get(
  '/options',
  authenticate,
  requireBuyer,
  validateCheckoutOptionsQuery,
  getOptions,
)

// Prices a checkout and refuses one that cannot proceed. Creates nothing.
router.post(
  '/quote',
  checkoutLimiter,
  authenticate,
  requireBuyer,
  validateCheckoutQuote,
  getQuote,
)

// Places the order. Same request body as /quote.
router.post(
  '/place-order',
  checkoutLimiter,
  authenticate,
  requireBuyer,
  validateCheckoutQuote,
  placeOrder,
)

export default router