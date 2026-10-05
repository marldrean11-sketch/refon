import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { MarketplaceFooter } from './MarketplaceFooter.jsx'
import { MarketplaceHeader } from './MarketplaceHeader.jsx'
import { EmailVerificationBanner } from '../auth/EmailVerificationBanner.jsx'
import { PageTransition } from './PageTransition.jsx'
import { LoadingScreen } from '../ui/LoadingScreen.jsx'

export function MarketplaceLayout() {
  return (
    <div className="min-h-screen bg-canvas">
      <MarketplaceHeader />
      <EmailVerificationBanner />
      {/* Bottom padding clears the fixed mobile tab bar. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="pb-20 focus:outline-none md:pb-0"
      >
        <Suspense fallback={<LoadingScreen label="Loading this ReFon experience…" />}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </Suspense>
      </main>
      <MarketplaceFooter />
    </div>
  )
}
