import { useMemo } from 'react'
import { BadgeCheck, Clock3, Store } from 'lucide-react'
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
 *
 * Presented as a registry: a table of accounts with a monogram, their status,
 * and three figures. A marketplace's credibility lives in who is allowed to sell,
 * so this reads as a register of approved accounts rather than as four friendly
 * cards.
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
        <p className="mt-10 rounded-card border border-dashed border-line-2 bg-canvas p-8 text-center text-sm font-semibold text-muted">
          No approved sellers have published listings yet.
        </p>
      ) : (
        <ul className="mt-10 grid gap-px overflow-hidden rounded-card-lg border border-line bg-line lg:grid-cols-2">
          {sellers.map((seller) => (
            <li key={seller.id} className="bg-surface">
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
    <article className="flex h-full flex-col p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-control bg-primary-950 font-display text-base font-bold text-white">
          {seller.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 font-display text-lg font-bold tracking-tight text-ink">
            {seller.name}
            <BadgeCheck className="size-4 shrink-0 text-accent-600" aria-label="Verified seller" />
          </h3>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">
            Verified since {seller.memberSince}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-control border border-line bg-line">
        <div className="bg-surface-2 px-3 py-2.5">
          <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-subtle">
            Listed
          </dt>
          <dd className="mt-1 font-display text-lg font-bold tabular-nums leading-none text-ink">
            {formatNumber(seller.listingCount)}
          </dd>
        </div>
        <div className="bg-surface-2 px-3 py-2.5">
          <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-subtle">
            From
          </dt>
          <dd className="mt-1 font-display text-lg font-bold tabular-nums leading-none text-ink">
            {formatPeso(seller.minPrice)}
          </dd>
        </div>
        <div className="bg-surface-2 px-3 py-2.5">
          <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-subtle">
            Replies
          </dt>
          <dd className="mt-1 truncate text-[13px] font-semibold text-ink">
            {seller.responseTime}
          </dd>
        </div>
      </dl>

      <div className="mt-auto pt-5">
        <Link
          to={sellerPath(seller.id)}
          className="inline-flex items-center gap-2 rounded-control border border-line-2 bg-surface px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary-900 transition hover:border-primary-950 hover:bg-primary-950 hover:text-white"
        >
          <Store className="size-3.5" aria-hidden="true" />
          View storefront
        </Link>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
          {seller.responseTime}
        </p>
      </div>
    </article>
  )
}