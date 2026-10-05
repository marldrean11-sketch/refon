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
      {/* Bottom padding clears the fixed mobile tab bar. The footer carries its own
          clearance because it sits below <main> and would otherwise be covered. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="pb-8 focus:outline-none md:pb-0"
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
