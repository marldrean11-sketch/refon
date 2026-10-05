import { z } from 'zod'
import { validate, validateParams } from './auth.validator.js'

/**
 * Cart request validation.
 *
 * Only a listing id is ever accepted from the client. Ownership, price, quantity,
 * reservation length, and availability are all derived server-side, so there is
 * no field here a client could use to influence them.
 */
const addToCartSchema = z
  .object({
    listingId: z.string().uuid('Listing ID must be a valid UUID.'),
  })
  .strict()

const cartListingParamsSchema = z.object({
  listingId: z.string().uuid('Listing ID must be a valid UUID.'),
})

export const validateAddToCart = validate(addToCartSchema)
export const validateCartListingParams = validateParams(cartListingParamsSchema)