import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { useSavedListings } from '../favorites/useSavedListings.js'
import { useCartSummary } from '../cart/useCartSummary.js'
import { useOwnsBottomActionBar } from '../../lib/bottom-action-bar.js'
import { Container } from './Container.jsx'
import { MOBILE_TABS, canUseBuyerDestinations, isNavActive } from './navigation-config.js'

const TAB_BASE =
  'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-control px-1 py-2 transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-950 focus-visible:ring-inset'

function tabClasses(isActive) {
  if (isActive) {
    return `${TAB_BASE} bg-surface-2 text-ink`
  }

  return `${TAB_BASE} text-muted hover:text-ink`
}

/**
 * The mobile bottom tab bar.
 *
 * ReFon is not a hamburger-only site. Thumbs reach the bottom of a phone, so the
 * destinations a shopper repeats all day live where the thumb already is, and the
 * drawer holds the dozen secondary pages that are read once.
 *
 * Five destinations, not six. At 375px a sixth tab leaves 62px each, which forces
 * the labels below a legible size or into two lines; Categories moved to the
 * drawer, where a browsable list of destinations belongs.
 *
 * Active state is a filled well plus weight plus `aria-current`, never colour
 * alone.
 *
 * `useOwnsBottomActionBar` is what keeps this from colliding with the product
 * page's own sticky price-and-action bar: two `fixed bottom-0` elements cannot
 * share that strip, and a test asserts exactly one exists at any width.
 */
export function MobileTabBar() {
  const { user } = useAuth()
  const { savedIds } = useSavedListings()
  const { itemCount } = useCartSummary()
  const location = useLocation()

  const savedCount = savedIds?.size ?? 0
  const showBuyerDestinations = canUseBuyerDestinations(user)
  const yieldsToActionBar = useOwnsBottomActionBar()

  const tabs = MOBILE_TABS.filter(
    (tab) => !tab.requiresBuyerRole || showBuyerDestinations,
  ).map((tab) =>
    // An anonymous visitor's Account tab is the way in, not a dead destination.
    tab.key === 'account' && !user
      ? { ...tab, to: '/login', activePaths: ['/login'] }
      : tab,
  )

  if (yieldsToActionBar) {
    return null
  }

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-header border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <Container size="full" className="px-0">
        <ul className="flex items-stretch gap-0.5 p-1">
          {tabs.map((tab) => {
            const isActive = isNavActive(tab, location.pathname)
            const count = tab.key === 'saved' ? savedCount : tab.key === 'cart' ? itemCount : 0

            return (
              <li key={tab.key} className="flex flex-1">
                <Link
                  to={tab.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={tabClasses(isActive)}
                >
                  <span className="relative">
                    <tab.icon
                      className={`size-5 ${isActive ? 'text-primary-950' : ''}`}
                      strokeWidth={isActive ? 2.3 : 1.9}
                      aria-hidden="true"
                    />
                    {count > 0 && (
                      <span className="absolute -right-2 -top-1 min-w-4 rounded-[3px] bg-primary-950 px-1 font-mono text-[9px] font-semibold leading-4 text-white">
                        {count > 99 ? '99+' : count}
                        <span className="sr-only">
                          {tab.key === 'saved' ? ' saved' : ' in cart'}
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.06em]">
                    {tab.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Container>
    </nav>
  )
}