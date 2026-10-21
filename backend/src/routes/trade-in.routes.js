import { Router } from 'express'
import { submitTradeIn } from '../controllers/trade-in.controller.js'
import { optionalAuthenticate } from '../middlewares/auth.middleware.js'
import { inquiryLimiter } from '../middlewares/rate-limit.middleware.js'
import { validateTradeIn } from '../validators/trade-in.validator.js'

const router = Router()

// Open to visitors: the trade-in page needs no account. Rate limited like inquiries.
router.post('/', inquiryLimiter, optionalAuthenticate, validateTradeIn, submitTradeIn)

export default router
