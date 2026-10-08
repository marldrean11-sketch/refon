import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, LoaderCircle, Trash2, X } from 'lucide-react'
import { standardTransition, usePrefersReducedMotion } from '../../../lib/motion.ts'
import { AnimatePresence, motion } from 'framer-motion'

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  isProcessing = false,
}) {
  const dialogRef = useRef(null)
  const reduceMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    const previouslyFocusedElement = document.activeElement
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector('button:not([disabled])')?.focus()
    }, 0)

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isProcessing) {
        onCancel()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusableElements = [
        ...dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ),
      ].filter((element) => element.offsetParent !== null)

      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocusedElement instanceof HTMLElement) {
        previouslyFocusedElement.focus()
      }
    }
  }, [isProcessing, onCancel, open])

  return createPortal(
    <AnimatePresence>
      {open && (
    <div className="fixed inset-0 z-[110] grid place-items-center p-5">
      <button
        type="button"
        onClick={isProcessing ? undefined : onCancel}
        className="absolute inset-0 bg-primary-950/65 backdrop-blur-sm"
        aria-label="Cancel deletion"
        disabled={isProcessing}
      />
      <motion.div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        tabIndex={-1}
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
        transition={standardTransition}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-card-lg border border-line-2 bg-surface shadow-pop"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-control border border-line-2 text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          aria-label="Close confirmation"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <div className="border-b border-line px-5 py-5 sm:px-6">
          <span className="grid size-10 place-items-center rounded-control bg-red-50 text-danger">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <h2
            id="confirm-dialog-title"
            className="mt-4 font-display text-xl font-bold tracking-tight text-ink"
          >
            {title}
          </h2>
          <p id="confirm-dialog-description" className="mt-2 leading-body text-muted">
            {message}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 bg-surface-2 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="h-11 rounded-control border border-line-2 bg-surface px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted transition hover:bg-surface-3 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-danger px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {isProcessing ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-3.5" aria-hidden="true" />
            )}
            {isProcessing ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
