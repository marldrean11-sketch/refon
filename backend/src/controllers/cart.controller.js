import {
  addToCart,
  clearCart,
  getCart,
  removeCartItem,
} from '../services/cart.service.js'
import { asyncHandler } from '../utils/async-handler.js'

/**
 * Cart endpoints.
 *
 * The cart owner is the authenticated buyer and nothing else. Which cart a request
 * touches is decided from the session on the route's `authenticate` middleware, so
 * a client cannot address somebody else's cart by supplying an id, and there is no
 * guest cart to merge because a cart only ever exists for a signed-in buyer.
 */

export const getCurrentCart = asyncHandler(async (req, res) => {
  const cart = await getCart({ userId: req.user.id })

  return res.status(200).json({ cart })
})

export const addListingToCart = asyncHandler(async (req, res) => {
  const { cart, created } = await addToCart({
    userId: req.user.id,
    listingId: req.validatedBody.listingId,
  })

  return res.status(created ? 201 : 200).json({ cart, created })
})

export const removeListingFromCart = asyncHandler(async (req, res) => {
  const { cart, removed } = await removeCartItem({
    userId: req.user.id,
    listingId: req.validatedParams.listingId,
  })

  return res.status(200).json({ cart, removed })
})

export const emptyCart = asyncHandler(async (req, res) => {
  const cart = await clearCart({ userId: req.user.id })

  return res.status(200).json({ cart })
})