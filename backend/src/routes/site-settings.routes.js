import { Router } from 'express'
import { show } from '../controllers/site-settings.controller.js'

const router = Router()

/** Public: the booth number and chat links every page shows. */
router.get('/', show)

export default router
