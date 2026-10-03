import { Router } from 'express'
import {
  getMine,
  markAllRead,
  markRead,
} from '../controllers/inquiry.controller.js'
import {
  authenticate,
  requireSeller,
} from '../middlewares/auth.middleware.js'
import {
  validateInquiryId,
  validateInquiryQuery,
} from '../validators/inquiry.validator.js'

const router = Router()

router.use(authenticate, requireSeller)

router.get('/mine', validateInquiryQuery, getMine)
// Registered before '/:id/read' so the literal path always wins.
router.patch('/read-all', markAllRead)
router.patch('/:id/read', validateInquiryId, markRead)

export default router
