import { z } from 'zod'
import {
  validate,
  validateParams,
  validateQuery,
} from './auth.validator.js'

const photoSchema = z
  .string()
  .trim()
  .min(1, 'A listing photo URL is required.')
  .max(2048, 'Photo URLs must be 2048 characters or fewer.')
  .refine(
    (value) => value.startsWith('/uploads/') || /^https?:\/\//i.test(value),
    'Photos must be uploaded image URLs.',
  )

const listingSchema = z
  .object({
    brand: z
      .string()
      .trim()
      .min(1, 'Brand is required.')
      .max(80, 'Brand must be 80 characters or fewer.'),
    model: z
      .string()
      .trim()
      .min(1, 'Model is required.')
      .max(120, 'Model must be 120 characters or fewer.'),
    year: z
      .number()
      .int('Year must be a whole number.')
      .min(2015, 'Year must be 2015 or later.')
      .max(2024, 'Year must be 2024 or earlier.'),
    price: z
      .number()
      .positive('Price must be greater than zero.')
      .max(1_000_000_000, 'Price is outside the accepted range.'),
    batteryPercent: z
      .number()
      .int('Battery health must be a whole number.')
      .min(0, 'Battery health cannot be below 0.')
      .max(100, 'Battery health cannot exceed 100.'),
    storage: z
      .string()
      .trim()
      .min(1, 'Storage is required.')
      .max(64, 'Storage must be 64 characters or fewer.'),
    condition: z
      .enum(['Good', 'Excellent', 'Like New'], {
        error: 'Choose Good, Excellent, or Like New.',
      })
      .default('Good'),
    color: z
      .string()
      .trim()
      .max(80, 'Color must be 80 characters or fewer.')
      .optional()
      .or(z.literal('')),
    conditionNotes: z
      .string()
      .trim()
      .min(10, 'Condition notes must be at least 10 characters.')
      .max(4000, 'Condition notes must be 4000 characters or fewer.'),
    photos: z
      .array(photoSchema)
      .min(1, 'Add at least one Main Photo before submitting.')
      .max(6, 'A listing can include up to 6 photos.'),
    mainPhoto: photoSchema.optional(),
  })
  .strict()

const optionalNumber = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : Number(value)),
  z.number().finite().nonnegative().optional(),
)

const optionalYear = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : Number(value)),
  z.number().int().min(2015).max(2024).optional(),
)

const listingQuerySchema = z
  .object({
    brand: z.string().trim().max(80).optional(),
    year: optionalYear,
    minYear: optionalYear,
    maxYear: optionalYear,
    minPrice: optionalNumber,
    maxPrice: optionalNumber,
    search: z.string().trim().max(120).optional(),
    q: z.string().trim().max(120).optional(),
    sort: z.enum(['newest', 'price-asc', 'price-desc']).default('newest'),
  })
  .strict()

const listingIdSchema = z.object({
  id: z.string().uuid('Listing ID must be a valid UUID.'),
})

export const validateCreateListing = validate(listingSchema)
export const validateUpdateListing = validate(listingSchema)
export const validateListingQuery = validateQuery(listingQuerySchema)
export const validateListingId = validateParams(listingIdSchema)
