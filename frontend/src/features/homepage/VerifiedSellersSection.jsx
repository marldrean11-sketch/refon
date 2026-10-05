import { useMemo } from 'react'
import { BadgeCheck, Clock3, ShoppingBag, Store, TrendingDown } from 'lucide-react'
import { Section, SectionHeading } from '../../components/ui/Section.jsx'
import { Link } from 'react-router-dom'
import { formatNumber, formatPeso } from '../../lib/format.js'
import { sellerPath } from '../../lib/routes.js'

/**
 * Verified sellers.
 *
 * Built from live listing data rather than hard-coded profiles, so a seller
 * who leaves the platform disappears from this section on their own. Counts
 * reflect real listed inventory, and the storefront link points at the public
 * seller page rather than a dead end.
 */
export function VerifiedSellersSection({ listings, isLoading }) {
  const sellers = useMemo(() => {
    const bySeller = new Map()

    for (const listing of listings) {
      const seller = listing.seller
      const key = listing.sellerId

      if (!seller || seller.verificationStatus !== 'APPROVED') {
        continue
      }

      const entry = bySeller.get(key) ?? {
        id: seller.id,
        name: seller.businessName,
        memberSince: seller.memberSince,
        responseTime: seller.responseTime,
        listingCount: 0,
        minPrice: Number.POSITIVE_INFINITY,
      }

      entry.listingCount += 1
      entry.minPrice = Math.min(entry.minPrice, Number(listing.price))
      bySeller.set(key, entry)
    }

    return [...bySeller.values()]
      .sort((left, right) => right.listingCount - left.listingCount)
      .slice(0, 4)
  }, [listings])

  const isEmpty = !isLoading && sellers.length === 0

  return (
    <Section tone="white" id="sellers">
      <SectionHeading
        eyebrow="Verified sellers"
        title="Only verified accounts can list a phone"
        description="Sellers are reviewed before they can publish, and a moderator checks each listing before it reaches you."
      />

      {isEmpty ? (
        <p className="mt-10 rounded-card-lg border border-line bg-canvas p-8 text-center text-sm font-semibold text-muted">
          No approved sellers have published listings yet.
        </p>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {sellers.map((seller) => (
            <li key={seller.id}>
              <SellerCard seller={seller} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function SellerCard({ seller }) {
  return (
    <article className="flex h-full flex-col rounded-card-lg border border-line bg-white p-6 shadow-card">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-500 font-display text-base font-bold text-white">
          {seller.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-ink">
            {seller.name}
            <BadgeCheck className="size-4.5 shrink-0 text-accent-600" style={{ width: 18, height: 18 }} aria-label="Verified seller" />
          </h3>
          <p className="mt-1 text-sm text-muted">
            Verified seller since {seller.memberSince}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-canvas p-3">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <ShoppingBag className="size-4" aria-hidden="true" />
            Listed now
          </dt>
          <dd className="mt-1.5 font-display text-base font-semibold text-ink">
            {formatNumber(seller.listingCount)} {seller.listingCount === 1 ? 'phone' : 'phones'}
          </dd>
        </div>
        <div className="rounded-2xl bg-canvas p-3">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <TrendingDown className="size-4" aria-hidden="true" />
            From
          </dt>
          <dd className="mt-1.5 font-display text-base font-semibold text-ink">
            {formatPeso(seller.minPrice)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted">
        <Clock3 className="size-4 shrink-0" aria-hidden="true" />
        {seller.responseTime}
      </p>

      <div className="mt-auto pt-5">
        <Link
          to={sellerPath(seller.id)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-primary-700 transition hover:border-primary-200 hover:bg-primary-50"
        >
          <Store className="size-4" aria-hidden="true" />
          View storefront
        </Link>
      </div>
    </article>
  )
}
