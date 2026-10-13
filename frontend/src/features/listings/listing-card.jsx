import { BadgeCheck, Store, Truck } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ListingPhoto } from './ListingPhoto.jsx'
import { PhoneArtwork } from './PhoneArtwork.jsx'
import { FavoriteButton } from '../favorites/FavoriteButton.jsx'
import { CompareToggle } from '../compare/CompareToggle.jsx'
import { standardTransition, usePrefersReducedMotion } from '../../lib/motion.ts'
import { ConditionBadge } from '../../components/ui/ConditionBadge.jsx'
import { PriceDisplay } from '../../components/ui/PriceDisplay.jsx'
import { FREE_DELIVERY_THRESHOLD } from '../../lib/delivery-policy.js'
import { productPath } from '../../lib/routes.js'
import { getConditionGrade, gradeFromLegacyCondition } from '../../lib/listing-taxonomy.js'

export { PhoneArtwork }

/**
 * "2021 · 128 GB · Midnight", skipping whatever the listing lacks. RAM is left to
 * the product page: on a four-across grid it pushed the colour out of the line.
 */
function variantLine(listing) {
  return [listing.year, listing.storage, listing.color]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Warranty in the shortest words that stay exact. 0 months is sold as-is, set
 * as "As-is" because "Sold as-is" truncated in a four-across cell.
 */
function coverLabel(months) {
  const value = Math.round(Number(months ?? 0))

  if (value <= 0) {
    return 'As-is'
  }

  return value === 12 ? '1 year' : `${value} mo`
}

function MeasurementCell({ label, children }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2 bg-surface px-2.5 py-2 sm:block">
      <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </dt>
      <dd className="truncate text-[13px] font-semibold text-ink sm:mt-1">{children}</dd>
    </div>
  )
}

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
 *   2. Price as the loudest element on the card, which is what it is on a
 *      marketplace, with free delivery stated under it only when the price
 *      clears the published threshold.
 *   3. A measurement strip — three cells divided by hairlines, the way a spec
 *      sheet divides columns: battery, coverage, and inspection checks. The
 *      grade is on the image, so it is not repeated, and each fact appears once.
 *   4. Seller and trust state in a quiet footer, in words.
 *
 * Scan order is therefore image → model → price → measurements → seller. Year,
 * storage and colour share one plain variant line under the model.
 *
 * A discount badge is never invented: `PriceDisplay` renders one only when the
 * listing carries a reference price above the selling price.
 */
export function ListingCard({ listing, preview = false, hideSaveButton = false }) {
  // A sold phone stays visible (a buyer's saved shelf keeps it) but can no
  // longer be acted on, so it is marked as sold and loses its controls.
  const sold = listing.status === 'SOLD'
  const reduceMotion = usePrefersReducedMotion()
  const mainPhoto = listing.mainPhoto ?? listing.photos?.[0]
  const grade = gradeFor(listing)
  const gradeStyle = getConditionGrade(grade)
  const qualifiesForFreeDelivery = Number(listing.price) >= FREE_DELIVERY_THRESHOLD

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      whileHover={reduceMotion || preview ? undefined : { y: -3 }}
      // Touch screens: a short press-in on tap, since there is no hover.
      whileTap={reduceMotion || preview ? undefined : { scale: 0.98 }}
      transition={standardTransition}
      className={`rf-spotlight group relative flex w-full flex-col overflow-hidden rounded-card border border-line bg-surface transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-card-hover ${gradeStyle.hoverBorder}`}
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

      {/* Grades B and C get a thin stripe in their colour, so they are spotted at a glance. */}
      {gradeStyle.stripe && (
        <span
          aria-hidden="true"
          data-grade-stripe={grade}
          className={`pointer-events-none absolute inset-x-0 top-0 z-20 h-1 ${gradeStyle.stripe}`}
        />
      )}

      {/* 1. The device. */}
      <div className="relative overflow-hidden border-b border-line bg-surface-2">
        <ListingPhoto
          src={mainPhoto}
          alt={`${listing.brand} ${listing.model} in ${listing.color ?? 'as pictured'}`}
          loading="lazy"
          decoding="async"
          width={800}
          height={1000}
          className="aspect-[4/5] w-full object-cover transition duration-500 ease-smooth motion-reduce:transform-none group-hover:scale-[1.04]"
          fallback={
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
          }
        />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <ConditionBadge grade={grade} />
        </div>

        {sold && (
          <div
            data-testid="listing-sold-notice"
            className="absolute inset-0 z-20 grid place-items-center bg-page/70 backdrop-grayscale"
          >
            <div className="flex flex-col items-center gap-1 rounded-control bg-page/90 px-4 py-3 text-center shadow-pop">
              <span className="font-display text-xl font-bold uppercase tracking-[0.12em] text-ink">
                Sold
              </span>
              <span className="text-xs text-muted">No longer available</span>
            </div>
          </div>
        )}

        {listing.isFeatured && (
          <span className="absolute bottom-0 left-0 bg-primary-950 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            Featured
          </span>
        )}

        {/* Owns the stacking context so it paints above the z-30 full-card link. */}
        {!preview && !hideSaveButton && !sold && (
          <div className="absolute right-3 top-3 z-40">
            <FavoriteButton listing={listing} />
          </div>
        )}
      </div>

      {/* 2. Identity and price. */}
      <div className="flex flex-1 flex-col p-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          {listing.brand}
        </p>
        <h3 className="mt-1.5 truncate font-display text-lg font-bold leading-tight tracking-tight text-ink">
          {listing.model}
        </h3>
        <p className="mt-1 truncate text-[13px] text-muted">{variantLine(listing)}</p>

        <div className="mt-3.5">
          <PriceDisplay
            price={listing.price}
            originalPrice={listing.originalPrice}
            size="sm"
          />
        </div>

        {qualifiesForFreeDelivery && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted">
            <Truck className="size-3.5 shrink-0" aria-hidden="true" />
            Free standard delivery
          </p>
        )}

        {/* 3. The measurement strip.

            Three cells, each a fact the image cannot show and each read from a
            field the listing carries. Grade already owns a chip on the image, so
            it is not repeated here. Coverage is stated once, in its cell; the
            warranty badge and "Sold as-is" chip that used to sit under the strip
            said the same thing a second and third time. */}
        <dl className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3 sm:rounded-control">
          <MeasurementCell label="Battery">
            <span className="tabular-nums">{listing.batteryPercent}%</span>
          </MeasurementCell>
          <MeasurementCell label="Cover">{coverLabel(listing.warrantyMonths)}</MeasurementCell>
          <MeasurementCell label="Checks">
            {listing.inspectionRecorded ? (
              <span className="tabular-nums">
                {listing.inspectionChecks.length}/{listing.inspectionTotal}
              </span>
            ) : (
              <span className="text-muted">Not recorded</span>
            )}
          </MeasurementCell>
        </dl>

        {/* 4. Who is selling it, in words. Seller legitimacy is the objection
            this marketplace exists to answer, so it is stated in words and not
            left to an icon's accessible name. Star ratings are left off the card
            until reviews come from delivered orders. */}
        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-3 text-xs text-muted">
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5" title={listing.sellerName}>
              <Store className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{listing.sellerName}</span>
            </span>
            {listing.seller?.verificationStatus === 'APPROVED' && (
              <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent-700">
                <BadgeCheck className="size-3.5 shrink-0" aria-hidden="true" />
                Verified seller
              </span>
            )}
            {!preview && !sold && <CompareToggle listing={listing} className="ml-auto -my-1" />}
          </div>
        </div>
      </div>
    </motion.article>
  )
}