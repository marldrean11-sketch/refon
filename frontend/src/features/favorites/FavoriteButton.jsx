import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { AUTH_ROUTES } from '../auth/auth.routes.js'
import { useSavedListings } from './useSavedListings.js'

export function FavoriteButton({ listing, className = '' }) {
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

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-disabled={isBusy || undefined}
      aria-pressed={canSave ? saved : undefined}
      aria-label={saved ? `Remove ${label}` : label}
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
      {error && <span className="sr-only" role="alert">{error}</span>}
    </button>
  )
}
