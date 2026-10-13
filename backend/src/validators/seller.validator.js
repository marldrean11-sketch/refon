import { z } from 'zod'
import { ApiError } from '../utils/api-error.js'
import {
  validate,
  validateParams,
  validateQuery,
} from './auth.validator.js'

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

/**
 * Public storefront query.
 *
 * Sorts are deliberately narrower than the catalog's. A storefront answers "what
 * has this seller got, and what is it worth", so only the three orderings that
 * question needs are accepted; the catalog's featured, best-selling, and
 * discount orderings all read columns that mean nothing for a single seller.
 *
 * `limit` rather than `pageSize` because this endpoint is the storefront's own
 * paging surface, not the catalog's, and the storefront grid is denser than the
 * shop grid. Capped at 48 to match the catalog ceiling.
 */
const STOREFRONT_SORTS = ['newest', 'price-asc', 'price-desc']

const storefrontQuerySchema = z
  .object({
    sort: z
      .enum(STOREFRONT_SORTS, { error: 'Unsupported sort option.' })
      .default('newest'),
    page: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : Number(value)),
      z.number().int().min(1).max(10000).optional().default(1),
    ),
    limit: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : Number(value)),
      z.number().int().min(1).max(48).optional().default(12),
    ),
  })
  .strict()

export const validateApplySeller = validate(applySellerSchema)
export const validateSellerId = validateParams(sellerIdSchema)
export const validateStorefrontQuery = validateQuery(storefrontQuerySchema)

/**
 * Seller id in a *public* URL.
 *
 * `validateParams` answers 422 with a field-error map, which is the right
 * contract for a form body. A storefront path segment is not a submitted field:
 * the only client that can produce a bad value is a hand-edited or mistyped URL,
 * where the correct answer is "that address is not valid", not "correct the
 * highlighted fields". So this reports 400 with a message a human can act on.
 */
export function validatePublicSellerId(req, _res, next) {
  const result = sellerIdSchema.safeParse(req.params)

  if (!result.success) {
    return next(
      new ApiError(400, 'Seller ID must be a valid UUID.', 'INVALID_SELLER_ID'),
    )
  }

  req.validatedParams = result.data
  return next()
}

const mobileOrEmpty = z
  .string()
  .trim()
  .regex(/^((\+?63|0)9\d{9})?$/, 'Enter a Philippine mobile number, e.g. 09171234567.')

const paymentDetailsSchema = z
  .object({
    gcash: mobileOrEmpty.optional(),
    maya: mobileOrEmpty.optional(),
    bank: z.string().trim().max(300, 'Bank details must be 300 characters or fewer.').optional(),
    qr: z
      .string()
      .trim()
      .regex(/^(\/uploads\/[A-Za-z0-9._-]+)?$/, 'Upload the QR code as a photo.')
      .optional(),
    note: z.string().trim().max(300, 'Note must be 300 characters or fewer.').optional(),
  })
  .strict()

export const validatePaymentDetails = validate(paymentDetailsSchema)

/** The storefront colour presets; the frontend maps each to its own swatch. */
export const BRAND_COLORS = ['lime', 'sky', 'violet', 'coral', 'amber', 'mint']

const uploadPathOrEmpty = z
  .string()
  .trim()
  .regex(/^(\/uploads\/[A-Za-z0-9._-]+)?$/, 'Upload the image as a photo.')

const storefrontSchema = z
  .object({
    tagline: z.string().trim().max(200, 'Tagline must be 200 characters or fewer.').optional(),
    city: z.string().trim().max(120, 'City must be 120 characters or fewer.').optional(),
    region: z.string().trim().max(120, 'Region must be 120 characters or fewer.').optional(),
    logoUrl: uploadPathOrEmpty.optional(),
    bannerUrl: uploadPathOrEmpty.optional(),
    brandColor: z.union([z.enum(BRAND_COLORS), z.literal('')]).optional(),
  })
  .strict()

export const validateStorefrontSettings = validate(storefrontSchema)
