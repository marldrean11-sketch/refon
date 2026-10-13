import { Router } from 'express'
import {
  approveListing,
  approveSeller,
  pendingListings,
  pendingSellers,
  rejectListing,
  rejectSeller,
  sellerDetail,
  sellerDirectory,
  stats,
} from '../controllers/admin.controller.js'
import {
  authenticate,
  requireAdmin,
} from '../middlewares/auth.middleware.js'
import { validateListingId } from '../validators/listing.validator.js'
import {
  validateRejectListing,
  validateRejectSeller,
  validateSellerDirectoryQuery,
} from '../validators/admin.validator.js'
import { validateSellerId } from '../validators/seller.validator.js'
import { summary as feedbackSummary } from '../controllers/feedback.controller.js'
import {
  reports,
  resolve,
} from '../controllers/report.controller.js'
import {
  validateReportId,
  validateReportsQuery,
  validateResolveReport,
} from '../validators/report.validator.js'

const router = Router()

router.use(authenticate, requireAdmin)
router.get('/stats', stats)
router.get('/feedback', feedbackSummary)
router.get('/sellers/pending', pendingSellers)
router.get('/sellers', validateSellerDirectoryQuery, sellerDirectory)
router.get('/sellers/:id', validateSellerId, sellerDetail)
router.patch('/sellers/:id/approve', validateSellerId, approveSeller)
router.patch('/sellers/:id/reject', validateSellerId, validateRejectSeller, rejectSeller)
router.get('/reports', validateReportsQuery, reports)
router.patch(
  '/reports/:id/resolve',
  validateReportId,
  validateResolveReport,
  resolve,
)
router.get('/listings/pending', pendingListings)
router.patch('/listings/:id/approve', validateListingId, approveListing)
router.patch(
  '/listings/:id/reject',
  validateListingId,
  validateRejectListing,
  rejectListing,
)

export default router
