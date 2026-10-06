import { Router } from 'express'
import { getOptions, getQuote } from '../controllers/checkout.controller.js'
import { optionalAuthenticate } from '../middlewares/auth.middleware.js'
import { checkoutLimiter } from '../middlewares/rate-limit.middleware.js'
import {
  validateCheckoutOptionsQuery,
  validateCheckoutQuote,
} from '../validators/checkout.validator.js'

const router = Router()

// `optionalAuthenticate`, matching the cart: a guest must be able to see delivery
// fees and pricing for their own cart before deciding to sign in.
router.get('/options', optionalAuthenticate, validateCheckoutOptionsQuery, getOptions)

// Prices a checkout and refuses one that cannot proceed. Creates nothing.
router.post(
  '/quote',
  checkoutLimiter,
  optionalAuthenticate,
  validateCheckoutQuote,
  getQuote,
)

export default router
