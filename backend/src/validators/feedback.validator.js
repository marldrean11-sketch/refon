import { z } from 'zod'
import { validate } from './auth.validator.js'

const feedbackSchema = z
  .object({
    rating: z.number().int().min(1, 'Pick 1 to 5 stars.').max(5, 'Pick 1 to 5 stars.'),
    wouldBuy: z.enum(['YES', 'MAYBE', 'NO'], { message: 'Choose yes, maybe or no.' }),
    comment: z
      .string()
      .trim()
      .max(500, 'Keep it under 500 characters.')
      .optional()
      .transform((value) => (value ? value : null)),
  })
  .strict()

export const validateFeedback = validate(feedbackSchema)
