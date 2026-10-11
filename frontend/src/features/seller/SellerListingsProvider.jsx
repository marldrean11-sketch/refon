import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SellerListingsContext } from './seller-listings-context.js'
import {
  createListingRequest,
  deleteListingRequest,
  getMyListingsRequest,
  lowerListingPriceRequest,
  markListingSoldRequest,
  updateListingRequest,
} from '../listings/listing-api.js'
import {
  notifyMarketplaceChange,
  subscribeToMarketplaceChanges,
} from '../../lib/marketplace-sync.js'

export function SellerListingsProvider() {
  const [listings, setListings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await getMyListingsRequest()
      setListings(response.listings)
      return response.listings
    } catch (requestError) {
      setError(requestError)
      throw requestError
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    refresh().catch(() => {})

    const refreshInBackground = () => {
      refresh({ silent: true }).catch(() => {})
    }
    const unsubscribe = subscribeToMarketplaceChanges(refreshInBackground)
    const intervalId = window.setInterval(refreshInBackground, 30_000)

    window.addEventListener('focus', refreshInBackground)

    return () => {
      unsubscribe()
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshInBackground)
    }
  }, [refresh])

  const createListing = useCallback(async (values) => {
    const response = await createListingRequest(values)
    setListings((current) => [response.listing, ...current])
    notifyMarketplaceChange()
    return response.listing
  }, [])

  const updateListing = useCallback(async (id, values) => {
    const response = await updateListingRequest(id, values)
    setListings((current) =>
      current.map((listing) =>
        listing.id === id ? response.listing : listing,
      ),
    )
    notifyMarketplaceChange()
    return response.listing
  }, [])

  const deleteListing = useCallback(async (id) => {
    await deleteListingRequest(id)
    setListings((current) => current.filter((listing) => listing.id !== id))
    notifyMarketplaceChange()
  }, [])

  const markSold = useCallback(async (id) => {
    const response = await markListingSoldRequest(id)
    setListings((current) =>
      current.map((listing) =>
        listing.id === id ? response.listing : listing,
      ),
    )
    notifyMarketplaceChange()
    return response.listing
  }, [])

  const lowerPrice = useCallback(async (id, price) => {
    const response = await lowerListingPriceRequest(id, price)
    setListings((current) =>
      current.map((listing) => (listing.id === id ? response.listing : listing)),
    )
    notifyMarketplaceChange()
    return response
  }, [])

  const value = useMemo(
    () => ({
      listings,
      isLoading,
      error,
      refresh,
      createListing,
      updateListing,
      deleteListing,
      markSold,
      lowerPrice,
    }),
    [
      createListing,
      deleteListing,
      error,
      isLoading,
      listings,
      lowerPrice,
      markSold,
      refresh,
      updateListing,
    ],
  )

  return (
    <SellerListingsContext.Provider value={value}>
      <Outlet />
    </SellerListingsContext.Provider>
  )
}
