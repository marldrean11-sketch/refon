import {
  applyAsSeller,
  getPublicSeller,
  getPublicSellerListings,
  getPublicSellerReviews,
  getSellerProfile,
  updatePaymentDetails,
} from '../services/seller.service.js'
import { getUserById } from '../services/auth.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { setAuthCookie } from '../utils/auth-cookie.js'
import { createAccessToken } from '../utils/jwt.js'

export const applySeller = asyncHandler(async (req, res) => {
  const seller = await applyAsSeller(req.user.id, req.validatedBody)
  const user = await getUserById(req.user.id)

  setAuthCookie(res, createAccessToken(user))
  return res.status(200).json({ seller, user })
})

export const updateMyPaymentDetails = asyncHandler(async (req, res) => {
  const seller = await updatePaymentDetails(req.user.id, req.validatedBody)
  return res.status(200).json({ seller })
})

export const getMySellerProfile = asyncHandler(async (req, res) => {
  const seller = await getSellerProfile(req.user.id)
  return res.status(200).json({ seller })
})

/**
 * Public storefront reads.
 *
 * Read-only and unauthenticated: none of these accept a body, change a row, or
 * need a session. All three take the seller id from the validated path param and
 * never from the query string, so a request cannot point one of them at a
 * different seller than the URL names.
 *
 * The controller's names match the service's, so the route table reads as the
 * endpoint list rather than as an indirection puzzle.
 */
export const getStorefrontProfile = asyncHandler(async (req, res) => {
  const seller = await getPublicSeller(req.validatedParams.id)
  return res.status(200).json({ seller })
})

export const getStorefrontListings = asyncHandler(async (req, res) => {
  const data = await getPublicSellerListings(req.validatedParams.id, req.validatedQuery)
  return res.status(200).json(data)
})

export const getStorefrontReviews = asyncHandler(async (req, res) => {
  const data = await getPublicSellerReviews(req.validatedParams.id, req.validatedQuery)
  return res.status(200).json(data)
})