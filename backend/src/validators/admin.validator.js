import { z } from 'zod'
import { validate } from './auth.validator.js'

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

export const validateRejectListing = validate(rejectListingSchema)
