import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'
import { ApiError } from '../utils/api-error.js'

const fifteenMinutes = 15 * 60 * 1000
const tenMinutes = 10 * 60 * 1000

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
