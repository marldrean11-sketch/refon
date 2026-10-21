import { Router } from 'express'
import { getHomeStats } from '../services/stats.service.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

router.get(
  '/home',
  asyncHandler(async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=60')
    return res.status(200).json(await getHomeStats())
  }),
)

export default router
