import { Router } from 'express'
import {
  create,
  getAll,
  getFacets,
  getInquiries,
  getMine,
  getOne,
  getOneBySlug,
  getRelated,
  getSuggestions,
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
  inquiryLimiter,
  reportLimiter,
} from '../middlewares/rate-limit.middleware.js'
import { submitReport } from '../controllers/report.controller.js'
import { validateReportBody } from '../validators/report.validator.js'
import {
  validateCreateListing,
  validateListingId,
  validateListingQuery,
  validateListingSlug,
  validateUpdateListing,
} from '../validators/listing.validator.js'
import {
  validateRelatedParams,
  validateSuggestQuery,
} from '../validators/catalog.validator.js'
import { validateInquiry } from '../validators/inquiry.validator.js'

const router = Router()

// Static catalog routes come before `/:id`, otherwise Express would treat
// "facets" and "suggest" as a listing id and fail UUID validation.
router.get('/facets', getFacets)
router.get('/suggest', validateSuggestQuery, getSuggestions)

router.get('/', validateListingQuery, getAll)
router.get('/mine', authenticate, requireSeller, getMine)
router.post('/', authenticate, requireSeller, validateCreateListing, create)
router.get('/:id/related', validateRelatedParams, getRelated)
// Slug lookup is a second, static-prefixed path rather than a sibling of
// `/:id`, so it must be declared before it or Express would try to parse the
// literal "slug" as a listing UUID.
router.get('/slug/:slug', validateListingSlug, getOneBySlug)
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
  inquiryLimiter,
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
router.post(
  '/:id/reports',
  reportLimiter,
  authenticate,
  validateListingId,
  validateReportBody,
  submitReport,
)

export default router
