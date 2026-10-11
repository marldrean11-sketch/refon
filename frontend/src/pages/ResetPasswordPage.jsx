import { useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../components/auth/AuthShell.jsx'
import { PasswordField } from '../components/auth/PasswordField.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import { AUTH_ROUTES } from '../features/auth/auth.routes.js'
import { resetPasswordRequest } from '../features/auth/auth-api.js'
import { LoopSpinner } from '../components/ui/LoopSpinner.jsx'

export function ResetPasswordPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = {}

    if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.'
    }

    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Both passwords must match.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)
    setFieldErrors({})
    setFormError('')

    try {
      await resetPasswordRequest({ token, password: form.password })
      // Deliberately no auto sign-in: the new password has to be entered once.
      navigate(AUTH_ROUTES.login, { replace: true })
    } catch (error) {
      const fieldErrors = error.errors ?? {}
      setFieldErrors(fieldErrors)
      setFormError(
        Object.keys(fieldErrors).length > 0
          ? ''
          : error.message ?? 'We could not update your password.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <section className="rounded-card-xl border border-line bg-white/95 p-5 shadow-card backdrop-blur sm:p-9 lg:p-10">
          <div className="mb-8">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
              <KeyRound className="size-3.5" aria-hidden="true" />
              Account recovery
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              This link is incomplete
            </h1>
            <p className="mt-3 leading-body text-muted">
              The reset link is missing its token. Request a fresh one and open it from the
              same device.
            </p>
          </div>

          <Link
            to={AUTH_ROUTES.forgotPassword}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover"
          >
            Request a new link
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <section className="rounded-card-xl border border-line bg-white/95 p-5 shadow-card backdrop-blur sm:p-9 lg:p-10">
        <div className="mb-8">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-green-700">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            One last step
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Choose a new password
          </h1>
          <p className="mt-3 leading-body text-muted">
            Pick something you have not used on ReFon before. You will sign in with it
            once the change is saved.
          </p>
        </div>

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
          <PasswordField
            id="password"
            name="password"
            label="New password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={updateField}
            error={fieldErrors.password}
            disabled={isSubmitting}
            required
          />

          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            value={form.confirmPassword}
            onChange={updateField}
            error={fieldErrors.confirmPassword}
            disabled={isSubmitting}
            required
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {isSubmitting ? (
              <>
                <LoopSpinner className="size-5" />
                Updating your password…
              </>
            ) : (
              <>
                Save new password
                <ArrowRight
                  className="size-4 transition duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </>
            )}
          </button>
        </form>

        <p className="mt-7 border-t border-line pt-6 text-center text-sm text-muted">
          <Link
            to={AUTH_ROUTES.forgotPassword}
            className="font-bold text-primary-700 transition hover:text-primary-500 hover:underline"
          >
            Send the link again
          </Link>
          {!user && (
            <>
              {' · '}
              <Link
                to={AUTH_ROUTES.login}
                className="font-bold text-primary-700 transition hover:text-primary-500 hover:underline"
              >
                Back to sign in
              </Link>
            </>
          )}
        </p>
      </section>
    </AuthShell>
  )
}