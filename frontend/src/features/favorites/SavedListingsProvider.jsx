import { useCallback, useEffect, useMemo, useState } from 'react'
import { SavedListingsContext } from './saved-listings-context.js'
import {
  getMyFavoritesRequest,
  removeFavoriteRequest,
  saveFavoriteRequest,
} from './favorites-api.js'
import { useAuth } from '../auth/useAuth.js'
import { anonymousSavedListings } from './useSavedListings.js'
import {
  notifyMarketplaceChange,
  subscribeToMarketplaceChanges,
} from '../../lib/marketplace-sync.js'

export function SavedListingsProvider({ children }) {
  const { user } = useAuth()
  const [savedIds, setSavedIds] = useState(() => new Set())
  const [isFetching, setIsFetching] = useState(true)
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
        ? { savedIds, isSaved, toggle, isLoading }
        : anonymousSavedListings,
    [isBuyer, isLoading, isSaved, savedIds, toggle],
  )

  return (
    <SavedListingsContext.Provider value={value}>
      {children}
    </SavedListingsContext.Provider>
  )
}
