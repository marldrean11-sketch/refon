import { useContext } from 'react'
import { SellerInquiriesContext } from './seller-inquiries-context.js'

export function useSellerInquiries() {
  const context = useContext(SellerInquiriesContext)

  if (!context) {
    throw new Error('useSellerInquiries must be used inside SellerInquiriesProvider.')
  }

  return context
}

/**
 * The seller inbox read for chrome that can render outside the provider.
 *
 * The global header is shared by the public marketplace shell and the
 * authenticated shell, so it cannot assume the inbox is mounted — and a hook
 * that throws would take the entire site down rather than omit one badge. This
 * mirrors `useSavedListings`, which returns an inert value for the same reason.
 *
 * `unreadCount` is 0 rather than unknown here, and the caller shows no badge when
 * it is 0, so a missing provider produces no badge at all rather than a wrong 0.
 */
const NO_SELLER_INQUIRIES = {
  inquiries: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  refresh: async () => [],
  markRead: async () => {},
  markAllRead: async () => {},
}

export function useOptionalSellerInquiries() {
  return useContext(SellerInquiriesContext) ?? NO_SELLER_INQUIRIES
}
