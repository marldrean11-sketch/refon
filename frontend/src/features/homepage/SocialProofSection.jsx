import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, PackageCheck, Repeat, ScanLine, Smartphone } from 'lucide-react'
import { Container } from '../design/Container.jsx'
import { ListingPhoto } from '../listings/ListingPhoto.jsx'
import { apiRequest } from '../../lib/api-client.js'
import { formatNumber, formatPeso, formatRelativeTime } from '../../lib/format.js'
import { productPath } from '../../lib/routes.js'
import { usePrefersReducedMotion } from '../../lib/motion.ts'

const COUNTERS = [
  { key: 'phonesSold', label: 'Phones sold', icon: PackageCheck },
  { key: 'liveListings', label: 'Checked phones for sale', icon: Smartphone },
  { key: 'verifiedSellers', label: 'Verified sellers', icon: BadgeCheck },
  { key: 'healthChecks', label: 'Health checks run', icon: ScanLine },
  { key: 'tradeIns', label: 'Trade-in requests', icon: Repeat },
]

/** Counts up from zero the first time the number scrolls into view. */
function CountUp({ value, reduced }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(reduced ? value : 0)

  useEffect(() => {
    if (reduced) {
      const id = requestAnimationFrame(() => setShown(value))
      return () => cancelAnimationFrame(id)
    }
    const element = ref.current
    if (!element) return undefined
    let frame = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const start = performance.now()
      const tick = (now) => {
        const t = Math.min(1, (now - start) / 1100)
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))))
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value, reduced])

  return <span ref={ref}>{formatNumber(shown)}</span>
}

function SoldCard({ sale, duplicate = false }) {
  return (
    <Link
      to={productPath(sale)}
      tabIndex={duplicate ? -1 : undefined}
      className="flex w-64 shrink-0 items-center gap-3 rounded-card border border-line bg-card p-3 transition-colors hover:border-accent/50"
    >
      <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-well">
        <ListingPhoto
          src={sale.photo}
          alt=""
          className="size-full object-cover"
          fallback={
            <span className="grid size-full place-items-center text-subtle">
              <Smartphone className="size-6" aria-hidden="true" />
            </span>
          }
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">
          {sale.brand} {sale.model}
        </span>
        <span className="block truncate text-xs text-muted">
          {sale.storage}
          {sale.grade ? ` · Grade ${sale.grade}` : ''} · {formatPeso(sale.price)}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
          Sold {formatRelativeTime(sale.soldAt)}
          {sale.location ? ` · ${sale.location}` : ''}
        </span>
      </span>
    </Link>
  )
}

/**
 * Social proof: live counters and a ticker of the latest phones sold.
 *
 * Every number comes from the database, so it is never inflated; a counter that
 * is still zero is left out rather than shown as "0 phones sold". The ticker
 * names the phone and the seller's city only, never the buyer.
 */
export function SocialProofSection() {
  const reduced = usePrefersReducedMotion()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    apiRequest('/stats/home', { signal: controller.signal })
      .then(setStats)
      .catch(() => {})
    return () => controller.abort()
  }, [])

  if (!stats) return null

  const counters = COUNTERS.filter((counter) => Number(stats.totals?.[counter.key]) > 0)
  const sales = stats.recentSales ?? []
  if (counters.length === 0 && sales.length === 0) return null

  return (
    <section className="border-b border-line bg-page py-10 sm:py-14" aria-labelledby="social-proof-heading" data-testid="social-proof">
      <Container>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Live on ReFon</p>
        <h2 id="social-proof-heading" className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Real phones, real buyers.
        </h2>

        {counters.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-card-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
            {counters.map(({ key, label, icon: Icon }) => (
              <div key={key} className="bg-card px-5 py-5">
                <dt className="flex items-center gap-2 text-[13px] text-muted">
                  <Icon className="size-4 text-accent" aria-hidden="true" />
                  {label}
                </dt>
                <dd className="mt-2 font-display text-3xl font-extrabold tabular-nums text-ink">
                  <CountUp value={Number(stats.totals[key])} reduced={reduced} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Container>

      {sales.length > 0 && (
        <div className="mt-8">
          <Container>
            <h3 className="text-sm font-bold text-ink">Recently sold</h3>
          </Container>
          {reduced || sales.length < 3 ? (
            <Container>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {sales.map((sale) => (
                  <SoldCard key={sale.id} sale={sale} />
                ))}
              </div>
            </Container>
          ) : (
            <div className="group mt-3 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
              <div
                className="rf-marquee gap-3 pr-3 group-hover:[animation-play-state:paused]"
                style={{ animationDuration: `${sales.length * 6}s` }}
              >
                {[...sales, ...sales].map((sale, index) => (
                  <div key={`${sale.id}-${index}`} aria-hidden={index >= sales.length || undefined}>
                    <SoldCard sale={sale} duplicate={index >= sales.length} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
