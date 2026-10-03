import {
  getSellerInquiries,
  markAllSellerInquiriesRead,
  markInquiryRead,
} from '../services/inquiry.service.js'
import { asyncHandler } from '../utils/async-handler.js'

export const getMine = asyncHandler(async (req, res) => {
  const data = await getSellerInquiries(req.user.id, {
    status: req.validatedQuery?.status,
    listingId: req.validatedQuery?.listingId,
  })
  return res.status(200).json(data)
})

export const markRead = asyncHandler(async (req, res) => {
  const inquiry = await markInquiryRead(req.validatedParams.id, req.user.id)
  return res.status(200).json({ inquiry })
})

export const markAllRead = asyncHandler(async (req, res) => {
  const data = await markAllSellerInquiriesRead(req.user.id)
  return res.status(200).json(data)
})
