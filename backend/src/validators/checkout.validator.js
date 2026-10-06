import { z } from 'zod'
import { validate, validateQuery } from './auth.validator.js'
import { DELIVERY_ZONES, PAYMENT_METHOD_IDS } from '../config/checkout.config.js'

/**
 * Checkout request validation.
 *
 * Only *choices* and *contact details* are accepted. There is deliberately no
 * `subtotal`, `deliveryFee`, `total`, `quantity`, or `listingIds` field: a schema
 * that cannot express a client-supplied price cannot be tricked into using one.
 *
 * `.strict()` therefore rejects an attempt to pass one, rather than ignoring it.
 */

const zoneIds = DELIVERY_ZONES.map((zone) => zone.id)

/**
 * A contact field.
 *
 * This layer checks the *shape* of the request and nothing else about the values:
 * each must be a string, and no unrecognised key may be present. Whether a name is
 * long enough, a number is a real Philippine mobile, or an address is usable is the
 * service's judgement, and the service is what produces the message a shopper acts
 * on.
 *
 * Splitting the rules across both layers is how two different messages end up
 * describing the same requirement — and because the API returns one message per
 * field, the shopper would be shown whichever happened to be checked last.
 */
const contactField = z.string().trim()

const checkoutQuoteSchema = z
  .object({
    deliveryMethodId: z
      .string()
      .trim()
      .min(1, 'Choose a delivery method.')
      .max(40, 'Choose a delivery method from the list.'),

    paymentMethodId: z
      .string()
      .trim()
      .refine((value) => PAYMENT_METHOD_IDS.includes(value), {
        message: 'Choose a payment method from the list.',
      }),

    details: z
      .object({
        fullName: contactField,
        email: contactField,
        // Digits and the separators a person actually types are accepted here; the
        // service checks the Philippine mobile pattern once the separators are gone.
        mobile: contactField,
        region: contactField,
        province: contactField,
        city: contactField,
        barangay: contactField,
        street: contactField,
        postalCode: contactField,
        // Optional, so a shopper who has no note to add is not made to type "none".
        deliveryNotes: z.string().trim().optional(),
      })
      .strict(),
  })
  .strict()

const checkoutOptionsQuerySchema = z
  .object({
    // Optional so the checkout page can render its options before the buyer has
    // chosen a region; the service falls back to the default zone.
    zoneId: z
      .enum(zoneIds, {
        error: `Delivery zone must be one of: ${zoneIds.join(', ')}.`,
      })
      .optional(),
  })
  .strict()

export const validateCheckoutQuote = validate(checkoutQuoteSchema)
export const validateCheckoutOptionsQuery = validateQuery(checkoutOptionsQuerySchema)
