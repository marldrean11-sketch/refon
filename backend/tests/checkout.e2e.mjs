import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'

/**
 * Phase 6 checkout backend suite: the delivery catalogue, server-side pricing, and
 * the validation that decides whether a checkout may proceed at all.
 *
 * The properties under test are the ones a client could try to subvert: that the
 * server decides every peso figure, that a request cannot smuggle in a price, and
 * that an unavailable or expired device blocks checkout instead of being quietly
 * dropped from the total.
 *
 * Nothing here creates an order, because nothing in this build does.
 */

process.env.NODE_ENV = 'test'

const stamp = `${Date.now()}-checkout`

const { default: app } = await import(`../src/app.js?checkout-e2e=${stamp}`)
const prisma = new PrismaClient()

const BUYER_PASSWORD = 'BuyerTest123!'
const SELLER_PASSWORD = 'SellerTest123!'
const SEED_PHOTO = '/uploads/seed/phone-front.svg'

let server
let baseUrl

const createdUserIds = []
const createdListingIds = []
const createdCartIds = []

function createClient() {
  return {
    cookies: new Map(),
    cookieHeader() {
      return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; ')
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

      for (const entry of response.headers.getSetCookie?.() ?? []) {
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

      const json = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : null

      return { status: response.status, json }
    },
  }
}

const VALID_DETAILS = Object.freeze({
  fullName: 'Maria Santos',
  email: 'maria.santos@example.test',
  mobile: '09171234567',
  region: 'NCR',
  province: 'Quezon City',
  city: 'Quezon City',
  barangay: 'Bagumbayan',
  street: '12 Katipunan Avenue, Tower B, Unit 4B',
  postalCode: '1100',
})

function quote(details = {}, deliveryMethodId = 'standard', paymentMethodId = 'cod') {
  return createClient().raw('/api/checkout/quote', {
    method: 'POST',
    body: {
      deliveryMethodId,
      paymentMethodId,
      details: { ...VALID_DETAILS, ...details },
    },
  })
}

/** Creates an approved listing owned by an approved seller, for a buyer to hold. */
async function createApprovedListing(price = 24_990) {
  const sellerUser = await prisma.user.create({
    data: {
      name: 'Checkout Fixture Seller',
      email: `checkout-seller-${crypto.randomUUID()}@example.test`,
      passwordHash: 'not-a-real-hash',
      role: 'SELLER',
    },
    select: { id: true },
  })
  createdUserIds.push(sellerUser.id)

  const seller = await prisma.seller.create({
    data: {
      userId: sellerUser.id,
      businessName: 'Checkout Fixture Shop',
      contactInfo: 'checkout-fixture@example.test',
      verificationStatus: 'APPROVED',
    },
    select: { id: true },
  })

  const model = `Checkout Fixture ${crypto.randomUUID().slice(0, 8)}`

  const listing = await prisma.listing.create({
    data: {
      sellerId: seller.id,
      brand: 'Checkoutworks',
      model,
      slug: model.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      year: 2021,
      price,
      batteryPercent: 90,
      storage: '128 GB',
      cosmeticCondition: 'Like New',
      conditionGrade: 'A',
      warrantyMonths: 6,
      conditionNotes: 'Created for the checkout test suite.',
      photos: [SEED_PHOTO],
      status: 'APPROVED',
    },
  })

  createdListingIds.push(listing.id)

  return listing
}

/** Puts a live hold into a fresh guest cart and returns that client. */
async function guestHolding(listingId) {
  const guest = createClient()
  const added = await guest.raw('/api/cart/items', {
    method: 'POST',
    body: { listingId },
  })

  assert.equal(added.status, 201, 'fixture listing reserved')

  return guest
}

/** Ages a hold past its window so it has lapsed, as time passing would. */
async function ageHoldPastExpiry(listingId) {
  const expiry = new Date(Date.now() - 60_000)

  await prisma.reservation.updateMany({
    where: { listingId, releasedAt: null },
    data: { expiresAt: expiry, createdAt: new Date(expiry.getTime() - 15 * 60 * 1000) },
  })
}

async function main() {
  server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`

  // ------------------------------------------------------------ options

  console.log('\n— delivery and payment catalogue —')

  {
    const guest = createClient()
    const response = await guest.raw('/api/checkout/options')

    assert.equal(response.status, 200)

    const options = response.json

    assert.equal(options.currency, 'PHP')
    assert.ok(options.zones.length >= 3, 'at least the three island groups are offered')
    assert.ok(
      options.deliveryMethods.some((method) => method.id === 'standard'),
      'standard delivery is offered',
    )
    assert.equal(
      options.paymentMethods.length,
      4,
      'all four payment preferences are offered',
    )

    // Exactly one is real; the rest are labelled demo and collect nothing.
    const real = options.paymentMethods.filter((method) => !method.demo)
    assert.equal(real.length, 1, 'only cash on delivery is not a demo method')
    assert.equal(real[0].id, 'cod')

    for (const method of options.paymentMethods) {
      assert.equal(
        method.collectedCredentials,
        undefined,
        'the options payload exposes no credential field',
      )
    }

    assert.match(
      options.demoPaymentNotice,
      /no payment is processed/i,
      'the demo boundary is stated by the server, not only by a component',
    )
  }

  {
    // A known zone returns that zone's fees; express is Metro Manila only.
    const guest = createClient()
    const provincial = await guest.raw('/api/checkout/options?zoneId=visayas_mindanao')

    assert.equal(provincial.status, 200)
    assert.equal(provincial.json.defaultZoneId, 'visayas_mindanao')
    assert.equal(
      provincial.json.deliveryMethods.some((method) => method.id === 'express'),
      false,
      'express is not offered outside Metro Manila',
    )

    const standard = provincial.json.deliveryMethods.find((m) => m.id === 'standard')
    assert.equal(standard.fee, 169)

    // An unknown zone is refused rather than silently defaulted.
    const bogus = await guest.raw('/api/checkout/options?zoneId=mars')
    assert.equal(bogus.status, 422)
  }

  // -------------------------------------------------------------- pricing

  console.log('— server-side pricing —')

  {
    const listing = await createApprovedListing(12_000)
    const guest = await guestHolding(listing.id)

    const response = await guest.raw('/api/checkout/quote', {
      method: 'POST',
      body: { deliveryMethodId: 'standard', paymentMethodId: 'cod', details: VALID_DETAILS },
    })

    assert.equal(response.status, 200)

    const { quote: priced, delivery, payment, contact, items } = response.json

    // Below the free-delivery threshold, the fee applies and the total is their sum.
    assert.equal(priced.subtotal, 12_000)
    assert.equal(priced.deliveryFee, 79)
    assert.equal(priced.deliveryFeeBeforeDiscount, null)
    assert.equal(priced.freeDeliveryApplied, false)
    assert.equal(priced.total, 12_079)
    assert.equal(priced.itemCount, 1)

    assert.equal(delivery.zoneId, 'metro_manila')
    assert.equal(delivery.minDays, 2)
    assert.equal(delivery.maxDays, 3)

    assert.equal(payment.id, 'cod')
    assert.equal(payment.demo, false)

    // Contact is normalised and echoed back for storage by a future order.
    assert.equal(contact.fullName, 'Maria Santos')
    assert.equal(contact.mobile, '09171234567')
    assert.equal(contact.deliveryNotes, null)

    // Per-device lines carry the live price, not a client figure.
    assert.equal(items.length, 1)
    assert.equal(items[0].listing.id, listing.id)
    assert.equal(items[0].unitPrice, 12_000)
    assert.equal(items[0].lineTotal, 12_000)
    assert.ok(items[0].reservationExpiresAt, 'the line reports its hold expiry')

    await guest.raw('/api/cart', { method: 'DELETE' })
  }

  {
    // At or above the threshold, standard delivery is free and the original fee is
    // reported so the saving is visible rather than just absent.
    const listing = await createApprovedListing(15_000)
    const guest = await guestHolding(listing.id)

    const response = await guest.raw('/api/checkout/quote', {
      method: 'POST',
      body: { deliveryMethodId: 'standard', paymentMethodId: 'cod', details: VALID_DETAILS },
    })

    assert.equal(response.status, 200)
    assert.equal(response.json.quote.freeDeliveryApplied, true)
    assert.equal(response.json.quote.deliveryFee, 0)
    assert.equal(response.json.quote.deliveryFeeBeforeDiscount, 79)
    assert.equal(response.json.quote.total, 15_000)

    await guest.raw('/api/cart', { method: 'DELETE' })
  }

  {
    // Provincial pricing differs from Metro Manila for the same listing price.
    const listing = await createApprovedListing(9_000)
    const guest = await guestHolding(listing.id)

    const response = await guest.raw('/api/checkout/quote', {
      method: 'POST',
      body: {
        deliveryMethodId: 'standard',
        paymentMethodId: 'cod',
        details: { ...VALID_DETAILS, region: 'Davao Region', city: 'Davao City' },
      },
    })

    assert.equal(response.status, 200)
    assert.equal(response.json.delivery.zoneId, 'visayas_mindanao')
    assert.equal(response.json.quote.deliveryFee, 169)
    assert.equal(response.json.quote.total, 9_169)

    await guest.raw('/api/cart', { method: 'DELETE' })
  }

  {
    // A phone sold after it entered a cart must not be quotable.
    const listing = await createApprovedListing(10_000)
    const guest = await guestHolding(listing.id)

    await prisma.listing.update({ where: { id: listing.id }, data: { status: 'SOLD' } })

    const response = await guest.raw('/api/checkout/quote', {
      method: 'POST',
      body: { deliveryMethodId: 'standard', paymentMethodId: 'cod', details: VALID_DETAILS },
    })

    assert.equal(response.status, 409)
    assert.equal(response.json.code, 'CART_HAS_UNAVAILABLE_ITEMS')
    assert.deepEqual(response.json.errors.listingIds, [listing.id])

    await guest.raw('/api/cart', { method: 'DELETE' })
  }

  {
    // A lapsed hold must not be quotable either.
    const listing = await createApprovedListing(10_000)
    const guest = await guestHolding(listing.id)

    await ageHoldPastExpiry(listing.id)

    const response = await guest.raw('/api/checkout/quote', {
      method: 'POST',
      body: { deliveryMethodId: 'standard', paymentMethodId: 'cod', details: VALID_DETAILS },
    })

    assert.equal(response.status, 409)
    assert.equal(response.json.code, 'CART_RESERVATION_EXPIRED')
    assert.deepEqual(response.json.errors.listingIds, [listing.id])

    await guest.raw('/api/cart', { method: 'DELETE' })
  }

  {
    // An empty cart cannot be quoted.
    const guest = createClient()
    const response = await guest.raw('/api/checkout/quote', {
      method: 'POST',
      body: { deliveryMethodId: 'standard', paymentMethodId: 'cod', details: VALID_DETAILS },
    })

    assert.equal(response.status, 409)
    assert.equal(response.json.code, 'CART_EMPTY')
  }

  // ----------------------------------------------------------- validation

  console.log('— validation —')

  {
    const listing = await createApprovedListing(10_000)
    const guest = await guestHolding(listing.id)

    const cases = [
      [{ fullName: '' }, 'fullName', /full name is required/i],
      [{ fullName: 'M' }, 'fullName', /at least 2 characters/i],
      [{ email: 'not-an-email' }, 'email', /valid email/i],
      [{ mobile: '123' }, 'mobile', /philippine mobile/i],
      [{ mobile: '09171234567 09181234567' }, 'mobile', /philippine mobile/i],
      [{ region: '' }, 'region', /select a delivery region/i],
      [{ province: '' }, 'province', /province is required/i],
      [{ city: '' }, 'city', /city or municipality is required/i],
      [{ barangay: '' }, 'barangay', /barangay is required/i],
      [{ street: '' }, 'street', /house number, street/i],
      [{ street: '12B' }, 'street', /full street address/i],
      [{ postalCode: '99' }, 'postalCode', /4-digit philippine postal code/i],
      [{ postalCode: '11O0' }, 'postalCode', /4-digit philippine postal code/i],
    ]

    for (const [overrides, field, pattern] of cases) {
      const response = await guest.raw('/api/checkout/quote', {
        method: 'POST',
        body: {
          deliveryMethodId: 'standard',
          paymentMethodId: 'cod',
          details: { ...VALID_DETAILS, ...overrides },
        },
      })

      assert.equal(response.status, 422, `${JSON.stringify(overrides)} is refused`)

      // Every message is keyed to the offending field by its bare name, so a
      // form can highlight the right input without knowing which layer caught it.
      const message = response.json.errors[field]
      assert.ok(message, `${field} has its own error message`)
      assert.match(message, pattern)
    }

    // A mobile number a person would actually type is accepted.
    const formatted = await guest.raw('/api/checkout/quote', {
      method: 'POST',
      body: {
        deliveryMethodId: 'standard',
        paymentMethodId: 'cod',
        details: { ...VALID_DETAILS, mobile: '0917 123 4567' },
      },
    })

    assert.equal(formatted.status, 200, 'separators in a mobile number are tolerated')
    assert.equal(formatted.json.contact.mobile, '09171234567', 'and normalised for storage')

    await guest.raw('/api/cart', { method: 'DELETE' })
  }

  {
    // A method that does not serve the buyer's region is refused with a named field.
    const listing = await createApprovedListing(10_000)
    const guest = await guestHolding(listing.id)

    const response = await guest.raw('/api/checkout/quote', {
      method: 'POST',
      body: {
        deliveryMethodId: 'express',
        paymentMethodId: 'cod',
        details: { ...VALID_DETAILS, region: 'Region VII', city: 'Cebu City' },
      },
    })

    assert.equal(response.status, 422)
    assert.equal(response.json.code, 'CHECKOUT_VALIDATION_ERROR')
    assert.ok(response.json.errors.deliveryMethodId)

    // The same method is accepted in a region that does have it.
    const inMetro = await guest.raw('/api/checkout/quote', {
      method: 'POST',
      body: { deliveryMethodId: 'express', paymentMethodId: 'gcash', details: VALID_DETAILS },
    })

    assert.equal(inMetro.status, 200)
    assert.equal(inMetro.json.quote.deliveryFee, 199)
    assert.equal(inMetro.json.payment.demo, true, 'GCash is reported as a demo method')

    await guest.raw('/api/cart', { method: 'DELETE' })
  }

  // ------------------------------------------------------------- security

  console.log('— security —')

  {
    // No client-supplied money is accepted, by any spelling.
    const listing = await createApprovedListing(10_000)
    const guest = await guestHolding(listing.id)

    for (const field of ['total', 'subtotal', 'deliveryFee', 'quantity', 'price', 'userId']) {
      const response = await guest.raw('/api/checkout/quote', {
        method: 'POST',
        body: {
          deliveryMethodId: 'standard',
          paymentMethodId: 'cod',
          details: VALID_DETAILS,
          [field]: field === 'quantity' ? 5 : 1,
        },
      })

      assert.equal(response.status, 422, `${field} is refused`)
      assert.equal(response.json.code, 'VALIDATION_ERROR')
    }

    // The price is still the listing's own after all of that.
    const priced = await guest.raw('/api/checkout/quote', {
      method: 'POST',
      body: { deliveryMethodId: 'standard', paymentMethodId: 'cod', details: VALID_DETAILS },
    })

    assert.equal(priced.json.quote.subtotal, 10_000)

    await guest.raw('/api/cart', { method: 'DELETE' })
  }

  {
    // One buyer's cart cannot be priced through another's cart line.
    const listing = await createApprovedListing(10_000)
    const owner = await guestHolding(listing.id)

    const stranger = createClient()
    const response = await stranger.raw('/api/checkout/quote', {
      method: 'POST',
      body: { deliveryMethodId: 'standard', paymentMethodId: 'cod', details: VALID_DETAILS },
    })

    // The stranger has no cart of their own, so this is an empty-cart refusal rather
    // than a quote of somebody else's device.
    assert.equal(response.status, 409)
    assert.equal(response.json.code, 'CART_EMPTY')

    assert.equal(
      (await owner.raw('/api/cart')).json.cart.itemCount,
      1,
      'the owner still holds their device',
    )

    await owner.raw('/api/cart', { method: 'DELETE' })
  }

  {
    // A seller cannot quote a purchase of their own device.
    const sellerClient = createClient()
    const signedIn = await sellerClient.raw('/api/auth/login', {
      method: 'POST',
      body: { email: 'seller@refon.test', password: SELLER_PASSWORD },
    })

    assert.equal(signedIn.status, 200)

    const ownListing = await prisma.listing.findFirst({
      where: { seller: { userId: signedIn.json.user.id }, status: 'APPROVED' },
      select: { id: true },
    })

    assert.ok(ownListing, 'the demo seller has approved inventory')

    const blocked = await sellerClient.raw('/api/cart/items', {
      method: 'POST',
      body: { listingId: ownListing.id },
    })

    assert.equal(blocked.status, 409)
    assert.equal(blocked.json.code, 'OWN_LISTING_NOT_PURCHASABLE')
  }

  {
    // An authenticated buyer's quote is their own, and the guest cart is merged on
    // sign-in so the devices they were holding travel with them.
    const listing = await createApprovedListing(11_000)
    const guest = await guestHolding(listing.id)

    const email = `checkout-buyer-${stamp}@example.test`
    const registered = await guest.raw('/api/auth/register', {
      method: 'POST',
      body: { name: 'Checkout Buyer', email, password: BUYER_PASSWORD, role: 'BUYER' },
    })

    assert.equal(registered.status, 201)
    createdUserIds.push(registered.json.user.id)

    const response = await guest.raw('/api/checkout/quote', {
      method: 'POST',
      body: { deliveryMethodId: 'standard', paymentMethodId: 'cod', details: VALID_DETAILS },
    })

    assert.equal(response.status, 200)
    assert.equal(response.json.quote.subtotal, 11_000)
    assert.equal(response.json.quote.itemCount, 1)

    const cartRow = await prisma.cart.findUnique({
      where: { userId: registered.json.user.id },
      select: { id: true },
    })

    assert.ok(cartRow, 'the merged cart belongs to the account')
    createdCartIds.push(cartRow.id)
  }

  console.log(
    '\nCheckout E2E passed: zone-based delivery catalogue served from one configuration ' +
      'with express restricted to Metro Manila and enforced server-side; free standard ' +
      'delivery at and above the threshold with the waived fee still reported; totals ' +
      'computed from listing rows; sold and lapsed devices refused with per-listing ids; ' +
      'empty carts refused; thirteen field-level validation messages keyed to their own ' +
      'field; mobile numbers accepted as typed and normalised; client-supplied total, ' +
      'subtotal, fee, quantity, price, and userId all refused; one buyer unable to price ' +
      "another's cart; a seller unable to buy their own device; and a guest cart merging " +
      'into an account on sign-in so the held devices travel with the buyer.',
  )
}

try {
  await main()
} finally {
  // Reservations and cart lines restrict listings; listings restrict sellers;
  // sellers restrict users. The order below is not arbitrary.
  await prisma.reservation.deleteMany({})
  await prisma.cartItem.deleteMany({})
  await prisma.cart.deleteMany({})
  await prisma.listing.deleteMany({ where: { id: { in: createdListingIds } } })
  await prisma.seller.deleteMany({ where: { userId: { in: createdUserIds } } })
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  await prisma.$disconnect()
  server?.close()
}
