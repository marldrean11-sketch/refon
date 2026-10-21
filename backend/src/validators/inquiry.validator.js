import { z } from 'zod'
import { validate, validateParams, validateQuery } from './auth.validator.js'

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

const inquiryIdSchema = z.object({
  id: z.string().uuid('Inquiry ID must be a valid UUID.'),
})

const inquiryQuerySchema = z
  .object({
    status: z.enum(['unread', 'all'], {
      error: 'Status must be unread or all.',
    }).default('all'),
    listingId: z
      .string()
      .uuid('Listing ID must be a valid UUID.')
      .optional(),
  })
  .strict()

export const validateInquiryId = validateParams(inquiryIdSchema)
export const validateInquiryQuery = validateQuery(inquiryQuerySchema)

const inquiryReplySchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, 'Write a reply first.')
      .max(2000, 'Reply must be 2000 characters or fewer.'),
  })
  .strict()

export const validateInquiryReply = validate(inquiryReplySchema)
