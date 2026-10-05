import {
  changePassword as changePasswordRequest,
  updateProfile as updateProfileRequest,
} from '../services/account.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { setAuthCookie } from '../utils/auth-cookie.js'
import { createAccessToken } from '../utils/jwt.js'

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await updateProfileRequest(req.user.id, req.validatedBody)
  return res.status(200).json({ user })
})

export const changePassword = asyncHandler(async (req, res) => {
  const user = await changePasswordRequest(req.user.id, req.validatedBody)
  // Re-issue so the session that made the change stays signed in.
  setAuthCookie(res, createAccessToken(user))
  res.set('Cache-Control', 'no-store')
  return res.status(200).json({ user })
})
