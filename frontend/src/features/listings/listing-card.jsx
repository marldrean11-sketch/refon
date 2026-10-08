import { BadgeCheck, HardDrive, MemoryStick, Store } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { isImageReference } from './image-reference.js'
import { PhoneArtwork } from './PhoneArtwork.jsx'
import { FavoriteButton } from '../favorites/FavoriteButton.jsx'
import { standardTransition, usePrefersReducedMotion } from '../../lib/motion.ts'
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
 * The listing card.
 *
 * This is the object the whole marketplace is made of, so its architecture is
 * argued rather than inherited. A product card has two jobs that pull against
 * each other: show the device as an object, and show enough measurement to decide
 * without opening it. The old card solved that with two rounded boxes and a
 * badge row, which made twelve cards look like twelve identical tiles.
 *
 * What it does now:
 *
 *   1. A portrait image plate that owns the top two thirds of the card. Devices
 *      are tall; a 4/3 landscape crop of a phone is mostly empty background, so a
 *      4/5 plate lets the device fill the frame and makes the grid read as a
 *      shelf of products rather than a wall of thumbnails.
 *   2. A measurement strip — three cells divided by hairlines, the way a spec
 *      sheet divides columns. Grade, battery, warranty are the three facts a
 *      buyer asks for in that order, and giving them equal cells states that they
 *      carry equal weight instead of decorating them as rounded chips.
 *   3. Price as the loudest element on the card, which is what it is on a
 *      marketplace.
 *   4. Seller and trust state in a single quiet footer line, in words.
 *
 * Scan order is therefore image → model → price → measurements → seller, and
 * everything that is merely available (RAM, listing year when the model implies
 * it, seller rating) is secondary by construction.
 *
 * A discount badge is never invented: `PriceDisplay` renders one only when the
 * listing carries a reference price above the selling price.
 */
export function ListingCard({ listing, preview = false, hideSaveButton = false }) {
  const reduceMotion = usePrefersReducedMotion()
  const mainPhoto = listing.mainPhoto ?? listing.photos?.[0]
  const grade = gradeFor(listing)
  const listingRating = Number(listing.ratingAverage ?? 0)
  const sellerRating = Number(listing.seller?.ratingAverage ?? 0)
  const sellerRatingCount = Number(listing.seller?.ratingCount ?? 0)
  const hasWarranty = Number(listing.warrantyMonths ?? 0) > 0

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      whileHover={reduceMotion || preview ? undefined : { y: -3 }}
      whileTap={reduceMotion || preview ? undefined : { scale: 0.995 }}
      transition={standardTransition}
      className="group relative flex w-full flex-col overflow-hidden rounded-card border border-line bg-surface transition duration-200 hover:border-primary-400 hover:shadow-card-hover"
    >
      {!preview && (
        <Link
          to={productPath(listing)}
          className="absolute inset-0 z-30 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-950 focus-visible:ring-inset"
          aria-label={`View ${listing.year} ${listing.brand} ${listing.model}`}
        >
          <span className="sr-only">View listing details</span>
        </Link>
      )}

      {/* 1. The device. */}
      <div className="relative overflow-hidden border-b border-line bg-surface-2">
        {isImageReference(mainPhoto) ? (
          <img
            src={mainPhoto}
            alt={`${listing.brand} ${listing.model} in ${listing.color ?? 'as pictured'}`}
            loading="lazy"
            decoding="async"
            width={800}
            height={1000}
            className="aspect-[4/5] w-full object-cover transition duration-500 ease-smooth motion-reduce:transform-none group-hover:scale-[1.04]"
          />
        ) : (
          <PhoneArtwork
            brand={listing.brand}
            model={listing.model}
            color={listing.color}
            // The artwork's own "Illustration" chip sits in the same corner as the
            // condition badge and the two collided. On a card the grade already
            // says this is a listing, so the chip is redundant here.
            showLabel={false}
            className="aspect-[4/5] w-full"
          />
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <ConditionBadge grade={grade} />
        </div>

        {listing.isFeatured && (
          <span className="absolute bottom-0 left-0 bg-primary-950 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
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

      {/* 2. Identity and price. */}
      <div className="flex flex-1 flex-col p-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
          {listing.brand}
        </p>
        <h3 className="mt-1.5 truncate font-display text-lg font-bold leading-tight tracking-tight text-ink">
          {listing.model}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
          <span className="tabular-nums">{listing.year}</span>
          <span className="inline-flex items-center gap-1">
            <HardDrive className="size-3" aria-hidden="true" />
            {listing.storage}
          </span>
          {listing.ram && (
            <span className="inline-flex items-center gap-1">
              <MemoryStick className="size-3" aria-hidden="true" />
              {listing.ram}
            </span>
          )}
        </div>

        <div className="mt-3.5">
          <PriceDisplay
            price={listing.price}
            originalPrice={listing.originalPrice}
            size="sm"
          />
        </div>

        {/* 3. The measurement strip.

            Two cells, not three. Grade already owns a chip on the image, and
            repeating it here in a narrower column truncated the label to
            nonsense on a four-across grid. Battery and coverage are the two
            facts a card can add that the image does not already say. */}
        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-control border border-line bg-line">
          <div className="bg-surface px-2.5 py-2">
            <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-subtle">
              Battery
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-ink">
              {listing.batteryPercent}%
            </dd>
          </div>
          <div className="bg-surface px-2.5 py-2">
            <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-subtle">
              Cover
            </dt>
            <dd className="mt-1 text-[13px] font-semibold text-ink">
              {hasWarranty
                ? Number(listing.warrantyMonths) >= 12
                  ? '1 year'
                  : `${Math.round(Number(listing.warrantyMonths))} months`
                : 'Sold as-is'}
            </dd>
          </div>
        </dl>

        {/* Rating and warranty live in one quiet row rather than competing chips. */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <WarrantyBadge months={listing.warrantyMonths} />
          {!hasWarranty && (
            <span className="rounded-sm bg-surface-2 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted ring-1 ring-inset ring-line">
              Sold as-is
            </span>
          )}
          {listingRating > 0 && (
            <RatingStars value={listingRating} count={listing.ratingCount} size="sm" />
          )}
        </div>

        {/* 4. Who is selling it, in words. */}
        <div className="mt-auto border-t border-line pt-3">
          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <span
              className="inline-flex min-w-0 items-center gap-1.5"
              title={listing.sellerName}
            >
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
            ) : null}
          </div>

          {/* Seller legitimacy is the objection this marketplace exists to
              answer, so it is stated in words and not left to an icon's
              accessible name. */}
          {listing.seller?.verificationStatus === 'APPROVED' && (
            <span className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-700">
              <BadgeCheck className="size-3.5 shrink-0" aria-hidden="true" />
              Verified seller
            </span>
          )}
        </div>
      </div>
    </motion.article>
  )
}