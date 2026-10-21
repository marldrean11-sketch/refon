import { createTradeIn, getTradeInsForAdmin, updateTradeIn } from '../services/trade-in.service.js'
import { asyncHandler } from '../utils/async-handler.js'

export const submitTradeIn = asyncHandler(async (req, res) => {
  const request = await createTradeIn(req.user?.id, req.validatedBody)
  return res.status(201).json({ request })
})

export const adminTradeIns = asyncHandler(async (req, res) => {
  return res.status(200).json(await getTradeInsForAdmin(req.validatedQuery ?? {}))
})

export const adminUpdateTradeIn = asyncHandler(async (req, res) => {
  const request = await updateTradeIn(req.validatedParams.id, req.validatedBody)
  return res.status(200).json({ request })
})
