import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  LoaderCircle,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/auth/AuthShell.jsx'
import { PasswordField } from '../components/auth/PasswordField.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import { AUTH_ROUTES, getRoleHome } from '../features/auth/auth.routes.js'
import { validateRegisterForm } from '../features/auth/auth.validation.js'

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'BUYER',
}

const roleOptions = [
  {
    value: 'BUYER',
    label: "I'm a Buyer",
    description: 'Find a trusted second-hand phone.',
    icon: ShoppingBag,
  },
  {
    value: 'SELLER',
    label: "I'm a Seller",
    description: 'List phones and manage my shop.',
    icon: Store,
  },
]

function focusFirstField(fieldName) {
  const targetId = fieldName === 'role' ? 'register-role-BUYER' : fieldName
  window.requestAnimationFrame(() => {
    document.getElementById(targetId)?.focus()
  })
}

export function RegisterPage() {
  const { register, initializationError } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  function selectRole(role) {
    setForm((current) => ({ ...current, role }))
    setFieldErrors((current) => ({ ...current, role: undefined }))
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = validateRegisterForm(form)

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      focusFirstField(Object.keys(errors)[0])
      return
    }

    setIsSubmitting(true)
    setFieldErrors({})
    setFormError('')

    try {
      const user = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      })
      navigate(getRoleHome(user.role), { replace: true })
    } catch (error) {
      const fieldErrors = error.errors ?? {}
      setFieldErrors(fieldErrors)
      if (Object.keys(fieldErrors).length > 0) {
        focusFirstField(Object.keys(fieldErrors)[0])
      }
      setFormError(error.message ?? 'Account creation failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const visibleError = formError || initializationError

  return (
    <AuthShell>
      <section className="rounded-card-xl border border-line bg-white/95 p-5 shadow-card backdrop-blur sm:p-9 lg:p-10">
        <div className="mb-7">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-accent-800">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Join with confidence
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Create your ReFon account
          </h1>
          <p className="mt-3 leading-body text-muted">
            Start as a buyer or seller. You can sign in securely immediately after
            registration.
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
            id="name"
            name="name"
            label="Full name"
            type="text"
            autoComplete="name"
            placeholder="Alex Morgan"
            icon={UserRound}
            value={form.name}
            onChange={updateField}
            error={fieldErrors.name}
            disabled={isSubmitting}
            required
          />

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
            label="Create a password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={updateField}
            error={fieldErrors.password}
            hint="Use 8–72 characters. A memorable passphrase works well."
            disabled={isSubmitting}
            required
          />

          <fieldset aria-describedby={fieldErrors.role ? 'register-role-error' : undefined}>
            <legend className="text-sm font-semibold text-ink">How will you use ReFon?</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Account type">
              {roleOptions.map((option) => {
                const Icon = option.icon
                const isSelected = form.role === option.value

                return (
                  <label key={option.value} className="group cursor-pointer">
                    <input
                      id={`register-role-${option.value}`}
                       type="radio"
                      name="role"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => selectRole(option.value)}
                      disabled={isSubmitting}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex h-full min-h-28 flex-col rounded-2xl border p-4 transition duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-sm'
                          : 'border-line bg-white hover:border-primary-200 hover:bg-primary-50/40'
                      }`}
                    >
                      <span
                        className={`grid size-10 place-items-center rounded-xl transition duration-200 ${
                          isSelected
                            ? 'bg-primary-500 text-white'
                            : 'bg-primary-50 text-primary-600 group-hover:bg-primary-100'
                        }`}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="mt-3 text-sm font-bold text-ink">{option.label}</span>
                      <span className="mt-1 text-xs leading-relaxed text-muted">
                        {option.description}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
            {fieldErrors.role && (
              <p id="register-role-error" className="mt-2 text-xs font-medium text-danger" role="alert">
                {fieldErrors.role}
              </p>
            )}
          </fieldset>

          {form.role === 'SELLER' && (
            <div className="flex gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-900">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent-700" aria-hidden="true" />
              <p className="leading-relaxed">
                We’ll create your seller profile with{' '}
                <span className="font-bold">PENDING</span> verification. Seller tools
                unlock after review.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 text-sm font-bold text-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                Creating your account…
              </>
            ) : (
              <>
                Create account
                <ArrowRight
                  className="size-4 transition duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </>
            )}
          </button>
        </form>

        <p className="mt-7 border-t border-line pt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link
            to={AUTH_ROUTES.login}
            className="font-bold text-primary-700 transition hover:text-primary-500 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </section>
    </AuthShell>
  )
}
