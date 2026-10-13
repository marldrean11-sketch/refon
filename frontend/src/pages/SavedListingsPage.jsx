import { useCallback, useEffect, useState } from 'react'
import { Heart, RefreshCw, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ListingCard } from '../features/listings/listing-card.jsx'
import {
  getMyFavoritesRequest,
  removeFavoriteRequest,
} from '../features/favorites/favorites-api.js'
import { useSavedListings } from '../features/favorites/useSavedListings.js'
import { AUTH_ROUTES } from '../features/auth/auth.routes.js'
import { ProductCardSkeleton } from '../components/ui/Skeleton.jsx'
import { EmptyState, ErrorState } from '../components/ui/StateViews.jsx'
import { Container } from '../features/design/Container.jsx'

/**
 * Saved listings.
 *
 * A buyer returns here to *compare*, so the page is built as a shelf: a compact
 * masthead, a live count, and the same dense product grid the shop uses. The
 * previous version gave the shortlist a large centred heading and a
 * "Your shortlist" eyebrow above a three-card grid that was cut off on a laptop
 * screen, which made it feel like a different product from the shop.
 */
export function SavedListingsPage() {
  const { refresh, savedIds, toggle } = useSavedListings()
  const [listings, setListings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await getMyFavoritesRequest()
      setListings(response.listings)
    } catch (requestError) {
      setError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    load().catch(() => {})
  }, [load])

  /** Drops a sold phone from the shelf; the card goes at once, the request follows. */
  async function removeSold(id) {
    setListings((current) => current.filter((listing) => listing.id !== id))
    try {
      // Through the shared toggle when the header knows the id, so its count drops too.
      if (savedIds?.has(id)) {
        await toggle(id)
      } else {
        await removeFavoriteRequest(id)
      }
    } catch {
      load().catch(() => {})
    }
  }

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-canvas">
      <div className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700">
                Your shortlist
              </p>
              <h1 className="mt-3 font-display text-[2.25rem] font-bold leading-[1.03] tracking-[-0.035em] text-ink sm:text-[2.75rem]">
                Saved Listings
              </h1>
              <p className="mt-2.5 max-w-2xl leading-body text-muted">
                Phones you bookmarked while browsing. Sold listings stay here so you can
                still see what caught your eye.
              </p>
            </div>

            {!isLoading && !error && listings.length > 0 && (
              <div className="shrink-0 border-l-2 border-primary-950 pl-4">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
                  Saved
                </p>
                <p
                  className="font-display text-2xl font-bold tabular-nums leading-none tracking-tight text-ink"
                  aria-live="polite"
                >
                  {listings.length}
                </p>
              </div>
            )}
          </div>
        </Container>
      </div>

      <Container className="py-8 sm:py-10" aria-busy={isLoading}>
        {isLoading ? (
          <div role="status" aria-live="polite" aria-label="Loading your saved listings">
            <ProductCardSkeleton count={6} />
            <span className="sr-only">Loading your saved listings…</span>
          </div>
        ) : error ? (
          <ErrorState
            title="We could not load your saved listings."
            description="Check your connection and try again."
            onRetry={() => {
              load().catch(() => {})
              refresh?.().catch(() => {})
            }}
          />
        ) : listings.length === 0 ? (
          <EmptyState
            icon={Heart}
            kicker="Nothing saved yet"
            title="No saved listings yet"
            description="Tap the heart on any phone to keep it here while you compare options."
            actionLabel="Browse phones"
            actionHref={AUTH_ROUTES.buyer}
          />
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <li key={listing.id} className="flex flex-col gap-2">
                  <ListingCard listing={listing} hideSaveButton />
                  {listing.status === 'SOLD' && (
                    <button
                      type="button"
                      onClick={() => removeSold(listing.id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-control border border-line-2 px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-heart hover:text-heart focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Remove from saved
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted">
              <RefreshCw className="size-4 shrink-0 text-subtle" aria-hidden="true" />
              Sold listings stay in your shortlist so you can compare what you looked at.
            </p>
          </>
        )}
      </Container>
    </div>
  )
}