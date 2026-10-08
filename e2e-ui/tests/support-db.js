import { PrismaClient } from '@prisma/client'

/**
 * Test-database reset for the Playwright suite.
 *
 * The suite talks to a real PostgreSQL database — the same one the dev stack
 * uses — because the alternative is a mock API that would not exercise the
 * actual Prisma queries. That makes the suite a writer, and every run leaves
 * rows behind: listings flipped to SOLD or REJECTED, seller applications stuck
 * in the admin queue, `e2e-ui-` accounts, inquiries, favorites, and reports.
 *
 * On the next run those leftovers are not neutral. A seeded listing left as
 * SOLD no longer accepts inquiries, so a test that expects the inquiry button
 * fails even though nothing is wrong with the app. A stale seller application
 * from a previous run sorts ahead of the current one in the admin queue, so the
 * moderation test rejects the wrong record. Both failures look like regressions
 * and cost real time to diagnose.
 *
 * This module makes each run start from the seeded baseline. It is destructive
 * by design and therefore guarded three ways:
 *
 *   1. It refuses to run when NODE_ENV is `production`.
 *   2. It refuses to run against a non-local database host, so it cannot reach a
 *      deployed or shared environment by accident.
 *   3. It only ever deletes rows the suite itself created (`e2e-ui-` accounts
 *      and their dependents) or restores seeded listings to APPROVED. Seeded
 *      accounts, sellers, and catalog listings are never deleted.
 *
 * Set `REFON_ALLOW_TEST_CLEANUP=1` to override the host check when a developer
 * intentionally points the suite at a non-local development database.
 */

const PREFIX = 'e2e-ui-'

/**
 * Inclusive UUID range for the seeded demo listings (`40000000-…-0001` through
 * `-00NN`). Listings created by the suite have random UUIDs and are handled by
 * the cascade deletes above, not by this range.
 */
const SEEDED_LISTING_ID_RANGE = [
  '40000000-0000-4000-8000-000000000000',
  '40000000-0000-4000-8000-0000000000ff',
]

/**
 * Brand marker for listings the UI suite creates for negative-path fixtures.
 *
 * These are made with the seeded `seller@refon.test` account so they inherit real
 * moderation, which means they are not owned by a `PREFIX` suite user and are not
 * removed by the account cascade below. An APPROVED listing is locked against
 * deletion through the API, so the reset is the only route that can remove them and
 * they have to be identified by marker rather than by owner.
 *
 * `product-detail.spec.js` writes this brand, which is what keeps the two sides in
 * agreement.
 */
const FIXTURE_LISTING_BRAND = 'ReFon'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'])

export function assertTestCleanupAllowed(env = process.env) {
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'Refusing to reset test data: NODE_ENV is production. This cleanup is test-only.',
    )
  }

  const url = env.DATABASE_URL

  if (!url) {
    throw new Error(
      'Refusing to reset test data: DATABASE_URL is not set, so the target database is unknown.',
    )
  }

  let hostname
  try {
    hostname = new URL(url).hostname
  } catch {
    throw new Error('Refusing to reset test data: DATABASE_URL could not be parsed.')
  }

  const isLocal = LOCAL_HOSTS.has(hostname)
  const isOverridden = env.REFON_ALLOW_TEST_CLEANUP === '1' || env.REFON_ALLOW_TEST_CLEANUP === 'true'

  if (!isLocal && !isOverridden) {
    throw new Error(
      `Refusing to reset test data: DATABASE_URL points at "${hostname}", which is not a local host. ` +
        'Point the suite at localhost, or set REFON_ALLOW_TEST_CLEANUP=1 if this is an intentional development database.',
    )
  }
}

/**
 * Restores the database to the seeded baseline.
 *
 * Returns a count summary so callers can log what changed.
 */
export async function resetTestData(prisma = new PrismaClient()) {
  assertTestCleanupAllowed()

  // Suite accounts and everything that hangs off them. Seller rows are deleted
  // first because the user delete is restricted by the seller relation.
  const suiteUsers = await prisma.user.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true },
  })
  const suiteUserIds = suiteUsers.map((entry) => entry.id)

  const suiteSellers = suiteUsers.length
    ? await prisma.seller.findMany({ where: { userId: { in: suiteUserIds } }, select: { id: true } })
    : []

  const inquiries = await prisma.inquiry.deleteMany({ where: { buyerId: { in: suiteUserIds } } })
  const favorites = await prisma.favorite.deleteMany({ where: { userId: { in: suiteUserIds } } })
  const reportsBySuite = await prisma.report.deleteMany({ where: { reporterId: { in: suiteUserIds } } })
  const notifications = await prisma.notification.deleteMany({ where: { userId: { in: suiteUserIds } } })
  const authTokens = await prisma.authToken.deleteMany({ where: { userId: { in: suiteUserIds } } })
  // Once commerce ships, order rows will hold a restrictive relation to users
  // and cannot be deleted with the account. Fail loudly rather than silently
  // leaving a suite account behind.
  const orders =
    typeof prisma.order === 'object' && prisma.order
      ? await prisma.order.count({ where: { userId: { in: suiteUserIds } } })
      : 0

  if (orders > 0) {
    throw new Error(
      `Refusing to reset: ${orders} order(s) exist for suite accounts. Delete them manually, or re-seed, before running the suite.`,
    )
  }

  await prisma.seller.deleteMany({ where: { id: { in: suiteSellers.map((entry) => entry.id) } } })
  const users = await prisma.user.deleteMany({ where: { id: { in: suiteUserIds } } })

  // Reports filed against listings the suite did not create.
  const strayReports = await prisma.report.deleteMany({ where: { reporterId: { notIn: suiteUserIds } } })

  // Carts and reservations left by a previous run.
  //
  // A cart belongs to an account, and the browser contexts the suite creates and
  // discards do not own it, so the cart row survives with a live 15-minute
  // reservation on a real device. The next run then gets `LISTING_RESERVED` when it
  // tries to hold the same phone, which looks like an application failure and is not
  // one. Emptying every cart releases those holds and returns the devices to the
  // catalog.
  const reservations = await prisma.reservation.deleteMany({})
  const cartItems = await prisma.cartItem.deleteMany({})
  const carts = await prisma.cart.deleteMany({})

  // Fixtures left by a previous run. Their dependent rows go first: reservations and
  // cart lines restrict the listing, while inquiries, favorites, reviews, and
  // reports cascade from it but are listed explicitly so the counts below stay
  // readable.
  const fixtures = { brand: FIXTURE_LISTING_BRAND }

  const fixtureReviews = await prisma.review.deleteMany({ where: { listing: fixtures } })
  const fixtureInquiries = await prisma.inquiry.deleteMany({ where: { listing: fixtures } })
  const fixtureFavorites = await prisma.favorite.deleteMany({ where: { listing: fixtures } })
  const fixtureReports = await prisma.report.deleteMany({ where: { listing: fixtures } })
  const fixtureListings = await prisma.listing.deleteMany({ where: fixtures })

  // Seeded listings mutated by a previous run: restored to the approved state
  // so inquiry, moderation, and mark-sold tests start from a known baseline.
  // Seeded listing ids are a contiguous UUID range; `startsWith` is not valid on
  // a Postgres uuid column, so the range form is used instead.
  const listings = await prisma.listing.updateMany({
    where: {
      id: { gte: SEEDED_LISTING_ID_RANGE[0], lte: SEEDED_LISTING_ID_RANGE[1] },
      OR: [{ status: { not: 'APPROVED' } }, { moderatorFeedback: { not: null } }],
    },
    data: { status: 'APPROVED', moderatorFeedback: null },
  })

  return {
    users: users.count,
    sellers: suiteSellers.length,
    inquiries: inquiries.count + fixtureInquiries.count,
    favorites: favorites.count + fixtureFavorites.count,
    reports: reportsBySuite.count + strayReports.count + fixtureReports.count,
    reviews: fixtureReviews.count,
    notifications: notifications.count,
    authTokens: authTokens.count,
    listingsRestored: listings.count,
    cartsEmptied: carts.count,
    cartItemsRemoved: cartItems.count,
    reservationsReleased: reservations.count,
    fixtureListingsRemoved: fixtureListings.count,
  }
}

/**
 * Stages a price change on a listing, for the cart's price-change UI.
 *
 * A shopper's cart records the price a listing had when the device was added, and
 * the cart reports both figures when they diverge. That divergence cannot be staged
 * through the API on purpose: an APPROVED listing is locked against editing, so a
 * seller cannot reprice a live device while buyers hold it. That is correct product
 * behaviour and the suite must not weaken it to make a test easier.
 *
 * So the change is written directly, through the same guarded module that owns the
 * reset. The production guards still apply — this refuses to touch a production or
 * non-local database exactly as `resetTestData` does.
 *
 * Returns a snapshot of every column it touched. Handing the whole snapshot back to
 * `restoreListing` is the only supported way to undo this: `discount_percent` is a
 * denormalised column the catalog sorts by, so restoring only the price would leave
 * a listing whose stored discount disagrees with its own price and reference price,
 * and the "biggest discount" ordering would quietly change for the rest of the suite.
 *
 * Not for general use: only for state the API deliberately cannot produce.
 */
export async function setListingPriceForTest(listingId, price, prisma = new PrismaClient()) {
  assertTestCleanupAllowed()

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { price: true, discountPercent: true, originalPrice: true },
  })

  if (!listing) {
    throw new Error(`Cannot stage a price change: listing ${listingId} does not exist.`)
  }

  await prisma.listing.update({
    where: { id: listingId },
    // Zeroing the stored percentage keeps the column consistent with the staged
    // price; `restoreListing` puts the original figure back.
    data: { price, discountPercent: 0 },
  })

  return {
    price: Number(listing.price),
    discountPercent: listing.discountPercent,
    originalPrice: listing.originalPrice,
  }
}

/** Puts every column `setListingPriceForTest` touched back the way it was. */
export async function restoreListing(listingId, snapshot, prisma = new PrismaClient()) {
  assertTestCleanupAllowed()

  if (!snapshot) {
    throw new Error(
      'restoreListing needs the snapshot returned by setListingPriceForTest. ' +
        'Restoring only the price would leave discount_percent inconsistent with it.',
    )
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      price: snapshot.price,
      discountPercent: snapshot.discountPercent ?? 0,
      originalPrice: snapshot.originalPrice ?? null,
    },
  })
}

/**
 * Returns a seeded listing to APPROVED.
 *
 * A test that withdraws a device — marking it sold, say — must put it back, or the
 * next run finds a catalog smaller than the seed. The one-off reset does this too,
 * but a test that leaves the database wrong for its whole run is testing against a
 * fixture it broke itself.
 */
export async function restoreListingStatus(listingId, prisma = new PrismaClient()) {
  assertTestCleanupAllowed()

  await prisma.listing.update({
    where: { id: listingId },
    data: { status: 'APPROVED', moderatorFeedback: null },
  })
}

export function summarize(result) {
  return [
    `users -${result.users}`,
    `sellers -${result.sellers}`,
    `inquiries -${result.inquiries}`,
    `favorites -${result.favorites}`,
    `reports -${result.reports}`,
    `notifications -${result.notifications}`,
    `authTokens -${result.authTokens}`,
    `reviews -${result.reviews}`,
    `carts -${result.cartsEmptied}`,
    `cart items -${result.cartItemsRemoved}`,
    `reservations -${result.reservationsReleased}`,
    `fixture listings -${result.fixtureListingsRemoved}`,
    `listings restored ${result.listingsRestored}`,
  ].join(', ')
}
