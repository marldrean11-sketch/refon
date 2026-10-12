import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Maximize2, X } from 'lucide-react'
import QRCode from 'qrcode'
import { BrandMark } from '../components/ui/BrandMark.jsx'
import { FloatingLoops } from '../components/brand/FloatingLoops.jsx'
import { ConditionBadge } from '../components/ui/ConditionBadge.jsx'
import { SITE_INFO, boothLabel } from '../content/site-info.js'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'
import { CONDITION_GRADE_ORDER, getConditionGrade } from '../lib/listing-taxonomy.js'
import { checkedTodayLabel, useHealthCheckStats } from '../features/health-check/health-check-stats.js'

/** How long each slide stays up on the booth screen. */
const SLIDE_MS = 7000

const SLIDES = [
  {
    id: 'check',
    eyebrow: 'Free at the booth',
    title: 'Check mo muna.',
    body: 'Scan the code and test the phone in your hand: screen, touch, speaker, mic, cameras and sensors in 2 minutes.',
  },
  {
    id: 'trade',
    eyebrow: 'Trade-in estimate',
    title: "Magkano kaya 'yan?",
    body: 'Pick your model, storage, condition and battery. See an estimate range in seconds.',
  },
  {
    id: 'grades',
    eyebrow: 'Graded in the open',
    title: 'A, B or C. Walang tinatago.',
    body: 'Every phone gets a published grade, a measured battery reading and an 11-point checklist.',
  },
  {
    id: 'pop',
    eyebrow: 'Pop challenge',
    title: 'Pop 10 loops.',
    body: 'Tap the floating loops on the ReFon site. Pop 10 to unlock the Loop Master badge, then show it here for a treat.',
  },
]

const CODES = [
  { id: 'health', label: 'Check your phone', path: MARKETPLACE_ROUTES.healthCheck },
  { id: 'trade', label: 'Trade-in estimate', path: MARKETPLACE_ROUTES.tradeIn },
  { id: 'feedback', label: 'Rate ReFon', path: MARKETPLACE_ROUTES.feedback },
]

/** QR codes as SVG markup, keyed by id. Drawn locally from the public address. */
function useQrCodes() {
  const [codes, setCodes] = useState({})

  useEffect(() => {
    let cancelled = false
    Promise.all(
      CODES.map((code) =>
        QRCode.toString(`${SITE_INFO.url}${code.path}`, {
          type: 'svg',
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#0a0b0d', light: '#ffffff' },
        }).then((svg) => [code.id, svg]),
      ),
    )
      .then((entries) => !cancelled && setCodes(Object.fromEntries(entries)))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return codes
}

/**
 * The booth big-screen mode at /kiosk: slides that rotate on their own, the live
 * "phones checked today" count and three QR codes. Nothing needs a click, so it
 * can run unattended on a TV or laptop for the whole fair.
 */
export function KioskPage() {
  const [index, setIndex] = useState(0)
  const stats = useHealthCheckStats()
  const codes = useQrCodes()
  const slide = SLIDES[index]

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % SLIDES.length), SLIDE_MS)
    return () => window.clearInterval(timer)
  }, [])

  function enterFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {})
  }

  return (
    <div data-testid="kiosk" className="relative flex min-h-screen flex-col overflow-hidden bg-page text-ink lg:h-screen">
      <FloatingLoops legend />

      <header className="relative z-10 flex items-center justify-between gap-4 px-6 pt-[3vh] lg:px-12">
        {/* Tapping the logo plays the spin and confetti but keeps the booth screen
            on the kiosk; the ✕ button is the way out. */}
        <BrandMark
          glyphClassName="size-12"
          wordmarkSize="text-3xl"
          className="gap-3"
          onClick={(event) => event.preventDefault()}
        />
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-line-2 px-4 py-2 font-mono text-sm uppercase tracking-[0.1em] text-muted">
            {boothLabel()}
          </span>
          <button
            type="button"
            onClick={enterFullscreen}
            className="grid size-11 place-items-center rounded-full border border-line-2 text-muted hover:border-accent hover:text-accent"
            aria-label="Full screen"
          >
            <Maximize2 className="size-4" aria-hidden="true" />
          </button>
          <Link
            to={MARKETPLACE_ROUTES.home}
            className="grid size-11 place-items-center rounded-full border border-line-2 text-muted hover:border-accent hover:text-accent"
            aria-label="Exit kiosk mode"
          >
            <X className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 grid flex-1 items-center gap-10 px-6 py-[3vh] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:px-12">
        <section aria-live="polite" aria-atomic="true">
          {/* A new key replays the entrance animation on every slide. */}
          <div key={slide.id} className="rf-rise">
            <p className="font-mono text-[clamp(0.85rem,1.8vh,1.1rem)] uppercase tracking-[0.16em] text-accent">{slide.eyebrow}</p>
            <h1 className="mt-[1.5vh] font-display text-[clamp(2.5rem,min(8.5vh,6vw),7rem)] font-extrabold leading-[1.02] tracking-[-0.04em]">
              {slide.title}
            </h1>
            <p className="mt-[2.5vh] max-w-2xl text-[clamp(1.05rem,2.6vh,1.6rem)] leading-snug text-muted">{slide.body}</p>
            {slide.id === 'grades' && (
              <div className="mt-[3vh] flex flex-wrap gap-3">
                {CONDITION_GRADE_ORDER.map((grade) => (
                  <span key={grade} className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
                    <ConditionBadge grade={grade} size="lg" />
                    <span className="text-base text-muted">{getConditionGrade(grade).summary}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-[4vh] flex gap-2" aria-hidden="true">
            {SLIDES.map((item, i) => (
              <span key={item.id} className="h-1.5 w-12 overflow-hidden rounded-full bg-line-2">
                {i === index && <span key={index} className="rf-kiosk-progress block h-full rounded-full bg-accent" />}
                {i < index && <span className="block h-full rounded-full bg-accent/50" />}
              </span>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          {checkedTodayLabel(stats) && (
            <p data-testid="kiosk-checked-today" className="rounded-3xl border border-accent/40 bg-card px-6 py-[2vh]">
              {stats.today === 0 ? (
                <span className="block font-display text-[clamp(1.5rem,4vh,2.5rem)] font-extrabold text-accent">
                  {checkedTodayLabel(stats)}
                </span>
              ) : (
                <>
                  <span className="block font-display text-[clamp(2.5rem,7vh,4.5rem)] font-extrabold leading-none text-accent">{stats.today}</span>
                  <span className="mt-1 block text-xl text-muted">
                    {stats.today === 1 ? 'phone' : 'phones'} checked at ReFon today
                  </span>
                </>
              )}
            </p>
          )}
          <ul className="grid grid-cols-3 gap-4">
            {CODES.map((code) => (
              <li key={code.id} className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-card p-4 text-center">
                <div
                  className="aspect-square w-full max-w-[24vh] overflow-hidden rounded-xl bg-[#ffffff] [&>svg]:size-full"
                  role="img"
                  aria-label={`QR code: ${code.label}`}
                  // Generated locally by `qrcode` from the site's own address.
                  dangerouslySetInnerHTML={{ __html: codes[code.id] ?? '' }}
                />
                <span className="font-display text-[clamp(0.85rem,2vh,1.1rem)] font-bold leading-tight">{code.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="relative z-10 px-6 pb-[2.5vh] font-mono text-sm text-subtle lg:px-12">
        {SITE_INFO.credits}
      </footer>
    </div>
  )
}
