import { useCart } from './useCart.js'
import { EMPTY_CART } from './cart-state.js'

/**
 * Cart summary for the header badge and the mobile tab bar.
 *
 * Kept as its own hook so a component that only needs the count never re-renders
 * when a cart item's price, reservation, or listing details change. The header and
 * the tab bar both read through here, which is why they are automatically in sync
 * with the cart page without subscribing to the whole cart.
 */
export function useCartSummary() {
  const { cart, isReady } = useCart()

  return {
    itemCount: cart?.itemCount ?? EMPTY_CART.itemCount,
    subtotal: cart?.subtotal ?? EMPTY_CART.subtotal,
    /**
     * False until the first cart read resolves. A badge that renders `0` during that
     * window would briefly contradict a cart the shopper can already see.
     */
    isReady,
  }
}
