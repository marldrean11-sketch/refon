/**
 * One scroll authority for the whole application.
 *
 * With Lenis installed, `window.scrollTo` and `element.scrollIntoView` are no
 * longer how the page moves: Lenis owns the scroll position and animates it, so
 * a direct native call fights it for one frame and then gets corrected. Every
 * programmatic scroll in the product therefore goes through here, which means
 * there is a single place that knows whether smoothing is running.
 *
 * When Lenis is not running — reduced motion, or the provider has not mounted
 * yet — the same functions fall through to the native equivalents, so a caller
 * never has to branch.
 */

let lenis = null

/** Called by `SmoothScroll` when Lenis starts and again when it is destroyed. */
export function setLenis(instance) {
  lenis = instance ?? null
}

/** The live Lenis instance, or `null` when smoothing is off. */
export function getLenis() {
  return lenis
}

/** True while smoothed scrolling is installed and not stopped. */
export function isSmoothScrollActive() {
  return Boolean(lenis) && lenis.isActive !== false
}

/**
 * Returns to the top of the document.
 *
 * `immediate` is the default on purpose. A route change is not an event the
 * visitor asked to watch animate; a 400ms glide back up after every navigation
 * is latency the visitor did not ask for. Smooth scrolling is for wheel input,
 * not for programmatic recovery.
 */
export function scrollToTop(options = {}) {
  if (lenis) {
    lenis.scrollTo(0, { immediate: true, force: true, ...options })
    return
  }

  window.scrollTo(0, 0)
}

/**
 * Scrolls an element to the top of the viewport, clearing the sticky header.
 */
export function scrollToElement(element, options = {}) {
  if (!element) {
    return
  }

  if (lenis) {
    lenis.scrollTo(element, { offset: options.offset ?? -96, immediate: options.immediate ?? true })
    return
  }

  element.scrollIntoView({ block: 'start', behavior: 'auto' })
}