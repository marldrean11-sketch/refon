import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  LoaderCircle,
  Mail,
  Sparkles,
} from 'lucide-react'
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
      const fallback = getRoleHome(user.role)
      const destination = getSafeDestination(location.state?.from, fallback)
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
      <section className="rounded-card-xl border border-line bg-white/95 p-5 shadow-card backdrop-blur sm:p-9 lg:p-10">
        <div className="mb-8">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-700">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Welcome back
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Sign in to ReFon
          </h1>
          <p className="mt-3 leading-body text-muted">
            Access your buyer or seller workspace securely.
          </p>
        </div>

        {visibleError && (
          <div
            className="mb-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
            <p className="leading-relaxed">{visibleError}</p>
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                Signing in securely…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight
                  className="size-4 transition duration-200 group-hover:translate-x-0.5"
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
            className="font-bold text-primary-700 transition hover:text-primary-500 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </section>
    </AuthShell>
  )
}
