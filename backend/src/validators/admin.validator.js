import { z } from 'zod'
import { validate, validateParams, validateQuery } from './auth.validator.js'

const rejectListingSchema = z.preprocess(
  (value) => value ?? {},
  z
    .object({
      feedback: z
        .string()
        .trim()
        .max(2000, 'Feedback must be 2000 characters or fewer.')
        .default(''),
    })
    .strict(),
)

const rejectSellerSchema = z.preprocess(
  (value) => value ?? {},
  z
    .object({
      feedback: z
        .string()
        .trim()
        .max(1000, 'Feedback must be 1000 characters or fewer.')
        .default(''),
    })
    .strict(),
)

export const validateRejectListing = validate(rejectListingSchema)
export const validateRejectSeller = validate(rejectSellerSchema)

const sellerDirectoryQuerySchema = z
  .object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    q: z.string().trim().max(120).optional(),
  })
  .strict()

export const validateSellerDirectoryQuery = validateQuery(sellerDirectoryQuerySchema)

const adminListingsQuerySchema = z
  .object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SOLD']).optional(),
    q: z.string().trim().max(120).optional(),
  })
  .strict()

export const validateAdminListingsQuery = validateQuery(adminListingsQuerySchema)

export const validateAdminUsersQuery = validateQuery(
  z
    .object({
      role: z.enum(['BUYER', 'SELLER', 'ADMIN']).optional(),
      status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
      q: z.string().trim().max(120).optional(),
    })
    .strict(),
)

export const validateUserId = validateParams(
  z.object({ id: z.string().uuid('Account id must be a valid UUID.') }),
)

export const validateSuspendBody = validate(
  z.preprocess(
    (value) => value ?? {},
    z.object({ reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer.').optional() }).strict(),
  ),
)

export const validateTakeDownBody = validate(
  z
    .object({
      feedback: z
        .string()
        .trim()
        .min(5, 'Tell the seller why, in at least 5 characters.')
        .max(2000, 'Reason must be 2000 characters or fewer.'),
    })
    .strict(),
)
