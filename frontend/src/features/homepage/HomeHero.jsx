import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Container } from '../design/Container.jsx'
import { RefonTag } from '../../components/ui/RefonTag.jsx'
import { isImageReference } from '../listings/image-reference.js'
import { HERO_SLIDES } from '../../content/home-content.js'
import { durations, easings, usePrefersReducedMotion } from '../../lib/motion.ts'

/**
 * Which listing each slide puts on its tag.
 *
 * The tag is the hero's picture, so every slide shows a real, buyable phone and
 * its real figures. A slide whose pick finds nothing falls back to the first
 * featured phone rather than showing an empty tag.
 */
const PICKS = {
  featured: (listings, featured) => featured[0],
  battery: (listings) =>
    [...listings]
      .filter((listing) => Number.isFinite(Number(listing.batteryPercent)))
      .sort((a, b) => Number(b.batteryPercent) - Number(a.batteryPercent))[0],
  budget: (listings) =>
    [...listings]
      .filter((listing) => Number(listing.price) <= 10000)
      .sort((a, b) => Number(a.price) - Number(b.price))[0],
}

/** The listing's photograph, when a seller has uploaded a real one. */
function photoOf(listing) {
  const photo = listing?.mainPhoto ?? listing?.photos?.[0]

  return isImageReference(photo) ? photo : null
}

/**
 * The homepage hero.
 *
 * A full-width Tag Yellow band in the layout big marketplaces use: one headline,
 * one sentence, one primary action, and a picture on the right. ReFon's picture is
 * the tag of a real phone. Slides change only when the visitor asks, with the
 * dots on the left and the arrows on the right below the band. There is no timer:
 * a moving headline is something a reader has to chase.
 *
 * When the slide's phone has a real photograph, the photo sits in a 4:5 frame and
 * the tag hangs over its lower edge. The seed listings carry no photos
 * (`prisma/seed-data.js` explains why), so by default the tag stands alone.
 */
export function HomeHero({ listings = [], featured = [] }) {
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)

  const slides = useMemo(
    () =>
      HERO_SLIDES.map((slide) => ({
        ...slide,
        listing: PICKS[slide.pick]?.(listings, featured) ?? featured[0] ?? listings[0] ?? null,
      })),
    [featured, listings],
  )

  const count = slides.length
  const slide = slides[index] ?? slides[0]

  function go(next) {
    setIndex((next + count) % count)
  }

  const fade = reduced
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: durations.micro, ease: easings.ui },
      }

  return (
    <section aria-roledescription="carousel" aria-label="Featured" className="bg-page">
      <div data-testid="hero-panel" className="bg-tag text-night">
        <Container className="grid items-center gap-10 py-12 sm:py-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)] lg:gap-14 lg:py-16">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.key}
              {...fade}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
              className="min-w-0"
            >
              <h1 className="font-display text-[clamp(2.4rem,5.4vw,4.4rem)] font-black leading-[0.98] tracking-[-0.035em] text-night">
                {slide.headline.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-night/85">{slide.body}</p>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link
                  to={slide.primary.to}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-night px-6 text-base font-semibold text-white transition-colors duration-200 hover:bg-night-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-night/30"
                >
                  {slide.primary.label}
                  <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
                </Link>
                {slide.secondary ? (
                  <Link
                    to={slide.secondary.to}
                    className="inline-flex min-h-11 items-center text-base font-semibold text-night underline decoration-night/40 decoration-2 underline-offset-[6px] transition-colors duration-200 hover:decoration-night"
                  >
                    {slide.secondary.label}
                  </Link>
                ) : null}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex min-h-[22rem] items-center justify-center lg:justify-end">
            <AnimatePresence mode="wait" initial={false}>
              {slide.listing ? (
                <motion.div key={`${slide.key}-${slide.listing.id}`} {...fade} className="w-full max-w-[26rem]">
                  {photoOf(slide.listing) ? (
                    <div className="mx-auto mb-[-5rem] aspect-[4/5] w-3/4 overflow-hidden rounded-card-lg bg-card">
                      <img
                        src={photoOf(slide.listing)}
                        alt={`${slide.listing.brand} ${slide.listing.model} in ${slide.listing.color ?? 'as pictured'}`}
                        width={800}
                        height={1000}
                        fetchPriority="high"
                        decoding="async"
                        className="size-full object-contain p-6"
                      />
                    </div>
                  ) : null}
                  <RefonTag
                    listing={slide.listing}
                    tone="night"
                    className="relative [--tag-hole:theme(colors.tag.DEFAULT)]"
                  />
                </motion.div>
              ) : (
                <div
                  key="placeholder"
                  aria-hidden="true"
                  className="refon-tag h-[22rem] w-full max-w-[26rem] animate-pulse bg-night/10"
                />
              )}
            </AnimatePresence>
          </div>
        </Container>
      </div>

      {count > 1 ? (
        <Container className="flex items-center justify-between py-5">
          <div role="tablist" aria-label="Slides" className="flex items-center gap-1">
            {slides.map((entry, position) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                onClick={() => go(position)}
                aria-label={`Slide ${position + 1} of ${count}`}
                aria-selected={position === index}
                className="grid size-8 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span
                  className={`block size-2.5 rounded-full border-2 border-night transition-colors duration-200 ${
                    position === index ? 'bg-night' : 'bg-transparent'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="hero-prev"
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="grid size-12 place-items-center rounded-full bg-night text-white transition-colors duration-200 hover:bg-night-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
            >
              <ChevronLeft className="size-5" strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              data-testid="hero-next"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="grid size-12 place-items-center rounded-full bg-night text-white transition-colors duration-200 hover:bg-night-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
            >
              <ChevronRight className="size-5" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </Container>
      ) : null}
    </section>
  )
}
