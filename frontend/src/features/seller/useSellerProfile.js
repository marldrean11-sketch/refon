import { useCallback, useEffect, useState } from 'react'
import { getMySellerProfileRequest } from './seller-api.js'
import { subscribeToMarketplaceChanges } from '../../lib/marketplace-sync.js'

export function useSellerProfile() {
  const [seller, setSeller] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await getMySellerProfileRequest()
      setSeller(response.seller)
      return response.seller
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

  return { seller, isLoading, error, refresh }
}
