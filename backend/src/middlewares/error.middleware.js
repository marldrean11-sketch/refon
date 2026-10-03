import { env } from '../config/env.js'
import { ApiError } from '../utils/api-error.js'

export function notFoundHandler(req, _res, next) {
  next(
    new ApiError(
      404,
      `No API route matches ${req.method} ${req.originalUrl}.`,
      'ROUTE_NOT_FOUND',
    ),
  )
}

export function errorHandler(error, _req, res, _next) {
  const isApiError = error instanceof ApiError
  const statusCode = isApiError
    ? error.statusCode
    : Number.isInteger(error?.status)
      ? error.status
      : 500
  const message = isApiError
    ? error.message
    : statusCode < 500
      ? 'The request could not be processed.'
      : 'Something went wrong on our side. Please try again.'

  if (!isApiError && env.nodeEnv !== 'test') {
    console.error(error)
  }

  const body = {
    message,
    code: isApiError ? error.code : statusCode < 500 ? 'BAD_REQUEST' : 'INTERNAL_ERROR',
  }

  if (isApiError && error.details) {
    body.errors = error.details
  }

  res.status(statusCode).json(body)
}
