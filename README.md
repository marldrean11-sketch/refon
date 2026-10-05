# ReFon

[![CI](https://github.com/OWNER/refon/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/refon/actions/workflows/ci.yml)

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
│   ├── nginx.conf            # Production SPA server and API proxy
│   ├── Dockerfile            # Production web image
│   └── vite.config.js
├── backend/                  # Node.js + Express
│   ├── prisma/               # Prisma schema and database migrations
│   ├── scripts/              # Operational scripts (admin, upload cleanup)
│   ├── src/
│   │   ├── config/           # Environment and service configuration
│   │   ├── controllers/      # HTTP request handlers
│   │   ├── middlewares/      # Auth, moderation, errors, uploads
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Business operations, storage drivers
│   │   ├── utils/            # Shared backend utilities
│   │   └── validators/       # Request validation
│   ├── tests/                # Backend tests
│   ├── Dockerfile            # Production API image
│   └── uploads/              # Stored listing images and seed fixtures
├── e2e-ui/                   # Playwright UI verification suite
├── docker/                   # Container entrypoint scripts
├── docker-compose.yml        # Full local stack: db + backend + web
└── .github/workflows/ci.yml  # Lint, build, API tests, UI tests, image builds
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

### Component system

Reusable primitives live in `frontend/src/components/ui/` and are the only place
shared visual language is defined, so a card, a filter, and a policy page cannot
drift apart:

- `Button.jsx` — `Button` and `ButtonLink` (renders a router `Link` when `to` is set)
- `Badge.jsx`, `ConditionBadge.jsx`, `GradeBadge.jsx` — verified, graded, and warranty chips
- `BatteryHealth.jsx` — percentage plus a labelled `role="progressbar"` band
- `PriceDisplay.jsx` — price, reference price, and genuine savings only
- `RatingStars.jsx` — half-star rendering with an accessible numeric label
- `Modal.jsx` — dialog shell with focus trap, focus restore, Escape, scroll lock
- `Toast.jsx` + `ToastProvider` — success/failure feedback for every action
- `Section.jsx`, `SectionHeading.jsx`, `Breadcrumb.jsx`, `Pagination.jsx`
- `SelectField.jsx`, `TextField.jsx`, `Skeleton.jsx`, `StateViews.jsx`

Domain rules that more than one component needs are shared from
`frontend/src/lib/`: `listing-taxonomy.js` owns the A/B/C grading scale, the
11-point inspection checklist, and the battery bands; `format.js` owns peso,
date, and relative-time formatting; `routes.js` owns every path.

Product artwork: `features/listings/PhoneArtwork.jsx` renders a model-specific
device illustration (body colour from the listing colour, camera layout and
notch from the model name) so cards do not all look identical before sellers
upload real photos. When a listing has real photos the card renders an `<img>`
and the illustration is never used, so swapping in product photography later
needs no code change.

## Marketplace preview

- `/` — conversion-led homepage: hero, trust strip, categories, featured phones, why refurbished, grading, best value, inspection, how it works, verified sellers, buyer objections, warranty, FAQ, and a closing CTA
- `/browse` — searchable, filterable, and sortable approved PostgreSQL listings

### Homepage composition

The homepage lives in `frontend/src/features/homepage/`, one file per section, composed by
`pages/LandingPage.jsx`. Section order follows the buyer's decision path: what this is →
can I trust it → what can I get → why is it cheaper → how do I know it is not broken →
how do I buy → what did other buyers think.

Every product section reads the live approved-listing response through
`useApprovedListings`, so the homepage cannot show a phone that is no longer buyable or a
price that has moved. The hero renders a real listing rather than a mock device, and the
verified-seller cards are derived from live listing data, so a seller who leaves the
platform drops off that section on its own.

Honesty constraints the homepage is built to, each covered by a Playwright assertion:

- **No fake urgency.** No countdown timers, no "only N left", no "limited time".
- **No fabricated social proof.** ReFon has no delivered orders, so the section that would
  normally hold testimonials states the three real buyer objections and what ReFon
  publishes to answer them, and says plainly that no orders have shipped yet. It is not
  dressed up as named customer reviews with star ratings.
- **Hero trust figures are live.** The battery percentage, grade, and price in the hero are
  the ones the API returns for that listing.

### Catalog filtering

`GET /api/listings` accepts brand, year, price range, condition grade, battery range,
storage, RAM, warranty, seller rating, category, featured, and free-text search, plus
`page`/`pageSize`/`sort`. The query schema is strict, so an unsupported filter returns
`422` naming the offending parameter instead of being silently ignored and returning
unfiltered results that a shopper would read as "nothing matched".

The shop page keeps its whole filter state in the URL query string. The back button,
a refresh, and a pasted link all produce the same result set, and every filtered view
is shareable. Sort options are `recommended`, `newest`, `price-asc`, `price-desc`,
`best-rated`, `best-selling`, and `biggest-discount`; every ordering ends with `id` as
a tiebreaker so paging through results never repeats or skips a listing.

Category links are real filtered URLs (`content/categories.js` builds them through
`categoryHref`), and brand, price-band, and grade categories are resolved server-side
from the listing columns rather than duplicated as tags, so they cannot drift from the
data. `GET /api/listings/facets` returns both the accepted option lists and live counts,
which is why the filter sidebar can only ever offer a filter the endpoint understands.

### Product page honesty

The product page states what is known and admits what is not. That is a set of
deliberate rules rather than incidental copy:

- **A grade letter is always explained.** `GradeExplainer` reads the same
  `lib/listing-taxonomy.js` definitions the catalog filters and the grader use, so
  the explanation cannot drift from the policy it describes.
- **Missing inspection data is never a pass.** `InspectionPanel` distinguishes
  *Not recorded* (nothing captured), *Incomplete* (some checks captured), and
  *Full inspection*. A check with no result reads "Not recorded", never "failed".
- **No saving is claimed without a reference price.** The API refuses to store a
  reference price at or below the selling price, so a fabricated discount is not
  representable. With none recorded, the page says so in those words.
- **IMEI is never exposed in full.** Only the last four digits are stored and
  rendered; the rest is never returned by the API.
- **Seller contact details are absent from the public payload.** Seller rows show
  name, verification, rating, location, and tagline — never a phone number or email.
- **Verified-purchase badges follow the stored flag only.** They are never inferred
  from a rating or from the wording of a comment.
- **Reviews are labelled as seeded sample data** while ReFon has no delivered
  orders, and there is no submission path in the UI.

Cart and checkout are a later phase, so the conversion panel offers the two
actions that work — wishlist and seller inquiry — and names cart as unavailable
rather than rendering a button that would appear to complete a purchase.

- `/phones/:slug` — canonical product URL. `/listings/:id` still resolves and replaces the
  address with the slug, so existing links and bookmarks keep working.
- `/seller` — protected seller overview backed by `/api/listings/mine`
- `/seller/listings/new` and `/seller/listings/:id/edit` — protected create/edit forms with live listing preview
- `/admin` — protected moderation dashboard for seller applications, pending listings, and placeholder reports
- Prices use the Philippine peso (`PHP`) and are shared across cards, detail pages, filters, sorting, and seller forms.
- Listing photos are stored through the configured storage driver and always referenced as `/uploads/<filename>`; the first URL in `photos` is the Main Photo used by cards, while all URLs are used in the gallery and admin review.
- Inquiry submissions are persisted through `POST /api/listings/:id/inquiries` and return the existing animated success UI.
- Pending and rejected listings are editable/deletable; approved listings can be marked sold, while approved and sold records remain locked from editing.
- The admin dashboard reads the same PostgreSQL queues used by sellers and writes moderation decisions directly to the database.
- In-app notifications are enabled for buyers and sellers: inquiry confirmations, new inquiries, listing moderation decisions, and sold-listing alerts appear in the navbar bell. Email notifications remain a future feature.
- Browse and listing detail views use responsive skeleton placeholders while PostgreSQL requests are pending; unavailable listings and unknown URLs have dedicated recovery states.
- The UI includes a skip link, visible keyboard focus rings, labeled form controls, descriptive image alternatives, responsive mobile layouts, and reduced-motion fallbacks.

### Public content and trust routes

- `/phones` — canonical shop URL; `/browse` still resolves for existing bookmarks
- `/phones/:slug` and `/listings/:id` — product detail, canonical and legacy forms
- `/categories` — brand, budget, and Grade A entry points, each a shareable filtered URL
- `/how-it-works` — the buyer and seller processes side by side
- `/quality-check` — the five-stage inspection process and the 11-point checklist
- `/about`, `/sustainability`, `/faq`, `/warranty`, `/returns`, `/shipping`, `/contact`, `/privacy`, `/terms`

Policy and process copy is structured data in `frontend/src/content/` rather than
JSX, so the same wording drives the policy pages, the FAQ accordion, and the trust
sections without being duplicated.

The mobile layout adds a fixed bottom tab bar (Home, Shop, Categories, Saved,
Cart, Account) below `md`. Buyer-only destinations stay hidden for admins, matching
the desktop header.

SEO: per-route document titles and meta descriptions, Open Graph and Twitter card
tags, a canonical URL, `robots.txt`, `sitemap.xml`, a web manifest, and an SVG
favicon, all served from `frontend/public/`.

## Database

The Prisma schema is in `backend/prisma/schema.prisma` and targets PostgreSQL. It defines users, seller verification profiles, moderated listings, listing inquiries, reviews, favorites, reports, carts and inventory reservations, and in-app notifications with foreign keys, uniqueness constraints, and query indexes. PostgreSQL check constraints enforce listing years from 2015 through 2024 and battery percentages from 0 through 100, plus the cart ownership, reservation window, and guest-token format invariants described below.

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

It seeds 28 approved listings across the four approved sellers, each with a condition
grade, measured battery health, a warranty term, RAM, specifications, category tags, the
full inspection checklist, and a reference price — plus 12 sample reviews and three demo
buyer accounts to author them. The reviews are seeded sample data and are labelled as
such in the UI: ReFon has no real delivered orders in this prototype, so they are never
presented as genuine customer purchases. Seller ratings are derived from those reviews
after seeding, because the catalog filters and sorts on the denormalised columns.

Demo listings deliberately carry **no** photos, so `PhoneArtwork` renders a distinct
model-specific illustration for each one. Attaching a shared placeholder would make every
card look identical, which reads as a rendering bug rather than a placeholder. A real
uploaded photo always takes priority over artwork.

The seed refuses to run when `NODE_ENV=production`.

## Cart and inventory reservations

### Inventory model

A ReFon listing is **one specific refurbished physical device**, not a stock-keeping
unit. Availability is therefore a lock, not a counter: a phone is free, held by one
buyer, or sold — never available in multiples. `Listings.quantity` exists and is
validated, but every cart line carries a quantity of exactly 1, and the schema makes
holding one device twice unrepresentable rather than merely discouraged.

### Data model

`Cart` belongs to exactly one owner, enforced by a check constraint rather than by
convention:

| Table | Purpose |
| --- | --- |
| `carts` | One owner: `user_id` (account) **or** `guest_token_hash` (guest), never both and never neither |
| `cart_items` | One line per `(cart_id, listing_id)`, with `price_snapshot` and `quantity` |
| `reservations` | A short-lived hold: `listing_id`, `cart_item_id`, `expires_at`, `released_at` |

### Guest carts

A visitor can build a cart before signing in. The browser holds an opaque 256-bit
random token in the `refon_cart` cookie and nothing else — no cart contents, no
listing ids, no prices. The database stores only the **SHA-256** of that token, so a
database leak cannot hand out live guest carts, the same reason `auth_tokens` stores
only a reset-link hash. The cookie is `httpOnly`, `SameSite=Lax`, `Secure` in
production, and scoped to `/`.

### Merge on sign-in

Registering or signing in merges the guest cart into the account cart in a single
transaction:

- A listing present in both carts stays **one line**, and the buyer's hold is
  *transferred* onto the account's line rather than dropped.
- A guest hold is released before the account hold is taken, so a buyer is never
  blocked by their own reservation.
- An item whose listing is no longer available is **carried over and marked**, never
  silently discarded.
- A lapsed guest hold is refreshed to a fresh window on sign-in, which is what keeps
  the merged cart actionable. If another buyer took the phone in the meantime the
  line is kept and reported as unavailable.
- The guest cart row is deleted and its cookie cleared, so the identity cannot be
  replayed to re-claim the same items.

A merge failure is logged and never blocks sign-in: a buyer who cannot sign in
because of a cart problem is a worse outcome than one who retries the merge.

### Reservations

Adding a listing takes a **15-minute hold** (`RESERVATION_MINUTES`, bounded 1–1440).
Expiry is lazy and always judged against the **database clock** — a client-supplied
timestamp is never read. There is no background worker: a lapsed hold is retired the
next time the listing or the cart is touched.

Expiry is recorded by setting `released_at` rather than by deleting the row. A partial
unique index cannot use a volatile predicate like `expires_at > now()`, so a
lapsed-but-unreleased row would hold the one-slot-per-listing guarantee forever.

### Concurrency

Two buyers must never both hold the same physical phone. Three mechanisms combine:

1. **A row lock** — `SELECT … FROM listings WHERE id = $1::uuid FOR UPDATE`, taken as
   the first statement of the reserving transaction. Concurrent attempts on one
   listing serialise here.
2. **A check inside that transaction**, after the lock is held.
3. **A partial unique index** — `UNIQUE (listing_id) WHERE released_at IS NULL`. Even
   if 1 and 2 were bypassed, the second insert cannot commit.

Relying on (2) alone would be the classic check-then-act race. Mechanism (3) makes the
database the final authority. `tests/cart.e2e.mjs` fires eight simultaneous adds at one
listing and asserts that exactly one is granted.

### Price snapshots

A cart line stores the listing price at the moment it was added. If a seller later
changes the price, the cart reports **both** figures plus `priceChanged` and
`priceDelta`, and flags the line `PRICE_INCREASED` or `PRICE_DECREASED`. The cart
subtotal is computed from the **live** price, never the snapshot, so a stale snapshot
can never become the number charged. No client-supplied price is accepted at all —
the add schema is strict and rejects `price`, `quantity`, `userId`, and `expiresAt`.

### Availability states

`availability` is computed from stored state on every read, so it cannot go stale:

| State | Meaning |
| --- | --- |
| `AVAILABLE` | The listing is approved and the line holds a live reservation |
| `RESERVATION_EXPIRED` | The hold lapsed; the phone may be free or taken |
| `UNAVAILABLE` | The listing was taken down, rejected, sold, or never approved |

An unapproved listing and a non-existent one are both reported as `404`
`LISTING_NOT_AVAILABLE`, so the catalog cannot be probed for draft work.

### Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/cart` | optional | Current cart, guest or account |
| `POST` | `/api/cart/items` | optional | Add a listing and hold it |
| `DELETE` | `/api/cart/items/:listingId` | optional | Remove a line and release its hold |
| `DELETE` | `/api/cart` | optional | Empty the cart and release every hold |
| `POST` | `/api/cart/merge` | required | Explicit merge; sign-in does this automatically |

There is deliberately **no `PATCH`**. Quantity editing is not a question a
single-device marketplace needs to answer, and a quantity endpoint would be an
invitation to create an impossible amount of one phone.

Not implemented here, by design: checkout, payment, order creation, delivery, and
fulfilment belong to Phases 6 and 7.

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
- `POST /api/uploads` — authenticated seller photo upload; accepts up to 6 JPG, PNG, or WebP files (8 MB each, verified by magic bytes) and returns `/uploads/...` URLs
- `GET /api/health` — public health check; `200` with `status: ok` when the database answers, `503` with `status: degraded` otherwise
- `GET /api/notifications/mine`
- `PATCH /api/notifications/:id/read`

Public read endpoints used by the product page:

- `GET /api/listings/slug/:slug` — canonical product lookup
- `GET /api/listings/:id/related` — related phones, excluding the listing itself
- `GET /api/listings/:id/reviews` — **read-only** published reviews plus a rating
  distribution. There is deliberately no write path: a verified review requires a
  delivered order, which does not exist yet. Only `PUBLISHED` rows are selected at
  the query level, and reviewers are attributed by initials rather than by name or
  email.
- `PATCH /api/notifications/read-all`

Public marketplace APIs:

- `GET /api/listings` — approved listings only; supports `brand`, `minYear`, `maxYear`, `minPrice`, `maxPrice`, `search`, and `sort`
- `GET /api/listings/:id` — approved listing detail
- `POST /api/listings/:id/inquiries` — public inquiry submission

Admin APIs require the `ADMIN` role and provide stats plus pending seller/listing queues and review actions under `/api/admin`.

## Deployment

ReFon runs the same way in all three supported targets: a Node API, a static frontend, and PostgreSQL. The only piece that varies is where listing photos live.

### Local npm workflow

Unchanged, and still the fastest loop. No Docker needed:

```bash
npm install
npm run dev:backend   # API on :4000
npm run dev:frontend  # Vite on :5173, proxying /api and /uploads to :4000
# or both at once:
npm run dev
```

Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` and `JWT_SECRET` first. Then:

```bash
npm run prisma:generate
npx prisma migrate deploy --schema backend/prisma/schema.prisma
npm run prisma:seed
```

### Docker Compose

```bash
cp .env.example .env
# Fill in the REQUIRED values. Generate secrets with:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
docker compose up --build
```

The app is then on `http://localhost:8080`. Compose starts PostgreSQL (unpublished, so your local Postgres on 5432 is never touched), applies migrations, and starts nginx in front of the API. The database has no host port mapping on purpose.

Create the first real administrator once the stack is up:

```bash
ADMIN_EMAIL=you@example.com \
ADMIN_PASSWORD='at-least-12-characters' \
ADMIN_NAME='Your Name' \
docker compose exec -e ADMIN_EMAIL -e ADMIN_PASSWORD -e ADMIN_NAME backend \
  npm run admin:create -w backend
```

`admin:create` refuses a password under 12 characters, sets `emailVerifiedAt`, and never prints the password. It also promotes an existing account, which signs out that account's current sessions.

Stop the stack with `docker compose down`. That keeps your volumes, so the database and uploaded photos survive. Add `-v` only when you intend to delete them.

### Option A: VPS with Compose

One small server, Compose, and a TLS terminator in front.

- Put Caddy or nginx in front of port 8080 to obtain a certificate. Terminating TLS in one place means the browser only ever sees one origin.
- **Serve the frontend and the API from one origin.** nginx already proxies `/api` and `/uploads` to the API, so this is the default. Keeping one origin is what makes the `SameSite=Lax` `Secure` session cookie work; splitting the frontend and API onto different sites requires `SameSite=None`, which is weaker and is not configured here.
- Back up the database before any upgrade:

```bash
docker compose exec -T db pg_dump -U refon -d refon | gzip > "pgdata-$(date +%F).sql.gz"
```

- Set `APP_URL` and `CLIENT_URL` to your public HTTPS origin, including the scheme.
- Keep `STORAGE_DRIVER=local` only while the `uploads` volume is genuinely persistent. If you deploy with `--build` recreating containers on an ephemeral disk, use `STORAGE_DRIVER=s3`.

### Option B: Railway, Render, or Fly

These platforms give you an ephemeral filesystem, so `STORAGE_DRIVER=local` will lose every uploaded photo on each deploy. Use object storage.

1. Provision a managed PostgreSQL database and set `DATABASE_URL`.
2. Create a private bucket on Cloudflare R2, Backblaze B2, AWS S3, or MinIO, and set:

```
STORAGE_DRIVER=s3
S3_BUCKET=refon-photos
S3_REGION=auto
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com   # R2, B2 and MinIO only
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PREFIX=uploads/
```

Leave `S3_ENDPOINT` empty for real AWS S3, set `S3_FORCE_PATH_STYLE=true` for MinIO, and keep the bucket private: the API streams photos back out itself.

3. Build commands. Backend:

```
npm ci && npx prisma generate --schema backend/prisma/schema.prisma && npm prune --omit=dev
npm start --workspace @refon/backend
```

Run `npx prisma migrate deploy --schema backend/prisma/schema.prisma` as a release/pre-deploy step. Frontend:

```
npm ci && npm run build --workspace @refon/frontend
```

Publish `frontend/dist` as a static site with a catch-all rewrite to `index.html`, and route `/api` and `/uploads` to the API. Set the health check path to `/api/health`.

4. Set `SMTP_HOST` (required in production), `MAIL_FROM`, `APP_URL`, `CLIENT_URL`, and a 32+ character `JWT_SECRET`.

### Email provider example

Any SMTP relay works. For a transactional provider:

```
MAIL_FROM="ReFon <no-reply@yourdomain.com>"
SMTP_HOST=smtp.postmarkapp.com
SMTP_PORT=587
SMTP_USER=your-api-token
SMTP_PASS=your-api-token
SMTP_SECURE=false
```

Use port 465 with `SMTP_SECURE=true` for implicit TLS. The API refuses to boot in production without `SMTP_HOST`, so a misconfigured mail setup fails loudly rather than silently dropping password reset links. Without a relay, mail is appended to `backend/tmp/mail-outbox.jsonl` instead, which is for local development only.

### Environment variables

Backend (`backend/.env`, or the compose/host environment):

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | none | PostgreSQL connection string |
| `JWT_SECRET` | yes | none | Session signing secret, 32+ characters |
| `JWT_EXPIRES_IN` | no | `7d` | Session lifetime |
| `RESERVATION_MINUTES` | no | `15` | How long a cart holds a physical listing, 1–1440 |
| `PORT` | no | `4000` | API port |
| `CLIENT_URL` | yes in prod | localhost Vite URLs | Comma-separated CORS allowlist |
| `APP_URL` | no | `http://localhost:5173` | Base URL used in account emails |
| `MAIL_FROM` | no | `ReFon <no-reply@refon.test>` | From header |
| `SMTP_HOST` | yes in prod | none | Relay host; empty writes to the local outbox |
| `SMTP_PORT` | no | `587` | Relay port |
| `SMTP_USER` / `SMTP_PASS` | no | empty | Relay credentials |
| `SMTP_SECURE` | no | `false` | `true` for implicit TLS |
| `STORAGE_DRIVER` | no | `local` | `local` or `s3` |
| `S3_BUCKET` | with s3 | none | Bucket name |
| `S3_REGION` | with s3 | none | Region, or `auto` for R2 |
| `S3_ENDPOINT` | no | none | Set for R2, B2, MinIO; empty for AWS |
| `S3_ACCESS_KEY_ID` | with s3 | none | Access key |
| `S3_SECRET_ACCESS_KEY` | with s3 | none | Secret key |
| `S3_FORCE_PATH_STYLE` | no | `false` | `true` for MinIO and some B2 setups |
| `S3_PREFIX` | no | `uploads/` | Key prefix inside the bucket |
| `UPLOAD_DIR` | no | `uploads` | Local uploads folder |
| `ADMIN_EMAIL` | for `admin:create` | none | Administrator to create or promote |
| `ADMIN_PASSWORD` | for `admin:create` | none | 12+ characters, never logged |
| `ADMIN_NAME` | no | `ReFon Administrator` | Administrator display name |
| `NODE_ENV` | no | `development` | `production` enables secure cookies and proxy trust |

Frontend: `VITE_API_URL` (`frontend/.env`), default `/api`.

Compose only (`/.env`): `POSTGRES_PASSWORD`, `JWT_SECRET`, `APP_URL`, `CLIENT_URL`, `MAIL_FROM`, `SMTP_*`, `STORAGE_DRIVER`, `S3_*`, `WEB_PORT` (default `8080`), and optional `ADMIN_*`.

### Never do this in production

- **Run `npm run prisma:seed`.** It creates fixed demo accounts with published passwords and refuses to run when `NODE_ENV=production`. Those demo accounts must never exist in production: admin `admin@refon.test` / `AdminTest123!`, seller `seller@refon.test` / `SellerTest123!`, plus `circuit@`, `metro@`, and `signal@`. If any of them reach a live database, treat it as a breach and reset those passwords.
- **Run `prisma migrate reset`.** It drops every table and all data. Production containers only ever run `prisma migrate deploy`.
- **Commit `.env`.** It holds database passwords, `JWT_SECRET`, and SMTP credentials. Only `.env.example` belongs in git.
- **Serve the frontend and API from different sites.** The session cookie is `SameSite=Lax`; one origin is required.
- **Use `STORAGE_DRIVER=local` on an ephemeral filesystem.** Photos disappear on redeploy.
- **Run a production stack without TLS.** Session cookies are only marked `Secure` behind HTTPS.

### Health check

`GET /api/health` is public and unrated. It returns `200 {"status":"ok","uptime":...}` when `SELECT 1` succeeds against PostgreSQL and `503 {"status":"degraded"}` when it does not. It exposes no configuration detail, so it is safe to poll from a load balancer or a container healthcheck.

### Known dependency advisories

`npm audit` reports 6 high-severity advisories, all one root cause: `braces` 3.0.3 is reachable only through `chokidar`, via `nodemon` (backend devDependency) and `tailwindcss` (frontend devDependency). Both are build-time and development tools that are never installed into a production runtime — `npm audit --omit=dev` reports **0 vulnerabilities**. `npm audit fix` without `--force` changes nothing, because the only available fix is `tailwindcss@4`, a major release that would require rewriting `tailwind.config.js` into CSS-first `@theme` syntax. That upgrade is deliberately out of scope here. `nodemon` has no patched release yet.

## Tooling

- React 19 + Vite
- Tailwind CSS 3 with a JavaScript theme config
- Framer Motion and Lucide React
- Node.js + Express 5
- Prisma ORM with PostgreSQL
- JWT sessions in `httpOnly` cookies with bcrypt password hashing
- Photo uploads through multer with a pluggable storage driver: local disk under `backend/uploads/`, or any S3-compatible bucket
- Uploads are validated on their magic bytes, not just the declared `Content-Type`
- `GET /api/health` for liveness and database reachability
- Docker Compose stack, GitHub Actions CI, and a documented deployment path for VPS and PaaS targets

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

Validate the frontend build, lint both workspaces, and run the test suites:

```bash
npm run build          # frontend build
npm run lint           # oxlint in both workspaces
npm run test:api       # test:auth, test:marketplace, test:catalog, test:cart, sequentially
npm run test:catalog   # catalog filters, sorting, pagination, slugs, search
npm run test:cart      # carts, guest carts, merge, reservations, price snapshots
npm run test:storage   # local storage driver
npm run test:ui        # Playwright; needs ports 4000 and 5173 free
```

`test:api` runs the API suites one after another on purpose: they share a database, and running them concurrently would let them interfere with each other's rows.

The Playwright suite also talks to a real database, so its `globalSetup` resets test
artefacts before each run: it removes the `e2e-ui-` accounts the suite creates and restores
seeded listings to `APPROVED`. Without that, a listing left `SOLD` by a previous run stops
accepting inquiries and a stale seller application sorts ahead of the current one in the
admin queue — both of which look like app regressions but are test pollution. The reset
refuses to run when `NODE_ENV` is `production`, when `DATABASE_URL` is unset, or when it
points at a non-local host. `cleanup-guards.spec.js` pins those refusals.
