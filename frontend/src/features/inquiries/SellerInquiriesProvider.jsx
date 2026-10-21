import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SellerInquiriesContext } from './seller-inquiries-context.js'
import {
  getMyInquiriesRequest,
  markAllInquiriesReadRequest,
  markInquiryReadRequest,
  replyToInquiryRequest,
} from './inquiry-api.js'
import { useAuth } from '../auth/useAuth.js'
import {
  notifyMarketplaceChange,
  subscribeToMarketplaceChanges,
} from '../../lib/marketplace-sync.js'

export function SellerInquiriesProvider() {
  const { user } = useAuth()
  const [inquiries, setInquiries] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState(null)
  const isSeller = user?.role === 'SELLER'
  // Non-sellers never render the inbox, so they are never "loading" it.
  const isLoading = isSeller ? isFetching : false

  const refresh = useCallback(
    async ({ silent = false, status, listingId } = {}) => {
      if (!isSeller) {
        return []
      }

      if (!silent) {
        setIsFetching(true)
      }
      setError(null)

      try {
        const response = await getMyInquiriesRequest({ status, listingId })
        setInquiries(response.inquiries)
        setUnreadCount(response.unreadCount)
        return response.inquiries
      } catch (requestError) {
        setError(requestError)
        throw requestError
      } finally {
        if (!silent) {
          setIsFetching(false)
        }
      }
    },
    [isSeller],
  )

  useEffect(() => {
    if (!isSeller) {
      return undefined
    }

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
  }, [isSeller, refresh])

  const markRead = useCallback(
    async (id) => {
      // Optimistic so the unread dot clears the moment the seller acts.
      setInquiries((current) =>
        current.map((inquiry) =>
          inquiry.id === id && !inquiry.isRead
            ? { ...inquiry, isRead: true }
            : inquiry,
        ),
      )
      setUnreadCount((current) => Math.max(0, current - 1))

      try {
        const response = await markInquiryReadRequest(id)
        setInquiries((current) =>
          current.map((inquiry) =>
            inquiry.id === id ? response.inquiry : inquiry,
          ),
        )
        setUnreadCount((current) =>
          response.inquiry.isRead ? Math.max(0, current) : current + 1,
        )
        notifyMarketplaceChange()
        return response.inquiry
      } catch (requestError) {
        // Roll the optimistic update back so the badge never lies.
        refresh({ silent: true }).catch(() => {})
        throw requestError
      }
    },
    [refresh],
  )

  const markAllRead = useCallback(async () => {
    try {
      const response = await markAllInquiriesReadRequest()
      setInquiries((current) =>
        current.map((inquiry) => ({ ...inquiry, isRead: true })),
      )
      setUnreadCount(0)
      notifyMarketplaceChange()
      return response
    } catch (requestError) {
      setError(requestError)
      throw requestError
    }
  }, [])

  /**
   * Posts a reply; the server also marks the inquiry read, so the badge drops
   * when `wasUnread` (the caller knows the card's state when it sent).
   */
  const reply = useCallback(async (id, body, wasUnread = false) => {
    const response = await replyToInquiryRequest(id, body)
    setInquiries((current) =>
      current.map((inquiry) => (inquiry.id === id ? response.inquiry : inquiry)),
    )
    if (wasUnread) setUnreadCount((current) => Math.max(0, current - 1))
    notifyMarketplaceChange()
    return response.inquiry
  }, [])

  const value = useMemo(
    () => ({
      inquiries,
      unreadCount,
      isLoading,
      error,
      refresh,
      markRead,
      markAllRead,
      reply,
    }),
    [error, inquiries, isLoading, markAllRead, markRead, refresh, reply, unreadCount],
  )

  return (
    <SellerInquiriesContext.Provider value={value}>
      <Outlet />
    </SellerInquiriesContext.Provider>
  )
}
