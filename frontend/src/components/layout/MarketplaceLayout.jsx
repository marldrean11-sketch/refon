import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { SiteFooter } from '../../features/design/SiteFooter.jsx'
import { SiteHeader } from '../../features/design/SiteHeader.jsx'
import { EmailVerificationBanner } from '../auth/EmailVerificationBanner.jsx'
import { PageTransition } from './PageTransition.jsx'
import { LoadingScreen } from '../ui/LoadingScreen.jsx'

/**
 * The public marketplace shell.
 *
 * The global navigation, the footer, and the mobile tab bar are all owned by
 * `SiteHeader` and `SiteFooter` now, which is what makes them identical on the
 * homepage, the shop, a product page, and the cart. `AuthenticatedLayout`
 * composes the same three pieces for the same reason: there is exactly one
 * header and one footer in this application, not one per area.
 *
 * `flex min-h-screen flex-col` lets the footer's `mt-auto` sit at the bottom of a
 * short page instead of floating halfway up it.
 */
export function MarketplaceLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SiteHeader />
      <EmailVerificationBanner />

      {/* Bottom padding clears the fixed mobile tab bar. The footer carries its
          own clearance too, because it sits below <main> and would be covered. */}
      <main id="main-content" tabIndex={-1} className="flex-1 pb-8 focus:outline-none lg:pb-0">
        <Suspense fallback={<LoadingScreen label="Loading this ReFon experience…" />}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  )
}
