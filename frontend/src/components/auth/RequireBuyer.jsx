import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth.js'
import { AUTH_ROUTES, getRoleHome } from '../../features/auth/auth.routes.js'
import { LoadingScreen } from '../ui/LoadingScreen.jsx'

/**
 * Cart, wishlist and checkout are buyer surfaces.
 *
 * Two different refusals, because they call for two different responses from the
 * person who hit them:
 *
 *   - **No session.** Send them to sign in, remembering where they were. That is not
 *     a dead end: they came here to buy something, and the pending-intent mechanism
 *     finishes the job once they are a buyer.
 *   - **Signed in, but not a buyer.** Do *not* send them to sign in. They already
 *     have an account, and bouncing a seller to the login page is both confusing and
 *     pointless: signing in again would produce the same seller. They are sent to
 *     their own dashboard instead, which is a real destination rather than a loop.
 *
 * The redirect target is a path built from constants and the current location, and it
 * is passed through `getSafeDestination`, so a crafted URL cannot turn this guard into
 * an open redirect.
 *
 * Like `RequireAuth`, this renders nothing of its own: the route below decides what a
 * buyer sees, and the redirect only fires for everyone else.
 */
export function RequireBuyer() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingScreen label="Checking your secure session…" />
  }

  if (!user) {
    return (
      <Navigate
        to={AUTH_ROUTES.login}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (user.role !== 'BUYER') {
    // A seller or an admin lands on their own workspace. `replace` so the guarded URL
    // does not sit in history waiting to bounce them again on Back.
    return <Navigate to={getRoleHome(user.role)} replace />
  }

  return <Outlet />
}