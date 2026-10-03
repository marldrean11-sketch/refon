import { useContext } from 'react'
import { SellerListingsContext } from './seller-listings-context.js'

export function useSellerListings() {
  const context = useContext(SellerListingsContext)

  if (!context) {
    throw new Error('useSellerListings must be used inside SellerListingsProvider.')
  }

  return context
}
