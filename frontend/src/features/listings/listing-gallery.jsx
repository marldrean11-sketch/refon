import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Images } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { PhoneArtwork } from './listing-card.jsx'
import { isImageReference } from './image-reference.js'
import { standardTransition } from '../../lib/motion.js'

export function ListingGallery({ listing }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const pointerStartX = useRef(null)
  const reduceMotion = useReducedMotion()
  const photos = listing.photos.length > 0 ? listing.photos : ['front']
  const activeView = photos[activeIndex] ?? photos[0]

  function showPrevious() {
    setActiveIndex((current) =>
      current === 0 ? photos.length - 1 : current - 1,
    )
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % photos.length)
  }

  function handlePointerDown(event) {
    pointerStartX.current = event.clientX
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function handlePointerUp(event) {
    if (pointerStartX.current === null) {
      return
    }

    const distance = event.clientX - pointerStartX.current
    pointerStartX.current = null

    if (Math.abs(distance) < 48) {
      return
    }

    if (distance > 0) {
      showPrevious()
    } else {
      showNext()
    }
  }

  return (
    <div>
      <div
        className="group relative aspect-[4/3] overflow-hidden rounded-card-xl border border-line bg-white shadow-card sm:aspect-[16/10]"
        role="region"
        aria-label={`${listing.brand} ${listing.model} photo gallery`}
        aria-roledescription="carousel"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            showPrevious()
          }

          if (event.key === 'ArrowRight') {
            event.preventDefault()
            showNext()
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStartX.current = null
        }}
        style={{ touchAction: 'pan-y' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeView}
            initial={reduceMotion ? false : { opacity: 0, scale: 1.015 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.99 }}
            transition={standardTransition}
            className="h-full w-full"
          >
            {isImageReference(activeView) ? (
              <img
                src={activeView}
                alt={`${listing.brand} ${listing.model}, photo ${activeIndex + 1} of ${photos.length}`}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <PhoneArtwork
                brand={listing.brand}
                model={listing.model}
                color={listing.color}
                view={activeView}
                className="h-full w-full"
              />
            )}
          </motion.div>
        </AnimatePresence>

        <div aria-live="polite" className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-bold text-ink shadow-sm backdrop-blur">
          <Images className="size-3.5" aria-hidden="true" />
          {activeIndex + 1} / {photos.length}
        </div>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={showPrevious}
              className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/85 text-ink shadow-card backdrop-blur transition duration-200 hover:-translate-x-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Show previous photo"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={showNext}
              className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/85 text-ink shadow-card backdrop-blur transition duration-200 hover:translate-x-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Show next photo"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3" role="group" aria-label="Choose a gallery photo">
        {photos.map((view, index) => (
          <button
            key={`${view}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`group/thumbnail relative aspect-[4/3] overflow-hidden rounded-2xl border-2 bg-white transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
              index === activeIndex
                ? 'border-primary-500 shadow-card'
                : 'border-transparent opacity-70 hover:border-primary-200 hover:opacity-100'
            }`}
            aria-label={`Show photo ${index + 1} of ${photos.length}`}
            aria-current={index === activeIndex ? 'true' : undefined}
          >
            {isImageReference(view) ? (
              <img
                src={view}
                alt={`${listing.brand} ${listing.model}, thumbnail ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <PhoneArtwork
                brand={listing.brand}
                model={listing.model}
                color={listing.color}
                view={view}
                className="h-full w-full"
              />
            )}
          </button>
        ))}
        </div>
      )} 
    </div>
  )
}
