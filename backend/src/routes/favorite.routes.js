import { Router } from 'express'
import {
  getMine,
  remove,
  save,
} from '../controllers/favorite.controller.js'
import { authenticate, requireBuyer } from '../middlewares/auth.middleware.js'
import { favoritesLimiter } from '../middlewares/rate-limit.middleware.js'
import { validateFavoriteListingId } from '../validators/favorite.validator.js'

const router = Router()

/**
 * The wishlist is buyer-only throughout, reading as well as writing.
 *
 * A seller or admin reading their own saved list is not a purchasing action, but
 * the rule is that only a buyer has a wishlist at all, so `/mine` is gated the same
 * way the writes are. That keeps one answer to "who has a wishlist" rather than
 * two depending on which verb was used.
 */
router.get('/mine', authenticate, requireBuyer, getMine)
router.put(
  '/:listingId',
  favoritesLimiter,
  authenticate,
  requireBuyer,
  validateFavoriteListingId,
  save,
)
router.delete(
  '/:listingId',
  favoritesLimiter,
  authenticate,
  requireBuyer,
  validateFavoriteListingId,
  remove,
)

export default router
