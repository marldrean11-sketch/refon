import { Router } from 'express'
import { show } from '../controllers/site-settings.controller.js'

const router = Router()

/** Public: the booth number, chat link and announcement every page shows. */
router.get('/', show)

export default router
