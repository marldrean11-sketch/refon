import { CheckCircle2, CircleDashed, ShieldCheck } from 'lucide-react'
import { INSPECTION_CHECKS } from '../../lib/listing-taxonomy.js'

/**
 * Inspection results for one device.
 *
 * Three states, deliberately distinguished. "Recorded" shows the checks that
 * passed on this phone. "Not recorded" says the seller has not captured results
 * yet, which is different from "recorded but incomplete" — collapsing the two
 * would imply a device passed checks nobody ran.
 */
export function InspectionPanel({ listing }) {
  const passed = new Set(listing.inspectionChecks ?? [])
  const hasRecord = Boolean(listing.inspectionRecorded)
  const isComplete = Boolean(listing.inspectionComplete)

  return (
    <section
      aria-labelledby="inspection-heading"
      className="rounded-card border border-line bg-white p-6 shadow-card sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="inspection-heading"
            className="font-display text-xl font-semibold text-ink"
          >
            11-point quality inspection
          </h2>
          <p className="mt-1 text-sm text-muted">
            {hasRecord
              ? `${passed.size} of ${listing.inspectionTotal} checks recorded on this device`
              : 'No inspection results recorded for this device yet'}
          </p>
        </div>

        {/* Three distinct badges, because three different situations. A device
            with no record must never look like a device that passed. */}
        {!hasRecord && (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 ring-1 ring-inset ring-amber-200">
            <CircleDashed className="size-3.5" aria-hidden="true" />
            Not recorded
          </span>
        )}
        {hasRecord && isComplete && (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-50 px-3 py-1.5 text-xs font-bold text-accent-800 ring-1 ring-inset ring-accent-200">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Full inspection
          </span>
        )}
        {hasRecord && !isComplete && (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 ring-1 ring-inset ring-amber-200">
            <CircleDashed className="size-3.5" aria-hidden="true" />
            Incomplete
          </span>
        )}
      </div>

      {!hasRecord ? (
        <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <CircleDashed className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-amber-900">
            This listing has not recorded its inspection results yet. Ask the seller for
            the specific check results, or browse listings that have.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {INSPECTION_CHECKS.map((check) => {
              const didPass = passed.has(check.id)

              return (
                <li
                  key={check.id}
                  className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 ${
                    didPass ? 'bg-accent-50' : 'bg-canvas'
                  }`}
                >
                  {didPass ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-700" aria-hidden="true" />
                  ) : (
                    <CircleDashed className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
                  )}
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-semibold ${
                        didPass ? 'text-accent-950' : 'text-muted'
                      }`}
                    >
                      {check.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
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

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5 text-xs">
        {listing.imeiVerified ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary-50 px-2.5 py-1 font-bold text-primary-800 ring-1 ring-inset ring-primary-200">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            IMEI verified
            {listing.imeiLast4 ? ` ····${listing.imeiLast4}` : ''}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-canvas px-2.5 py-1 font-bold text-muted ring-1 ring-inset ring-line">
            <CircleDashed className="size-3.5" aria-hidden="true" />
            IMEI not verified
          </span>
        )}
      </div>
    </section>
  )
}
