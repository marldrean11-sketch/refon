import {
  BatteryCharging,
  CheckCircle2,
  CircleDashed,
  ScanLine,
  ShieldCheck,
  Undo2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { RETURN_WINDOW_DAYS } from '../../content/policy-content.js'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

/**
 * What ReFon publishes about this phone, and what happens if it goes wrong.
 *
 * Written to answer the five objections a buyer of a used phone actually has,
 * with each answer tied to a specific artefact on this page. Every row states
 * this device's real state — "not recorded" where nothing was captured — so the
 * reassurance cannot imply a check that did not happen.
 */
export function TrustSummary({ listing }) {
  const hasWarranty = Number(listing.warrantyMonths ?? 0) > 0
  const isVerifiedSeller = listing.seller?.verificationStatus === 'APPROVED'
  const inspectionRecorded = Boolean(listing.inspectionRecorded)

  const rows = [
    {
      icon: ShieldCheck,
      title: 'Condition graded, not guessed',
      body: `This device is graded ${listing.grade}${
        listing.gradeLabel ? ` — ${listing.gradeLabel}` : ''
      }. Every tier of the scale is explained below so you can see exactly what the letter means.`,
    },
    {
      icon: BatteryCharging,
      title: `Battery health measured at ${listing.batteryPercent}%`,
      body:
        listing.batteryPercent >= 90
          ? 'At or above 90% measured capacity, which is where most buyers consider a cell still effectively new.'
          : 'Measured against a new cell. A lower reading is reflected in the price rather than hidden in the description.',
    },
    {
      icon: inspectionRecorded ? CheckCircle2 : CircleDashed,
      title: inspectionRecorded
        ? `${listing.inspectionChecks.length}-point inspection recorded on this device`
        : 'Inspection results not recorded for this device',
      body: inspectionRecorded
        ? 'Display, touchscreen, cameras, speaker, microphone, charging, battery, Wi-Fi, Bluetooth, buttons, and biometrics are listed individually above.'
        : 'This seller has not captured the checklist for this unit. Ask them for the results, or filter the catalog to devices that have them.',
    },
    {
      icon: ScanLine,
      title: listing.imeiVerified ? 'IMEI verified' : 'IMEI verification not recorded',
      body: listing.imeiVerified
        ? `The device identifier was checked against GSMA records. Only the last four digits (···${listing.imeiLast4 ?? '—'}) are retained, which is enough to confirm the phone is not blacklisted.`
        : 'No IMEI check has been recorded for this unit. Ask the seller to confirm the device is not blacklisted or stolen.',
    },
    {
      icon: ShieldCheck,
      title: hasWarranty
        ? `${listing.warrantyMonths}-month ReFon warranty`
        : 'This device is sold without a warranty',
      body: hasWarranty
        ? 'Manufacturing defects in normal use are covered for the stated term, measured from delivery. What it excludes is set out in full in the policy.'
        : 'No warranty term is attached to this listing, and the price reflects that. The 7-day return window still applies.',
      link: hasWarranty ? { to: MARKETPLACE_ROUTES.warranty, label: 'Read the warranty policy' } : null,
    },
    {
      icon: Undo2,
      title: `${RETURN_WINDOW_DAYS}-day return window`,
      body: 'If the phone arrives materially different from its listing — wrong grade, undisclosed defect, or battery health far below the published figure — you can start a return.',
      link: { to: MARKETPLACE_ROUTES.returns, label: 'Read the returns policy' },
    },
    {
      icon: ShieldCheck,
      title: isVerifiedSeller ? 'Verified seller' : 'Seller verification in progress',
      body: isVerifiedSeller
        ? 'This seller has completed ReFon identity and business verification, and each listing is reviewed by a moderator before it goes live.'
        : 'This seller has not completed verification. Ask questions before sending any payment, and keep all messages on ReFon.',
    },
  ]

  return (
    <section
      aria-labelledby="trust-summary-heading"
      className="rounded-card border border-line bg-white p-6 shadow-card sm:p-7"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
        Buying with confidence
      </p>
      <h2
        id="trust-summary-heading"
        className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink"
      >
        What ReFon publishes about this phone
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Every claim below comes from this listing's record. Where something has not been
        captured, it says so rather than assuming the best.
      </p>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2">
        {rows.map((row) => (
          <li key={row.title} className="flex gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
              <row.icon className="size-4.5" style={{ width: 18, height: 18 }} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">{row.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{row.body}</p>
              {row.link && (
                <Link
                  to={row.link.to}
                  className="mt-1.5 inline-flex text-xs font-bold text-primary-700 underline underline-offset-2 hover:text-primary-500"
                >
                  {row.link.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}