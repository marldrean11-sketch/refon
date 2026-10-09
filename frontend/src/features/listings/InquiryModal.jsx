import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  Check,
  LoaderCircle,
  MessageCircle,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { TextField } from '../../components/ui/TextField.jsx'
import { submitInquiryRequest } from './listing-api.js'
import { notifyMarketplaceChange } from '../../lib/marketplace-sync.js'
import { standardTransition, usePrefersReducedMotion } from '../../lib/motion.ts'

function getInitialForm(listing) {
  return {
    name: '',
    contactInfo: '',
    message: `Hi, I'm interested in this ${listing.brand} ${listing.model}. Is it still available?`,
  }
}

function focusFirstField(fieldName) {
  const fieldIds = {
    name: 'inquiry-name',
    contactInfo: 'inquiry-contact',
    message: 'inquiry-message',
  }
  window.requestAnimationFrame(() => {
    document.getElementById(fieldIds[fieldName])?.focus()
  })
}

function validateForm({ name, contactInfo, message }) {
  const errors = {}

  if (!name.trim()) {
    errors.name = 'Your name is required.'
  }

  if (!contactInfo.trim()) {
    errors.contactInfo = 'Enter an email address or phone number.'
  }

  if (!message.trim()) {
    errors.message = 'Add a short message for the seller.'
  }

  return errors
}

export function InquiryModal({ listing, onClose, open = true }) {
  const [form, setForm] = useState(() => getInitialForm(listing))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [status, setStatus] = useState('idle')
  const dialogRef = useRef(null)
  const statusRef = useRef(status)
  const reduceMotion = usePrefersReducedMotion()

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const handleClose = useCallback(() => {
    if (statusRef.current === 'submitting') {
      return
    }

    setForm(getInitialForm(listing))
    setErrors({})
    setSubmitError('')
    setStatus('idle')
    onClose()
  }, [listing, onClose])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    const previouslyFocusedElement = document.activeElement
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => {
      const focusTarget = dialogRef.current?.querySelector(
        'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
      )
      focusTarget?.focus()
    }, 0)

    function handleKeyDown(event) {
      if (event.key === 'Escape' && statusRef.current !== 'submitting') {
        handleClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusableElements = [
        ...dialogRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href]',
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
  }, [handleClose, open])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setSubmitError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateForm(form)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setSubmitError('Please complete the highlighted fields.')
      focusFirstField(Object.keys(validationErrors)[0])
      return
    }

    setSubmitError('')
    setStatus('submitting')
    setErrors({})

    try {
      await submitInquiryRequest(listing.id, {
        buyerName: form.name.trim(),
        buyerContact: form.contactInfo.trim(),
        message: form.message.trim(),
      })
      notifyMarketplaceChange()
      setStatus('success')
    } catch (requestError) {
      setStatus('idle')
      const fieldErrors = requestError.errors ?? {}
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length > 0) {
        focusFirstField(Object.keys(fieldErrors)[0])
      }
      setSubmitError(
        requestError.message ?? 'Your inquiry could not be sent.',
      )
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-5">
      <button
        type="button"
        onClick={status === 'submitting' ? undefined : handleClose}
        className="absolute inset-0 bg-primary-950/65 backdrop-blur-sm"
        aria-label="Close inquiry modal"
        disabled={status === 'submitting'}
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-modal-title"
        aria-describedby="inquiry-modal-description"
        tabIndex={-1}
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.985 }}
        transition={standardTransition}
        className="relative z-10 max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-card-xl border border-white/60 bg-white p-5 shadow-2xl sm:rounded-card-xl sm:p-8"
      >
        {status === 'success' ? (
          <div className="py-5 text-center sm:py-8" aria-live="polite">
            <motion.div
              initial={reduceMotion ? false : { scale: 0.65, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 280, damping: 18 }}
              className="mx-auto grid size-20 place-items-center rounded-full bg-accent-50 text-accent-600"
            >
              <svg className="size-11" viewBox="0 0 52 52" aria-hidden="true">
                <motion.circle
                  cx="26"
                  cy="26"
                  r="23"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.55, ease: 'easeOut' }}
                />
                <motion.path
                  d="m15 27 7 7 15-16"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4"
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={reduceMotion ? { duration: 0 } : { delay: 0.2, duration: 0.45, ease: 'easeOut' }}
                />
              </svg>
            </motion.div>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-accent-700">
              Inquiry sent
            </p>
            <h2 id="inquiry-modal-title" className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              Your message is on its way.
            </h2>
            <p id="inquiry-modal-description" className="mx-auto mt-4 max-w-md leading-body text-muted">
              The seller will receive your contact details and message about the{' '}
              {listing.brand} {listing.model}.
            </p>
            <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-xs font-bold text-primary-700">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Inquiry saved securely
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:w-auto sm:px-7"
            >
              <Check className="size-4" aria-hidden="true" />
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-accent-800">
                  <MessageCircle className="size-3.5" aria-hidden="true" />
                  Contact seller
                </span>
                <h2
                  id="inquiry-modal-title"
                  className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
                >
                  Inquire about this phone
                </h2>
                <p
                  id="inquiry-modal-description"
                  className="mt-2 text-sm leading-relaxed text-muted"
                >
                  {listing.brand} {listing.model} · {listing.year} · {listing.storage}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={status === 'submitting'}
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-white text-muted transition duration-200 hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close inquiry modal"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
              <TextField
                id="inquiry-name"
                name="name"
                label="Your name"
                type="text"
                autoComplete="name"
                placeholder="Alex Morgan"
                icon={UserRound}
                value={form.name}
                onChange={updateField}
                error={errors.name}
                disabled={status === 'submitting'}
                autoFocus
                required
              />

              <TextField
                id="inquiry-contact"
                name="contactInfo"
                label="Phone or email"
                type="text"
                autoComplete="email"
                placeholder="you@example.com or +63 900 000 0000"
                icon={MessageCircle}
                value={form.contactInfo}
                onChange={updateField}
                error={errors.contactInfo}
                disabled={status === 'submitting'}
                required
              />

              <div>
                <label
                  htmlFor="inquiry-message"
                  className="text-sm font-semibold text-ink"
                >
                  Message
                </label>
                <textarea
                  id="inquiry-message"
                  name="message"
                  rows={5}
                  value={form.message}
                  onChange={updateField}
                  disabled={status === 'submitting'}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? 'inquiry-message-error' : undefined}
                  className={`mt-2 w-full resize-none rounded-2xl border bg-white p-4 text-[15px] leading-relaxed text-ink shadow-sm transition duration-200 placeholder:text-subtle focus:outline-none focus:ring-4 ${
                    errors.message
                      ? 'border-danger focus:border-danger focus:ring-red-100'
                      : 'border-line hover:border-line-2 focus:border-primary-500 focus:ring-primary-100'
                  }`}
                  required
                />
                {errors.message && (
                  <p
                    id="inquiry-message-error"
                     role="alert"
                    className="mt-2 text-xs font-medium text-danger"
                  >
                    {errors.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 rounded-2xl bg-primary-50 p-4 text-sm text-primary-900">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary-700" aria-hidden="true" />
                <p className="leading-relaxed">
                  Your contact details are shared only with the seller for this
                  inquiry.
                </p>
              </div>

              {submitError && (
                <div
                  className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
                  <p>{submitError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {status === 'submitting' ? (
                  <>
                    <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                    Sending inquiry…
                  </>
                ) : (
                  <>
                    <Send className="size-4" aria-hidden="true" />
                    Send inquiry
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-xs leading-relaxed text-muted">
              Your inquiry is stored for the verified seller to review.
            </p>
          </>
        )}
      </motion.div>
    </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
