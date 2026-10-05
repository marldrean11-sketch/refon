import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { AppNavbar } from './AppNavbar.jsx'
import { EmailVerificationBanner } from '../auth/EmailVerificationBanner.jsx'
import { PageTransition } from './PageTransition.jsx'
import { LoadingScreen } from '../ui/LoadingScreen.jsx'

export function AuthenticatedLayout() {
  return (
    <div className="min-h-screen bg-canvas">
      <AppNavbar />
      <EmailVerificationBanner />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <Suspense fallback={<LoadingScreen label="Loading this ReFon experience…" />}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </Suspense>
      </main>
    </div>
  )
}
