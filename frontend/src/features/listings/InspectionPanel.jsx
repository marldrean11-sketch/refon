import { imeiStatus } from '../../lib/imei.js'
import { BuyerImeiGuide } from './BuyerImeiGuide.jsx'
import { CheckCircle2, CircleDashed, ShieldCheck } from 'lucide-react'
import { INSPECTION_CHECKS } from '../../lib/listing-taxonomy.js'

/**
 * Inspection results for one device.
 *
 * Three states, deliberately distinguished. "Recorded" shows the checks that
 * passed on this phone. "Not recorded" says the seller has not captured results
 * yet, which is different from "recorded but incomplete" — collapsing the two
 * would imply a device passed checks nobody ran.
 *
 * Typeset as a two-column checklist with a status mark per row, because that is
 * what it is: a list of eleven checks and whether each one has an outcome. The
 * previous version gave every row a rounded tinted panel, which made eleven rows
 * of equal weight look like eleven separate facts rather than one record.
 */
export function InspectionPanel({ listing }) {
  const passed = new Set(listing.inspectionChecks ?? [])
  const hasRecord = Boolean(listing.inspectionRecorded)
  const isComplete = Boolean(listing.inspectionComplete)

  const stateTone = !hasRecord
    ? 'border-flare-300 bg-flare-50 text-flare-900'
    : isComplete
      ? 'border-accent-300 bg-accent-50 text-accent-900'
      : 'border-flare-300 bg-flare-50 text-flare-900'

  return (
    <section
      aria-labelledby="inspection-heading"
      className="rounded-card border border-line bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-5 sm:px-6">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
            Inspection record
          </p>
          <h2
            id="inspection-heading"
            className="mt-1.5 font-display text-xl font-bold tracking-tight text-ink"
          >
            11-point quality inspection
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            {hasRecord
              ? `${passed.size} of ${listing.inspectionTotal} checks recorded on this device`
              : 'No inspection results recorded for this device yet'}
          </p>
        </div>

        {/* Three distinct badges, because three different situations. A device
            with no record must never look like a device that passed. */}
        {!hasRecord && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ring-1 ring-inset ${stateTone}`}
          >
            <CircleDashed className="size-3.5" aria-hidden="true" />
            Not recorded
          </span>
        )}
        {hasRecord && isComplete && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ring-1 ring-inset ${stateTone}`}
          >
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Full inspection
          </span>
        )}
        {hasRecord && !isComplete && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ring-1 ring-inset ${stateTone}`}
          >
            <CircleDashed className="size-3.5" aria-hidden="true" />
            Incomplete
          </span>
        )}
      </div>

      <div className="px-5 py-5 sm:px-6">
        {!hasRecord ? (
          <div className="rounded-control border border-flare-300 bg-flare-50 p-4">
            <p className="flex gap-3 text-sm leading-body text-flare-900">
              <CircleDashed className="mt-0.5 size-5 shrink-0 text-flare-700" aria-hidden="true" />
              <span>
                This listing has not recorded its inspection results yet. Ask the seller for
                the specific check results, or browse listings that have.
              </span>
            </p>
          </div>
        ) : (
          <>
            <ul className="grid gap-x-8 sm:grid-cols-2">
              {INSPECTION_CHECKS.map((check) => {
                const didPass = passed.has(check.id)

                return (
                  <li
                    key={check.id}
                    className="flex items-start gap-2.5 border-b border-line py-2.5"
                  >
                    {didPass ? (
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-accent-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <CircleDashed
                        className="mt-0.5 size-4 shrink-0 text-subtle"
                        aria-hidden="true"
                      />
                    )}
                    <span className="min-w-0">
                      <span
                        className={`block text-[13px] font-semibold ${
                          didPass ? 'text-ink' : 'text-muted'
                        }`}
                      >
                        {check.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-subtle">
                        {check.detail}
                      </span>
                    </span>
                    {/* A missing check reads as "not recorded", never as a failure —
                        the seller may simply not have run it yet. */}
                    <span className="sr-only">{didPass ? 'Passed' : 'Not recorded'}</span>
                  </li>
                )
              })}
            </ul>

            {!isComplete && (
              <p className="mt-4 text-xs leading-relaxed text-muted">
                {listing.inspectionTotal - passed.size} of {listing.inspectionTotal} checks have
                no recorded result for this device. Unrecorded is not the same as failed — it
                means nobody has logged an outcome yet. Ask the seller before you buy.
              </p>
            )}
          </>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {imeiStatus(listing).state === 'verified' ? (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-surface-2 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink ring-1 ring-inset ring-accent-300">
              <ShieldCheck className="size-3.5 text-accent-600" aria-hidden="true" />
              {imeiStatus(listing).label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-surface-2 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted ring-1 ring-inset ring-line-2">
              <CircleDashed className="size-3.5" aria-hidden="true" />
              {imeiStatus(listing).label}
            </span>
          )}
        </div>
        <BuyerImeiGuide imeiLast4={listing.imeiLast4} />
      </div>
    </section>
  )
}