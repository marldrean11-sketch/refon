/**
 * A compact listing card for the homepage.
 *
 * Deliberately **not** the shop's `ListingCard`. Phase 4 finishes the real product
 * card for the catalogue and shop grid; this one exists so the homepage has
 * something honest to show now, and it is shaped to be replaced rather than
 * extended: same data source, same route helper, same badges, no save button and
 * no gallery.
 *
 * Typographic, for the same reason as the hero plate: the catalog carries no
 * photographs. The card's job here is to be scannable — grade, battery, price,
 * saving — and a card with a large empty media slot is neither scannable nor
 * honest about why the slot is empty.
 */
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BatteryFull } from 'lucide-react'
import { ConditionBadge } from '../../components/ui/ConditionBadge.jsx'
import { PriceDisplay } from '../../components/ui/PriceDisplay.jsx'
import { productPath } from '../../lib/routes.js'
import { usePrefersReducedMotion } from '../../lib/motion.ts'

export function HomeListingCard({ listing }) {
  const reducedMotion = usePrefersReducedMotion()

  const hasDiscount =
    Number(listing.originalPrice) > Number(listing.price) &&
    Number(listing.discountPercent) > 0

  const battery = Number(listing.batteryPercent)

  return (
    <motion.article variants={reducedMotion ? undefined : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="h-full">
      <Link
        to={productPath(listing)}
        data-testid="arrivals-card"
        data-listing={listing.id}
        className="rf-spotlight group flex h-full flex-col rounded-card border border-line bg-card p-5 shadow-card transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:border-accent/40 hover:shadow-card-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              {listing.brand}
            </p>
            <h3 className="mt-1.5 text-[17px] font-bold leading-tight tracking-[-0.01em] text-ink">
              {listing.model}
            </h3>
            <p className="mt-1 text-[13px] text-muted">
              {[listing.storage, listing.color].filter(Boolean).join(' · ')}
            </p>
          </div>

          <ConditionBadge grade={listing.grade} size="sm" />
        </div>

        {Number.isFinite(battery) ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-muted">
            <BatteryFull
              className="size-4 shrink-0 text-accent-strong"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span className="tabular-nums font-medium text-ink">{battery}%</span>
            battery health
          </p>
        ) : null}

        <div className="mt-auto pt-5">
          <PriceDisplay
            price={listing.price}
            originalPrice={hasDiscount ? listing.originalPrice : null}
            discountPercent={hasDiscount ? listing.discountPercent : null}
          />
        </div>
      </Link>
    </motion.article>
  )
}

/**
 * A skeleton in the card's exact shape.
 *
 * Reserving the final card's dimensions matters more than it looks: the New
 * Arrivals grid cross-fades between tabs, and a grid that changes height when the
 * skeleton resolves moves everything below it. Same box, then filled.
 *
 * The shimmer is a highlight that **slides**, not a `background-position`
 * animation. Animating background-position repaints the element every frame, which
 * is the thing the transform-only rule exists to avoid, and sliding a gradient is
 * visually indistinguishable anyway.
 */
export function HomeListingCardSkeleton({ reduced = false }) {
  const shimmer = (className) => (
    <span className={`relative block overflow-hidden rounded-full bg-surface-2 ${className}`}>
      <Shimmer reduced={reduced} />
    </span>
  )

  return (
    <div
      data-testid="arrivals-skeleton"
      aria-hidden="true"
      className="flex h-full flex-col rounded-card border border-line bg-card p-5"
    >
      {shimmer('h-2.5 w-12')}
      {shimmer('mt-3 h-4 w-32')}
      {shimmer('mt-2.5 h-3 w-24')}

      <div className="mt-5 flex items-center gap-2">
        {shimmer('size-4 rounded-full')}
        {shimmer('h-3 w-16')}
      </div>

      <div className="mt-auto pt-5">{shimmer('h-6 w-28')}</div>
    </div>
  )
}

/** One highlight band, translated across whatever contains it. */
function Shimmer({ reduced }) {
  return (
    <motion.span
      aria-hidden="true"
      animate={reduced ? undefined : { x: ['-120%', '220%'] }}
      transition={
        reduced ? undefined : { duration: 1.6, repeat: Infinity, ease: 'linear', repeatDelay: 0.35 }
      }
      className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-12deg] bg-white/70"
    />
  )
}
