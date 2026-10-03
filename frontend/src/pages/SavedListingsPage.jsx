import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Heart,
  RefreshCw,
  Search,
  ShoppingBag,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ListingCard } from '../features/listings/listing-card.jsx'
import { getMyFavoritesRequest } from '../features/favorites/favorites-api.js'
import { useSavedListings } from '../features/favorites/useSavedListings.js'
import { AUTH_ROUTES } from '../features/auth/auth.routes.js'
import { Skeleton } from '../components/ui/Skeleton.jsx'

export function SavedListingsPage() {
  const { refresh } = useSavedListings()
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

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-canvas">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-700">
            <Heart className="size-4" aria-hidden="true" />
            Your shortlist
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
            Saved Listings
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-body text-muted">
            Phones you bookmarked while browsing. Sold listings stay here so you can
            still see what caught your eye.
          </p>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <div
            className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
            role="status"
            aria-live="polite"
            aria-label="Loading your saved listings"
          >
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-card border border-line bg-white p-5 shadow-card">
                <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                <Skeleton className="mt-4 h-5 w-2/5" />
                <Skeleton className="mt-3 h-4 w-1/4" />
              </div>
            ))}
            <span className="sr-only">Loading your saved listings…</span>
          </div>
        ) : error ? (
          <div
            className="rounded-card border border-red-200 bg-red-50 p-6 text-center shadow-sm sm:p-10"
            role="alert"
          >
            <AlertCircle className="mx-auto size-8 text-danger" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-red-950">
              We could not load your saved listings.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-body text-red-800">
              Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => {
                load().catch(() => {})
                refresh().catch(() => {})
              }}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger px-5 text-sm font-bold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : listings.length === 0 ? (
          <section
            className="rounded-card-xl border border-line bg-white px-5 py-14 text-center shadow-card sm:px-8"
            aria-live="polite"
          >
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-50 text-primary-600">
              <Heart className="size-8" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold text-ink">No saved listings yet</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-body text-muted">
              Tap the heart on any phone to keep it here while you compare options.
            </p>
            <Link
              to={AUTH_ROUTES.buyer}
              className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <Search className="size-4" aria-hidden="true" />
              Browse phones
            </Link>
          </section>
        ) : (
          <>
            <p className="mb-6 text-sm font-semibold text-muted" aria-live="polite">
              {listings.length} saved {listings.length === 1 ? 'listing' : 'listings'}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <div key={listing.id} className="relative">
                  <ListingCard listing={listing} hideSaveButton />
                  {listing.status === 'SOLD' && (
                    <span className="absolute right-3 top-3 z-40 inline-flex items-center gap-1.5 rounded-full bg-amber-700 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm">
                      <ShoppingBag className="size-3.5" aria-hidden="true" />
                      Sold
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
