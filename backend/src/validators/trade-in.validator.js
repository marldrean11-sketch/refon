import { z } from 'zod'
import { validate, validateParams, validateQuery } from './auth.validator.js'

const STATUSES = ['NEW', 'CONTACTED', 'DONE', 'DECLINED']
const answer = z.string().trim().min(1).max(40)
const peso = z.number().int().min(0).max(500_000)

const tradeInSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name.').max(120, 'Name is too long.'),
    contact: z
      .string()
      .trim()
      .min(5, 'Enter a mobile number or email so we can reach you.')
      .max(320, 'Contact is too long.'),
    brand: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(120),
    answers: z
      .object({ storage: answer, grade: answer, battery: answer, working: answer })
      .strict(),
    estimateLow: peso,
    estimateHigh: peso,
    note: z.string().trim().max(1000, 'Note must be 1000 characters or fewer.').optional(),
  })
  .strict()
  .refine((value) => value.estimateHigh >= value.estimateLow, {
    path: ['estimateHigh'],
    message: 'The estimate range is not valid.',
  })

const tradeInUpdateSchema = z
  .object({
    status: z.enum(STATUSES).optional(),
    adminNote: z.string().trim().max(1000).optional(),
  })
  .strict()

export const validateTradeIn = validate(tradeInSchema)
export const validateTradeInUpdate = validate(tradeInUpdateSchema)
export const validateTradeInId = validateParams(z.object({ id: z.string().uuid('Not a valid id.') }))
export const validateTradeInQuery = validateQuery(
  z.object({ status: z.enum(STATUSES).optional() }).strict(),
)
