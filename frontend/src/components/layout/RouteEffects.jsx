import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { scrollToElement, scrollToTop } from '../../lib/scroll.js'
import { SITE_INFO } from '../../content/site-info.js'

const ROUTE_META = {
  '/': {
    title: 'ReFon · Premium Refurbished Phones, Tested for You',
    description:
      'Shop quality-tested refurbished smartphones with transparent condition grades, published battery health, warranty coverage, and verified sellers.',
  },
  '/phones': {
    title: 'Shop Refurbished Phones · ReFon',
    description:
      'Browse tested refurbished iPhone, Samsung, Pixel, and Xiaomi phones. Filter by condition grade, battery health, price, and warranty.',
  },
  '/browse': {
    title: 'Shop Refurbished Phones · ReFon',
    description:
      'Browse tested refurbished iPhone, Samsung, Pixel, and Xiaomi phones. Filter by condition grade, battery health, price, and warranty.',
  },
  '/categories': {
    title: 'Phone Categories · ReFon',
    description:
      'Shop refurbished phones by brand, budget, and condition grade. Categories for iPhone, Samsung, Pixel, gaming, and under ₱10,000.',
  },
  '/how-it-works': {
    title: 'How It Works · ReFon',
    description:
      'How buying and selling on ReFon works: browse, compare, inspect condition, order, receive, and enjoy.',
  },
  '/health-check': {
    title: 'Phone Health Check · ReFon',
    description: 'Test the phone in your hand in your browser: screen, touch, speaker, microphone, cameras, vibration, motion sensors and battery.',
  },
  '/trade-in': {
    title: 'Trade-in Estimator · ReFon',
    description: 'Magkano kaya ’yan? Get an honest price range for your old phone in six quick taps.',
  },
  '/quality-check': {
    title: 'How We Test Every Phone · ReFon',
    description:
      'The five-stage ReFon inspection: physical, hardware, software and lock checks, condition grading, and final verification.',
  },
  '/about': {
    title: 'About ReFon · Our Mission and Vision',
    description:
      'ReFon is a student-founded marketplace making reliable smartphones more affordable and accessible in the Philippines.',
  },
  '/faq': {
    title: 'Frequently Asked Questions · ReFon',
    description:
      'What refurbished means, what each condition grade means, how phones are tested, and what warranty and returns cover.',
  },
  '/warranty': {
    title: 'Warranty Policy · ReFon',
    description:
      'Eligible refurbished phones include a ReFon-administered warranty, with the term stated in months on every listing.',
  },
  '/returns': {
    title: 'Returns and Refunds · ReFon',
    description:
      'Seven days from delivery to return a refurbished phone that differs materially from its listing.',
  },
  '/shipping': {
    title: 'Shipping and Delivery · ReFon',
    description:
      'Tracked nationwide delivery of refurbished phones, with fees and estimates shown before you place an order.',
  },
  '/sustainability': {
    title: 'Sustainability · ReFon',
    description:
      'Buying refurbished extends device life, reduces electronic waste, and keeps capable phones accessible.',
  },
  '/contact': {
    title: 'Contact Us · ReFon',
    description:
      'Questions about a listing, an order, or selling on ReFon. Our support team answers within one business day.',
  },
  '/sell': {
    title: 'Sell Your Phone on ReFon',
    description:
      'Verified sellers list tested phones with condition grade, battery health, and warranty. ReFon handles moderation and orders.',
  },
  '/compare': {
    title: 'Compare Refurbished Phones · ReFon',
    description:
      'Compare refurbished phones side by side on price, grade, battery health, camera, display, processor, and warranty.',
  },
  '/cart': {
    title: 'Your Cart · ReFon',
    description: 'Review the phones reserved for you before checkout.',
    // Per-visitor and holds no indexable content.
    robots: 'noindex, nofollow',
  },
  '/checkout': {
    title: 'Checkout · ReFon',
    description:
      'Confirm your delivery address, delivery method, and payment preference for the refurbished phones in your cart.',
    robots: 'noindex, nofollow',
  },
  '/checkout/confirmed': {
    title: 'Checkout Confirmed · ReFon',
    description: 'Your ReFon checkout summary and delivery details.',
    robots: 'noindex, nofollow',
  },
  '/saved': {
    title: 'Saved Phones · ReFon',
    description: 'The refurbished phones you have saved for later.',
  },
  '/my-inquiries': {
    title: 'Your Inquiries · ReFon',
    description: 'Track the inquiries you have sent to sellers.',
  },
  '/account': {
    title: 'Account Settings · ReFon',
    description: 'Manage your ReFon profile, orders, saved phones, and security settings.',
  },
  '/login': { title: 'Sign In · ReFon', description: 'Sign in to your ReFon account.' },
  '/register': {
    title: 'Create Your Account · ReFon',
    description: 'Join ReFon as a buyer or a seller of refurbished phones.',
  },
  '/forgot-password': {
    title: 'Forgot Password · ReFon',
    description: 'Request a password reset link for your ReFon account.',
  },
  '/reset-password': {
    title: 'Choose a New Password · ReFon',
    description: 'Set a new password for your ReFon account.',
  },
  '/verify-email': {
    title: 'Confirm Your Email · ReFon',
    description: 'Verify your ReFon email address.',
  },
  '/forbidden': {
    title: 'Access Restricted · ReFon',
    description: 'You do not have access to that area.',
  },
  '/seller': {
    title: 'Seller Dashboard · ReFon',
    description: 'Manage your ReFon listings, inquiries, and orders.',
  },
  '/seller/inquiries': {
    title: 'Inquiry Inbox · ReFon',
    description: 'Respond to buyer inquiries on your ReFon listings.',
  },
}

const DEFAULT_META = {
  title: 'ReFon · Premium Refurbished Phones, Tested for You',
  description:
    'Shop quality-tested refurbished smartphones with transparent condition grades, published battery health, warranty coverage, and verified sellers.',
}

const ORIGIN = SITE_INFO.url

/**
 * Resolves title, description, and canonical path for a route.
 *
 * Descriptions are written per page rather than derived from the product name,
 * because a search-result snippet has to earn the click on its own.
 */
export function metaForPath(pathname) {
  const exact = ROUTE_META[pathname]

  if (exact) {
    return { ...exact, canonical: pathname }
  }

  if (pathname.startsWith('/phones/') || pathname.startsWith('/listings/')) {
    return {
      title: 'Refurbished Phone Details · ReFon',
      description:
        'Condition grade, measured battery health, inspection results, warranty term, and seller history for this refurbished phone.',
      canonical: pathname,
    }
  }

  if (pathname.startsWith('/sellers/')) {
    return {
      title: 'Seller Storefront · ReFon',
      description: 'Browse a verified ReFon seller’s approved refurbished phone listings.',
      canonical: pathname,
    }
  }

  if (pathname.startsWith('/orders/')) {
    return { title: 'Your Order · ReFon', description: 'Order status and delivery timeline.', canonical: pathname }
  }

  if (pathname.startsWith('/seller/listings/')) {
    return {
      title: 'Seller Listing Workspace · ReFon',
      description: 'Create or edit a refurbished phone listing.',
      canonical: pathname,
    }
  }

  if (pathname === '/admin') {
    return {
      title: 'Admin Dashboard · ReFon',
      description: 'Moderate sellers, listings, orders, and reports.',
      canonical: pathname,
    }
  }

  return { ...DEFAULT_META, canonical: '/' }
}

function upsertMeta(selectorAttribute, key, content) {
  let element = document.head.querySelector(selectorAttribute)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(key, content)
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

function upsertCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]')

  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }

  element.setAttribute('href', href)
}

/**
 * Sets or removes the robots directive.
 *
 * A cart or a checkout form is per-visitor and holds no content worth a search
 * result; indexing either would be pointless at best and misleading at worst. The
 * tag is removed again on every other route rather than left behind, so the absence
 * of `noindex` always means the page is indexable.
 */
function upsertRobots(directive) {
  let element = document.head.querySelector('meta[name="robots"]')

  if (!directive) {
    element?.remove()
    return
  }

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('name', 'robots')
    document.head.appendChild(element)
  }

  element.setAttribute('content', directive)
}

/**
 * Per-page metadata pushed by a page that knows more than its route.
 *
 * A product page cannot be described by its path alone — every phone needs its
 * own title, description, and image — so the page publishes real metadata here
 * instead of the route table guessing. This extends the existing document-head
 * ownership rather than adding a second SEO layer; `RouteEffects` still performs
 * every write, which keeps one place responsible for what ends up in the head.
 *
 * The override is keyed by pathname and discarded as soon as the route changes,
 * so leaving a product page cannot leave its metadata behind.
 */
let pageMetaOverride = null
const pageMetaListeners = new Set()

/**
 * Publishes metadata for the current page and notifies the document-head owner.
 *
 * A notification is required, not optional. `RouteEffects` writes the head in an
 * effect keyed on the location, so a page that resolves its data asynchronously
 * — a product page does — would publish after that effect has already run and
 * the head would keep showing the generic route-level description.
 */
export function setPageMeta(override) {
  pageMetaOverride = override

  for (const listener of pageMetaListeners) {
    listener()
  }
}

function subscribeToPageMeta(listener) {
  pageMetaListeners.add(listener)
  return () => pageMetaListeners.delete(listener)
}

function resolveMeta(pathname) {
  if (pageMetaOverride && pageMetaOverride.pathname === pathname) {
    const { pathname: _pathname, ...rest } = pageMetaOverride
    return { ...rest, canonical: pageMetaOverride.canonical ?? pathname }
  }

  return metaForPath(pathname)
}

/** Writes every metadata field for a pathname. Single owner of the document head. */
function applyRouteMeta(pathname) {
  const meta = resolveMeta(pathname)
  document.title = meta.title

  const canonical = `${ORIGIN}${meta.canonical}`
  upsertMeta('meta[name="description"]', 'name', meta.description)
  upsertMeta('meta[property="og:title"]', 'property', meta.title)
  upsertMeta('meta[property="og:description"]', 'property', meta.description)
  upsertMeta('meta[property="og:url"]', 'property', canonical)
  upsertMeta('meta[property="og:type"]', 'property', 'website')
  upsertMeta('meta[name="twitter:title"]', 'name', meta.title)
  upsertMeta('meta[name="twitter:description"]', 'name', meta.description)
  upsertCanonical(canonical)

  // A page that publishes an image gets a summary_large_image card; a page that
  // does not must not inherit the previous page's image.
  if (meta.image) {
    upsertMeta('meta[property="og:image"]', 'property', `${ORIGIN}${meta.image}`)
    upsertMeta('meta[name="twitter:card"]', 'name', 'summary_large_image')
  } else {
    document.head.querySelector('meta[property="og:image"]')?.remove()
    upsertMeta('meta[name="twitter:card"]', 'name', 'summary')
  }

  upsertJsonLd(meta.jsonLd ?? null)
  upsertRobots(meta.robots ?? null)
}

/**
 * Removes or installs a JSON-LD block.
 *
 * Product structured data is only valid while a product page is open, so the
 * element is removed rather than left stale — a leftover `Product` schema on the
 * homepage would be misleading to a crawler.
 */
function upsertJsonLd(data) {
  const existing = document.head.querySelector('script[data-refon-jsonld]')

  if (!data) {
    existing?.remove()
    return
  }

  const element = existing ?? document.createElement('script')

  if (!existing) {
    element.setAttribute('type', 'application/ld+json')
    element.setAttribute('data-refon-jsonld', 'true')
    document.head.appendChild(element)
  }

  element.textContent = JSON.stringify(data)
}

export function RouteEffects() {
  const location = useLocation()
  const previousPath = useRef(null)
  const pathname = location.pathname

  // Bumped whenever a page publishes its own metadata, so the head is rewritten
  // even though the location never changed.
  const [metaVersion, setMetaVersion] = useState(0)

  useEffect(() => subscribeToPageMeta(() => setMetaVersion((current) => current + 1)), [])

  useEffect(() => {
    const hasNavigated = previousPath.current !== null
    previousPath.current = `${pathname}${location.search}${location.hash}`

    applyRouteMeta(pathname)

    // One deferred pass, because the outgoing page is still in the DOM when
    // this effect runs and its height is what the scroll position is measured
    // against. Both branches go through `lib/scroll` so they hand off to Lenis
    // when it is installed and fall back to native scrolling when it is not —
    // calling `window.scrollTo` directly here would fight the smoother and
    // leave the page stranded mid-scroll.
    const timer = window.setTimeout(() => {
      if (location.hash) {
        const target = document.getElementById(location.hash.slice(1))
        if (target) {
          scrollToElement(target)
        }
      } else {
        scrollToTop()
      }

      if (hasNavigated && !location.hash) {
        document.getElementById('main-content')?.focus({ preventScroll: true })
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [location.hash, location.search, metaVersion, pathname])

  return null
}
