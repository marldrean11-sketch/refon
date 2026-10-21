import {
  authenticateUser,
  getUserById,
  loginDemoAccount,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
} from '../services/auth.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { clearAuthCookie, setAuthCookie } from '../utils/auth-cookie.js'
import { createAccessToken } from '../utils/jwt.js'
import { ApiError } from '../utils/api-error.js'

function sendUser(res, user, statusCode = 200) {
  res.set('Cache-Control', 'no-store')
  return res.status(statusCode).json({ user })
}

export const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.validatedBody)
  setAuthCookie(res, createAccessToken(user))
  return sendUser(res, user, 201)
})

export const login = asyncHandler(async (req, res) => {
  const user = await authenticateUser(req.validatedBody)
  setAuthCookie(res, createAccessToken(user))
  return sendUser(res, user)
})

export const demoLogin = asyncHandler(async (req, res) => {
  const user = await loginDemoAccount(req.validatedBody.role)
  setAuthCookie(res, createAccessToken(user))
  return sendUser(res, user)
})

export const me = asyncHandler(async (req, res) => {
  try {
    const user = await getUserById(req.user.id, req.user.issuedAt)
    return sendUser(res, user)
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      clearAuthCookie(res)
    }

    throw error
  }
})

const GENERIC_EMAIL_SENT_MESSAGE =
  'If an account matches that email, we have sent it a link.'

export const forgotPassword = asyncHandler(async (req, res) => {
  await requestPasswordReset(req.validatedBody.email)
  // Always the same status and body, whether or not the account exists.
  return res.status(200).json({ message: GENERIC_EMAIL_SENT_MESSAGE })
})

export const resetPasswordRequest = asyncHandler(async (req, res) => {
  await resetPassword(req.validatedBody)
  return res.status(200).json({
    message: 'Your password has been updated. Please sign in with it.',
  })
})

export const verifyEmailRequest = asyncHandler(async (req, res) => {
  const user = await verifyEmail(req.validatedBody.token)
  return sendUser(res, user)
})

export const resendVerification = asyncHandler(async (req, res) => {
  await resendVerificationEmail(req.user.id)
  return res.status(200).json({
    message: 'If your address still needs confirming, a new link is on its way.',
  })
})

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res)
  res.set('Cache-Control', 'no-store')
  return res.status(204).send()
})
