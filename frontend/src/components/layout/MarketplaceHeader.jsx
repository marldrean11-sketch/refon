import { useEffect, useState } from 'react'
import {
  Heart,
  Home,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  MessagesSquare,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserCog,
  UserPlus,
  X,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BrandMark } from '../ui/BrandMark.jsx'
import { AnnouncementBar } from './AnnouncementBar.jsx'
import { SearchBar } from './SearchBar.jsx'
import { MobileTabBar } from './MobileTabBar.jsx'
import { useAuth } from '../../features/auth/useAuth.js'
import { AUTH_ROUTES, MARKETPLACE_ROUTES } from '../../features/auth/auth.routes.js'
import { NotificationBell } from '../../features/notifications/NotificationBell.jsx'
import { useSavedListings } from '../../features/favorites/useSavedListings.js'
import { useCartSummary } from '../../features/cart/useCartSummary.js'
import { quickTransition } from '../../lib/motion.js'

const marketplaceLinks = [
  { label: 'Home', to: AUTH_ROUTES.home, icon: Home },
  { label: 'Shop Phones', to: MARKETPLACE_ROUTES.shop, icon: Search },
  { label: 'Categories', to: MARKETPLACE_ROUTES.categories, icon: LayoutGrid },
  { label: 'How It Works', to: MARKETPLACE_ROUTES.howItWorks, icon: ShieldCheck },
]

const buyerLinks = [
  { label: 'Saved', to: AUTH_ROUTES.saved, icon: Heart, badge: 'saved' },
  { label: 'My Inquiries', to: AUTH_ROUTES.myInquiries, icon: MessagesSquare },
]

const workspaceLinkByRole = {
  ADMIN: { label: 'Admin Dashboard', to: AUTH_ROUTES.admin, icon: ShieldCheck },
  SELLER: { label: 'Seller Dashboard', to: AUTH_ROUTES.seller, icon: Store },
}

const navLinkClasses = (isActive) =>
  `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition duration-200 ${
    isActive ? 'bg-primary-50 text-primary-700' : 'text-muted hover:bg-primary-50/70 hover:text-primary-700'
  }`

const mobileLinkClasses = (isActive) =>
  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
    isActive ? 'bg-primary-50 text-primary-700' : 'text-muted hover:bg-canvas'
  }`

function CountBadge({ count, tone = 'accent', srLabel }) {
  if (!count) {
    return null
  }

  const toneClasses =
    tone === 'primary' ? 'bg-primary-500 text-white' : 'bg-accent-700 text-white'

  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-pill px-1.5 py-0.5 text-[10px] font-bold leading-4 ${toneClasses}`}
    >
      {count > 99 ? '99+' : count}
      <span className="sr-only"> {srLabel}</span>
    </span>
  )
}

export function MarketplaceHeader() {
  const { user, logout } = useAuth()
  const { savedIds } = useSavedListings()
  const { itemCount } = useCartSummary()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const workspaceLink = user ? workspaceLinkByRole[user.role] : null
  const WorkspaceIcon = workspaceLink?.icon
  const showBuyerLinks = Boolean(user) && user.role !== 'ADMIN'
  const savedCount = savedIds?.size ?? 0
  const initials = user?.name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  // Any route change closes the drawer, so a tap-through never leaves it open.
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    await logout()
    navigate(AUTH_ROUTES.login, { replace: true })
  }

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-50 border-b border-line/80 bg-white/85 backdrop-blur-xl">
        <nav
          className="mx-auto flex h-18 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8"
          aria-label="Marketplace navigation"
        >
          <BrandMark onClick={() => setIsMenuOpen(false)} />

          <div className="hidden items-center gap-1 lg:flex">
            {marketplaceLinks.map(({ label, to, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => navLinkClasses(isActive)}>
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}

            {showBuyerLinks &&
              buyerLinks.map(({ label, to, icon: Icon, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => navLinkClasses(isActive)}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                  {badge === 'saved' && <CountBadge count={savedCount} srLabel="saved phones" />}
                </NavLink>
              ))}

            {workspaceLink && (
              <NavLink
                to={workspaceLink.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition duration-200 ${
                    isActive
                      ? 'bg-accent-50 text-accent-800'
                      : 'text-muted hover:bg-accent-50 hover:text-accent-800'
                  }`
                }
              >
                <WorkspaceIcon className="size-4" aria-hidden="true" />
                {workspaceLink.label}
              </NavLink>
            )}
          </div>

          <SearchBar className="ml-auto hidden max-w-md flex-1 xl:block" />

          <div className="ml-auto flex items-center gap-2 xl:ml-0">
            <Link
              to={MARKETPLACE_ROUTES.cart}
              className="relative grid size-11 place-items-center rounded-xl border border-line bg-white text-ink shadow-sm transition duration-200 hover:border-primary-200 hover:bg-primary-50"
              aria-label={`Cart${itemCount ? `, ${itemCount} items` : ', empty'}`}
            >
              <ShoppingBag className="size-5" aria-hidden="true" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1">
                  <CountBadge count={itemCount} tone="primary" srLabel="items in cart" />
                </span>
              )}
            </Link>

            <div className="hidden items-center gap-2 sm:flex">
              {user ? (
                <>
                  <Link
                    to={AUTH_ROUTES.account}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-primary-50 hover:text-primary-700"
                  >
                    <UserCog className="size-4" aria-hidden="true" />
                    Account
                  </Link>
                  <NotificationBell />
                  <div className="mr-1 flex items-center gap-2.5 border-r border-line pr-4">
                    <span className="grid size-9 place-items-center rounded-xl bg-primary-500 text-xs font-bold text-white">
                      {initials}
                    </span>
                    <div className="hidden leading-tight 2xl:block">
                      <p className="max-w-32 truncate text-sm font-semibold text-ink">{user.name}</p>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-xs text-muted transition hover:text-danger"
                      >
                        Sign out
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-red-50 hover:text-danger 2xl:hidden"
                      aria-label="Sign out"
                    >
                      <LogOut className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to={AUTH_ROUTES.login}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-700 transition hover:bg-primary-50"
                  >
                    <LogIn className="size-4" aria-hidden="true" />
                    Sign in
                  </Link>
                  <Link
                    to={AUTH_ROUTES.register}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover"
                  >
                    <UserPlus className="size-4" aria-hidden="true" />
                    Create account
                  </Link>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <NotificationBell />
              <button
                type="button"
                onClick={() => setIsMenuOpen((open) => !open)}
                className="grid size-11 place-items-center rounded-xl border border-line bg-white text-ink shadow-sm transition duration-200 hover:bg-primary-50"
                aria-expanded={isMenuOpen}
                aria-controls="marketplace-mobile-navigation"
                aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              >
                {isMenuOpen ? (
                  <X className="size-5" aria-hidden="true" />
                ) : (
                  <Menu className="size-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </nav>

        <AnimatePresence initial={false}>
          {isMenuOpen && (
            <motion.div
              id="marketplace-mobile-navigation"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={quickTransition}
              className="overflow-hidden border-t border-line bg-white/95 lg:hidden"
            >
              <div className="space-y-3 px-4 py-4">
                <SearchBar className="sm:hidden" />

                {marketplaceLinks.map(({ label, to, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) => mobileLinkClasses(isActive)}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {label}
                  </NavLink>
                ))}

                {showBuyerLinks &&
                  buyerLinks.map(({ label, to, icon: Icon, badge }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) => mobileLinkClasses(isActive)}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      {label}
                      {badge === 'saved' && <CountBadge count={savedCount} srLabel="saved phones" />}
                    </NavLink>
                  ))}

                <Link
                  to={MARKETPLACE_ROUTES.cart}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-muted transition hover:bg-canvas"
                >
                  <ShoppingBag className="size-5" aria-hidden="true" />
                  Cart
                  <CountBadge count={itemCount} tone="primary" srLabel="items in cart" />
                </Link>

                <NavLink
                  to={MARKETPLACE_ROUTES.sellerApply}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) => mobileLinkClasses(isActive)}
                >
                  <Store className="size-5" aria-hidden="true" />
                  Sell Your Phone
                </NavLink>

                {workspaceLink && (
                  <NavLink
                    to={workspaceLink.to}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-accent-50 text-accent-800'
                          : 'text-muted hover:bg-accent-50'
                      }`
                    }
                  >
                    <WorkspaceIcon className="size-5" aria-hidden="true" />
                    {workspaceLink.label}
                  </NavLink>
                )}

                {user && (
                  <NavLink
                    to={AUTH_ROUTES.account}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) => mobileLinkClasses(isActive)}
                  >
                    <UserCog className="size-5" aria-hidden="true" />
                    Account
                  </NavLink>
                )}

                {user ? (
                  <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-500 text-xs font-bold text-white">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                        <p className="text-xs text-muted">
                          {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-white text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-danger"
                      aria-label="Sign out"
                    >
                      <LogOut className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Link
                      to={AUTH_ROUTES.login}
                      onClick={() => setIsMenuOpen(false)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold text-primary-700"
                    >
                      <LogIn className="size-4" aria-hidden="true" />
                      Sign in
                    </Link>
                    <Link
                      to={AUTH_ROUTES.register}
                      onClick={() => setIsMenuOpen(false)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 text-sm font-bold text-white"
                    >
                      <UserPlus className="size-4" aria-hidden="true" />
                      Join ReFon
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <MobileTabBar />
    </>
  )
}
