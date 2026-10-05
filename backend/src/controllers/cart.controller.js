import {
  addToCart,
  clearCart,
  getCart,
  mergeGuestCartIntoAccount,
  removeCartItem,
} from '../services/cart.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import {
  clearGuestCartCookie,
  createGuestCartToken,
  hashGuestCartToken,
  readGuestCartToken,
  setGuestCartCookie,
} from '../utils/cart-token.js'

/**
 * Cart endpoints.
 *
 * The cart owner is resolved here from the session and the guest cookie, never
 * from the request body, so a client cannot address somebody else's cart by
 * supplying an id. A signed-in buyer always resolves to their account cart.
 */

/**
 * Cart identity for this request.
 *
 * Any signed-in non-admin account owns an account cart — a seller is also a buyer,
 * and blocking them would be an arbitrary restriction. Only the session cookie
 * decides this; nothing in the request can.
 */
function cartOwnerFor(req) {
  if (req.user && req.user.role !== 'ADMIN') {
    return { userId: req.user.id, guestTokenHash: null, guestToken: null }
  }

  const guestToken = readGuestCartToken(req)

  return {
    userId: null,
    guestTokenHash: guestToken ? hashGuestCartToken(guestToken) : null,
    guestToken,
  }
}

export const getCurrentCart = asyncHandler(async (req, res) => {
  const { userId, guestTokenHash } = cartOwnerFor(req)
  const cart = await getCart({ userId, guestTokenHash })

  return res.status(200).json({ cart })
})

export const addListingToCart = asyncHandler(async (req, res) => {
  const { userId, guestToken, guestTokenHash } = cartOwnerFor(req)

  // A guest with no cookie yet gets an identity before the write, so the cart that
  // is created is reachable on the next request.
  let token = guestToken
  let tokenHash = guestTokenHash

  if (!userId && !token) {
    token = createGuestCartToken()
    tokenHash = hashGuestCartToken(token)
  }

  const { cart, created } = await addToCart({
    userId,
    guestTokenHash: tokenHash,
    listingId: req.validatedBody.listingId,
  })

  if (token && !guestToken) {
    setGuestCartCookie(res, token)
  }

  return res.status(created ? 201 : 200).json({ cart, created })
})

export const removeListingFromCart = asyncHandler(async (req, res) => {
  const { userId, guestTokenHash } = cartOwnerFor(req)

  const { cart, removed } = await removeCartItem({
    userId,
    guestTokenHash,
    listingId: req.validatedParams.listingId,
  })

  return res.status(200).json({ cart, removed })
})

export const emptyCart = asyncHandler(async (req, res) => {
  const { userId, guestTokenHash } = cartOwnerFor(req)
  const cart = await clearCart({ userId, guestTokenHash })

  return res.status(200).json({ cart })
})

/**
 * Explicit guest-to-account merge.
 *
 * Sign-in already merges, so this exists for the case where a buyer built a guest
 * cart, signed in on another tab, and wants the carts combined without signing out
 * again. It is idempotent: the guest cookie is consumed, so a second call is a
 * no-op rather than a duplicate merge.
 */
export const mergeCart = asyncHandler(async (req, res) => {
  // `requireBuyerOrSeller` has already established that a session exists.
  const guestToken = readGuestCartToken(req)

  const merged = await mergeGuestCartIntoAccount({
    userId: req.user.id,
    guestToken,
  })

  if (merged) {
    clearGuestCartCookie(res)
  }

  const cart = await getCart({ userId: req.user.id })

  return res.status(200).json({ cart, merged })
})
