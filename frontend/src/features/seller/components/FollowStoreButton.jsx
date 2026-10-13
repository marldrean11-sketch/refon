import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { AUTH_ROUTES } from '../../auth/auth.routes.js'
import { useToast } from '../../../components/ui/Toast.jsx'
import { followStoreRequest, unfollowStoreRequest } from '../storefront-api.js'

/**
 * Follow / Following toggle for a phone store. A visitor is sent to sign in
 * first; admins don't follow stores, so they never see it.
 */
export function FollowStoreButton({ sellerId, following, followerCount, onChange, size = 'md' }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [isBusy, setIsBusy] = useState(false)

  if (user?.role === 'ADMIN') return null

  async function handleClick(event) {
    event.preventDefault()
    event.stopPropagation()
    if (!user) {
      navigate(AUTH_ROUTES.login, { state: { from: `${location.pathname}${location.search}` } })
      return
    }
    setIsBusy(true)
    try {
      const state = following ? await unfollowStoreRequest(sellerId) : await followStoreRequest(sellerId)
      onChange?.(state)
      if (state.following) {
        toast.success('Following this store', {
          description: "We'll tell you when it lists a new phone.",
        })
      }
    } catch (requestError) {
      toast.error(requestError.message ?? 'That did not work. Try again.')
    } finally {
      setIsBusy(false)
    }
  }

  const small = size === 'sm'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      aria-pressed={Boolean(following)}
      data-testid="follow-store"
      className={`rf-bounce inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold transition-colors disabled:opacity-60 ${
        small ? 'h-9 px-3.5 text-[13px]' : 'h-11 px-5 text-sm'
      } ${
        following
          ? 'border border-line-2 bg-card text-ink hover:border-danger hover:text-danger'
          : 'bg-accent text-page hover:bg-accent-hover'
      }`}
    >
      {following ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
      {following ? 'Following' : 'Follow'}
      {Number(followerCount) > 0 && (
        <span className={`tabular-nums ${following ? 'text-muted' : 'text-page/70'}`}>· {followerCount}</span>
      )}
    </button>
  )
}
