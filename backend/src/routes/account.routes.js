import { Router } from 'express'
import {
  changePassword,
  updateProfile,
} from '../controllers/account.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import { authLimiter } from '../middlewares/rate-limit.middleware.js'
import {
  validateChangePassword,
  validateUpdateProfile,
} from '../validators/account.validator.js'

const router = Router()

// Available to every signed-in role: buyers, sellers and admins.
router.use(authenticate)

router.patch('/profile', validateUpdateProfile, updateProfile)
router.post('/change-password', authLimiter, validateChangePassword, changePassword)

export default router
