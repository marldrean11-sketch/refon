import { useCallback, useEffect, useMemo, useState } from 'react'
import { SavedListingsContext } from './saved-listings-context.js'
import {
  getMyFavoritesRequest,
  removeFavoriteRequest,
  saveFavoriteRequest,
} from './favorites-api.js'
import { useAuth } from '../auth/useAuth.js'
import { anonymousSavedListings } from './useSavedListings.js'
import { clearIntent, takeIntent } from '../cart/pending-intent.js'
import {
  notifyMarketplaceChange,
  subscribeToMarketplaceChanges,
} from '../../lib/marketplace-sync.js'

export function SavedListingsProvider({ children }) {
  const { user } = useAuth()
  const [savedIds, setSavedIds] = useState(() => new Set())
  const [isFetching, setIsFetching] = useState(true)
  /**
   * Only a BUYER has a wishlist. Every favorites endpoint is gated server-side, so
   * this provider fetches for buyers only: a visitor, seller or admin sees an inert
   * wishlist and produces no request, rather than a 401 or 403 on every page load.
   */
  const isBuyer = user?.role === 'BUYER'
  const isLoading = isBuyer ? isFetching : false

  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (!isBuyer) {
        return []
      }

      if (!silent) {
        setIsFetching(true)
      }

      try {
        const response = await getMyFavoritesRequest()
        setSavedIds(new Set(response.ids))
        return response.listings
      } catch {
        // A failed badge refresh should not break browsing; the next poll retries.
        return []
      } finally {
        if (!silent) {
          setIsFetching(false)
        }
      }
    },
    [isBuyer],
  )

  useEffect(() => {
    if (!isBuyer) {
      return undefined
    }

    // eslint-disable-next-line react/set-state-in-effect
    refresh().catch(() => {})

    // Silent so returning focus never flashes a loading state.
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

  const isSaved = useCallback((id) => savedIds.has(id), [savedIds])

  /**
   * Saves the listing a visitor tried to save before signing in.
   *
   * Declared after `isSaved` because it uses it, and it is referenced by the effect
   * above through the dependency list, so both are declared before that effect runs
   * on the next render. `takeIntent` clears the entry before returning it, which is
   * what makes this safe to run twice.
   */
  const replayWishlistIntent = useCallback(async () => {
    const intent = takeIntent()

    if (!intent || intent.action !== 'save-wishlist') {
      return
    }

    try {
      const response = await saveFavoriteRequest(intent.listingId)
      setSavedIds(new Set(response.ids))
      notifyMarketplaceChange()
    } catch {
      // A wishlist is a convenience rather than a reservation, so a failed replay is
      // not worth interrupting the shopper for. The heart on the product page they
      // land back on still shows the real state.
    }
  }, [])

  /**
   * Replays, or discards, a wishlist intent left over from before sign-in.
   *
   * This runs here rather than in the sign-in callback because it is the one place
   * guaranteed to execute once the session has resolved, and because it also covers
   * the case where the shopper never signs in: a seller or admin, or a visitor who
   * abandons the sign-in page, has the intent dropped so it cannot resurface under a
   * different account later.
   *
   * `takeIntent` clears the stored entry before returning it, which is what makes a
   * React StrictMode double-invoke still save the listing exactly once.
   */
  useEffect(() => {
    if (!isBuyer) {
      clearIntent()
      return
    }

    // Same suppression the initial `refresh` below already carries: this is an effect
    // synchronising with an external system (a pending intent left in storage by an
    // earlier page), which is exactly what an effect is for.
    // eslint-disable-next-line react/set-state-in-effect
    replayWishlistIntent()
  }, [isBuyer, replayWishlistIntent])

  const toggle = useCallback(
    async (id) => {
      if (!isBuyer) {
        return
      }

      const wasSaved = savedIds.has(id)

      // Optimistic so the heart responds instantly, reverted if the API refuses.
      setSavedIds((current) => {
        const next = new Set(current)
        if (wasSaved) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })

      try {
        if (wasSaved) {
          await removeFavoriteRequest(id)
        } else {
          await saveFavoriteRequest(id)
        }
        notifyMarketplaceChange()
      } catch (error) {
        setSavedIds((current) => {
          const next = new Set(current)
          if (wasSaved) {
            next.add(id)
          } else {
            next.delete(id)
          }
          return next
        })
        throw error
      }
    },
    [isBuyer, savedIds],
  )

  // Non-buyers always read the shared inert value, which also drops any stale
  // ids left over from a previous session without an extra render.
  const value = useMemo(
    () =>
      isBuyer
        ? { savedIds, isSaved, toggle, isLoading, isBuyer: true }
        : anonymousSavedListings,
    [isBuyer, isLoading, isSaved, savedIds, toggle],
  )

  return (
    <SavedListingsContext.Provider value={value}>
      {children}
    </SavedListingsContext.Provider>
  )
}
