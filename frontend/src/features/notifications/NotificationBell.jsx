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
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { AUTH_ROUTES } from '../auth/auth.routes.js'
import {
  getMyNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from './notification-api.js'
import { subscribeToMarketplaceChanges } from '../../lib/marketplace-sync.js'
import { quickTransition } from '../../lib/motion.js'

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
}

function formatRelativeTimestamp(value) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(elapsed / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) {
    return 'Just now'
  }

  if (hours < 1) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  }

  if (days < 1) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }

  if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function getNotificationTarget(notification) {
  if (
    notification.relatedListingId &&
    ['NEW_INQUIRY', 'INQUIRY_SENT', 'LISTING_APPROVED'].includes(
      notification.type,
    )
  ) {
    return `/listings/${notification.relatedListingId}`
  }

  if (notification.type === 'LISTING_SOLD') {
    return AUTH_ROUTES.buyer
  }

  return AUTH_ROUTES.seller
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
  const panelRef = useRef(null)
  const triggerRef = useRef(null)
  const reduceMotion = useReducedMotion()
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

    // eslint-disable-next-line react/set-state-in-effect
    refresh().catch(() => {})

    const refreshInBackground = () => {
      refresh({ silent: true }).catch(() => {})
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
    navigate(getNotificationTarget(notification))
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
        className="relative grid size-11 place-items-center rounded-xl border border-line bg-white text-muted shadow-sm transition duration-200 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-haspopup="dialog"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full border-2 border-white bg-accent-700 px-1 text-[10px] font-bold leading-4 text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

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
            className="absolute right-0 top-14 z-[70] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
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
                            {formatRelativeTimestamp(notification.createdAt)}
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
