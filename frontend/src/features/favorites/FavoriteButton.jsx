import { useState } from 'react'
import { AlertCircle, Heart } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { AUTH_ROUTES } from '../auth/auth.routes.js'
import { useSavedListings } from './useSavedListings.js'

/**
 * Wishlist toggle.
 *
 * `variant="icon"` is the small overlay button used on cards and the gallery.
 * `variant="button"` is the labelled control on a product page's purchase panel,
 * where the action needs a name rather than a symbol.
 *
 * Both variants share one implementation on purpose: a second wishlist control
 * would be a second place for the signed-out redirect, the busy state, and the
 * failure message to drift apart.
 */
export function FavoriteButton({
  listing,
  variant = 'icon',
  size = 'md',
  compact = false,
  className = '',
}) {
  const { user } = useAuth()
  const { isSaved, toggle } = useSavedListings()
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  const canSave = user?.role === 'BUYER'

  // Sellers and admins never see the heart; anonymous visitors do, and clicking
  // sends them to sign in first.
  if (user && !canSave) {
    return null
  }

  const saved = canSave && isSaved(listing.id)
  const label = `Save ${listing.brand} ${listing.model}`
  const fullLabel = saved ? `Remove ${label}` : label

  async function handleClick() {
    if (!user) {
      navigate(AUTH_ROUTES.login, {
        state: { from: `${location.pathname}${location.search}` },
      })
      return
    }

    if (!canSave || isBusy) {
      return
    }

    setIsBusy(true)
    setError('')

    try {
      await toggle(listing.id)
    } catch {
      setError('We could not update your saved listings. Please try again.')
    } finally {
      setIsBusy(false)
    }
  }

  if (variant === 'button') {
    const large = size === 'lg'

    // `compact` drops the text so the control can sit in a narrow sticky action
    // bar without wrapping. The accessible name still describes the action, so
    // nothing is lost for a screen-reader user.
    const sizing = compact
      ? 'size-12 shrink-0'
      : large
        ? 'h-14 px-6 text-sm'
        : 'h-12 px-5 text-sm'

    return (
      <div className={className}>
        <button
          type="button"
          onClick={handleClick}
          aria-disabled={isBusy || undefined}
          aria-pressed={canSave ? saved : undefined}
          aria-label={fullLabel}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 aria-disabled:opacity-60 ${sizing} ${
            saved
              ? 'border-danger/30 bg-danger/10 text-danger hover:bg-danger/15'
              : 'border-line bg-white text-ink hover:border-primary-200 hover:bg-primary-50'
          }`}
        >
          <Heart
            className={`size-5 ${saved ? 'fill-current' : ''}`}
            strokeWidth={2.2}
            aria-hidden="true"
          />
          {!compact && (saved ? 'Saved to wishlist' : 'Add to wishlist')}
        </button>

        {/* Recoverable failure: the control stays enabled so a retry is one
            click, and the message names what went wrong. */}
        {error && (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-danger">
            <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span role="alert">{error}</span>
          </p>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-disabled={isBusy || undefined}
      aria-pressed={canSave ? saved : undefined}
      aria-label={fullLabel}
      title={saved ? 'Remove from saved listings' : 'Save this listing'}
      className={`relative grid size-9 place-items-center rounded-xl bg-white/90 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 aria-disabled:opacity-60 ${
        saved ? 'text-danger' : 'text-muted hover:text-danger'
      } ${className}`}
    >
      <Heart
        className={`size-4 ${saved ? 'fill-current' : ''}`}
        strokeWidth={2.2}
        aria-hidden="true"
      />
      {error && (
        <span className="sr-only" role="alert">
          {error}
        </span>
      )}
    </button>
  )
}