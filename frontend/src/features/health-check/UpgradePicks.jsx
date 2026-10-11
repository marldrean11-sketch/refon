import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { ButtonLink } from '../../components/ui/Button.jsx'
import { HomeListingCard } from '../homepage/HomeListingCard.jsx'
import { getApprovedListingsRequest } from '../listings/listing-api.js'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

/**
 * Which brands to suggest, from the one thing a browser reliably says about the
 * phone it runs on: whether it is an iPhone or an Android phone. The exact
 * model is not exposed, so the picks are "newer phones of the same family",
 * not a claim about this particular device.
 */
function readFamily() {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return { name: 'iPhone', brands: ['Apple'] }
  if (/Android/i.test(ua)) return { name: 'Android', brands: ['Samsung', 'Google', 'Xiaomi', 'OnePlus', 'OPPO', 'Vivo'] }
  return null
}

/** Newest model year first, then the healthier battery. */
function byUpgrade(a, b) {
  return Number(b.year) - Number(a.year) || Number(b.batteryPercent) - Number(a.batteryPercent)
}

/**
 * "Ready for an upgrade?": three live ReFon listings with a measured battery of
 * 90% or more, from the visitor's phone family when the browser says which one
 * it is. Every card is a real, buyable listing from the API.
 */
export function UpgradePicks({ done }) {
  const [family] = useState(readFamily)
  const [picks, setPicks] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getApprovedListingsRequest({ minBattery: 90, sort: 'newest', pageSize: 24 }, controller.signal)
      .then((response) => {
        const listings = response.listings ?? []
        const sameFamily = family ? listings.filter((listing) => family.brands.includes(listing.brand)) : []
        const pool = sameFamily.length >= 3 ? sameFamily : listings
        setPicks([...pool].sort(byUpgrade).slice(0, 3))
      })
      .catch(() => setPicks([]))
    return () => controller.abort()
  }, [family])

  if (picks && picks.length === 0) return null

  return (
    <section aria-labelledby="upgrade-heading" data-testid="upgrade-picks" className="border-t border-line pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent">
            {done ? 'Tapos na! Next step' : 'While you test'}
          </p>
          <h2 id="upgrade-heading" className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Ready for an upgrade?
          </h2>
          <p className="mt-2 text-muted">
            {family
              ? `Newer ${family.name === 'iPhone' ? 'iPhones' : 'Android phones'} on ReFon with 90%+ battery health, all inspected.`
              : 'Newer phones on ReFon with 90%+ battery health, all inspected.'}
          </p>
        </div>
        <ButtonLink to={MARKETPLACE_ROUTES.tradeIn} variant="outline" size="sm">
          Trade in this phone
          <ArrowRight className="size-4" aria-hidden="true" />
        </ButtonLink>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(picks ?? []).map((listing) => (
          <li key={listing.id}>
            <HomeListingCard listing={listing} />
          </li>
        ))}
      </ul>
    </section>
  )
}
