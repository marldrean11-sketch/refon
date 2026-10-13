import { Router } from 'express'
import {
  cancelMyOrder,
  myOrder,
  myOrders,
  reviewMyOrder,
  sellerOrders,
  updateSellerOrder,
} from '../controllers/order.controller.js'
import {
  authenticate,
  requireBuyer,
  requireSeller,
} from '../middlewares/auth.middleware.js'
import {
  validateCancelBody,
  validateOrderId,
  validateOrderNumber,
  validateOrderQuery,
  validateOrderStatusBody,
  validateReviewBody,
} from '../validators/order.validator.js'
import { reportLimiter } from '../middlewares/rate-limit.middleware.js'

const router = Router()

router.use(authenticate)

// The buyer's own orders, addressed by order number.
router.get('/mine', requireBuyer, myOrders)
router.get('/mine/:orderNumber', requireBuyer, validateOrderNumber, myOrder)
router.patch(
  '/mine/:orderNumber/cancel',
  requireBuyer,
  validateOrderNumber,
  validateCancelBody,
  cancelMyOrder,
)

// A review of a phone from a completed order.
router.post(
  '/mine/:orderNumber/reviews',
  reportLimiter,
  requireBuyer,
  validateOrderNumber,
  validateReviewBody,
  reviewMyOrder,
)

// The seller's incoming orders.
router.get('/seller', requireSeller, validateOrderQuery, sellerOrders)
router.patch(
  '/seller/:id/status',
  requireSeller,
  validateOrderId,
  validateOrderStatusBody,
  updateSellerOrder,
)

export default router
