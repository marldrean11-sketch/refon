import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'

/**
 * IMEI handling, against a real server and database:
 *
 * - A seller types the full IMEI once; only the last four digits are kept and
 *   the Luhn check digit must be right.
 * - The same phone cannot be on two pending or live listings.
 * - Only a moderator can mark the IMEI verified, on approval, and only when an
 *   IMEI is on file. Editing a listing sends the check back to pending.
 *
 * Everything this suite creates is removed at the end.
 */

process.env.NODE_ENV = 'test'

const stamp = `${Date.now()}-imei`
const { default: app } = await import(`../src/app.js?imei-e2e=${stamp}`)
const prisma = new PrismaClient()

const PASSWORD = 'ImeiTest1234!'
const SEED_PHOTO = '/uploads/seed/phone-front.svg'

const createdUserIds = []
let server
let baseUrl

function createClient() {
  const cookies = new Map()
  return {
    async raw(path, { method = 'GET', body } = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(cookies.size > 0
            ? { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') }
            : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      for (const entry of response.headers.getSetCookie?.() ?? []) {
        const [pair] = entry.split(';')
        const index = pair.indexOf('=')
        const value = pair.slice(index + 1)
        if (value === '') cookies.delete(pair.slice(0, index))
        else cookies.set(pair.slice(0, index), value)
      }
      const json = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : null
      return { status: response.status, json }
    },
  }
}

async function register(role) {
  const client = createClient()
  const email = `imei-${role.toLowerCase()}-${crypto.randomUUID()}@example.test`
  const response = await client.raw('/api/auth/register', {
    method: 'POST',
    body: { name: `Imei ${role}`, email, password: PASSWORD, role },
  })
  assert.equal(response.status, 201, `register ${role}`)
  createdUserIds.push(response.json.user.id)
  return { client, user: response.json.user }
}

async function adminClient() {
  const client = createClient()
  const response = await client.raw('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@refon.test', password: 'AdminTest123!' },
  })
  assert.equal(response.status, 200, 'admin sign in')
  return client
}

const failures = []
async function test(name, run) {
  try {
    await run()
    console.log(`  ok  ${name}`)
  } catch (error) {
    failures.push({ name, error })
    console.log(`  FAIL ${name}: ${error.message}`)
  }
}

server = createServer(app)
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
baseUrl = `http://127.0.0.1:${server.address().port}`


// Valid example IMEIs (correct Luhn check digits) not used by any other suite.
const IMEI_A = '490154203237518'
const IMEI_B = '356938035643809'

function listingBody(overrides = {}) {
  return {
    brand: 'Imeiworks',
    model: `Checkphone ${crypto.randomUUID().slice(0, 6)}`,
    year: 2022,
    price: 15000,
    batteryPercent: 90,
    storage: '128 GB',
    condition: 'Good',
    conditionNotes: 'Created by the IMEI test suite.',
    photos: [SEED_PHOTO],
    ...overrides,
  }
}

try {
  const { client: seller, user: sellerUser } = await register('SELLER')
  await prisma.seller.upsert({
    where: { userId: sellerUser.id },
    update: { verificationStatus: 'APPROVED' },
    create: {
      userId: sellerUser.id,
      businessName: 'Imei Fixture Shop',
      contactInfo: 'imei-fixture@example.test',
      verificationStatus: 'APPROVED',
    },
  })
  const admin = await adminClient()
  let first

  console.log('— Seller side —')

  await test('the full IMEI is reduced to its last four digits', async () => {
    const response = await seller.raw('/api/listings', {
      method: 'POST',
      body: listingBody({ imei: '49 015420 323751 8' }),
    })
    assert.equal(response.status, 201)
    first = response.json.listing
    assert.equal(first.imeiLast4, '7518')
    assert.equal(first.imeiOnFile, true)
    assert.equal(first.imeiVerified, false)
    assert.ok(!JSON.stringify(response.json).includes(IMEI_A), 'full IMEI never returned')
    const row = await prisma.listing.findUnique({ where: { id: first.id } })
    assert.match(row.imeiHash, /^[0-9a-f]{64}$/, 'a fingerprint is stored')
    assert.ok(!JSON.stringify(row).includes(IMEI_A), 'full IMEI never stored')
  })

  await test('a wrong check digit or length is refused', async () => {
    for (const imei of ['490154203237519', '49015420323751', 'abcdefghijklmno']) {
      const response = await seller.raw('/api/listings', { method: 'POST', body: listingBody({ imei }) })
      assert.equal(response.status, 422, imei)
    }
  })

  await test('the same IMEI cannot be on two pending or live listings', async () => {
    const response = await seller.raw('/api/listings', {
      method: 'POST',
      body: listingBody({ imei: IMEI_A }),
    })
    assert.equal(response.status, 409)
    assert.equal(response.json.code, 'IMEI_ALREADY_LISTED')
  })

  await test('a listing without an IMEI is still accepted, just not on file', async () => {
    const response = await seller.raw('/api/listings', { method: 'POST', body: listingBody() })
    assert.equal(response.status, 201)
    assert.equal(response.json.listing.imeiOnFile, false)
    assert.equal(response.json.listing.imeiLast4, null)
  })

  console.log('— Moderator side —')

  await test('an IMEI check cannot be recorded without an IMEI', async () => {
    const bare = await seller.raw('/api/listings', { method: 'POST', body: listingBody() })
    const response = await admin.raw(`/api/admin/listings/${bare.json.listing.id}/approve`, {
      method: 'PATCH',
      body: { imeiChecked: true },
    })
    assert.equal(response.status, 422)
    assert.equal(response.json.code, 'IMEI_NOT_PROVIDED')
  })

  await test('approving without the check leaves the IMEI unverified', async () => {
    const other = await seller.raw('/api/listings', {
      method: 'POST',
      body: listingBody({ imei: IMEI_B }),
    })
    const response = await admin.raw(`/api/admin/listings/${other.json.listing.id}/approve`, {
      method: 'PATCH',
    })
    assert.equal(response.status, 200)
    assert.equal(response.json.listing.imeiVerified, false)
    assert.equal(response.json.listing.imeiCheckedAt, null)
  })

  await test('approving with the check marks the IMEI verified by ReFon', async () => {
    const response = await admin.raw(`/api/admin/listings/${first.id}/approve`, {
      method: 'PATCH',
      body: { imeiChecked: true },
    })
    assert.equal(response.status, 200)
    assert.equal(response.json.listing.imeiVerified, true)
    assert.ok(response.json.listing.imeiCheckedAt)
  })

  await test('a seller cannot record the check themselves', async () => {
    const response = await seller.raw(`/api/admin/listings/${first.id}/approve`, {
      method: 'PATCH',
      body: { imeiChecked: true },
    })
    assert.equal(response.status, 403)
  })

  await test('editing a listing sends the IMEI check back to pending', async () => {
    const pending = await seller.raw('/api/listings', { method: 'POST', body: listingBody() })
    await prisma.listing.update({
      where: { id: pending.json.listing.id },
      data: { status: 'REJECTED', imeiVerified: true, imeiCheckedAt: new Date() },
    })
    const response = await seller.raw(`/api/listings/${pending.json.listing.id}`, {
      method: 'PUT',
      body: listingBody({ model: pending.json.listing.model, price: 14500 }),
    })
    assert.equal(response.status, 200)
    assert.equal(response.json.listing.imeiVerified, false)
    assert.equal(response.json.listing.imeiCheckedAt, null)
  })
} finally {
  await prisma.listing.deleteMany({ where: { seller: { userId: { in: createdUserIds } } } })
  await prisma.seller.deleteMany({ where: { userId: { in: createdUserIds } } })
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  await prisma.$disconnect()
  await new Promise((resolve) => server.close(resolve))
}

if (failures.length > 0) {
  console.error(`\n${failures.length} IMEI test(s) failed.`)
  process.exit(1)
}
console.log('\nIMEI tests passed: last four digits only, Luhn-checked, one listing per phone, verified only by a moderator.')
process.exit(0)
