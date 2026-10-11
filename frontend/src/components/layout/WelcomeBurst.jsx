import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LogoGlyph } from '../ui/BrandMark.jsx'
import { Confetti } from '../ui/Confetti.jsx'

const KEY = 'refon:celebrate'

const MESSAGES = {
  login: 'Welcome back!',
  register: 'Welcome to ReFon!',
}

/**
 * Called by sign-in and sign-up just before they navigate away. The burst plays
 * on the page the visitor lands on, because the auth pages redirect a signed-in
 * user immediately and would never get to show it themselves.
 */
export function celebrateNextPage(kind) {
  try {
    window.sessionStorage.setItem(KEY, kind)
  } catch {
    // Private mode or blocked storage: the celebration is a nicety, skip it.
  }
  // The landing page may already be mounted: signing in can redirect before the
  // form's own navigation runs. Tell a mounted burst directly.
  window.dispatchEvent(new Event(KEY))
}

/**
 * The welcome pop: the Loop spins in a lime pill with confetti, then fades. It
 * is a status message, so it is announced politely and never takes focus.
 */
export function WelcomeBurst() {
  const { pathname } = useLocation()
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let hide = 0

    function consume() {
      let kind = null
      try {
        kind = window.sessionStorage.getItem(KEY)
        if (kind) window.sessionStorage.removeItem(KEY)
      } catch {
        kind = null
      }
      if (!kind || !MESSAGES[kind]) return
      setMessage(MESSAGES[kind])
      window.clearTimeout(hide)
      hide = window.setTimeout(() => setMessage(null), 2200)
    }

    const first = requestAnimationFrame(consume)
    window.addEventListener(KEY, consume)
    return () => {
      cancelAnimationFrame(first)
      window.removeEventListener(KEY, consume)
      window.clearTimeout(hide)
    }
  }, [pathname])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-24 z-toast flex justify-center">
      {message && (
        <div
          data-testid="welcome-burst"
          className="rf-rise relative flex items-center gap-3 rounded-full bg-accent py-2 pl-2 pr-5 text-[15px] font-semibold text-page shadow-pop"
        >
          <Confetti active burstKey={message} />
          <LogoGlyph className="size-9" inverse draw={false} loading />
          {message}
        </div>
      )}
    </div>
  )
}
