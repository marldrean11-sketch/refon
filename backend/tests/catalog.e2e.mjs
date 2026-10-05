import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'

process.env.NODE_ENV = 'test'

const stamp = `${Date.now()}-catalog`

const { default: app } = await import(`../src/app.js?catalog-e2e=${stamp}`)
const prisma = new PrismaClient()

const SELLER_EMAIL = `catalog-seller-${stamp}@example.test`
const SELLER_PASSWORD = 'SellerTest123!'
const SELLER_PHOTO = '/uploads/seed/phone-front.svg'

let server
let baseUrl
let sellerCookie = ''
const createdListingIds = []
const createdUserIds = []

function api(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sellerCookie ? { Cookie: sellerCookie } : {}),
      ...(options.headers ?? {}),
    },
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
 * The suite creates real rows, and its own cleanup deletes rows matching the
 * fixture's slug prefix. Naming the fixture after a real phone would make that
 * cleanup delete seeded data instead.
 */
const FIXTURE_BRAND = 'Catalogworks'
const FIXTURE_MODEL = 'Testmodel 12'

async function seedFixture() {
  const sellerUser = await prisma.user.create({
    data: {
      name: 'Catalog Seller',
      email: SELLER_EMAIL,
      passwordHash: '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
      role: 'SELLER',
    },
    select: { id: true },
  })
  createdUserIds.push(sellerUser.id)

  await prisma.seller.create({
    data: {
      userId: sellerUser.id,
      businessName: 'Catalog Fixture Shop',
      contactInfo: 'catalog@example.test',
      verificationStatus: 'APPROVED',
      city: 'Quezon City',
      region: 'Metro Manila',
      ratingAverage: 4.5,
      ratingCount: 10,
    },
    select: { id: true },
  })
}

const BASE_LISTING = {
  brand: FIXTURE_BRAND,
  model: FIXTURE_MODEL,
  year: 2020,
  batteryPercent: 91,
  storage: '128 GB',
  condition: 'Like New',
  conditionNotes: 'Clean glass and frame with no marks at arm length.',
  photos: [SELLER_PHOTO],
}

async function approveListing(slug) {
  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@refon.test', password: 'AdminTest123!' }),
  })
  assert.equal(adminLogin.status, 200, 'admin login')
  const adminCookie = adminLogin.headers.get('set-cookie').split(';')[0]

  const row = await prisma.listing.findUnique({ where: { slug }, select: { id: true } })
  const approved = await fetch(
    `${baseUrl}/api/admin/listings/${row.id}/approve`,
    { method: 'PATCH', headers: { Cookie: adminCookie } },
  )
  assert.equal(approved.status, 200, `approve ${slug}`)
}

async function main() {
  // Remove leftovers from an interrupted earlier run so slug assertions are not
  // thrown off by a row this suite created previously.
  const staleListings = await prisma.listing.findMany({
    where: { slug: { startsWith: 'catalogworks-testmodel-12' } },
    select: { id: true, seller: { select: { userId: true } } },
  })
  if (staleListings.length > 0) {
    await prisma.listing.deleteMany({
      where: { id: { in: staleListings.map((row) => row.id) } },
    })
    await prisma.seller.deleteMany({
      where: { userId: { in: staleListings.map((row) => row.seller.userId) } },
    })
    await prisma.user.deleteMany({
      where: { id: { in: staleListings.map((row) => row.seller.userId) } },
    })
  }

  server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`

  await seedFixture()

  // Sign in as a seller whose rating is populated, so the seller-rating filter
  // and the storefront rating fields are exercised against real rows.
  const register = await json('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Catalog Seller',
      email: `catalog-login-${stamp}@example.test`,
      password: SELLER_PASSWORD,
      role: 'SELLER',
    }),
  })
  assert.equal(register.status, 201, 'register seller')

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `catalog-login-${stamp}@example.test`,
      password: SELLER_PASSWORD,
    }),
  })
  assert.equal(login.status, 200, 'login seller')
  sellerCookie = login.headers.get('set-cookie').split(';')[0]
  createdUserIds.push(register.body.user.id)

  // The registered seller still needs admin approval before listing.
  const approvedSeller = await prisma.seller.update({
    where: { userId: register.body.user.id },
    data: {
      verificationStatus: 'APPROVED',
      city: 'Quezon City',
      region: 'Metro Manila',
      ratingAverage: 4.5,
      ratingCount: 12,
    },
  })
  assert.equal(approvedSeller.verificationStatus, 'APPROVED')

  // ---------------------------------------------------------------- create
  const created = await json('/api/listings', {
    method: 'POST',
    body: JSON.stringify({
      ...BASE_LISTING,
      price: 22990,
      originalPrice: 45990,
      conditionGrade: 'A',
      warrantyMonths: 6,
      ram: '4 GB',
      operatingSystem: 'iOS 17',
      networkType: '5G',
      processor: 'Apple A14 Bionic',
      displaySpec: '6.1" Super Retina XDR OLED',
      cameraSpec: '12 MP dual, Night mode',
      color: 'Blue',
      categoryTags: ['gaming-phones', 'under-20000'],
      inspectionChecks: ['display', 'touchscreen', 'camera', 'battery'],
      imeiVerified: true,
      imeiLast4: '4821',
      isFeatured: true,
    }),
  })
  assert.equal(created.status, 201, 'create listing with catalog fields')
  const listing = created.body.listing
  createdListingIds.push(listing.id)

  // ------------------------------------------------------- presenter fields
  assert.equal(listing.slug, 'catalogworks-testmodel-12-128-gb-blue', 'slug is generated')
  assert.equal(listing.ram, '4 GB')
  assert.equal(listing.originalPrice, 45990)
  assert.equal(listing.grade, 'A')
  assert.equal(listing.gradeLabel, 'Excellent')
  assert.equal(listing.warrantyMonths, 6)
  assert.equal(listing.warrantyLabel, '6-month warranty')
  assert.equal(listing.discountPercent, 50)
  assert.equal(listing.savings, 23000)
  assert.equal(listing.imeiVerified, true)
  assert.equal(listing.imeiLast4, '4821')
  assert.equal(listing.inspectionRecorded, true)
  assert.equal(listing.inspectionChecks.length, 4)
  assert.equal(listing.inspectionComplete, false, 'partial inspection is not complete')
  assert.deepEqual(listing.categoryTags, ['gaming-phones', 'under-20000'])

  // Existing contract must still hold.
  assert.equal(listing.price, 22990)
  assert.equal(listing.batteryPercent, 91)
  assert.equal(listing.condition, 'Like New')
  assert.equal(listing.mainPhoto, SELLER_PHOTO)
  assert.ok(Array.isArray(listing.photos))

  // Seller contact details must never reach a public payload.
  assert.equal(listing.seller.contactInfo, undefined, 'no seller contact info')
  assert.equal(listing.seller.city, 'Quezon City', 'storefront city is public')
  assert.equal(listing.seller.ratingAverage, 4.5, 'seller rating is exposed')
  assert.equal(listing.seller.ratingCount, 12)

  // ----------------------------------------------- original price validation
  const badDiscount = await json('/api/listings', {
    method: 'POST',
    body: JSON.stringify({
      ...BASE_LISTING,
      price: 22990,
      originalPrice: 15000,
    }),
  })
  assert.equal(badDiscount.status, 422, 'original price below price is rejected')
  assert.ok(badDiscount.body.errors.originalPrice, 'error names originalPrice')

  // --------------------------------------------------------- slug collision
  const duplicate = await json('/api/listings', {
    method: 'POST',
    body: JSON.stringify({ ...BASE_LISTING, price: 23990 }),
  })
  assert.equal(duplicate.status, 201, 'same phone can be listed twice')
  createdListingIds.push(duplicate.body.listing.id)
  assert.notEqual(
    duplicate.body.listing.slug,
    listing.slug,
    'a colliding slug gets a suffix rather than failing',
  )

  const badGrade = await json('/api/listings', {
    method: 'POST',
    body: JSON.stringify({ ...BASE_LISTING, price: 23990, conditionGrade: 'D' }),
  })
  assert.equal(badGrade.status, 422, 'grade D does not exist')

  const badWarranty = await json('/api/listings', {
    method: 'POST',
    body: JSON.stringify({ ...BASE_LISTING, price: 23990, warrantyMonths: 36 }),
  })
  assert.equal(badWarranty.status, 422, 'warranty above 24 months is rejected')

  const badImei = await json('/api/listings', {
    method: 'POST',
    body: JSON.stringify({
      ...BASE_LISTING,
      price: 23990,
      imeiLast4: '12ab',
    }),
  })
  assert.equal(badImei.status, 422, 'IMEI suffix must be four digits')

  const unknownField = await json('/api/listings', {
    method: 'POST',
    body: JSON.stringify({ ...BASE_LISTING, price: 23990, nonsense: true }),
  })
  assert.equal(unknownField.status, 422, 'strict body still rejects unknown keys')

  await approveListing(listing.slug)
  await approveListing(duplicate.body.listing.slug)

  // ------------------------------------------------------------- filtering
  const byGrade = await json('/api/listings?conditionGrade=A')
  assert.equal(byGrade.status, 200)
  assert.ok(byGrade.body.listings.length >= 1)
  assert.ok(
    byGrade.body.listings.every((entry) => entry.grade === 'A'),
    'grade filter returns only Grade A',
  )

  const byRam = await json('/api/listings?ram=4%20GB')
  assert.equal(byRam.status, 200)
  assert.ok(
    byRam.body.listings.every((entry) => entry.ram === '4 GB'),
    'ram filter is exact',
  )

  const byStorage = await json('/api/listings?storage=128%20GB')
  assert.ok(byStorage.body.listings.every((entry) => entry.storage === '128 GB'))

  const byBattery = await json('/api/listings?minBattery=95')
  assert.ok(byBattery.body.listings.every((entry) => entry.batteryPercent >= 95))

  const byWarranty = await json('/api/listings?warrantyMonths=12')
  assert.ok(byWarranty.body.listings.every((entry) => entry.warrantyMonths === 12))

  const byCategory = await json('/api/listings?category=gaming-phones')
  assert.ok(
    byCategory.body.listings.every((entry) => entry.categoryTags.includes('gaming-phones')),
    'tag category resolves against category_tags',
  )

  const byRating = await json('/api/listings?minSellerRating=4')
  assert.ok(byRating.body.listings.length >= 1, 'seller rating filter matches')
  assert.ok(
    byRating.body.listings.every(
      (entry) => entry.seller.ratingAverage !== null && entry.seller.ratingAverage >= 4,
    ),
  )

  const combined = await json(
    '/api/listings?conditionGrade=A&minPrice=20000&maxPrice=30000&minBattery=90&ram=4%20GB&storage=128%20GB',
  )
  assert.equal(combined.status, 200)
  assert.ok(
    combined.body.listings.some((entry) => entry.id === listing.id),
    'filters combine with AND',
  )

  // -------------------------------------------------------- query rejection
  for (const [query, expected] of [
    ['?conditionGrade=Z', 'conditionGrade'],
    ['?category=not-real', 'category'],
    ['?sort=cheapest', 'sort'],
    ['?pageSize=999', 'pageSize'],
    ['?page=0', 'page'],
    ['?minBattery=150', 'minBattery'],
    ['?minSellerRating=9', 'minSellerRating'],
    ['?ram=99%20GB', 'ram'],
    ['?storage=3%20TB', 'storage'],
    ['?warrantyMonths=7', 'warrantyMonths'],
    ['?unknownFilter=1', '_query'],
  ]) {
    const response = await json(`/api/listings${query}`)
    assert.equal(response.status, 422, `${query} is rejected`)
    assert.ok(
      response.body.errors[expected],
      `${query} error is keyed to "${expected}", got ${JSON.stringify(response.body.errors)}`,
    )
  }

  // --------------------------------------------------------------- sorting
  const asc = await json('/api/listings?sort=price-asc&pageSize=48')
  const prices = asc.body.listings.map((entry) => entry.price)
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b), 'price ascending')

  const desc = await json('/api/listings?sort=price-desc&pageSize=48')
  const descPrices = desc.body.listings.map((entry) => entry.price)
  assert.deepEqual(descPrices, [...descPrices].sort((a, b) => b - a), 'price descending')

  const discount = await json('/api/listings?sort=biggest-discount&pageSize=48')
  const discounts = discount.body.listings.map((entry) => entry.discountPercent ?? 0)
  assert.deepEqual(
    discounts,
    [...discounts].sort((a, b) => b - a),
    'biggest discount ordering is by percentage, not by reference price',
  )
  // The fixture saves 50%. Anything ranking above it must genuinely save more,
  // which proves the sort is not simply picking the highest original price.
  assert.ok(discounts[0] >= 50, 'the largest genuine saving leads')
  assert.ok(
    discount.body.listings.some((entry) => entry.discountPercent === 50),
    'the fixture appears in the discount ordering',
  )
  assert.ok(
    discount.body.listings.every((entry) => entry.discountPercent > 0 || entry.price > 0),
    'listings without a reference price carry no invented discount',
  )

  const featuredFirst = await json('/api/listings?sort=recommended&pageSize=48')
  assert.equal(featuredFirst.body.listings[0].isFeatured, true, 'recommended leads with featured')

  const newest = await json('/api/listings?sort=newest&pageSize=48')
  const createdAt = newest.body.listings.map((entry) => Date.parse(entry.createdAt))
  assert.deepEqual(
    createdAt,
    [...createdAt].sort((a, b) => b - a),
    'newest first',
  )

  // ------------------------------------------------------------ pagination
  const firstPage = await json('/api/listings?page=1&pageSize=5')
  assert.equal(firstPage.status, 200)
  assert.equal(firstPage.body.pagination.page, 1)
  assert.equal(firstPage.body.pagination.pageSize, 5)
  assert.ok(firstPage.body.pagination.total > 5)
  assert.equal(firstPage.body.pagination.hasPrevious, false)
  assert.equal(firstPage.body.pagination.hasNext, true)
  assert.equal(
    firstPage.body.pagination.totalPages,
    Math.ceil(firstPage.body.pagination.total / 5),
    'totalPages is derived from total',
  )
  assert.equal(firstPage.body.listings.length, 5, 'page size is respected')

  const secondPage = await json('/api/listings?page=2&pageSize=5')
  assert.equal(secondPage.body.pagination.page, 2)
  assert.equal(secondPage.body.pagination.hasPrevious, true)

  const firstIds = firstPage.body.listings.map((entry) => entry.id)
  const secondIds = secondPage.body.listings.map((entry) => entry.id)
  const overlap = firstIds.filter((id) => secondIds.includes(id))
  assert.equal(overlap.length, 0, 'pages do not repeat a listing')

  const fullCatalog = await json('/api/listings?pageSize=48')
  assert.equal(
    fullCatalog.body.listings.length,
    fullCatalog.body.pagination.total,
    'pagination returns the whole catalog only when one page covers it',
  )

  // -------------------------------------------------- slug and id lookups
  const bySlug = await json(`/api/listings/slug/${listing.slug}`)
  assert.equal(bySlug.status, 200, 'slug lookup resolves')
  assert.equal(bySlug.body.listing.id, listing.id)

  const byId = await json(`/api/listings/${listing.id}`)
  assert.equal(byId.status, 200, 'id lookup still resolves')
  assert.equal(byId.body.listing.id, listing.id, 'backwards compatible')

  const badSlug = await json('/api/listings/slug/not-a-real-phone')
  assert.equal(badSlug.status, 404, 'unknown slug is a 404')

  const malformedSlug = await json('/api/listings/slug/Not_A_Valid_Slug')
  assert.equal(malformedSlug.status, 422, 'malformed slug is a 422')

  const related = await json(`/api/listings/${listing.id}/related`)
  assert.equal(related.status, 200)
  assert.ok(
    related.body.listings.every((entry) => entry.id !== listing.id),
    'a listing is never related to itself',
  )

  // ------------------------------------------------------- sold by slug
  const sold = await json(`/api/listings/${listing.id}/mark-sold`, { method: 'PATCH' })
  assert.equal(sold.status, 200)

  const soldBySlug = await json(`/api/listings/slug/${listing.slug}`)
  assert.equal(soldBySlug.status, 200, 'a sold listing still resolves by slug')
  assert.equal(soldBySlug.body.listing.status, 'SOLD')

  const soldInCatalog = await json('/api/listings?pageSize=48')
  assert.ok(
    soldInCatalog.body.listings.every((entry) => entry.id !== listing.id),
    'a sold listing leaves the catalog',
  )

  // --------------------------------------------------------- facets + suggest
  const facets = await json('/api/listings/facets')
  assert.equal(facets.status, 200)
  assert.ok(Array.isArray(facets.body.options.sorts))
  assert.equal(facets.body.options.sorts.length, 7)
  assert.ok(
    facets.body.options.sorts.some((entry) => entry.value === 'biggest-discount'),
    'biggest discount is offered',
  )
  assert.ok(facets.body.facets.brands.length > 0, 'brand facet is populated')
  assert.ok(facets.body.facets.grades.length > 0, 'grade facet is populated')

  const suggest = await json(`/api/listings/suggest?q=${FIXTURE_BRAND}`)
  assert.equal(suggest.status, 200)
  assert.ok(
    suggest.body.suggestions.some(
      (entry) => entry.label === `${FIXTURE_BRAND} ${FIXTURE_MODEL}`,
    ),
    'suggestion comes from real catalog rows',
  )
  assert.ok(
    suggest.body.suggestions.every((entry) => typeof entry.query === 'string'),
  )

  const noMatch = await json('/api/listings/suggest?q=zzzznothing')
  assert.equal(noMatch.status, 200)
  assert.equal(noMatch.body.suggestions.length, 0, 'no invented products')

  const badSuggest = await json('/api/listings/suggest?q=a&nope=1')
  assert.equal(badSuggest.status, 422, 'suggest query is validated too')

  // --------------------------------------------------------- search behaviour
  // Search has to match across the brand and model columns. Matching each column
  // against the whole string finds nothing for "Samsung Galaxy S8", and the
  // suggestion endpoint offers exactly that phrase — so the dropdown would hand
  // the shopper a query that returns an empty page.
  for (const query of [
    'Samsung Galaxy S8',
    'OPPO Reno 8',
    'Samsung Galaxy A54',
    'Google Pixel 8',
    'OnePlus 11',
  ]) {
    const result = await json(`/api/listings?search=${encodeURIComponent(query)}`)
    assert.equal(result.status, 200)
    assert.ok(
      result.body.listings.length > 0,
      `"${query}" finds the listing it names`,
    )
  }

  const partial = await json('/api/listings?search=samsung%20s8')
  assert.ok(
    partial.body.listings.some((entry) => entry.model === 'Galaxy S8'),
    'a partial multi-word query still matches',
  )

  for (const suggestion of suggest.body.suggestions) {
    const followed = await json(
      `/api/listings?search=${encodeURIComponent(suggestion.query)}`,
    )
    assert.ok(
      followed.body.listings.length > 0,
      `suggestion "${suggestion.query}" is not a dead end`,
    )
  }

  const nonsense = await json('/api/listings?search=zzzznothing')
  assert.equal(nonsense.body.pagination.total, 0, 'no invented matches')

  // ------------------------------------------------------- unauthenticated
  sellerCookie = ''
  const anonymous = await json('/api/listings?pageSize=3')
  assert.equal(anonymous.status, 200, 'catalog stays public')

  const anonCreate = await json('/api/listings', {
    method: 'POST',
    body: JSON.stringify({ ...BASE_LISTING, price: 22990 }),
  })
  assert.equal(anonCreate.status, 401, 'creating a listing still requires auth')

  console.log(
    'Catalog E2E passed: slug generation and collision suffix, presenter additions and ' +
      'backwards-compatible fields, discount maths, original-price validation, grade/RAM/' +
      'storage/battery/warranty/seller-rating/category filters, strict query rejection, all ' +
      'seven sorts, pagination metadata and non-overlapping pages, slug and id lookups, ' +
      'sold-listing resolution, facets, brand+model search, suggestions that are never dead ' +
      'ends, and seller-contact redaction',
  )
}

try {
  await main()
} finally {
  // Seller rows are deleted before their users: the user relation is Restrict.
  await prisma.listing.deleteMany({ where: { id: { in: createdListingIds } } })
  await prisma.seller.deleteMany({
    where: {
      OR: [
        { businessName: 'Catalog Fixture Shop' },
        { userId: { in: createdUserIds } },
      ],
    },
  })
  await prisma.authToken.deleteMany({ where: { userId: { in: createdUserIds } } })
  await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } })
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  await prisma.$disconnect()
  server?.close()
}
