# ReFon frontend

React and Vite client for ReFon. Listing, seller, inquiry, and admin moderation screens use the Express API and PostgreSQL through Prisma. Seller photos are uploaded as real multipart image files; the first photo is the Main Photo and the complete ordered set is used by the listing gallery.

- `src/App.jsx` — marketplace, public auth, and protected route trees
- `src/pages/LandingPage.jsx` — trust-led home page and moderation explainer
- `src/pages/BrowsePage.jsx` — API-backed search, filters, sorting, and listing results
- `src/pages/ListingDetailPage.jsx` — API-backed gallery, condition details, seller information, and inquiry CTA
- `src/pages/SellerDashboardPage.jsx` — real seller stats, status inventory, feedback, delete, and mark-sold actions
- `src/pages/SellerListingFormPage.jsx` — API-backed create/edit form, real multipart photo uploads, Main Photo selection/reordering, validation, and live card preview
- `src/pages/AdminDashboardPage.jsx` — real moderation stats, seller/listing queues, and review actions
- `src/features/listings/` — listing cards, gallery, inquiry API/hooks, and filters
- `src/features/seller/` — API-backed seller listing provider and seller profile hook
- `src/features/admin/` — admin moderation API client
- `src/features/notifications/` — buyer/seller notification API client and navbar bell panel
- `src/features/auth/` — auth API client, provider, validation, and role routes
- `src/components/layout/` — public marketplace and authenticated layouts
- `src/components/auth/` — reusable authentication UI and route guards
- `src/index.css` — font loading, focus states, reduced-motion handling, and global Tailwind base styles
- `src/components/ui/Skeleton.jsx` and `src/features/listings/listing-skeletons.jsx` — responsive loading placeholders for marketplace data states
- `tailwind.config.js` — ReFon design tokens

The JWT is maintained in an `httpOnly` cookie, so the frontend restores the user through `GET /api/auth/me` rather than reading a token from browser storage. Vite proxies both `/api` and `/uploads` to the backend at `http://localhost:4000` during development.

From the repository root, run `npm run dev:frontend` or `npm run build:frontend`.
