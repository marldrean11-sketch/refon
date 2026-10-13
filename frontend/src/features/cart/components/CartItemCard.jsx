import { Store, Trash2, TriangleAlert, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PriceDisplay, PriceInline } from '../../../components/ui/PriceDisplay.jsx'
import { ConditionBadge } from '../../../components/ui/ConditionBadge.jsx'
import { BatteryHealth } from '../../../components/ui/BatteryHealth.jsx'
import { WarrantyBadge } from '../../../components/ui/WarrantyBadge.jsx'
import { PhoneArtwork } from '../../listings/PhoneArtwork.jsx'
import { ListingPhoto } from '../../listings/ListingPhoto.jsx'
import { productPath } from '../../../lib/routes.js'
import {
  deviceModel,
  deviceName,
  deviceVariant,
  isItemUnavailable,
  isReservationExpired,
} from '../cart-state.js'
import { PriceChangeNotice } from './PriceChangeNotice.jsx'
import { ReservationCountdown } from './ReservationCountdown.jsx'

/**
 * One reserved device in the cart.
 *
 * Scan order answers the questions a buyer has in the order they ask them: which
 * phone, what condition, does the battery hold up, am I covered, who is selling it,
 * what does it cost, and how long have I got.
 *
 * Two states get deliberate visual treatment rather than a footnote:
 *
 *  - **Unavailable** — the listing was taken down, rejected, or sold. The line stays
 *    visible with a stated reason and is excluded from the total, because deleting it
 *    silently would leave a shopper wondering where a phone went.
 *  - **Reservation expired** — the hold lapsed. The phone may be free again or gone,
 *    and the buyer has to act either way, so checkout is blocked with an explanation
 *    rather than a countdown that quietly runs past zero.
 *
 * No quantity control appears anywhere: a ReFon listing is one specific physical
 * device, so there is nothing to step through.
 */
export function CartItemCard({ item, onRemove, isRemoving = false }) {
  const listing = item.listing
  const mainPhoto = listing?.mainPhoto ?? listing?.photos?.[0]

  const unavailable = isItemUnavailable(item)
  const expired = isReservationExpired(item)
  const blocked = unavailable || expired

  const variant = deviceVariant(listing)
  const hasWarranty = Number(listing?.warrantyMonths ?? 0) > 0

  return (
    <article
      className={`overflow-hidden rounded-card-lg border bg-white transition duration-300 ${
        blocked
          ? 'border-amber-200 bg-amber-50/20'
          : 'border-line shadow-card hover:border-primary-100 hover:shadow-card-hover'
      }`}
      data-testid="cart-item"
      data-listing-id={listing?.id}
      data-availability={item.availability}
      aria-labelledby={`cart-item-${item.id}-name`}
    >
      <div className="flex flex-col gap-5 p-4 sm:flex-row sm:gap-6 sm:p-5">
        {/* Device image. Decorative here: the name beside it is the accessible label,
            so an illustration is not announced as a second copy of the product name. */}
        <Link
          to={productPath(listing)}
          tabIndex={-1}
          aria-hidden="true"
          className={`relative block w-full shrink-0 overflow-hidden rounded-2xl sm:w-40 ${
            unavailable ? 'opacity-45 grayscale' : ''
          }`}
        >
          <ListingPhoto
            src={mainPhoto}
            alt=""
            loading="lazy"
            decoding="async"
            width={640}
            height={480}
            className="aspect-[4/3] w-full object-cover"
            fallback={
            <PhoneArtwork
              brand={listing?.brand}
              model={listing?.model}
              color={listing?.color}
              batteryPercent={listing?.batteryPercent}
              className="aspect-[4/3] w-full"
              showLabel={false}
              showColor={false}
            />
            }
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* The price stacks below the name on small screens. Side by side, a peso
                figure plus a strikethrough and a discount badge leaves the title a
                few characters wide, and the model name breaks across three lines. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-600">
                {listing?.brand}
              </p>
              <h3
                id={`cart-item-${item.id}-name`}
                className="mt-1 break-words font-display text-lg font-bold tracking-tight text-ink"
              >
                <Link
                  to={productPath(listing)}
                  className="transition hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  {deviceModel(listing)}
                </Link>
              </h3>
              {variant && <p className="mt-1 text-sm text-muted">{variant}</p>}
            </div>

            <div className="sm:shrink-0 sm:text-right">
              <PriceDisplay
                price={item.currentPrice}
                originalPrice={listing?.originalPrice}
                discountPercent={listing?.discountPercent}
                size="sm"
                showSavings={false}
                className="sm:[&_p]:text-right"
              />
              <p className="mt-1 text-[11px] text-muted">1 device</p>
            </div>
          </div>

          {/* Trust facts, in the order a buyer asks them. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ConditionBadge grade={listing?.grade} size="sm" />
            <BatteryHealth percent={listing?.batteryPercent} size="sm" showLabel={false} />
            <WarrantyBadge months={listing?.warrantyMonths} size="sm" />
          </div>

          {listing?.seller?.businessName && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
              <Store className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Sold by {listing.seller.businessName}</span>
              {listing.seller.verificationStatus === 'APPROVED' && (
                <span className="font-semibold text-accent-700">· Verified</span>
              )}
            </p>
          )}

          {blocked ? (
            <div
              className="mt-4 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5"
              role="status"
              data-testid="cart-item-unavailable"
              data-unavailable-reason={unavailable ? 'UNAVAILABLE' : 'RESERVATION_EXPIRED'}
            >
              {unavailable ? (
                <TriangleAlert
                  className="mt-0.5 size-4 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
              ) : (
                <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-950">
                  {unavailable ? 'No longer available' : 'Reservation expired'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900">
                  {unavailable
                    ? 'This phone was taken down, sold, or removed by the seller. It is not included in your total.'
                    : 'This device is no longer reserved for you. It may have been claimed by another buyer, or it may be free again — remove it to continue with the rest of your cart.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <ReservationCountdown item={item} />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onRemove(item)}
              disabled={isRemoving}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-muted transition duration-200 hover:bg-red-50 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="cart-item-remove"
              aria-label={`Remove ${deviceName(listing)} from cart`}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Remove
            </button>

            {!blocked && (
              <p className="text-xs text-muted">
                Line total{' '}
                <PriceInline value={item.currentPrice} className="text-sm" />
              </p>
            )}
          </div>
        </div>
      </div>

      {!blocked && item.priceChanged && (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <PriceChangeNotice item={item} />
        </div>
      )}
    </article>
  )
}
