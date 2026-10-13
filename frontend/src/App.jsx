import { lazy, Suspense } from 'react'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider.jsx'
import { AUTH_ROUTES, DASHBOARD_ROUTES, MARKETPLACE_ROUTES } from './features/auth/auth.routes.js'
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute.jsx'
import { RequireAuth } from './components/auth/RequireAuth.jsx'
import { RequireBuyer } from './components/auth/RequireBuyer.jsx'
import { RequireRole } from './components/auth/RequireRole.jsx'
import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout.jsx'
import { MarketplaceLayout } from './components/layout/MarketplaceLayout.jsx'
import { LoadingScreen } from './components/ui/LoadingScreen.jsx'
import { SellerListingsProvider } from './features/seller/SellerListingsProvider.jsx'
import { SellerInquiriesProvider } from './features/inquiries/SellerInquiriesProvider.jsx'
import { SavedListingsProvider } from './features/favorites/SavedListingsProvider.jsx'
import { CartProvider } from './features/cart/CartProvider.jsx'
import { CompareProvider } from './features/compare/CompareProvider.jsx'
import { PendingIntentReplay } from './features/cart/PendingIntentReplay.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { RouteEffects } from './components/layout/RouteEffects.jsx'
import { SmoothScroll } from './components/layout/SmoothScroll.jsx'
import { ScrollProgress } from './components/layout/ScrollProgress.jsx'
import { Preloader } from './components/layout/Preloader.jsx'

const LoginPage = lazy(() =>
  import('./pages/LoginPage.jsx').then((module) => ({ default: module.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage.jsx').then((module) => ({ default: module.RegisterPage })),
)
const LandingPage = lazy(() =>
  import('./pages/LandingPage.jsx').then((module) => ({ default: module.LandingPage })),
)
const BrowsePage = lazy(() =>
  import('./pages/BrowsePage.jsx').then((module) => ({ default: module.BrowsePage })),
)
const ListingDetailPage = lazy(() =>
  import('./pages/ListingDetailPage.jsx').then((module) => ({
    default: module.ListingDetailPage,
  })),
)
const SellerDashboardPage = lazy(() =>
  import('./pages/SellerDashboardPage.jsx').then((module) => ({ default: module.SellerDashboardPage })),
)
const SellerListingFormPage = lazy(() =>
  import('./pages/SellerListingFormPage.jsx').then((module) => ({
    default: module.SellerListingFormPage,
  })),
)
const SellerInquiriesPage = lazy(() =>
  import('./pages/SellerInquiriesPage.jsx').then((module) => ({ default: module.SellerInquiriesPage })),
)
const SavedListingsPage = lazy(() =>
  import('./pages/SavedListingsPage.jsx').then((module) => ({ default: module.SavedListingsPage })),
)
const MyOrdersPage = lazy(() =>
  import('./pages/MyOrdersPage.jsx').then((module) => ({ default: module.MyOrdersPage })),
)
const OrderDetailPage = lazy(() =>
  import('./pages/OrderDetailPage.jsx').then((module) => ({ default: module.OrderDetailPage })),
)
const SellerOrdersPage = lazy(() =>
  import('./pages/SellerOrdersPage.jsx').then((module) => ({ default: module.SellerOrdersPage })),
)
const MyInquiriesPage = lazy(() =>
  import('./pages/MyInquiriesPage.jsx').then((module) => ({ default: module.MyInquiriesPage })),
)
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage.jsx').then((module) => ({ default: module.AdminDashboardPage })),
)
const ForbiddenPage = lazy(() =>
  import('./pages/ForbiddenPage.jsx').then((module) => ({ default: module.ForbiddenPage })),
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage.jsx').then((module) => ({ default: module.NotFoundPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage.jsx').then((module) => ({ default: module.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage.jsx').then((module) => ({ default: module.ResetPasswordPage })),
)
const VerifyEmailPage = lazy(() =>
  import('./pages/VerifyEmailPage.jsx').then((module) => ({ default: module.VerifyEmailPage })),
)
const AccountPage = lazy(() =>
  import('./pages/AccountPage.jsx').then((module) => ({ default: module.AccountPage })),
)
const CategoriesPage = lazy(() =>
  import('./pages/CategoriesPage.jsx').then((module) => ({ default: module.CategoriesPage })),
)
const HowItWorksPage = lazy(() =>
  import('./pages/HowItWorksPage.jsx').then((module) => ({ default: module.HowItWorksPage })),
)
const QualityCheckPage = lazy(() =>
  import('./pages/QualityCheckPage.jsx').then((module) => ({ default: module.QualityCheckPage })),
)
const AboutPage = lazy(() =>
  import('./pages/AboutPage.jsx').then((module) => ({ default: module.AboutPage })),
)
const SustainabilityPage = lazy(() =>
  import('./pages/AboutPage.jsx').then((module) => ({ default: module.SustainabilityPage })),
)
const FaqPage = lazy(() =>
  import('./pages/FaqPage.jsx').then((module) => ({ default: module.FaqPage })),
)
const WarrantyPage = lazy(() =>
  import('./pages/PolicyPages.jsx').then((module) => ({ default: module.WarrantyPage })),
)
const ReturnsPage = lazy(() =>
  import('./pages/PolicyPages.jsx').then((module) => ({ default: module.ReturnsPage })),
)
const ShippingPage = lazy(() =>
  import('./pages/PolicyPages.jsx').then((module) => ({ default: module.ShippingPage })),
)
const PrivacyPage = lazy(() =>
  import('./pages/PolicyPages.jsx').then((module) => ({ default: module.PrivacyPage })),
)
const TermsPage = lazy(() =>
  import('./pages/PolicyPages.jsx').then((module) => ({ default: module.TermsPage })),
)
const ContactPage = lazy(() =>
  import('./pages/PolicyPages.jsx').then((module) => ({ default: module.ContactPage })),
)
const CartPage = lazy(() =>
  import('./pages/CartPage.jsx').then((module) => ({ default: module.CartPage })),
)
const CheckoutPage = lazy(() =>
  import('./pages/CheckoutPage.jsx').then((module) => ({ default: module.CheckoutPage })),
)
const CheckoutConfirmedPage = lazy(() =>
  import('./pages/CheckoutConfirmedPage.jsx').then((module) => ({
    default: module.CheckoutConfirmedPage,
  })),
)
const HealthCheckPage = lazy(() =>
  import('./pages/HealthCheckPage.jsx').then((module) => ({ default: module.HealthCheckPage })),
)
const FeedbackPage = lazy(() =>
  import('./pages/FeedbackPage.jsx').then((module) => ({ default: module.FeedbackPage })),
)
const BoothPosterPage = lazy(() =>
  import('./pages/BoothPosterPage.jsx').then((module) => ({ default: module.BoothPosterPage })),
)
const KioskPage = lazy(() =>
  import('./pages/KioskPage.jsx').then((module) => ({ default: module.KioskPage })),
)
const TradeInPage = lazy(() =>
  import('./pages/TradeInPage.jsx').then((module) => ({ default: module.TradeInPage })),
)
const ComparePage = lazy(() =>
  import('./pages/ComparePage.jsx').then((module) => ({ default: module.ComparePage })),
)
const SellerApplyPage = lazy(() =>
  import('./pages/NotFoundRoutePages.jsx').then((module) => ({ default: module.SellerApplyPage })),
)
const SellerStorefrontPage = lazy(() =>
  import('./pages/SellerStorefrontPage.jsx').then((module) => ({
    default: module.SellerStorefrontPage,
  })),
)

function App() {
  return (
    <BrowserRouter>
      {/* `reducedMotion="user"` is the app-wide half of the reduced-motion
          contract: Framer Motion drops transform animations for anyone who has
          asked for it, and the shared variants in `lib/motion` drop them in
          `useMotionSafe`. The two overlap on purpose — MotionConfig covers
          components that forgot, `useMotionSafe` covers components that need
          to know. */}
      <MotionConfig reducedMotion="user">
        {/* Outside every provider and below the router: smooth scroll is a
            property of the document, not of any one feature's data, and it has
            to exist before the first route paints so the initial scroll reset
            has somewhere to go. */}
        <SmoothScroll>
        {/* Above the app's own content, below the splash. */}
        <Preloader />
        <ScrollProgress />
        <AuthProvider>
        {/* Above both layouts so public listing cards and the headers share one poller. */}
        <SavedListingsProvider>
        {/* The header badge, the mobile tab bar, the product page's add button, the
            cart, and checkout all read one cart, so they cannot disagree. */}
        <CartProvider>
        {/* The compare checkbox on every card and the tray read one list. */}
        <CompareProvider>
        <ToastProvider>
        {/* Replays a visitor's deferred add-to-cart once they are a signed-in buyer.
            It must sit inside ToastProvider, which is itself inside CartProvider, so
            that it can read the cart and raise a toast. */}
        <PendingIntentReplay />
        <RouteEffects />
        <a
          href="#main-content"
          className="sr-only fixed left-4 top-4 z-toast rounded-control bg-accent px-4 py-3 text-sm font-bold text-page shadow-card focus:not-sr-only"
        >
          Skip to main content
        </a>
        <Suspense fallback={<LoadingScreen label="Loading this ReFon experience…" />}>
          <Routes>
            {/* Above every layout, not just the authenticated one.

                `SiteHeader` is shared by the marketplace shell and the signed-in
                shell, so the seller's unread inquiry count has to exist on both.
                It previously only mounted under `RequireAuth`, which meant the
                badge silently vanished the moment a seller walked into the shop.
                The provider no-ops for anyone who is not a seller, so this costs
                anonymous and buyer visits nothing. */}
            {/* The printable booth poster stands alone: no header, footer or cursor. */}
            <Route path={MARKETPLACE_ROUTES.boothPoster} element={<BoothPosterPage />} />
            <Route path={MARKETPLACE_ROUTES.kiosk} element={<KioskPage />} />

            <Route element={<SellerInquiriesProvider />}>
              <Route element={<MarketplaceLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path={MARKETPLACE_ROUTES.shop} element={<BrowsePage />} />
                {/* Legacy alias so existing bookmarks and tests keep resolving. */}
                <Route path={MARKETPLACE_ROUTES.browse} element={<BrowsePage />} />
                <Route path="/phones/:slug" element={<ListingDetailPage />} />
                <Route path="/listings/:id" element={<ListingDetailPage />} />

                <Route path={MARKETPLACE_ROUTES.categories} element={<CategoriesPage />} />
                <Route path={MARKETPLACE_ROUTES.compare} element={<ComparePage />} />
                <Route path={MARKETPLACE_ROUTES.howItWorks} element={<HowItWorksPage />} />
                <Route path={MARKETPLACE_ROUTES.qualityCheck} element={<QualityCheckPage />} />
                <Route path={MARKETPLACE_ROUTES.healthCheck} element={<HealthCheckPage />} />
                <Route path={MARKETPLACE_ROUTES.tradeIn} element={<TradeInPage />} />
                <Route path={MARKETPLACE_ROUTES.feedback} element={<FeedbackPage />} />
                <Route path={MARKETPLACE_ROUTES.about} element={<AboutPage />} />
                <Route path={MARKETPLACE_ROUTES.faq} element={<FaqPage />} />
                <Route path={MARKETPLACE_ROUTES.warranty} element={<WarrantyPage />} />
                <Route path={MARKETPLACE_ROUTES.returns} element={<ReturnsPage />} />
                <Route path={MARKETPLACE_ROUTES.shipping} element={<ShippingPage />} />
                <Route path={MARKETPLACE_ROUTES.sustainability} element={<SustainabilityPage />} />
                <Route path={MARKETPLACE_ROUTES.privacy} element={<PrivacyPage />} />
                <Route path={MARKETPLACE_ROUTES.terms} element={<TermsPage />} />
                <Route path={MARKETPLACE_ROUTES.contact} element={<ContactPage />} />
                <Route path={MARKETPLACE_ROUTES.sellerApply} element={<SellerApplyPage />} />
                <Route path="/sellers/:sellerId" element={<SellerStorefrontPage />} />

                {/* Purchasing is buyer-only. The guard sits *inside* the marketplace
                    shell rather than replacing it, so a buyer who follows a saved cart
                    link sees the redesigned header, search overlay and drawer exactly
                    as everywhere else. A visitor is sent to sign in; a seller or admin
                    is sent to their own dashboard. */}
                <Route element={<RequireBuyer />}>
                  <Route path={MARKETPLACE_ROUTES.cart} element={<CartPage />} />
                  <Route path={MARKETPLACE_ROUTES.checkout} element={<CheckoutPage />} />
                  <Route
                    path={MARKETPLACE_ROUTES.checkoutConfirmed}
                    element={<CheckoutConfirmedPage />}
                  />
                </Route>
              </Route>

              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* Reachable signed in or out: the links are emailed, not gated. */}
              <Route path={AUTH_ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
              <Route path={AUTH_ROUTES.resetPassword} element={<ResetPasswordPage />} />
              <Route path={AUTH_ROUTES.verifyEmail} element={<VerifyEmailPage />} />

              <Route element={<RequireAuth />}>
                <Route element={<AuthenticatedLayout />}>
                  <Route path="/forbidden" element={<ForbiddenPage />} />
                  <Route path={AUTH_ROUTES.account} element={<AccountPage />} />

                  <Route element={<RequireRole allowedRoles={['ADMIN']} />}>
                    <Route path={AUTH_ROUTES.admin} element={<AdminDashboardPage />} />
                  </Route>

                  {/* The wishlist is a purchasing surface, so it is buyer-only — same as the
                      cart. `/saved` was previously open to a seller, who then got a
                      403 from the server on every visit. */}
                  <Route element={<RequireRole allowedRoles={['BUYER']} />}>
                    <Route path={AUTH_ROUTES.saved} element={<SavedListingsPage />} />
                    <Route path={DASHBOARD_ROUTES.orders} element={<MyOrdersPage />} />
                    <Route path="/orders/:orderNumber" element={<OrderDetailPage />} />
                  </Route>

                  {/* An inquiry is a message to a seller rather than a purchasing
                      action, so a seller who also buys keeps the ones they sent. */}
                  <Route element={<RequireRole allowedRoles={['BUYER', 'SELLER']} />}>
                    <Route path={AUTH_ROUTES.myInquiries} element={<MyInquiriesPage />} />
                  </Route>

                  <Route element={<RequireRole allowedRoles={['SELLER']} />}>
                    <Route element={<SellerListingsProvider />}>
                      <Route path="/seller" element={<SellerDashboardPage />} />
                      <Route
                        path={AUTH_ROUTES.sellerInquiries}
                        element={<SellerInquiriesPage />}
                      />
                      <Route path={DASHBOARD_ROUTES.sellerOrders} element={<SellerOrdersPage />} />
                      <Route
                        path="/seller/listings/new"
                        element={<SellerListingFormPage mode="create" />}
                      />
                      <Route
                        path="/seller/listings/:id/edit"
                        element={<SellerListingFormPage mode="edit" />}
                      />
                    </Route>
                  </Route>
                </Route>
              </Route>

              {/* /cart lives in the marketplace shell; the trailing route below is a
                  safety net for a stale client-side path. */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
        </ToastProvider>
        </CompareProvider>
        </CartProvider>
        </SavedListingsProvider>
        </AuthProvider>
        </SmoothScroll>
      </MotionConfig>
    </BrowserRouter>
  )
}

export default App
