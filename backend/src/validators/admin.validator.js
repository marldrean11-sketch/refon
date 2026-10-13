import { z } from 'zod'
import { validate, validateQuery } from './auth.validator.js'

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
