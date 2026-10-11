import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { SiteFooter } from '../../features/design/SiteFooter.jsx'
import { CustomCursor } from './CustomCursor.jsx'
import { SiteHeader } from '../../features/design/SiteHeader.jsx'
import { EmailVerificationBanner } from '../auth/EmailVerificationBanner.jsx'
import { PageTransition } from './PageTransition.jsx'
import { LoadingScreen } from '../ui/LoadingScreen.jsx'

/**
 * The signed-in shell: account, seller, and admin.
 *
 * This used to mount a completely separate `AppNavbar` with its own link list, its
 * own drawer, its own breakpoints, and no footer at all — so signing in visibly
 * changed the entire chrome of the site, and an administrator on `/admin` had no
 * route back to the shop that looked like the one they had just left.
 *
 * It now composes the same `SiteHeader`, `SiteFooter`, and mobile tab bar as
 * `MarketplaceLayout`. The seller inbox and the role dashboard links stay, because
 * `SiteHeader` reads them from real state and from the shared navigation config.
 *
 * The admin page keeps its own queue tabs: that is page-level navigation for one
 * screen, not a second global header.
 */
export function AuthenticatedLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SiteHeader />
      <EmailVerificationBanner />

      <main id="main-content" tabIndex={-1} className="flex-1 pb-8 focus:outline-none lg:pb-0">
        {/* `PageTransition` outside `Suspense`, for the same reason as in
            `MarketplaceLayout`: the boundary must be inside the transition, or a
            lazy page's suspension tears down the transition wrapper instead of
            just its contents. */}
        <PageTransition>
          <Suspense fallback={<LoadingScreen label="Loading this ReFon experience…" />}>
            <Outlet />
          </Suspense>
        </PageTransition>
      </main>

      <SiteFooter />
      <CustomCursor />
    </div>
  )
}
