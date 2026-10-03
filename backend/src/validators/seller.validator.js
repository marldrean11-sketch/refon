import { z } from 'zod'
import { validate, validateParams } from './auth.validator.js'

const applySellerSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(2, 'Business name must be at least 2 characters.')
      .max(160, 'Business name must be 160 characters or fewer.'),
    contactInfo: z
      .string()
      .trim()
      .min(5, 'Contact information is required.')
      .max(320, 'Contact information must be 320 characters or fewer.'),
  })
  .strict()

const sellerIdSchema = z.object({
  id: z.string().uuid('Seller ID must be a valid UUID.'),
})

export const validateApplySeller = validate(applySellerSchema)
export const validateSellerId = validateParams(sellerIdSchema)
