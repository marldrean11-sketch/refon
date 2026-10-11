import { asyncHandler } from '../utils/async-handler.js'
import { getHealthCheckStats, recordHealthCheckRun } from '../services/health-check.service.js'

export const stats = asyncHandler(async (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ stats: await getHealthCheckStats() })
})

export const record = asyncHandler(async (req, res) => {
  const result = await recordHealthCheckRun(req.validatedBody)
  res.status(201).json({ stats: result })
})
