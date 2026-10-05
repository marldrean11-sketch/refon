import { z } from 'zod'
import { validateParams, validateQuery } from './auth.validator.js'
import { CATEGORY_SLUGS } from '../utils/catalog-taxonomy.js'

/**
 * Catalog query parameters.
 *
 * These routes are public and unauthenticated, so they are not covered by the
 * auth endpoint rate limiter. They are cheap, indexed reads, but an unbounded
 * number of them is still a denial-of-service lever, so the limiter here is
 * deliberately generous while still existing.
 */
const suggestQuerySchema = z
  .object({
    q: z.string().trim().max(120).optional().default(''),
  })
  .strict()

export const validateSuggestQuery = validateQuery(suggestQuerySchema)

export const validateRelatedParams = validateParams(
  z.object({
    id: z.string().uuid('Listing ID must be a valid UUID.'),
  }),
)

export { CATEGORY_SLUGS }
