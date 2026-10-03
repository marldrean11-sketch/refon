import { env } from '../config/env.js'
import { ApiError } from '../utils/api-error.js'
import { clearAuthCookie } from '../utils/auth-cookie.js'
import { verifyAccessToken } from '../utils/jwt.js'

export function authenticate(req, res, next) {
  const token = req.cookies?.[env.authCookieName]

  if (!token) {
    return next(
      new ApiError(401, 'Authentication is required.', 'AUTHENTICATION_REQUIRED'),
    )
  }

  try {
    const payload = verifyAccessToken(token)

    if (typeof payload !== 'object' || !payload.sub || !payload.role) {
      throw new Error('Token payload is incomplete.')
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
    }

    return next()
  } catch {
    clearAuthCookie(res)
    return next(
      new ApiError(401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED'),
    )
  }
}

export function optionalAuthenticate(req, res, next) {
  const token = req.cookies?.[env.authCookieName]

  if (!token) {
    return next()
  }

  try {
    const payload = verifyAccessToken(token)

    if (typeof payload === 'object' && payload.sub && payload.role) {
      req.user = {
        id: payload.sub,
        role: payload.role,
      }
    }
  } catch {
    clearAuthCookie(res)
  }

  return next()
}

export function requireRole(...allowedRoles) {
  return function roleGuard(req, _res, next) {
    if (!req.user) {
      return next(
        new ApiError(401, 'Authentication is required.', 'AUTHENTICATION_REQUIRED'),
      )
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'You do not have permission to access this resource.', 'FORBIDDEN'),
      )
    }

    return next()
  }
}

export const requireAdmin = requireRole('ADMIN')
export const requireSeller = requireRole('SELLER')
export const requireBuyer = requireRole('BUYER')
