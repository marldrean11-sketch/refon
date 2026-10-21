import { Router } from 'express'
import {
  demoLogin,
  forgotPassword,
  login,
  logout,
  me,
  register,
  resendVerification,
  resetPasswordRequest,
  verifyEmailRequest,
} from '../controllers/auth.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import {
  authLimiter,
  demoLoginLimiter,
  passwordResetLimiter,
  verificationLimiter,
} from '../middlewares/rate-limit.middleware.js'
import {
  validateDemoLogin,
  validateForgotPassword,
  validateLogin,
  validateRegister,
  validateResetPassword,
  validateVerifyEmail,
} from '../validators/auth.validator.js'

const router = Router()

router.post('/register', authLimiter, validateRegister, register)
router.post('/login', authLimiter, validateLogin, login)
router.post('/demo-login', demoLoginLimiter, validateDemoLogin, demoLogin)
router.post('/logout', logout)
router.get('/me', authenticate, me)

router.post(
  '/forgot-password',
  passwordResetLimiter,
  validateForgotPassword,
  forgotPassword,
)
router.post(
  '/reset-password',
  passwordResetLimiter,
  validateResetPassword,
  resetPasswordRequest,
)
router.post('/verify-email', validateVerifyEmail, verifyEmailRequest)
router.post(
  '/resend-verification',
  verificationLimiter,
  authenticate,
  resendVerification,
)

export default router
