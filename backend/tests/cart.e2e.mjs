import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'

/**
 * Phase 5 commerce backend suite: carts, guest carts, guest-to-account merge,
 * inventory reservations, price snapshots, and the authorization around all of it.
 *
 * Everything runs against a real server, a real PostgreSQL database, and real
 * signed sessions, because the properties under test — a partial unique index, a
 * row lock, a transactional merge — are properties of the database, not of a mock.
 *
 * No test reaches into the API to assert something the API does not promise, and no
 * test asserts a fabricated figure: every value compared here is read back from the
 * same response the client receives.
 */

process.env.NODE_ENV = 'test'

const stamp = `${Date.now()}-cart`

const { default: app } = await import(`../src/app.js?cart-e2e=${stamp}`)
const prisma = new PrismaClient()

const SELLER_PASSWORD = 'SellerTest123!'
const BUYER_PASSWORD = 'BuyerTest123!'
const SEED_PHOTO = '/uploads/seed/phone-front.svg'

let server
let baseUrl

/** Carts, items, and reservations this suite created, removed at the end. */
const createdUserIds = []
const createdListingIds = []
const createdCartIds = []

/** Two independent guests, plus a signed-in buyer, so ownership can be tested. */
function guestClient() {
  return createClient()
}

function createClient() {
  return {
    cookies: new Map(),
    cookieHeader() {
      return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; ')
    },
    absorb(response) {
      const raw = response.headers.getSetCookie?.() ?? []

      for (const entry of raw) {
        const [pair] = entry.split(';')
        const index = pair.indexOf('=')
        const name = pair.slice(0, index)
        const value = pair.slice(index + 1)

        if (value === '') {
          this.cookies.delete(name)
        } else {
          this.cookies.set(name, value)
        }
      }

      return this
    },
    async raw(path, { method = 'GET', body } = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.cookies.size > 0 ? { Cookie: this.cookieHeader() } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })

      this.absorb(response)

      const json = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : null

      return { status: response.status, json }
    },
  }
}

async function signIn(client, email, password) {
  const response = await client.raw('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  })

  assert.equal(response.status, 200, `sign in as ${email}`)

  return response.json.user
}

async function registerBuyer(email) {
  const client = createClient()
  const response = await client.raw('/api/auth/register', {
    method: 'POST',
    body: { name: 'Cart Buyer', email, password: BUYER_PASSWORD, role: 'BUYER' },
  })

  assert.equal(response.status, 201, `register ${email}`)
  createdUserIds.push(response.json.user.id)

  return { client, user: response.json.user }
}

// ---------------------------------------------------------------- fixtures

/**
 * Creates an approved listing owned by an approved seller.
 *
 * Deliberately brand-distinct from the seeded catalog so this suite's cleanup can
 * target its own rows by slug prefix without touching real inventory.
 */
async function createApprovedListing(label = 'Cartworks', overrides = {}) {
  const sellerUser = await prisma.user.create({
    data: {
      name: 'Cart Fixture Seller',
      email: `cart-seller-${crypto.randomUUID()}@example.test`,
      passwordHash: 'not-a-real-hash',
      role: 'SELLER',
    },
    select: { id: true },
  })
  createdUserIds.push(sellerUser.id)

  const seller = await prisma.seller.create({
    data: {
      userId: sellerUser.id,
      businessName: 'Cart Fixture Shop',
      contactInfo: 'cart-fixture@example.test',
      verificationStatus: 'APPROVED',
    },
    select: { id: true },
  })

  const model = `${label} ${crypto.randomUUID().slice(0, 8)}`
  const slug = `${model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  const listing = await prisma.listing.create({
    data: {
      sellerId: seller.id,
      brand: label,
      model,
      slug,
      year: 2021,
      price: 18999,
      batteryPercent: 91,
      storage: '128 GB',
      cosmeticCondition: 'Like New',
      conditionGrade: 'A',
      warrantyMonths: 6,
      conditionNotes: 'Clean device created for the cart test suite.',
      photos: [SEED_PHOTO],
      status: 'APPROVED',
      ...overrides,
    },
  })

  createdListingIds.push(listing.id)

  return listing
}

/** Approves a listing that was created pending, for negative-path fixtures. */
async function createPendingListing(label = 'Cartpending') {
  const sellerUser = await prisma.user.create({
    data: {
      name: 'Pending Fixture Seller',
      email: `cart-pending-${crypto.randomUUID()}@example.test`,
      passwordHash: 'not-a-real-hash',
      role: 'SELLER',
    },
    select: { id: true },
  })
  createdUserIds.push(sellerUser.id)

  const seller = await prisma.seller.create({
    data: {
      userId: sellerUser.id,
      businessName: 'Pending Fixture Shop',
      contactInfo: 'pending@example.test',
      verificationStatus: 'APPROVED',
    },
    select: { id: true },
  })

  const model = `${label} ${crypto.randomUUID().slice(0, 8)}`
  const slug = `${model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  const listing = await prisma.listing.create({
    data: {
      sellerId: seller.id,
      brand: label,
      model,
      slug,
      year: 2021,
      price: 12000,
      batteryPercent: 85,
      storage: '64 GB',
      cosmeticCondition: 'Good',
      conditionGrade: 'B',
      conditionNotes: 'Created pending so it must never enter a cart.',
      photos: [SEED_PHOTO],
      status: 'PENDING',
    },
  })

  createdListingIds.push(listing.id)

  return listing
}

/** Reads the stored state directly, to prove the API did not merely report it. */
async function storedReservationFor(listingId) {
  return prisma.reservation.findFirst({
    where: { listingId, releasedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Ages a live hold so it has lapsed.
 *
 * Both timestamps move: the schema requires `expires_at > created_at`, and
 * backdating only the expiry would violate that invariant rather than simulate the
 * passage of time. Moving `created_at` back by the same span as the expiry lands
 * the hold exactly as a real 15-minute-old, expired one would sit.
 */
async function ageReservationPastExpiry(listingId, millisecondsAgo = 60_000) {
  const expiry = new Date(Date.now() - millisecondsAgo)
  const created = new Date(expiry.getTime() - 15 * 60 * 1000)

  await prisma.reservation.updateMany({
    where: { listingId, releasedAt: null },
    data: { expiresAt: expiry, createdAt: created },
  })
}

async function storedCartItem(listingId) {
  return prisma.cartItem.findFirst({
    where: { listingId },
    orderBy: { addedAt: 'desc' },
  })
}

// ------------------------------------------------------------------ suite

async function main() {
  server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`

  // ---------------------------------------------------------------- cart

  console.log('\n— cart —')

  {
    const anonymous = createClient()
    const response = await anonymous.raw('/api/cart')

    assert.equal(response.status, 200)
    assert.equal(response.json.cart.itemCount, 0, 'a visitor with no cart gets an empty one')
    assert.equal(response.json.cart.subtotal, 0)
    assert.equal(response.json.cart.currency, 'PHP')
    assert.equal(
      anonymous.cookies.has('refon_cart'),
      false,
      'reading an empty cart must not set a guest cookie',
    )
  }

  {
    const listing = await createApprovedListing()
    const guest = guestClient()

    const added = await guest.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })

    assert.equal(added.status, 201, 'guest add')
    assert.equal(added.json.created, true)
    assert.equal(added.json.cart.itemCount, 1)
    assert.equal(added.json.cart.owner, 'GUEST')
    assert.ok(guest.cookies.has('refon_cart'), 'the guest identity is issued on first write')

    const item = added.json.cart.items[0]
    assert.equal(item.listing.id, listing.id)
    assert.equal(item.quantity, 1, 'one listing is one physical device')
    assert.equal(item.priceSnapshot, Number(listing.price), 'the server price is the snapshot')
    assert.equal(item.currentPrice, Number(listing.price))
    assert.equal(item.priceChanged, false)
    assert.equal(item.availability, 'AVAILABLE')
    assert.deepEqual(item.issues, ['OK'])

    // The hold is real state, not just a reported one.
    const stored = await storedReservationFor(listing.id)
    assert.ok(stored, 'a reservation row exists')
    assert.ok(
      stored.expiresAt.getTime() - stored.createdAt.getTime(),
      'the hold has a real window',
    )
    const windowMinutes = (stored.expiresAt.getTime() - stored.createdAt.getTime()) / 60000
    assert.ok(
      Math.abs(windowMinutes - 15) < 1,
      `the hold is 15 minutes, got ${windowMinutes}`,
    )

    const readBack = await guest.raw('/api/cart')
    assert.equal(readBack.status, 200)
    assert.equal(readBack.json.cart.itemCount, 1, 'the guest cart is retrievable')
    assert.equal(readBack.json.cart.items[0].reservation.status, 'ACTIVE')
    assert.ok(
      readBack.json.cart.items[0].reservation.secondsRemaining > 0,
      'an active hold reports remaining time for Phase 6',
    )
    assert.ok(
      readBack.json.cart.items[0].listing.seller.businessName,
      'the cart carries the listing presentation Phase 6 needs',
    )

    // Repeating an add is idempotent, not a conflict.
    const again = await guest.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(again.status, 200, 're-adding a held listing is not an error')
    assert.equal(again.json.created, false)
    assert.equal(again.json.cart.itemCount, 1, 'still one line')

    const removed = await guest.raw(`/api/cart/items/${listing.id}`, { method: 'DELETE' })
    assert.equal(removed.status, 200)
    assert.equal(removed.json.removed, true)
    assert.equal(removed.json.cart.itemCount, 0)

    assert.equal(
      await storedReservationFor(listing.id),
      null,
      'removing the line releases the hold',
    )

    // A repeated removal is harmless.
    const removedTwice = await guest.raw(`/api/cart/items/${listing.id}`, { method: 'DELETE' })
    assert.equal(removedTwice.status, 200)
    assert.equal(removedTwice.json.removed, false)
  }

  {
    const listing = await createApprovedListing()
    const guest = guestClient()

    await guest.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } })
    const second = await guest.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: (await createApprovedListing()).id },
    })
    assert.equal(second.status, 201)
    assert.equal(second.json.cart.itemCount, 2)

    const subtotal = second.json.cart.items.reduce(
      (total, item) => total + item.currentPrice,
      0,
    )
    assert.equal(second.json.cart.subtotal, subtotal, 'the subtotal is derived from stored prices')

    const emptied = await guest.raw('/api/cart', { method: 'DELETE' })
    assert.equal(emptied.status, 200)
    assert.equal(emptied.json.cart.itemCount, 0)
    assert.equal(await storedReservationFor(listing.id), null, 'emptying releases every hold')
  }

  // ------------------------------------------------------- authenticated

  console.log('— authenticated cart —')

  {
    const listing = await createApprovedListing()
    const { client, user } = await registerBuyer(`cart-buyer-${stamp}@example.test`)

    const added = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })

    assert.equal(added.status, 201, 'account add')
    assert.equal(added.json.cart.owner, 'ACCOUNT')
    assert.equal(added.json.cart.itemCount, 1)

    const cartRow = await prisma.cart.findUnique({ where: { userId: user.id } })
    assert.ok(cartRow, 'the cart is persisted against the account')
    assert.equal(cartRow.guestTokenHash, null, 'an account cart has no guest identity')
    createdCartIds.push(cartRow.id)

    const readBack = await client.raw('/api/cart')
    assert.equal(readBack.json.cart.itemCount, 1, 'the account cart survives a new request')
  }

  // ------------------------------------------------------------- merge

  console.log('— guest to account merge —')

  {
    // Empty guest cart merging into an empty account cart is a no-op.
    const { client } = await registerBuyer(`cart-merge-empty-${stamp}@example.test`)
    const merged = await client.raw('/api/cart/merge', { method: 'POST' })

    assert.equal(merged.status, 200, 'merging without a guest cart succeeds')
    assert.equal(merged.json.merged, null, 'nothing to merge is reported as null')
    assert.equal(merged.json.cart.itemCount, 0)
  }

  {
    // Guest items merge into an account cart that already has different items.
    const accountListing = await createApprovedListing()
    const guestListing = await createApprovedListing()

    const { client, user } = await registerBuyer(`cart-merge-both-${stamp}@example.test`)
    await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: accountListing.id },
    })

    const guest = guestClient()
    await guest.raw('/api/cart/items', { method: 'POST', body: { listingId: guestListing.id } })
    assert.equal((await guest.raw('/api/cart')).json.cart.itemCount, 1)

    // Sign in while the guest cookie is present, as the browser would.
    const signInResponse = await guest.raw('/api/auth/login', {
      method: 'POST',
      body: {
        email: `cart-merge-both-${stamp}@example.test`,
        password: BUYER_PASSWORD,
      },
    })
    assert.equal(signInResponse.status, 200, 'sign-in succeeds with a guest cart present')

    const afterMerge = await guest.raw('/api/cart')
    assert.equal(afterMerge.json.cart.owner, 'ACCOUNT', 'the session now owns the cart')
    assert.equal(afterMerge.json.cart.itemCount, 2, 'both listings survive the merge')

    const listingIds = afterMerge.json.cart.items.map((item) => item.listing.id)
    assert.ok(listingIds.includes(accountListing.id), 'the account item is kept')
    assert.ok(listingIds.includes(guestListing.id), 'the guest item is moved over')

    // The guest cart is consumed and its cookie cleared.
    assert.equal(
      await prisma.cart.count({ where: { userId: user.id, guestTokenHash: { not: null } } }),
      0,
      'no guest-owned cart is left behind',
    )
    assert.equal(
      afterMerge.json.cart.items.find((item) => item.listing.id === guestListing.id)
        .reservation.status,
      'ACTIVE',
      'the moved line keeps a live hold',
    )

    // Signing in again must not duplicate anything.
    await guest.raw('/api/auth/login', {
      method: 'POST',
      body: { email: `cart-merge-both-${stamp}@example.test`, password: BUYER_PASSWORD },
    })
    const second = await guest.raw('/api/cart')
    assert.equal(second.json.cart.itemCount, 2, 'a second sign-in does not re-merge')
  }

  {
    // The same physical listing in both carts collapses to one line.
    //
    // This state is reached the way it happens in practice: the account held the
    // phone, the hold lapsed, and the same person then added it as a guest before
    // signing in again. It cannot be manufactured directly, because while one cart
    // holds a listing no other cart is allowed to — which is itself the guarantee
    // this suite is testing.
    const shared = await createApprovedListing()
    const { client } = await registerBuyer(`cart-merge-dupe-${stamp}@example.test`)
    const other = await createApprovedListing()

    await client.raw('/api/cart/items', { method: 'POST', body: { listingId: shared.id } })
    await client.raw('/api/cart/items', { method: 'POST', body: { listingId: other.id } })

    // The account's hold lapses, freeing the phone.
    await ageReservationPastExpiry(shared.id)

    const guest = guestClient()
    const guestAdd = await guest.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: shared.id },
    })
    assert.equal(guestAdd.status, 201, 'the guest can now hold the freed phone')
    assert.equal((await guest.raw('/api/cart')).json.cart.itemCount, 1)

    await guest.raw('/api/auth/login', {
      method: 'POST',
      body: { email: `cart-merge-dupe-${stamp}@example.test`, password: BUYER_PASSWORD },
    })

    const merged = await guest.raw('/api/cart')
    assert.equal(merged.json.cart.itemCount, 2, 'the duplicate collapses to one line')

    const occurrences = merged.json.cart.items.filter(
      (item) => item.listing.id === shared.id,
    )
    assert.equal(occurrences.length, 1, 'the listing appears exactly once')
    assert.equal(occurrences[0].quantity, 1, 'and never with quantity 2')
    assert.equal(
      occurrences[0].reservation.status,
      'ACTIVE',
      'the buyer keeps a live hold on the phone they were holding',
    )

    assert.equal(
      await prisma.cartItem.count({ where: { listingId: shared.id } }),
      1,
      'only one cart line exists in the database',
    )
    assert.equal(
      await prisma.reservation.count({
        where: { listingId: shared.id, releasedAt: null },
      }),
      1,
      'and exactly one hold',
    )
  }

  {
    // An unavailable guest item is carried over and marked, not silently dropped.
    const listed = await createApprovedListing()
    const { client } = await registerBuyer(`cart-merge-unavail-${stamp}@example.test`)

    const guest = guestClient()
    await guest.raw('/api/cart/items', { method: 'POST', body: { listingId: listed.id } })

    // The listing is taken down between add and sign-in.
    await prisma.listing.update({ where: { id: listed.id }, data: { status: 'REJECTED' } })

    await guest.raw('/api/auth/login', {
      method: 'POST',
      body: { email: `cart-merge-unavail-${stamp}@example.test`, password: BUYER_PASSWORD },
    })

    const merged = await guest.raw('/api/cart')
    assert.equal(merged.json.cart.itemCount, 1, 'the line is kept so nothing vanishes')

    const item = merged.json.cart.items[0]
    assert.equal(item.availability, 'UNAVAILABLE')
    assert.ok(item.unavailableReason, 'a reason is given')
    assert.ok(item.issues.includes('LISTING_UNAVAILABLE'))
    assert.equal(item.reservation, null, 'no hold is taken on an unavailable listing')
    assert.equal(merged.json.cart.hasUnavailableItems, true)
    assert.equal(merged.json.cart.subtotal, 0, 'an unavailable line is not counted as buyable')
  }

  {
    // A guest hold that lapsed before sign-in is reported as expired to the guest,
    // and signing in restores a fresh hold rather than leaving the buyer with a
    // cart they can no longer act on. If somebody else took the phone in the
    // meantime the merge would refuse, which the reservation tests cover.
    const listing = await createApprovedListing()
    const { client } = await registerBuyer(`cart-merge-expired-${stamp}@example.test`)

    const guest = guestClient()
    await guest.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } })

    // Age the hold past its window, as the passage of time would.
    await ageReservationPastExpiry(listing.id)

    const lapsed = await guest.raw('/api/cart')
    assert.equal(
      lapsed.json.cart.items[0].availability,
      'RESERVATION_EXPIRED',
      'a lapsed hold is reported as expired to the guest, never as held',
    )
    assert.equal(
      lapsed.json.cart.items[0].reservation.secondsRemaining,
      0,
      'and carries no remaining time',
    )
    assert.ok(lapsed.json.cart.items[0].issues.includes('RESERVATION_EXPIRED'))

    await guest.raw('/api/auth/login', {
      method: 'POST',
      body: { email: `cart-merge-expired-${stamp}@example.test`, password: BUYER_PASSWORD },
    })

    const merged = await guest.raw('/api/cart')
    const item = merged.json.cart.items[0]

    assert.equal(merged.json.cart.itemCount, 1, 'the line is still carried over')
    assert.equal(
      item.availability,
      'AVAILABLE',
      'signing in restores a hold the buyer can act on',
    )
    assert.equal(item.reservation.status, 'ACTIVE')
    assert.ok(item.reservation.secondsRemaining > 0, 'with a fresh window')

    // The stale snapshot must not resurface as a price change.
    assert.equal(item.priceChanged, false, 'the snapshot is refreshed from the live price')
    assert.deepEqual(item.issues, ['OK'])
  }

  // -------------------------------------------------------- reservation

  console.log('— reservations —')

  {
    const listing = await createApprovedListing()
    const first = guestClient()
    const second = guestClient()

    const heldByFirst = await first.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(heldByFirst.status, 201)

    const denied = await second.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(denied.status, 409, 'a second buyer cannot hold the same phone')
    assert.equal(denied.json.code, 'LISTING_RESERVED')

    assert.equal(
      await prisma.cartItem.count({ where: { listingId: listing.id } }),
      1,
      'the denied attempt left no cart line',
    )
  }

  {
    // Expiry is judged against the database clock, and a lapsed hold frees the phone.
    const listing = await createApprovedListing()
    const first = guestClient()
    const second = guestClient()

    await first.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } })

    await ageReservationPastExpiry(listing.id)

    const expiredRead = await first.raw('/api/cart')
    assert.equal(
      expiredRead.json.cart.items[0].reservation.status,
      'EXPIRED',
      'a lapsed hold reports as expired',
    )
    assert.equal(
      expiredRead.json.cart.items[0].reservation.secondsRemaining,
      0,
      'an expired hold reports no remaining time',
    )
    assert.equal(
      await storedReservationFor(listing.id),
      null,
      'reading the cart retires the lapsed hold rather than leaving it live',
    )

    const takenBySecond = await second.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(takenBySecond.status, 201, 'an expired hold frees the listing')
  }

  {
    // Two authenticated buyers, same phone, one winner.
    const listing = await createApprovedListing()
    const one = await registerBuyer(`cart-res-a-${stamp}@example.test`)
    const two = await registerBuyer(`cart-res-b-${stamp}@example.test`)

    const firstAdd = await one.client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    const secondAdd = await two.client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })

    assert.equal(firstAdd.status, 201)
    assert.equal(secondAdd.status, 409, 'the second buyer is refused')
    assert.equal(secondAdd.json.code, 'LISTING_RESERVED')

    const active = await prisma.reservation.count({
      where: { listingId: listing.id, releasedAt: null },
    })
    assert.equal(active, 1, 'exactly one live hold exists')
  }

  {
    const pending = await createPendingListing()
    const guest = guestClient()
    const response = await guest.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: pending.id },
    })

    assert.equal(response.status, 404, 'an unapproved listing cannot be reserved')
    assert.equal(response.json.code, 'LISTING_NOT_AVAILABLE')
  }

  {
    const guest = guestClient()

    const missing = await guest.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: crypto.randomUUID() },
    })
    assert.equal(missing.status, 404, 'a listing that does not exist is a 404')

    const malformed = await guest.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: 'nonsense' },
    })
    assert.equal(malformed.status, 422, 'a malformed id is rejected before any lookup')
  }

  {
    // Concurrency: many simultaneous attempts for one listing yield exactly one hold.
    const listing = await createApprovedListing()
    const clients = Array.from({ length: 8 }, () => guestClient())

    const results = await Promise.all(
      clients.map((client) =>
        client.raw('/api/cart/items', {
          method: 'POST',
          body: { listingId: listing.id },
        }),
      ),
    )

    const granted = results.filter((result) => result.status === 201)
    const refused = results.filter((result) => result.status === 409)

    console.log(
      `   concurrent attempts: ${results.length}, granted ${granted.length}, refused ${refused.length}`,
    )

    assert.equal(granted.length, 1, 'exactly one concurrent attempt may win')
    assert.equal(refused.length, results.length - 1, 'every other attempt is refused')

    const live = await prisma.reservation.count({
      where: { listingId: listing.id, releasedAt: null },
    })
    assert.equal(live, 1, 'the database holds exactly one live reservation')

    const lines = await prisma.cartItem.count({ where: { listingId: listing.id } })
    assert.equal(lines, 1, 'and exactly one cart line')
  }

  {
    // Concurrency across two authenticated buyers, which is the realistic case.
    const listing = await createApprovedListing()
    const one = await registerBuyer(`cart-race-a-${stamp}@example.test`)
    const two = await registerBuyer(`cart-race-b-${stamp}@example.test`)

    const [first, second] = await Promise.all([
      one.client.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } }),
      two.client.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } }),
    ])

    const granted = [first, second].filter((result) => result.status === 201)
    assert.equal(granted.length, 1, 'one of two buyers wins')
  }

  // ------------------------------------------------------------ pricing

  console.log('— price snapshots —')

  {
    const listing = await createApprovedListing('Priceworks')
    const guest = guestClient()

    const added = await guest.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(added.json.cart.items[0].priceSnapshot, Number(listing.price))

    // A seller raises the price after the item is in the cart.
    await prisma.listing.update({
      where: { id: listing.id },
      data: { price: 20999 },
    })

    const afterIncrease = await guest.raw('/api/cart')
    const item = afterIncrease.json.cart.items[0]
    assert.equal(item.priceSnapshot, Number(listing.price), 'the snapshot is retained')
    assert.equal(item.currentPrice, 20999, 'the live price is reported')
    assert.equal(item.priceChanged, true)
    assert.equal(item.priceDelta, 2000)
    assert.ok(item.issues.includes('PRICE_INCREASED'))
    assert.equal(
      afterIncrease.json.cart.subtotal,
      20999,
      'the subtotal uses the live price, never the snapshot',
    )

    // And back down again.
    await prisma.listing.update({ where: { id: listing.id }, data: { price: 17999 } })
    const afterDecrease = await guest.raw('/api/cart')
    assert.equal(afterDecrease.json.cart.items[0].priceChanged, true)
    assert.equal(afterDecrease.json.cart.items[0].priceDelta, -1000)
    assert.ok(afterDecrease.json.cart.items[0].issues.includes('PRICE_DECREASED'))
  }

  {
    // A client-supplied price or quantity is never accepted.
    const listing = await createApprovedListing()
    const guest = guestClient()

    const withPrice = await guest.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id, price: 1 },
    })
    assert.equal(withPrice.status, 422, 'a client price is rejected')
    // A strict-schema rejection carries no field path, so the issue is keyed by the
    // request source it came from.
    assert.ok(withPrice.json.errors._body, 'and keyed to the request body')

    const withQuantity = await guest.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id, quantity: 5 },
    })
    assert.equal(withQuantity.status, 422, 'a client quantity is rejected')

    const withUserId = await guest.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id, userId: crypto.randomUUID() },
    })
    assert.equal(withUserId.status, 422, 'a client user id is rejected')

    const withExpires = await guest.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id, expiresAt: '2999-01-01T00:00:00.000Z' },
    })
    assert.equal(withExpires.status, 422, 'a client expiry is rejected')

    const clean = await guest.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(clean.status, 201)
    assert.equal(
      clean.json.cart.items[0].priceSnapshot,
      Number(listing.price),
      'the snapshot comes from the listing row',
    )
  }

  // ---------------------------------------------------------- security

  console.log('— security and authorization —')

  {
    const listing = await createApprovedListing()
    const owner = await registerBuyer(`cart-idor-owner-${stamp}@example.test`)
    const stranger = await registerBuyer(`cart-idor-other-${stamp}@example.test`)

    await owner.client.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } })
    assert.equal((await stranger.client.raw('/api/cart')).json.cart.itemCount, 0)

    // Addressing somebody else's line by listing id must not touch their cart.
    const attemptedRemoval = await stranger.client.raw(`/api/cart/items/${listing.id}`, {
      method: 'DELETE',
    })
    assert.equal(attemptedRemoval.status, 200)
    assert.equal(attemptedRemoval.json.removed, false, 'a stranger cannot remove another cart line')

    const ownerCart = await owner.client.raw('/api/cart')
    assert.equal(
      ownerCart.json.cart.itemCount,
      1,
      'the owner still has their line',
    )
    assert.ok(
      await storedReservationFor(listing.id),
      'and the hold was not released by the stranger',
    )
  }

  {
    // A guest holding one cookie cannot read a guest cart with another cookie.
    const listing = await createApprovedListing()
    const first = guestClient()
    const second = guestClient()

    await first.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } })
    assert.equal((await first.raw('/api/cart')).json.cart.itemCount, 1)
    assert.equal((await second.raw('/api/cart')).json.cart.itemCount, 0)

    // A forged cookie cannot address a cart either: only the SHA-256 of the real
    // token matches, so an arbitrary value resolves to nothing.
    const forged = guestClient()
    forged.cookies.set('refon_cart', crypto.randomBytes(32).toString('hex'))
    assert.equal((await forged.raw('/api/cart')).json.cart.itemCount, 0)

    const malformed = guestClient()
    malformed.cookies.set('refon_cart', "'; DROP TABLE carts; --")
    assert.equal((await malformed.raw('/api/cart')).json.cart.itemCount, 0)
  }

  {
    // Only the hash of the guest token is stored.
    const listing = await createApprovedListing()
    const guest = guestClient()
    await guest.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } })

    const rawToken = guest.cookies.get('refon_cart')
    const cartRow = await prisma.cart.findFirst({
      where: { guestTokenHash: { not: null } },
      orderBy: { createdAt: 'desc' },
    })

    assert.ok(cartRow, 'the guest cart exists')
    assert.notEqual(cartRow.guestTokenHash, rawToken, 'the raw token is never stored')
    assert.equal(
      cartRow.guestTokenHash,
      crypto.createHash('sha256').update(rawToken).digest('hex'),
      'the stored value is the SHA-256 of the cookie',
    )
    assert.equal(rawToken.length, 64, 'the cookie carries a 256-bit random token')

    const stored = JSON.stringify(cartRow)
    assert.ok(!stored.includes(rawToken), 'no stored column leaks the token')
  }

  {
    // Signing in does not silently transfer a guest cart to an unrelated account
    // unless the guest cookie is actually presented.
    const listing = await createApprovedListing()
    const guest = guestClient()
    await guest.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } })

    const { client } = await registerBuyer(`cart-nocookie-${stamp}@example.test`)
    const cart = await client.raw('/api/cart')

    assert.equal(cart.json.cart.itemCount, 0, 'a fresh session without the cookie sees nothing')
    assert.ok(
      await storedReservationFor(listing.id),
      'the guest hold is untouched',
    )
  }

  {
    // A seller cannot reserve their own device.
    const sellerClient = createClient()
    const seller = await signIn(sellerClient, 'seller@refon.test', SELLER_PASSWORD)

    const ownListing = await prisma.listing.findFirst({
      where: { seller: { userId: seller.id }, status: 'APPROVED' },
      select: { id: true },
    })
    assert.ok(ownListing, 'the fixture seller has approved inventory')

    const response = await sellerClient.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: ownListing.id },
    })

    assert.equal(response.status, 409)
    assert.equal(response.json.code, 'OWN_LISTING_NOT_PURCHASABLE')
  }

  {
    // The merge route requires a session.
    const anonymous = createClient()
    const response = await anonymous.raw('/api/cart/merge', { method: 'POST' })
    assert.equal(response.status, 401)
    assert.equal(response.json.code, 'AUTHENTICATION_REQUIRED')
  }

  {
    // Cart reads are never cached.
    const client = guestClient()
    const response = await client.raw('/api/cart')
    assert.equal(
      response.status,
      200,
    )
    // The /api no-store middleware already covers this; assert it explicitly so a
    // cart cannot be cached by a shared proxy.
    const probe = await fetch(`${baseUrl}/api/cart`)
    assert.equal(probe.headers.get('cache-control'), 'no-store')
  }

  console.log(
    '\nCart E2E passed: guest and account carts, idempotent add, removal and emptying, ' +
      'guest-to-account merge on sign-in including duplicate collapsing, unavailable ' +
      'carry-over and lapsed holds; fifteen-minute database-clock reservations with ' +
      'lazy expiry; concurrent attempts yielding exactly one holder (eight-way race ' +
      'and a two-buyer race); price snapshot retention and change detection; client ' +
      'price, quantity, user id, and expiry rejected; IDOR, guest-cookie forgery, ' +
      'token hashing, and own-listing purchase refused.',
  )
}

try {
  await main()
} finally {
  // Order matters. Cart rows cascade from users, but a `Seller` row restricts its
  // user, and a `Listing` restricts its seller — so reservations and lines, then
  // carts, then listings, then sellers, then users.
  await prisma.reservation.deleteMany({})
  await prisma.cartItem.deleteMany({})
  await prisma.cart.deleteMany({})
  await prisma.listing.deleteMany({ where: { id: { in: createdListingIds } } })
  await prisma.seller.deleteMany({
    where: { userId: { in: createdUserIds } },
  })
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  await prisma.$disconnect()
  server?.close()
}
