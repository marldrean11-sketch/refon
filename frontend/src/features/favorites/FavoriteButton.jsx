import { useState } from 'react'
import { AlertCircle, Heart } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { AUTH_ROUTES } from '../auth/auth.routes.js'
import { useSavedListings } from './useSavedListings.js'
import { useToast } from '../../components/ui/Toast.jsx'
import { rememberIntent } from '../cart/pending-intent.js'

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
  const toast = useToast()
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

  /**
   * Three behaviours, matching the cart's.
   *
   *  - **Buyer.** Saves the listing.
   *  - **Visitor.** Records the intent and signs in. The wishlist intent is replayed
   *    the same way the cart one is, so the phone is saved on return.
   *  - **Seller or admin.** Cannot reach this branch: the heart is not rendered for
   *    them at all. The message below is the belt-and-braces path.
   */
  async function handleClick() {
    if (!user) {
      rememberIntent(listing.id, 'save-wishlist')
      navigate(AUTH_ROUTES.login, {
        state: { from: `${location.pathname}${location.search}` },
      })
      return
    }

    if (!canSave) {
      toast.error('Cart and wishlist are for buyer accounts.', {
        description: 'Your seller account cannot buy from this marketplace.',
      })
      return
    }

    if (isBusy) {
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
          className={`inline-flex w-full items-center justify-center gap-2 rounded-control font-mono font-semibold uppercase tracking-[0.1em] ring-1 ring-inset transition duration-150 aria-disabled:opacity-60 ${sizing} ${
            saved
              ? 'bg-surface-2 text-ink ring-line-2 hover:bg-surface-3'
              : 'bg-surface text-primary-900 ring-line-2 hover:border-primary-950 hover:bg-primary-950 hover:text-white hover:ring-primary-950'
          }`}
        >
          <Heart
            className={`size-4.5 ${saved ? 'fill-current' : ''}`}
            style={{ width: 18, height: 18 }}
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
      className={`relative grid size-9 place-items-center rounded-control border border-line-2 bg-surface/90 text-muted backdrop-blur transition duration-150 hover:border-primary-950 hover:bg-primary-950 hover:text-white aria-disabled:opacity-60 ${
        saved ? 'border-primary-950 bg-primary-950 text-white' : ''
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