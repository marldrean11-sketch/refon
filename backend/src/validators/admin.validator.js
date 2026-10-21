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

/** Approving may record the moderator's IMEI and lock check. The body is optional. */
const approveListingSchema = z.preprocess(
  (value) => value ?? {},
  z.object({ imeiChecked: z.boolean().optional() }).strict(),
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

export const validateApproveListing = validate(approveListingSchema)
export const validateRejectListing = validate(rejectListingSchema)
export const validateRejectSeller = validate(rejectSellerSchema)
