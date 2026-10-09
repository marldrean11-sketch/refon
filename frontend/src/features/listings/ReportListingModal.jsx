import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  Check,
  Flag,
  LoaderCircle,
  ShieldAlert,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { reportListingRequest } from './listing-api.js'
import { notifyMarketplaceChange } from '../../lib/marketplace-sync.js'
import { standardTransition, usePrefersReducedMotion } from '../../lib/motion.ts'

const MAX_DETAILS = 1000

const reasonOptions = [
  { value: 'SCAM', label: 'Scam or fraud' },
  { value: 'MISLEADING', label: 'Misleading photos or description' },
  { value: 'WRONG_INFO', label: 'Wrong device information' },
  { value: 'PROHIBITED_ITEM', label: 'Prohibited or recalled item' },
  { value: 'OTHER', label: 'Something else' },
]

function getInitialForm() {
  return {
    reason: 'SCAM',
    details: '',
  }
}

export function ReportListingModal({ listing, onClose, open = true }) {
  const [form, setForm] = useState(getInitialForm)
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

    setForm(getInitialForm())
    setErrors({})
    setSubmitError('')
    setStatus('idle')
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    const previouslyFocusedElement = document.activeElement
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => {
      dialogRef.current
        ?.querySelector('input:not([disabled]), textarea:not([disabled]), button:not([disabled])')
        ?.focus()
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

  function selectReason(reason) {
    setForm((current) => ({ ...current, reason }))
    setErrors((current) => ({ ...current, reason: undefined, details: undefined }))
    setSubmitError('')
  }

  function updateDetails(value) {
    setForm((current) => ({ ...current, details: value }))
    setErrors((current) => ({ ...current, details: undefined }))
    setSubmitError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedDetails = form.details.trim()
    const nextErrors = {}

    if (form.reason === 'OTHER' && !trimmedDetails) {
      nextErrors.details = 'Add details so the moderation team can review your report.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setSubmitError('Please complete the highlighted fields.')
      return
    }

    setStatus('submitting')
    setErrors({})
    setSubmitError('')

    try {
      await reportListingRequest(listing.id, {
        reason: form.reason,
        details: trimmedDetails,
      })
      notifyMarketplaceChange()
      setStatus('success')
    } catch (requestError) {
      setStatus('idle')
      const fieldErrors = requestError.errors ?? {}
      setErrors(fieldErrors)
      setSubmitError(
        requestError.message ?? 'Your report could not be submitted.',
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
        aria-label="Close report dialog"
        disabled={status === 'submitting'}
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        aria-describedby="report-modal-description"
        tabIndex={-1}
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.985 }}
        transition={standardTransition}
        className="relative z-10 max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-card-xl border border-white/60 bg-white p-5 shadow-2xl sm:rounded-card-xl sm:p-8"
      >
        {status === 'success' ? (
          <div className="py-5 text-center sm:py-8" aria-live="polite">
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-accent-50 text-accent-600">
              <Check className="size-10" aria-hidden="true" />
            </span>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-accent-700">
              Report received
            </p>
            <h2 id="report-modal-title" className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              Thanks for letting us know.
            </h2>
            <p id="report-modal-description" className="mx-auto mt-4 max-w-md leading-body text-muted">
              Our moderation team reviews every report for the {listing.brand}{' '}
              {listing.model}. We will notify you once it has been looked at.
            </p>
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
                <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-red-700">
                  <Flag className="size-3.5" aria-hidden="true" />
                  Report listing
                </span>
                <h2
                  id="report-modal-title"
                  className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
                >
                  Report this listing
                </h2>
                <p
                  id="report-modal-description"
                  className="mt-2 text-sm leading-relaxed text-muted"
                >
                  {listing.brand} {listing.model} · sold by {listing.sellerName}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={status === 'submitting'}
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-white text-muted transition duration-200 hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close report dialog"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
              <fieldset>
                <legend className="text-sm font-semibold text-ink">
                  Why are you reporting this listing?
                </legend>
                <div className="mt-3 space-y-2">
                  {reasonOptions.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={`report-reason-${option.value}`}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition duration-200 ${
                        form.reason === option.value
                          ? 'border-primary-300 bg-primary-50 text-ink'
                          : 'border-line bg-white text-muted hover:border-line-2'
                      }`}
                    >
                      <input
                        id={`report-reason-${option.value}`}
                        type="radio"
                        name="report-reason"
                        value={option.value}
                        checked={form.reason === option.value}
                        onChange={() => selectReason(option.value)}
                        disabled={status === 'submitting'}
                        className="size-4 accent-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor="report-details"
                  className="text-sm font-semibold text-ink"
                >
                  Details{' '}
                  <span className="font-medium text-muted">
                    {form.reason === 'OTHER' ? '(required)' : '(optional)'}
                  </span>
                </label>
                <textarea
                  id="report-details"
                  name="details"
                  rows={4}
                  maxLength={MAX_DETAILS}
                  value={form.details}
                  onChange={(event) => updateDetails(event.target.value)}
                  disabled={status === 'submitting'}
                  aria-invalid={Boolean(errors.details)}
                  aria-describedby={errors.details ? 'report-details-error' : undefined}
                  placeholder="Tell the moderation team what looks wrong…"
                  className={`mt-2 w-full resize-none rounded-2xl border bg-white p-4 text-[15px] leading-relaxed text-ink shadow-sm transition duration-200 placeholder:text-subtle focus:outline-none focus:ring-4 ${
                    errors.details
                      ? 'border-danger focus:border-danger focus:ring-red-100'
                      : 'border-line hover:border-line-2 focus:border-primary-500 focus:ring-primary-100'
                  }`}
                />
                {errors.details && (
                  <p
                    id="report-details-error"
                    role="alert"
                    className="mt-2 text-xs font-medium text-danger"
                  >
                    {errors.details}
                  </p>
                )}
                <p className="mt-1 text-right text-xs text-muted">
                  {form.details.length}/{MAX_DETAILS}
                </p>
              </div>

              <div className="flex gap-3 rounded-2xl bg-primary-50 p-4 text-sm text-primary-900">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-primary-700" aria-hidden="true" />
                <p className="leading-relaxed">
                  Reports are anonymous to the seller. Serious or repeated reports can
                  remove a listing from the marketplace.
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
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-danger px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {status === 'submitting' ? (
                  <>
                    <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                    Submitting report…
                  </>
                ) : (
                  <>
                    <Flag className="size-4" aria-hidden="true" />
                    Submit report
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
