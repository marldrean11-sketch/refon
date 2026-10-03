import { Router } from 'express'
import {
  getMine,
  remove,
  save,
} from '../controllers/favorite.controller.js'
import {
  authenticate,
  requireBuyer,
  requireBuyerOrSeller,
} from '../middlewares/auth.middleware.js'
import { favoritesLimiter } from '../middlewares/rate-limit.middleware.js'
import { validateFavoriteListingId } from '../validators/favorite.validator.js'

const router = Router()

router.get('/mine', authenticate, requireBuyerOrSeller, getMine)
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
