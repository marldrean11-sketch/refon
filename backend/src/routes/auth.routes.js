import { Router } from 'express'
import { login, logout, me, register } from '../controllers/auth.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import { authLimiter } from '../middlewares/rate-limit.middleware.js'
import { validateLogin, validateRegister } from '../validators/auth.validator.js'

const router = Router()

router.post('/register', authLimiter, validateRegister, register)
router.post('/login', authLimiter, validateLogin, login)
router.post('/logout', logout)
router.get('/me', authenticate, me)

export default router
