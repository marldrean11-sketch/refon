import { z } from 'zod'
import { validateParams } from './auth.validator.js'

const notificationIdSchema = z.object({
  id: z.string().uuid('Notification ID must be a valid UUID.'),
})

export const validateNotificationId = validateParams(notificationIdSchema)
