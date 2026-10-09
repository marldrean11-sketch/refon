import { Link } from 'react-router-dom'
import { formatPeso } from '../../lib/format.js'
import { getConditionGrade } from '../../lib/listing-taxonomy.js'
import { productPath } from '../../lib/routes.js'

/**
 * The ReFon Tag.
 *
 * One object that carries a phone's whole record: grade, measured battery,
 * checklist result, the seller's written notes, and the price. It is drawn as a
 * shop tag — chamfered top corners and a punch hole — because the tag is the
 * brand's signature, and a listing's proof reads as one verdict rather than as
 * four unrelated chips.
 *
 * Every figure comes from the listing object the API returns. Nothing here is
 * rounded up or filled in: a listing with no recorded inspection shows "Not
 * recorded" rather than a count it does not have.
 */
/**
 * Two tones of the same object. `tag` is the yellow tag on a light page; `night`
 * is the reversed tag for a yellow ground, where a yellow tag would disappear.
 */
const TONES = {
  tag: {
    surface: 'bg-tag text-night',
    rule: 'border-night/35',
    priceRule: 'border-night',
    track: 'bg-night/15',
    fill: 'bg-night',
    off: 'bg-night/20',
    ring: 'focus-visible:ring-night focus-visible:ring-offset-page',
  },
  night: {
    surface: 'bg-night text-white',
    rule: 'border-white/30',
    priceRule: 'border-tag',
    track: 'bg-white/20',
    fill: 'bg-tag',
    off: 'bg-white/20',
    ring: 'focus-visible:ring-night focus-visible:ring-offset-tag',
  },
}

export function RefonTag({ listing, tone = 'tag', className = '', tilt = true, linked = true }) {
  const palette = TONES[tone] ?? TONES.tag

  if (!listing) {
    return null
  }

  const grade = getConditionGrade(listing.grade)
  const battery = Number(listing.batteryPercent)
  const hasBattery = Number.isFinite(battery)
  const checks = Array.isArray(listing.inspectionChecks) ? listing.inspectionChecks.length : 0
  const total = Number(listing.inspectionTotal) || 0
  const savings = Number(listing.savings)
  const details = [listing.storage, listing.color, listing.year].filter(Boolean).join(' · ')

  const body = (
    <>
      <span aria-hidden="true" className="refon-tag-hole" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-[1.6rem] font-extrabold leading-none tracking-[-0.02em] [font-stretch:112%]">
            {listing.model}
          </p>
          {details ? <p className="mt-2 font-mono text-[12.5px] opacity-80">{details}</p> : null}
        </div>

        <span className="sr-only">
          Grade {grade.id}, {grade.label}
        </span>
        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 rotate-[8deg] place-items-center rounded-full border-[3px] border-current"
        >
          <span className="flex flex-col items-center gap-0.5">
            <span className="font-display text-[1.9rem] font-black leading-none [font-stretch:125%]">
              {grade.id}
            </span>
            <span className="font-mono text-[7px] font-semibold uppercase tracking-[0.1em]">Grade</span>
          </span>
        </span>
      </div>

      <dl className={`mt-5 grid gap-2.5 border-t-2 border-dashed ${palette.rule} pt-4 font-mono text-[13px]`}>
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2.5">
          <dt>Battery</dt>
          <dd className={`h-2.5 overflow-hidden rounded-[3px] ${palette.track}`}>
            {hasBattery ? (
              <span className={`block h-full ${palette.fill}`} style={{ width: `${Math.max(0, Math.min(100, battery))}%` }} />
            ) : null}
          </dd>
          <dd className="tabular-nums">{hasBattery ? `${battery}%` : '—'}</dd>
        </div>

        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2.5">
          <dt>Checks</dt>
          <dd className="flex gap-[3px]" aria-hidden="true">
            {Array.from({ length: total || 11 }, (_, index) => (
              <span
                key={index}
                className={`h-2.5 w-2 rounded-[2px] ${index < checks ? palette.fill : palette.off}`}
              />
            ))}
          </dd>
          <dd className="tabular-nums">
            {listing.inspectionRecorded && total ? `${checks}/${total}` : 'Not recorded'}
          </dd>
        </div>

        {listing.conditionNotes ? (
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2.5">
            <dt>Notes</dt>
            <dd className="line-clamp-2 font-sans text-[13.5px] leading-snug">{listing.conditionNotes}</dd>
          </div>
        ) : null}
      </dl>

      <div className={`mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t-2 ${palette.priceRule} pt-3`}>
        <span className="font-display text-[1.9rem] font-black tracking-[-0.02em] tabular-nums [font-stretch:112%]">
          {formatPeso(listing.price)}
        </span>
        {Number.isFinite(savings) && savings > 0 ? (
          <span className="font-mono text-xs tabular-nums">{formatPeso(savings)} under new</span>
        ) : null}
      </div>

      <p className="mt-2.5 font-mono text-[10.5px] uppercase tracking-[0.06em] opacity-75">
        Reviewed by ReFon · 7-day returns
      </p>
    </>
  )

  // The tag shape lives on an inner element: `clip-path` would also clip a focus
  // ring drawn on the same box, so the link around it carries the ring instead.
  const shape = (
    <div className={`refon-tag ${tilt ? 'refon-tag-tilt' : ''} ${palette.surface} px-6 pb-5 pt-9`}>{body}</div>
  )

  if (!linked) {
    return (
      <article
        data-testid="refon-tag"
        aria-label={`ReFon Tag for ${listing.brand} ${listing.model}`}
        className={`block w-full max-w-[26rem] ${className}`}
      >
        {shape}
      </article>
    )
  }

  return (
    <Link
      to={productPath(listing)}
      data-testid="refon-tag"
      className={`group block w-full max-w-[26rem] rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-4 ${palette.ring} ${className}`}
    >
      {shape}
      <span className="sr-only">View this phone</span>
    </Link>
  )
}
