import { Router } from 'express'
import {
  applySeller,
  getMySellerProfile,
  getStorefrontListings,
  getStorefrontProfile,
  getStorefrontReviews,
  updateMyPaymentDetails,
} from '../controllers/seller.controller.js'
import { authenticate, requireRole } from '../middlewares/auth.middleware.js'
import {
  validateApplySeller,
  validatePaymentDetails,
  validatePublicSellerId,
  validateStorefrontQuery,
} from '../validators/seller.validator.js'

const router = Router()

/**
 * `/me` is declared before the storefront routes below because Express matches
 * in declaration order: with `/:id` in front of it, a request to `/me` would be
 * parsed as a seller id of "me" and answered with a 400 about a UUID.
 *
 * `authenticate` is attached per route rather than through `router.use(...)` for
 * the same reason. The storefront reads below it are unauthenticated by design -
 * a shopper lands on a storefront from a listing while signed out - so the auth
 * gate has to be declared after them rather than wrapping the whole router.
 */
router.get('/me', authenticate, getMySellerProfile)
router.patch(
  '/me/payment',
  authenticate,
  requireRole('SELLER'),
  validatePaymentDetails,
  updateMyPaymentDetails,
)

router.get('/:id', validatePublicSellerId, getStorefrontProfile)
router.get(
  '/:id/listings',
  validatePublicSellerId,
  validateStorefrontQuery,
  getStorefrontListings,
)
router.get(
  '/:id/reviews',
  validatePublicSellerId,
  validateStorefrontQuery,
  getStorefrontReviews,
)

router.use(authenticate)
router.post(
  '/apply',
  requireRole('BUYER', 'SELLER'),
  validateApplySeller,
  applySeller,
)

export default router