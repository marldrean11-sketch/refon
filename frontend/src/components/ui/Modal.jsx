import { useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { quickTransition } from '../../lib/motion.js'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Accessible dialog shell: focus trap, focus restore, Escape to close, and body
 * scroll lock. Every modal in the app composes this rather than re-implementing
 * the behaviour.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  initialFocusRef,
  className = '',
  bodyClassName = '',
}) {
  const panelRef = useRef(null)
  const previouslyFocused = useRef(null)
  const reduceMotion = useReducedMotion()
  const titleId = useId()
  const descriptionId = useId()

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const panel = panelRef.current

      if (!panel) {
        return
      }

      const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      )

      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) {
      return undefined
    }

    previouslyFocused.current = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const focusTarget =
      initialFocusRef?.current ??
      panelRef.current?.querySelector(FOCUSABLE_SELECTOR) ??
      panelRef.current
    focusTarget?.focus?.()

    return () => {
      document.body.style.overflow = overflow
      previouslyFocused.current?.focus?.()
    }
  }, [open, initialFocusRef])

  if (typeof document === 'undefined') {
    return null
  }

  const widthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6"
          onKeyDown={handleKeyDown}
        >
          <motion.div
            className="fixed inset-0 bg-primary-950/60 backdrop-blur-sm"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={quickTransition}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.99 }}
            transition={quickTransition}
            className={`relative z-10 my-auto w-full ${widthClasses[size] ?? widthClasses.md} overflow-hidden rounded-t-card-lg border border-line-2 bg-surface shadow-pop sm:rounded-card-lg ${className}`}
          >
            {title && (
              <header className="flex items-start justify-between gap-4 border-b border-line bg-surface-2 px-5 py-4 sm:px-6">
                <div>
                  <h2 id={titleId} className="font-display text-lg font-bold tracking-tight text-ink">
                    {title}
                  </h2>
                  {description && (
                    <p id={descriptionId} className="mt-1 text-sm text-muted">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid size-10 shrink-0 place-items-center rounded-control border border-line-2 text-muted transition hover:bg-surface-3 hover:text-ink"
                  aria-label="Close dialog"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </header>
            )}
            <div
              className={`max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6 ${bodyClassName}`}
            >
              {children}
            </div>
            {footer && (
              <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface-2 px-5 py-4 sm:px-6">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
