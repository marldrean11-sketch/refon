import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { quickTransition } from '../../lib/motion.js'

const ToastContext = createContext(null)

const toneStyles = {
  success: { icon: CheckCircle2, ring: 'ring-accent-200', accent: 'text-accent-700' },
  error: { icon: AlertTriangle, ring: 'ring-red-200', accent: 'text-danger' },
  info: { icon: Info, ring: 'ring-primary-200', accent: 'text-primary-600' },
}

const DEFAULT_DURATION = 4200

/**
 * Toast provider.
 *
 * Everything that succeeds or fails tells the shopper immediately — adding to
 * the cart, saving a phone, placing an order — instead of leaving the change
 * to be inferred from a badge count.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)
  const reduceMotion = useReducedMotion()

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message, { tone = 'info', duration = DEFAULT_DURATION, description } = {}) => {
      const id = nextId.current
      nextId.current += 1

      setToasts((current) => [...current.slice(-2), { id, message, tone, description }])

      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration)
      }

      return id
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      notify,
      success: (message, options) => notify(message, { ...options, tone: 'success' }),
      error: (message, options) => notify(message, { ...options, tone: 'error' }),
      info: (message, options) => notify(message, { ...options, tone: 'info' }),
      dismiss,
    }),
    [notify, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-4 z-toast flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
            role="region"
            aria-label="Notifications"
          >
            <AnimatePresence initial={false}>
              {toasts.map((toast) => {
                const style = toneStyles[toast.tone] ?? toneStyles.info
                const Icon = style.icon

                return (
                  <motion.div
                    key={toast.id}
                    layout
                    role="status"
                    aria-live="polite"
                    initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
                    transition={quickTransition}
                    className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-card-hover ring-1 ${style.ring}`}
                  >
                    <Icon className={`mt-0.5 size-5 shrink-0 ${style.accent}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{toast.message}</p>
                      {toast.description && (
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">
                          {toast.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(toast.id)}
                      className="grid size-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
                      aria-label="Dismiss notification"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider')
  }

  return context
}
