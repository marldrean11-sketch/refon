import { z } from 'zod'
import { ApiError } from '../utils/api-error.js'

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters.')
      .max(120, 'Name must be 120 characters or fewer.'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(320, 'Email must be 320 characters or fewer.')
      .email('Enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(72, 'Password must be 72 characters or fewer.'),
    role: z.preprocess(
      (value) => (typeof value === 'string' ? value.toUpperCase() : value),
      z.enum(['BUYER', 'SELLER'], {
        error: 'Choose either Buyer or Seller.',
      }),
    ),
  })
  .strict()

const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(320, 'Email must be 320 characters or fewer.')
      .email('Enter a valid email address.'),
    password: z.string().min(1, 'Password is required.').max(72),
  })
  .strict()

function formatIssues(issues) {
  return Object.fromEntries(
    issues.map((issue) => [
      // Unrecognised keys from `.strict()` carry an empty path, which would
      // otherwise surface to the client as a field literally named "undefined".
      issue.path[0] ?? '_query',
      issue.message,
    ]),
  )
}

function createValidationMiddleware(schema, source, targetProperty) {
  return function validationMiddleware(req, _res, next) {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const details = formatIssues(result.error.issues)
      return next(
        new ApiError(
          422,
          'Please correct the highlighted fields.',
          'VALIDATION_ERROR',
          details,
        ),
      )
    }

    req[targetProperty] = result.data
    return next()
  }
}

export function validate(schema) {
  return createValidationMiddleware(schema, 'body', 'validatedBody')
}

export function validateQuery(schema) {
  return createValidationMiddleware(schema, 'query', 'validatedQuery')
}

export function validateParams(schema) {
  return createValidationMiddleware(schema, 'params', 'validatedParams')
}

export const validateRegister = validate(registerSchema)
export const validateLogin = validate(loginSchema)

const forgotPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(320, 'Email must be 320 characters or fewer.')
      .email('Enter a valid email address.'),
  })
  .strict()

const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, 'This reset link is missing its token.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(72, 'Password must be 72 characters or fewer.'),
  })
  .strict()

const verifyEmailSchema = z
  .object({
    token: z.string().trim().min(1, 'This verification link is missing its token.'),
  })
  .strict()

export const validateForgotPassword = validate(forgotPasswordSchema)
export const validateResetPassword = validate(resetPasswordSchema)
export const validateVerifyEmail = validate(verifyEmailSchema)
