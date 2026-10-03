import { useState } from 'react'
import {
  Heart,
  Home,
  LogIn,
  LogOut,
  Menu,
  MessagesSquare,
  Search,
  ShieldCheck,
  Store,
  UserPlus,
  X,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { BrandMark } from '../ui/BrandMark.jsx'
import { useAuth } from '../../features/auth/useAuth.js'
import { AUTH_ROUTES } from '../../features/auth/auth.routes.js'
import { NotificationBell } from '../../features/notifications/NotificationBell.jsx'
import { useSavedListings } from '../../features/favorites/useSavedListings.js'
import { quickTransition } from '../../lib/motion.js'

const marketplaceLinks = [
  { label: 'Home', to: AUTH_ROUTES.home, icon: Home },
  { label: 'Browse Phones', to: AUTH_ROUTES.buyer, icon: Search },
]

const buyerLinks = [
  { label: 'Saved', to: AUTH_ROUTES.saved, icon: Heart, badge: 'saved' },
  { label: 'My Inquiries', to: AUTH_ROUTES.myInquiries, icon: MessagesSquare },
]

const workspaceLinkByRole = {
  ADMIN: { label: 'Admin Dashboard', to: AUTH_ROUTES.admin, icon: ShieldCheck },
  SELLER: { label: 'Seller Dashboard', to: AUTH_ROUTES.seller, icon: Store },
}

function SavedCountBadge({ count }) {
  if (!count) {
    return null
  }

  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent-700 px-1.5 py-0.5 text-[10px] font-bold leading-4 text-white">
      {count > 99 ? '99+' : count}
      <span className="sr-only"> saved listings</span>
    </span>
  )
}

export function MarketplaceHeader() {
  const { user, logout } = useAuth()
  const { savedIds } = useSavedListings()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const workspaceLink = user ? workspaceLinkByRole[user.role] : null
  const WorkspaceIcon = workspaceLink?.icon
  const showBuyerLinks = Boolean(user) && user.role !== 'ADMIN'
  const savedCount = savedIds?.size ?? 0
  const initials = user?.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  async function handleLogout() {
    await logout()
    navigate(AUTH_ROUTES.login, { replace: true })
  }

  function closeMenu() {
    setIsMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-white/80 backdrop-blur-xl">
      <nav
        className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Marketplace navigation"
      >
        <BrandMark onClick={closeMenu} />

        <div className="hidden items-center gap-1 lg:flex">
          {marketplaceLinks.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-muted hover:bg-primary-50/70 hover:text-primary-700'
                }`
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}

          {showBuyerLinks &&
            buyerLinks.map(({ label, to, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-muted hover:bg-primary-50/70 hover:text-primary-700'
                  }`
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
                {badge === 'saved' && <SavedCountBadge count={savedCount} />}
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

        <div className="hidden items-center gap-2 sm:flex">
          {user ? (
            <>
              <NotificationBell />
              <div className="mr-1 flex items-center gap-2.5 border-r border-line pr-4">
                <span className="grid size-9 place-items-center rounded-xl bg-primary-500 text-xs font-bold text-white">
                  {initials}
                </span>
                <div className="hidden leading-tight xl:block">
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
                  className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-red-50 hover:text-danger xl:hidden"
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
                className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
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
            <div className="space-y-2 px-4 py-4">
              {marketplaceLinks.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-muted hover:bg-canvas'
                    }`
                  }
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
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-muted hover:bg-canvas'
                      }`
                    }
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {label}
                    {badge === 'saved' && <SavedCountBadge count={savedCount} />}
                  </NavLink>
                ))}

              {workspaceLink && (
                <NavLink
                  to={workspaceLink.to}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
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

              {user ? (
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
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
                    onClick={closeMenu}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold text-primary-700"
                  >
                    <LogIn className="size-4" aria-hidden="true" />
                    Sign in
                  </Link>
                  <Link
                    to={AUTH_ROUTES.register}
                    onClick={closeMenu}
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
  )
}
