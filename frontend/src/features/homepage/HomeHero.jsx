import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ScanLine } from 'lucide-react'
import { Container } from '../design/Container.jsx'
import { FloatingLoops } from '../../components/brand/FloatingLoops.jsx'
import { PhoneArtwork } from '../listings/PhoneArtwork.jsx'
import { isImageReference } from '../listings/image-reference.js'
import { getConditionGrade } from '../../lib/listing-taxonomy.js'
import { formatPeso } from '../../lib/format.js'
import { MARKETPLACE_ROUTES, productPath } from '../../lib/routes.js'
import { usePrefersReducedMotion } from '../../lib/motion.ts'

const GRADE_CHIP = {
  A: 'bg-grade-a text-page',
  B: 'bg-grade-b text-page',
  C: 'bg-grade-c text-page',
}

/** The listing's photograph, when a seller has uploaded a real one. */
function photoOf(listing) {
  const photo = listing?.mainPhoto ?? listing?.photos?.[0]
  return isImageReference(photo) ? photo : null
}

/**
 * Counts from 0 up to `target` once, so the battery bar fills on arrival.
 * Reduced motion skips straight to the figure.
 */
function useCountUp(target, reduced) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!Number.isFinite(target)) return undefined
    if (reduced) {
      const id = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(id)
    }

    let frame
    const start = performance.now()
    const duration = 800
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, reduced])

  return value
}

/**
 * The homepage hero.
 *
 * A dark band over the floating-loops background: one headline, one sentence,
 * two actions, and a live listing card on the right. The card tilts toward the
 * pointer and its battery bar fills on arrival; every figure on it (grade,
 * battery, checks, warranty, price) is the API's value for that listing, so the
 * hero can never advertise a phone that is gone or a price that has moved.
 */
export function HomeHero({ listings = [], featured = [] }) {
  const reduced = usePrefersReducedMotion()
  const listing = featured[0] ?? listings[0] ?? null
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const sectionRef = useRef(null)

  const battery = Number(listing?.batteryPercent)
  const shownBattery = useCountUp(battery, reduced)
  const grade = listing ? getConditionGrade(listing.grade) : null
  const checks = Array.isArray(listing?.inspectionChecks) ? listing.inspectionChecks.length : 0
  const total = Number(listing?.inspectionTotal) || 0
  const photo = photoOf(listing)

  function onPointerMove(event) {
    if (reduced || event.pointerType !== 'mouse') return
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return
    const nx = (event.clientX - rect.left) / rect.width - 0.5
    const ny = (event.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: +(-ny * 12).toFixed(1), y: +(nx * 20).toFixed(1) })
  }

  return (
    <section
      ref={sectionRef}
      aria-label="Featured"
      onPointerMove={onPointerMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative overflow-hidden border-b border-line bg-page"
    >
      <FloatingLoops />

      <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:py-28">
        <div className="flex flex-col items-start gap-7">
          <span className="rf-rise inline-flex items-center gap-2 rounded-full border border-line-2 bg-page/60 px-4 py-2 font-mono text-[12px] uppercase tracking-[0.14em] text-accent backdrop-blur">
            2015–2024 phones · graded · battery measured
          </span>

          <h1 className="rf-rise-2 font-display text-[clamp(2.6rem,6vw,5.25rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-ink">
            Pre-loved phones.
            <br />
            <span className="text-accent">Tested in the open.</span>
          </h1>

          <p className="rf-rise-3 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
            Sulit na, legit pa. Every listing shows its grade, its real battery health and
            all 11 inspection checks before you pay a peso.
          </p>

          <div className="rf-rise-3 flex flex-wrap gap-3">
            <Link
              to={MARKETPLACE_ROUTES.shop}
              className="rf-bounce inline-flex min-h-14 items-center gap-2 rounded-full bg-accent px-7 text-[16px] font-semibold text-page hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
            >
              Shop tested phones
              <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden="true" />
            </Link>
            <Link
              to={MARKETPLACE_ROUTES.healthCheck}
              className="rf-bounce inline-flex min-h-14 items-center gap-2 rounded-full border border-line-2 bg-page/60 px-7 text-[16px] font-medium text-ink backdrop-blur hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ScanLine className="size-4" strokeWidth={2} aria-hidden="true" />
              Check my own phone
            </Link>
          </div>
        </div>

        <div className="flex justify-center [perspective:1000px] lg:justify-end">
          {listing ? (
            <Link
              to={productPath(listing)}
              data-testid="hero-panel"
              className="block w-full max-w-[380px] rounded-[32px] border border-line-2 bg-card/90 p-5 shadow-2xl backdrop-blur transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
            >
              <div className="overflow-hidden rounded-[22px] bg-well">
                {photo ? (
                  <img src={photo} alt="" className="aspect-[4/3.4] w-full object-cover" />
                ) : (
                  <div className="rf-float">
                    <PhoneArtwork
                      brand={listing.brand}
                      model={listing.model}
                      color={listing.color}
                      batteryPercent={listing.batteryPercent}
                      className="aspect-[4/3.4]"
                      showLabel={false}
                    />
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[19px] font-semibold text-ink">
                    {listing.brand} {listing.model}
                  </p>
                  <p className="text-sm text-subtle">
                    {[listing.storage, listing.color].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {grade && (
                  <span
                    data-testid="hero-chip"
                    className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold ${GRADE_CHIP[grade.id] ?? GRADE_CHIP.C}`}
                  >
                    Grade {grade.id}
                  </span>
                )}
              </div>

              {Number.isFinite(battery) && (
                <div className="mt-4">
                  <div className="flex justify-between font-mono text-[12px] uppercase tracking-[0.1em]">
                    <span className="text-subtle">Battery health</span>
                    <span className="text-accent">{shownBattery}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Battery health"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={battery}
                    className="mt-2 h-2 overflow-hidden rounded-full bg-line"
                  >
                    <div
                      className="h-full w-full origin-left rounded-full bg-accent"
                      style={{ transform: `scaleX(${shownBattery / 100})` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2 font-mono">
                <div className="rounded-2xl bg-well px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-subtle">Checks</p>
                  <p className="text-lg text-ink">
                    {listing.inspectionRecorded && total ? `${checks}/${total}` : 'Not recorded'}
                  </p>
                </div>
                <div className="rounded-2xl bg-well px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-subtle">Warranty</p>
                  <p className="text-lg text-ink">{listing.warrantyMonths ? `${listing.warrantyMonths} months` : 'None'}</p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="font-display text-[28px] font-bold tracking-[-0.02em] text-ink">
                  {formatPeso(listing.price)}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                  View phone
                  <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ) : (
            <div data-testid="hero-panel" className="h-[520px] w-full max-w-[380px] animate-pulse rounded-[32px] border border-line bg-card/70" />
          )}
        </div>
      </Container>
    </section>
  )
}
