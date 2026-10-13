import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { CompareTray } from '../../features/compare/CompareTray.jsx'
import { MARKETPLACE_ROUTES } from '../../lib/routes.js'
import { SiteFooter } from '../../features/design/SiteFooter.jsx'
import { SiteHeader } from '../../features/design/SiteHeader.jsx'
import { EmailVerificationBanner } from '../auth/EmailVerificationBanner.jsx'
import { PageTransition } from './PageTransition.jsx'
import { LoadingScreen } from '../ui/LoadingScreen.jsx'
import { CustomCursor } from './CustomCursor.jsx'
import { BackToTop } from './BackToTop.jsx'
import { PageSlider } from './PageSlider.jsx'
import { WelcomeBurst } from './WelcomeBurst.jsx'
import { PopChallenge } from './PopChallenge.jsx'
import { ChatButton } from './ChatButton.jsx'
import { FirstVisitTour } from './FirstVisitTour.jsx'

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
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SiteHeader />
      <EmailVerificationBanner />

      {/* Bottom padding clears the fixed mobile tab bar. The footer carries its
          own clearance too, because it sits below <main> and would be covered. */}
      <main id="main-content" tabIndex={-1} className="flex-1 pb-8 focus:outline-none lg:pb-0">
        {/* `PageTransition` wraps `Suspense`, not the other way round.

            A page component is lazy, so navigating to one it has not loaded yet
            suspends. When the `Suspense` boundary sat outside `PageTransition`,
            the suspension unmounted the whole transition wrapper and replaced it
            with the loading screen: the exit was cut off mid-animation, the
            entrance never ran, and the measured navigation took over 600ms
            instead of under 400ms. Putting the boundary inside means the
            transition plays once, around whatever the route resolves to, and a
            code-split fetch is invisible to it. */}
        <PageTransition>
          <Suspense fallback={<LoadingScreen label="Loading this ReFon experience…" />}>
            <Outlet />
          </Suspense>
        </PageTransition>
      </main>

      <SiteFooter />
      <CompareTray hidden={pathname === MARKETPLACE_ROUTES.compare} />
      <BackToTop />
      <PageSlider />
      <WelcomeBurst />
      <PopChallenge />
      <ChatButton />
      <FirstVisitTour />
      <CustomCursor />
    </div>
  )
}
