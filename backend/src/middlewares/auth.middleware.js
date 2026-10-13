import { env } from '../config/env.js'
import { ApiError } from '../utils/api-error.js'
import { clearAuthCookie } from '../utils/auth-cookie.js'
import { verifyAccessToken } from '../utils/jwt.js'
import { isSuspended } from '../utils/suspension.js'

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
      issuedAt: typeof payload.iat === 'number' ? payload.iat : null,
    }
  } catch {
    clearAuthCookie(res)
    return next(
      new ApiError(401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED'),
    )
  }

  // The only database access here: a cached suspension check, so an account an
  // admin suspends is locked out of every action straight away.
  return isSuspended(req.user.id)
    .then((suspended) => {
      if (suspended) {
        clearAuthCookie(res)
        return next(
          new ApiError(
            403,
            'This account is suspended. Contact ReFon if you think this is a mistake.',
            'ACCOUNT_SUSPENDED',
          ),
        )
      }
      return next()
    })
    .catch(next)
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
        issuedAt: typeof payload.iat === 'number' ? payload.iat : null,
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
/**
 * Sent inquiries stay readable after a buyer becomes a seller.
 *
 * This is deliberately narrower than `requireBuyer`. An inquiry is a message to a
 * seller, not a purchasing action, so a seller who also buys keeps access to the
 * inquiries they sent. Cart, wishlist and checkout use `requireBuyer` instead, which
 * is what stops a seller from buying any listing, including one of their own.
 */
export const requireBuyerOrSeller = requireRole('BUYER', 'SELLER')
