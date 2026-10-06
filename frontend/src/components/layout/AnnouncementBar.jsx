import { useState } from 'react'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

/**
 * Announcement bar.
 *
 * A utility strip, not a banner. It is one line of monospace text on Obsidian
 * with a jade tick marking it as a verified claim, and it links to the inspection
 * page rather than to a promotion. Dismissal is per browser session so it never
 * nags on repeat visits.
 */
export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.sessionStorage.getItem('refon:announcement-dismissed') !== '1'
  })

  if (!isVisible) {
    return null
  }

  function dismiss() {
    window.sessionStorage.setItem('refon:announcement-dismissed', '1')
    setIsVisible(false)
  }

  return (
    <div className="relative bg-primary-950 text-primary-100">
      {/* `pl-12` rather than `pl-10`: the dismiss button is a 32px target inset
          12px from the edge, so it needs 44px of clearance. At 375px this message
          wraps to two lines, and at 40px the link ran underneath the button. */}
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2.5 py-2 pl-12 pr-12 text-center">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] sm:text-xs">
          <span className="mr-2 inline-block size-1.5 rounded-full bg-accent-400 align-middle" aria-hidden="true" />
          Every phone is tested and graded before it is listed.{' '}
          <Link
            to={MARKETPLACE_ROUTES.qualityCheck}
            className="text-white underline decoration-accent-400/60 underline-offset-4 transition hover:decoration-accent-300"
          >
            See exactly how we test
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-control text-primary-300 transition hover:bg-white/10 hover:text-white"
        aria-label="Dismiss announcement"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}