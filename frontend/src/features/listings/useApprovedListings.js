import { useCallback, useEffect, useRef, useState } from 'react'
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

  // The filters are read through a ref so the effect below can depend on
  // `filterKey` alone.
  //
  // Depending on the `filters` object itself is a trap: a caller passing an
  // inline literal (`useApprovedListings({ sort: 'x' })`) creates a new object
  // every render, which re-runs the effect, which sets state, which renders
  // again. The request then never settles and the page never reaches network
  // idle. `filterKey` is the serialised value, so it only changes when the
  // filters actually differ.
  const filtersRef = useRef(filters)
  filtersRef.current = filters

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
          filtersRef.current,
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
    }, filtersRef.current ? 220 : 0)

    return () => {
      isActive = false
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [filterKey, retryToken, syncVersion])

  const retry = useCallback(() => {
    setRetryToken((current) => current + 1)
  }, [])

  return { listings, brands, isLoading, error, retry }
}
