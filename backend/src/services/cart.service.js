import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'
import { hashGuestCartToken } from '../utils/cart-token.js'
import { listingInclude } from './listing.service.js'
import { presentListing } from '../utils/listing-presenter.js'
import {
  acquireReservation,
  currentDatabaseTime,
  databaseNow,
  lockListing,
  releaseExpiredReservations,
  releaseReservationForCartItem,
} from './reservation.service.js'

/**
 * Carts.
 *
 * A cart belongs either to a signed-in buyer or to a guest cookie identity, never
 * both, and the ownership is always derived server-side: from the verified session
 * for an account cart, or from the hash of an httpOnly cookie for a guest cart.
 * No request field can name a cart, a user, or a price.
 *
 * ReFon listings are single physical devices, so the cart's job is to hold one of
 * them for a short window rather than to count stock. Every write therefore goes
 * through the reservation service, which is where the concurrency guarantee lives.
 */

/** A cart may not grow without bound; a runaway client gets a clear error. */
const MAX_CART_ITEMS = 20

/**
 * Cart read shape, shared with the checkout service so both read the same columns
 * instead of each maintaining its own include.
 */
export const cartInclude = {
  items: {
    orderBy: { addedAt: 'asc' },
    include: {
      listing: { include: listingInclude },
      reservations: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  },
}

/** Transaction retry budget for transient serialization failures. */
const MAX_TRANSACTION_ATTEMPTS = 3

const RETRYABLE_CODES = new Set(['P2034', 'P2028'])

/**
 * Runs a transaction, retrying the serialization and lock-timeout failures that a
 * contended listing can legitimately produce.
 *
 * `P2034` is Prisma's write-conflict/transient-transaction error and `P2028` is a
 * transaction timeout — both mean "someone else got there first", which for a
 * reservation race is an outcome to retry, not a fault.
 */
async function runTransaction(work) {
  let lastError

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        maxWait: 5_000,
        timeout: 10_000,
      })
    } catch (error) {
      lastError = error

      if (!RETRYABLE_CODES.has(error?.code) || attempt === MAX_TRANSACTION_ATTEMPTS) {
        throw error
      }
    }
  }

  throw lastError
}

/**
 * Resolves the cart a request operates on, creating an empty one if needed.
 *
 * `guestToken` is only consulted when there is no session, so a signed-in buyer
 * always lands on their account cart and can never be steered into a guest cart
 * by holding a cookie.
 */
async function resolveCart(transaction, { userId, guestTokenHash, create = true }) {
  const owned = userId ? { userId } : guestTokenHash ? { guestTokenHash } : null

  if (!owned) {
    return null
  }

  const existing = await transaction.cart.findUnique({ where: owned, select: { id: true } })

  if (existing || !create) {
    return existing ?? null
  }

  return transaction.cart.create({ data: owned, select: { id: true } })
}

/**
 * Confirms a listing can be put in a cart.
 *
 * Only an approved listing can be bought, and the seller's own devices are not
 * available to them. A missing listing and an unapproved one are reported
 * identically so the catalog cannot be probed for draft work.
 */
async function assertListable(transaction, { listingId, viewerUserId }) {
  const listing = await transaction.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      status: true,
      price: true,
      quantity: true,
      sellerId: true,
      seller: { select: { userId: true } },
    },
  })

  if (!listing || listing.status !== 'APPROVED') {
    throw new ApiError(404, 'This phone is not available.', 'LISTING_NOT_AVAILABLE')
  }

  if (viewerUserId && listing.seller.userId === viewerUserId) {
    throw new ApiError(
      409,
      'You cannot buy your own listing.',
      'OWN_LISTING_NOT_PURCHASABLE',
    )
  }

  if (listing.quantity < 1) {
    throw new ApiError(
      409,
      'This phone is no longer available.',
      'LISTING_UNAVAILABLE',
    )
  }

  return listing
}

/**
 * Availability of one cart line, derived entirely from stored state.
 *
 * A line can be unavailable for several distinct reasons, and Phase 6 needs to
 * tell them apart: the listing was taken down, it sold, it was never approved,
 * or somebody else holds it. The state is computed here rather than stored so it
 * cannot go stale.
 */
function presentItem(item, { now }) {
  const listing = presentListing(item.listing)
  const reservation = item.reservations[0] ?? null

  const snapshot = Number(item.priceSnapshot)
  const current = Number(item.listing.price)
  const priceChanged = snapshot !== current

  const isLiveReservation =
    reservation && reservation.releasedAt === null && reservation.expiresAt > now

  const isPurchasable = item.listing.status === 'APPROVED'

  let availability = 'AVAILABLE'
  let unavailableReason = null

  if (!isPurchasable) {
    availability = 'UNAVAILABLE'
    unavailableReason =
      item.listing.status === 'SOLD'
        ? 'This phone has already sold.'
        : 'This listing is no longer available.'
  } else if (reservation && !isLiveReservation) {
    // A hold row that exists but is no longer live can only mean it lapsed: every
    // other release path deletes the cart line, so a visible line never keeps a
    // deliberately released hold. Phase 6 needs this state to tell the buyer their
    // window closed rather than implying they still hold the phone.
    availability = 'RESERVATION_EXPIRED'
    unavailableReason =
      'Your hold on this phone expired. It may be held by another buyer, or free again.'
  }

  const issues = []

  if (priceChanged) {
    issues.push(current > snapshot ? 'PRICE_INCREASED' : 'PRICE_DECREASED')
  }

  if (availability === 'UNAVAILABLE') {
    issues.push('LISTING_UNAVAILABLE')
  }

  if (availability === 'RESERVATION_EXPIRED') {
    issues.push('RESERVATION_EXPIRED')
  }

  if (issues.length === 0) {
    issues.push('OK')
  }

  return {
    id: item.id,
    listing,
    quantity: item.quantity,
    addedAt: item.addedAt.toISOString(),

    // Price snapshot and detection. Phase 6 decides what to do about a change;
    // the backend only reports it, and never silently charges either figure.
    priceSnapshot: snapshot,
    currentPrice: current,
    priceChanged,
    priceDelta: Number((current - snapshot).toFixed(2)),

    availability,
    unavailableReason,
    issues,

    reservation: reservation
      ? {
          id: reservation.id,
          status: isLiveReservation ? 'ACTIVE' : 'EXPIRED',
          expiresAt: reservation.expiresAt.toISOString(),
          secondsRemaining: isLiveReservation
            ? Math.max(0, Math.floor((reservation.expiresAt.getTime() - now.getTime()) / 1000))
            : 0,
        }
      : null,
  }
}

/**
 * Builds the cart payload Phase 6 will render.
 *
 * The subtotal is computed from the *current* listing price rather than the
 * snapshot, because a snapshot must never be the number charged; the per-line
 * `priceChanged` flag is what lets the UI show the difference.
 */
function presentCart(cart, { now }) {
  const items = cart.items.map((item) => presentItem(item, { now }))
  const purchased = items.filter((item) => item.availability !== 'UNAVAILABLE')

  return {
    id: cart.id,
    owner: cart.userId ? 'ACCOUNT' : 'GUEST',
    currency: 'PHP',
    itemCount: items.length,
    purchasableCount: purchased.length,
    hasUnavailableItems: items.some((item) => item.availability === 'UNAVAILABLE'),
    subtotal: Number(
      purchased.reduce((total, item) => total + item.currentPrice * item.quantity, 0).toFixed(2),
    ),
    serverTime: now.toISOString(),
    items,
  }
}

/** Reads a cart, lazily releasing holds on any of its lines that have lapsed. */
export async function getCart({ userId, guestTokenHash }) {
  const owner = userId ? { userId } : guestTokenHash ? { guestTokenHash } : null

  if (!owner) {
    const now = await currentDatabaseTime()
    return presentCart(
      { id: null, userId: null, items: [] },
      { now },
    )
  }

  const cart = await prisma.cart.findUnique({
    where: owner,
    include: cartInclude,
  })

  if (!cart) {
    const now = await currentDatabaseTime()
    return presentCart({ id: null, userId: null, items: [] }, { now })
  }

  const now = await runTransaction(async (transaction) => {
    const at = await databaseNow(transaction)

    for (const item of cart.items) {
      const reservation = item.reservations[0] ?? null

      // A hold that has lapsed is retired here rather than waiting for the listing
      // to be touched again, so the cart never claims to hold a phone it does not.
      if (reservation && reservation.releasedAt === null && reservation.expiresAt <= at) {
        await releaseReservationForCartItem(transaction, item.id, at)
      }
    }

    return at
  })

  // Re-read so the response reflects the releases just made.
  const refreshed = await prisma.cart.findUnique({ where: { id: cart.id }, include: cartInclude })

  return presentCart(refreshed ?? { ...cart, items: [] }, { now })
}

/**
 * Adds a listing to the cart and holds it.
 *
 * Adding the listing the cart already holds returns the existing line rather than
 * failing, so a repeated tap is harmless. The returned `created` flag lets a client
 * tell the two apart without guessing.
 */
export async function addToCart({ userId, guestTokenHash, listingId }) {
  return runTransaction(async (transaction) => {
    const cart = await resolveCart(transaction, { userId, guestTokenHash })

    if (!cart) {
      throw new ApiError(400, 'No cart is associated with this request.', 'CART_UNAVAILABLE')
    }

    const existingItem = await transaction.cartItem.findUnique({
      where: { cartId_listingId: { cartId: cart.id, listingId } },
      select: { id: true },
    })

    if (existingItem) {
      const now = await databaseNow(transaction)
      const refreshed = await transaction.cart.findUnique({
        where: { id: cart.id },
        include: cartInclude,
      })

      return { cart: presentCart(refreshed, { now }), created: false }
    }

    const itemCount = await transaction.cartItem.count({ where: { cartId: cart.id } })

    if (itemCount >= MAX_CART_ITEMS) {
      throw new ApiError(
        409,
        `A cart can hold at most ${MAX_CART_ITEMS} phones.`,
        'CART_LIMIT_REACHED',
      )
    }

    // Lock first, then read the listing: the lock is what stops a concurrent
    // reservation attempt for this listing from interleaving with the hold below.
    await lockListing(transaction, listingId)

    const listing = await assertListable(transaction, { listingId, viewerUserId: userId })
    const now = await databaseNow(transaction)

    await releaseExpiredReservations(transaction, listingId, now)

    // The snapshot is the server's price, never anything the client supplied.
    const item = await transaction.cartItem.create({
      data: {
        cartId: cart.id,
        listingId,
        priceSnapshot: listing.price,
        quantity: 1,
      },
    })

    await acquireReservation(transaction, { listingId, cartItemId: item.id, now })

    const refreshed = await transaction.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    })

    return { cart: presentCart(refreshed, { now }), created: true }
  })
}

/**
 * Removes a line and releases its hold.
 *
 * Removing a line that is not in the cart succeeds, so a repeated request or a
 * stale cart cannot turn into an error. Ownership is enforced by scoping the
 * delete to the resolved cart rather than by any client-supplied cart id.
 */
export async function removeCartItem({ userId, guestTokenHash, listingId }) {
  return runTransaction(async (transaction) => {
    const cart = await resolveCart(transaction, { userId, guestTokenHash, create: false })

    if (!cart) {
      const now = await databaseNow(transaction)
      return { cart: presentCart({ id: null, userId: null, items: [] }, { now }), removed: false }
    }

    const item = await transaction.cartItem.findUnique({
      where: { cartId_listingId: { cartId: cart.id, listingId } },
      select: { id: true },
    })

    if (!item) {
      const now = await databaseNow(transaction)
      const current = await transaction.cart.findUnique({
        where: { id: cart.id },
        include: cartInclude,
      })
      return { cart: presentCart(current, { now }), removed: false }
    }

    const now = await databaseNow(transaction)
    await releaseReservationForCartItem(transaction, item.id, now)
    await transaction.cartItem.delete({ where: { id: item.id } })

    const refreshed = await transaction.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    })

    return { cart: presentCart(refreshed, { now }), removed: true }
  })
}

/** Empties a cart and releases every hold it holds. */
export async function clearCart({ userId, guestTokenHash }) {
  return runTransaction(async (transaction) => {
    const cart = await resolveCart(transaction, { userId, guestTokenHash, create: false })

    if (!cart) {
      const now = await databaseNow(transaction)
      return presentCart({ id: null, userId: null, items: [] }, { now })
    }

    const now = await databaseNow(transaction)
    const items = await transaction.cartItem.findMany({
      where: { cartId: cart.id },
      select: { id: true },
    })

    for (const item of items) {
      await releaseReservationForCartItem(transaction, item.id, now)
    }

    await transaction.cartItem.deleteMany({ where: { cartId: cart.id } })

    return presentCart(
      { id: cart.id, userId: cart.userId, items: [] },
      { now },
    )
  })
}

/**
 * Merges a guest cart into the buyer's account cart.
 *
 * Called on sign-in and registration. The rules:
 *
 *  - A listing present in both carts stays one line. The account's existing line
 *    and its hold win, so a buyer cannot end up holding the same device twice or
 *    losing a hold they already had.
 *  - An item whose listing is no longer available is still carried over and marked
 *    unavailable. Dropping it would lose a line the buyer can see in their cart
 *    without explanation.
 *  - A guest hold is re-taken against the account's cart item where possible, and
 *    abandoned where another buyer already holds the listing.
 *
 * The whole thing is one transaction: a partially merged cart, where some items
 * moved and others did not, is worse than no merge at all.
 */
export async function mergeGuestCartIntoAccount({ userId, guestToken }) {
  if (!userId || !guestToken) {
    return null
  }

  const guestTokenHash = hashGuestCartToken(guestToken)

  return runTransaction(async (transaction) => {
    // Lock the guest cart first so two concurrent sign-ins cannot both consume it.
    const locked = await transaction.$queryRaw`
      SELECT id FROM carts WHERE guest_token_hash = ${guestTokenHash}::text FOR UPDATE
    `

    if (locked.length === 0) {
      return null
    }

    const guestCart = await transaction.cart.findUnique({
      where: { guestTokenHash },
      include: cartInclude,
    })

    if (!guestCart) {
      return null
    }

    const accountCart = await resolveCart(transaction, { userId })
    const now = await databaseNow(transaction)

    const existingAccountItems = new Map(
      (
        await transaction.cartItem.findMany({
          where: { cartId: accountCart.id },
          select: { id: true, listingId: true },
        })
      ).map((item) => [item.listingId, item]),
    )

    const moved = []
    const deduplicated = []
    const unavailable = []
    let holdsLost = 0

    for (const guestItem of guestCart.items) {
      const { listingId } = guestItem
      const existing = existingAccountItems.get(listingId)

      if (existing) {
        // One line per listing. The account's line survives, and the buyer's own
        // guest hold is transferred onto it rather than dropped — otherwise the
        // merged cart would show a line it is not holding, and another buyer could
        // take the phone.
        await lockListing(transaction, listingId)
        await releaseReservationForCartItem(transaction, guestItem.id, now)

        try {
          await acquireReservation(transaction, {
            listingId,
            cartItemId: existing.id,
            now,
          })
          deduplicated.push(listingId)
        } catch (error) {
          // Somebody else holds it now. The single line stays, marked unavailable,
          // and nothing is lost.
          unavailable.push(listingId)

          if (error instanceof ApiError && error.code === 'LISTING_RESERVED') {
            holdsLost += 1
          }
        }

        continue
      }

      await lockListing(transaction, listingId)
      await releaseExpiredReservations(transaction, listingId, now)

      const listing = await transaction.listing.findUnique({
        where: { id: listingId },
        select: { id: true, status: true, price: true, quantity: true, sellerId: true },
      })

      const isListable =
        listing && listing.status === 'APPROVED' && listing.quantity >= 1

      // The guest hold is released before the account hold is taken. Skipping this
      // would make the buyer's *own* guest reservation look like a competing
      // buyer, and the item would be carried over marked unavailable even though
      // nobody else wanted the phone.
      await releaseReservationForCartItem(transaction, guestItem.id, now)

      const created = await transaction.cartItem.create({
        data: {
          cartId: accountCart.id,
          listingId,
          // The snapshot is refreshed from the live price on merge rather than
          // carried over, because a guest snapshot may be arbitrarily old and a
          // stale snapshot would surface as a false price change.
          priceSnapshot: listing?.price ?? guestItem.priceSnapshot,
          quantity: 1,
        },
      })

      if (!isListable) {
        // Carried over so the buyer can see why it cannot be bought, rather than
        // disappearing without explanation.
        unavailable.push(listingId)
        continue
      }

      try {
        await acquireReservation(transaction, {
          listingId,
          cartItemId: created.id,
          now,
        })
        moved.push(listingId)
      } catch (error) {
        // Another buyer holds it now. The line stays in the cart marked
        // unavailable; no valid line is lost.
        unavailable.push(listingId)

        if (error instanceof ApiError && error.code === 'LISTING_RESERVED') {
          holdsLost += 1
        }
      }
    }

    // The guest cart is consumed so its cookie cannot be replayed to re-claim these
    // items against the account later.
    await transaction.cart.delete({ where: { id: guestCart.id } })

    return {
      moved: moved.length,
      deduplicated: deduplicated.length,
      unavailable: unavailable.length,
      holdsLost,
    }
  })
}


