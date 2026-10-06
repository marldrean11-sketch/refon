import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Section, SectionHeading } from '../../components/ui/Section.jsx'
import { ButtonLink } from '../../components/ui/Button.jsx'
import { ListingCard } from '../listings/listing-card.jsx'
import { ProductCardSkeleton } from '../../components/ui/Skeleton.jsx'
import { ErrorState, NoResultsState } from '../../components/ui/StateViews.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

/** Phone grid with consistent loading, empty, and error states. */
export function PhoneGrid({
  listings,
  isLoading,
  error,
  onRetry,
  className = '',
}) {
  const gridClasses = 'mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4'

  if (error) {
    return (
      <div className="mt-10">
        <ErrorState
          title="Listings could not be loaded"
          description="We could not reach ReFon just now. Please try again."
          onRetry={onRetry}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={gridClasses} aria-busy="true">
        <span className="sr-only">Loading phones…</span>
        {Array.from({ length: 8 }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="mt-10">
        <NoResultsState />
      </div>
    )
  }

  return (
    <ul className={`${gridClasses} ${className}`}>
      {listings.map((listing) => (
        <li key={listing.id} className="flex">
          <ListingCard listing={listing} />
        </li>
      ))}
    </ul>
  )
}

/**
 * A section header with a link on the right.
 *
 * Every product section on the homepage opens with this exact arrangement —
 * kicker, title, one line of explanation, and a link out — which is what makes
 * ten sections on one page read as one page instead of ten blocks.
 */
export function SectionIntro({ eyebrow, title, description, to, toLabel, className = '' }) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        className="sm:max-w-2xl"
      />
      {to && (
        <Link
          to={to}
          className="group inline-flex shrink-0 items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-800 transition hover:text-primary-950"
        >
          {toLabel}
          <ArrowRight
            className="size-4 transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  )
}

/**
 * Featured phones.
 *
 * Lists the newest approved inventory so the homepage reflects what is actually
 * buyable right now, and never shows a placeholder price or stock count.
 */
export function FeaturedPhonesSection({ listings, isLoading, error, onRetry }) {
  const featured = listings.slice(0, 8)

  return (
    <Section tone="white" id="featured">
      <SectionIntro
        eyebrow="Featured phones"
        title="Tested devices, ready to compare"
        description="Every card shows the condition grade, the measured battery health, and the warranty term, so you can narrow the catalog without opening each phone."
        to={MARKETPLACE_ROUTES.shop}
        toLabel="Browse all phones"
      />

      <PhoneGrid
        listings={featured}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
      />
    </Section>
  )
}

/**
 * Biggest savings.
 *
 * Only listings that actually carry a reference price above the selling price
 * appear here. A "deal" section that pads itself with full-priced phones would
 * be dishonest, and the API already refuses to store a reference price that is
 * not higher, so an empty section is a truthful "no deals right now".
 */
export function BestValueSection({ listings, isLoading, error, onRetry }) {
  const bestValue = [...listings]
    .filter((listing) => Number(listing.discountPercent ?? 0) > 0)
    .sort((left, right) => {
      const percentDelta =
        Number(right.discountPercent ?? 0) - Number(left.discountPercent ?? 0)

      if (percentDelta !== 0) {
        return percentDelta
      }

      return Number(left.price) - Number(right.price)
    })
    .slice(0, 4)

  const hasValue = !isLoading && !error && bestValue.length > 0

  return (
    <Section tone="canvas" id="best-value">
      <SectionIntro
        eyebrow="Biggest savings"
        title="Where the peso saving is largest"
        description="Sorted by how far below the original retail price each phone is selling. Only genuine reference prices appear here."
        to={MARKETPLACE_ROUTES.shop}
        toLabel="See every phone"
      />

      {hasValue ? (
        <PhoneGrid
          listings={bestValue}
          isLoading={isLoading}
          error={error}
          onRetry={onRetry}
        />
      ) : (
        <div className="mt-10 rounded-card border border-dashed border-line-2 bg-surface p-10 text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
            No discounts right now
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-body text-muted">
            No phones are listed below their original price at this moment. Browse the
            full catalog to see what is available.
          </p>
          <div className="mt-6">
            <ButtonLink to={MARKETPLACE_ROUTES.shop} variant="secondary" size="md">
              Browse all phones
            </ButtonLink>
          </div>
        </div>
      )}
    </Section>
  )
}