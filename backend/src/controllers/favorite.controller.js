import {
  getMyFavorites,
  removeFavorite,
  saveFavorite,
} from '../services/favorite.service.js'
import { asyncHandler } from '../utils/async-handler.js'

export const getMine = asyncHandler(async (req, res) => {
  const data = await getMyFavorites(req.user.id)
  return res.status(200).json(data)
})

export const save = asyncHandler(async (req, res) => {
  const data = await saveFavorite(req.user.id, req.validatedParams.listingId)
  return res.status(200).json(data)
})

export const remove = asyncHandler(async (req, res) => {
  await removeFavorite(req.user.id, req.validatedParams.listingId)
  return res.status(204).send()
})
