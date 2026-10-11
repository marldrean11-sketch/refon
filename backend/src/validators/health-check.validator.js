import { z } from 'zod'
import { validate } from './auth.validator.js'

/** The eight browser checks: a run reports how many finished and how many passed. */
const MAX_CHECKS = 8

const runSchema = z
  .object({
    completed: z.number().int().min(1).max(MAX_CHECKS),
    passed: z.number().int().min(0).max(MAX_CHECKS),
  })
  .strict()
  .refine((value) => value.passed <= value.completed, {
    message: 'Passed cannot exceed completed.',
    path: ['passed'],
  })

export const validateHealthCheckRun = validate(runSchema)
