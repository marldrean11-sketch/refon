import { BadgeCheck, HardDrive, MemoryStick, Store } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { isImageReference } from './image-reference.js'
import { PhoneArtwork } from './PhoneArtwork.jsx'
import { FavoriteButton } from '../favorites/FavoriteButton.jsx'
import { standardTransition } from '../../lib/motion.js'
import { BatteryHealth } from '../../components/ui/BatteryHealth.jsx'
import { ConditionBadge } from '../../components/ui/ConditionBadge.jsx'
import { PriceDisplay } from '../../components/ui/PriceDisplay.jsx'
import { RatingStars } from '../../components/ui/RatingStars.jsx'
import { WarrantyBadge } from '../../components/ui/WarrantyBadge.jsx'
import { productPath } from '../../lib/routes.js'
import { gradeFromLegacyCondition } from '../../lib/listing-taxonomy.js'

export { PhoneArtwork }

export function gradeFor(listing) {
  return listing?.grade ?? gradeFromLegacyCondition(listing?.condition)
}

/**
 * Product card.
 *
 * Scan order is deliberate and fixed: model, price, grade, battery, warranty.
 * Those five answer "is this the phone I want, is it affordable, is it actually
 * in the condition claimed, will the battery last, and am I covered" — in that
 * order, because that is the order a buyer actually asks them.
 *
 * Everything else is deliberately kept out or secondary: a real photo outranks
 * the illustration, RAM is a small line rather than a card, and seller rating
 * appears only when it exists. A discount badge is never invented; `PriceDisplay`
 * renders one only when the listing carries a reference price above the selling
 * price.
 */
export function ListingCard({ listing, preview = false, hideSaveButton = false }) {
  const reduceMotion = useReducedMotion()
  const mainPhoto = listing.mainPhoto ?? listing.photos?.[0]
  const grade = gradeFor(listing)
  const listingRating = Number(listing.ratingAverage ?? 0)
  const sellerRating = Number(listing.seller?.ratingAverage ?? 0)
  const sellerRatingCount = Number(listing.seller?.ratingCount ?? 0)
  const hasWarranty = Number(listing.warrantyMonths ?? 0) > 0

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      whileHover={reduceMotion || preview ? undefined : { y: -6 }}
      whileTap={reduceMotion || preview ? undefined : { scale: 0.99 }}
      transition={standardTransition}
      className="group relative flex w-full flex-col overflow-hidden rounded-card border border-line bg-white shadow-card transition duration-300 hover:border-primary-100 hover:shadow-card-hover"
    >
      {!preview && (
        <Link
          to={productPath(listing)}
          className="absolute inset-0 z-30 rounded-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-300 focus-visible:ring-inset"
          aria-label={`View ${listing.year} ${listing.brand} ${listing.model}`}
        >
          <span className="sr-only">View listing details</span>
        </Link>
      )}

      <div className="relative overflow-hidden">
        {isImageReference(mainPhoto) ? (
          <img
            src={mainPhoto}
            alt={`${listing.brand} ${listing.model} in ${listing.color ?? 'as pictured'}`}
            loading="lazy"
            decoding="async"
            width={800}
            height={600}
            className="aspect-[4/3] w-full object-cover transition duration-500 ease-smooth motion-reduce:transform-none group-hover:scale-[1.03]"
          />
        ) : (
          <PhoneArtwork
            brand={listing.brand}
            model={listing.model}
            color={listing.color}
          />
        )}

        <div className="absolute left-3 top-3">
          <ConditionBadge grade={grade} />
        </div>

        {listing.isFeatured && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-pill bg-primary-950/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur">
            Featured
          </span>
        )}

        {/* Owns the stacking context so it paints above the z-30 full-card link. */}
        {!preview && !hideSaveButton && (
          <div className="absolute right-3 top-3 z-40">
            <FavoriteButton listing={listing} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* 1. Model */}
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-600">
          {listing.brand}
        </p>
        <h3 className="mt-1 truncate font-display text-xl font-semibold tracking-tight text-ink">
          {listing.model}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{listing.year}</span>
          <span className="inline-flex items-center gap-1">
            <HardDrive className="size-3.5" aria-hidden="true" />
            {listing.storage}
          </span>
          {listing.ram && (
            <span className="inline-flex items-center gap-1">
              <MemoryStick className="size-3.5" aria-hidden="true" />
              {listing.ram}
            </span>
          )}
        </div>

        {/* 2. Price */}
        <div className="mt-4">
          <PriceDisplay
            price={listing.price}
            originalPrice={listing.originalPrice}
            size="sm"
          />
        </div>

        {/* 3. Grade, 4. Battery, 5. Warranty */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-canvas p-3">
            <BatteryHealth percent={listing.batteryPercent} size="sm" />
          </div>
          <div className="flex flex-col justify-between rounded-2xl bg-canvas p-3">
            <p className="text-xs font-semibold text-muted">Condition</p>
            <p className="mt-1.5 font-display text-base font-semibold text-ink">
              {listing.gradeLabel ?? grade}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <WarrantyBadge months={listing.warrantyMonths} />
          {!hasWarranty && (
            <span className="rounded-pill bg-canvas px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted ring-1 ring-inset ring-line">
              Sold as-is
            </span>
          )}
          {listingRating > 0 && (
            <RatingStars value={listingRating} count={listing.ratingCount} size="sm" />
          )}
        </div>

        <div className="mt-auto border-t border-line pt-4">
          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Store className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{listing.sellerName}</span>
            </span>
            {sellerRatingCount > 0 ? (
              <RatingStars
                value={sellerRating}
                count={sellerRatingCount}
                size="sm"
                showValue={false}
                className="shrink-0"
              />
            ) : (
              <span className="shrink-0 font-semibold text-primary-700">Tested</span>
            )}
          </div>

          {/* Seller legitimacy is the objection this marketplace exists to
              answer, so it is stated in words and not left to an icon's
              accessible name. A badge costs one short line. */}
          {listing.seller?.verificationStatus === 'APPROVED' && (
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-pill bg-accent-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-800 ring-1 ring-inset ring-accent-200">
              <BadgeCheck className="size-3 shrink-0" aria-hidden="true" />
              Verified seller
            </span>
          )}
        </div>
      </div>
    </motion.article>
  )
}
