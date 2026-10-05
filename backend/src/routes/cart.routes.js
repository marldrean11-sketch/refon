import { Router } from 'express'
import {
  addListingToCart,
  emptyCart,
  getCurrentCart,
  mergeCart,
  removeListingFromCart,
} from '../controllers/cart.controller.js'
import { optionalAuthenticate, requireBuyerOrSeller } from '../middlewares/auth.middleware.js'
import { cartLimiter } from '../middlewares/rate-limit.middleware.js'
import {
  validateAddToCart,
  validateCartListingParams,
} from '../validators/cart.validator.js'

const router = Router()

// `optionalAuthenticate` rather than `authenticate`: a visitor must be able to
// build a cart before deciding to sign in. Which cart a request touches is decided
// from the session when there is one, so authentication changes the owner rather
// than granting access to anything extra.
router.get('/', optionalAuthenticate, getCurrentCart)
router.post('/items', cartLimiter, optionalAuthenticate, validateAddToCart, addListingToCart)
router.delete(
  '/items/:listingId',
  cartLimiter,
  optionalAuthenticate,
  validateCartListingParams,
  removeListingFromCart,
)
router.delete('/', cartLimiter, optionalAuthenticate, emptyCart)
router.post(
  '/merge',
  cartLimiter,
  optionalAuthenticate,
  requireBuyerOrSeller,
  mergeCart,
)

export default router