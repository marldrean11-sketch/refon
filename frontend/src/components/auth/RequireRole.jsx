import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth.js'
import { AUTH_ROUTES, getRoleHome } from '../../features/auth/auth.routes.js'

export function RequireRole({ allowedRoles }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return null
  }

  if (!user) {
    return <Navigate to={AUTH_ROUTES.login} replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to={AUTH_ROUTES.forbidden}
        replace
        state={{
          attemptedPath: location.pathname,
          roleHome: getRoleHome(user.role),
        }}
      />
    )
  }

  return <Outlet />
}
