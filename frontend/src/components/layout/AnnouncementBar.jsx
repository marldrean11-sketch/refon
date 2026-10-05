import { useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'

/**
 * Announcement bar.
 *
 * Dismissible per browser session so it never nags on repeat visits, and the
 * message links to the warranty page rather than to a dead promo.
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
    <div className="relative bg-primary-950 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-10 py-2.5 text-center">
        <Megaphone className="hidden size-4 shrink-0 text-accent-400 sm:block" aria-hidden="true" />
        <p className="text-xs font-semibold leading-relaxed sm:text-[13px]">
          Every phone is tested and graded before it is listed.{' '}
          <Link
            to={MARKETPLACE_ROUTES.qualityCheck}
            className="underline decoration-accent-400/60 underline-offset-2 transition hover:text-accent-300"
          >
            See exactly how we test
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-primary-200 transition hover:bg-white/10 hover:text-white"
        aria-label="Dismiss announcement"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
