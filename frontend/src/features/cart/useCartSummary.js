/**
 * Cart summary for the header badge.
 *
 * Phase 1 ships the layout with a zero-state so the header is complete and
 * runnable. Phase 6 replaces the body with the real cart provider; nothing else
 * in the app needs to change because they all read through this hook.
 */
export function useCartSummary() {
  return { itemCount: 0, subtotal: 0, isReady: false }
}
