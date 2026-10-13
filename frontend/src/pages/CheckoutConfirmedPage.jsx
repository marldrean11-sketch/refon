import { Link, Navigate, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  CircleCheckBig,
  Info,
  Mail,
  MapPin,
  Phone,
  Truck,
  Wallet,
} from 'lucide-react'
import { ButtonLink } from '../components/ui/Button.jsx'
import { PriceInline } from '../components/ui/PriceDisplay.jsx'
import { ConditionBadge } from '../components/ui/ConditionBadge.jsx'
import { BatteryHealth } from '../components/ui/BatteryHealth.jsx'
import { deviceName, deviceVariant } from '../features/cart/cart-state.js'
import { DeviceThumb } from '../features/cart/components/DeviceThumb.jsx'
import { DASHBOARD_ROUTES, MARKETPLACE_ROUTES, orderPath } from '../lib/routes.js'

/** Shown once the order exists: the order numbers, and what happens next. */
function OrderPlacedNotice({ orders, payment }) {
  return (
    <div
      className="rounded-card-lg border border-accent/40 bg-accent-tint p-5 sm:p-6"
      role="status"
      data-testid="order-placed-notice"
    >
      <p className="text-sm font-bold text-ink">
        {orders.length === 1 ? 'Your order was placed' : `${orders.length} orders were placed`}
      </p>
      <ul className="mt-2 space-y-1">
        {orders.map((order) => (
          <li key={order.id} className="text-sm text-ink">
            <Link to={orderPath(order.orderNumber)} className="font-mono font-semibold text-accent underline underline-offset-2">
              {order.orderNumber}
            </Link>
            {order.seller?.businessName && (
              <span className="text-muted"> · from {order.seller.businessName}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-ink">
        The seller has been notified and will confirm your order. You can follow it, or
        cancel it until the seller confirms, from My Orders.
        {payment?.instructions ? ` ${payment.instructions}` : ''}
      </p>
    </div>
  )
}

/**
 * Post-checkout summary.
 *
 * This build has no order domain, so this screen does one job honestly: it shows
 * exactly what the buyer chose, priced by the server, and states plainly that no
 * order was placed and no payment was taken.
 *
 * That statement is not a placeholder apology. A screen implying a purchase had
 * happened — an order number, a "we'll email your receipt", a delivery date — would
 * be a claim the system cannot support, and a shopper who refreshes would find no
 * order. So the boundary is visible: a quote reference, the real figures, and an
 * explicit statement of what has not happened.
 *
 * Phase 7 replaces the notice with an order number and replaces this route's data
 * with a real order. The body below it — devices, address, delivery, payment, price
 * — is the same shape an order confirmation needs and does not change.
 */

/** States the exact boundary of this build. */
function DemoBoundaryNotice({ payment, reference }) {
  return (
    <div
      className="rounded-card-lg border border-line-2 bg-panel p-5 sm:p-6"
      role="status"
      data-testid="checkout-boundary-notice"
    >
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">
            No order was placed and no payment was taken
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink">
            ReFon does not yet create orders or process payments. This page is a summary
            of what you entered, priced by ReFon at the total shown below.
            {payment?.demo
              ? ' The payment method you chose is a demo selection — no payment details were collected and none are needed.'
              : ''}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-ink">
            Your phones remain reserved while their timers run. Nothing has been charged and
            no order exists to cancel.
          </p>
          {reference && (
            <p className="mt-3 font-mono text-xs font-semibold text-ink">
              Quote reference: {reference}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function CheckoutConfirmedPage() {
  const location = useLocation()
  const state = location.state

  // Reached directly, with no quote in history state: send the shopper to the cart
  // rather than rendering an empty confirmation. `replace` keeps the dead URL out of
  // the history so Back does not bounce between the two.
  if (!state?.quote) {
    return <Navigate to={MARKETPLACE_ROUTES.cart} replace />
  }

  const { quote, orders } = state
  const placed = Array.isArray(orders) && orders.length > 0
  const total = Number(quote.quote.subtotal) + Number(quote.quote.deliveryFee ?? 0)

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent-50 text-accent-700">
          <CircleCheckBig className="size-8" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
          Step 3 of 3
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          {placed ? 'Order placed' : 'Your checkout summary'}
        </h1>
        <p className="mx-auto mt-3 max-w-xl leading-body text-muted">
          {placed
            ? 'Thank you! Here is what you ordered and where it is going.'
            : 'Here is everything you entered, with the total ReFon calculated.'}
        </p>
      </header>

      <div className="mt-10 space-y-5">
        {placed ? (
          <OrderPlacedNotice orders={orders} payment={quote.payment} />
        ) : (
          <DemoBoundaryNotice payment={quote.payment} reference={quote.quote.reference} />
        )}

        {/* Devices */}
        <section className="rounded-card-lg border border-line bg-white shadow-card">
          <div className="border-b border-line px-5 py-5 sm:px-6">
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">
              {quote.items.length === 1 ? 'Your device' : `Your ${quote.items.length} devices`}
            </h2>
          </div>

          <ul className="divide-y divide-line">
            {quote.items.map((item) => {
              const listing = item.listing
              const variant = deviceVariant(listing)

              return (
                <li key={item.cartItemId} className="flex gap-4 px-5 py-4 sm:px-6">
                  <DeviceThumb listing={listing} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-sm font-bold text-ink">{deviceName(listing)}</p>
                      <PriceInline value={item.lineTotal} />
                    </div>

                    {variant && <p className="mt-1 text-xs text-muted">{variant}</p>}

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <ConditionBadge grade={listing?.grade} size="sm" />
                      <BatteryHealth
                        percent={listing?.batteryPercent}
                        size="sm"
                        showLabel={false}
                      />
                    </div>

                    {listing?.seller?.businessName && (
                      <p className="mt-2 text-xs text-muted">
                        Sold by {listing.seller.businessName}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Details */}
        <section className="rounded-card-lg border border-line bg-white shadow-card">
          <div className="grid gap-6 px-5 py-5 sm:grid-cols-2 sm:px-6">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <MapPin className="size-4 text-primary-600" aria-hidden="true" />
                Delivery address
              </h2>
              <address className="mt-2 text-xs not-italic leading-relaxed text-muted">
                <span className="block font-semibold text-ink">{quote.contact.fullName}</span>
                <span className="block">{quote.contact.street}</span>
                <span className="block">
                  {quote.contact.barangay}, {quote.contact.city}
                </span>
                <span className="block">
                  {quote.contact.province}, {quote.contact.region}
                </span>
                <span className="block">{quote.contact.postalCode}</span>

                <span className="mt-2 flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                  {quote.contact.mobile}
                </span>
                <span className="mt-1 flex items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                  {quote.contact.email}
                </span>

                {quote.contact.deliveryNotes && (
                  <span className="mt-2 block">
                    <span className="font-semibold">Notes:</span>{' '}
                    {quote.contact.deliveryNotes}
                  </span>
                )}
              </address>
            </div>

            <div className="space-y-5">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Truck className="size-4 text-primary-600" aria-hidden="true" />
                  Delivery
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  <span className="block font-semibold text-ink">{quote.delivery.label}</span>
                  <span className="block">
                    {quote.delivery.minDays === quote.delivery.maxDays
                      ? `${quote.delivery.minDays === 1 ? 'Next business day' : `${quote.delivery.minDays} business days`}`
                      : `${quote.delivery.minDays}–${quote.delivery.maxDays} business days`}
                    {' · '}
                    {quote.delivery.zoneLabel}
                  </span>
                </p>
              </div>

              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Wallet className="size-4 text-primary-600" aria-hidden="true" />
                  Payment
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  <span className="block font-semibold text-ink">{quote.payment.label}</span>
                  {quote.payment.demo && (
                    <span className="mt-1.5 inline-block rounded-pill bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-900">
                      Demo payment method
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Money */}
        <section className="rounded-card-lg border border-line bg-white p-5 shadow-card sm:p-6">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">
            Price breakdown
          </h2>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">Subtotal</dt>
              <dd>
                <PriceInline value={quote.quote.subtotal} />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">Delivery fee</dt>
              <dd className="flex items-baseline gap-2">
                {quote.quote.freeDeliveryApplied && (
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-700">
                    Free
                  </span>
                )}
                <PriceInline value={quote.quote.deliveryFee} />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
              <dt className="font-display text-base font-bold text-ink">
                {placed ? 'Total to pay' : 'Total (no payment taken)'}
              </dt>
              <dd data-testid="confirmation-total">
                <PriceInline value={total} className="text-2xl" />
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        {placed ? (
          <ButtonLink to={DASHBOARD_ROUTES.orders} variant="secondary" size="md">
            View my orders
          </ButtonLink>
        ) : (
          <ButtonLink to={MARKETPLACE_ROUTES.cart} variant="secondary" size="md">
            Back to your cart
          </ButtonLink>
        )}
        <ButtonLink to={MARKETPLACE_ROUTES.shop} variant="primary" size="md">
          Continue shopping
          <ArrowRight className="size-4" aria-hidden="true" />
        </ButtonLink>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        Questions about a device?{' '}
        <Link
          to={MARKETPLACE_ROUTES.contact}
          className="font-bold text-primary-700 underline underline-offset-2"
        >
          Contact ReFon support
        </Link>
      </p>
    </div>
  )
}
