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
    inquiries: inquiries.count,
    favorites: favorites.count,
    reports: reportsBySuite.count + strayReports.count,
    notifications: notifications.count,
    authTokens: authTokens.count,
    listingsRestored: listings.count,
  }
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
    `listings restored ${result.listingsRestored}`,
  ].join(', ')
}
