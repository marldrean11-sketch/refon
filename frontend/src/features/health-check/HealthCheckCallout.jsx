import { Link } from 'react-router-dom'
import { ArrowRight, Smartphone } from 'lucide-react'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

/**
 * Points a buyer at the self-test from the product page, beside the inspection
 * record it partly reproduces. The return terms quoted are the published ones:
 * seven days from delivery, and an undisclosed defect is a ground for return.
 */
export function HealthCheckCallout() {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-panel p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex gap-3">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-ink">Check it yourself when it arrives</p>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-ink/75">
            The phone health check runs in the phone’s own browser: screen, touch, speaker,
            microphone, cameras and sensors. If it finds a defect the listing didn’t mention,
            you have 7 days from delivery to return it.
          </p>
        </div>
      </div>
      <Link
        to={MARKETPLACE_ROUTES.healthCheck}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-control px-1 text-sm font-semibold text-ink underline decoration-line-2 underline-offset-4 transition-colors hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:self-center"
      >
        Open the health check
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  )
}
