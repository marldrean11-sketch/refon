import { z } from 'zod'
import { validate } from './auth.validator.js'

const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters.')
      .max(120, 'Name must be 120 characters or fewer.'),
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
