import { Router } from 'express'
import {
  addListingToCart,
  emptyCart,
  getCurrentCart,
  removeListingFromCart,
} from '../controllers/cart.controller.js'
import { authenticate, requireBuyer } from '../middlewares/auth.middleware.js'
import { cartLimiter } from '../middlewares/rate-limit.middleware.js'
import {
  validateAddToCart,
  validateCartListingParams,
} from '../validators/cart.validator.js'

const router = Router()

/**
 * Every cart route requires a signed-in BUYER.
 *
 * `authenticate` runs before `requireBuyer`, so a visitor is answered with 401 and
 * a signed-in seller or admin with 403, rather than both collapsing into one
 * indistinguishable reply.
 *
 * This is the server-side half of the purchasing rule. Buying is a buyer action, so
 * a seller cannot buy a listing - including one of their own - even by calling the
 * API directly with a valid session. Which cart a request touches is decided from
 * that session and nowhere else, so a client cannot nominate a different cart.
 */
router.get('/', authenticate, requireBuyer, getCurrentCart)
router.post('/items', cartLimiter, authenticate, requireBuyer, validateAddToCart, addListingToCart)
router.delete(
  '/items/:listingId',
  cartLimiter,
  authenticate,
  requireBuyer,
  validateCartListingParams,
  removeListingFromCart,
)
router.delete('/', cartLimiter, authenticate, requireBuyer, emptyCart)

export default router