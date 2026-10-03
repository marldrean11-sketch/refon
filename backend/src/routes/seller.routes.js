import { Router } from 'express'
import {
  applySeller,
  getMySellerProfile,
} from '../controllers/seller.controller.js'
import { authenticate, requireRole } from '../middlewares/auth.middleware.js'
import {
  validateApplySeller,
} from '../validators/seller.validator.js'

const router = Router()

router.use(authenticate)
router.post(
  '/apply',
  requireRole('BUYER', 'SELLER'),
  validateApplySeller,
  applySeller,
)
router.get('/me', getMySellerProfile)

export default router
