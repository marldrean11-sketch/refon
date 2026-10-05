import { Router } from 'express'
import { asyncHandler } from '../utils/async-handler.js'
import { prisma } from '../config/prisma.js'

const router = Router()

/**
 * Liveness plus database reachability. Deliberately public, unrated and free of any
 * configuration detail so a load balancer or container healthcheck can poll it.
 */
const health = asyncHandler(async (_req, res) => {
  const startedAt = process.hrtime.bigint()

  try {
    await prisma.$queryRawUnsafe('SELECT 1')
  } catch {
    // Never leak the driver message: this endpoint is reachable without auth.
    return res.status(503).json({ status: 'degraded' })
  }

  const roundTripMs = Number(process.hrtime.bigint() - startedAt) / 1e6

  return res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    db: { ok: true, roundTripMs: Number(roundTripMs.toFixed(2)) },
  })
})

export { health }
export default router