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
import { ApiClientError } from '../../lib/api-client.js'
import { useAuth } from '../auth/useAuth.js'

/**
 * Shared cart state.
 *
 * One cart lives above the layouts, so the header badge, the product page's add
 * button, the cart page, and checkout all read the same object and cannot disagree
 * about what is in it. This mirrors how saved listings are already shared.
 *
 * Only a signed-in BUYER has a cart. There is no guest cart and no merge-on-sign-in,
 * because buying is a buyer action: a visitor is sent to sign in before a cart
 * exists. That means this provider fetches for buyers only, and a visitor, seller or
 * admin sees the empty cart constant without a single refused request.
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
  /**
   * Only a BUYER has a cart. Every cart endpoint requires an authenticated buyer, so
   * a visitor, seller or admin is never sent a cart request.
   */
  const isBuyer = user?.role === 'BUYER'
  const [cart, setCart] = useState(EMPTY_CART)
  const [clockOffset, setClockOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Every cart belongs to one signed-in buyer, so the owner is the account. Signing
  // in as somebody else has to drop the previous cart immediately rather than leave
  // it on screen for a frame, and the next read is authoritative either way.
  const ownerKey = user ? `account:${user.id}` : 'anonymous'

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
    // Waiting for the session to settle means one read instead of two: a buyer whose
    // session is still resolving would otherwise be read before the session exists.
    if (isAuthLoading) {
      return undefined
    }

    // Drop the previous buyer's cart before reading the new one, so a sign-out never
    // leaves account items on screen.
    // eslint-disable-next-line react/set-state-in-effect
    setCart(EMPTY_CART)
    // eslint-disable-next-line react/set-state-in-effect
    setHasLoadedOnce(false)

    // Only a buyer has a cart, and every cart endpoint is gated server-side. A
    // visitor, seller or admin therefore gets *no* request at all rather than a 401
    // or 403 on every page load: there is nothing for them to fetch, and a stream of
    // refused requests would be noise in the console for every non-buyer visitor.
    if (!isBuyer) {
      // eslint-disable-next-line react/set-state-in-effect
      setHasLoadedOnce(true)
      return undefined
    }

    refresh().catch(() => {})
  }, [isAuthLoading, isBuyer, ownerKey, refresh])

  useEffect(() => {
    // No polling for anyone but a buyer: there is no cart to keep fresh, and the
    // subscription would otherwise fire refused requests for every other role.
    if (!isBuyer) {
      return undefined
    }

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
  }, [isBuyer, refresh])

  /**
   * Runs a cart mutation and adopts the cart the server returned.
   *
   * Mutations are serialised through `isMutating` so a rapid double-tap cannot send
   * two conflicting writes, and every one of them returns the authoritative cart, so
   * a remove that frees a reservation shows up in the same tick as the removal.
   */
  const runMutation = useCallback(
    async (request) => {
      // Refused client-side rather than sent and rejected. The server enforces this
      // too, but a caller that reaches this with no buyer session should not produce
      // a 401 in the console, and the UI is already redirecting them to sign in.
      if (!isBuyer) {
        throw new ApiClientError('Cart and wishlist are for buyer accounts.', {
          status: 0,
          code: 'BUYER_ONLY',
        })
      }

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
    [applyResponse, isBuyer],
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

  /**
   * Replays the add a visitor asked for before they signed in.
   *
   * `takeIntent` clears the stored entry before returning it, so this can run twice
   * (React StrictMode double-invokes effects in development) and still add the phone
   * exactly once: the second call finds nothing to replay.
   *
   * It returns a small result rather than raising a toast itself, because the toast
   * provider sits *below* this one in the tree and cannot be read from here.
   * `PendingIntentReplay` owns the messaging.
   *
   * The hold starts now, at the moment of the replay, which is the point of the
   * exercise: a phone another buyer took during sign-in is refused here and reported
   * rather than silently dropped.
   */
  const replayPendingIntent = useCallback(async () => {
    const intent = takeIntent()

    if (!intent || intent.action !== 'add-to-cart') {
      return null
    }

    try {
      const response = await addToCartRequest(intent.listingId)
      applyResponse(response)

      const added = response.cart.items.find((entry) => entry.listing?.id === intent.listingId)

      notifyMarketplaceChange()

      return {
        status: 'added',
        device: added?.listing
          ? `${added.listing.brand} ${added.listing.model}`
          : 'That phone',
      }
    } catch (requestError) {
      notifyMarketplaceChange()

      const code = requestError?.code

      if (
        code === 'LISTING_RESERVED' ||
        code === 'LISTING_UNAVAILABLE' ||
        code === 'LISTING_NOT_AVAILABLE'
      ) {
        return { status: 'taken' }
      }

      return { status: 'failed', message: requestError?.message ?? 'Please try again.' }
    }
  }, [applyResponse])

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
      isBuyer,
      replayPendingIntent,
    }),
    [
      addListing,
      clockOffset,
      containsListing,
      emptyCart,
      error,
      hasLoadedOnce,
      isBuyer,
      isLoading,
      isMutating,
      refresh,
      removeListing,
      replayPendingIntent,
      cart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
