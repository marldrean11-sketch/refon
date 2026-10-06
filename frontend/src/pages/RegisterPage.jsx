import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
  ShoppingBag,
  Store,
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
      <section className="rounded-card-lg border border-line bg-surface p-5 sm:p-8">
        <div className="mb-7">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700">
            Join ReFon
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
            Create your account
          </h1>
          <p className="mt-2.5 leading-body text-muted">
            Start as a buyer or a seller. You can sign in securely immediately after
            registration.
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
            id="name"
            name="name"
            label="Full name"
            type="text"
            autoComplete="name"
            placeholder="Alex Morgan"
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

          {/* The role choice is a segmented control rather than two icon cards.
              It is one question with two answers, so it reads as one control —
              and it immediately shows what picking each one actually does. */}
          <fieldset aria-describedby={fieldErrors.role ? 'register-role-error' : undefined}>
            <legend className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
              How will you use ReFon?
            </legend>
            <div
              className="mt-2 grid gap-px overflow-hidden rounded-control border border-line-2 bg-line sm:grid-cols-2"
              role="radiogroup"
              aria-label="Account type"
            >
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
                      className={`flex h-full flex-col p-4 transition duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-primary-950 ${
                        isSelected
                          ? 'bg-primary-950 text-white'
                          : 'bg-surface hover:bg-surface-2'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <Icon
                          className={`size-4 ${isSelected ? 'text-accent-300' : 'text-subtle'}`}
                          aria-hidden="true"
                        />
                        <span
                          className={`grid size-4 place-items-center rounded-full border ${
                            isSelected ? 'border-white bg-white' : 'border-line-2 bg-surface'
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected ? <span className="block size-1.5 rounded-full bg-primary-950" /> : null}
                        </span>
                      </span>
                      <span
                        className={`mt-3 text-sm font-bold ${
                          isSelected ? 'text-white' : 'text-ink'
                        }`}
                      >
                        {option.label}
                      </span>
                      <span
                        className={`mt-1 text-xs leading-relaxed ${
                          isSelected ? 'text-primary-300' : 'text-muted'
                        }`}
                      >
                        {option.description}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
            {fieldErrors.role && (
              <p
                id="register-role-error"
                className="mt-2 text-xs font-medium text-danger"
                role="alert"
              >
                {fieldErrors.role}
              </p>
            )}
          </fieldset>

          {form.role === 'SELLER' && (
            <div className="flex gap-3 rounded-control border border-accent-300 bg-accent-50 p-4 text-sm text-accent-900">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-700" aria-hidden="true" />
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
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary-950 px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition duration-150 hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Creating your account…
              </>
            ) : (
              <>
                Create account
                <ArrowRight
                  className="size-4 transition duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
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
            className="font-bold text-primary-800 transition hover:text-primary-950 hover:underline"
          >
            Sign in
          </Link>
        </p>

        <p className="mt-2 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          <Link
            to={AUTH_ROUTES.forgotPassword}
            className="underline underline-offset-4 transition hover:text-primary-950"
          >
            Forgot your password?
          </Link>
        </p>
      </section>
    </AuthShell>
  )
}
