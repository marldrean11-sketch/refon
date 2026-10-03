import {
  authenticateUser,
  getUserById,
  registerUser,
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

export const me = asyncHandler(async (req, res) => {
  try {
    const user = await getUserById(req.user.id)
    return sendUser(res, user)
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      clearAuthCookie(res)
    }

    throw error
  }
})

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res)
  res.set('Cache-Control', 'no-store')
  return res.status(204).send()
})
