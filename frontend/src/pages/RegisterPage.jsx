import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Store,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../components/auth/AuthShell.jsx'
import { celebrateNextPage } from '../components/layout/WelcomeBurst.jsx'
import { LogoGlyph } from '../components/ui/BrandMark.jsx'
import { PasswordField } from '../components/auth/PasswordField.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import { AUTH_ROUTES, getRoleHome } from '../features/auth/auth.routes.js'
import { MARKETPLACE_ROUTES } from '../lib/routes.js'
import {
  getSafeDestination,
  validateRegisterForm,
} from '../features/auth/auth.validation.js'
import { canUseBuyerDestinations } from '../features/design/navigation-config.js'
import { clearIntent } from '../features/cart/pending-intent.js'

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'BUYER',
  businessName: '',
}

const roleOptions = [
  {
    value: 'BUYER',
    label: 'Bibili ako',
    description: 'Shop graded phones, save favourites and hold one for 15 minutes.',
    icon: ShoppingBag,
  },
  {
    value: 'SELLER',
    label: 'Magbebenta ako',
    description: 'List phones with a grade, a battery reading and the 11-point check.',
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
  // `/register?role=seller` (the "Sell on ReFon" page) opens with Seller picked.
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState(() => ({
    ...initialForm,
    role: searchParams.get('role')?.toUpperCase() === 'SELLER' ? 'SELLER' : 'BUYER',
  }))
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
        ...(form.role === 'SELLER' ? { businessName: form.businessName.trim() } : {}),
      })

      // Registration is a full-page reset in some paths, so the "return to" target
      // has to be recovered from the query string the redirect carried rather than
      // from router state, which a reload would have dropped. `getSafeDestination`
      // refuses anything that is not a same-origin relative path, so a crafted
      // `?next=https://evil.com` cannot turn this into an open redirect.
      //
      // The target is honoured for every role. A new seller who arrived from a product
      // page should land on that product; the routes they cannot use (`/cart`,
      // `/checkout`) are handled on arrival by `RequireBuyer`, which sends a non-buyer
      // to their own workspace.
      const params = new URLSearchParams(window.location.search)

      // Only a buyer can act on a cart or wishlist intent. A seller who registered
      // from the same page keeps nothing pending, so it cannot fire later.
      if (!canUseBuyerDestinations(user)) {
        clearIntent()
      }

      const destination = getSafeDestination(params.get('next'), getRoleHome(user.role))

      celebrateNextPage('register')
      navigate(destination, { replace: true })
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
    <AuthShell
      eyebrow="Join ReFon"
      headline="Join the sulit side."
      lede={
        form.role === 'SELLER'
          ? 'Sell to buyers who can see exactly what they are getting, so fewer “legit ba ’to?” messages.'
          : 'Buy pre-loved phones with the grade, battery and checks shown up front. Walang tinatago.'
      }
    >
      <section className="rounded-card-lg border border-line bg-card p-5 sm:p-8">
        <div className="mb-7">
          <p className="font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-accent">
            Join ReFon
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
            Create your account
          </h1>
          <p className="mt-2.5 leading-body text-muted">
            Start as a buyer or a seller. You can use ReFon right away; we&rsquo;ll also
            email you a link to confirm your address.
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
          {/* The role comes first, as two big tap cards: it decides what the rest of
              the account is for. Real radio inputs underneath, so it is one
              question with two answers to assistive technology. */}
          <fieldset aria-describedby={fieldErrors.role ? 'register-role-error' : undefined}>
            <legend className="font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-muted">
              Ano’ng gagawin mo sa ReFon?
            </legend>
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
                      className={`rf-lift flex h-full min-h-[10.5rem] flex-col gap-2.5 rounded-[22px] border-2 p-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
                        isSelected
                          ? 'border-accent bg-accent text-page'
                          : 'border-line-2 bg-well text-ink hover:border-subtle'
                      }`}
                    >
                      <span
                        className={`grid size-11 place-items-center rounded-2xl ${
                          isSelected ? 'bg-page text-accent' : 'bg-line text-ink'
                        }`}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className={`font-display text-lg font-bold ${isSelected ? 'text-page' : 'text-ink'}`}>
                        {option.label}
                      </span>
                      <span className={`text-[13px] leading-relaxed ${isSelected ? 'text-page/80' : 'text-muted'}`}>
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

          <TextField
            id="name"
            name="name"
            label="Full name"
            type="text"
            autoComplete="name"
            placeholder="Juan Dela Cruz"
            value={form.name}
            onChange={updateField}
            error={fieldErrors.name}
            disabled={isSubmitting}
            required
          />

          {form.role === 'SELLER' && (
            <TextField
              id="businessName"
              name="businessName"
              label="Store name"
              type="text"
              autoComplete="organization"
              placeholder="JDC Phones"
              value={form.businessName}
              onChange={updateField}
              error={fieldErrors.businessName}
              hint="Shown to buyers on your listings and in Visit Stores. You can change it later in Store look."
              maxLength={80}
              disabled={isSubmitting}
              required
            />
          )}

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

          <PasswordStrength password={form.password} />

          {form.role === 'SELLER' && (
            <div className="flex gap-3 rounded-2xl border border-dashed border-line-2 bg-well p-4 text-sm text-muted">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-700" aria-hidden="true" />
              <p className="leading-relaxed">
                Seller accounts are checked by our admin team before your first listing goes live.
                Your profile starts as <span className="font-bold text-ink">PENDING</span> until then.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rf-bounce group inline-flex h-14 w-full items-center justify-center gap-2 rounded-control bg-accent px-5 text-[16px] font-semibold text-page transition duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LogoGlyph className="size-6" draw={false} loading />
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
          <p className="text-center text-xs leading-relaxed text-muted" data-testid="register-consent">
            By creating an account you agree to the{' '}
            <Link to={MARKETPLACE_ROUTES.terms} className="font-semibold text-ink underline underline-offset-2 hover:text-accent">
              Terms
            </Link>{' '}
            and the{' '}
            <Link to={MARKETPLACE_ROUTES.privacy} className="font-semibold text-ink underline underline-offset-2 hover:text-accent">
              Privacy Policy
            </Link>
            .
          </p>
        </form>

        <p className="mt-6 rounded-2xl border border-dashed border-line-2 p-3 text-center text-sm text-muted">
          Just looking around?{' '}
          <Link to={AUTH_ROUTES.login} className="font-semibold text-accent hover:underline">
            Try a demo account
          </Link>{' '}
          in one tap.
        </p>

        <p className="mt-6 border-t border-line pt-6 text-center text-sm text-muted">
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

const STRENGTH = [
  { scale: 0, tone: 'bg-line', text: 'text-subtle', label: '' },
  { scale: 0.33, tone: 'bg-grade-c', text: 'text-grade-c', label: 'Mahina' },
  { scale: 0.66, tone: 'bg-grade-b', text: 'text-grade-b', label: 'Pwede na' },
  { scale: 1, tone: 'bg-accent', text: 'text-accent', label: 'Malakas!' },
]

/**
 * A rough strength meter. It only encourages; the rule that is enforced is the
 * 8–72 character length in `auth.validation.js`.
 */
function PasswordStrength({ password }) {
  const value = password ?? ''
  const score =
    value.length === 0
      ? 0
      : value.length < 8
        ? 1
        : value.length >= 12 || (/[0-9]/.test(value) && /[a-z]/i.test(value) && /[^a-z0-9]/i.test(value))
          ? 3
          : 2
  const level = STRENGTH[score]

  return (
    <div className="-mt-2 flex items-center gap-3" aria-live="polite">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full w-full origin-left rounded-full ${level.tone} transition-transform duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]`}
          style={{ transform: `scaleX(${level.scale})` }}
        />
      </div>
      <span className={`min-w-[4.5rem] text-right font-mono text-[12px] ${level.text}`}>
        {level.label && <span className="sr-only">Password strength: </span>}
        {level.label}
      </span>
    </div>
  )
}
