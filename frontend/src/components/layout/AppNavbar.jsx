import { useState } from 'react'
import {
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Store,
  X,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { NavLink, useNavigate } from 'react-router-dom'
import { BrandMark } from '../ui/BrandMark.jsx'
import { useAuth } from '../../features/auth/useAuth.js'
import { AUTH_ROUTES } from '../../features/auth/auth.routes.js'
import { NotificationBell } from '../../features/notifications/NotificationBell.jsx'
import { quickTransition } from '../../lib/motion.js'

const linksByRole = {
  ADMIN: {
    label: 'Admin Dashboard',
    to: AUTH_ROUTES.admin,
    icon: ShieldCheck,
  },
  SELLER: {
    label: 'Seller Dashboard',
    to: AUTH_ROUTES.seller,
    icon: Store,
  },
  BUYER: {
    label: 'Browse Phones',
    to: AUTH_ROUTES.buyer,
    icon: Search,
  },
}

const roleLabels = {
  ADMIN: 'Administrator',
  SELLER: 'Seller',
  BUYER: 'Buyer',
}

export function AppNavbar() {
  const { user, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const roleLink = linksByRole[user.role] ?? linksByRole.BUYER
  const RoleIcon = roleLink.icon
  const initials = user.name
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

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-white/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <BrandMark onClick={() => setIsMenuOpen(false)} />

        <div className="hidden items-center gap-6 md:flex">
          <NavLink
            to={roleLink.to}
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-muted hover:bg-primary-50/70 hover:text-primary-700'
              }`
            }
          >
            <RoleIcon className="size-4" aria-hidden="true" />
            {roleLink.label}
          </NavLink>

          <div className="h-6 w-px bg-line" aria-hidden="true" />
          <NotificationBell />
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary-500 text-xs font-bold text-white">
              {initials}
            </span>
            <div className="hidden leading-tight lg:block">
              <p className="max-w-36 truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="text-xs text-muted">{roleLabels[user.role]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-muted shadow-sm transition duration-200 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="grid size-11 place-items-center rounded-xl border border-line bg-white text-ink shadow-sm transition duration-200 hover:bg-primary-50"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
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
            id="mobile-navigation"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={quickTransition}
            className="overflow-hidden border-t border-line bg-white/95 md:hidden"
          >
            <div className="space-y-3 px-4 py-4 sm:px-6">
              <NavLink
                to={roleLink.to}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-muted hover:bg-canvas'
                  }`
                }
              >
                <RoleIcon className="size-5" aria-hidden="true" />
                {roleLink.label}
              </NavLink>

              <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-500 text-xs font-bold text-white">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                    <p className="text-xs text-muted">
                      {roleLabels[user.role]}
                      {user.role === 'SELLER' &&
                        ` · ${user.sellerVerificationStatus?.toLowerCase() ?? 'pending'}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-white text-muted transition duration-200 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
