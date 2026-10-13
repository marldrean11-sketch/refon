import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  BadgeCheck,
  Bell,
  CheckCheck,
  Clock3,
  ExternalLink,
  MessageCircle,
  Send,
  ShieldAlert,
  ShoppingBag,
  TrendingDown,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { AUTH_ROUTES } from '../auth/auth.routes.js'
import {
  getMyNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from './notification-api.js'
import { subscribeToMarketplaceChanges } from '../../lib/marketplace-sync.js'
import { quickTransition, usePrefersReducedMotion } from '../../lib/motion.ts'
import { formatRelativeTime } from '../../lib/format.js'
import { play } from '../../lib/sound.js'

const notificationPresentation = {
  NEW_INQUIRY: {
    icon: MessageCircle,
    iconClass: 'bg-primary-50 text-primary-700',
  },
  INQUIRY_SENT: {
    icon: Send,
    iconClass: 'bg-primary-50 text-primary-700',
  },
  LISTING_APPROVED: {
    icon: BadgeCheck,
    iconClass: 'bg-accent-50 text-accent-700',
  },
  LISTING_REJECTED: {
    icon: ShieldAlert,
    iconClass: 'bg-red-50 text-danger',
  },
  LISTING_SOLD: {
    icon: ShoppingBag,
    iconClass: 'bg-amber-50 text-amber-700',
  },
  SELLER_APPROVED: {
    icon: BadgeCheck,
    iconClass: 'bg-accent-50 text-accent-700',
  },
  SELLER_REJECTED: {
    icon: ShieldAlert,
    iconClass: 'bg-red-50 text-danger',
  },
  LISTING_TAKEN_DOWN: {
    icon: ShieldAlert,
    iconClass: 'bg-red-50 text-danger',
  },
  REPORT_RESOLVED: {
    icon: BadgeCheck,
    iconClass: 'bg-primary-50 text-primary-700',
  },
  PRICE_DROP: {
    icon: TrendingDown,
    iconClass: 'bg-accent text-page',
  },
  INQUIRY_REPLY: {
    icon: MessageCircle,
    iconClass: 'bg-accent text-page',
  },
}

function getNotificationTarget(notification, role) {
  // A reply opens the thread: the seller's inbox, or the buyer's sent inquiries.
  if (notification.type === 'INQUIRY_REPLY') {
    return role === 'SELLER' ? AUTH_ROUTES.sellerInquiries : AUTH_ROUTES.myInquiries
  }

  // Buyer questions belong in the seller's inbox rather than on the listing page.
  if (notification.type === 'NEW_INQUIRY') {
    return AUTH_ROUTES.sellerInquiries
  }

  // A buyer's own sent inquiries open their history page.
  if (notification.type === 'INQUIRY_SENT') {
    return AUTH_ROUTES.myInquiries
  }

  if (
    notification.relatedListingId &&
    notification.type === 'LISTING_APPROVED'
  ) {
    return `/listings/${notification.relatedListingId}`
  }

  // A price drop opens the saved phone so the buyer sees the new price.
  if (notification.type === 'PRICE_DROP') {
    return notification.relatedListingId
      ? `/listings/${notification.relatedListingId}`
      : AUTH_ROUTES.buyer
  }

  // Sold listings stay reachable from the notification so buyers can still see
  // the confirmation banner instead of hitting a missing-listing page.
  if (notification.type === 'LISTING_SOLD') {
    return notification.relatedListingId
      ? `/listings/${notification.relatedListingId}`
      : AUTH_ROUTES.buyer
  }

  // A taken-down listing is the seller's problem to fix.
  if (notification.type === 'LISTING_TAKEN_DOWN') {
    return AUTH_ROUTES.seller
  }

  // Report outcomes land back in the marketplace, not the seller workspace.
  if (notification.type === 'REPORT_RESOLVED') {
    return AUTH_ROUTES.buyer
  }

  return AUTH_ROUTES.seller
}

/** How long a new-notification toast stays up. */
const TOAST_MS = 7000

/** A first visit on this device only toasts something this fresh. */
const FRESH_MS = 30 * 60 * 1000

function seenKey(userId) {
  return `refon:notification-seen:${userId}`
}

/**
 * The newest notification worth a toast, or null. Remembers the newest one seen
 * on this device, so each notification pops up once, including one that arrived
 * while the user was signed out (a seller signing back in after approval).
 */
function takeNewNotification(userId, notifications) {
  const newest = notifications[0]
  if (!userId || !newest) return null
  let seen = null
  try {
    seen = window.localStorage.getItem(seenKey(userId))
    window.localStorage.setItem(seenKey(userId), newest.id)
  } catch {
    // Storage blocked: fall through and judge by age alone.
  }
  if (newest.isRead || seen === newest.id) return null
  if (seen === null && Date.now() - new Date(newest.createdAt).getTime() > FRESH_MS) return null
  return newest
}

export function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const panelRef = useRef(null)
  const triggerRef = useRef(null)
  const reduceMotion = usePrefersReducedMotion()
  const notificationId = useId()
  const panelId = `notifications-panel-${notificationId}`

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }
    setError('')

    try {
      const response = await getMyNotificationsRequest()
      setNotifications(response.notifications)
      setUnreadCount(response.unreadCount)
      return response
    } catch (requestError) {
      setError(requestError.message ?? 'Notifications could not be loaded.')
      throw requestError
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!['SELLER', 'BUYER'].includes(user?.role)) {
      return undefined
    }

    const announce = (response) => {
      const fresh = takeNewNotification(user.id, response.notifications)
      if (fresh) {
        setToast(fresh)
        play('chime')
      }
    }

    // eslint-disable-next-line react/set-state-in-effect
    refresh().then(announce).catch(() => {})

    const refreshInBackground = () => {
      refresh({ silent: true }).then(announce).catch(() => {})
    }
    const unsubscribe = subscribeToMarketplaceChanges(refreshInBackground)
    const intervalId = window.setInterval(refreshInBackground, 30_000)

    window.addEventListener('focus', refreshInBackground)

    return () => {
      unsubscribe()
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshInBackground)
    }
  }, [refresh, user?.id, user?.role])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const previouslyFocusedElement = document.activeElement
    const triggerElement = triggerRef.current
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus()
    }, 0)

    function handlePointerDown(event) {
      if (
        !panelRef.current?.contains(event.target) &&
        event.target !== triggerElement
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocusedElement instanceof HTMLElement) {
        previouslyFocusedElement.focus()
      } else {
        triggerElement?.focus()
      }
    }
  }, [isOpen])

  if (!['SELLER', 'BUYER'].includes(user?.role)) {
    return null
  }

  async function handleNotificationClick(notification) {
    if (!notification.isRead) {
      try {
        await markNotificationReadRequest(notification.id)
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item,
          ),
        )
        setUnreadCount((current) => Math.max(0, current - 1))
      } catch {
        // Navigation should still work if the read receipt cannot be saved.
      }
    }

    setIsOpen(false)
    navigate(getNotificationTarget(notification, user?.role))
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0 || isMarkingAll) {
      return
    }

    setIsMarkingAll(true)
    setError('')
    try {
      await markAllNotificationsReadRequest()
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, isRead: true })),
      )
      setUnreadCount(0)
    } catch (requestError) {
      setError(requestError.message ?? 'Notifications could not be updated.')
    } finally {
      setIsMarkingAll(false)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative grid size-11 place-items-center rounded-control border border-line bg-white text-muted transition duration-200 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-haspopup="dialog"
      >
        <Bell
          key={toast?.id ?? 'bell'}
          className={`size-5 ${toast ? 'rf-bell-ring text-accent' : ''}`}
          aria-hidden="true"
        />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full border-2 border-white bg-accent-700 px-1 text-[10px] font-bold leading-4 text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {toast && !isOpen && (
          <NotificationToast
            key={toast.id}
            notification={toast}
            reduceMotion={reduceMotion}
            onView={() => {
              setToast(null)
              handleNotificationClick(toast)
            }}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="Notifications"
            tabIndex={-1}
            initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
            transition={quickTransition}
            className="absolute right-0 top-14 z-drawer w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-card-lg border border-line bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-600">
                  {user.role === 'BUYER' ? 'Buyer updates' : 'Seller updates'}
                </p>
                <h2 className="mt-1 font-display text-lg font-semibold text-ink">
                  Notifications
                </h2>
              </div>
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0 || isMarkingAll}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                Mark all read
              </button>
            </div>

            {error && (
              <p className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs font-medium text-red-800" role="alert">
                {error}
              </p>
            )}

            <div className="max-h-[min(28rem,calc(100vh-10rem))] overflow-y-auto">
              {isLoading ? (
                <div className="space-y-3 p-4" aria-label="Loading notifications">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded-xl bg-canvas" />
                  ))}
                </div>
              ) : notifications.length > 0 ? (
                <div className="divide-y divide-line">
                  {notifications.slice(0, 10).map((notification) => {
                    const presentation =
                      notificationPresentation[notification.type] ?? {
                        icon: Bell,
                        iconClass: 'bg-canvas text-muted',
                      }
                    const Icon = presentation.icon

                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className={`flex w-full gap-3 px-4 py-4 text-left transition hover:bg-primary-50/60 ${
                          notification.isRead ? 'bg-white' : 'bg-accent-50/45'
                        }`}
                      >
                        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${presentation.iconClass}`}>
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-2">
                            <span className="flex-1 text-sm font-semibold leading-relaxed text-ink">
                              {notification.message}
                            </span>
                            <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
                          </span>
                          <span className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                            <Clock3 className="size-3.5" aria-hidden="true" />
                            {formatRelativeTime(notification.createdAt)}
                            {!notification.isRead && (
                              <span className="ml-1 size-1.5 rounded-full bg-accent-500" aria-label="Unread" />
                            )}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-50 text-primary-700">
                    <Bell className="size-5" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-sm font-semibold text-ink">You’re all caught up</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {user.role === 'BUYER'
                      ? 'Inquiry confirmations and listing availability updates will appear here.'
                      : 'New inquiries and moderation updates will appear here.'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** The pop-up for a notification that just arrived. */
function NotificationToast({ notification, reduceMotion, onView, onClose }) {
  const presentation = notificationPresentation[notification.type] ?? notificationPresentation.REPORT_RESOLVED
  const Icon = presentation.icon

  return (
    <motion.div
      role="status"
      aria-live="polite"
      data-testid="notification-toast"
      initial={reduceMotion ? false : { opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -12, scale: 0.96 }}
      transition={quickTransition}
      className="fixed right-4 top-24 z-drawer flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-card-lg border border-accent/50 bg-card p-4 shadow-2xl"
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${presentation.iconClass}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">New update</p>
        <p className="mt-1 text-sm font-semibold leading-snug text-ink">{notification.message}</p>
        <button
          type="button"
          onClick={onView}
          className="mt-2 text-xs font-bold text-accent underline-offset-4 hover:underline"
        >
          View
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-well hover:text-ink"
        aria-label="Dismiss notification"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </motion.div>
  )
}
