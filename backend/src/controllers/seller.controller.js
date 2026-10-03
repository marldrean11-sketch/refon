import {
  applyAsSeller,
  getSellerProfile,
} from '../services/seller.service.js'
import { getUserById } from '../services/auth.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { setAuthCookie } from '../utils/auth-cookie.js'
import { createAccessToken } from '../utils/jwt.js'

export const applySeller = asyncHandler(async (req, res) => {
  const seller = await applyAsSeller(req.user.id, req.validatedBody)
  const user = await getUserById(req.user.id)

  setAuthCookie(res, createAccessToken(user))
  return res.status(200).json({ seller, user })
})

export const getMySellerProfile = asyncHandler(async (req, res) => {
  const seller = await getSellerProfile(req.user.id)
  return res.status(200).json({ seller })
})
