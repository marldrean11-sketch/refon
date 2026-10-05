import { lazy, Suspense } from 'react'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider.jsx'
import { AUTH_ROUTES } from './features/auth/auth.routes.js'
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute.jsx'
import { RequireAuth } from './components/auth/RequireAuth.jsx'
import { RequireRole } from './components/auth/RequireRole.jsx'
import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout.jsx'
import { MarketplaceLayout } from './components/layout/MarketplaceLayout.jsx'
import { LoadingScreen } from './components/ui/LoadingScreen.jsx'
import { SellerListingsProvider } from './features/seller/SellerListingsProvider.jsx'
import { SellerInquiriesProvider } from './features/inquiries/SellerInquiriesProvider.jsx'
import { SavedListingsProvider } from './features/favorites/SavedListingsProvider.jsx'
import { RouteEffects } from './components/layout/RouteEffects.jsx'

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
  import('./pages/SellerDashboardPage.jsx').then((module) => ({
    default: module.SellerDashboardPage,
  })),
)
const SellerListingFormPage = lazy(() =>
  import('./pages/SellerListingFormPage.jsx').then((module) => ({
    default: module.SellerListingFormPage,
  })),
)
const SellerInquiriesPage = lazy(() =>
  import('./pages/SellerInquiriesPage.jsx').then((module) => ({
    default: module.SellerInquiriesPage,
  })),
)
const SavedListingsPage = lazy(() =>
  import('./pages/SavedListingsPage.jsx').then((module) => ({
    default: module.SavedListingsPage,
  })),
)
const MyInquiriesPage = lazy(() =>
  import('./pages/MyInquiriesPage.jsx').then((module) => ({
    default: module.MyInquiriesPage,
  })),
)
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage.jsx').then((module) => ({
    default: module.AdminDashboardPage,
  })),
)
const ForbiddenPage = lazy(() =>
  import('./pages/ForbiddenPage.jsx').then((module) => ({ default: module.ForbiddenPage })),
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage.jsx').then((module) => ({ default: module.NotFoundPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage.jsx').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
)
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage.jsx').then((module) => ({
    default: module.ResetPasswordPage,
  })),
)
const VerifyEmailPage = lazy(() =>
  import('./pages/VerifyEmailPage.jsx').then((module) => ({
    default: module.VerifyEmailPage,
  })),
)
const AccountPage = lazy(() =>
  import('./pages/AccountPage.jsx').then((module) => ({ default: module.AccountPage })),
)

function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
        {/* Above both layouts so public listing cards and the headers share one poller. */}
        <SavedListingsProvider>
        <RouteEffects />
        <a
          href="#main-content"
          className="sr-only fixed left-4 top-4 z-[200] rounded-xl bg-primary-500 px-4 py-3 text-sm font-bold text-white shadow-card focus:not-sr-only"
        >
          Skip to main content
        </a>
        <Suspense fallback={<LoadingScreen label="Loading this ReFon experience…" />}>
          <Routes>
            <Route element={<MarketplaceLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/listings/:id" element={<ListingDetailPage />} />
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
              <Route element={<SellerInquiriesProvider />}>
                <Route element={<AuthenticatedLayout />}>
                  <Route path="/forbidden" element={<ForbiddenPage />} />
                  <Route path={AUTH_ROUTES.account} element={<AccountPage />} />

                  <Route element={<RequireRole allowedRoles={['ADMIN']} />}>
                    <Route path="/admin" element={<AdminDashboardPage />} />
                  </Route>

                  <Route element={<RequireRole allowedRoles={['BUYER', 'SELLER']} />}>
                    <Route path={AUTH_ROUTES.saved} element={<SavedListingsPage />} />
                    <Route path={AUTH_ROUTES.myInquiries} element={<MyInquiriesPage />} />
                  </Route>

                  <Route element={<RequireRole allowedRoles={['SELLER']} />}>
                    <Route element={<SellerListingsProvider />}>
                      <Route path="/seller" element={<SellerDashboardPage />} />
                      <Route
                        path={AUTH_ROUTES.sellerInquiries}
                        element={<SellerInquiriesPage />}
                      />
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
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        </SavedListingsProvider>
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}

export default App
