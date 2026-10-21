import { Link } from 'react-router-dom'
import { BadgeCheck, MapPin, Package, Truck, Wallet } from 'lucide-react'
import { PriceDisplay, PriceInline } from '../../../components/ui/PriceDisplay.jsx'
import { ConditionBadge } from '../../../components/ui/ConditionBadge.jsx'
import { BatteryHealth } from '../../../components/ui/BatteryHealth.jsx'
import { WarrantyBadge } from '../../../components/ui/WarrantyBadge.jsx'
import { DeviceThumb } from '../../cart/components/DeviceThumb.jsx'
import { productPath } from '../../../lib/routes.js'
import { deviceName, deviceVariant } from '../../cart/cart-state.js'
import { formatPeso } from '../../../lib/format.js'

/**
 * Read-back of everything the buyer chose, immediately before submitting.
 *
 * The point is to catch a mistake while it is still cheap to fix. Every section
 * names what it shows, so a reviewer is comparing their own answers rather than
 * scanning a wall of formatted text, and every fact they might need to change links
 * back to the field that owns it.
 *
 * Nothing here computes money. The subtotal is the backend's subtotal, the fee is the
 * backend's fee, and the total is their sum — the same figures the server will use.
 */
export function OrderReview({
  items,
  contact,
  delivery,
  payment,
  subtotal,
  deliveryFee,
  freeDeliveryApplied = false,
  deliveryFeeBeforeDiscount = null,
  headingId = 'order-review-heading',
}) {
  const total = Number(subtotal) + Number(deliveryFee ?? 0)

  return (
    <section
      className="rounded-card-lg border border-line bg-white shadow-card"
      aria-labelledby={headingId}
      data-testid="order-review"
    >
      <header className="border-b border-line px-5 py-5 sm:px-6">
        <h2 id={headingId} className="font-display text-lg font-bold tracking-tight text-ink">
          Review your order
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Check these details before you confirm. You can still go back and change them.
        </p>
      </header>

      {/* Devices */}
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
          <Package className="size-4 text-primary-600" aria-hidden="true" />
          {items.length === 1 ? 'Your device' : `Your ${items.length} devices`}
        </h3>

        <ul className="mt-4 space-y-4">
          {items.map((item) => {
            const listing = item.listing
            const variant = deviceVariant(listing)

            return (
              <li key={item.cartItemId ?? item.id} className="flex gap-4">
                <DeviceThumb listing={listing} />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">
                    <Link
                      to={productPath(listing)}
                      className="transition hover:text-primary-700"
                    >
                      {deviceName(listing)}
                    </Link>
                  </p>
                  {variant && <p className="mt-0.5 text-xs text-muted">{variant}</p>}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ConditionBadge grade={listing?.grade} size="sm" />
                    <BatteryHealth
                      percent={listing?.batteryPercent}
                      size="sm"
                      showLabel={false}
                    />
                    <WarrantyBadge months={listing?.warrantyMonths} size="sm" />
                  </div>

                  {listing?.seller?.businessName && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      {listing.seller.businessName}
                      {listing.seller.verificationStatus === 'APPROVED' && (
                        <BadgeCheck
                          className="size-3.5 text-accent-600"
                          aria-label="Verified seller"
                        />
                      )}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <PriceDisplay
                    price={listing?.price}
                    originalPrice={listing?.originalPrice}
                    discountPercent={listing?.discountPercent}
                    size="sm"
                    showSavings={false}
                    className="[&_p]:text-right"
                  />
                  <p className="mt-1 text-[11px] text-muted">1 device</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Contact, address, delivery, payment */}
      <div className="grid gap-6 border-b border-line px-5 py-5 sm:grid-cols-2 sm:px-6">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            <MapPin className="size-4 text-primary-600" aria-hidden="true" />
            Delivery address
          </h3>
          <address className="mt-2 text-xs not-italic leading-relaxed text-muted">
            <span className="block font-semibold text-ink">{contact?.fullName}</span>
            <span className="block">{contact?.street}</span>
            <span className="block">
              {contact?.barangay}, {contact?.city}
            </span>
            <span className="block">
              {contact?.province}, {contact?.region}
            </span>
            <span className="block">{contact?.postalCode}</span>
            <span className="mt-2 block">{contact?.mobile}</span>
            <span className="block">{contact?.email}</span>
            {contact?.deliveryNotes && (
              <span className="mt-2 block text-muted">
                <span className="font-semibold">Notes:</span> {contact.deliveryNotes}
              </span>
            )}
          </address>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Truck className="size-4 text-primary-600" aria-hidden="true" />
              Delivery
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              <span className="block font-semibold text-ink">{delivery?.label}</span>
              <span className="block">
                {delivery?.minDays === delivery?.maxDays
                  ? `${delivery?.minDays === 1 ? 'Next business day' : `${delivery?.minDays} business days`}`
                  : `${delivery?.minDays}–${delivery?.maxDays} business days`}
                {' · '}
                {delivery?.zoneLabel}
              </span>
            </p>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Wallet className="size-4 text-primary-600" aria-hidden="true" />
              Payment
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              <span className="block font-semibold text-ink">{payment?.label}</span>
              {payment?.demo && (
                <span className="mt-1 block rounded-pill bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-900">
                  Pay seller directly
                </span>
              )}
              {payment?.instructions && (
                <span className="mt-1.5 block">{payment.instructions}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Money */}
      <dl className="space-y-3 px-5 py-5 text-sm sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">Subtotal</dt>
          <dd>
            <PriceInline value={subtotal} />
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">Delivery fee</dt>
          <dd className="flex items-baseline gap-2">
            {freeDeliveryApplied && deliveryFeeBeforeDiscount !== null && (
              <span className="text-xs font-medium text-muted line-through">
                {formatPeso(deliveryFeeBeforeDiscount)}
              </span>
            )}
            {freeDeliveryApplied && (
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-700">
                Free
              </span>
            )}
            <PriceInline value={freeDeliveryApplied ? 0 : deliveryFee} />
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
          <dt className="font-display text-base font-bold text-ink">Total</dt>
          <dd data-testid="order-total">
            <PriceInline value={total} className="text-2xl" />
          </dd>
        </div>
      </dl>
    </section>
  )
}
