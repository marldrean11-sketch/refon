import { useEffect, useState } from 'react'
import {
  getListingReviewsRequest,
  getRelatedListingsRequest,
} from './listing-api.js'
import { subscribeToMarketplaceChanges } from '../../lib/marketplace-sync.js'

/**
 * Related phones for a product page.
 *
 * Uses the dedicated `/listings/:id/related` endpoint rather than fetching the
 * whole catalog and filtering in the browser. The endpoint already excludes the
 * listing itself and ranks same-brand and comparable-price devices on the server,
 * so this transfers six rows instead of a page of results plus client logic.
 */
export function useRelatedListings(listingId, limit = 6) {
  const [listings, setListings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncVersion, setSyncVersion] = useState(0)

  useEffect(() => {
    return subscribeToMarketplaceChanges(() => {
      setSyncVersion((current) => current + 1)
    })
  }, [])

  useEffect(() => {
    if (!listingId) {
      setListings([])
      setIsLoading(false)
      return undefined
    }

    const controller = new AbortController()
    let isActive = true

    // eslint-disable-next-line react/set-state-in-effect
    setIsLoading(true)
    setError(null)

    getRelatedListingsRequest(listingId, controller.signal)
      .then((response) => {
        if (isActive) {
          setListings(response.listings.slice(0, limit))
        }
      })
      .catch((requestError) => {
        // An aborted request is a normal consequence of navigating away, not a
        // failure worth showing the buyer.
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
  }, [listingId, limit, syncVersion])

  return { listings, isLoading, error }
}

/**
 * Published reviews for a listing, plus the rating distribution.
 *
 * The list is never padded or synthesised: a listing with no reviews renders an
 * explicit empty state rather than an average of zero.
 */
export function useListingReviews(listingId) {
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!listingId) {
      setReviews([])
      setSummary(null)
      setIsLoading(false)
      return undefined
    }

    const controller = new AbortController()
    let isActive = true

    // eslint-disable-next-line react/set-state-in-effect
    setIsLoading(true)
    setError(null)

    getListingReviewsRequest(listingId, controller.signal)
      .then((response) => {
        if (isActive) {
          setReviews(response.reviews)
          setSummary(response.summary)
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
  }, [listingId])

  return { reviews, summary, isLoading, error }
}