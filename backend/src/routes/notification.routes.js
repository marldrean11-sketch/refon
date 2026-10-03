import { Router } from 'express'
import {
  getMine,
  markAllRead,
  markRead,
} from '../controllers/notification.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import { validateNotificationId } from '../validators/notification.validator.js'

const router = Router()

router.use(authenticate)
router.get('/mine', getMine)
router.patch('/read-all', markAllRead)
router.patch('/:id/read', validateNotificationId, markRead)

export default router
