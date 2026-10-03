import { z } from 'zod'
import { validateParams } from './auth.validator.js'

const listingIdSchema = z.object({
  listingId: z.string().uuid('Listing ID must be a valid UUID.'),
})

export const validateFavoriteListingId = validateParams(listingIdSchema)
