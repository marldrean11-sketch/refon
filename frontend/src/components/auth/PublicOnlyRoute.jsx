import { Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth.js'
import { getRoleHome } from '../../features/auth/auth.routes.js'
import { LoadingScreen } from '../ui/LoadingScreen.jsx'

export function PublicOnlyRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (user) {
    return <Navigate to={getRoleHome(user.role)} replace />
  }

  return (
    <Suspense fallback={<LoadingScreen label="Loading this ReFon experience…" />}>
      <Outlet />
    </Suspense>
  )
}
