import { z } from 'zod'
import { validate, validateParams, validateQuery } from './auth.validator.js'

const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED']

const orderIdSchema = z.object({ id: z.string().uuid('Order ID must be a valid UUID.') })

const orderNumberSchema = z.object({
  orderNumber: z.string().trim().regex(/^RF-\d{6}-[0-9A-Z]{6}$/, 'Order number is not valid.'),
})

const orderStatusBodySchema = z
  .object({
    status: z.enum(['CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED'], {
      error: 'Choose a valid order status.',
    }),
    reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer.').optional(),
  })
  .strict()

const cancelBodySchema = z.preprocess(
  (value) => value ?? {},
  z
    .object({
      reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer.').optional(),
    })
    .strict(),
)

const orderQuerySchema = z
  .object({ status: z.enum(ORDER_STATUSES).optional() })
  .strict()

export const validateOrderId = validateParams(orderIdSchema)
export const validateOrderNumber = validateParams(orderNumberSchema)
export const validateOrderStatusBody = validate(orderStatusBodySchema)
export const validateCancelBody = validate(cancelBodySchema)
export const validateOrderQuery = validateQuery(orderQuerySchema)
