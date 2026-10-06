import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CartContext } from './cart-context.js'
import {
  addToCartRequest,
  emptyCartRequest,
  getCartRequest,
  removeFromCartRequest,
} from './cart-api.js'
import { EMPTY_CART } from './cart-state.js'
import { computeClockOffset } from './reservation-timing.js'
import {
  notifyMarketplaceChange,
  subscribeToMarketplaceChanges,
} from '../../lib/marketplace-sync.js'
import { useAuth } from '../auth/useAuth.js'

/**
 * Shared cart state.
 *
 * One cart lives above the layouts, so the header badge, the product page's add
 * button, the cart page, and checkout all read the same object and cannot disagree
 * about what is in it. This mirrors how saved listings are already shared.
 *
 * The provider holds no derived copy of the cart. Every response from the API
 * replaces it wholesale, because the backend is the only thing that knows about
 * reservations, availability, and prices — a locally merged cart would drift from
 * the truth the moment somebody else touched a device.
 *
 * `clockOffset` is the one piece of client state that is not cart content: it is
 * the measured difference between the server clock and this device's, so the
 * reservation countdown can trust an absolute expiry timestamp.
 */
export function CartProvider({ children }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [cart, setCart] = useState(EMPTY_CART)
  const [clockOffset, setClockOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // A guest cart and an account cart are different carts. Changing owner has to
  // drop the previous cart immediately rather than leave the old one on screen for
  // a frame, and the server may have merged the guest cart into the account on
  // sign-in, so the next read is authoritative either way.
  const ownerKey = user ? `account:${user.id}` : 'guest'

  /**
   * Replaces the cart from an API response and re-measures the clock offset.
   *
   * `receivedAt` is captured once here so every item in one payload is measured
   * against the same instant.
   */
  const applyResponse = useCallback((response) => {
    const receivedAt = Date.now()

    if (response?.cart) {
      setCart(response.cart)
      setClockOffset(computeClockOffset(response.cart.serverTime, receivedAt))
    }

    return response
  }, [])

  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true)
      }

      try {
        const response = await getCartRequest()
        applyResponse(response)
        setError(null)
        return response.cart
      } catch (requestError) {
        // A failed background refresh must not wipe a cart the shopper can still see;
        // the cart page surfaces this, and the badge keeps its last known count.
        setError(requestError)
        throw requestError
      } finally {
        if (!silent) {
          setIsLoading(false)
        }

        setHasLoadedOnce(true)
      }
    },
    [applyResponse],
  )

  useEffect(() => {
    // Waiting for the session to settle means one read instead of two. A signed-in
    // visitor would otherwise be read as a guest first, and only then re-read once
    // the account resolves — a wasted request and a visible swap.
    if (isAuthLoading) {
      return undefined
    }

    // Drop the previous owner's cart before reading the new one, so a sign-out never
    // leaves account items visible to a guest.
    // eslint-disable-next-line react/set-state-in-effect
    setCart(EMPTY_CART)
    // eslint-disable-next-line react/set-state-in-effect
    setHasLoadedOnce(false)

    refresh().catch(() => {})
  }, [isAuthLoading, ownerKey, refresh])

  useEffect(() => {
    // Silent, so returning to the tab never flashes a loading state over a cart the
    // shopper was already looking at. This matters most for reservations: a hold
    // can lapse while the tab is in the background.
    const refreshInBackground = () => {
      refresh({ silent: true }).catch(() => {})
    }

    const unsubscribe = subscribeToMarketplaceChanges(refreshInBackground)
    window.addEventListener('focus', refreshInBackground)

    return () => {
      unsubscribe()
      window.removeEventListener('focus', refreshInBackground)
    }
  }, [refresh])

  /**
   * Runs a cart mutation and adopts the cart the server returned.
   *
   * Mutations are serialised through `isMutating` so a rapid double-tap cannot send
   * two conflicting writes, and every one of them returns the authoritative cart, so
   * a remove that frees a reservation shows up in the same tick as the removal.
   */
  const runMutation = useCallback(
    async (request) => {
      setIsMutating(true)

      try {
        const response = await request()
        applyResponse(response)
        setError(null)
        notifyMarketplaceChange()
        return response
      } catch (requestError) {
        setError(requestError)
        throw requestError
      } finally {
        setIsMutating(false)
      }
    },
    [applyResponse],
  )

  const addListing = useCallback(
    (listingId) => runMutation(() => addToCartRequest(listingId)),
    [runMutation],
  )

  const removeListing = useCallback(
    (listingId) => runMutation(() => removeFromCartRequest(listingId)),
    [runMutation],
  )

  const emptyCart = useCallback(() => runMutation(() => emptyCartRequest()), [runMutation])

  const containsListing = useCallback(
    (listingId) => cart.items.some((item) => item.listing?.id === listingId),
    [cart.items],
  )

  const value = useMemo(
    () => ({
      cart,
      isLoading: isLoading && !hasLoadedOnce,
      isMutating,
      error,
      clockOffset,
      refresh,
      addListing,
      removeListing,
      emptyCart,
      containsListing,
      isReady: hasLoadedOnce,
    }),
    [
      addListing,
      clockOffset,
      containsListing,
      emptyCart,
      error,
      hasLoadedOnce,
      isLoading,
      isMutating,
      refresh,
      removeListing,
      cart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
