import { z } from 'zod'
import { validate } from './auth.validator.js'

const addressText = (label, max) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`).optional()

const defaultAddressSchema = z
  .object({
    region: addressText('Region', 80),
    province: addressText('Province', 80),
    city: addressText('City', 80),
    barangay: addressText('Barangay', 80),
    street: addressText('Street', 200),
    postalCode: z
      .string()
      .trim()
      .regex(/^(\d{4})?$/, 'Postal code must be 4 digits.')
      .optional(),
    deliveryNotes: addressText('Delivery notes', 300),
  })
  .strict()

const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters.')
      .max(120, 'Name must be 120 characters or fewer.')
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(/^((\+?63|0)9\d{9})?$/, 'Enter a Philippine mobile number, e.g. 09171234567.')
      .optional(),
    defaultAddress: defaultAddressSchema.nullable().optional(),
  })
  .strict()

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Enter your current password.')
      .max(72, 'Password must be 72 characters or fewer.'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(72, 'Password must be 72 characters or fewer.'),
  })
  .strict()

export const validateUpdateProfile = validate(updateProfileSchema)
export const validateChangePassword = validate(changePasswordSchema)
