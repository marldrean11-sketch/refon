/**
 * Every public and account route in one place.
 *
 * `AUTH_ROUTES` already existed and is imported across the app, so this module
 * re-exports it unchanged and adds the new marketplace surface next to it.
 */
export const AUTH_ROUTES = Object.freeze({
  home: '/',
  login: '/login',
  register: '/register',
  admin: '/admin',
  seller: '/seller',
  sellerInquiries: '/seller/inquiries',
  buyer: '/browse',
  saved: '/saved',
  myInquiries: '/my-inquiries',
  forbidden: '/forbidden',
  account: '/account',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
})

export const ROLE_HOME = Object.freeze({
  ADMIN: AUTH_ROUTES.admin,
  SELLER: AUTH_ROUTES.seller,
  BUYER: AUTH_ROUTES.buyer,
})

export function getRoleHome(role) {
  return ROLE_HOME[role] ?? AUTH_ROUTES.login
}

export const MARKETPLACE_ROUTES = Object.freeze({
  home: '/',
  /** Canonical shop listing URL. */
  shop: '/phones',
  /** Legacy alias kept so existing bookmarks and tests keep working. */
  browse: '/browse',
  categories: '/categories',
  /** The directory of every verified phone store. */
  stores: '/stores',
  howItWorks: '/how-it-works',
  qualityCheck: '/quality-check',
  /** The in-browser self-test a visitor runs on the phone in their hand. */
  healthCheck: '/health-check',
  tradeIn: '/trade-in',
  boothPoster: '/booth-poster',
  /** The booth big-screen mode: rotating slides, live count and QR codes. */
  kiosk: '/kiosk',
  feedback: '/feedback',
  compare: '/compare',
  cart: '/cart',
  checkout: '/checkout',
  /** Post-checkout summary. Phase 6 shows a quote; Phase 7 shows an order. */
  checkoutConfirmed: '/checkout/confirmed',
  sellerApply: '/sell',
  about: '/about',
  faq: '/faq',
  warranty: '/warranty',
  returns: '/returns',
  shipping: '/shipping',
  sustainability: '/sustainability',
  privacy: '/privacy',
  terms: '/terms',
  contact: '/contact',
})

export const DASHBOARD_ROUTES = Object.freeze({
  overview: '/account',
  orders: '/account/orders',
  wishlist: '/account/wishlist',
  profile: '/account/profile',
  security: '/account/security',
  sellerOverview: '/seller',
  sellerOrders: '/seller/orders',
  adminOverview: '/admin',
  adminUsers: '/admin/users',
  adminProducts: '/admin/products',
  adminOrders: '/admin/orders',
  adminSellers: '/admin/sellers',
  adminReports: '/admin/reports',
})

/** Canonical product URL. `/listings/:id` stays valid and redirects here. */
export function productPath(listing) {
  const slug = listing?.slug

  if (slug) {
    return `/phones/${slug}`
  }

  return `/listings/${listing?.id ?? ''}`
}

export function categoryPath(slug) {
  return `/categories/${slug}`
}

export function sellerPath(sellerId) {
  return `/sellers/${sellerId}`
}

export function orderPath(orderNumber) {
  return `/orders/${orderNumber}`
}
