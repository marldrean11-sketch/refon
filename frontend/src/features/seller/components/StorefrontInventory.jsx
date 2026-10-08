import { ArrowUpDown, PackageOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../../components/ui/StateViews.jsx'
import { ErrorState } from '../../../components/ui/StateViews.jsx'
import { Pagination } from '../../../components/ui/Pagination.jsx'
import { ProductGridSkeleton } from '../../../components/ui/Skeleton.jsx'
import { SelectField } from '../../../components/ui/SelectField.jsx'
import { ListingCard } from '../../listings/listing-card.jsx'
import { STOREFRONT_SORTS } from '../useSellerStorefront.js'
import { MARKETPLACE_ROUTES } from '../../../lib/routes.js'

/**
 * The seller's inventory.
 *
 * Reuses `ListingCard` unchanged rather than a storefront-specific card. That is
 * deliberate: a shopper comparing this seller's phones against the shop's must
 * be reading the same measurements in the same place on the same card, or the
 * comparison is quietly invalid. It also means add-to-cart and save behaviour on
 * a storefront card are the shop's behaviour, role-gating included, with no
 * storefront-specific code path to keep in step.
 *
 * The result count and the sort control share one toolbar above the grid, because
 * they are the two facts about the result set and belong stated together.
 */
export function StorefrontInventory({
  listings,
  pagination,
  sort,
  onSortChange,
  onPageChange,
  isLoading,
  error,
  onRetry,
}) {
  const total = pagination?.total ?? listings.length

  return (
    <section aria-labelledby="storefront-inventory-heading">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
            Inventory
          </p>
          <h2
            id="storefront-inventory-heading"
            className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
          >
            {isLoading
              ? 'Loading phones…'
              : `${total} ${total === 1 ? 'phone' : 'phones'} available`}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ArrowUpDown className="size-4 shrink-0 text-subtle" aria-hidden="true" />
          <SelectField
            label="Sort inventory"
            srOnlyLabel
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            options={STOREFRONT_SORTS}
            selectClassName="h-10 border-line-2 text-[13px]"
            className="w-full sm:w-52"
          />
        </div>
      </div>

      <div className="mt-7" aria-live="polite" aria-busy={isLoading}>
        {error ? (
          <ErrorState
            title="This seller's phones could not be loaded"
            description={error.message}
            onRetry={onRetry}
          />
        ) : isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : listings.length === 0 ? (
          // An empty storefront is a real state, not a failure. It says what the
          // shop is and routes the shopper somewhere that can help.
          <EmptyState
            icon={PackageOpen}
            kicker="Nothing listed"
            title="This seller has no live phones right now"
            description="Approved inventory appears here as soon as it is listed. Browse the full shop to see what ReFon has in stock today."
            actionLabel="Browse all phones"
            actionHref={MARKETPLACE_ROUTES.shop}
          />
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <li key={listing.id} className="flex">
                  <ListingCard listing={listing} />
                </li>
              ))}
            </ul>

            {pagination && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={onPageChange}
                className="mt-12"
              />
            )}
          </>
        )}
      </div>

      {!isLoading && listings.length > 0 && (
        <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
          Looking for a grade or a budget this seller does not have?{' '}
          <Link
            to={MARKETPLACE_ROUTES.shop}
            className="font-semibold text-primary-800 underline underline-offset-2 hover:text-primary-950"
          >
            Compare every phone on ReFon
          </Link>
          .
        </p>
      )}
    </section>
  )
}