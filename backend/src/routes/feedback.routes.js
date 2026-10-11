import { Router } from 'express'
import { submit } from '../controllers/feedback.controller.js'
import { feedbackLimiter } from '../middlewares/rate-limit.middleware.js'
import { validateFeedback } from '../validators/feedback.validator.js'

const router = Router()

/** Public and anonymous; rate limited so one device cannot flood the results. */
router.post('/', feedbackLimiter, validateFeedback, submit)

export default router
