import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, MessageCircle, Repeat, ScanLine, Search, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../../features/auth/useAuth.js'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { boothLabel } from '../../content/site-info.js'
import { useSiteSettings } from '../../lib/site-settings.js'

const DONE_KEY = 'refon:tour-done'
const START_DELAY_MS = 1600

/**
 * The tour's stops. `target` is a selector to ring on screen when it is visible;
 * a stop whose target is hidden (the search box on a phone, for example) still
 * shows its card, just without the ring.
 */
const STEPS = [
  {
    icon: ShieldCheck,
    title: 'Welcome to ReFon',
    body: 'Second-hand phones, checked before they go on sale. Every listing shows its grade, battery health and warranty.',
  },
  {
    icon: Search,
    title: 'Find a phone',
    body: 'Search by model, or browse the shop and filter by price, grade and battery.',
    target: '[data-testid="navbar-search"]',
    link: { to: MARKETPLACE_ROUTES.shop, label: 'Open the shop' },
  },
  {
    icon: ScanLine,
    title: 'Check your own phone',
    body: 'The free health check tests your screen, speakers, sensors and battery right in the browser.',
    link: { to: MARKETPLACE_ROUTES.healthCheck, label: 'Try the health check' },
  },
  {
    icon: Repeat,
    title: 'Trade in your old phone',
    body: 'Six taps and you get an honest price range. Like it? Send it to us.',
    link: { to: MARKETPLACE_ROUTES.tradeIn, label: 'Price my phone' },
  },
  {
    icon: MessageCircle,
    title: 'Questions? Chat with us',
    body: (booth) => `This button reaches the team any time. Or visit us at ${boothLabel(booth)}.`,
    target: '[data-testid="chat-button"]',
  },
]

function readDone() {
  try {
    return window.localStorage.getItem(DONE_KEY) === 'yes'
  } catch {
    return true
  }
}

function markDone() {
  try {
    window.localStorage.setItem(DONE_KEY, 'yes')
  } catch {
    // Storage blocked: the tour simply shows again next visit.
  }
}

/** The ring's box: the target's on-screen rectangle, or null when it is not visible. */
function measure(selector) {
  if (!selector) return null
  const element = document.querySelector(selector)
  if (!element) return null
  const box = element.getBoundingClientRect()
  if (box.width === 0 || box.height === 0) return null
  if (box.bottom < 0 || box.top > window.innerHeight) return null
  return { top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }
}

/**
 * A five-stop welcome for a first-time visitor on the homepage.
 *
 * It waits a moment so the page settles, then shows a small card at the bottom
 * with a ring around the feature it describes. Skip or Done hides it for good on
 * this device. It never shows to a signed-in user, or to an automated browser,
 * so it cannot get in the way of the test suite.
 */
export function FirstVisitTour() {
  const { user } = useAuth()
  const { booth } = useSiteSettings()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [ring, setRing] = useState(null)

  const eligible = pathname === MARKETPLACE_ROUTES.home && !user && !navigator.webdriver

  useEffect(() => {
    if (!eligible || readDone()) return undefined
    const timer = window.setTimeout(() => setOpen(true), START_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [eligible])

  const current = STEPS[step]

  const place = useCallback(() => setRing(measure(current?.target)), [current])

  useLayoutEffect(() => {
    if (!open) return undefined
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, { passive: true })
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place)
    }
  }, [open, place])

  const close = useCallback(() => {
    markDone()
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowRight') setStep((value) => Math.min(STEPS.length - 1, value + 1))
      if (event.key === 'ArrowLeft') setStep((value) => Math.max(0, value - 1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!open || !eligible) return null

  const Icon = current.icon
  const last = step === STEPS.length - 1

  return (
    <>
      {ring && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[70] rounded-2xl ring-2 ring-accent transition-all duration-300 motion-reduce:transition-none"
          style={{ ...ring, boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)' }}
        />
      )}
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        data-testid="first-visit-tour"
        className="rf-rise fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[71] mx-auto max-w-md rounded-[24px] border border-line-2 bg-card p-5 shadow-pop lg:bottom-6"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Skip the tour"
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-muted hover:text-ink"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-page">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
              {step + 1} of {STEPS.length}
            </p>
            <h2 id="tour-title" className="mt-0.5 font-display text-lg font-bold text-ink">
              {current.title}
            </h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{typeof current.body === 'function' ? current.body(booth) : current.body}</p>
        {current.link && (
          <Link
            to={current.link.to}
            onClick={close}
            className="mt-2 inline-flex text-sm font-semibold text-accent hover:underline"
          >
            {current.link.label} →
          </Link>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((entry, index) => (
              <span
                key={entry.title}
                className={`h-1.5 rounded-full transition-all ${index === step ? 'w-5 bg-accent' : 'w-1.5 bg-line-2'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                aria-label="Previous"
                className="grid size-10 place-items-center rounded-full border border-line-2 text-ink hover:border-accent"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? close() : setStep(step + 1))}
              className="rf-bounce inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-bold text-page hover:bg-accent-hover"
            >
              {last ? 'Start exploring' : 'Next'}
              {!last && <ArrowRight className="size-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
