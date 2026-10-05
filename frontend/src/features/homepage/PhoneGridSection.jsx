import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Section, SectionHeading } from '../../components/ui/Section.jsx'
import { ButtonLink } from '../../components/ui/Button.jsx'
import { ProductCardSkeleton } from '../../components/ui/Skeleton.jsx'
import { ErrorState, NoResultsState } from '../../components/ui/StateViews.jsx'
import { ListingCard } from '../listings/listing-card.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { gradeFromLegacyCondition } from '../../lib/listing-taxonomy.js'

/**
 * Resolves the grade for a listing, falling back to the legacy condition label
 * until the graded column lands. Cards and sections read the grade from one
 * place so a card never disagrees with the section around it.
 */
export function gradeFor(listing) {
  return listing?.grade ?? gradeFromLegacyCondition(listing?.condition)
}

/** Phone grid with consistent loading, empty, and error states. */
export function PhoneGrid({
  listings,
  isLoading,
  error,
  onRetry,
  tone = 'canvas',
  className = '',
}) {
  const gridClasses =
    'mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

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
 * Featured phones.
 *
 * Lists the newest approved inventory so the homepage reflects what is actually
 * buyable right now, and never shows a placeholder price or stock count.
 */
export function FeaturedPhonesSection({ listings, isLoading, error, onRetry }) {
  const featured = useMemo(() => listings.slice(0, 8), [listings])

  return (
    <Section tone="white" id="featured">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Featured phones"
          title="Tested devices, ready to compare"
          description="Every card shows the condition grade, the measured battery health, and the warranty term, so you can narrow the catalog without opening each phone."
          className="sm:max-w-2xl"
        />
        <Link
          to={MARKETPLACE_ROUTES.shop}
          className="group inline-flex shrink-0 items-center gap-2 text-sm font-bold text-primary-700 transition hover:text-primary-500"
        >
          Browse all phones
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </Link>
      </div>

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
  const bestValue = useMemo(() => {
    return [...listings]
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
  }, [listings])

  const hasValue = !isLoading && !error && bestValue.length > 0

  return (
    <Section tone="muted" id="best-value">
      <SectionHeading
        eyebrow="Biggest savings"
        title="Where the peso saving is largest"
        description="Sorted by how far below the original retail price each phone is selling. Only genuine reference prices appear here."
      />

      {hasValue ? (
        <PhoneGrid
          listings={bestValue}
          isLoading={isLoading}
          error={error}
          onRetry={onRetry}
        />
      ) : (
        <div className="mt-10 rounded-card-lg border border-line bg-white p-8 text-center">
          <p className="text-sm font-semibold text-muted">
            {isLoading
              ? 'Loading the biggest savings…'
              : 'No phones are listed below their original price right now. Browse the full catalog to see what is available.'}
          </p>
          <div className="mt-5">
            <ButtonLink to={MARKETPLACE_ROUTES.shop} variant="secondary" size="md">
              Browse all phones
            </ButtonLink>
          </div>
        </div>
      )}
    </Section>
  )
}
