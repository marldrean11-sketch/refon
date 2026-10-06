import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LogIn, Menu, Search, ShoppingBag, UserPlus, X } from 'lucide-react'
import { BrandMark } from '../../components/ui/BrandMark.jsx'
import { AnnouncementBar } from '../../components/layout/AnnouncementBar.jsx'
import { SearchBar } from '../../components/layout/SearchBar.jsx'
import { NotificationBell } from '../notifications/NotificationBell.jsx'
import { useAuth } from '../auth/useAuth.js'
import { useSavedListings } from '../favorites/useSavedListings.js'
import { useCartSummary } from '../cart/useCartSummary.js'
import { useOptionalSellerInquiries } from '../inquiries/useSellerInquiries.js'
import { AUTH_ROUTES } from '../../lib/routes.js'
import { quickTransition, usePrefersReducedMotion } from '../../lib/motion.ts'
import { Container } from './Container.jsx'
import { CountBadge } from './CountBadge.jsx'
import { UserMenu } from './UserMenu.jsx'
import { MobileTabBar } from './MobileTabBar.jsx'
import { Divider } from './Divider.jsx'
import {
  ACCOUNT_LINK,
  ACCOUNT_NAV,
  CART_LINK,
  PRIMARY_NAV,
  SECONDARY_NAV,
  SELL_LINK,
  SELLER_INQUIRIES_LINK,
  canUseBuyerDestinations,
  canUseSellerInquiries,
  isNavActive,
  workspaceLinkFor,
} from './navigation-config.js'

/**
 * The id the drawer has always carried.
 *
 * The mobile-navigation test locates `#marketplace-mobile-navigation a[href="/saved"]`
 * and reads its text to confirm the saved count is on screen. The id is kept
 * rather than renamed to match the new file name, because the test is asserting
 * real behaviour through a stable handle, not an implementation detail we get to
 * invalidate every time the header moves.
 */
const MOBILE_NAV_ID = 'marketplace-mobile-navigation'

/**
 * Desktop navigation item.
 *
 * The active state is an underline, not a filled pill. A filled pill turns the
 * current page into a button-looking object and gives four destinations the same
 * visual weight as the two real actions on the right; a rule under the label
 * marks position in the bar and leaves the actions as the only heavy things on
 * the row. Weight, the rule, and `aria-current` all change together so the
 * current page is never signalled by colour alone.
 *
 * `min-h-11` rather than `py-2`: the bar is 68px tall, so a 44px target costs
 * nothing in width and is the difference between a comfortable target on a
 * touch laptop or an iPad in landscape and a 32px strip.
 */
const desktopLinkClasses = (isActive) =>
  `relative inline-flex min-h-11 shrink-0 items-center px-2.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] transition duration-150 ${
    isActive ? 'text-ink' : 'text-muted hover:text-ink'
  }`

const drawerSectionLabel =
  'font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle'

const drawerLinkClasses = (isActive) =>
  `flex min-h-12 items-center gap-3 border-l-2 pl-3.5 pr-3 text-[15px] transition duration-150 ${
    isActive
      ? 'border-primary-950 font-semibold text-ink'
      : 'border-transparent font-medium text-muted hover:border-line-2 hover:text-ink'
  }`

/**
 * The role's own workspace is the one jade item in the bar.
 *
 * Jade is a signal, not a surface, so it is spent on exactly one thing: the link
 * that takes a seller or an administrator to their work. Spending it here means
 * the bar still reads as Obsidian for a shopper and points a workspace holder
 * straight at it.
 */
const workspaceLinkClasses = (isActive) =>
  `relative inline-flex min-h-9 shrink-0 items-center rounded-control px-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition duration-150 ${
    isActive
      ? 'bg-accent-600 text-white'
      : 'bg-accent-50 text-accent-800 ring-1 ring-inset ring-accent-300 hover:bg-accent-100'
  }`

/**
 * One navigation item.
 *
 * A plain `Link` with an explicitly computed active state rather than `NavLink`.
 * `NavLink` decides activeness from its own prefix rules, which cannot express
 * "Shop is active on `/phones/:slug`" or "Home is active only on `/`", and it
 * applies `aria-current="page"` on those same wrong rules. Owning both means the
 * highlight and the announced state can never disagree.
 */
function NavItem({ item, isActive, className, showIcon = false, children }) {
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      aria-current={isActive ? 'page' : undefined}
      className={className(isActive)}
    >
      {isActive && className === desktopLinkClasses && (
        <span
          className="absolute inset-x-2.5 -bottom-px h-0.5 bg-primary-950"
          aria-hidden="true"
        />
      )}
      {showIcon && Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      {item.label}
      {children}
    </Link>
  )
}

/**
 * The one global header for the whole application.
 *
 * Replaces `MarketplaceHeader` and `AppNavbar`, which between them ran two
 * different link lists, two different mobile drawers, two different cart and
 * account treatments, and two different breakpoints for "now show the desktop
 * nav". This component keeps everything both did — marketplace links, search,
 * cart with a real count, saved with a real count, notifications, the seller
 * inbox with its unread count, the role workspace, guest sign-in, sign out — and
 * presents it once, in the ReFon design language.
 *
 * The bar is deliberately partitioned with hairline dividers rather than spacing.
 * Three zones — identity, catalogue, action — stay legible as three zones at
 * every width, which pure padding cannot do once a search field is in the row.
 *
 * `MobileTabBar` is rendered as a *sibling* of `<header>`, not inside it. A
 * `position: sticky` element with a z-index creates a stacking context, so a tab
 * bar nested inside it would be trapped beneath page content it must cover. The
 * tab bar owning the bottom edge of the viewport only works while it is a sibling.
 */
export function SiteHeader() {
  const { user, logout } = useAuth()
  const { savedIds } = useSavedListings()
  const { itemCount } = useCartSummary()
  const { unreadCount } = useOptionalSellerInquiries()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const drawerButtonRef = useRef(null)
  const location = useLocation()
  const reduceMotion = usePrefersReducedMotion()

  const pathname = location.pathname
  const savedCount = savedIds?.size ?? 0
  const showBuyerLinks = canUseBuyerDestinations(user)
  const showSellerInquiries = canUseSellerInquiries(user)
  const workspace = workspaceLinkFor(user)

  // Any route change closes the drawer, so a tap-through never leaves it open
  // behind the page it navigated to.
  useEffect(() => {
    setIsDrawerOpen(false)
  }, [pathname])

  // A drawer that is taller than the viewport must still be reachable, so it
  // scrolls independently instead of pushing the page.
  useEffect(() => {
    if (!isDrawerOpen) {
      return undefined
    }

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [isDrawerOpen])

  useEffect(() => {
    if (!isDrawerOpen) {
      return undefined
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setIsDrawerOpen(false)
        drawerButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isDrawerOpen])

  async function handleLogout() {
    await logout()
    setIsDrawerOpen(false)
  }

  const buyerNavItems = ACCOUNT_NAV.filter(
    (item) => !item.requiresBuyerRole || showBuyerLinks,
  )

  return (
    <>
      <AnnouncementBar />

      <header className="sticky top-0 z-header border-b border-line bg-surface">
        <Container className="flex h-16 items-center lg:h-[4.25rem]">
          {/* Zone 1 — identity. */}
          <div className="flex shrink-0 items-center gap-3">
            <BrandMark onClick={() => setIsDrawerOpen(false)} className="min-h-11" />
            <Divider />
          </div>

          {/* Zone 2 — catalogue. Text-only at every width so five destinations
              plus the action cluster fit at 1024px, which is a tested
              breakpoint rather than a guess. */}
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center">
              {PRIMARY_NAV.map((item) => (
                <li key={item.key}>
                  <NavItem
                    item={item}
                    isActive={isNavActive(item, pathname)}
                    className={desktopLinkClasses}
                  />
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2 lg:ml-auto lg:gap-3">
            {/* Search only appears where there is genuinely room for it. The shop
                page carries its own field and the drawer carries one, so nothing
                is unreachable at narrower widths. */}
            <div className="hidden min-w-0 xl:block xl:w-72 2xl:w-96">
              <SearchBar />
            </div>

            <Divider className="mx-0" />

            {/* Zone 3 — actions. */}
            <nav aria-label="Account" className="hidden items-center lg:flex">
              <ul className="flex items-center gap-1">
                {/* Saved carries its real count in the primary bar at xl and
                    above; below that the user menu is its way in, so the
                    destination is never unreachable. */}
                {showBuyerLinks && (
                  <li className="hidden xl:block">
                    <NavItem
                      item={ACCOUNT_NAV[0]}
                      isActive={isNavActive(ACCOUNT_NAV[0], pathname)}
                      className={desktopLinkClasses}
                    >
                      <CountBadge count={savedCount} srLabel="saved phones" />
                    </NavItem>
                  </li>
                )}
                <li>
                  <NavItem
                    item={ACCOUNT_LINK}
                    isActive={isNavActive(ACCOUNT_LINK, pathname)}
                    className={desktopLinkClasses}
                  />
                </li>
                {/* The workspace link stays visible on desktop rather than
                    living only in the user menu, so the bar still identifies
                    itself while you are standing on /admin. */}
                {workspace && (
                  <li>
                    <NavItem
                      item={workspace}
                      isActive={isNavActive(workspace, pathname)}
                      className={workspaceLinkClasses}
                    />
                  </li>
                )}
              </ul>
            </nav>

            <Link
              to={CART_LINK.to}
              aria-current={isNavActive(CART_LINK, pathname) ? 'page' : undefined}
              aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ', empty'}`}
              className="relative grid size-11 shrink-0 place-items-center rounded-control border border-line-2 bg-surface text-ink transition duration-150 hover:border-primary-950 hover:bg-primary-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-950 focus-visible:ring-offset-2"
            >
              <ShoppingBag className="size-5" aria-hidden="true" />
              {itemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5">
                  <CountBadge count={itemCount} srLabel="items in cart" />
                </span>
              )}
            </Link>

            <NotificationBell />

            {user ? (
              <UserMenu />
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  to={AUTH_ROUTES.login}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-control px-2.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-muted transition duration-150 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-950 focus-visible:ring-offset-2"
                >
                  Sign in
                </Link>
                <Link
                  to={AUTH_ROUTES.register}
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control bg-primary-950 px-4 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition duration-150 hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-950 focus-visible:ring-offset-2"
                >
                  <UserPlus className="size-3.5" aria-hidden="true" />
                  <span className="hidden 2xl:inline">Create account</span>
                  <span className="2xl:hidden">Join</span>
                </Link>
              </div>
            )}

            <button
              ref={drawerButtonRef}
              type="button"
              onClick={() => setIsDrawerOpen((open) => !open)}
              aria-expanded={isDrawerOpen}
              aria-controls={MOBILE_NAV_ID}
              aria-label={
                isDrawerOpen ? 'Close navigation menu' : 'Open navigation menu'
              }
              className="grid size-11 shrink-0 place-items-center rounded-control border border-line-2 bg-surface text-ink transition duration-150 hover:border-primary-950 hover:bg-primary-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-950 focus-visible:ring-offset-2 lg:hidden"
            >
              {isDrawerOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </Container>

        <AnimatePresence initial={false}>
          {isDrawerOpen && (
            <motion.div
              id={MOBILE_NAV_ID}
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={quickTransition}
              /* Opacity and a small `y` offset, not a height animation. `height: 0`
                 to `height: auto` re-runs layout on every frame of the drawer,
                 which is what makes an opening menu shove the page down beneath
                 it; a transform slides the same content in while moving nothing
                 else. The `isDrawerOpen &&` above still unmounts the drawer when
                 it is closed, so it contributes no height when absent. */
              className="border-t border-line bg-surface lg:hidden"
            >
              <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
                {/* `pb-32` clears the mobile tab bar, which is fixed to the bottom
                    edge at exactly the widths where this drawer is visible. Without
                    it the last destination — sign-out or the join buttons — sat
                    underneath the bar with no way to scroll it clear. */}
                <Container className="pb-32 pt-5">
                  <SearchBar showSuggestions={false} />

                  <nav aria-label="Mobile primary" className="mt-6">
                    <p className={drawerSectionLabel}>Shop</p>
                    <ul className="mt-2 space-y-0.5">
                      {PRIMARY_NAV.map((item) => (
                        <li key={item.key}>
                          <NavItem
                            item={item}
                            isActive={isNavActive(item, pathname)}
                            className={drawerLinkClasses}
                            showIcon
                          />
                        </li>
                      ))}

                      {buyerNavItems.map((item) => (
                        <li key={item.key}>
                          <NavItem
                            item={item}
                            isActive={isNavActive(item, pathname)}
                            className={drawerLinkClasses}
                            showIcon
                          >
                            {item.key === 'saved' && (
                              <CountBadge count={savedCount} srLabel="saved phones" />
                            )}
                          </NavItem>
                        </li>
                      ))}

                      <li>
                        <NavItem
                          item={CART_LINK}
                          isActive={isNavActive(CART_LINK, pathname)}
                          className={drawerLinkClasses}
                          showIcon
                        >
                          <CountBadge count={itemCount} srLabel="items in cart" />
                        </NavItem>
                      </li>

                      {showSellerInquiries && (
                        <li>
                          <NavItem
                            item={SELLER_INQUIRIES_LINK}
                            isActive={isNavActive(SELLER_INQUIRIES_LINK, pathname)}
                            className={drawerLinkClasses}
                            showIcon
                          >
                            <CountBadge count={unreadCount} srLabel="unread inquiries" />
                          </NavItem>
                        </li>
                      )}

                      {workspace && (
                        <li>
                          <NavItem
                            item={workspace}
                            isActive={isNavActive(workspace, pathname)}
                            className={drawerLinkClasses}
                            showIcon
                          />
                        </li>
                      )}

                      {user && (
                        <li>
                          <NavItem
                            item={ACCOUNT_LINK}
                            isActive={isNavActive(ACCOUNT_LINK, pathname)}
                            className={drawerLinkClasses}
                            showIcon
                          />
                        </li>
                      )}
                    </ul>
                  </nav>

                  <nav aria-label="More ReFon pages" className="mt-7">
                    <p className={drawerSectionLabel}>Policies and company</p>
                    <ul className="mt-2 space-y-0.5">
                      {SECONDARY_NAV.map((item) => (
                        <li key={item.key}>
                          <NavItem
                            item={item}
                            isActive={isNavActive(item, pathname)}
                            className={drawerLinkClasses}
                          />
                        </li>
                      ))}

                      <li>
                        <NavItem
                          item={SELL_LINK}
                          isActive={isNavActive(SELL_LINK, pathname)}
                          className={drawerLinkClasses}
                          showIcon
                        />
                      </li>
                    </ul>
                  </nav>

                  {user ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-control border border-line-2 bg-surface px-4 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-muted transition duration-150 hover:border-red-300 hover:bg-red-50 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-950"
                    >
                      Sign out
                    </button>
                  ) : (
                    <div className="mt-7 grid grid-cols-2 gap-3">
                      <Link
                        to={AUTH_ROUTES.login}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-line-2 bg-surface px-4 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink transition duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-950"
                      >
                        <LogIn className="size-4" aria-hidden="true" />
                        Sign in
                      </Link>
                      <Link
                        to={AUTH_ROUTES.register}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-primary-950 px-4 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition duration-150 hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-950"
                      >
                        <UserPlus className="size-4" aria-hidden="true" />
                        Join ReFon
                      </Link>
                    </div>
                  )}

                  <p className="mt-6 flex items-start gap-2 border-t border-line pt-5 text-xs leading-relaxed text-subtle">
                    <Search className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    Prices, grades, and battery health are published on every
                    listing.
                  </p>
                </Container>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Sibling of <header>, never a child: see the note on this component. */}
      <MobileTabBar />
    </>
  )
}