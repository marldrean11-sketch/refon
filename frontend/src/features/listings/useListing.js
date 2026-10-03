import { useCallback, useEffect, useState } from 'react'
import { getListingRequest } from './listing-api.js'
import { subscribeToMarketplaceChanges } from '../../lib/marketplace-sync.js'

export function useListing(id) {
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

    getListingRequest(id, controller.signal)
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
  }, [id, retryToken])

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
