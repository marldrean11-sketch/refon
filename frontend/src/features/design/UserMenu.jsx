import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '../auth/useAuth.js'
import { AUTH_ROUTES } from '../../lib/routes.js'
import { useOptionalSellerInquiries } from '../inquiries/useSellerInquiries.js'
import { useSavedListings } from '../favorites/useSavedListings.js'
import { quickTransition, usePrefersReducedMotion } from '../../lib/motion.ts'
import {
  ACCOUNT_NAV,
  SELLER_INQUIRIES_LINK,
  canUseBuyerDestinations,
  canUseSellerInquiries,
  workspaceLinkFor,
} from './navigation-config.js'
import { CountBadge } from './CountBadge.jsx'

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  SELLER: 'Seller',
  BUYER: 'Buyer',
}

const MENU_ITEM =
  'flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-sm font-medium text-ink transition duration-150 hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none'

function initialsOf(name) {
  return (
    name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() ?? ''
  )
}

/**
 * The signed-in identity menu.
 *
 * Both previous headers squeezed an avatar, a truncated name, and a bare "Sign
 * out" text link into the header row, which left the role, the seller's
 * verification state, and the unread inquiry count with nowhere to go. The avatar
 * now opens a proper menu and the header row carries only actions.
 *
 * It is a disclosure rather than a `role="menu"` widget on purpose: every item is
 * a real link to a real route, so screen-reader and keyboard users get ordinary
 * link navigation, and Escape plus click-outside close it without an arrow-key
 * menu model to get wrong.
 *
 * The panel is rendered only while open. Beyond being tidier, it keeps
 * role-gated links out of the document entirely when the menu is closed, so an
 * administrator can never be counted as having a Saved or My Inquiries link.
 */
export function UserMenu() {
  const { user, logout } = useAuth()
  const { unreadCount } = useOptionalSellerInquiries()
  const { savedIds } = useSavedListings()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const reduceMotion = usePrefersReducedMotion()

  // A route change closes the menu, so a tap-through never leaves it hanging open.
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function onPointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  if (!user) {
    return null
  }

  const workspace = workspaceLinkFor(user)
  const showBuyerLinks = canUseBuyerDestinations(user)
  const showSellerInquiries = canUseSellerInquiries(user)
  const role = ROLE_LABELS[user.role] ?? user.role
  const savedCount = savedIds?.size ?? 0

  async function handleLogout() {
    setIsOpen(false)
    await logout()
    navigate(AUTH_ROUTES.login, { replace: true })
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="refon-user-menu"
        // The name starts with the visible initials so speech-input users can say
        // what they see (axe: label-content-name-mismatch).
        aria-label={`${initialsOf(user.name)} account menu for ${user.name}, signed in as ${role}`}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-control bg-primary-950 pl-1 pr-1.5 transition duration-150 hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-950 focus-visible:ring-offset-2 sm:pr-2"
      >
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-full bg-page font-mono text-xs font-semibold text-accent"
        >
          {initialsOf(user.name)}
        </span>
        <ChevronDown
          className={`size-3.5 text-page transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id="refon-user-menu"
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={quickTransition}
            className="absolute right-0 top-[3.25rem] z-drawer w-72 origin-top-right overflow-hidden rounded-card border border-line-2 bg-surface shadow-pop"
          >
            <div className="border-b border-line px-4 py-3.5">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">
                {role}
                {user.role === 'SELLER' &&
                  ` · ${user.sellerVerificationStatus?.toLowerCase() ?? 'pending'}`}
              </p>
            </div>

            <div className="p-1.5">
              {showBuyerLinks &&
                ACCOUNT_NAV.map((item) => (
                  <Link key={item.key} to={item.to} className={MENU_ITEM}>
                    <item.icon className="size-4 shrink-0 text-subtle" aria-hidden="true" />
                    {item.label}
                    {item.key === 'saved' && (
                      <CountBadge count={savedCount} srLabel="saved phones" />
                    )}
                  </Link>
                ))}

              {showSellerInquiries && (
                <Link to={SELLER_INQUIRIES_LINK.to} className={MENU_ITEM}>
                  <SELLER_INQUIRIES_LINK.icon
                    className="size-4 shrink-0 text-subtle"
                    aria-hidden="true"
                  />
                  {SELLER_INQUIRIES_LINK.label}
                  <CountBadge count={unreadCount} tone="accent" srLabel="unread inquiries" />
                </Link>
              )}

              {workspace && (
                <Link to={workspace.to} className={MENU_ITEM}>
                  <workspace.icon className="size-4 shrink-0 text-subtle" aria-hidden="true" />
                  {workspace.label}
                </Link>
              )}

              <Link to={AUTH_ROUTES.account} className={MENU_ITEM}>
                <span
                  className="size-4 shrink-0 rounded-[2px] bg-primary-200"
                  aria-hidden="true"
                />
                Account settings
              </Link>
            </div>

            <div className="border-t border-line p-1.5">
              <button
                type="button"
                onClick={handleLogout}
                className={`${MENU_ITEM} text-danger hover:bg-red-50 focus-visible:bg-red-50`}
              >
                <LogOut className="size-4 shrink-0" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}