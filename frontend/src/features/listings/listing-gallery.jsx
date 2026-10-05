import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Images, Maximize2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { PhoneArtwork } from './PhoneArtwork.jsx'
import { isImageReference } from './image-reference.js'
import { Modal } from '../../components/ui/Modal.jsx'
import { standardTransition } from '../../lib/motion.js'

/**
 * Gallery angles used when a listing has no uploaded photos.
 * Covers the front, the back, the screen, and a close-up so the detail page
 * still shows four distinct views instead of one repeated image.
 */
const ILLUSTRATION_VIEWS = ['front', 'detail', 'screen', 'angle']

const VIEW_LABELS = {
  front: 'Front view',
  detail: 'Back and camera detail',
  screen: 'Screen on',
  angle: 'Angled side view',
}

/**
 * Full-screen view of the active image.
 *
 * Composes the shared `Modal` primitive so the focus trap, Escape handling, scroll
 * lock, and focus restore are the same on every dialog in the product rather than
 * a second implementation that could drift. Arrow keys for paging are added on
 * top, which the primitive does not provide.
 */
function Lightbox({ isOpen, onClose, onPrevious, onNext, children, counter }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function onKeyDown(event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onPrevious()
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        onNext()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onPrevious, onNext])

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Expanded view"
      description={counter}
      size="xl"
      // The default body caps its height and scrolls. A lightbox should instead
      // size to the image, and the stage below carries an explicit aspect ratio so
      // a percentage-height child has something to resolve against.
      bodyClassName="!max-h-none !overflow-visible !p-0"
    >
      <div className="relative flex w-full items-center justify-center">
        <button
          type="button"
          onClick={onPrevious}
          className="absolute left-1 z-10 grid size-11 place-items-center rounded-full bg-white/85 text-ink shadow-card backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Show previous view"
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </button>

        <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-canvas">
          {children}
        </div>

        <button
          type="button"
          onClick={onNext}
          className="absolute right-1 z-10 grid size-11 place-items-center rounded-full bg-white/85 text-ink shadow-card backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Show next view"
        >
          <ChevronRight className="size-6" aria-hidden="true" />
        </button>
      </div>
    </Modal>
  )
}

export function ListingGallery({ listing }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const pointerStartX = useRef(null)
  const reduceMotion = useReducedMotion()

  const hasPhotos = listing.photos.length > 0
  const photos = hasPhotos ? listing.photos : ILLUSTRATION_VIEWS
  const activeView = photos[activeIndex] ?? photos[0]
  const activeLabel = hasPhotos
    ? `photo ${activeIndex + 1} of ${photos.length}`
    : (VIEW_LABELS[activeView] ?? 'view')

  const batteryPercent = listing.batteryPercent

  function showPrevious() {
    setActiveIndex((current) => (current === 0 ? photos.length - 1 : current - 1))
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

  /** The image itself, shared by the inline stage, thumbnails, and the lightbox. */
  const renderView = useCallback(
    (
      view,
      label,
      { eager = false, cover = true, compact = false } = {},
    ) =>
      isImageReference(view) ? (
        <img
          src={view}
          alt={`${listing.brand} ${listing.model} in ${
            listing.color && listing.color !== 'As pictured' ? listing.color : 'as pictured'
          }, ${label}`}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={
            cover
              ? 'h-full w-full object-cover'
              : 'size-full object-contain'
          }
        />
      ) : (
        <PhoneArtwork
          brand={listing.brand}
          model={listing.model}
          color={listing.color}
          view={view}
          batteryPercent={batteryPercent}
          className="h-full w-full"
          // Thumbnails are too small for the artwork's own labels; the selected
          // state is already communicated by the button around them.
          showLabel={!compact}
          showColor={!compact}
        />
      ),
    [listing.brand, listing.model, listing.color, batteryPercent],
  )

  return (
    <div>
      <div
        className="group relative aspect-[4/3] overflow-hidden rounded-card-xl border border-line bg-white shadow-card sm:aspect-[16/10]"
        role="region"
        aria-label={`${listing.brand} ${listing.model} gallery, showing ${activeLabel}`}
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
            {renderView(activeView, activeLabel, { eager: true })}
          </motion.div>
        </AnimatePresence>

        {/* The zoom control is an overlay, so it stops pointer propagation to
            keep a click from being read as a swipe. */}
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={() => setIsLightboxOpen(true)}
          className="absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-2xl border border-white/70 bg-white/85 text-ink shadow-card backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label={`Expand ${activeLabel} to full screen`}
        >
          <Maximize2 className="size-5" aria-hidden="true" />
        </button>

        <div
          aria-live="polite"
          className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-bold text-ink shadow-sm backdrop-blur"
        >
          <Images className="size-3.5" aria-hidden="true" />
          {activeIndex + 1} / {photos.length}
          {!hasPhotos && (
            <span className="font-semibold text-muted">· illustration</span>
          )}
        </div>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={showPrevious}
              className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/85 text-ink shadow-card backdrop-blur transition duration-200 hover:-translate-x-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Show previous view"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={showNext}
              className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/85 text-ink shadow-card backdrop-blur transition duration-200 hover:translate-x-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Show next view"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3" role="group" aria-label="Choose a gallery view">
          {photos.map((view, index) => {
            const label = hasPhotos
              ? `Show photo ${index + 1} of ${photos.length}`
              : `Show ${VIEW_LABELS[view] ?? 'view'}`

            return (
              <button
                key={`${view}-${index}`}
                type="button"
                aria-label={label}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => setActiveIndex(index)}
                className={`group/thumbnail relative aspect-[4/3] overflow-hidden rounded-2xl border-2 bg-white transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                  index === activeIndex
                    ? 'border-primary-500 shadow-card'
                    : 'border-transparent opacity-70 hover:border-primary-200 hover:opacity-100'
                }`}
              >
                {renderView(view, VIEW_LABELS[view] ?? `view ${index + 1}`, { compact: true })}
                {index === activeIndex && (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-primary-950/70 py-0.5 text-center text-[10px] font-bold text-white">
                    Selected
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <Lightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        onPrevious={showPrevious}
        onNext={showNext}
        counter={`${activeIndex + 1} of ${photos.length}${hasPhotos ? '' : ' · illustration'} · ${activeLabel}`}
      >
        <div className="flex size-full items-center justify-center">
          {renderView(activeView, activeLabel, { cover: false })}
        </div>
      </Lightbox>
    </div>
  )
}