import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/Button.jsx'
import { EmptyCartState, ErrorState } from '../components/ui/StateViews.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'
import { CartItemCard } from '../features/cart/components/CartItemCard.jsx'
import { CartSkeleton } from '../features/cart/components/CartSkeleton.jsx'
import { CartSummaryPanel } from '../features/cart/components/CartSummaryPanel.jsx'
import { useCart } from '../features/cart/useCart.js'
import {
  blockingItems,
  changedPriceItems,
  deviceName,
  isCartCheckoutable,
  isItemUnavailable,
  isReservationExpired,
} from '../features/cart/cart-state.js'
import { cartErrorMessage } from '../features/cart/cart-errors.js'

/**
 * The cart.
 *
 * Two columns on desktop — reserved devices on the left, the price summary on the
 * right — and one column on mobile with the summary after the items, because the
 * summary is the thing a mobile shopper scrolls toward once they have read what is
 * in the cart.
 *
 * Every state the backend can report gets its own visible treatment: a live hold
 * with a countdown, a price that moved, a hold that lapsed, a listing that is gone.
 * Nothing here is deleted or silently corrected. The shopper is told what changed
 * and given the action that resolves it.
 */
export function CartPage() {
  const { cart, isLoading, isMutating, error, refresh, removeListing, emptyCart } = useCart()
  const toast = useToast()
  const navigate = useNavigate()

  const [removingId, setRemovingId] = useState(null)
  const [isEmptying, setIsEmptying] = useState(false)

  // A hold can lapse while the cart is open. The countdown shows it, and this
  // re-read keeps the backend's own verdict in view once the visible timer runs out.
  useEffect(() => {
    if (cart.items.length === 0) {
      return undefined
    }

    const timer = window.setInterval(() => {
      refresh({ silent: true }).catch(() => {})
    }, 30_000)

    return () => window.clearInterval(timer)
  }, [cart.items.length, refresh])

  const blocked = useMemo(() => blockingItems(cart.items), [cart.items])
  const expiredCount = useMemo(
    () => blocked.filter(isReservationExpired).length,
    [blocked],
  )
  const priceChanges = useMemo(() => changedPriceItems(cart.items), [cart.items])

  const canCheckout = isCartCheckoutable(cart)

  async function handleRemove(item) {
    const name = deviceName(item.listing)

    setRemovingId(item.listing.id)

    try {
      await removeListing(item.listing.id)
      toast.success(`${name} removed from your cart.`, {
        description: 'Its reservation has been released.',
      })
    } catch (requestError) {
      toast.error('We could not remove that phone.', {
        description: cartErrorMessage(requestError),
      })
    } finally {
      setRemovingId(null)
    }
  }

  async function handleEmpty() {
    setIsEmptying(true)

    try {
      await emptyCart()
      toast.success('Your cart is empty.', {
        description: 'Every reservation has been released.',
      })
    } catch (requestError) {
      toast.error('We could not empty your cart.', {
        description: cartErrorMessage(requestError),
      })
    } finally {
      setIsEmptying(false)
    }
  }

  if (isLoading) {
    return <CartSkeleton />
  }

  if (error && cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 sm:px-6">
        <ErrorState
          title="We could not load your cart"
          description={cartErrorMessage(error)}
          onRetry={() => refresh().catch(() => {})}
        />
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-14 sm:px-6 lg:py-20">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
              Step 1 of 3
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Your Cart
            </h1>
            <p className="mx-auto mt-3 max-w-md leading-body text-muted">
              Review your reserved devices before checkout.
            </p>
          </div>

          <div className="mt-10">
            <EmptyCartState />
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              to={MARKETPLACE_ROUTES.shop}
              className="inline-flex items-center gap-2 text-sm font-bold text-primary-700 transition hover:text-primary-500"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Keep browsing phones
            </Link>
          </div>
        </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
            Step 1 of 3
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Your Cart
          </h1>
          <p className="mt-3 max-w-2xl leading-body text-muted">
            Review your reserved devices before checkout.
          </p>
        </header>

        {/* Price movements are surfaced once, above the items, so a buyer sees the
            consequence before the per-card detail rather than having to notice it. */}
        {priceChanges.increased.length > 0 && (
          <div
            className="mt-8 flex gap-3 rounded-card border border-amber-300 bg-amber-50 p-4 sm:p-5"
            role="status"
            data-testid="cart-price-warning"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-950">Price updated</p>
              <p className="mt-1 text-sm leading-relaxed text-amber-900">
                {priceChanges.increased.length === 1
                  ? 'One phone now costs more than it did when you added it. You will be charged the current price shown on its card.'
                  : `${priceChanges.increased.length} phones now cost more than they did when you added them. You will be charged the current prices shown on their cards.`}
              </p>
            </div>
          </div>
        )}

        {/* One column on mobile so the summary naturally follows the items, two on
            desktop with the summary sticky in the right cell. The summary is
            rendered once rather than per breakpoint — two copies of a price total
            would double every number in the DOM and drift apart on update. */}
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-10">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-muted" aria-live="polite">
                {cart.itemCount === 1
                  ? '1 device reserved for you'
                  : `${cart.itemCount} devices reserved for you`}
              </p>

              {cart.itemCount > 1 && (
                <button
                  type="button"
                  onClick={handleEmpty}
                  disabled={isEmptying || isMutating}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-muted transition hover:bg-red-50 hover:text-danger disabled:opacity-60"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Empty cart
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4">
              {cart.items.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  isRemoving={removingId === item.listing.id || isMutating}
                />
              ))}
            </div>

            <div className="mt-8">
              <Link
                to={MARKETPLACE_ROUTES.shop}
                className="inline-flex items-center gap-2 text-sm font-bold text-primary-700 transition hover:text-primary-500"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Continue shopping
              </Link>
            </div>
          </div>

          {/* Sticky on desktop only. On mobile a second sticky element would compete
              with the tab bar for the bottom edge. */}
          <div className="lg:sticky lg:top-24">
            <CartSummaryPanel
              subtotal={cart.subtotal}
              itemCount={cart.purchasableCount}
              blockedCount={blocked.length}
              expiredCount={expiredCount}
              onCheckout={() => navigate(MARKETPLACE_ROUTES.checkout)}
              isCheckoutDisabled={!canCheckout}
            >
              {blocked.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  className="mt-3"
                  onClick={() => {
                    const unavailable = cart.items.find(isItemUnavailable)
                    if (unavailable) {
                      handleRemove(unavailable)
                    }
                  }}
                >
                  Remove unavailable devices
                </Button>
              )}
            </CartSummaryPanel>

            <p className="mt-4 text-center text-xs leading-relaxed text-muted lg:text-left">
              Held devices are released automatically when their timer runs out.
            </p>
          </div>
        </div>
    </div>
  )
}
