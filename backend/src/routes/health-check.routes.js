import { Router } from 'express'
import { record, stats } from '../controllers/health-check.controller.js'
import { healthCheckLimiter } from '../middlewares/rate-limit.middleware.js'
import { validateHealthCheckRun } from '../validators/health-check.validator.js'

const router = Router()

/**
 * The public "phones checked today" counter. Anonymous by design: a run is a
 * count of finished and passed checks and a timestamp, nothing about the
 * visitor. Writes are rate limited so the number cannot be pumped from one
 * address.
 */
router.get('/stats', stats)
router.post('/', healthCheckLimiter, validateHealthCheckRun, record)

export default router
