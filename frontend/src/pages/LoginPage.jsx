import { useState } from 'react'
import { AlertCircle, ArrowRight, LoaderCircle } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/auth/AuthShell.jsx'
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

      // A seller or admin cannot use the cart or wishlist they were heading for, so
      // they go to their own workspace rather than to a page that would refuse them.
      const fallback = getRoleHome(user.role)
      const destination = canUseBuyerDestinations(user)
        ? getSafeDestination(location.state?.from, fallback)
        : fallback

      // A pending intent only makes sense for a buyer. Anyone else gets it dropped, so
      // it cannot fire later under a different account.
      if (!canUseBuyerDestinations(user)) {
        clearIntent()
      }

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

  return (
    <AuthShell>
      <section className="rounded-card-lg border border-line bg-surface p-5 sm:p-8">
        <div className="mb-7">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700">
            Welcome back
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
            Sign in to ReFon
          </h1>
          <p className="mt-2.5 leading-body text-muted">
            Access your buyer or seller workspace securely.
          </p>
        </div>

        {visibleError && (
          <div
            className="mb-6 rounded-control border border-danger bg-red-50 p-4 text-sm text-danger"
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
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted underline underline-offset-4 transition hover:text-primary-950"
            >
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary-950 px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition duration-150 hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Signing in securely…
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
            to={AUTH_ROUTES.register}
            className="font-bold text-primary-800 transition hover:text-primary-950 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </section>
    </AuthShell>
  )
}
