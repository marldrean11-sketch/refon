import { asyncHandler } from '../utils/async-handler.js'
import { createFeedback, getFeedbackSummary } from '../services/feedback.service.js'

export const submit = asyncHandler(async (req, res) => {
  await createFeedback(req.validatedBody)
  res.status(201).json({ message: 'Salamat! Your feedback was sent.' })
})

export const summary = asyncHandler(async (_req, res) => {
  res.json({ feedback: await getFeedbackSummary() })
})
