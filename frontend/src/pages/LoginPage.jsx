import { useState } from 'react'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/auth/AuthShell.jsx'
import { celebrateNextPage } from '../components/layout/WelcomeBurst.jsx'
import { LogoGlyph } from '../components/ui/BrandMark.jsx'
import { PasswordField } from '../components/auth/PasswordField.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import { AUTH_ROUTES, getRoleHome } from '../features/auth/auth.routes.js'
import {
  getSafeDestination,
  validateLoginForm,
} from '../features/auth/auth.validation.js'
import { canUseBuyerDestinations } from '../features/design/navigation-config.js'
import { clearIntent } from '../features/cart/pending-intent.js'

const initialForm = {
  email: '',
  password: '',
}

function focusFirstField(fieldName) {
  window.requestAnimationFrame(() => {
    document.getElementById(fieldName)?.focus()
  })
}

export function LoginPage() {
  const { login, initializationError } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = validateLoginForm(form)

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      focusFirstField(Object.keys(errors)[0])
      return
    }

    setIsSubmitting(true)
    setFieldErrors({})
    setFormError('')

    try {
      const user = await login({
        email: form.email.trim(),
        password: form.password,
      })

      // Where they were going, if it is safe to send them there.
      //
      // The destination is honoured for every role, not just a buyer. A seller who
      // clicked a heart on a product page and signed in should land back on that
      // product, not on their dashboard. The routes a role genuinely cannot use —
      // `/cart`, `/checkout` — are dealt with by `RequireBuyer` on arrival, which
      // sends a non-buyer to their own workspace, so there is no need to second-guess
      // the role here.
      const destination = getSafeDestination(location.state?.from, getRoleHome(user.role))

      // A pending intent only means something for a buyer. A seller or admin who signs
      // in gets it dropped, so it cannot fire later under a different account.
      if (!canUseBuyerDestinations(user)) {
        clearIntent()
      }

      celebrateNextPage('login')
      navigate(destination, { replace: true })
    } catch (error) {
      const fieldErrors = error.errors ?? {}
      setFieldErrors(fieldErrors)
      if (Object.keys(fieldErrors).length > 0) {
        focusFirstField(Object.keys(fieldErrors)[0])
      }
      setFormError(error.message ?? 'Sign in failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const visibleError = formError || initializationError

  /**
   * The registration link carries the destination across in the query string rather
   * than in router state.
   *
   * Someone sent here by clicking Cart or a heart may well not have an account, and a
   * state-based `from` would be lost the moment they switched from sign-in to sign-up.
   * A query parameter survives that, and survives the reload that registration can
   * cause, which is what lets the deferred add-to-cart finish on the register path
   * too. `getSafeDestination` re-validates it at the far end.
   */
  const registerHref = location.state?.from
    ? `${AUTH_ROUTES.register}?next=${encodeURIComponent(location.state.from)}`
    : AUTH_ROUTES.register

  return (
    <AuthShell>
      <section className="rounded-card-lg border border-line bg-card p-5 sm:p-8">
        <div className="mb-7">
          <p className="font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-accent">
            Welcome back
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
            Sign in to ReFon
          </h1>
          <p className="mt-2.5 leading-body text-muted">
            Bago ka lang?{' '}
            <Link to={registerHref} className="font-semibold text-accent hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        {visibleError && (
          <div
            className="mb-6 rounded-2xl border border-danger/50 bg-red-50 p-4 text-sm text-danger"
            role="alert"
            aria-live="assertive"
          >
            <p className="flex gap-2.5 leading-relaxed">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {visibleError}
            </p>
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
            value={form.email}
            onChange={updateField}
            error={fieldErrors.email}
            disabled={isSubmitting}
            required
          />

          <PasswordField
            id="password"
            name="password"
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password}
            onChange={updateField}
            error={fieldErrors.password}
            disabled={isSubmitting}
            required
          />

          <div className="-mt-1 text-right">
            <Link
              to={AUTH_ROUTES.forgotPassword}
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted underline underline-offset-4 transition hover:text-accent"
            >
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rf-bounce group inline-flex h-14 w-full items-center justify-center gap-2 rounded-control bg-accent px-5 text-[16px] font-semibold text-page transition duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LogoGlyph className="size-6" draw={false} loading />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight
                  className="size-4 transition duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
                  aria-hidden="true"
                />
              </>
            )}
          </button>
        </form>

        <p className="mt-7 border-t border-line pt-6 text-center text-sm text-muted">
          New to ReFon?{' '}
          <Link
            to={registerHref}
            className="font-bold text-primary-800 transition hover:text-accent hover:underline"
          >
            Create an account
          </Link>
        </p>
      </section>
    </AuthShell>
  )
}
