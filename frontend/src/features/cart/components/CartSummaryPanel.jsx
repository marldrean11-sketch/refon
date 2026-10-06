import { Lock, ShieldCheck, Truck } from 'lucide-react'
import { Button, ButtonLink } from '../../../components/ui/Button.jsx'
import { PriceInline } from '../../../components/ui/PriceDisplay.jsx'
import { MARKETPLACE_ROUTES } from '../../../lib/routes.js'

/**
 * Price summary and the primary checkout action.
 *
 * The subtotal comes from the backend and is the sum of the *live* listing prices,
 * so a price change is already reflected rather than being decided here. This
 * component only adds the delivery fee and adds them up for display; the server
 * computes the same figures and is what a quote is checked against.
 *
 * A blocked cart cannot be checked out. Rather than showing an enabled button that
 * fails, the panel explains what is blocking it and where to fix it — the safer
 * behaviour, because a buyer should never reach a form for a cart that cannot
 * become an order.
 */
export function CartSummaryPanel({
  subtotal,
  deliveryFee = null,
  deliveryLabel = null,
  itemCount = 0,
  blockedCount = 0,
  expiredCount = 0,
  onCheckout,
  isCheckoutDisabled = false,
  checkoutHref,
  checkoutLabel = 'Proceed to Checkout',
  className = '',
  children,
}) {
  const hasDelivery = Number(deliveryFee) >= 0 && deliveryFee !== null
  const total = hasDelivery ? Number(subtotal) + Number(deliveryFee) : Number(subtotal)

  return (
    <div className={`rounded-card-lg border border-line bg-white shadow-card ${className}`}>
      <div className="border-b border-line p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold tracking-tight text-ink">Order Summary</h2>
        <p className="mt-1 text-xs text-muted">
          {itemCount === 1 ? '1 device reserved' : `${itemCount} devices reserved`}
        </p>
      </div>

      <dl className="space-y-3 p-5 text-sm sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">Subtotal</dt>
          <dd>
            <PriceInline value={subtotal} />
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">
            {deliveryLabel ? `Delivery · ${deliveryLabel}` : 'Delivery'}
          </dt>
          <dd className="flex items-baseline gap-2">
            {hasDelivery ? (
              <>
                {Number(deliveryFee) === 0 && (
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-700">
                    Free
                  </span>
                )}
                <PriceInline value={deliveryFee} />
              </>
            ) : (
              /* The cart page has not asked for a delivery method yet, so the fee is
                 genuinely unknown rather than zero. Saying so beats printing a
                 placeholder dash next to a peso total. */
              <span className="text-sm font-semibold text-muted">At checkout</span>
            )}
          </dd>
        </div>

        {/* A total is only stated once the delivery fee is known. Adding a fee later and
            showing a larger "Total" would be the same surprise this project refuses
            everywhere else. */}
        {hasDelivery && (
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
            <dt className="font-display text-base font-bold text-ink">Total</dt>
            <dd>
              <PriceInline value={total} className="text-2xl" />
            </dd>
          </div>
        )}
      </dl>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        {blockedCount > 0 && (
          <div
            className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4"
            role="status"
            data-testid="checkout-blocked"
          >
            <p className="text-sm font-bold text-amber-950">
              {expiredCount > 0 && blockedCount > expiredCount
                ? 'Resolve your cart before checking out'
                : 'Your reservation expired'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900">
              {expiredCount > 0
                ? `${expiredCount === 1 ? 'One device is' : `${expiredCount} devices are`} no longer reserved for you. Remove ${expiredCount === 1 ? 'it' : 'them'} to continue.`
                : `${blockedCount === 1 ? 'One device is' : `${blockedCount} devices are`} no longer available. Remove ${blockedCount === 1 ? 'it' : 'them'} to continue.`}
            </p>
          </div>
        )}

        {/* The checkout action stays on screen even when it is blocked. Hiding it
            would leave a shopper hunting for where the next step was; showing it
            disabled, next to the reason, says both "this is the button" and "not
            yet". */}
        {onCheckout ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onCheckout}
            disabled={isCheckoutDisabled || blockedCount > 0}
            loading={isCheckoutDisabled && blockedCount === 0}
          >
            {checkoutLabel}
          </Button>
        ) : (
          <ButtonLink
            to={checkoutHref ?? MARKETPLACE_ROUTES.checkout}
            variant="primary"
            size="lg"
            fullWidth
            aria-disabled={blockedCount > 0 ? 'true' : undefined}
            onClick={blockedCount > 0 ? (event) => event.preventDefault() : undefined}
          >
            {checkoutLabel}
          </ButtonLink>
        )}

        {children}
      </div>

      {/* Reassurance that matches what the marketplace already claims elsewhere, so
          the checkout does not promise more than the rest of the site does. */}
      <ul className="space-y-2.5 border-t border-line bg-canvas px-5 py-4 text-xs text-muted sm:px-6">
        <li className="flex items-start gap-2">
          <Truck className="mt-0.5 size-3.5 shrink-0 text-primary-600" aria-hidden="true" />
          Tracked nationwide delivery, with fees shown before you order.
        </li>
        <li className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent-600" aria-hidden="true" />
          Condition grade and warranty stated on every listing.
        </li>
        <li className="flex items-start gap-2">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-primary-600" aria-hidden="true" />
          Your phone is held for a limited time once it is in your cart.
        </li>
      </ul>
    </div>
  )
}
