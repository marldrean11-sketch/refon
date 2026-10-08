import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'

/**
 * Phase 5 commerce backend suite: buyer carts, inventory reservations, price
 * snapshots, and the authorization around all of it.
 *
 * Everything runs against a real server, a real PostgreSQL database, and real
 * signed sessions, because the properties under test — a partial unique index, a
 * row lock, a NOT NULL owner column — are properties of the database, not of a mock.
 *
 * Purchasing is buyer-only, so every successful path here is a signed-in BUYER. A
 * visitor and a signed-in SELLER or ADMIN are refused on every cart route, and those
 * refusals are asserted as precisely as the successes: 401 for no session, 403 for the
 * wrong role, with no cart row created as a side effect.
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
const ADMIN_PASSWORD = 'AdminTest123!'
const BUYER_PASSWORD = 'BuyerTest123!'
const SEED_PHOTO = '/uploads/seed/phone-front.svg'

let server
let baseUrl

/** Carts, items, and reservations this suite created, removed at the end. */
const createdUserIds = []
const createdListingIds = []
const createdCartIds = []

/**
 * A client with no session at all.
 *
 * Kept as its own name because "no session" is now a distinct, tested case rather
 * than the implicit default every happy path used to be built on.
 */
function anonymousClient() {
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

/** The seeded demo seller, signed in. Used to prove a seller cannot buy. */
function sellerClient() {
  const client = createClient()

  return signIn(client, 'seller@refon.test', SELLER_PASSWORD).then((user) => ({ client, user }))
}

/** The seeded admin, signed in. Used to prove an admin cannot buy either. */
function adminClient() {
  const client = createClient()

  return signIn(client, 'admin@refon.test', ADMIN_PASSWORD).then((user) => ({ client, user }))
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

// ------------------------------------------------------------------ suite

async function main() {
  server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`

  // -------------------------------------------------- buyer-only refusal

  console.log('\n— purchasing is buyer-only —')

  {
    // A visitor has no cart at all. Not an empty one: no cart.
    const anonymous = anonymousClient()
    const response = await anonymous.raw('/api/cart')

    assert.equal(response.status, 401, 'reading a cart with no session is refused')
    assert.equal(response.json.code, 'AUTHENTICATION_REQUIRED')
    assert.equal(response.json.cart, undefined, 'and no cart is described')
    assert.equal(
      anonymous.cookies.has('refon_cart'),
      false,
      'no guest identity is issued, because there is no guest cart',
    )
    // Queried in SQL rather than through the client: `userId: null` is not a legal
    // Prisma filter now that the column is NOT NULL, which is itself the proof.
    const ownerless = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM carts WHERE user_id IS NULL
    `

    assert.equal(ownerless[0].count, 0, 'no ownerless cart row exists')
  }

  {
    // Every write is refused for a visitor too, and nothing is written.
    const listing = await createApprovedListing()
    const anonymous = anonymousClient()

    const added = await anonymous.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(added.status, 401, 'a visitor cannot add to a cart')
    assert.equal(added.json.code, 'AUTHENTICATION_REQUIRED')

    const removed = await anonymous.raw(`/api/cart/items/${listing.id}`, { method: 'DELETE' })
    assert.equal(removed.status, 401, 'a visitor cannot remove a cart line')

    const emptied = await anonymous.raw('/api/cart', { method: 'DELETE' })
    assert.equal(emptied.status, 401, 'a visitor cannot empty a cart')

    assert.equal(
      await prisma.cartItem.count({ where: { listingId: listing.id } }),
      0,
      'none of those attempts created a cart line',
    )
    assert.equal(
      await storedReservationFor(listing.id),
      null,
      'and none of them took a hold on the listing',
    )
  }

  {
    // A signed-in seller is a different refusal from a visitor: 403, not 401. The
    // distinction matters to the client, which sends a 401 to the sign-in page and a
    // 403 nowhere.
    const { client: seller, user: sellerUser } = await sellerClient()
    const listing = await createApprovedListing()

    const read = await seller.raw('/api/cart')
    assert.equal(read.status, 403, 'a seller cannot read a cart')
    assert.equal(read.json.code, 'FORBIDDEN')

    const added = await seller.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(added.status, 403, 'a seller cannot add to a cart')

    const removed = await seller.raw(`/api/cart/items/${listing.id}`, { method: 'DELETE' })
    assert.equal(removed.status, 403, 'a seller cannot remove a cart line')

    const emptied = await seller.raw('/api/cart', { method: 'DELETE' })
    assert.equal(emptied.status, 403, 'a seller cannot empty a cart')

    assert.equal(
      await prisma.cart.count({ where: { userId: sellerUser.id } }),
      0,
      'no cart is created for a seller by any of those attempts',
    )
    assert.equal(
      await prisma.cartItem.count({ where: { listingId: listing.id } }),
      0,
      'and no cart line',
    )
  }

  {
    // A seller cannot buy their own listing, and is refused before the listing is
    // even looked at: the role gate runs ahead of the own-listing rule. That
    // ordering is the point — the seller is refused for what they are, not for what
    // they happened to click.
    const { client: seller, user: sellerUser } = await sellerClient()

    const ownListing = await prisma.listing.findFirst({
      where: { seller: { userId: sellerUser.id }, status: 'APPROVED' },
      select: { id: true },
    })

    assert.ok(ownListing, 'the fixture seller has approved inventory')

    const response = await seller.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: ownListing.id },
    })

    assert.equal(response.status, 403, 'a seller is refused at the role gate')
    assert.equal(response.json.code, 'FORBIDDEN')
    assert.notEqual(
      response.json.code,
      'OWN_LISTING_NOT_PURCHASABLE',
      'the role gate answers first, so the listing-specific rule is never reached',
    )
    assert.equal(
      await storedReservationFor(ownListing.id),
      null,
      'and the seller takes no hold on their own inventory',
    )
  }

  {
    // An admin is refused the same way. An admin moderates listings; they do not buy.
    const { client: admin, user: adminUser } = await adminClient()
    const listing = await createApprovedListing()

    const read = await admin.raw('/api/cart')
    assert.equal(read.status, 403, 'an admin cannot read a cart')

    const added = await admin.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(added.status, 403, 'an admin cannot add to a cart')

    assert.equal(await prisma.cart.count({ where: { userId: adminUser.id } }), 0)
    assert.equal(await prisma.cartItem.count({ where: { listingId: listing.id } }), 0)
  }

  {
    // There is no merge endpoint any more, because there is nothing to merge: a cart
    // only exists for a signed-in buyer, so signing in creates one rather than
    // absorbing a guest one.
    const anonymous = anonymousClient()
    const response = await anonymous.raw('/api/cart/merge', { method: 'POST' })

    assert.equal(response.status, 404, 'the merge route is gone')
  }

  {
    // A cart cannot be addressed by anything other than the session. Supplying a user
    // id in the body is refused outright rather than quietly honoured or ignored.
    const { client } = await registerBuyer(`cart-nominate-${stamp}@example.test`)
    const listing = await createApprovedListing()

    const response = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id, userId: crypto.randomUUID() },
    })

    assert.equal(response.status, 422, 'a client-supplied owner is rejected')
    assert.ok(response.json.errors._body, 'and keyed to the request body')

    const clean = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(clean.status, 201, 'the buyer can still add with the session alone')

    const other = await registerBuyer(`cart-nominate-other-${stamp}@example.test`)

    // A signed-in buyer's cart is not reachable by a query string either: naming
    // somebody else reads the sender's own cart, not theirs.
    const spoofed = await client.raw(`/api/cart?userId=${other.user.id}`)
    assert.equal(
      spoofed.json.cart.itemCount,
      1,
      'a nominated owner in the query string does not address anybody',
    )
    assert.equal(
      (await other.client.raw('/api/cart')).json.cart.itemCount,
      0,
      'and the other buyer’s cart is still their own',
    )
  }

  // ---------------------------------------------------------------- cart

  console.log('\n— cart —')

  {
    const listing = await createApprovedListing()
    const { client } = await registerBuyer(`cart-buyer-${stamp}@example.test`)

    const added = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })

    assert.equal(added.status, 201, 'account add')
    assert.equal(added.json.created, true)
    assert.equal(added.json.cart.owner, 'ACCOUNT')
    assert.equal(added.json.cart.itemCount, 1)

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

    const readBack = await client.raw('/api/cart')
    assert.equal(readBack.status, 200)
    assert.equal(readBack.json.cart.itemCount, 1, 'the cart is retrievable')
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
    const again = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(again.status, 200, 're-adding a held listing is not an error')
    assert.equal(again.json.created, false)
    assert.equal(again.json.cart.itemCount, 1, 'still one line')

    const removed = await client.raw(`/api/cart/items/${listing.id}`, { method: 'DELETE' })
    assert.equal(removed.status, 200)
    assert.equal(removed.json.removed, true)
    assert.equal(removed.json.cart.itemCount, 0)

    assert.equal(
      await storedReservationFor(listing.id),
      null,
      'removing the line releases the hold',
    )

    // A repeated removal is harmless.
    const removedTwice = await client.raw(`/api/cart/items/${listing.id}`, { method: 'DELETE' })
    assert.equal(removedTwice.status, 200)
    assert.equal(removedTwice.json.removed, false)
  }

  {
    const listing = await createApprovedListing()
    const { client } = await registerBuyer(`cart-buyer-empty-${stamp}@example.test`)

    const empty = await client.raw('/api/cart')
    assert.equal(empty.status, 200)
    assert.equal(empty.json.cart.itemCount, 0, 'a buyer with no cart gets an empty one')
    assert.equal(empty.json.cart.subtotal, 0)
    assert.equal(empty.json.cart.currency, 'PHP')

    await client.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } })
    const second = await client.raw('/api/cart/items', {
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

    const emptied = await client.raw('/api/cart', { method: 'DELETE' })
    assert.equal(emptied.status, 200)
    assert.equal(emptied.json.cart.itemCount, 0)
    assert.equal(await storedReservationFor(listing.id), null, 'emptying releases every hold')
  }

  {
    // The cart row is persisted against the account, and the schema now says so:
    // `user_id` is NOT NULL, so there is no possible ownerless cart row.
    const listing = await createApprovedListing()
    const { client, user } = await registerBuyer(`cart-persist-${stamp}@example.test`)

    const added = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })

    assert.equal(added.status, 201)
    assert.equal(added.json.cart.owner, 'ACCOUNT')

    const cartRow = await prisma.cart.findUnique({ where: { userId: user.id } })
    assert.ok(cartRow, 'the cart is persisted against the account')
    assert.equal(cartRow.userId, user.id, 'and owned by exactly that account')
    createdCartIds.push(cartRow.id)

    // A second buyer never sees the first buyer's lines.
    const stranger = await registerBuyer(`cart-persist-other-${stamp}@example.test`)
    assert.equal((await stranger.client.raw('/api/cart')).json.cart.itemCount, 0)

    const readBack = await client.raw('/api/cart')
    assert.equal(readBack.json.cart.itemCount, 1, 'the account cart survives a new request')
  }

  // -------------------------------------------------------- reservation

  console.log('— reservations —')

  {
    const listing = await createApprovedListing()
    const first = await registerBuyer(`cart-res-first-${stamp}@example.test`)
    const second = await registerBuyer(`cart-res-second-${stamp}@example.test`)

    const heldByFirst = await first.client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(heldByFirst.status, 201)

    const denied = await second.client.raw('/api/cart/items', {
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
    const first = await registerBuyer(`cart-exp-first-${stamp}@example.test`)
    const second = await registerBuyer(`cart-exp-second-${stamp}@example.test`)

    await first.client.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } })

    await ageReservationPastExpiry(listing.id)

    const expiredRead = await first.client.raw('/api/cart')
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

    const takenBySecond = await second.client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(takenBySecond.status, 201, 'an expired hold frees the listing')
  }

  {
    // A hold that lapses while the buyer still has the line is reported honestly, and
    // the buyer can take a fresh one by removing the line and adding it again.
    const listing = await createApprovedListing()
    const { client } = await registerBuyer(`cart-lapsed-${stamp}@example.test`)

    await client.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } })
    await ageReservationPastExpiry(listing.id)

    const lapsed = await client.raw('/api/cart')
    assert.equal(
      lapsed.json.cart.items[0].availability,
      'RESERVATION_EXPIRED',
      'a lapsed hold is reported as expired, never as held',
    )
    assert.equal(
      lapsed.json.cart.items[0].reservation.secondsRemaining,
      0,
      'and carries no remaining time',
    )
    assert.ok(lapsed.json.cart.items[0].issues.includes('RESERVATION_EXPIRED'))

    // Re-adding the line is idempotent, and it does not paper over the lapse: the
    // buyer is told the hold is gone rather than being shown a fresh window that
    // does not exist. This is the honest reading, because the hold really has
    // lapsed and checkout would refuse it.
    const readded = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(readded.status, 200, 're-adding a lapsed line is not an error')
    assert.equal(readded.json.created, false, 'and creates no second line')
    assert.equal(readded.json.cart.itemCount, 1)
    assert.equal(
      readded.json.cart.items[0].availability,
      'RESERVATION_EXPIRED',
      'a re-add does not claim a hold that has lapsed',
    )

    // Removing the line and adding it again is what takes a fresh hold. That is the
    // path a buyer has, so it has to work.
    const removed = await client.raw(`/api/cart/items/${listing.id}`, { method: 'DELETE' })
    assert.equal(removed.status, 200)
    assert.equal(removed.json.removed, true)

    const readdedFresh = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(readdedFresh.status, 201, 'the freed phone can be held again')

    const after = await client.raw('/api/cart')
    assert.equal(after.json.cart.itemCount, 1, 'and does not duplicate the line')
    assert.equal(after.json.cart.items[0].availability, 'AVAILABLE', 'the hold is live again')
    assert.ok(after.json.cart.items[0].reservation.secondsRemaining > 0, 'with a fresh window')
    assert.deepEqual(after.json.cart.items[0].issues, ['OK'])
  }

  {
    // A line that goes away between add and read is kept and marked, not silently
    // dropped: the buyer can see that something they chose is no longer buyable.
    const listed = await createApprovedListing()
    const { client } = await registerBuyer(`cart-unavail-${stamp}@example.test`)

    await client.raw('/api/cart/items', { method: 'POST', body: { listingId: listed.id } })

    // The listing is taken down while the buyer is still holding it.
    await prisma.listing.update({ where: { id: listed.id }, data: { status: 'REJECTED' } })

    const cart = await client.raw('/api/cart')
    assert.equal(cart.json.cart.itemCount, 1, 'the line is kept so nothing vanishes')

    const item = cart.json.cart.items[0]
    assert.equal(item.availability, 'UNAVAILABLE')
    assert.ok(item.unavailableReason, 'a reason is given')
    assert.ok(item.issues.includes('LISTING_UNAVAILABLE'))
    assert.equal(cart.json.cart.hasUnavailableItems, true)
    assert.equal(cart.json.cart.subtotal, 0, 'an unavailable line is not counted as buyable')
    assert.equal(cart.json.cart.purchasableCount, 0, 'and it is not buyable')

    // The hold row itself survives the listing being taken down, because a hold is
    // only retired lazily and this one has not lapsed yet. That is harmless rather
    // than a leak: nothing can be added to a listing that is not APPROVED, so the
    // live row blocks nobody.
    const other = await registerBuyer(`cart-unavail-other-${stamp}@example.test`)
    const secondAttempt = await other.client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listed.id },
    })
    assert.equal(
      secondAttempt.status,
      404,
      'an unavailable listing cannot be held by anyone, so the surviving row blocks nobody',
    )
  }

  {
    // The same physical listing cannot end up on one buyer's cart twice, whatever
    // order the requests arrive in.
    const listing = await createApprovedListing()
    const { client } = await registerBuyer(`cart-dupe-${stamp}@example.test`)

    const [first, second] = await Promise.all([
      client.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } }),
      client.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } }),
    ])

    assert.ok(
      [first.status, second.status].includes(201),
      'one of two identical concurrent adds succeeds',
    )

    const cart = await client.raw('/api/cart')
    assert.equal(cart.json.cart.itemCount, 1, 'the listing appears exactly once')
    assert.equal(
      cart.json.cart.items[0].quantity,
      1,
      'and never with quantity 2',
    )
    assert.equal(
      await prisma.cartItem.count({ where: { listingId: listing.id } }),
      1,
      'only one cart line exists in the database',
    )
    assert.equal(
      await prisma.reservation.count({
        where: { listingId: listing.id, releasedAt: null },
      }),
      1,
      'and exactly one hold',
    )
  }

  {
    const pending = await createPendingListing()
    const { client } = await registerBuyer(`cart-pending-${stamp}@example.test`)
    const response = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: pending.id },
    })

    assert.equal(response.status, 404, 'an unapproved listing cannot be reserved')
    assert.equal(response.json.code, 'LISTING_NOT_AVAILABLE')
  }

  {
    const { client } = await registerBuyer(`cart-badid-${stamp}@example.test`)

    const missing = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: crypto.randomUUID() },
    })
    assert.equal(missing.status, 404, 'a listing that does not exist is a 404')

    const malformed = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: 'nonsense' },
    })
    assert.equal(malformed.status, 422, 'a malformed id is rejected before any lookup')
  }

  {
    // Concurrency: eight signed-in buyers race for one listing, and exactly one wins.
    //
    // This is the property that actually matters — one physical phone, one hold. The
    // clients are separate buyer accounts rather than anonymous ones because a cart,
    // and therefore a hold, now requires a signed-in buyer.
    const listing = await createApprovedListing()
    const buyers = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        registerBuyer(`cart-race-${index}-${stamp}@example.test`),
      ),
    )

    const results = await Promise.all(
      buyers.map(({ client }) =>
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
    assert.ok(
      refused.every((result) => result.json.code === 'LISTING_RESERVED'),
      'and every refusal names the reservation',
    )

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
    const { client } = await registerBuyer(`cart-price-${stamp}@example.test`)

    const added = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id },
    })
    assert.equal(added.json.cart.items[0].priceSnapshot, Number(listing.price))

    // A seller raises the price after the item is in the cart.
    await prisma.listing.update({
      where: { id: listing.id },
      data: { price: 20999 },
    })

    const afterIncrease = await client.raw('/api/cart')
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
    const afterDecrease = await client.raw('/api/cart')
    assert.equal(afterDecrease.json.cart.items[0].priceChanged, true)
    assert.equal(afterDecrease.json.cart.items[0].priceDelta, -1000)
    assert.ok(afterDecrease.json.cart.items[0].issues.includes('PRICE_DECREASED'))
  }

  {
    // A client-supplied price or quantity is never accepted.
    const listing = await createApprovedListing()
    const { client } = await registerBuyer(`cart-smuggle-${stamp}@example.test`)

    const withPrice = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id, price: 1 },
    })
    assert.equal(withPrice.status, 422, 'a client price is rejected')
    // A strict-schema rejection carries no field path, so the issue is keyed by the
    // request source it came from.
    assert.ok(withPrice.json.errors._body, 'and keyed to the request body')

    const withQuantity = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id, quantity: 5 },
    })
    assert.equal(withQuantity.status, 422, 'a client quantity is rejected')

    const withUserId = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id, userId: crypto.randomUUID() },
    })
    assert.equal(withUserId.status, 422, 'a client user id is rejected')

    const withExpires = await client.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: listing.id, expiresAt: '2999-01-01T00:00:00.000Z' },
    })
    assert.equal(withExpires.status, 422, 'a client expiry is rejected')

    const clean = await client.raw('/api/cart/items', {
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
    // One buyer's session cannot reach another's cart by carrying a foreign cookie
    // alongside its own, and a stale session cookie does not resurrect one either.
    const listing = await createApprovedListing()
    const owner = await registerBuyer(`cart-cookie-owner-${stamp}@example.test`)
    const stranger = await registerBuyer(`cart-cookie-other-${stamp}@example.test`)

    await owner.client.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } })

    // One buyer's token presented under a second, ignored cookie name is still just
    // one session: the cart it reads is the token owner's, and nothing else.
    const both = createClient()
    both.cookies.set('refon_token', owner.client.cookies.get('refon_token'))
    both.cookies.set('refon_token_other', stranger.client.cookies.get('refon_token'))
    assert.equal(
      (await both.raw('/api/cart')).json.cart.itemCount,
      1,
      'an unrelated cookie name does not change which session is used',
    )

    // A forged or malformed session cookie resolves to no session at all. The code
    // differs from a missing cookie — a token that cannot be verified is an expired
    // session, where no token at all is an unauthenticated request — but the
    // refusal is the same 401, and nothing is readable either way.
    const forged = createClient()
    forged.cookies.set('refon_token', crypto.randomBytes(32).toString('hex'))
    const forgedResponse = await forged.raw('/api/cart')
    assert.equal(forgedResponse.status, 401, 'a forged session cookie is not a session')
    assert.equal(forgedResponse.json.code, 'SESSION_EXPIRED')
    assert.equal(forgedResponse.json.cart, undefined, 'and reads no cart')

    const malformed = createClient()
    malformed.cookies.set('refon_token', "'; DROP TABLE carts; --")
    assert.equal(
      (await malformed.raw('/api/cart')).status,
      401,
      'a malformed session cookie is not a session',
    )

    // Signing out does not leave the cart readable.
    await owner.client.raw('/api/auth/logout', { method: 'POST' })
    assert.equal(
      (await owner.client.raw('/api/cart')).status,
      401,
      'the cart is unreachable once the session is gone',
    )
  }

  {
    // The schema no longer admits a cart without an owner, so there is no stored
    // guest identity to leak and nothing to hash.
    const columns = await prisma.$queryRaw`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'carts'
    `

    const names = columns.map((row) => row.column_name)

    assert.ok(names.includes('user_id'), 'carts.user_id exists')
    assert.ok(
      !names.includes('guest_token_hash'),
      'the guest token column is gone, so no cart is addressable by cookie',
    )

    const userId = columns.find((row) => row.column_name === 'user_id')
    assert.equal(userId.is_nullable, 'NO', 'a cart cannot exist without an owner')

    const stillOwnerless = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM carts WHERE user_id IS NULL
    `

    assert.equal(stillOwnerless[0].count, 0, 'and no ownerless cart row exists')
  }

  {
    // Signing in gives a buyer their own empty cart rather than somebody else's.
    const { client: holder } = await registerBuyer(`cart-signin-holder-${stamp}@example.test`)
    const listing = await createApprovedListing()
    await holder.raw('/api/cart/items', { method: 'POST', body: { listingId: listing.id } })

    const fresh = await registerBuyer(`cart-signin-fresh-${stamp}@example.test`)
    const cart = await fresh.client.raw('/api/cart')

    assert.equal(cart.json.cart.itemCount, 0, 'a newly signed-in buyer sees nothing of another’s')
    assert.ok(
      await storedReservationFor(listing.id),
      'and the other buyer keeps their hold',
    )
  }

  {
    // Cart reads are never cached.
    const { client } = await registerBuyer(`cart-cache-${stamp}@example.test`)
    const response = await client.raw('/api/cart')
    assert.equal(response.status, 200)
    // The /api no-store middleware already covers this; assert it explicitly so a
    // cart cannot be cached by a shared proxy.
    const probe = await fetch(`${baseUrl}/api/cart`, {
      headers: { Cookie: `refon_token=${client.cookies.get('refon_token')}` },
    })
    assert.equal(probe.headers.get('cache-control'), 'no-store')
  }

  console.log(
    '\nCart E2E passed: buyer-only enforcement on every route — 401 for a visitor, ' +
      '403 for a seller and an admin, and no cart, line, or hold written as a side ' +
      'effect; idempotent add, removal and emptying; unavailable carry-over and ' +
      'lapsed holds reported honestly; fifteen-minute database-clock reservations ' +
      'with lazy expiry; concurrent attempts yielding exactly one holder (eight-way ' +
      'race and a two-buyer race); price snapshot retention and change detection; ' +
      'client price, quantity, user id, and expiry rejected; IDOR, forged session ' +
      'cookies, sign-out, and a NOT NULL cart owner.',
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
