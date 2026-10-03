import { useContext } from 'react'
import { SellerInquiriesContext } from './seller-inquiries-context.js'

export function useSellerInquiries() {
  const context = useContext(SellerInquiriesContext)

  if (!context) {
    throw new Error('useSellerInquiries must be used inside SellerInquiriesProvider.')
  }

  return context
}
