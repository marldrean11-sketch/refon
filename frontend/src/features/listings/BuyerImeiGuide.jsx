import { ChevronDown, ScanLine } from 'lucide-react'

/**
 * "Check it yourself before you pay": the four checks a buyer can do in person
 * in a minute, whatever the listing says. Collapsed by default so it does not
 * crowd the inspection results.
 */
export function BuyerImeiGuide({ imeiLast4 }) {
  const suffix = imeiLast4 ? `···${imeiLast4}` : null

  const steps = [
    {
      title: 'Dial *#06#',
      body: suffix
        ? `The IMEI on screen should end in ${suffix}, the same as this listing.`
        : 'The phone shows its 15-digit IMEI. Ask the seller for it before meeting.',
    },
    {
      title: 'Match the box and the SIM tray',
      body: 'The same number is printed on the box label and, on most phones, the SIM tray or Settings → About phone.',
    },
    {
      title: 'Make sure the lock is off',
      body: 'iPhone: Settings must show no Apple ID and Find My is off. Android: after a reset it must not ask for the previous Google account.',
    },
    {
      title: 'Ask your network',
      body: 'Globe, Smart or DITO can tell you if the IMEI was reported lost or stolen. Pay only when everything matches.',
    },
  ]

  return (
    <details
      data-testid="buyer-imei-guide"
      className="group mt-4 rounded-card border border-line bg-surface-2 open:border-accent/40"
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <ScanLine className="size-4 shrink-0 text-accent" aria-hidden="true" />
        Check the IMEI yourself before you pay
        <ChevronDown
          className="ml-auto size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <ol className="grid gap-3 px-4 pb-4">
        {steps.map((step) => (
          <li key={step.title} className="flex gap-3">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span className="text-sm leading-relaxed">
              <span className="font-semibold text-ink">{step.title}.</span>{' '}
              <span className="text-muted">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </details>
  )
}
