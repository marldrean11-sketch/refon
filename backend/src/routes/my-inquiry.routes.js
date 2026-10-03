import { Router } from 'express'
import { getMine } from '../controllers/my-inquiry.controller.js'
import {
  authenticate,
  requireBuyerOrSeller,
} from '../middlewares/auth.middleware.js'

const router = Router()

router.get('/', authenticate, requireBuyerOrSeller, getMine)

export default router
