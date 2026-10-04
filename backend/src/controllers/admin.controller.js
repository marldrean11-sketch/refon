import { getAdminStats } from '../services/admin.service.js'
import {
  getPendingSellers,
  reviewSeller,
} from '../services/seller.service.js'
import {
  getPendingListings,
  reviewListing,
} from '../services/listing.service.js'
import { asyncHandler } from '../utils/async-handler.js'

export const stats = asyncHandler(async (_req, res) => {
  const data = await getAdminStats()
  return res.status(200).json({ stats: data })
})

export const pendingSellers = asyncHandler(async (_req, res) => {
  const sellers = await getPendingSellers()
  return res.status(200).json({ sellers })
})

export const approveSeller = asyncHandler(async (req, res) => {
  const seller = await reviewSeller(req.validatedParams.id, 'APPROVED')
  return res.status(200).json({ seller })
})

export const rejectSeller = asyncHandler(async (req, res) => {
  const seller = await reviewSeller(
    req.validatedParams.id,
    'REJECTED',
    req.validatedBody.feedback,
  )
  return res.status(200).json({ seller })
})

export const pendingListings = asyncHandler(async (_req, res) => {
  const listings = await getPendingListings()
  return res.status(200).json({ listings })
})

export const approveListing = asyncHandler(async (req, res) => {
  const listing = await reviewListing(req.validatedParams.id, 'APPROVED')
  return res.status(200).json({ listing })
})

export const rejectListing = asyncHandler(async (req, res) => {
  const listing = await reviewListing(
    req.validatedParams.id,
    'REJECTED',
    req.validatedBody.feedback,
  )
  return res.status(200).json({ listing })
})
