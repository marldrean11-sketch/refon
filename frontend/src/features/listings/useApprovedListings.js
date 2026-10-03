import { useCallback, useEffect, useState } from 'react'
import { getApprovedListingsRequest } from './listing-api.js'
import { subscribeToMarketplaceChanges } from '../../lib/marketplace-sync.js'

export function useApprovedListings(filters) {
  const [listings, setListings] = useState([])
  const [brands, setBrands] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncVersion, setSyncVersion] = useState(0)
  const [retryToken, setRetryToken] = useState(0)
  const filterKey = JSON.stringify(filters ?? {})

  useEffect(() => {
    return subscribeToMarketplaceChanges(() => {
      setSyncVersion((current) => current + 1)
    })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    // eslint-disable-next-line react/set-state-in-effect
    setIsLoading(true)
    setError(null)

    const timer = window.setTimeout(async () => {
      try {
        const response = await getApprovedListingsRequest(
          filters,
          controller.signal,
        )
        if (isActive) {
          setListings(response.listings)
          setBrands(response.brands)
        }
      } catch (requestError) {
        if (isActive && requestError.name !== 'AbortError') {
          setError(requestError)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }, filters ? 220 : 0)

    return () => {
      isActive = false
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [filterKey, filters, retryToken, syncVersion])

  const retry = useCallback(() => {
    setRetryToken((current) => current + 1)
  }, [])

  return { listings, brands, isLoading, error, retry }
}
