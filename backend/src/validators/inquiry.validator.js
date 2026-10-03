import { z } from 'zod'
import { validate } from './auth.validator.js'

const inquirySchema = z
  .object({
    buyerName: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters.')
      .max(120, 'Name must be 120 characters or fewer.'),
    buyerContact: z
      .string()
      .trim()
      .min(5, 'Enter a valid phone number or email address.')
      .max(320, 'Contact information must be 320 characters or fewer.'),
    message: z
      .string()
      .trim()
      .min(10, 'Message must be at least 10 characters.')
      .max(2000, 'Message must be 2000 characters or fewer.'),
  })
  .strict()

export const validateInquiry = validate(inquirySchema)
