import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth.js'
import { AUTH_ROUTES } from '../../features/auth/auth.routes.js'
import { LoadingScreen } from '../ui/LoadingScreen.jsx'

export function RequireAuth() {
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

  return <Outlet />
}
