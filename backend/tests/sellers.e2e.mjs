import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'

process.env.NODE_ENV = 'test'

const stamp = `${Date.now()}-sellers`

const { default: app } = await import(`../src/app.js?sellers-e2e=${stamp}`)
const prisma = new PrismaClient()

/** Seeded Circuit Foundry. Exercises the storefront against real seed data. */
const SEEDED_SELLER_ID = '30000000-0000-4000-8000-000000000002'

let server
let baseUrl

const createdUserIds = []
const createdSellerIds = []
const createdListingIds = []
const createdReviewIds = []

function api(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...options.headers },
  })
}

async function json(path, options) {
  const response = await api(path, options)
  const body = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : null
  return { status: response.status, body }
}

/**
 * Fixture brand and model are deliberately unlike any real catalog entry.
 *
 * The suite creates real rows and cleans them up by fixture slug prefix, so
 * naming the fixture after a real phone would make that cleanup delete seeded
 * data instead. Same rule as `catalog.e2e.mjs`.
 */
const FIXTURE_BRAND = 'Storefrontworks'
const FIXTURE_MODEL = 'Testshop 11'

/**
 * Keys whose presence anywhere in a response would mean a private field leaked.
 *
 * Account-level secrets and identifiers only. `moderatorFeedback` is not in this
 * list because it is part of the *listing* payload's long-standing public
 * contract - the seller dashboard reads it off its own PENDING and REJECTED rows -
 * so banning the key outright would be asserting a change to an endpoint this
 * task does not touch. Its storefront safety is asserted separately below: every
 * storefront listing is APPROVED, so the field is present and always null.
 */
const FORBIDDEN_KEYS = [
  'contactInfo',
  'email',
  'passwordHash',
  'tokenHash',
  'userId',
  'phone',
  'appliedAt',
]

/**
 * Walks a payload and returns the paths of every forbidden key it finds.
 *
 * Recursive rather than a top-level check because the risk is precisely that a
 * nested object (`listing.seller`, `review.user`) carries a field the top-level
 * assertion would never look at.
 */
function findForbiddenKeys(value, path = '$') {
  const hits = []

  if (Array.isArray(value)) {
    value.forEach((entry, index) => hits.push(...findForbiddenKeys(entry, `${path}[${index}]`)))
    return hits
  }

  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.includes(key)) {
        hits.push(`${path}.${key}`)
      }
      hits.push(...findForbiddenKeys(entry, `${path}.${key}`))
    }
  }

  return hits
}

/**
 * Creates one seller with a known, deliberate spread of listings.
 *
 * The spread is the point: an APPROVED, a PENDING, a REJECTED, and a SOLD row, at
 * four distinct prices. Only the APPROVED row may ever appear in the storefront,
 * and the sort assertions need prices that cannot be satisfied by accident.
 */
async function seedFixtureSeller() {
  const user = await prisma.user.create({
    data: {
      name: 'Storefront Fixture',
      email: `storefront-fixture-${stamp}@example.test`,
      passwordHash: '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
      role: 'SELLER',
    },
    select: { id: true },
  })
  createdUserIds.push(user.id)

  const seller = await prisma.seller.create({
    data: {
      userId: user.id,
      businessName: 'Storefront Fixture Shop',
      // Deliberately full of a phone number and an address: this is the string
      // that must never reach a public response.
      contactInfo: 'leak-canary@example.test / +63 900 000 0000',
      verificationStatus: 'APPROVED',
      city: 'Iloilo City',
      region: 'Western Visayas',
      tagline: 'Fixture shop used by the seller storefront suite.',
      ratingAverage: 4.25,
      ratingCount: 8,
    },
    select: { id: true },
  })
  createdSellerIds.push(seller.id)

  const rows = [
    { status: 'APPROVED', price: 30000, year: 2021, createdAt: new Date('2026-01-01T00:00:00Z') },
    { status: 'APPROVED', price: 12000, year: 2019, createdAt: new Date('2026-03-01T00:00:00Z') },
    { status: 'APPROVED', price: 21000, year: 2020, createdAt: new Date('2026-02-01T00:00:00Z') },
    { status: 'PENDING', price: 5000, year: 2018, createdAt: new Date('2026-04-01T00:00:00Z') },
    { status: 'REJECTED', price: 6000, year: 2018, createdAt: new Date('2026-05-01T00:00:00Z') },
    { status: 'SOLD', price: 7000, year: 2018, createdAt: new Date('2026-06-01T00:00:00Z') },
  ]

  for (const [index, row] of rows.entries()) {
    const created = await prisma.listing.create({
      data: {
        sellerId: seller.id,
        brand: FIXTURE_BRAND,
        model: `${FIXTURE_MODEL} ${index + 1}`,
        year: row.year,
        price: row.price,
        batteryPercent: 90,
        storage: '128 GB',
        cosmeticCondition: 'Good',
        conditionNotes: 'Fixture listing created by the seller storefront suite.',
        photos: [],
        categoryTags: [],
        inspectionChecks: [],
        status: row.status,
        createdAt: row.createdAt,
      },
      select: { id: true },
    })
    createdListingIds.push(created.id)
  }

  return seller.id
}

/** A seller whose application is still PENDING, so no storefront may exist. */
async function seedPendingSeller() {
  const user = await prisma.user.create({
    data: {
      name: 'Storefront Pending',
      email: `storefront-pending-${stamp}@example.test`,
      passwordHash: '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
      role: 'SELLER',
    },
    select: { id: true },
  })
  createdUserIds.push(user.id)

  const seller = await prisma.seller.create({
    data: {
      userId: user.id,
      businessName: 'Storefront Pending Shop',
      contactInfo: 'pending-canary@example.test / +63 900 000 0001',
      verificationStatus: 'PENDING',
      city: 'Davao City',
    },
    select: { id: true },
  })
  createdSellerIds.push(seller.id)

  return seller.id
}

/** A rejected seller. Also has no storefront. */
async function seedRejectedSeller() {
  const user = await prisma.user.create({
    data: {
      name: 'Storefront Rejected',
      email: `storefront-rejected-${stamp}@example.test`,
      passwordHash: '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
      role: 'SELLER',
    },
    select: { id: true },
  })
  createdUserIds.push(user.id)

  const seller = await prisma.seller.create({
    data: {
      userId: user.id,
      businessName: 'Storefront Rejected Shop',
      contactInfo: 'rejected-canary@example.test / +63 900 000 0002',
      verificationStatus: 'REJECTED',
      moderatorFeedback: 'Application did not meet the seller criteria.',
    },
    select: { id: true },
  })
  createdSellerIds.push(seller.id)

  return seller.id
}

/** A seller with an approved profile and no listings at all. */
async function seedEmptySeller() {
  const user = await prisma.user.create({
    data: {
      name: 'Storefront Empty',
      email: `storefront-empty-${stamp}@example.test`,
      passwordHash: '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
      role: 'SELLER',
    },
    select: { id: true },
  })
  createdUserIds.push(user.id)

  const seller = await prisma.seller.create({
    data: {
      userId: user.id,
      businessName: 'Storefront Empty Shop',
      contactInfo: 'empty-canary@example.test / +63 900 000 0003',
      verificationStatus: 'APPROVED',
    },
    select: { id: true },
  })
  createdSellerIds.push(seller.id)

  return seller.id
}

/**
 * Seeded reviews on the fixture's approved listings.
 *
 * Reviewer names are what the suite checks for leakage, so the canary is in the
 * author's real name: the public payload must carry initials only, never the
 * name that generated them.
 */
async function seedFixtureReviews(sellerId) {
  const listings = await prisma.listing.findMany({
    where: { sellerId, status: 'APPROVED' },
    orderBy: { price: 'asc' },
    select: { id: true },
  })

  const buyers = []

  for (const [index, email] of [
    `storefront-buyer-1-${stamp}@example.test`,
    `storefront-buyer-2-${stamp}@example.test`,
    `storefront-buyer-3-${stamp}@example.test`,
    `storefront-buyer-4-${stamp}@example.test`,
    `storefront-buyer-5-${stamp}@example.test`,
  ].entries()) {
    const buyer = await prisma.user.create({
      data: {
        name: ['Leaky McContact', 'Second Buyer', 'Third Buyer', 'Fourth Buyer', 'Fifth Buyer'][index],
        email,
        passwordHash: '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
        role: 'BUYER',
      },
      select: { id: true },
    })
    createdUserIds.push(buyer.id)
    buyers.push(buyer.id)
  }

  const ratings = [5, 4, 3, 5, 1]

  for (const [index, rating] of ratings.entries()) {
    const review = await prisma.review.create({
      data: {
        listingId: listings[index % listings.length].id,
        userId: buyers[index],
        rating,
        title: `Fixture review ${index + 1}`,
        comment: `Fixture review body ${index + 1}.`,
        verifiedPurchase: index % 2 === 0,
        createdAt: new Date(`2026-07-0${index + 1}T00:00:00Z`),
      },
      select: { id: true },
    })
    createdReviewIds.push(review.id)
  }

  return { ratingCount: ratings.length, ratingSum: ratings.reduce((a, b) => a + b, 0) }
}

async function main() {
  server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`

  const fixtureSellerId = await seedFixtureSeller()
  const pendingSellerId = await seedPendingSeller()
  const rejectedSellerId = await seedRejectedSeller()
  const emptySellerId = await seedEmptySeller()
  const { ratingCount, ratingSum } = await seedFixtureReviews(fixtureSellerId)

  // ------------------------------------------------------- profile: seeded
  // The seeded seller is the id the storefront is specified against, so it is
  // checked first and against the live seed.
  const seededProfile = await json(`/api/sellers/${SEEDED_SELLER_ID}`)
  assert.equal(seededProfile.status, 200, 'seeded seller profile resolves')
  assert.equal(seededProfile.body.seller.id, SEEDED_SELLER_ID)
  assert.equal(seededProfile.body.seller.businessName, 'Circuit Foundry')
  assert.equal(seededProfile.body.seller.isVerified, true)
  assert.equal(seededProfile.body.seller.verificationStatus, 'APPROVED')
  assert.equal(seededProfile.body.seller.city, 'Cebu City')
  assert.equal(seededProfile.body.seller.region, 'Visayas')
  assert.equal(seededProfile.body.seller.location, 'Cebu City, Visayas')
  assert.equal(seededProfile.body.seller.memberSince, '2020', 'member since is the year')
  assert.ok(seededProfile.body.seller.approvedListings > 0, 'seeded seller has inventory')
  // Seeded reviews are samples and never count toward a public rating.
  assert.equal(seededProfile.body.seller.ratingCount, 0, 'sample reviews are not counted')
  assert.equal(seededProfile.body.seller.ratingAverage, null)

  // ------------------------------------------------------- profile: fixture
  const profile = await json(`/api/sellers/${fixtureSellerId}`)
  assert.equal(profile.status, 200, 'approved seller profile resolves')
  assert.equal(profile.body.seller.businessName, 'Storefront Fixture Shop')
  assert.equal(profile.body.seller.tagline, 'Fixture shop used by the seller storefront suite.')
  assert.equal(profile.body.seller.location, 'Iloilo City, Western Visayas')
  assert.equal(profile.body.seller.approvedListings, 3, 'only approved listings are counted')
  assert.equal(profile.body.seller.ratingAverage, 4.25)
  assert.equal(profile.body.seller.ratingCount, 8)
  assert.equal(profile.body.seller.completedSales, 0)
  assert.equal(profile.body.seller.responseTime, 'Usually replies within a few hours')

  // A seller with no location fields publishes nulls rather than inventing one.
  const emptyProfile = await json(`/api/sellers/${emptySellerId}`)
  assert.equal(emptyProfile.status, 200, 'an approved seller with no listings still has a storefront')
  assert.equal(emptyProfile.body.seller.location, null)
  assert.equal(emptyProfile.body.seller.city, null)
  assert.equal(emptyProfile.body.seller.tagline, null)
  assert.equal(emptyProfile.body.seller.approvedListings, 0)
  // No reviews yet means a null average, not a 0.0 that reads as bad feedback.
  assert.equal(emptyProfile.body.seller.ratingAverage, null)
  assert.equal(emptyProfile.body.seller.ratingCount, 0)

  // ------------------------------------------------------- 404: unknown id
  const unknown = await json('/api/sellers/9f8e7d6c-5b4a-4321-8fed-cba987654321')
  assert.equal(unknown.status, 404, 'an unknown seller id is a 404')
  assert.equal(unknown.body.code, 'SELLER_NOT_FOUND')

  // ------------------------------------------------ 404: unapproved sellers
  for (const [label, id] of [
    ['pending', pendingSellerId],
    ['rejected', rejectedSellerId],
  ]) {
    const response = await json(`/api/sellers/${id}`)
    assert.equal(response.status, 404, `a ${label} seller has no storefront`)
    assert.equal(response.body.code, 'SELLER_NOT_FOUND')

    const listings = await json(`/api/sellers/${id}/listings`)
    assert.equal(listings.status, 404, `a ${label} seller has no inventory`)

    const reviews = await json(`/api/sellers/${id}/reviews`)
    assert.equal(reviews.status, 404, `a ${label} seller has no trust history`)
  }

  // A 403 would confirm the account exists. A pending application must not be
  // discoverable by guessing ids, so the answer has to be indistinguishable from
  // an id that was never issued.
  const pendingBody = JSON.stringify((await json(`/api/sellers/${pendingSellerId}`)).body)
  const unknownBody = JSON.stringify(unknown.body)
  assert.equal(pendingBody, unknownBody, 'a pending seller is indistinguishable from a missing one')

  // ------------------------------------------------------ 400: invalid id
  for (const badId of ['not-a-uuid', '12345', '30000000-0000-4000-8000-00000000000']) {
    const response = await json(`/api/sellers/${badId}`)
    assert.equal(response.status, 400, `"${badId}" is rejected with 400`)
    assert.equal(response.body.code, 'INVALID_SELLER_ID')

    const listings = await json(`/api/sellers/${badId}/listings`)
    assert.equal(listings.status, 400, `storefront listings reject "${badId}"`)
    assert.equal(listings.body.code, 'INVALID_SELLER_ID')

    const reviews = await json(`/api/sellers/${badId}/reviews`)
    assert.equal(reviews.status, 400, `storefront reviews reject "${badId}"`)
    assert.equal(reviews.body.code, 'INVALID_SELLER_ID')
  }

  // ------------------------------------------------------- listing filtering
  const inventory = await json(`/api/sellers/${fixtureSellerId}/listings`)
  assert.equal(inventory.status, 200)
  assert.equal(inventory.body.listings.length, 3, 'only approved listings are returned')
  assert.equal(inventory.body.pagination.total, 3)
  assert.equal(inventory.body.pagination.totalPages, 1)
  assert.equal(inventory.body.pagination.hasPrevious, false)
  assert.equal(inventory.body.pagination.hasNext, false)

  assert.ok(
    inventory.body.listings.every((entry) => entry.status === 'APPROVED'),
    'no PENDING, REJECTED, or SOLD row reaches the storefront',
  )
  assert.ok(
    inventory.body.listings.every((entry) => entry.sellerId === fixtureSellerId),
    'every row belongs to this seller',
  )
  assert.ok(
    inventory.body.listings.every((entry) => entry.brand === FIXTURE_BRAND),
    'no other seller\'s inventory leaks in',
  )

  // `moderatorFeedback` stays part of the listing payload's existing contract, so
  // it is the value that is asserted rather than the key: only APPROVED rows are
  // visible here, and an approved row has no moderator note by definition.
  assert.ok(
    inventory.body.listings.every((entry) => entry.moderatorFeedback === null),
    'no moderator note reaches a storefront listing',
  )

  // The response shape has to match /api/listings so one card component can
  // render both. These are the fields the listing card reads.
  for (const key of ['id', 'slug', 'brand', 'model', 'year', 'price', 'photos', 'mainPhoto', 'grade', 'seller']) {
    assert.ok(key in inventory.body.listings[0], `storefront listings carry "${key}"`)
  }

  // ------------------------------------------------------------- redaction
  for (const payload of [profile.body, seededProfile.body, inventory.body, emptyProfile.body]) {
    const hits = findForbiddenKeys(payload)
    assert.deepEqual(hits, [], `no private field is present (found ${hits.join(', ')})`)
  }

  // The canary is checked as a string too, because a leak under an unexpected key
  // name would pass a key-name check while still putting a phone number on the
  // page.
  for (const path of [
    `/api/sellers/${fixtureSellerId}`,
    `/api/sellers/${fixtureSellerId}/listings`,
  ]) {
    const text = JSON.stringify((await json(path)).body)
    assert.ok(!text.includes('leak-canary'), `${path} does not leak the fixture contact info`)
    assert.ok(!text.includes('+63 900'), `${path} does not leak the fixture phone number`)
    assert.ok(!text.includes('@example.test'), `${path} does not leak any email address`)
  }

  // The seeded seller's own contact string, which contains an email and a phone
  // number, must not survive serialisation either.
  const seededListingsText = JSON.stringify(
    (await json(`/api/sellers/${SEEDED_SELLER_ID}/listings`)).body,
  )
  assert.ok(!seededListingsText.includes('circuitfoundry.test'), 'no seeded seller email leaks')
  assert.ok(!seededListingsText.includes('+63 995'), 'no seeded seller phone number leaks')

  // ---------------------------------------------------------------- sorting
  const asc = await json(`/api/sellers/${fixtureSellerId}/listings?sort=price-asc`)
  const ascPrices = asc.body.listings.map((entry) => entry.price)
  assert.deepEqual(ascPrices, [12000, 21000, 30000], 'price ascending')

  const desc = await json(`/api/sellers/${fixtureSellerId}/listings?sort=price-desc`)
  const descPrices = desc.body.listings.map((entry) => entry.price)
  assert.deepEqual(descPrices, [30000, 21000, 12000], 'price descending')

  const newest = await json(`/api/sellers/${fixtureSellerId}/listings?sort=newest`)
  const created = newest.body.listings.map((entry) => Date.parse(entry.createdAt))
  assert.deepEqual(
    created,
    [...created].sort((a, b) => b - a),
    'newest first',
  )

  // `newest` is the default, so a bare request and an explicit one must agree.
  const defaulted = await json(`/api/sellers/${fixtureSellerId}/listings`)
  assert.deepEqual(
    defaulted.body.listings.map((entry) => entry.id),
    newest.body.listings.map((entry) => entry.id),
    'newest is the default order',
  )

  for (const [query, expected] of [
    ['?sort=cheapest', 'sort'],
    ['?sort=best-rated', 'sort'],
    ['?page=0', 'page'],
    ['?limit=0', 'limit'],
    ['?limit=999', 'limit'],
    ['?unknownParam=1', '_query'],
  ]) {
    const response = await json(`/api/sellers/${fixtureSellerId}/listings${query}`)
    assert.equal(response.status, 422, `${query} is rejected`)
    assert.ok(
      response.body.errors[expected],
      `${query} error is keyed to "${expected}", got ${JSON.stringify(response.body.errors)}`,
    )
  }

  // -------------------------------------------------------------- pagination
  const firstPage = await json(`/api/sellers/${fixtureSellerId}/listings?page=1&limit=2`)
  assert.equal(firstPage.status, 200)
  assert.equal(firstPage.body.listings.length, 2, 'the page size is respected')
  assert.equal(firstPage.body.pagination.page, 1)
  assert.equal(firstPage.body.pagination.pageSize, 2)
  assert.equal(firstPage.body.pagination.total, 3)
  assert.equal(firstPage.body.pagination.totalPages, 2)
  assert.equal(firstPage.body.pagination.hasPrevious, false)
  assert.equal(firstPage.body.pagination.hasNext, true)

  const secondPage = await json(`/api/sellers/${fixtureSellerId}/listings?page=2&limit=2`)
  assert.equal(secondPage.body.listings.length, 1)
  assert.equal(secondPage.body.pagination.page, 2)
  assert.equal(secondPage.body.pagination.hasPrevious, true)
  assert.equal(secondPage.body.pagination.hasNext, false)

  const overlap = firstPage.body.listings
    .map((entry) => entry.id)
    .filter((id) => secondPage.body.listings.some((entry) => entry.id === id))
  assert.equal(overlap.length, 0, 'pages do not repeat a listing')

  // Sorting must survive paging, or "cheapest first" would only be true of
  // page one.
  const cheapestFirst = await json(`/api/sellers/${fixtureSellerId}/listings?sort=price-asc&page=1&limit=2`)
  const cheapestSecond = await json(`/api/sellers/${fixtureSellerId}/listings?sort=price-asc&page=2&limit=2`)
  assert.equal(cheapestFirst.body.listings[0].price, 12000, 'the cheapest device leads page one')
  assert.equal(cheapestSecond.body.listings[0].price, 30000, 'page two continues the ordering')

  // Past the end there is nothing left, which is an empty page rather than an
  // error, exactly as the catalog behaves.
  const beyond = await json(`/api/sellers/${fixtureSellerId}/listings?page=9&limit=2`)
  assert.equal(beyond.status, 200)
  assert.equal(beyond.body.listings.length, 0)

  // -------------------------------------------------- empty inventory seller
  const emptyInventory = await json(`/api/sellers/${emptySellerId}/listings`)
  assert.equal(emptyInventory.status, 200, 'an empty storefront is still a 200')
  assert.deepEqual(emptyInventory.body.listings, [])
  assert.equal(emptyInventory.body.pagination.total, 0)
  assert.equal(emptyInventory.body.pagination.totalPages, 0)

  // --------------------------------------------------------------- reviews
  const reviews = await json(`/api/sellers/${fixtureSellerId}/reviews`)
  assert.equal(reviews.status, 200)
  assert.equal(reviews.body.reviews.length, ratingCount, 'every published review is returned')
  assert.equal(reviews.body.summary.count, ratingCount)
  assert.equal(
    reviews.body.summary.average,
    Number((ratingSum / ratingCount).toFixed(2)),
    'the summary average covers every review, not just the page',
  )
  // Seeded ratings are 5, 4, 3, 5, 1, and the breakdown is ordered 5 stars first.
  // The 2-star band is the empty one, and it is asserted as present-and-zero
  // rather than omitted, because a breakdown that dropped empty bands would make
  // the bar chart render four rows for five stars.
  assert.deepEqual(
    reviews.body.summary.breakdown.map((band) => band.stars),
    [5, 4, 3, 2, 1],
    'every star band is present',
  )
  assert.deepEqual(
    reviews.body.summary.breakdown.map((band) => band.count),
    [2, 1, 1, 0, 1],
    'the breakdown counts every star band including the empty ones',
  )
  assert.equal(reviews.body.pagination.total, ratingCount)

  // Newest first, and the review that names the fixture phone must appear with
  // initials only.
  const dates = reviews.body.reviews.map((entry) => Date.parse(entry.createdAt))
  assert.deepEqual(dates, [...dates].sort((a, b) => b - a), 'newest review first')

  for (const review of reviews.body.reviews) {
    assert.ok(!JSON.stringify(review).includes('Leaky'), 'a full reviewer name never leaks')
    assert.ok(!JSON.stringify(review).includes('@example.test'), 'no reviewer email leaks')
    assert.ok(review.author.length <= 2, `author "${review.author}" is initials only`)
    assert.ok(review.listing.name.startsWith(FIXTURE_BRAND), 'a review names the device it is about')
  }

  assert.equal(findForbiddenKeys(reviews.body).length, 0, 'no private field in the reviews payload')

  // The "Verified purchase" badge follows the stored flag and nothing else.
  assert.equal(reviews.body.reviews[0].verifiedPurchase, true)
  assert.equal(reviews.body.reviews[1].verifiedPurchase, false)

  // Review paging.
  const reviewPage = await json(`/api/sellers/${fixtureSellerId}/reviews?page=1&limit=2`)
  assert.equal(reviewPage.body.reviews.length, 2)
  assert.equal(reviewPage.body.pagination.totalPages, 3)
  assert.equal(reviewPage.body.pagination.hasNext, true)
  // The summary is the seller's real total regardless of which page is loaded.
  assert.equal(reviewPage.body.summary.count, ratingCount)

  const reviewLast = await json(`/api/sellers/${fixtureSellerId}/reviews?page=3&limit=2`)
  assert.equal(reviewLast.body.reviews.length, 1)
  assert.equal(reviewLast.body.pagination.hasNext, false)

  const reviewOverlap = reviewPage.body.reviews
    .map((entry) => entry.id)
    .filter((id) => reviewLast.body.reviews.some((entry) => entry.id === id))
  assert.equal(reviewOverlap.length, 0, 'review pages do not repeat a review')

  // A seller with no reviews reports zero honestly rather than inventing rows.
  const noReviews = await json(`/api/sellers/${emptySellerId}/reviews`)
  assert.equal(noReviews.status, 200)
  assert.deepEqual(noReviews.body.reviews, [])
  assert.equal(noReviews.body.summary.count, 0)
  assert.equal(noReviews.body.summary.average, null)
  assert.deepEqual(
    noReviews.body.summary.breakdown.map((band) => band.count),
    [0, 0, 0, 0, 0],
  )

  // Only PUBLISHED reviews on visible listings are included, so a moderation
  // artefact cannot surface through the storefront.
  await prisma.review.update({
    where: { id: createdReviewIds[0] },
    data: { status: 'PENDING' },
  })
  const afterModeration = await json(`/api/sellers/${fixtureSellerId}/reviews`)
  assert.equal(afterModeration.body.summary.count, ratingCount - 1, 'a non-published review is hidden')
  assert.ok(
    afterModeration.body.reviews.every((entry) => entry.id !== createdReviewIds[0]),
    'the moderated review itself is gone',
  )
  await prisma.review.update({
    where: { id: createdReviewIds[0] },
    data: { status: 'PUBLISHED' },
  })

  // -------------------------------------------- seeded reviews stay private
  // The seed's demo reviews are stored with `isSample: true`. They are sample
  // data, not buyer feedback, so a storefront never lists or averages them.
  const seededReviews = await json(`/api/sellers/${SEEDED_SELLER_ID}/reviews`)
  assert.equal(seededReviews.status, 200, 'the seeded seller has a review endpoint')
  assert.equal(seededReviews.body.summary.count, 0, 'sample reviews are not listed')
  assert.equal(seededReviews.body.summary.average, null, 'sample reviews are not averaged')
  assert.equal(
    findForbiddenKeys(seededReviews.body).length,
    0,
    'no private field in the seeded reviews payload',
  )

  // -------------------------------------------------------- unauthenticated
  // Every request above already ran without a session. This block asserts the
  // point explicitly so a future `router.use(authenticate)` placed above these
  // routes fails loudly rather than subtly.
  const anon = await api(`/api/sellers/${SEEDED_SELLER_ID}`)
  assert.equal(anon.status, 200, 'a storefront is readable with no session')
  assert.equal(anon.headers.get('set-cookie'), null, 'reading a storefront sets no cookie')

  const anonListings = await api(`/api/sellers/${SEEDED_SELLER_ID}/listings`)
  assert.equal(anonListings.status, 200, 'storefront inventory is public')

  const anonReviews = await api(`/api/sellers/${SEEDED_SELLER_ID}/reviews`)
  assert.equal(anonReviews.status, 200, 'storefront trust history is public')

  // The self-service routes still require a session, so the public reads have
  // not weakened them.
  const me = await json('/api/sellers/me')
  assert.equal(me.status, 401, '/sellers/me still requires authentication')

  const apply = await json('/api/sellers/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessName: 'Anonymous Shop', contactInfo: 'anon@example.test' }),
  })
  assert.equal(apply.status, 401, 'applying as a seller still requires authentication')

  // `me` still routes to the authenticated handler rather than being parsed as
  // a seller id of "me", which is what would happen if the storefront `/:id`
  // route were declared first.
  console.log(
    'Seller storefront E2E passed: public profile for seeded and fixture sellers, ' +
      '404 for unknown/pending/rejected sellers, 400 for a malformed id, approved-only ' +
      'inventory in the /api/listings shape, price and newest sorting with paging that ' +
      'preserves order, published-review trust history with a full-summary rating, ' +
      'recursion-checked redaction of contact info and reviewer identities, and ' +
      'unauthenticated access with the self-service routes still gated',
  )
}

try {
  await main()
} finally {
  // Reviews cascade from listings, and listings restrict their seller, so the
  // order here is reviews -> listings -> sellers -> users.
  await prisma.review.deleteMany({ where: { id: { in: createdReviewIds } } })
  await prisma.listing.deleteMany({ where: { id: { in: createdListingIds } } })
  await prisma.seller.deleteMany({ where: { id: { in: createdSellerIds } } })
  await prisma.authToken.deleteMany({ where: { userId: { in: createdUserIds } } })
  await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } })
  await prisma.cart.deleteMany({ where: { userId: { in: createdUserIds } } })
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  await prisma.$disconnect()
  server?.close()
}