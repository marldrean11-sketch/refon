import { Heart, Home, LayoutGrid, Search, ShoppingBag, UserCog } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth.js'
import { AUTH_ROUTES, MARKETPLACE_ROUTES } from '../../features/auth/auth.routes.js'
import { useSavedListings } from '../../features/favorites/useSavedListings.js'
import { useCartSummary } from '../../features/cart/useCartSummary.js'
import { useOwnsBottomActionBar } from '../../lib/bottom-action-bar.js'

const TAB_BASE =
  'flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-bold transition min-h-14'

function tabClasses(isActive) {
  return isActive ? `${TAB_BASE} text-primary-700` : `${TAB_BASE} text-muted`
}

function TabCount({ count }) {
  if (!count) {
    return null
  }

  return (
    <span className="absolute right-1/2 top-1 translate-x-4 rounded-pill bg-primary-500 px-1.5 text-[9px] font-bold leading-4 text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

/**
 * Mobile bottom tab bar.
 *
 * Thumbs reach the bottom of the screen on a phone, so the actions a buyer
 * repeats live there instead of behind the hamburger.
 *
 * Buyer-only destinations (Saved) stay hidden for admins, matching the desktop
 * header. An anonymous visitor still sees Account, which routes to sign-in.
 */
export function MobileTabBar() {
  const { user } = useAuth()
  const { savedIds } = useSavedListings()
  const { itemCount } = useCartSummary()
  const savedCount = savedIds?.size ?? 0

  // A product page replaces this bar with its own price-and-action bar. Yielding
  // keeps the two from competing for the same strip.
  const yieldsToActionBar = useOwnsBottomActionBar()

  const showSaved = Boolean(user) && user.role !== 'ADMIN'
  const accountTo = user ? AUTH_ROUTES.account : AUTH_ROUTES.login

  if (yieldsToActionBar) {
    return null
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
      aria-label="Quick navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch gap-1 px-2 py-1.5">
        <NavLink to={AUTH_ROUTES.home} className={({ isActive }) => tabClasses(isActive)}>
          <Home className="size-5" aria-hidden="true" />
          Home
        </NavLink>

        <NavLink to={MARKETPLACE_ROUTES.shop} className={({ isActive }) => tabClasses(isActive)}>
          <Search className="size-5" aria-hidden="true" />
          Shop
        </NavLink>

        <NavLink to={MARKETPLACE_ROUTES.categories} className={({ isActive }) => tabClasses(isActive)}>
          <LayoutGrid className="size-5" aria-hidden="true" />
          Categories
        </NavLink>

        {showSaved && (
          <NavLink to={AUTH_ROUTES.saved} className={({ isActive }) => tabClasses(isActive)}>
            <span className="relative">
              <Heart className="size-5" aria-hidden="true" />
              <TabCount count={savedCount} />
            </span>
            Saved
          </NavLink>
        )}

        <NavLink to={MARKETPLACE_ROUTES.cart} className={({ isActive }) => tabClasses(isActive)}>
          <span className="relative">
            <ShoppingBag className="size-5" aria-hidden="true" />
            <TabCount count={itemCount} />
          </span>
          Cart
        </NavLink>

        <NavLink to={accountTo} className={({ isActive }) => tabClasses(isActive)}>
          <UserCog className="size-5" aria-hidden="true" />
          Account
        </NavLink>
      </div>
    </nav>
  )
}
