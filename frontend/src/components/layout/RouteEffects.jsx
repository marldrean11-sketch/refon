import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

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
  '/cart': { title: 'Your Cart · ReFon', description: 'Review the phones in your cart before checkout.' },
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

const ORIGIN = 'https://refon.ph'

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

export function RouteEffects() {
  const location = useLocation()
  const previousPath = useRef(null)

  useEffect(() => {
    const hasNavigated = previousPath.current !== null
    previousPath.current = `${location.pathname}${location.search}${location.hash}`

    const meta = metaForPath(location.pathname)
    document.title = meta.title

    const canonical = `${ORIGIN}${meta.canonical}`
    upsertMeta('meta[name="description"]', 'name', meta.description)
    upsertMeta('meta[property="og:title"]', 'property', meta.title)
    upsertMeta('meta[property="og:description"]', 'property', meta.description)
    upsertMeta('meta[property="og:url"]', 'property', canonical)
    upsertMeta('meta[name="twitter:title"]', 'name', meta.title)
    upsertMeta('meta[name="twitter:description"]', 'name', meta.description)
    upsertCanonical(canonical)

    const timer = window.setTimeout(() => {
      if (location.hash) {
        const target = document.getElementById(location.hash.slice(1))
        if (target) {
          target.scrollIntoView({ block: 'start' })
        }
      } else {
        window.scrollTo(0, 0)
      }

      if (hasNavigated && !location.hash) {
        document.getElementById('main-content')?.focus({ preventScroll: true })
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [location.hash, location.pathname, location.search])

  return null
}
