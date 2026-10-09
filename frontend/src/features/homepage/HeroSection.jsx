/**
 * The hero.
 *
 * A rounded panel on the warm page ground, holding a statement on the left and the
 * currently-featured phone's published measurements on the right.
 *
 * **Two plates, chosen by the inventory.** The seed listings carry no
 * photographs (`prisma/seed-data.js` explains why), so by default the right-hand
 * side is a **typographic plate** built from the listing's real fields — grade,
 * battery, warranty, price, the saving against the original.
 *
 * Once at least `PHOTO_SLIDES_MIN` featured listings have a real photo, the
 * carousel switches to a **photo plate** and shows only those listings: the phone
 * in a 4:5 frame with a caption card holding model, grade and price. Mixing photo
 * slides with text slides in one carousel reads as a broken page, so it is all of
 * one or all of the other.
 *
 * The headline masks and reveals line by line; the plate parallaxes at two speeds
 * on scroll and leans with the pointer; two chips drift on a 4s loop. All of it
 * is transform and opacity only, and all of it is inert under reduced motion.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BatteryFull, ShieldCheck } from 'lucide-react'
import { Container } from '../design/Container.jsx'
import { ConditionBadge } from '../../components/ui/ConditionBadge.jsx'
import { PriceDisplay } from '../../components/ui/PriceDisplay.jsx'
import { isImageReference } from '../listings/image-reference.js'
import { MARKETPLACE_ROUTES, productPath } from '../../lib/routes.js'
import { getConditionGrade } from '../../lib/listing-taxonomy.js'
import {
  durations,
  easings,
  maskReveal,
  usePrefersReducedMotion,
} from '../../lib/motion.ts'
import { HERO_HEADLINE, HERO_SUBTEXT } from '../../content/home-content.js'
import { useHeroCarousel, useHeroParallax, useMagneticPull } from './use-hero-motion.js'

/** Parallax needs a pointer to read against, so it starts at the `lg` breakpoint. */
const PARALLAX_MIN_WIDTH = 1024

/** How far a chip drifts on its loop. Small enough to read as breathing. */
const CHIP_TRAVEL = 6

/** At most five plates; past that the panel stops being a hero and starts a grid. */
const MAX_SLIDES = 5

/** Featured listings with a real photo needed before the hero shows photographs. */
const PHOTO_SLIDES_MIN = 3

function photoOf(listing) {
  const photo = listing?.mainPhoto ?? listing?.photos?.[0]

  return isImageReference(photo) ? photo : null
}

export function HeroSection({ featured = [] }) {
  const reducedMotion = usePrefersReducedMotion()
  const [isWide, setIsWide] = useState(false)

  // A media query rather than a Tailwind class, because this switches a JavaScript
  // effect off and there is no way to do that from CSS.
  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${PARALLAX_MIN_WIDTH}px)`)

    const apply = () => setIsWide(query.matches)

    apply()
    query.addEventListener('change', apply)

    return () => query.removeEventListener('change', apply)
  }, [])

  const { slides, withPhotos } = useMemo(() => {
    const photographed = featured.filter(photoOf)

    return photographed.length >= PHOTO_SLIDES_MIN
      ? { slides: photographed.slice(0, MAX_SLIDES), withPhotos: true }
      : { slides: featured.slice(0, MAX_SLIDES), withPhotos: false }
  }, [featured])
  const carousel = useHeroCarousel(slides.length)
  const current = slides[carousel.index] ?? null

  return (
    <section aria-label="Featured phones" className="bg-page pb-4 pt-4 lg:pb-6 lg:pt-6">
      <Container size="full" className="px-4 sm:px-6 lg:px-8">
        <HeroPanel
          current={current}
          withPhotos={withPhotos}
          carousel={carousel}
          reduced={reducedMotion}
          parallax={isWide && !reducedMotion}
        />

        {slides.length > 1 ? (
          <HeroControls slides={slides} carousel={carousel} index={carousel.index} />
        ) : null}
      </Container>
    </section>
  )
}

/**
 * The panel shell.
 *
 * Owns the pause-on-hover-and-focus region and the two parallax layers. Pause is
 * bound to `focusCapture`/`blurCapture` rather than to the dots individually so
 * that tabbing into the panel anywhere — including onto the price link — stops the
 * carousel rather than only stopping it while a dot happens to be focused.
 */
function HeroPanel({ current, withPhotos, carousel, reduced, parallax }) {
  const { setLayer } = useHeroParallax({ enabled: parallax })

  return (
    <div
      data-testid="hero-panel"
      data-parallax={parallax ? 'on' : 'off'}
      onPointerEnter={carousel.pause}
      onPointerLeave={carousel.resume}
      onFocusCapture={carousel.pause}
      onBlurCapture={carousel.resume}
      className="relative overflow-hidden rounded-card-lg border border-line bg-panel"
    >
      <div className="grid gap-10 px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] lg:gap-14 lg:px-14 lg:py-16">
        <div className="min-w-0">
          <HeroEyebrow reduced={reduced} />

          <h1 className="mt-7 text-[2.75rem] font-bold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[3.5rem] lg:text-[4.25rem] xl:text-[5rem]">
            {HERO_HEADLINE.map((line, lineIndex) => (
              <MaskedLine key={lineIndex} line={line} reduced={reduced} index={lineIndex} />
            ))}
          </h1>

          <motion.p
            {...enter(3, reduced)}
            className="mt-7 max-w-xl text-base leading-body text-ink/75 sm:text-lg"
          >
            {HERO_SUBTEXT}
          </motion.p>

          <HeroActions reduced={reduced} />
        </div>

        {/*
          The far layer drifts a third as fast as the near one. Two layers at two
          speeds read as depth; one layer reads as the panel sliding.
        */}
        <div ref={setLayer('far')} className="relative min-h-[20rem] lg:min-h-0">
          <div ref={setLayer('near')} className="flex h-full flex-col justify-center">
            <AnimatePresence mode="wait" initial={false}>
              {current ? (
                <motion.div
                  key={current.id}
                  data-testid="hero-plate"
                  data-listing={current.id}
                  initial={reduced ? false : { opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0, scale: 0.99 }}
                  transition={{
                    duration: reduced ? 0 : durations.standard,
                    ease: easings.ui,
                  }}
                >
                  {withPhotos ? (
                    <HeroPhotoPlate listing={current} reduced={reduced} />
                  ) : (
                    <HeroPlate listing={current} reduced={reduced} />
                  )}
                </motion.div>
              ) : (
                <HeroPlatePlaceholder key="placeholder" />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

/** The shared entrance for the two pieces of copy under the headline. */
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: durations.standard } },
}

/** Seconds between each element in the hero's reveal. */
const HERO_STEP = 0.07

/**
 * Seconds between headline lines.
 *
 * Double the default `staggerStep`, and deliberately so. The hero easing is
 * `[0.22, 1, 0.36, 1]`, which front-loads almost all of its movement into the
 * first tenth of its duration: at the 0.08s default step, three lines were only
 * 1–3px apart at any instant, so the headline animated as one block rather than
 * line by line. 0.16s is the smallest step at which the offset between consecutive
 * lines is actually legible on a 0.9s reveal.
 */
const HEADLINE_STEP = 0.16

/**
 * Explicit entrance props for the hero's reveal order.
 *
 * Written out per element rather than relying on Framer's variant propagation
 * from a `stagger` parent. Propagation works for direct motion children, but the
 * headline lines are three levels down through a plain `<h1>` and a `MaskedLine`
 * component, and relying on it there meant the lines mounted straight at their
 * final position with no animation at all — invisible in a screenshot, and only
 * findable by sampling the transform frame by frame.
 *
 * Being explicit also means the timing is legible in one place, which is what the
 * Phase 3A spec asserts against.
 */
function enter(index, reduced, variant = fadeUp, step = HERO_STEP) {
  if (reduced) {
    return {}
  }

  /*
   * The nested `transition` is stripped out of the target on purpose.
   *
   * Every shared variant in `lib/motion.ts` carries its own transition inside
   * `visible` (`{ opacity: 1, y: 0, transition: transitions.standard }`). Passing
   * that object straight to `animate` works, but a `transition` written *inside*
   * the `animate` object takes precedence over the `transition` prop — so the
   * per-line `delay` was silently discarded and all three headline lines moved as
   * one block. Everything now lives on the `transition` prop, where the delay is
   * not competing with anything.
   */
  const { transition, ...target } = variant.visible

  return {
    initial: variant.hidden,
    animate: target,
    transition: { ...transition, delay: index * step },
  }
}

/**
 * One headline line, masked.
 *
 * `overflow-hidden` on the wrapper is what makes `y: '100%'` read as type sliding
 * out from under an edge rather than as a box teleporting — the entire point of
 * `maskReveal`, and the reason the variant in `lib/motion.ts` documents that the
 * element must sit inside a clipping parent.
 */
function MaskedLine({ line, reduced, index }) {
  return (
    <span className="block overflow-hidden pb-[0.06em]">
      <motion.span {...enter(index + 1, reduced, maskReveal, HEADLINE_STEP)} className="block">
        {line.map((run, runIndex) => (
          <span key={runIndex}>{run.text}</span>
        ))}
      </motion.span>
    </span>
  )
}

/**
 * The eyebrow.
 *
 * The two labels are **not** `text-muted` and `text-accent-strong` here, even
 * though those are the tokens used on the page background. This panel is
 * `bg-panel` (#ECEAE4), one step darker than `bg-page`, and on it `text-muted`
 * measures 4.45:1 and `text-accent-strong` 3.62:1 — both under the 4.5:1 AA
 * threshold at this size. So the pair is `text-ink` and `accent-800`, which clear
 * it. Same reason the subtext uses `text-ink/75` rather than `text-muted`.
 */
function HeroEyebrow({ reduced }) {
  return (
    <motion.p
      {...enter(0, reduced)}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink"
    >
      <span className="inline-flex items-center gap-2 text-accent-800">
        <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
        Live inventory
      </span>
      <span aria-hidden="true" className="text-ink/40">
        /
      </span>
      <span>Refurbished smartphones</span>
    </motion.p>
  )
}

/**
 * The two hero actions.
 *
 * The primary is the brand green with a near-black label: white on `#10B981` is
 * 2.54:1 and fails AA at this size, while ink on the same fill is 7.60:1. The pull
 * is a magnetic lean toward the pointer, capped at 12px so the button can never be
 * drawn out from under the cursor.
 */
function HeroActions({ reduced }) {
  const magnetic = useMagneticPull(!reduced)
  const pull = reduced ? { x: 0, y: 0 } : magnetic.offset

  return (
    <motion.div {...enter(4, reduced)} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
      <motion.div
        animate={{ x: pull.x, y: pull.y }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <Link
          to={MARKETPLACE_ROUTES.shop}
          data-testid="hero-shop"
          onPointerMove={magnetic.onPointerMove}
          onPointerLeave={magnetic.reset}
          onBlur={magnetic.reset}
          className="inline-flex min-h-12 items-center gap-2 rounded-control bg-accent px-7 text-base font-semibold text-dark ring-1 ring-inset ring-accent-hover transition-colors duration-150 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
        >
          Shop now
          <ArrowRight className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </motion.div>

      <Link
        to={MARKETPLACE_ROUTES.qualityCheck}
        data-testid="hero-how-we-test"
        className="group inline-flex min-h-12 items-center gap-1.5 rounded-control text-base font-medium text-ink underline decoration-line-2 underline-offset-4 transition-colors duration-150 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
      >
        How we test
        <ArrowRight
          className="size-[18px] transition-transform duration-150 group-hover:translate-x-1"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </Link>
    </motion.div>
  )
}

/**
 * The featured listing, as a typographic plate.
 *
 * Everything on it is a field the API actually returns. No drawn phone, no stock
 * image: the plate is the listing's own published evidence, set at display size,
 * with the price as the largest element because that is what the section argues.
 */
function HeroPlate({ listing, reduced }) {
  const grade = getConditionGrade(listing.grade)
  const hasDiscount =
    Number(listing.originalPrice) > Number(listing.price) && Number(listing.discountPercent) > 0

  return (
    // Extra top margin below `lg`, where the plate stacks under the actions and the
    // battery chip above its edge would otherwise drift into the Shop button.
    <div className="relative mt-6 lg:mt-0">
      <Link
        to={productPath(listing)}
        data-testid="hero-plate-link"
        className="group block rounded-card-lg border border-line bg-card p-7 shadow-card transition-shadow duration-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              {listing.brand}
            </p>
            <p className="mt-2 text-2xl font-bold leading-tight tracking-[-0.02em] text-ink">
              {listing.model}
            </p>
            <p className="mt-1.5 text-sm text-muted">
              {[listing.storage, listing.color].filter(Boolean).join(' · ')}
            </p>
          </div>
          <ConditionBadge grade={listing.grade} />
        </div>

        <div className="mt-7">
          <PriceDisplay
            price={listing.price}
            originalPrice={hasDiscount ? listing.originalPrice : null}
            discountPercent={hasDiscount ? listing.discountPercent : null}
            size="lg"
          />
        </div>

        <p className="mt-6 border-t border-line pt-5 text-[13px] leading-relaxed text-muted">
          {grade.label} condition · {listing.inspectionTotal ?? 11}-point inspection ·{' '}
          {listing.warrantyMonths}-month warranty
        </p>
      </Link>

      <HeroChips listing={listing} reduced={reduced} placement={TEXT_PLATE_CHIPS} />
    </div>
  )
}

/**
 * The featured listing with its photograph.
 *
 * The phone sits in a 4:5 frame, contained rather than cropped so the device is
 * never cut off, and the evidence moves to a caption card overlapping the frame's
 * lower edge: model, grade and price, the three things the slide argues.
 */
function HeroPhotoPlate({ listing, reduced }) {
  const photo = photoOf(listing)

  return (
    <div className="relative mx-auto w-full max-w-sm pb-16">
      <Link
        to={productPath(listing)}
        data-testid="hero-plate-link"
        className="group block rounded-card-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
      >
        <div className="aspect-[4/5] overflow-hidden rounded-card-lg border border-line bg-well">
          <img
            src={photo}
            alt={`${listing.brand} ${listing.model} in ${listing.color ?? 'as pictured'}`}
            width={800}
            height={1000}
            fetchPriority="high"
            decoding="async"
            className="size-full object-contain p-6 transition-transform duration-500 ease-entrance motion-safe:group-hover:scale-[1.03]"
          />
        </div>

        <div className="absolute inset-x-4 bottom-0 rounded-card border border-line bg-card p-5 shadow-card sm:inset-x-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold leading-tight tracking-[-0.02em] text-ink">
                {listing.brand} {listing.model}
              </p>
              <p className="mt-1 truncate text-sm text-muted">
                {[listing.storage, listing.color].filter(Boolean).join(' · ')}
              </p>
            </div>
            <ConditionBadge grade={listing.grade} />
          </div>
          <div className="mt-3">
            <PriceDisplay price={listing.price} originalPrice={listing.originalPrice} size="sm" />
          </div>
        </div>
      </Link>

      <HeroChips listing={listing} reduced={reduced} placement={PHOTO_PLATE_CHIPS} />
    </div>
  )
}

/**
 * Two measurement chips, drifting out of phase with each other.
 *
 * On the text plate they sit astride its top-left and bottom-right edges and stay
 * inside the card's 28px padding even at the far end of their drift. They used
 * to hang over the card's left side at the height of the model name, which
 * covered "iPhone" on a desktop viewport. On the photo plate they sit over the
 * photograph, clear of the caption card.
 */
const TEXT_PLATE_CHIPS = { battery: '-top-6 left-5 sm:left-7', warranty: '-bottom-7 right-5 sm:right-7' }
const PHOTO_PLATE_CHIPS = { battery: '-top-6 left-5 sm:-left-4', warranty: 'top-1/3 right-0 sm:-right-5' }

function HeroChips({ listing, reduced, placement }) {
  return (
    <>
      <HeroChip
        lean="left"
        travel={CHIP_TRAVEL * 2}
        reduced={reduced}
        className={placement.battery}
      >
        <BatteryFull className="size-4 text-accent-strong" strokeWidth={1.5} aria-hidden="true" />
        <span className="font-semibold tabular-nums text-ink">{listing.batteryPercent}%</span>
        <span className="text-muted">battery</span>
      </HeroChip>

      {Number(listing.warrantyMonths) > 0 && (
        <HeroChip
          lean="right"
          travel={CHIP_TRAVEL}
          reduced={reduced}
          className={placement.warranty}
        >
          <ShieldCheck className="size-4 text-accent-strong" strokeWidth={1.5} aria-hidden="true" />
          <span className="font-semibold text-ink">{listing.warrantyMonths} months</span>
          <span className="text-muted">warranty</span>
        </HeroChip>
      )}
    </>
  )
}

/**
 * A floating measurement chip on a 4s loop.
 *
 * `travel` is both the distance and the phase offset, so the two chips are never
 * in step. The distance is 6px — enough to read as alive, small enough that
 * nobody's eye is pulled off the price.
 */
function HeroChip({ lean, travel, reduced, className = '', children }) {
  return (
    <motion.span
      data-testid="hero-chip"
      animate={reduced ? undefined : { y: [travel, -travel] }}
      transition={
        reduced
          ? undefined
          : { duration: 4, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }
      }
      className={`pointer-events-none absolute z-raised inline-flex items-center gap-2 rounded-control border border-line bg-card px-3.5 py-2 text-[13px] shadow-card ${
        reduced ? '' : lean === 'left' ? 'rotate-[-2deg]' : 'rotate-[2deg]'
      } ${className}`}
    >
      {children}
    </motion.span>
  )
}

/** Dots, a position readout, and the two arrow buttons. */
function HeroControls({ slides, carousel, index }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      {/* A tablist, not decoration: the dots are the only way to reach a slide
          without waiting for it, so they have to be keyboard reachable and they
          have to announce which slide is showing. */}
      <div role="tablist" aria-label="Featured phones" className="flex flex-wrap items-center gap-1.5">
        {slides.map((slide, slideIndex) => {
          const isActive = slideIndex === index

          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Show ${slide.brand} ${slide.model}`}
              onClick={() => carousel.goTo(slideIndex)}
              className={`h-2 w-8 origin-left rounded-full transition-transform duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page ${
                isActive ? 'scale-x-100 bg-ink' : 'scale-x-[0.25] bg-ink/20 hover:bg-ink/40'
              }`}
            />
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <p className="text-[13px] tabular-nums text-muted">
          {index + 1} / {slides.length}
        </p>

        <button
          type="button"
          data-testid="hero-prev"
          onClick={carousel.previous}
          aria-label="Previous featured phone"
          className="grid size-10 place-items-center rounded-control border border-line-2 bg-surface text-ink transition-colors duration-150 hover:border-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
        >
          <ArrowLeft className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          data-testid="hero-next"
          onClick={carousel.next}
          aria-label="Next featured phone"
          className="grid size-10 place-items-center rounded-control border border-line-2 bg-surface text-ink transition-colors duration-150 hover:border-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
        >
          <ArrowRight className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/**
 * Before the featured set resolves, a placeholder that reserves the plate's space.
 *
 * Static rather than a shimmer: the panel is the first thing on the page and a
 * pulsing skeleton in the hero reads as a loading failure. The `New Arrivals`
 * section below is where skeletons belong.
 */
function HeroPlatePlaceholder() {
  return (
    <div
      data-testid="hero-plate-placeholder"
      className="rounded-card-lg border border-line bg-card p-7 shadow-card"
    >
      <div className="h-3 w-16 rounded-full bg-surface-2" />
      <div className="mt-4 h-7 w-48 max-w-full rounded-full bg-surface-2" />
      <div className="mt-3 h-4 w-32 rounded-full bg-surface-2" />
      <div className="mt-8 h-9 w-36 rounded-full bg-surface-2" />
      <div className="mt-7 h-3 w-full rounded-full bg-surface-2" />
    </div>
  )
}
