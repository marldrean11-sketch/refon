import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'
import { ApiError } from '../utils/api-error.js'

const fifteenMinutes = 15 * 60 * 1000
const tenMinutes = 10 * 60 * 1000
const thirtyMinutes = 30 * 60 * 1000

function rateLimitHandler(_req, _res, next) {
  next(
    new ApiError(
      429,
      'Too many attempts. Please try again later.',
      'RATE_LIMITED',
    ),
  )
}

function createLimiter({ windowMs, limit }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    // Keep the end-to-end suites deterministic by never throttling in tests.
    skip: () => env.nodeEnv === 'test',
  })
}

export const authLimiter = createLimiter({ windowMs: fifteenMinutes, limit: 10 })

export const inquiryLimiter = createLimiter({ windowMs: tenMinutes, limit: 5 })

export const favoritesLimiter = createLimiter({ windowMs: tenMinutes, limit: 60 })

// Cart writes reserve physical inventory, so they are deliberately more generous
// than they look: a buyer assembling several phones should not be throttled, but a
// script hammering add/remove to probe which phones are held should be.
export const cartLimiter = createLimiter({ windowMs: tenMinutes, limit: 120 })

// Checkout repricing is a read of the buyer's cart with a little arithmetic on
// top, so it stays generous; a buyer changing address or delivery method naturally
// triggers several in a row.
export const checkoutLimiter = createLimiter({ windowMs: tenMinutes, limit: 90 })

export const reportLimiter = createLimiter({ windowMs: thirtyMinutes, limit: 5 })

export const passwordResetLimiter = createLimiter({ windowMs: thirtyMinutes, limit: 5 })

export const verificationLimiter = createLimiter({ windowMs: thirtyMinutes, limit: 5 })
