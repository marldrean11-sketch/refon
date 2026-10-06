import { useContext } from 'react'
import { CartContext } from './cart-context.js'
import { EMPTY_CART } from './cart-state.js'

const noop = async () => false

/**
 * The value routes that are not interested in the cart read.
 *
 * The cart is shared app-wide so the header badge and the cart page agree, but
 * that does not mean every route should render a loading state for it. Anything
 * outside a provider gets an inert, already-settled value.
 */
export const detachedCart = {
  cart: EMPTY_CART,
  isLoading: false,
  isMutating: false,
  error: null,
  clockOffset: 0,
  refresh: async () => EMPTY_CART,
  addListing: noop,
  removeListing: noop,
  emptyCart: noop,
  containsListing: () => false,
  isReady: false,
}

export function useCart() {
  const context = useContext(CartContext)
  return context ?? detachedCart
}
