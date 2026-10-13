import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, MapPin, Smartphone } from 'lucide-react'
import { RatingStars } from '../../../components/ui/RatingStars.jsx'
import { ListingPhoto } from '../../listings/ListingPhoto.jsx'
import { formatNumber } from '../../../lib/format.js'
import { productPath, sellerPath } from '../../../lib/routes.js'
import { BANNER_LOGO, SellerAvatar, brandColorFor } from '../brand.jsx'
import { FollowStoreButton } from './FollowStoreButton.jsx'

/**
 * One phone store in the directory: its banner and logo, rating, sales, how
 * many phones are live, a peek at three of them, and Follow / Visit store.
 */
export function StoreCard({ store, onFollowChange }) {
  const [follow, setFollow] = useState({ following: store.following, followerCount: store.followerCount })
  const color = brandColorFor(store)
  const live = Number(store.approvedListings ?? 0)

  return (
    <article className="flex flex-col overflow-hidden rounded-card-lg border border-line bg-card transition-colors hover:border-line-2" data-testid="store-card">
      <div
        className="relative h-20"
        style={{ background: `linear-gradient(120deg, ${color.hex}66, ${color.hex}14 60%, transparent)` }}
      >
        {store.bannerUrl && (
          <img
            src={store.bannerUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="-mt-9 flex items-end justify-between gap-3">
          <SellerAvatar seller={store} rounded="rounded-2xl" className={`${BANNER_LOGO} border-card`} />
          <FollowStoreButton
            sellerId={store.id}
            following={follow.following}
            followerCount={follow.followerCount}
            size="sm"
            onChange={(next) => {
              setFollow(next)
              onFollowChange?.(store.id, next)
            }}
          />
        </div>

        <h2 className="mt-3 flex items-center gap-1.5 font-display text-lg font-bold tracking-tight text-ink">
          <Link to={sellerPath(store.id)} className="truncate hover:text-accent">
            {store.businessName}
          </Link>
          {store.isVerified && <BadgeCheck className="size-4 shrink-0 text-accent" aria-label="Verified seller" />}
        </h2>
        {store.tagline && <p className="mt-1 line-clamp-2 text-sm text-muted">{store.tagline}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          {store.ratingAverage != null ? (
            <RatingStars value={store.ratingAverage} count={store.ratingCount} size="sm" />
          ) : (
            <span>No reviews yet</span>
          )}
          <span>{formatNumber(store.completedSales ?? 0)} sold</span>
          {store.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {store.location}
            </span>
          )}
        </div>

        <div className="mt-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
            {live === 1 ? '1 phone for sale' : `${formatNumber(live)} phones for sale`}
          </p>
          {store.preview?.length > 0 && (
            <ul className="mt-2 grid grid-cols-3 gap-2">
              {store.preview.map((item) => (
                <li key={item.id}>
                  <Link
                    to={productPath(item)}
                    title={item.name}
                    className="block aspect-square overflow-hidden rounded-xl border border-line bg-well hover:border-accent/50"
                  >
                    <ListingPhoto
                      src={item.photo}
                      alt={item.name}
                      loading="lazy"
                      className="size-full object-cover"
                      fallback={
                        <span className="grid size-full place-items-center text-subtle">
                          <Smartphone className="size-6" aria-hidden="true" />
                        </span>
                      }
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          to={sellerPath(store.id)}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-2 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Visit store
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
