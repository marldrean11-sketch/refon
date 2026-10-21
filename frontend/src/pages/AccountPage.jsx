import { useState } from 'react'
import {
  AlertCircle,
  BadgeCheck,
  Check,
  LogOut,
  MailWarning,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { PasswordField } from '../components/auth/PasswordField.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import {
  changePasswordRequest,
  updateProfileRequest,
} from '../features/account/account-api.js'
import { resendVerificationRequest } from '../features/auth/auth-api.js'
import { LoopSpinner } from '../components/ui/LoopSpinner.jsx'
import { DeliveryDetailsCard } from '../features/account/DeliveryDetailsCard.jsx'

const roleLabels = {
  ADMIN: 'Administrator',
  SELLER: 'Seller',
  BUYER: 'Buyer',
}

function SuccessNote({ children }) {
  return (
    <p
      className="flex gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-relaxed text-green-900"
      role="status"
      aria-live="polite"
    >
      <Check className="mt-0.5 size-5 shrink-0 text-green-700" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

function ErrorNote({ children }) {
  return (
    <p
      className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

function VerificationCard({ isVerified }) {
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleResend() {
    setIsSending(true)
    setMessage(null)

    try {
      const { message: sent } = await resendVerificationRequest()
      setMessage({ tone: 'success', text: sent })
    } catch (error) {
      setMessage({ tone: 'error', text: error.message })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="rounded-card-xl border border-line bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
            {isVerified ? (
              <BadgeCheck className="size-5" aria-hidden="true" />
            ) : (
              <MailWarning className="size-5" aria-hidden="true" />
            )}
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">Email verification</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {isVerified
                ? 'Your address is confirmed. Account recovery and notifications reach you reliably.'
                : 'Confirm your address so we can reach you if your password ever needs resetting.'}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] ${
            isVerified
              ? 'bg-green-50 text-green-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {isVerified ? 'Verified' : 'Unverified'}
        </span>
      </div>

      {!isVerified && (
        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={isSending}
            className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-bold text-primary-700 shadow-sm transition duration-200 hover:border-primary-200 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? (
              <LoopSpinner className="size-4" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            Send a new verification link
          </button>

          {message?.tone === 'success' && <SuccessNote>{message.text}</SuccessNote>}
          {message?.tone === 'error' && <ErrorNote>{message.text}</ErrorNote>}
        </div>
      )}
    </section>
  )
}

export function AccountPage() {
  const { user, updateUser, logout } = useAuth()
  const [name, setName] = useState(user.name)
  const [profileErrors, setProfileErrors] = useState({})
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  function updatePasswordField(event) {
    const { name: field, value } = event.target
    setPasswordForm((current) => ({ ...current, [field]: value }))
    setPasswordErrors((current) => ({ ...current, [field]: undefined }))
    setPasswordError('')
    setPasswordSuccess('')
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()

    if (name.trim().length < 2) {
      setProfileErrors({ name: 'Name must be at least 2 characters.' })
      return
    }

    setIsSavingProfile(true)
    setProfileErrors({})
    setProfileError('')
    setProfileSuccess('')

    try {
      const { user: updatedUser } = await updateProfileRequest({ name: name.trim() })
      updateUser(updatedUser)
      setName(updatedUser.name)
      setProfileSuccess('Your profile has been updated.')
    } catch (error) {
      const fieldErrors = error.errors ?? {}
      setProfileErrors(fieldErrors)
      setProfileError(
        Object.keys(fieldErrors).length > 0
          ? ''
          : error.message ?? 'We could not save your profile.',
      )
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    const errors = {}

    if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters.'
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Both passwords must match.'
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }

    setIsSavingPassword(true)
    setPasswordErrors({})
    setPasswordError('')
    setPasswordSuccess('')

    try {
      const { user: updatedUser } = await changePasswordRequest({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      updateUser(updatedUser)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordSuccess(
        'Password changed. You stay signed in here, and other devices will be signed out.',
      )
    } catch (error) {
      const fieldErrors = error.errors ?? {}
      setPasswordErrors(fieldErrors)
      setPasswordError(
        Object.keys(fieldErrors).length > 0
          ? ''
          : error.message ?? 'We could not change your password.',
      )
    } finally {
      setIsSavingPassword(false)
    }
  }

  const isVerified = Boolean(user.emailVerified)

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-canvas">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-12 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-700">
            <UserRound className="size-4" aria-hidden="true" />
            Your account
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
            Account settings
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-body text-muted">
            Keep your details current and your password protected. Changes here apply
            immediately across ReFon.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-6 px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="rounded-card-xl border border-line bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ink">Profile</h2>
              <p className="mt-1 break-words text-sm leading-relaxed text-muted">
                {user.email} · {roleLabels[user.role] ?? user.role}
              </p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} noValidate className="mt-6 space-y-5">
            {profileError && <ErrorNote>{profileError}</ErrorNote>}
            {profileSuccess && <SuccessNote>{profileSuccess}</SuccessNote>}

            <TextField
              id="name"
              name="name"
              label="Display name"
              autoComplete="name"
              placeholder="Your name"
              icon={UserRound}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setProfileErrors({})
                setProfileError('')
                setProfileSuccess('')
              }}
              error={profileErrors.name}
              disabled={isSavingProfile}
              required
            />

            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3.5 text-sm font-bold text-page shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-accent hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isSavingProfile ? (
                <>
                  <LoopSpinner className="size-5" />
                  Saving…
                </>
              ) : (
                'Save profile'
              )}
            </button>
          </form>
        </div>

        {user.role === 'BUYER' && <DeliveryDetailsCard />}

        <VerificationCard isVerified={isVerified} />

        <section className="rounded-card-xl border border-line bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink">Password</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Changing your password signs you out everywhere else. This device stays
                signed in.
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} noValidate className="mt-6 space-y-5">
            {passwordError && <ErrorNote>{passwordError}</ErrorNote>}
            {passwordSuccess && <SuccessNote>{passwordSuccess}</SuccessNote>}

            <PasswordField
              id="currentPassword"
              name="currentPassword"
              label="Current password"
              autoComplete="current-password"
              placeholder="Your password today"
              value={passwordForm.currentPassword}
              onChange={updatePasswordField}
              error={passwordErrors.currentPassword}
              disabled={isSavingPassword}
              required
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <PasswordField
                id="newPassword"
                name="newPassword"
                label="New password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={passwordForm.newPassword}
                onChange={updatePasswordField}
                error={passwordErrors.newPassword}
                disabled={isSavingPassword}
                required
              />

              <PasswordField
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm new password"
                autoComplete="new-password"
                placeholder="Repeat your new password"
                value={passwordForm.confirmPassword}
                onChange={updatePasswordField}
                error={passwordErrors.confirmPassword}
                disabled={isSavingPassword}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSavingPassword}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3.5 text-sm font-bold text-page shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-accent hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isSavingPassword ? (
                <>
                  <LoopSpinner className="size-5" />
                  Changing…
                </>
              ) : (
                'Change password'
              )}
            </button>
          </form>
        </section>

        <section className="rounded-card-xl border border-red-200 bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-lg font-semibold text-ink">Sign out</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Ends this session on this device. You can sign back in at any time.
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-6 py-3.5 text-sm font-bold text-danger transition duration-200 hover:bg-red-50"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </section>
      </section>
    </div>
  )
}