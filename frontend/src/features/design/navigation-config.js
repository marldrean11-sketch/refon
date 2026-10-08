import {
  Heart,
  Home,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserCog,
  MessagesSquare,
} from 'lucide-react'
import { AUTH_ROUTES, MARKETPLACE_ROUTES } from '../../lib/routes.js'

/**
 * One definition of where ReFon's navigation can go.
 *
 * Two headers, two footers, and a tab bar each used to carry their own private
 * list of links. That is why the seller inbox appeared in one header and not the
 * other, why "Shop" was "Shop Phones" in a nav bar and "Browse phones" in a
 * footer, and why the first version of this file's drawer listed How It Works and
 * Categories twice — once from the primary list and once from the secondary one.
 * Every navigation surface now reads this file, so a destination either exists
 * for everyone or nowhere, and never twice for one reader.
 *
 * `activePaths` is stated explicitly rather than left to `NavLink`'s prefix
 * matching, which cannot express the relationships this app actually has:
 *
 *   - `/` must be active on the homepage and nowhere else. React Router treats a
 *     link to `/` as a prefix match, so a naive `NavLink` marks Home active on
 *     every page in the application.
 *   - "Shop" owns the whole catalog surface — the grid, the legacy `/browse`
 *     alias, a product page, and the comparison placeholder — because they are
 *     all one destination to a shopper.
 *   - A workspace link stays active across its own sub-routes, so opening
 *     `/seller/listings/new` does not silently drop the nav highlight.
 */

/** Prefixes match their section; exact paths match only themselves. */
function matchesPattern(pathname, pattern) {
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2)

    return pathname === base || pathname.startsWith(`${base}/`)
  }

  return pathname === pattern
}

export function isNavActive(item, pathname) {
  return item.activePaths.some((pattern) => matchesPattern(pathname, pattern))
}

/**
 * Shopping navigation.
 *
 * Icon-free by design. A marketplace header earns trust from typography and
 * spacing, and dropping the icons is also what lets five destinations plus the
 * action cluster fit at 1024px without overflowing — and 1024px is a tested
 * breakpoint, not a guess. Icons live in the mobile tab bar and the drawer, where
 * scanning by shape genuinely helps.
 */
export const PRIMARY_NAV = [
  {
    key: 'home',
    label: 'Home',
    to: AUTH_ROUTES.home,
    icon: Home,
    activePaths: ['/'],
  },
  {
    key: 'shop',
    label: 'Shop',
    to: MARKETPLACE_ROUTES.shop,
    icon: Search,
    // One shopper-facing destination, so the highlight spans every way into it.
    activePaths: ['/phones', '/browse', '/phones/*', '/listings/*', '/compare'],
  },
  {
    key: 'categories',
    label: 'Categories',
    to: MARKETPLACE_ROUTES.categories,
    activePaths: ['/categories', '/categories/*'],
  },
  {
    key: 'howItWorks',
    label: 'How It Works',
    to: MARKETPLACE_ROUTES.howItWorks,
    activePaths: ['/how-it-works'],
  },
  {
    key: 'quality',
    label: 'How We Test',
    to: MARKETPLACE_ROUTES.qualityCheck,
    activePaths: ['/quality-check'],
  },
]

/**
 * Signed-in destinations that sit beside the shopping links.
 *
 * `/saved` and `/my-inquiries` are buyer-only now that the wishlist is gated along
 * with the rest of purchasing. One predicate hides them from anyone who cannot use
 * them, in the header, the tab bar, the drawer and the account menu alike, so a role
 * can never be shown a link it cannot open.
 */
export const ACCOUNT_NAV = [
  {
    key: 'saved',
    label: 'Saved',
    to: AUTH_ROUTES.saved,
    icon: Heart,
    activePaths: ['/saved'],
    requiresBuyerRole: true,
  },
  {
    key: 'myInquiries',
    label: 'My Inquiries',
    to: AUTH_ROUTES.myInquiries,
    icon: MessagesSquare,
    activePaths: ['/my-inquiries'],
    requiresBuyerRole: true,
  },
]

/**
 * The single account destination.
 *
 * It stays in the primary navigation rather than only inside the user menu,
 * because an account page that can only be reached by opening a menu is a page
 * nobody can link to, and a signed-in shopper should be able to see where
 * "Account" is without hovering anything.
 */
export const ACCOUNT_LINK = {
  key: 'account',
  label: 'Account',
  to: AUTH_ROUTES.account,
  icon: UserCog,
  activePaths: ['/account', '/account/*'],
}

/**
 * Cart.
 *
 * `requiresBuyerRole` marks it as a purchasing surface. A visitor still sees it and
 * is sent to sign in; a seller or admin does not see it at all. See
 * `canSeeBuyerDestinations`.
 */
export const CART_LINK = {
  key: 'cart',
  label: 'Cart',
  to: MARKETPLACE_ROUTES.cart,
  icon: ShoppingBag,
  activePaths: ['/cart'],
  requiresBuyerRole: true,
}

/**
 * The role's own workspace.
 *
 * Only ADMIN and SELLER have one. A buyer gets no workspace slot at all rather
 * than an empty one, and the same link is what keeps the header oriented when
 * someone is standing on `/admin` or `/seller`.
 */
export const WORKSPACE_LINK_BY_ROLE = {
  ADMIN: {
    key: 'workspace',
    label: 'Admin Dashboard',
    to: AUTH_ROUTES.admin,
    icon: ShieldCheck,
    activePaths: ['/admin', '/admin/*'],
  },
  SELLER: {
    key: 'workspace',
    label: 'Seller Dashboard',
    to: AUTH_ROUTES.seller,
    icon: Store,
    activePaths: ['/seller', '/seller/*'],
  },
}

/** The seller inbox, which exists for sellers and nobody else. */
export const SELLER_INQUIRIES_LINK = {
  key: 'sellerInquiries',
  label: 'Inquiries',
  to: AUTH_ROUTES.sellerInquiries,
  icon: MessagesSquare,
  activePaths: ['/seller/inquiries'],
}

/**
 * The mobile tab bar.
 *
 * Five destinations, not six. At 375px a sixth tab leaves 62px each, which forces
 * labels below a legible size or onto two lines. Categories moved to the drawer,
 * which is where a browsable list of a dozen destinations belongs.
 */
export const MOBILE_TABS = [
  { key: 'home', label: 'Home', to: AUTH_ROUTES.home, icon: Home, activePaths: ['/'] },
  {
    key: 'shop',
    label: 'Shop',
    to: MARKETPLACE_ROUTES.shop,
    icon: Search,
    activePaths: ['/phones', '/browse', '/phones/*', '/listings/*', '/compare'],
  },
  {
    key: 'saved',
    label: 'Saved',
    to: AUTH_ROUTES.saved,
    icon: Heart,
    activePaths: ['/saved'],
    requiresBuyerRole: true,
  },
  {
    key: 'cart',
    label: 'Cart',
    to: MARKETPLACE_ROUTES.cart,
    icon: ShoppingBag,
    activePaths: ['/cart'],
    requiresBuyerRole: true,
  },
  {
    key: 'account',
    label: 'Account',
    to: AUTH_ROUTES.account,
    icon: UserCog,
    activePaths: ['/account', '/account/*'],
  },
]

/**
 * Drawer and footer destinations that are *not* already in `PRIMARY_NAV`.
 *
 * Disjointness is the whole point. Anything reachable from the top of the drawer
 * is omitted here rather than repeated under "More".
 */
export const SECONDARY_NAV = [
  {
    key: 'warranty',
    label: 'Warranty',
    to: MARKETPLACE_ROUTES.warranty,
    activePaths: ['/warranty'],
  },
  {
    key: 'returns',
    label: 'Returns and Refunds',
    to: MARKETPLACE_ROUTES.returns,
    activePaths: ['/returns'],
  },
  {
    key: 'shipping',
    label: 'Shipping and Delivery',
    to: MARKETPLACE_ROUTES.shipping,
    activePaths: ['/shipping'],
  },
  {
    key: 'faq',
    label: 'FAQ',
    to: MARKETPLACE_ROUTES.faq,
    activePaths: ['/faq'],
  },
  {
    key: 'contact',
    label: 'Contact Us',
    to: MARKETPLACE_ROUTES.contact,
    activePaths: ['/contact'],
  },
]

/** `/sell` renders an honest "arriving in a later phase" page, never a 404. */
export const SELL_LINK = {
  key: 'sell',
  label: 'Sell Your Phone',
  to: MARKETPLACE_ROUTES.sellerApply,
  icon: Store,
  activePaths: [MARKETPLACE_ROUTES.sellerApply],
}

/** Company and legal pages, which live in the footer rather than the drawer. */
export const ABOUT_LINK = {
  key: 'about',
  label: 'About ReFon',
  to: MARKETPLACE_ROUTES.about,
  activePaths: ['/about'],
}

export const SUSTAINABILITY_LINK = {
  key: 'sustainability',
  label: 'Sustainability',
  to: MARKETPLACE_ROUTES.sustainability,
  activePaths: ['/sustainability'],
}

export const PRIVACY_LINK = {
  key: 'privacy',
  label: 'Privacy Policy',
  to: MARKETPLACE_ROUTES.privacy,
  activePaths: ['/privacy'],
}

export const TERMS_LINK = {
  key: 'terms',
  label: 'Terms of Service',
  to: MARKETPLACE_ROUTES.terms,
  activePaths: ['/terms'],
}

/**
 * Footer groups, assembled from the same entries the rest of the shell uses.
 *
 * The previous footer held its own private arrays, so a label changed in the
 * drawer silently left the footer stale. Composing the groups here is what makes
 * this file the only place a navigation label is written.
 */
export const FOOTER_GROUPS = Object.freeze([
  {
    title: 'Shop',
    links: [
      { label: 'Shop all phones', to: MARKETPLACE_ROUTES.shop },
      { label: 'Browse by category', to: MARKETPLACE_ROUTES.categories },
      { label: CART_LINK.label, to: CART_LINK.to },
    ],
  },
  {
    title: 'Help',
    links: [PRIMARY_NAV[3], PRIMARY_NAV[4], ...SECONDARY_NAV],
  },
  {
    title: 'Company',
    links: [ABOUT_LINK, SUSTAINABILITY_LINK, SELL_LINK],
  },
  {
    title: 'Legal',
    links: [PRIVACY_LINK, TERMS_LINK],
  },
])

/**
 * Who may *use* the purchasing surfaces: the cart and the wishlist.
 *
 * Only a BUYER. A seller and an admin are signed in but have no cart, because buying
 * is a buyer action, and that is what stops a seller buying their own listing.
 */
export function canUseBuyerDestinations(user) {
  return user?.role === 'BUYER'
}

/**
 * Who may *see* the purchasing surfaces.
 *
 * A visitor does, and this is the deliberate difference from `canUseBuyerDestinations`:
 * hiding the cart from someone who has not signed in yet would leave a shopper with
 * no visible way to discover it exists. Clicking it sends them to sign in with their
 * destination remembered, so the click is productive rather than inert.
 *
 * A seller or an admin does not: they are signed in, so there is nothing to sign into,
 * and offering them a cart they can never open would be a dead end.
 */
export function canSeeBuyerDestinations(user) {
  return !user || canUseBuyerDestinations(user)
}

export function workspaceLinkFor(user) {
  return user ? WORKSPACE_LINK_BY_ROLE[user.role] ?? null : null
}

export function canUseSellerInquiries(user) {
  return user?.role === 'SELLER'
}
