import { useState } from 'react'
import { AlertCircle, ArrowRight, Mail, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AuthShell } from '../components/auth/AuthShell.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import { AUTH_ROUTES } from '../features/auth/auth.routes.js'
import { forgotPasswordRequest } from '../features/auth/auth-api.js'
import { LoopSpinner } from '../components/ui/LoopSpinner.jsx'

export function ForgotPasswordPage() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (!email.trim()) {
      setFieldError('Enter the email address on your ReFon account.')
      return
    }

    setIsSubmitting(true)
    setFieldError('')
    setFormError('')

    try {
      await forgotPasswordRequest(email.trim())
      setIsSent(true)
    } catch (error) {
      const fieldErrors = error.errors ?? {}
      setFieldError(fieldErrors.email ?? '')
      setFormError(
        Object.keys(fieldErrors).length > 0 ? '' : error.message ?? 'We could not send that link.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell>
      <section className="rounded-card-xl border border-line bg-white/95 p-5 shadow-card backdrop-blur sm:p-9 lg:p-10">
        <div className="mb-8">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
            <ShieldAlert className="size-3.5" aria-hidden="true" />
            Account recovery
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Reset your password
          </h1>
          <p className="mt-3 leading-body text-muted">
            Tell us the email on your account and we will send a link to choose a new
            password. The link works once and expires after an hour.
          </p>
        </div>

        {isSent ? (
          <div
            className="mb-6 flex gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900"
            role="status"
            aria-live="polite"
          >
            <Mail className="mt-0.5 size-5 shrink-0 text-green-700" aria-hidden="true" />
            <div className="leading-relaxed">
              <p className="font-semibold">Check your inbox</p>
              <p className="mt-1">
                If an account matches that email, we have sent it a link. Nothing arrived?
                Look in your spam folder or try a different address.
              </p>
            </div>
          </div>
        ) : (
          <>
            {formError && (
              <div
                className="mb-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
                <p className="leading-relaxed">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <TextField
                id="email"
                name="email"
                label="Email address"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                icon={Mail}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setFieldError('')
                  setFormError('')
                }}
                error={fieldError}
                disabled={isSubmitting}
                required
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-sm font-bold text-page shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-accent hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <LoopSpinner className="size-5" />
                    Sending the link…
                  </>
                ) : (
                  <>
                    Send reset link
                    <ArrowRight
                      className="size-4 transition duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        <div className="mt-7 space-y-3 border-t border-line pt-6 text-center text-sm text-muted">
          <p>
            Remembered it?{' '}
            <Link
              to={AUTH_ROUTES.login}
              className="font-bold text-primary-700 transition hover:text-primary-500 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
          {!user && (
            <p>
              New to ReFon?{' '}
              <Link
                to={AUTH_ROUTES.register}
                className="font-bold text-primary-700 transition hover:text-primary-500 hover:underline"
              >
                Create an account
              </Link>
            </p>
          )}
        </div>
      </section>
    </AuthShell>
  )
}