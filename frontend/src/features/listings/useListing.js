import { useCallback, useEffect, useState } from 'react'
import {
  getListingBySlugRequest,
  getListingRequest,
} from './listing-api.js'
import { subscribeToMarketplaceChanges } from '../../lib/marketplace-sync.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Loads a listing from either a canonical slug (`/phones/:slug`) or a legacy id
 * (`/listings/:id`).
 *
 * The route decides which: a UUID is an id, anything else is a slug. Both shapes
 * resolve to the same listing, so old bookmarks and existing links keep working
 * while the canonical URL is the slug.
 */
export function useListing(identifier) {
  const [listing, setListing] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    // eslint-disable-next-line react/set-state-in-effect
    setIsLoading(true)
    setError(null)
    setListing(null)

    if (!identifier) {
      setIsLoading(false)
      return () => {
        isActive = false
      }
    }

    const request = UUID_PATTERN.test(identifier)
      ? getListingRequest(identifier, controller.signal)
      : getListingBySlugRequest(identifier, controller.signal)

    request
      .then((response) => {
        if (isActive) {
          setListing(response.listing)
        }
      })
      .catch((requestError) => {
        if (isActive && requestError.name !== 'AbortError') {
          setError(requestError)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [identifier, retryToken])

  useEffect(() => {
    const revalidate = () => {
      setRetryToken((current) => current + 1)
    }
    const unsubscribe = subscribeToMarketplaceChanges(revalidate)
    window.addEventListener('focus', revalidate)

    return () => {
      unsubscribe()
      window.removeEventListener('focus', revalidate)
    }
  }, [])

  const retry = useCallback(() => {
    setRetryToken((current) => current + 1)
  }, [])

  return { listing, isLoading, error, retry }
}
