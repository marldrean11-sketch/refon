import { Router } from 'express'
import {
  getMine,
  markAllRead,
  markRead,
  reply,
} from '../controllers/inquiry.controller.js'
import { inquiryReplyLimiter } from '../middlewares/rate-limit.middleware.js'
import {
  authenticate,
  requireSeller,
} from '../middlewares/auth.middleware.js'
import {
  validateInquiryId,
  validateInquiryQuery,
  validateInquiryReply,
} from '../validators/inquiry.validator.js'

const router = Router()

router.use(authenticate, requireSeller)

router.get('/mine', validateInquiryQuery, getMine)
// Registered before '/:id/read' so the literal path always wins.
router.patch('/read-all', markAllRead)
router.patch('/:id/read', validateInquiryId, markRead)
router.post('/:id/replies', inquiryReplyLimiter, validateInquiryId, validateInquiryReply, reply)

export default router
