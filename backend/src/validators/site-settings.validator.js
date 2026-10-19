import { z } from 'zod'
import { validate } from './auth.validator.js'

/** Viber chat and group invite links. Anything else would send visitors elsewhere. */
const VIBER_LINK = /^(viber:\/\/\S+|https:\/\/(invite\.viber\.com|vb\.me|chats\.viber\.com)\/\S+)$/i

const settingsSchema = z
  .object({
    booth: z
      .string()
      .trim()
      .min(1, 'Enter the booth number.')
      .max(10, 'Booth numbers are 10 characters or fewer.')
      .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and dashes only, for example 7 or B-12.'),
    viber: z
      .string()
      .trim()
      .max(200, 'The link is too long.')
      .transform((value) => value || null)
      .refine((value) => value === null || VIBER_LINK.test(value), {
        message: 'Paste a Viber link, for example https://invite.viber.com/?g2=… or viber://chat?number=…',
      })
      .nullable(),
    // Plain text for the banner above the header; React renders it as text.
    announcement: z
      .string()
      .trim()
      .max(140, 'Keep the announcement to 140 characters so it fits on a phone.')
      .transform((value) => value || null)
      .nullable(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to change.' })

export const validateSiteSettings = validate(settingsSchema)
