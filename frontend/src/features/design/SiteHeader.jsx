/**
 * The navbar.
 *
 * Laid out the way large marketplaces lay out a header, in three rows:
 *
 *   1. A utility strip (`AnnouncementBar`): company and policy links, not sticky.
 *   2. The bar itself: the logo, a search field as wide as the page allows, and
 *      the account, help, and cart actions on the right.
 *   3. A shopping row: the destinations people browse by, led by the one only
 *      ReFon can offer, phones filtered by measured battery health.
 *
 * Rows 2 and 3 are one sticky header. It is solid white from the top of the page,
 * because a search field over the hero must read as a field, and it slides away
 * on the way down and back on the way up (`useNavbarScrollState`).
 *
 * The search field is a button that opens the existing search overlay rather
 * than an inline input. One search surface keeps suggestions, recent searches,
 * and keyboard handling in one place, and it is the same control at every width:
 * a full field from `md` up and an icon below it.
 *
 * What has deliberately not changed: the routes, `navigation-config.js` as the
 * source of truth for role-aware links, the `MOBILE_NAV_ID` that an existing test
 * locates, and the mobile tab bar below the page.
 */
import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BatteryFull,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react'
import { AnnouncementBar } from '../../components/layout/AnnouncementBar.jsx'
import { BrandMark, Wordmark } from '../../components/ui/BrandMark.jsx'
import { Container } from './Container.jsx'
import { CountBadge } from './CountBadge.jsx'
import { MobileTabBar } from './MobileTabBar.jsx'
import { NotificationBell } from '../notifications/NotificationBell.jsx'
import { UserMenu } from './UserMenu.jsx'
import { useAuth } from '../auth/useAuth.js'
import { useCartSummary } from '../cart/useCartSummary.js'
import { useSavedListings } from '../favorites/useSavedListings.js'
import { useOptionalSellerInquiries } from '../inquiries/useSellerInquiries.js'
import { AUTH_ROUTES, DASHBOARD_ROUTES, MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { easings, stagger, usePrefersReducedMotion } from '../../lib/motion.ts'
import {
  canSeeBuyerDestinations,
  canUseBuyerDestinations,
} from './navigation-config.js'
import {
  BATTERY_SHORTCUT,
  NAVBAR_LINKS,
  SHOPPING_SHORTCUTS,
  isNavbarLinkActive,
  underlineLayoutId,
} from './navbar-links.js'
import { NavbarUiProvider, SURFACE, useNavbarUi } from './navbar-ui-context.jsx'
import { SearchOverlay } from './SearchOverlay.jsx'
import { CartDrawer } from './CartDrawer.jsx'
import { useNavbarScrollState } from './useNavbarScrollState.js'

/**
 * The id the mobile navigation has always carried.
 *
 * `buyer-1-saved.spec.js` locates
 * `#marketplace-mobile-navigation a[href="/saved"]` and reads its text to confirm
 * the saved count is on screen. The id is kept rather than renamed to match the
 * new file name, because the test is asserting real behaviour through a stable
 * handle, not an implementation detail we get to invalidate every time the header
 * moves.
 */
const MOBILE_NAV_ID = 'marketplace-mobile-navigation'

/** Icon button, shared by search, cart, and the menu toggle. */
const ICON_BUTTON =
  'grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2'

export function SiteHeader() {
  return (
    <NavbarUiProvider>
      <Header />
    </NavbarUiProvider>
  )
}

function Header() {
  const location = useLocation()
  const pathname = location.pathname
  const { user } = useAuth()
  const { savedIds } = useSavedListings()
  const { itemCount } = useCartSummary()
  useOptionalSellerInquiries()

  const { isSearchOpen, isCartOpen, isMobileMenuOpen, open, close, isAnyOpen } = useNavbarUi()
  const { isScrolled, isHidden } = useNavbarScrollState()
  const reducedMotion = usePrefersReducedMotion()

  const searchTriggerRef = useRef(null)
  const cartTriggerRef = useRef(null)
  const menuTriggerRef = useRef(null)

  const savedCount = savedIds?.size ?? 0

  /**
   * Whether the cart and Saved surfaces appear in this header at all.
   *
   * A visitor sees them and is sent to sign in; a seller or admin does not, because
   * they are already signed in and have no cart to open. `isBuyer` is the separate
   * question of whether the cart is real.
   */
  const showBuyerSurfaces = canSeeBuyerDestinations(user)
  const isBuyer = canUseBuyerDestinations(user)

  // A route change closes every overlay. A tap-through must never leave a panel
  // floating over the page it just navigated to.
  useEffect(() => {
    close()
  }, [close, pathname])

  useEffect(() => {
    if (!isAnyOpen) {
      return undefined
    }

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [isAnyOpen])

  // One Escape handler for whichever overlay is open. Each surface also handles
  // Escape itself, so this is a backstop rather than the mechanism.
  useEffect(() => {
    if (!isAnyOpen) {
      return undefined
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        close()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close, isAnyOpen])

  return (
    <>
      <AnnouncementBar />

      <motion.header
        data-testid="navbar"
        data-scrolled={isScrolled ? 'true' : 'false'}
        data-hidden={isHidden ? 'true' : 'false'}
        aria-label="Site"
        animate={{ y: isHidden ? '-100%' : '0%' }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.28, ease: easings.ui }}
        className={`sticky top-0 z-header border-b bg-page/85 backdrop-blur-xl transition-shadow duration-300 ${
          isScrolled ? 'border-line shadow-sm' : 'border-line'
        }`}
      >
        <Container className="flex h-16 items-center gap-1 sm:gap-3 lg:h-20 lg:gap-8">
          {/* Left: identity. On the narrowest phones a signed-in buyer's
              actions need the room, so the glyph stands alone below 380px. */}
          <BrandMark className="shrink-0" wordmarkClassName="max-[379px]:hidden" />

          {/* Centre: search, as wide as the bar allows. One control at every
              width: a field from `md` up, an icon below it. */}
          <button
            ref={searchTriggerRef}
            type="button"
            data-testid="navbar-search"
            onClick={() => open(SURFACE.search)}
            aria-expanded={isSearchOpen}
            aria-haspopup="dialog"
            className="ml-auto grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-page md:ml-0 md:flex md:h-12 md:w-auto md:min-w-0 md:max-w-[36rem] md:flex-1 md:place-items-start md:items-center md:gap-3 md:border md:border-line-2 md:bg-card md:px-5 md:text-left md:hover:border-accent/60"
          >
            <Search className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            {/* The visible text is the button's name from `md` up, so what a
                sighted visitor reads and what a voice user says are the same
                words. Below `md` the icon stands alone and the name moves to a
                visually hidden span. */}
            <span className="sr-only">Search refurbished phones</span>
            <span className="hidden truncate text-[15px] text-muted md:inline" aria-hidden="true">
              Search iPhone 13, Galaxy S22, Pixel 7…
            </span>
          </button>

          {/* Right: actions.

              No gap below `sm`: a signed-in buyer gets several 44px targets
              here, which with gaps between them overflowed a 375px screen and
              scrolled every page sideways. The targets keep their full size;
              only the spacing between them goes. */}
          <div className="flex shrink-0 items-center gap-0 sm:gap-1 md:ml-auto">
            <Link
              to={MARKETPLACE_ROUTES.faq}
              className="hidden min-h-11 items-center rounded-lg px-3 text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand xl:inline-flex"
            >
              Need help?
            </Link>

            {user ? (
              <>
                <Link
                  to={AUTH_ROUTES.account}
                  data-testid="navbar-account"
                  aria-label="Account"
                  className={`${ICON_BUTTON} hidden sm:grid`}
                >
                  <User className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </Link>
                <UserMenu />
              </>
            ) : (
              <Link
                to={AUTH_ROUTES.login}
                data-testid="navbar-sign-in"
                className="rf-bounce hidden min-h-11 items-center gap-2 rounded-full border border-line-2 px-4 text-[15px] font-semibold text-ink transition-colors duration-150 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:inline-flex"
              >
                <User className="size-5" strokeWidth={1.75} aria-hidden="true" />
                Sign in
              </Link>
            )}

            <NotificationBell />

            {savedCount > 0 && (
              <Link
                to={AUTH_ROUTES.saved}
                data-testid="navbar-saved"
                aria-label={`Saved phones, ${savedCount} saved`}
                className={`${ICON_BUTTON} rf-bounce relative hidden sm:grid`}
              >
                {/* Keyed on the count, so the heart pops again on every save. From
                    `sm` up only: a phone's header row is full (a 44px heart scrolled
                    every page 35px sideways at 390px), and phones have the Saved
                    tab in the bottom bar instead. */}
                <Heart
                  key={savedCount}
                  className={`size-5 fill-current text-heart ${reducedMotion ? '' : 'rf-heart-pop'}`}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span className="absolute -right-0.5 -top-0.5">
                  <CountBadge count={savedCount} srLabel="saved phones" />
                </span>
              </Link>
            )}

            {showBuyerSurfaces &&
              (isBuyer ? (
                /* A button, not a link: the cart is a drawer, and a button is
                   what a control that opens a panel should be. */
                <button
                  ref={cartTriggerRef}
                  type="button"
                  data-testid="navbar-cart"
                  onClick={() => open(SURFACE.cart)}
                  aria-expanded={isCartOpen}
                  aria-haspopup="dialog"
                  aria-label={`Cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
                  className={`${ICON_BUTTON} rf-bounce relative`}
                >
                  <ShoppingBag className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  {itemCount > 0 && (
                    <motion.span
                      data-testid="navbar-cart-badge"
                      key={itemCount}
                      initial={reducedMotion ? false : { scale: 1 }}
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={
                        reducedMotion
                          ? { duration: 0 }
                          : { duration: 0.3, ease: 'easeOut', times: [0, 0.4, 1] }
                      }
                      className="absolute -right-0.5 -top-0.5"
                    >
                      <CountBadge count={itemCount} srLabel="items in cart" />
                    </motion.span>
                  )}
                </button>
              ) : (
                /* A visitor still sees the cart, because hiding it would leave no
                   discoverable way to find it. Clicking it signs them in and brings
                   them back here. No drawer: there is nothing in it to show. */
                <Link
                  to={AUTH_ROUTES.login}
                  state={{ from: MARKETPLACE_ROUTES.cart }}
                  data-testid="navbar-cart"
                  aria-label="Cart, sign in to use"
                  className={ICON_BUTTON}
                >
                  <ShoppingBag className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              ))}

            <button
              ref={menuTriggerRef}
              type="button"
              data-testid="navbar-menu"
              onClick={() => open(SURFACE.mobileMenu)}
              aria-expanded={isMobileMenuOpen}
              aria-haspopup="dialog"
              aria-controls={MOBILE_NAV_ID}
              aria-label="Open menu"
              className={`${ICON_BUTTON} lg:hidden`}
            >
              <Menu className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </Container>

        {/* Row 3: where people shop. It scrolls sideways inside itself on a phone
            rather than wrapping, so the bar keeps one height at every width. */}
        <nav aria-label="Primary" className="border-t border-line">
          <Container>
            <ul className="no-scrollbar -mx-2 flex h-12 items-center gap-1 overflow-x-auto lg:justify-center lg:gap-2">
              <li className="shrink-0">
                <Link
                  to={BATTERY_SHORTCUT.to}
                  data-testid="navbar-battery"
                  className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent-100 px-3 text-[15px] font-semibold text-accent transition-colors duration-150 hover:bg-accent-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <BatteryFull className="size-4" strokeWidth={2} aria-hidden="true" />
                  {BATTERY_SHORTCUT.label}
                </Link>
              </li>
              {NAVBAR_LINKS.slice(0, 1).map((link) => (
                <li key={link.key} className="shrink-0">
                  <NavbarLink link={link} isActive={isNavbarLinkActive(link, pathname)} reduced={reducedMotion} />
                </li>
              ))}
              {SHOPPING_SHORTCUTS.filter((shortcut) => shortcut !== BATTERY_SHORTCUT).map((shortcut) => (
                <li key={shortcut.key} className="shrink-0">
                  <Link
                    to={shortcut.to}
                    data-testid="navbar-shortcut"
                    className="rf-underline inline-flex min-h-10 items-center whitespace-nowrap rounded-lg px-2.5 text-[15px] font-medium text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {shortcut.label}
                  </Link>
                </li>
              ))}
              {NAVBAR_LINKS.slice(1).map((link) => (
                <li key={link.key} className="shrink-0">
                  <NavbarLink link={link} isActive={isNavbarLinkActive(link, pathname)} reduced={reducedMotion} />
                </li>
              ))}
            </ul>
          </Container>
        </nav>
      </motion.header>

      <MobileMenuOverlay />

      <SearchOverlay triggerRef={searchTriggerRef} />
      {/* Buyers only. A visitor is sent to sign in from the cart link instead, and a
          seller or admin has no cart, so an empty drawer would be all they could see. */}
      {isBuyer && <CartDrawer triggerRef={cartTriggerRef} />}

      <MobileTabBar />
    </>
  )
}

/**
 * One navbar link, with the shared sliding underline.
 *
 * The underline is a single element identified by a `layoutId`, rendered by
 * whichever link is active. When the route changes, Framer Motion animates that
 * element from the old link's box to the new one's, so there is no exit
 * animation, no pair of underlines, and no possibility of them overlapping.
 *
 * `aria-current` carries the same information to assistive technology, so the
 * state is never signalled by colour alone.
 */
function NavbarLink({ link, isActive, reduced }) {
  const layoutId = underlineLayoutId(reduced)

  return (
    <Link
      to={link.to}
      data-testid="navbar-link"
      data-active={isActive ? 'true' : 'false'}
      aria-current={isActive ? 'page' : undefined}
      className={`relative inline-flex min-h-10 items-center whitespace-nowrap rounded-lg px-2.5 text-[15px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        isActive ? 'font-semibold text-ink' : 'rf-underline font-medium text-ink'
      }`}
    >
      {link.label}
      {isActive && (
        <motion.span
          data-testid="navbar-underline"
          layoutId={layoutId}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
          className="absolute inset-x-2.5 bottom-0.5 h-0.5 rounded-full bg-brand"
        />
      )}
    </Link>
  )
}

/**
 * The full-screen mobile menu.
 *
 * Transform and opacity only: the panel fades in and its links rise, with nothing
 * that re-runs layout. A height animation here would push the page underneath the
 * overlay on every frame, which is felt most on the low-end phones this menu
 * exists for.
 */
function MobileMenuOverlay() {
  const { isMobileMenuOpen, close } = useNavbarUi()
  const location = useLocation()
  const pathname = location.pathname
  const { user } = useAuth()
  const { itemCount } = useCartSummary()
  const { savedIds } = useSavedListings()
  const reducedMotion = usePrefersReducedMotion()

  const panelRef = useRef(null)
  const triggerRef = useRef(null)

  const savedCount = savedIds?.size ?? 0

  /**
   * Whether the cart call to action is offered here at all.
   *
   * Local to this component, matching `buyerLinks` below: `MobileMenuOverlay` is a
   * separate component from `Header` and cannot read that one's locals.
   */
  const showBuyerSurfaces = canSeeBuyerDestinations(user)

  /**
   * Saved and Cart, for the roles that have them.
   *
   * A visitor keeps both, pointed at sign-in so the tap is not wasted. A seller or
   * admin keeps neither: there is nothing to sign into and no cart to open, and a
   * link to a page that would immediately redirect them back here is a dead end.
   */
  const buyerLinks = [
    {
      key: 'saved',
      label: 'Saved',
      to: user ? AUTH_ROUTES.saved : AUTH_ROUTES.login,
      meta: savedCount,
      from: AUTH_ROUTES.saved,
    },
    {
      key: 'cart',
      label: 'Cart',
      to: user ? MARKETPLACE_ROUTES.cart : AUTH_ROUTES.login,
      meta: itemCount,
      from: MARKETPLACE_ROUTES.cart,
    },
  ].filter(() => canSeeBuyerDestinations(user))

  const links = user
    ? [
        ...buyerLinks,
        ...(user.role === 'BUYER'
          ? [
              { key: 'orders', label: 'My orders', to: DASHBOARD_ROUTES.orders },
              { key: 'inquiries', label: 'My inquiries', to: AUTH_ROUTES.myInquiries },
            ]
          : []),
        { key: 'account', label: 'Account', to: AUTH_ROUTES.account },
        // Only a role with its own workspace gets a dashboard link; a buyer has none.
        ...(user.role === 'ADMIN'
          ? [{ key: 'admin', label: 'Admin dashboard', to: AUTH_ROUTES.admin }]
          : user.role === 'SELLER'
            ? [{ key: 'seller', label: 'Seller dashboard', to: AUTH_ROUTES.seller }]
            : []),
      ]
    : [
        ...buyerLinks,
        { key: 'signin', label: 'Sign in', to: AUTH_ROUTES.login },
        { key: 'join', label: 'Join ReFon', to: AUTH_ROUTES.register },
      ]

  // Route change closes the menu, and focus returns to the hamburger so a keyboard
  // user is not dropped at the top of a new page.
  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined
    }

    // Copied into a local: the cleanup may run long after the ref has been
    // reassigned, and the intent is "the trigger that opened this menu".
    const trigger = triggerRef.current

    return () => {
      trigger?.focus()
    }
  }, [isMobileMenuOpen, pathname])

  if (typeof document === 'undefined') {
    return null
  }

  return (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <motion.div
          key="mobile-menu"
          ref={panelRef}
          id={MOBILE_NAV_ID}
          data-testid="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2, ease: easings.ui }}
          className="fixed inset-0 z-modal flex flex-col overflow-hidden bg-page lg:hidden"
        >
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <Wordmark className="text-2xl" />
            <button
              type="button"
              data-testid="mobile-menu-close"
              onClick={close}
              aria-label="Close menu"
              className="grid size-11 place-items-center rounded-control text-ink transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          <motion.nav
            aria-label="Mobile primary"
            variants={reducedMotion ? undefined : stagger(0.06)}
            initial={reducedMotion ? false : 'hidden'}
            animate="visible"
            className="flex-1 overflow-y-auto px-4 py-6"
          >
            <ul className="flex flex-col">
              {NAVBAR_LINKS.map((link) => (
                <motion.li
                  key={link.key}
                  data-testid="mobile-menu-link"
                  variants={
                    reducedMotion
                      ? undefined
                      : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }
                  }
                >
                  <Link
                    to={link.to}
                    onClick={close}
                    aria-current={isNavbarLinkActive(link, pathname) ? 'page' : undefined}
                    className={`flex min-h-14 items-center justify-between border-b border-line text-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${
                      isNavbarLinkActive(link, pathname) ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </ul>

            <motion.ul
              className="mt-6 flex flex-col"
              variants={reducedMotion ? undefined : stagger(0.06, 0.18)}
            >
              {links.map((link) => (
                <motion.li
                  key={link.key}
                  data-testid="mobile-menu-link"
                  variants={
                    reducedMotion
                      ? undefined
                      : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }
                  }
                >
                  <Link
                    to={link.to}
                    state={link.from && !user ? { from: link.from } : undefined}
                    onClick={close}
                    className="flex min-h-14 items-center justify-between border-b border-line text-lg font-medium text-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                  >
                    {link.label}
                    {link.meta > 0 ? (
                      <span className="rounded-control bg-surface-2 px-2 py-0.5 text-sm tabular-nums text-ink">
                        {link.meta}
                      </span>
                    ) : null}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>

            <motion.div
              variants={
                reducedMotion
                  ? undefined
                  : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }
              }
              className="mt-8"
            >
              {/* The call to action follows the same rule as the links above it: a buyer and a
                visitor both get one, pointed at the cart or at sign-in respectively.
                A seller or admin gets none, because there is no cart to view. */}
              {showBuyerSurfaces && (
                <Link
                  to={user ? MARKETPLACE_ROUTES.cart : AUTH_ROUTES.login}
                  state={user ? undefined : { from: MARKETPLACE_ROUTES.cart }}
                  onClick={close}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-accent px-5 text-[15px] font-semibold text-page transition-colors duration-150 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  <ShoppingBag className="size-4" strokeWidth={1.5} aria-hidden="true" />
                  {user ? 'View cart' : 'Sign in to buy'}
                </Link>
              )}
            </motion.div>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>
  )
}