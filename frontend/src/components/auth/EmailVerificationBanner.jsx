import { useState } from 'react'
import { LoaderCircle, MailWarning, RefreshCw, X } from 'lucide-react'
import { useAuth } from '../../features/auth/useAuth.js'
import { resendVerificationRequest } from '../../features/auth/auth-api.js'

const DISMISS_KEY = 'refon:verify-email-banner-dismissed'

function readDismissed() {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === 'true'
  } catch {
    // Private browsing modes can refuse storage; stay visible rather than guess.
    return false
  }
}

function rememberDismissed() {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, 'true')
  } catch {
    // Nothing to do: the banner simply reappears on the next render.
  }
}

export function EmailVerificationBanner() {
  const { user } = useAuth()
  const [isDismissed, setIsDismissed] = useState(readDismissed)
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)

  if (!user || user.emailVerified || isDismissed) {
    return null
  }

  async function handleResend() {
    setIsSending(true)

    try {
      await resendVerificationRequest()
      setIsSent(true)
    } catch {
      setIsSent(false)
    } finally {
      setIsSending(false)
    }
  }

  function handleDismiss() {
    setIsDismissed(true)
    rememberDismissed()
  }

  return (
    <div
      className="border-b border-amber-200 bg-amber-50"
      role="status"
      aria-live="polite"
      data-testid="verify-email-banner"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <MailWarning className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-amber-900">
          {isSent ? (
            'A fresh verification link is on its way. Open it to finish confirming your email.'
          ) : (
            <>
              <span className="font-bold">Confirm your email address</span> so we can reach
              you if your password ever needs resetting.
            </>
          )}
        </p>

        {!isSent && (
          <button
            type="button"
            onClick={handleResend}
            disabled={isSending}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition duration-200 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden="true" />
            )}
            Resend link
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss email verification reminder"
          className="grid size-8 shrink-0 place-items-center rounded-xl text-amber-800 transition hover:bg-amber-100 hover:text-amber-950"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}