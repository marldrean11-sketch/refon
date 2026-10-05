import {
  authenticateUser,
  getUserById,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
} from '../services/auth.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { clearAuthCookie, setAuthCookie } from '../utils/auth-cookie.js'
import { createAccessToken } from '../utils/jwt.js'
import { mergeGuestCartIntoAccount } from '../services/cart.service.js'
import { clearGuestCartCookie, readGuestCartToken } from '../utils/cart-token.js'
import { ApiError } from '../utils/api-error.js'

function sendUser(res, user, statusCode = 200) {
  res.set('Cache-Control', 'no-store')
  return res.status(statusCode).json({ user })
}

/**
 * Folds a guest cart into the account cart as part of establishing a session.
 *
 * Doing this here rather than leaving it to the client means the buyer never has
 * to ask for it, and it happens on both register and login so a guest cart survives
 * either path.
 *
 * A merge failure must never block sign-in. A buyer who cannot sign in because of a
 * cart problem is a far worse outcome than a buyer who has to retry the merge, and
 * the merge itself is idempotent. The failure is logged and the guest cart is left
 * untouched so nothing is lost.
 */
async function mergeGuestCartQuietly(req, res, userId) {
  const guestToken = readGuestCartToken(req)

  if (!guestToken) {
    return
  }

  try {
    const merged = await mergeGuestCartIntoAccount({ userId, guestToken })

    if (merged) {
      clearGuestCartCookie(res)
    }
  } catch (error) {
    console.error('Could not merge the guest cart into the account cart:', error.message)
  }
}

export const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.validatedBody)
  setAuthCookie(res, createAccessToken(user))
  await mergeGuestCartQuietly(req, res, user.id)
  return sendUser(res, user, 201)
})

export const login = asyncHandler(async (req, res) => {
  const user = await authenticateUser(req.validatedBody)
  setAuthCookie(res, createAccessToken(user))
  await mergeGuestCartQuietly(req, res, user.id)
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
