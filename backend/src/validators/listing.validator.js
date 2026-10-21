import { z } from 'zod'
import {
  validate,
  validateParams,
  validateQuery,
} from './auth.validator.js'
import {
  CATEGORY_SLUGS,
  CONDITION_GRADES,
  LISTING_SORTS,
  RAM_OPTIONS,
  STORAGE_OPTIONS,
  WARRANTY_OPTIONS,
} from '../utils/catalog-taxonomy.js'

const photoSchema = z
  .string()
  .trim()
  .min(1, 'A listing photo URL is required.')
  .max(2048, 'Photo URLs must be 2048 characters or fewer.')
  .refine(
    (value) =>
      value.startsWith('/uploads/') &&
      !value.includes('..') &&
      !value.includes('\\'),
    'Photos must be uploaded image URLs.',
  )

/**
 * Grading scale. Optional so the existing seller form keeps working unchanged:
 * a listing created without it falls back to a grade derived from the legacy
 * condition label. Optional means "not stated", not "any".
 */
const gradeSchema = z.enum(['A', 'B', 'C'], {
  error: 'Condition grade must be A, B, or C.',
})

const inspectionCheckSchema = z.enum(
  CONDITION_GRADES.inspectionCheckIds,
  { error: 'Unknown inspection check.' },
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
    conditionGrade: gradeSchema.optional(),
    originalPrice: z
      .number()
      .positive('Original price must be greater than zero.')
      .max(1_000_000_000, 'Original price is outside the accepted range.')
      .optional()
      .nullable(),
    warrantyMonths: z
      .number()
      .int('Warranty must be a whole number of months.')
      .min(0, 'Warranty cannot be negative.')
      .max(24, 'Warranty cannot exceed 24 months.')
      .optional(),
    ram: z
      .string()
      .trim()
      .max(40, 'RAM must be 40 characters or fewer.')
      .optional()
      .or(z.literal('')),
    operatingSystem: z
      .string()
      .trim()
      .max(80, 'Operating system must be 80 characters or fewer.')
      .optional()
      .or(z.literal('')),
    networkType: z
      .string()
      .trim()
      .max(80, 'Network type must be 80 characters or fewer.')
      .optional()
      .or(z.literal('')),
    processor: z
      .string()
      .trim()
      .max(120, 'Processor must be 120 characters or fewer.')
      .optional()
      .or(z.literal('')),
    displaySpec: z
      .string()
      .trim()
      .max(200, 'Display specification must be 200 characters or fewer.')
      .optional()
      .or(z.literal('')),
    cameraSpec: z
      .string()
      .trim()
      .max(240, 'Camera specification must be 240 characters or fewer.')
      .optional()
      .or(z.literal('')),
    categoryTags: z
      .array(z.string().trim().min(1).max(60))
      .max(12, 'A listing can carry at most 12 category tags.')
      .optional(),
    inspectionChecks: z
      .array(inspectionCheckSchema)
      .max(CONDITION_GRADES.inspectionCheckIds.length)
      .optional(),
    imeiVerified: z.boolean().optional(),
    imeiLast4: z
      .string()
      .trim()
      .regex(/^[0-9]{4}$/, 'IMEI must be exactly four digits.')
      .optional()
      .or(z.literal(''))
      .or(z.literal('null')),
    quantity: z.number().int().min(0).max(999).optional(),
    isFeatured: z.boolean().optional(),
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
  // A discount is only meaningful when the reference price is genuinely higher.
  .refine(
    (values) =>
      values.originalPrice == null || values.originalPrice > values.price,
    {
      message:
        'Original price must be higher than the selling price, or left blank.',
      path: ['originalPrice'],
    },
  )

const optionalNumber = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : Number(value)),
  z.number().finite().nonnegative().optional(),
)

const optionalYear = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : Number(value)),
  z.number().int().min(2015).max(2024).optional(),
)

const optionalInt = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : Number(value)),
  z.number().int().optional(),
)

const optionalBoolean = z.preprocess((value) => {
  if (value === '' || value === undefined) {
    return undefined
  }
  if (value === 'true' || value === true) return true
  if (value === 'false' || value === false) return false
  return value
}, z.boolean().optional())

/** Splits a comma-separated query value into a trimmed, non-empty list. */
const csvParse = (value) => {
  if (value === '' || value === undefined || value === null) {
    return undefined
  }
  if (Array.isArray(value)) {
    return value
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/** Comma-separated list validated against the known category slugs. */
const categoryListSchema = z.preprocess(
  csvParse,
  z.array(z.enum(CATEGORY_SLUGS, { error: 'Unknown category filter.' })).optional(),
)

/**
 * Catalog query.
 *
 * `.strict()` is what makes an unsupported filter an explicit 422 rather than a
 * silently ignored parameter — a shopper who applies a filter that does nothing
 * has no way to know the results they are looking at are unfiltered.
 */
const listingQuerySchema = z
  .object({
    brand: z.string().trim().max(80).optional(),
    year: optionalYear,
    minYear: optionalYear,
    maxYear: optionalYear,
    minPrice: optionalNumber,
    maxPrice: optionalNumber,
    conditionGrade: gradeSchema.optional(),
    minBattery: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : Number(value)),
      z.number().int().min(0).max(100).optional(),
    ),
    maxBattery: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : Number(value)),
      z.number().int().min(0).max(100).optional(),
    ),
    // Exact-match lists. Values are checked against the configured options so a
    // typo returns 422 instead of an empty page.
    storage: z.preprocess(csvParse, z.array(z.enum(STORAGE_OPTIONS)).optional()),
    ram: z.preprocess(csvParse, z.array(z.enum(RAM_OPTIONS)).optional()),
    minWarrantyMonths: optionalInt,
    warrantyMonths: z.preprocess(
      csvParse,
      z
        .array(
          z.coerce.number().int().refine(
            (value) => WARRANTY_OPTIONS.some((entry) => entry.months === value),
            { error: 'Unsupported warranty term.' },
          ),
        )
        .optional(),
    ),
    category: categoryListSchema,
    minSellerRating: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : Number(value)),
      z.number().min(0).max(5).optional(),
    ),
    featured: optionalBoolean,
    search: z.string().trim().max(120).optional(),
    q: z.string().trim().max(120).optional(),
    sort: z
      .enum(LISTING_SORTS.map((entry) => entry.value), { error: 'Unsupported sort option.' })
      .default('recommended'),
    page: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : Number(value)),
      z.number().int().min(1).max(10000).optional().default(1),
    ),
    pageSize: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : Number(value)),
      z.number().int().min(1).max(48).optional().default(12),
    ),
  })
  .strict()

const listingIdSchema = z.object({
  id: z.string().uuid('Listing ID must be a valid UUID.'),
})

const listingSlugSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Listing slug is malformed.'),
})

/** A live listing's new, lower price. The service checks it is actually lower. */
const lowerPriceSchema = z
  .object({
    price: z
      .number()
      .positive('Price must be greater than zero.')
      .max(1_000_000_000, 'Price is outside the accepted range.'),
  })
  .strict()

export const validateCreateListing = validate(listingSchema)
export const validateLowerPrice = validate(lowerPriceSchema)
export const validateUpdateListing = validate(listingSchema)
export const validateListingQuery = validateQuery(listingQuerySchema)
export const validateListingId = validateParams(listingIdSchema)
export const validateListingSlug = validateParams(listingSlugSchema)
