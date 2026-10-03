import { Router } from 'express'
import {
  create,
  getAll,
  getInquiries,
  getMine,
  getOne,
  markSold,
  remove,
  submitInquiry,
  update,
} from '../controllers/listing.controller.js'
import {
  authenticate,
  optionalAuthenticate,
  requireSeller,
} from '../middlewares/auth.middleware.js'
import {
  validateCreateListing,
  validateListingId,
  validateListingQuery,
  validateUpdateListing,
} from '../validators/listing.validator.js'
import { validateInquiry } from '../validators/inquiry.validator.js'

const router = Router()

router.get('/', validateListingQuery, getAll)
router.get('/mine', authenticate, requireSeller, getMine)
router.post('/', authenticate, requireSeller, validateCreateListing, create)
router.get('/:id', validateListingId, getOne)
router.put(
  '/:id',
  authenticate,
  requireSeller,
  validateListingId,
  validateUpdateListing,
  update,
)
router.delete('/:id', authenticate, requireSeller, validateListingId, remove)
router.patch(
  '/:id/mark-sold',
  authenticate,
  requireSeller,
  validateListingId,
  markSold,
)
router.post(
  '/:id/inquiries',
  optionalAuthenticate,
  validateListingId,
  validateInquiry,
  submitInquiry,
)
router.get(
  '/:id/inquiries',
  authenticate,
  requireSeller,
  validateListingId,
  getInquiries,
)

export default router
