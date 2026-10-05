import { prisma } from '../config/prisma.js'
import { env } from '../config/env.js'
import { ApiError } from '../utils/api-error.js'

/**
 * Inventory holds.
 *
 * A ReFon listing is one specific refurbished device, so availability is a lock
 * rather than a counter: either one buyer holds the phone or nobody does. Two
 * buyers must never both believe they hold the same device.
 *
 * Three mechanisms combine, deliberately:
 *
 *  1. A row lock on the listing (`SELECT … FOR UPDATE`) taken as the first
 *     statement of the reserving transaction. Concurrent attempts for the same
 *     listing serialise here, so the check-then-insert below is not a race.
 *  2. A check that reads the current state *inside* that transaction, after the
 *     lock is held.
 *  3. A partial unique index on `reservations (listing_id) WHERE released_at IS
 *     NULL`. Even if 1 and 2 were somehow bypassed, the second insert cannot
 *     commit.
 *
 * Relying on (2) alone would be the classic check-then-act race. Mechanism (3)
 * means the database is the final authority, not the application.
 *
 * All time comparisons use the database clock. A client-supplied timestamp is
 * never consulted, so a skewed device clock cannot extend or end a hold.
 */

/** The database's current time, used for every expiry decision. */
export async function databaseNow(transaction) {
  const rows = await transaction.$queryRaw`SELECT now() AS now`
  return rows[0].now
}

/**
 * Serialises all reservation attempts against one listing.
 *
 * Must be the first statement in the transaction that touches the listing;
 * taking the lock later would let two transactions read the same pre-lock state.
 */
export async function lockListing(transaction, listingId) {
  // The explicit cast is required: Prisma sends `$queryRaw` parameters as text,
  // and PostgreSQL has no `uuid = text` operator. The value is still bound, not
  // interpolated, so this is a type fix rather than a string-building one.
  await transaction.$queryRaw`SELECT id FROM listings WHERE id = ${listingId}::uuid FOR UPDATE`
}

/**
 * Releases holds that have lapsed.
 *
 * Lazy expiration: a hold is retired the moment anyone looks at the listing, so
 * no background worker is needed and the database never advertises a phone as
 * taken when it is not. This is also what frees the partial unique index slot —
 * a lapsed-but-unreleased row would otherwise block the listing forever.
 */
export async function releaseExpiredReservations(transaction, listingId, now) {
  const released = await transaction.reservation.updateMany({
    where: { listingId, releasedAt: null, expiresAt: { lte: now } },
    data: { releasedAt: now },
  })

  return released.count
}

/** The live hold on a listing, or null. Assumes the listing lock is held. */
export async function findActiveReservation(transaction, listingId, now) {
  return transaction.reservation.findFirst({
    where: { listingId, releasedAt: null, expiresAt: { gt: now } },
    select: { id: true, cartItemId: true, expiresAt: true },
  })
}

/**
 * Takes a hold on a listing for a cart item.
 *
 * Callers must already hold the listing row lock from `lockListing`. The
 * transaction is retried by the caller's own transaction wrapper, so a unique
 * violation from the partial index is translated here rather than surfacing as a
 * 500.
 *
 * `expiresAt` is computed from the database clock plus the configured window, so
 * the hold length cannot be influenced by the caller.
 */
export async function acquireReservation(transaction, { listingId, cartItemId, now }) {
  await releaseExpiredReservations(transaction, listingId, now)

  const existing = await findActiveReservation(transaction, listingId, now)

  // Re-holding a listing this cart already holds is a no-op, not a conflict. That
  // keeps a repeated "add" or a cart re-read from consuming a second slot.
  if (existing && existing.cartItemId === cartItemId) {
    return { reservation: existing, alreadyHeld: true }
  }

  if (existing) {
    throw new ApiError(
      409,
      'Another buyer is currently holding this phone. It may become available again shortly.',
      'LISTING_RESERVED',
    )
  }

  const expiresAt = new Date(now.getTime() + env.reservationMs)

  try {
    const reservation = await transaction.reservation.create({
      data: { listingId, cartItemId, expiresAt },
      select: { id: true, cartItemId: true, expiresAt: true },
    })

    return { reservation, alreadyHeld: false }
  } catch (error) {
    // The partial unique index rejected a concurrent insert. Losing that race is
    // an ordinary outcome, not a server fault.
    if (error?.code === 'P2002') {
      throw new ApiError(
        409,
        'Another buyer is currently holding this phone. It may become available again shortly.',
        'LISTING_RESERVED',
      )
    }

    throw error
  }
}

/** Releases every hold held through a cart item. Used when the line is removed. */
export async function releaseReservationForCartItem(transaction, cartItemId, now) {
  await transaction.reservation.updateMany({
    where: { cartItemId, releasedAt: null },
    data: { releasedAt: now },
  })
}

/**
 * Database clock outside a transaction.
 *
 * Used by read paths that do not mutate, so a plain cart read does not need to
 * open a transaction.
 */
export async function currentDatabaseTime() {
  const rows = await prisma.$queryRaw`SELECT now() AS now`
  return rows[0].now
}