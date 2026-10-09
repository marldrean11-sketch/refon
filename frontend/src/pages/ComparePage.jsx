import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, BadgeCheck, X } from 'lucide-react'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'
import { ButtonLink } from '../components/ui/Button.jsx'
import { ConditionBadge } from '../components/ui/ConditionBadge.jsx'
import { Container } from '../features/design/Container.jsx'
import { COMPARE_LIMIT, comparePath } from '../features/compare/compare-context.js'
import { useCompare } from '../features/compare/useCompare.js'
import { DeviceThumb } from '../features/cart/components/DeviceThumb.jsx'
import { getListingRequest } from '../features/listings/listing-api.js'
import { FREE_DELIVERY_THRESHOLD } from '../lib/delivery-policy.js'
import { formatPeso } from '../lib/format.js'
import { getConditionGrade } from '../lib/listing-taxonomy.js'
import { MARKETPLACE_ROUTES, productPath } from '../lib/routes.js'

/** Larger is better for these; a grade is better the earlier its letter. */
const GRADE_RANK = { A: 3, B: 2, C: 1 }

function storageInGb(value) {
  const match = /([\d.]+)\s*(TB|GB)/i.exec(value ?? '')

  if (!match) {
    return null
  }

  return Number(match[1]) * (match[2].toUpperCase() === 'TB' ? 1024 : 1)
}

/**
 * The comparison rows.
 *
 * `rank` turns a listing into a number where higher is better; the best value in a
 * row is set in bold. A row without `rank` is a description, not a contest, and no
 * cell in it is singled out. Nothing declares an overall winner: which phone is
 * better depends on what the buyer is weighing.
 */
const ROWS = [
  {
    group: 'Price',
    label: 'Price',
    value: (listing) => formatPeso(listing.price),
    rank: (listing) => -Number(listing.price),
  },
  {
    group: 'Price',
    label: 'Saving',
    value: (listing) =>
      Number(listing.originalPrice) > Number(listing.price)
        ? `${formatPeso(Number(listing.originalPrice) - Number(listing.price))} off ${formatPeso(listing.originalPrice)}`
        : 'No reference price',
  },
  {
    group: 'Price',
    label: 'Delivery',
    value: (listing) =>
      Number(listing.price) >= FREE_DELIVERY_THRESHOLD ? 'Free standard delivery' : 'Fee shown at checkout',
  },
  {
    group: 'Condition',
    label: 'Grade',
    value: (listing) => getConditionGrade(listing.grade).headline,
    rank: (listing) => GRADE_RANK[listing.grade] ?? 0,
  },
  {
    group: 'Condition',
    label: 'Battery health',
    value: (listing) => `${listing.batteryPercent}%`,
    rank: (listing) => Number(listing.batteryPercent),
  },
  {
    group: 'Condition',
    label: 'Inspection',
    value: (listing) =>
      listing.inspectionRecorded
        ? `${listing.inspectionChecks.length} of ${listing.inspectionTotal} checks recorded`
        : 'Not recorded',
    rank: (listing) => (listing.inspectionRecorded ? listing.inspectionChecks.length : 0),
  },
  {
    group: 'Condition',
    label: 'Warranty',
    value: (listing) =>
      Number(listing.warrantyMonths) > 0 ? `${listing.warrantyMonths} months` : 'Sold as-is',
    rank: (listing) => Number(listing.warrantyMonths ?? 0),
  },
  {
    group: 'Condition',
    label: 'IMEI',
    value: (listing) => (listing.imeiVerified ? 'Verified by the seller' : 'Not recorded'),
  },
  {
    group: 'Device',
    label: 'Release year',
    value: (listing) => String(listing.year),
    rank: (listing) => Number(listing.year),
  },
  {
    group: 'Device',
    label: 'Storage',
    value: (listing) => listing.storage,
    rank: (listing) => storageInGb(listing.storage) ?? 0,
  },
  { group: 'Device', label: 'Memory', value: (listing) => listing.ram },
  { group: 'Device', label: 'Colour', value: (listing) => listing.color },
  { group: 'Device', label: 'Processor', value: (listing) => listing.processor },
  { group: 'Device', label: 'Display', value: (listing) => listing.displaySpec },
  { group: 'Device', label: 'Cameras', value: (listing) => listing.cameraSpec },
  { group: 'Device', label: 'Network', value: (listing) => listing.networkType },
  { group: 'Device', label: 'Software', value: (listing) => listing.operatingSystem },
  {
    group: 'Seller',
    label: 'Sold by',
    value: (listing) => listing.sellerName,
  },
]

function parseIds(raw) {
  return [...new Set((raw ?? '').split(',').map((id) => id.trim()).filter(Boolean))].slice(
    0,
    COMPARE_LIMIT,
  )
}

/**
 * Side-by-side comparison of up to three phones.
 *
 * The URL carries the listing ids (`/compare?ids=a,b`), so a comparison can be
 * shared or bookmarked, and the tray's selection is synced from it. Every listing
 * is fetched fresh on load. A phone that sold or was removed since it was picked
 * keeps its column, says so, and offers removal — it never silently disappears.
 */
export function ComparePage() {
  const compare = useCompare()
  const [searchParams] = useSearchParams()
  // Navigating to a built path rather than `setSearchParams`, which would encode
  // the commas and turn a shareable link into `?ids=a%2Cb`.
  const navigate = useNavigate()
  const urlIds = useMemo(() => parseIds(searchParams.get('ids')), [searchParams])
  const ids = urlIds.length > 0 ? urlIds : compare.ids
  const idsKey = ids.join(',')
  const [entries, setEntries] = useState({})
  const [differencesOnly, setDifferencesOnly] = useState(false)

  // Keep the tray in step with a shared link, and the URL in step with the tray.
  useEffect(() => {
    if (urlIds.length > 0 && urlIds.join(',') !== compare.ids.join(',')) {
      compare.replace(urlIds)
    } else if (urlIds.length === 0 && compare.ids.length > 0) {
      navigate(comparePath(compare.ids), { replace: true })
    }
    // Only the URL drives this; `compare` changes as a result of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    const controller = new AbortController()

    for (const id of idsKey.split(',').filter(Boolean)) {
      setEntries((current) => (current[id] ? current : { ...current, [id]: { status: 'loading' } }))

      getListingRequest(id, controller.signal)
        .then((response) =>
          setEntries((current) => ({
            ...current,
            [id]:
              response.listing?.status === 'APPROVED'
                ? { status: 'ready', listing: response.listing }
                : { status: 'gone', listing: response.listing },
          })),
        )
        .catch((error) => {
          if (error?.name !== 'AbortError') {
            setEntries((current) => ({ ...current, [id]: { status: 'gone' } }))
          }
        })
    }

    return () => controller.abort()
  }, [idsKey])

  function removeId(id) {
    const next = ids.filter((entry) => entry !== id)
    compare.remove(id)
    navigate(comparePath(next), { replace: true })
  }

  const columns = ids.map((id) => ({ id, ...(entries[id] ?? { status: 'loading' }) }))
  const ready = columns.filter((column) => column.status === 'ready')

  const rows = ROWS.map((row) => {
    const values = columns.map((column) =>
      column.status === 'ready' ? (row.value(column.listing) ?? '—') : null,
    )
    const present = values.filter((value) => value !== null)
    const isSame = present.length > 1 && present.every((value) => value === present[0])

    let best = null
    if (row.rank && ready.length > 1 && !isSame) {
      const ranks = columns.map((column) =>
        column.status === 'ready' ? row.rank(column.listing) : Number.NEGATIVE_INFINITY,
      )
      const top = Math.max(...ranks)
      // Only single out a cell when exactly one phone holds the top value.
      best = ranks.filter((rank) => rank === top).length === 1 ? ranks.indexOf(top) : null
    }

    return { ...row, values, isSame, best }
  }).filter((row) => row.values.some((value) => value !== null && value !== '—'))

  const visibleRows = differencesOnly ? rows.filter((row) => !row.isSame) : rows

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-10">
          <Breadcrumb
            items={[
              { label: 'Home', to: MARKETPLACE_ROUTES.home },
              { label: 'Shop Phones', to: MARKETPLACE_ROUTES.shop },
              { label: 'Compare' },
            ]}
          />
          <h1 className="mt-5 font-display text-3xl font-bold tracking-[-0.03em] text-ink sm:text-[2.5rem] sm:leading-[1.05]">
            Compare phones
          </h1>
          <p className="mt-3 max-w-2xl leading-body text-muted">
            Up to {COMPARE_LIMIT} phones side by side, read fresh from each listing. The
            stronger figure in a row is set in bold; which phone suits you is your call.
          </p>
        </Container>
      </div>

      <Container className="py-8 sm:py-10">
        {ids.length < 2 ? (
          <EmptyCompare count={ids.length} />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {ids.length} phones · {rows.filter((row) => !row.isSame).length} rows differ
              </p>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={differencesOnly}
                  onChange={(event) => setDifferencesOnly(event.target.checked)}
                  className="size-4 accent-ink"
                />
                Show differences only
              </label>
            </div>

            <div className="overflow-x-auto rounded-card-lg border border-line bg-card">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <caption className="sr-only">Phone comparison</caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-raised w-36 border-b border-line bg-card p-4 align-bottom text-xs font-semibold text-muted sm:w-44"
                    >
                      <span className="sr-only">Detail</span>
                    </th>
                    {columns.map((column) => (
                      <th
                        key={column.id}
                        scope="col"
                        className="border-b border-l border-line p-4 align-top font-normal"
                      >
                        <ColumnHead column={column} onRemove={() => removeId(column.id)} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, rowIndex) => (
                    <tr key={row.label}>
                      <th
                        scope="row"
                        className={`sticky left-0 z-raised bg-card px-4 py-3 align-top text-[13px] font-semibold text-muted ${
                          rowIndex > 0 && visibleRows[rowIndex - 1].group !== row.group
                            ? 'border-t border-line-2'
                            : 'border-t border-line'
                        }`}
                      >
                        {row.label}
                      </th>
                      {row.values.map((value, index) => (
                        <td
                          key={columns[index].id}
                          className={`border-l px-4 py-3 align-top text-ink ${
                            rowIndex > 0 && visibleRows[rowIndex - 1].group !== row.group
                              ? 'border-t border-t-line-2 border-l-line'
                              : 'border-t border-line'
                          } ${row.best === index ? 'font-bold' : ''}`}
                        >
                          {value ?? <span className="text-subtle">—</span>}
                          {row.best === index && <span className="sr-only"> (strongest in this row)</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {differencesOnly && visibleRows.length === 0 && (
              <p className="mt-4 text-sm text-muted">These phones match on every row shown.</p>
            )}
          </>
        )}
      </Container>
    </div>
  )
}

function ColumnHead({ column, onRemove }) {
  const listing = column.listing
  return (
    <div className="flex min-w-[10rem] flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        {listing ? (
          <DeviceThumb listing={listing} size="sm" />
        ) : (
          <div className="size-14 animate-pulse rounded-lg bg-well motion-reduce:animate-none" />
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={listing ? `Remove ${listing.brand} ${listing.model}` : 'Remove this phone'}
          className="grid size-8 shrink-0 place-items-center rounded-control text-muted transition-colors hover:bg-panel hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {column.status === 'loading' && <p className="text-sm text-muted">Loading…</p>}

      {column.status === 'gone' && (
        <div>
          <p className="text-sm font-bold text-ink">
            {listing ? `${listing.brand} ${listing.model}` : 'This phone'}
          </p>
          <p className="mt-1 text-sm text-muted">
            {listing?.status === 'SOLD' ? 'Sold since you picked it.' : 'No longer listed.'}
          </p>
        </div>
      )}

      {column.status === 'ready' && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {listing.brand}
          </p>
          <Link
            to={productPath(listing)}
            className="mt-1 block text-base font-bold leading-tight text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {listing.model}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ConditionBadge grade={listing.grade} size="sm" />
            {listing.seller?.verificationStatus === 'APPROVED' && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-700">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                Verified seller
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyCompare({ count }) {
  return (
    <div className="mx-auto max-w-xl rounded-card-lg border border-line bg-card p-8 text-center">
      <h2 className="text-xl font-bold text-ink">
        {count === 1 ? 'Pick one more phone' : 'Pick phones to compare'}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Tick “Compare” on up to {COMPARE_LIMIT} listing cards in the shop, then open the
        comparison from the bar at the bottom of the screen.
      </p>
      <ButtonLink to={MARKETPLACE_ROUTES.shop} variant="primary" className="mt-6">
        Browse phones
        <ArrowRight className="size-4" aria-hidden="true" />
      </ButtonLink>
    </div>
  )
}

