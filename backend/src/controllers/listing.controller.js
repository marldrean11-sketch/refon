import {
  createInquiry,
  createListing,
  deleteListing,
  getApprovedListing,
  getApprovedListings,
  getListingInquiries,
  getSellerListings,
  markListingSold,
  updateListing,
} from '../services/listing.service.js'
import { asyncHandler } from '../utils/async-handler.js'

export const create = asyncHandler(async (req, res) => {
  const listing = await createListing(req.user.id, req.validatedBody)
  return res.status(201).json({ listing })
})

export const getMine = asyncHandler(async (req, res) => {
  const listings = await getSellerListings(req.user.id)
  return res.status(200).json({ listings })
})

export const update = asyncHandler(async (req, res) => {
  const listing = await updateListing(
    req.validatedParams.id,
    req.user.id,
    req.validatedBody,
  )
  return res.status(200).json({ listing })
})

export const remove = asyncHandler(async (req, res) => {
  await deleteListing(req.validatedParams.id, req.user.id)
  return res.status(204).send()
})

export const getAll = asyncHandler(async (req, res) => {
  const data = await getApprovedListings(req.validatedQuery)
  return res.status(200).json({ ...data, filters: req.validatedQuery })
})

export const getOne = asyncHandler(async (req, res) => {
  const listing = await getApprovedListing(req.validatedParams.id)
  return res.status(200).json({ listing })
})

export const markSold = asyncHandler(async (req, res) => {
  const listing = await markListingSold(req.validatedParams.id, req.user.id)
  return res.status(200).json({ listing })
})

export const submitInquiry = asyncHandler(async (req, res) => {
  const inquiry = await createInquiry(
    req.validatedParams.id,
    req.validatedBody,
    req.user?.id ?? null,
  )
  return res.status(201).json({ inquiry })
})

export const getInquiries = asyncHandler(async (req, res) => {
  const inquiries = await getListingInquiries(
    req.validatedParams.id,
    req.user.id,
  )
  return res.status(200).json({ inquiries })
})
