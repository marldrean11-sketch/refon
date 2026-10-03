# ReFon

ReFon is a moderated multi-seller marketplace for secondhand phones from the 2015–2024 model years. The public marketplace, seller workspace, admin moderation queues, and inquiries are connected to Express and PostgreSQL through Prisma.

## Project structure

```text
refon/
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── assets/           # Static frontend assets
│   │   ├── components/       # Shared and layout components
│   │   ├── features/         # Feature-scoped UI and logic
│   │   ├── hooks/            # Reusable React hooks
│   │   ├── pages/            # Marketplace, browse, and auth screens
│   │   ├── services/         # API/client adapters
│   │   ├── state/            # Shared client state
│   │   └── utils/            # Frontend utilities
│   ├── tailwind.config.js    # ReFon design tokens
│   └── vite.config.js
└── backend/                  # Node.js + Express
    ├── prisma/               # Prisma schema and database migrations
    ├── src/
    │   ├── config/           # Environment and service configuration
    │   ├── controllers/      # HTTP request handlers
    │   ├── middlewares/      # Auth, moderation, errors, uploads
    │   ├── routes/           # API route definitions
    │   ├── services/         # Business operations
    │   ├── utils/            # Shared backend utilities
    │   └── validators/       # Request validation
    ├── tests/                # Backend tests
    └── uploads/              # Stored listing images and seed fixtures
```

## Design foundation

The Tailwind theme lives in `frontend/tailwind.config.js`.

- **Primary:** trustworthy navy, centered on `#1F4E78`
- **Accent / verified:** emerald, centered on `#10B981`, with dedicated `verified`, `verified-soft`, and `verified-strong` trust tokens
- **Canvas:** `#F7F9FC`
- **Surface:** `#FFFFFF`
- **Ink:** `#0F1F33`
- **Muted text:** `#526174`
- **Borders:** `#E2E8F0`
- **Headings:** Space Grotesk
- **Body:** Inter with a `1.7` reading line-height
- **Type scale:** fluid `display`, `headline`, and `title` sizes
- **Spacing:** Tailwind's standard scale, extended with `18`, `22`, `28`, `30`, and `36` for generous section whitespace
- **Motion:** `180–300ms` transitions with a shared smooth easing curve, route fades, reduced-motion support, and animated modal/dropdown exits
- **Surfaces:** reusable card radii and soft card/hover/glass shadows

Global font loading and Tailwind base styles are in `frontend/src/index.css`. `frontend/src/App.jsx` owns the public marketplace, authentication, and role-aware route trees. Listing, seller, inquiry, and moderation screens now call the Express API directly; no frontend localStorage or mock inventory is used.

### Marketplace preview

- `/` — trust-led landing page and featured verified listings
- `/browse` — searchable, filterable, and sortable approved PostgreSQL listings
- `/listings/:id` — gallery, visual condition details, seller profile, and related listings
- `/seller` — protected seller overview backed by `/api/listings/mine`
- `/seller/listings/new` and `/seller/listings/:id/edit` — protected create/edit forms with live listing preview
- `/admin` — protected moderation dashboard for seller applications, pending listings, and placeholder reports
- Prices use the Philippine peso (`PHP`) and are shared across cards, detail pages, filters, sorting, and seller forms.
- Listing photos are uploaded to `backend/uploads/`; the first URL in `photos` is the Main Photo used by cards, while all URLs are used in the gallery and admin review.
- Inquiry submissions are persisted through `POST /api/listings/:id/inquiries` and return the existing animated success UI.
- Pending and rejected listings are editable/deletable; approved listings can be marked sold, while approved and sold records remain locked from editing.
- The admin dashboard reads the same PostgreSQL queues used by sellers and writes moderation decisions directly to the database.
- In-app notifications are enabled for buyers and sellers: inquiry confirmations, new inquiries, listing moderation decisions, and sold-listing alerts appear in the navbar bell. Email notifications remain a future feature.
- Browse and listing detail views use responsive skeleton placeholders while PostgreSQL requests are pending; unavailable listings and unknown URLs have dedicated recovery states.
- The UI includes a skip link, visible keyboard focus rings, labeled form controls, descriptive image alternatives, responsive mobile layouts, and reduced-motion fallbacks.

## Database

The Prisma schema is in `backend/prisma/schema.prisma` and targets PostgreSQL. It defines users, seller verification profiles, moderated listings, listing inquiries, and in-app notifications with foreign keys, uniqueness constraints, and query indexes. PostgreSQL check constraints enforce listing years from 2015 through 2024 and battery percentages from 0 through 100.

Use these commands from `backend/`:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
```

Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` before running migrations.

The development-only seed creates or resets the fixed test administrator, approved demo sellers, and approved marketplace listings:

- Admin email: `admin@refon.test`
- Admin password: `AdminTest123!`
- Demo seller email: `seller@refon.test`
- Demo seller password: `SellerTest123!`

The seed refuses to run when `NODE_ENV=production`.

## Authentication

ReFon uses JWT sessions stored in an `httpOnly` cookie rather than `localStorage` or a JavaScript-readable token. This reduces token exposure to XSS, lets the browser send credentials automatically, and allows logout to clear the session server-side through `Set-Cookie`. Cookies are `SameSite=Lax`, `Secure` in production, and scoped to `/`.

Available endpoints:

- `POST /api/auth/register` — accepts `name`, `email`, `password`, and `BUYER` or `SELLER`; seller registration creates the linked pending seller profile in the same database transaction
- `POST /api/auth/login` — verifies the bcrypt password hash and sets the JWT cookie
- `GET /api/auth/me` — restores the current user from a valid JWT cookie
- `POST /api/auth/logout` — expires the auth cookie

`authenticate` attaches `{ id, role }` to `req.user`. The exported `requireAdmin`, `requireSeller`, and `requireBuyer` guards return `403` when a valid session does not have the required role. Admin and seller workspaces remain protected in the frontend; the landing and browse marketplace pages are public so shoppers can explore before creating an account.

The Vite development server proxies `/api` to `http://localhost:4000`. Set `VITE_API_URL` in `frontend/.env` only when the API is hosted at a different URL.

## Marketplace API

Seller APIs require an authenticated session:

- `POST /api/sellers/apply`
- `GET /api/sellers/me`
- `POST /api/listings`
- `GET /api/listings/mine`
- `PUT /api/listings/:id`
- `DELETE /api/listings/:id`
- `PATCH /api/listings/:id/mark-sold`
- `GET /api/listings/:id/inquiries`
- `POST /api/uploads` — authenticated seller photo upload; accepts up to 6 JPG, PNG, or WebP files and returns `/uploads/...` URLs
- `GET /api/notifications/mine`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

Public marketplace APIs:

- `GET /api/listings` — approved listings only; supports `brand`, `minYear`, `maxYear`, `minPrice`, `maxPrice`, `search`, and `sort`
- `GET /api/listings/:id` — approved listing detail
- `POST /api/listings/:id/inquiries` — public inquiry submission

Admin APIs require the `ADMIN` role and provide stats plus pending seller/listing queues and review actions under `/api/admin`.

## Tooling

- React 19 + Vite
- Tailwind CSS 3 with a JavaScript theme config
- Framer Motion and Lucide React
- Node.js + Express 5
- Prisma ORM with PostgreSQL
- JWT sessions in `httpOnly` cookies with bcrypt password hashing
- Multer-backed local image uploads stored under `backend/uploads/`

## Commands

Install workspace dependencies from the repository root:

```bash
npm install
```

Run each app in a separate terminal:

```bash
npm run dev:frontend
npm run dev:backend
```

Validate the frontend build, lint both workspaces, and run the API integration tests:

```bash
npm run build:frontend
npm run lint
npm run test:auth
npm run test:marketplace
```
