import { getMyInquiries, replyToMyInquiry } from '../services/my-inquiry.service.js'
import { asyncHandler } from '../utils/async-handler.js'

export const getMine = asyncHandler(async (req, res) => {
  const data = await getMyInquiries(req.user.id)
  return res.status(200).json(data)
})

export const reply = asyncHandler(async (req, res) => {
  const inquiry = await replyToMyInquiry(req.validatedParams.id, req.user.id, req.validatedBody.body)
  return res.status(201).json({ inquiry })
})
