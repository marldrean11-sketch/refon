import { Router } from 'express'
import { getMine, reply } from '../controllers/my-inquiry.controller.js'
import { inquiryReplyLimiter } from '../middlewares/rate-limit.middleware.js'
import { validateInquiryId, validateInquiryReply } from '../validators/inquiry.validator.js'
import {
  authenticate,
  requireBuyerOrSeller,
} from '../middlewares/auth.middleware.js'

const router = Router()

router.get('/', authenticate, requireBuyerOrSeller, getMine)
router.post(
  '/:id/replies',
  inquiryReplyLimiter,
  authenticate,
  requireBuyerOrSeller,
  validateInquiryId,
  validateInquiryReply,
  reply,
)

export default router
