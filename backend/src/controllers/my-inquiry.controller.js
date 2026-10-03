import { getMyInquiries } from '../services/my-inquiry.service.js'
import { asyncHandler } from '../utils/async-handler.js'

export const getMine = asyncHandler(async (req, res) => {
  const data = await getMyInquiries(req.user.id)
  return res.status(200).json(data)
})
