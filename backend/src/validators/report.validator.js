import { z } from 'zod'
import { validate, validateParams, validateQuery } from './auth.validator.js'

const reportReasons = [
  'SCAM',
  'MISLEADING',
  'WRONG_INFO',
  'PROHIBITED_ITEM',
  'OTHER',
]

const reportBodySchema = z
  .object({
    reason: z.enum(reportReasons, {
      error: 'Choose a reason for your report.',
    }),
    details: z
      .string()
      .trim()
      .max(1000, 'Details must be 1000 characters or fewer.')
      .optional()
      .or(z.literal('')),
  })
  .strict()
  .superRefine((value, ctx) => {
    // OTHER has no self-describing label, so the reporter must explain themselves.
    if (value.reason === 'OTHER' && !value.details) {
      ctx.addIssue({
        code: 'custom',
        path: ['details'],
        message: 'Add details so the moderation team can review your report.',
      })
    }
  })

const resolveReportSchema = z
  .object({
    action: z
      .enum(['TAKE_DOWN', 'RESOLVE', 'DISMISS'], {
        error: 'Choose TAKE_DOWN, RESOLVE, or DISMISS.',
      })
      .default('RESOLVE'),
    note: z
      .string()
      .trim()
      .max(1000, 'Note must be 1000 characters or fewer.')
      .optional()
      .or(z.literal('')),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.action === 'TAKE_DOWN' && !value.note) {
      ctx.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'Explain why this listing is being taken down.',
      })
    }
  })

const reportIdSchema = z.object({
  id: z.string().uuid('Report ID must be a valid UUID.'),
})

const reportsQuerySchema = z
  .object({
    status: z
      .enum(['OPEN', 'RESOLVED', 'DISMISSED', 'ALL'], {
        error: 'Status must be OPEN, RESOLVED, DISMISSED, or ALL.',
      })
      .default('OPEN'),
  })
  .strict()

export const validateReportBody = validate(reportBodySchema)
export const validateResolveReport = validate(resolveReportSchema)
export const validateReportId = validateParams(reportIdSchema)
export const validateReportsQuery = validateQuery(reportsQuerySchema)
