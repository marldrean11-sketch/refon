import { useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, LoaderCircle, MailWarning, RefreshCw } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../components/auth/AuthShell.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import { AUTH_ROUTES } from '../features/auth/auth.routes.js'
import {
  resendVerificationRequest,
  verifyEmailRequest,
} from '../features/auth/auth-api.js'

const stateStyles = {
  verifying: {
    icon: LoaderCircle,
    iconClass: 'size-10 animate-spin text-primary-500',
    title: 'Confirming your email',
    tone: 'border-primary-200 bg-primary-50 text-primary-900',
  },
  success: {
    icon: BadgeCheck,
    iconClass: 'size-10 text-green-600',
    title: 'Email confirmed',
    tone: 'border-green-200 bg-green-50 text-green-900',
  },
  error: {
    icon: MailWarning,
    iconClass: 'size-10 text-danger',
    title: 'That link did not work',
    tone: 'border-red-200 bg-red-50 text-red-900',
  },
}

export function VerifyEmailPage() {
  const { user, updateUser } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const [status, setStatus] = useState(token ? 'verifying' : 'error')
  const [errorMessage, setErrorMessage] = useState(
    token ? '' : 'This verification link is missing its token.',
  )
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  // Guards against React 18 StrictMode firing the effect twice.
  const hasAttempted = useRef(false)

  useEffect(() => {
    if (!token || hasAttempted.current) {
      return
    }

    hasAttempted.current = true

    async function verify() {
      try {
        const { user: verifiedUser } = await verifyEmailRequest(token)
        updateUser(verifiedUser)
        setStatus('success')
      } catch (error) {
        setErrorMessage(
          error.message ?? 'This link is invalid or has expired. Please request a new one.',
        )
        setStatus('error')
      }
    }

    verify()
  }, [token, updateUser])

  async function handleResend() {
    setIsResending(true)
    setResendMessage('')

    try {
      const { message } = await resendVerificationRequest()
      setResendMessage(message)
    } catch (error) {
      setResendMessage(error.message ?? 'We could not send a new link.')
    } finally {
      setIsResending(false)
    }
  }

  const panel = stateStyles[status]
  const PanelIcon = panel.icon

  return (
    <AuthShell>
      <section className="rounded-card-xl border border-line bg-white/95 p-5 shadow-card backdrop-blur sm:p-9 lg:p-10">
        <div className="mb-8">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-700">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            Email confirmation
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {panel.title}
          </h1>
        </div>

        <div
          className={`mb-6 flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed ${panel.tone}`}
          role="status"
          aria-live="polite"
        >
          <PanelIcon className={`mt-0.5 size-10 shrink-0 ${panel.iconClass}`} aria-hidden="true" />
          <div>
            {status === 'verifying' && (
              <p>Hold on while we check your link. This only takes a moment.</p>
            )}
            {status === 'success' && (
              <p>
                {user?.name ? `${user.name}, your` : 'Your'} email address is confirmed.
                Everything on your ReFon account is now protected.
              </p>
            )}
            {status === 'error' && <p>{errorMessage}</p>}
          </div>
        </div>

        {status === 'error' && user && !user.emailVerified && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isResending ? (
                <>
                  <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                  Sending a new link…
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Send me a new link
                </>
              )}
            </button>

            {resendMessage && (
              <p className="text-sm text-muted" role="status">
                {resendMessage}
              </p>
            )}
          </div>
        )}

        <div className="mt-7 space-y-3 border-t border-line pt-6 text-center text-sm text-muted">
          {status === 'success' && (
            <button
              type="button"
              onClick={() => navigate(AUTH_ROUTES.account, { replace: true })}
              className="font-bold text-primary-700 transition hover:text-primary-500 hover:underline"
            >
              Go to your account
            </button>
          )}
          <p>
            {status === 'error' && !user ? (
              <>
                Need a link instead?{' '}
                <Link
                  to={AUTH_ROUTES.forgotPassword}
                  className="font-bold text-primary-700 transition hover:text-primary-500 hover:underline"
                >
                  Reset your password
                </Link>
                {' · '}
              </>
            ) : null}
            <Link
              to={user ? AUTH_ROUTES.account : AUTH_ROUTES.login}
              className="font-bold text-primary-700 transition hover:text-primary-500 hover:underline"
            >
              {user ? 'Back to your account' : 'Back to sign in'}
            </Link>
          </p>
        </div>
      </section>
    </AuthShell>
  )
}