import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { setPageMeta } from '../components/layout/RouteEffects.jsx'
import { ErrorState } from '../components/ui/StateViews.jsx'
import { Container } from '../features/design/Container.jsx'
import { Panel } from '../features/design/Surfaces.jsx'
import {
  StorefrontHeader,
  StorefrontHeaderSkeleton,
  StorefrontNotFound,
} from '../features/seller/components/StorefrontHeader.jsx'
import { StorefrontInventory } from '../features/seller/components/StorefrontInventory.jsx'
import {
  TrustPanel,
  TrustPanelSkeleton,
} from '../features/seller/components/TrustPanel.jsx'
import {
  useSellerStorefront,
  useSellerStorefrontListings,
  useSellerStorefrontReviews,
} from '../features/seller/useSellerStorefront.js'
import { sellerPath } from '../lib/routes.js'

/**
 * Per-storefront document metadata.
 *
 * A storefront cannot be described by its path, so it publishes its own title
 * and description built from the seller the API actually returned. Rendered
 * nothing, for the same reason `ProductMeta` renders nothing: `RouteEffects` is
 * the single owner of the document head.
 *
 * Every figure in the description comes from the response. A seller with no
 * reviews gets no rating in the snippet rather than a fabricated 0.0.
 */
function StorefrontMeta({ seller }) {
  useEffect(() => {
    if (!seller) {
      return undefined
    }

    const ratingCount = Number(seller.ratingCount ?? 0)
    const listingCount = Number(seller.approvedListings ?? 0)

    const description = [
      `${listingCount} approved ${listingCount === 1 ? 'listing' : 'listings'}`,
      'from a verified ReFon seller',
      seller.location ? `in ${seller.location}` : null,
      ratingCount > 0 && seller.ratingAverage != null
        ? `rated ${Number(seller.ratingAverage).toFixed(1)} out of 5 from ${ratingCount} ${
            ratingCount === 1 ? 'review' : 'reviews'
          }`
        : null,
      seller.memberSince ? `on ReFon since ${seller.memberSince}` : null,
    ]
      .filter(Boolean)
      .join(', ')

    setPageMeta({
      pathname: window.location.pathname,
      title: `${seller.businessName} · Verified Seller on ReFon`,
      description: description.slice(0, 300),
      canonical: sellerPath(seller.id),
    })

    return () => setPageMeta(null)
  }, [seller])

  return null
}

/**
 * The public seller storefront.
 *
 * Opens from a listing page's "View seller storefront" link and from the
 * homepage's verified-seller registry, so it is reachable by a signed-out
 * visitor: nothing here needs a session, and the page renders under the same
 * `MarketplaceLayout` shell as the shop.
 *
 * Three sections in the order a shopper asks for them. Who is this and are they
 * legitimate (the header), can I trust them (trust history), and what have they
 * got (inventory). Inventory is last and largest because it is the reason for the
 * visit, and a shopper who only wants the seller's reputation never has to scroll
 * past a grid to reach it.
 *
 * The profile is the page's gate. The two inventory reads are enabled only once
 * a profile has resolved, so an unknown seller produces one request rather than
 * three, and the two sections that follow always have a seller to be about.
 */
export function SellerStorefrontPage() {
  const { sellerId } = useParams()
  const { seller, isLoading, error, notFound, retry } = useSellerStorefront(sellerId)

  const hasSeller = Boolean(seller)
  const { listings, pagination, sort, setSort, setPage, error: listingsError, retry: retryListings } =
    useSellerStorefrontListings(sellerId, { enabled: hasSeller })

  const {
    reviews,
    summary,
    isLoading: reviewsLoading,
    isLoadingMore,
    hasMore,
    error: reviewsError,
    loadMore,
  } = useSellerStorefrontReviews(sellerId, { enabled: hasSeller })

  // A failed profile that is not a 404 is retryable, and so is a 404 that the
  // shopper may want to try again on: the seller could be approved a second after
  // the page said no.
  if (isLoading) {
    return <StorefrontHeaderSkeleton />
  }

  if (notFound) {
    return <StorefrontNotFound />
  }

  if (error || !seller) {
    return (
      <div className="bg-canvas">
        <Container className="py-16 sm:py-24">
          <ErrorState
            title="This storefront could not be loaded"
            description={error?.message ?? 'Please try again in a moment.'}
            onRetry={retry}
          />
        </Container>
      </div>
    )
  }

  return (
    <div className="bg-canvas">
      <StorefrontMeta seller={seller} />

      <StorefrontHeader seller={seller} />

      <Container className="py-10 sm:py-14 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-10">
          {/* Inventory leads on desktop. It is the reason for the visit, and
              putting the narrow trust panel beside it rather than above it keeps
              the whole seller record above the fold on a wide screen. On mobile
              the DOM order is what stacks, so the trust panel renders second. */}
          <StorefrontInventory
            listings={listings}
            pagination={pagination}
            sort={sort}
            onSortChange={setSort}
            onPageChange={setPage}
            isLoading={listingsError != null && listings.length === 0}
            error={listingsError}
            onRetry={retryListings}
          />

          <aside aria-label="Seller trust history" className="lg:sticky lg:top-24">
            {reviewsLoading ? (
              <TrustPanelSkeleton />
            ) : reviewsError && reviews.length === 0 ? (
              // A failed trust read must not take the inventory down with it. The
              // shopper is here for the phones, and the store's record is a
              // supporting panel.
              <Panel>
                <p className="px-5 py-6 text-sm leading-relaxed text-muted">
                  This seller's reviews are taking a moment to load. Everything
                  else on the page is unaffected.
                </p>
              </Panel>
            ) : (
              <TrustPanel
                reviews={reviews}
                summary={summary}
                isLoading={reviewsLoading}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                onLoadMore={loadMore}
              />
            )}
          </aside>
        </div>
      </Container>
    </div>
  )
}