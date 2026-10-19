import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'

/**
 * Techno Fair booth features, against a real server and database:
 *
 * - Booth feedback: anyone can rate ReFon, bad input is refused, and only an
 *   admin can read the results.
 * - Price-drop alerts: a seller can only lower the price of a live listing, and
 *   every buyer who saved it gets a PRICE_DROP notification.
 * - Booth settings: anyone can read the booth number, Viber link and
 *   announcement, only an admin can change them, and bad values are refused.
 *
 * Everything this suite creates is removed at the end.
 */

process.env.NODE_ENV = 'test'

const stamp = `${Date.now()}-booth`
const { default: app } = await import(`../src/app.js?booth-e2e=${stamp}`)
const prisma = new PrismaClient()

const PASSWORD = 'BoothTest123!'
const SEED_PHOTO = '/uploads/seed/phone-front.svg'

const createdUserIds = []
const createdFeedbackIds = []
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
  const email = `booth-${role.toLowerCase()}-${crypto.randomUUID()}@example.test`
  const response = await client.raw('/api/auth/register', {
    method: 'POST',
    body: { name: `Booth ${role}`, email, password: PASSWORD, role },
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

try {
  console.log('— Booth feedback —')

  await test('a visitor can rate ReFon without signing in', async () => {
    const before = await prisma.feedback.findMany({ select: { id: true } })
    const response = await createClient().raw('/api/feedback', {
      method: 'POST',
      body: { rating: 5, wouldBuy: 'YES', comment: `  Booth test ${stamp}  ` },
    })
    assert.equal(response.status, 201)
    const known = new Set(before.map((row) => row.id))
    const created = (await prisma.feedback.findMany()).filter((row) => !known.has(row.id))
    createdFeedbackIds.push(...created.map((row) => row.id))
    assert.equal(created.length, 1)
    assert.equal(created[0].comment, `Booth test ${stamp}`, 'comment is trimmed')
  })

  await test('out-of-range ratings and unknown answers are refused', async () => {
    const client = createClient()
    for (const body of [
      { rating: 0, wouldBuy: 'YES' },
      { rating: 6, wouldBuy: 'YES' },
      { rating: 4, wouldBuy: 'DEFINITELY' },
      { rating: 4, wouldBuy: 'YES', extra: true },
    ]) {
      const response = await client.raw('/api/feedback', { method: 'POST', body })
      assert.equal(response.status, 422, JSON.stringify(body))
    }
  })

  await test('only an admin can read the results', async () => {
    assert.equal((await createClient().raw('/api/admin/feedback')).status, 401)
    const { client: buyer } = await register('BUYER')
    assert.equal((await buyer.raw('/api/admin/feedback')).status, 403)
    const response = await (await adminClient()).raw('/api/admin/feedback')
    assert.equal(response.status, 200)
    const { feedback } = response.json
    assert.ok(feedback.total >= 1)
    assert.ok(feedback.wouldBuy.YES >= 1)
    assert.ok(feedback.latest.some((entry) => entry.comment === `Booth test ${stamp}`))
  })

  console.log('— Price-drop alerts —')

  const { client: seller, user: sellerUser } = await register('SELLER')
  const sellerRow = await prisma.seller.upsert({
    where: { userId: sellerUser.id },
    update: { verificationStatus: 'APPROVED' },
    create: {
      userId: sellerUser.id,
      businessName: 'Booth Fixture Shop',
      contactInfo: 'booth-fixture@example.test',
      verificationStatus: 'APPROVED',
    },
  })
  async function listing(status, overrides = {}) {
    const model = `Boothfone ${crypto.randomUUID().slice(0, 8)}`
    return prisma.listing.create({
      data: {
        sellerId: sellerRow.id,
        brand: 'Boothworks',
        model,
        slug: model.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        year: 2021,
        price: 20000,
        batteryPercent: 90,
        storage: '128 GB',
        cosmeticCondition: 'Like New',
        conditionGrade: 'A',
        conditionNotes: 'Created for the booth test suite.',
        photos: [SEED_PHOTO],
        status,
        ...overrides,
      },
    })
  }

  const live = await listing('APPROVED', { originalPrice: 21000, discountPercent: 5 })
  const { client: saver, user: saverUser } = await register('BUYER')
  const { user: otherBuyer } = await register('BUYER')

  await test('a buyer saves the live phone', async () => {
    assert.equal((await saver.raw(`/api/favorites/${live.id}`, { method: 'PUT' })).status, 200)
  })

  await test('a price that is not lower is refused', async () => {
    for (const price of [20000, 25000]) {
      const response = await seller.raw(`/api/listings/${live.id}/price`, {
        method: 'PATCH',
        body: { price },
      })
      assert.equal(response.status, 422)
      assert.equal(response.json.code, 'PRICE_NOT_LOWER')
    }
  })

  await test('a buyer cannot change a price', async () => {
    const response = await saver.raw(`/api/listings/${live.id}/price`, {
      method: 'PATCH',
      body: { price: 100 },
    })
    assert.equal(response.status, 403)
  })

  await test('a pending listing cannot get a price drop', async () => {
    const pending = await listing('PENDING')
    const response = await seller.raw(`/api/listings/${pending.id}/price`, {
      method: 'PATCH',
      body: { price: 15000 },
    })
    assert.equal(response.status, 409)
  })

  await test('lowering the price alerts only the buyers who saved it', async () => {
    const response = await seller.raw(`/api/listings/${live.id}/price`, {
      method: 'PATCH',
      body: { price: 18500 },
    })
    assert.equal(response.status, 200)
    assert.equal(response.json.notified, 1)
    assert.equal(Number(response.json.listing.price), 18500)

    const alerts = await prisma.notification.findMany({
      where: { relatedListingId: live.id, type: 'PRICE_DROP' },
    })
    assert.deepEqual(alerts.map((alert) => alert.userId), [saverUser.id])
    assert.match(alerts[0].message, /now ₱18,500 \(was ₱20,000\)/)
    assert.ok(!alerts.some((alert) => alert.userId === otherBuyer.id))

    const stored = await prisma.listing.findUnique({ where: { id: live.id } })
    assert.equal(Number(stored.originalPrice), 21000, 'reference price still above stays')
    assert.equal(stored.discountPercent, 12)
  })

  await test('a reference price at or below the new price is dropped', async () => {
    await prisma.listing.update({ where: { id: live.id }, data: { originalPrice: 16000 } })
    const response = await seller.raw(`/api/listings/${live.id}/price`, {
      method: 'PATCH',
      body: { price: 16000 },
    })
    assert.equal(response.status, 200)
    const stored = await prisma.listing.findUnique({ where: { id: live.id } })
    assert.equal(stored.originalPrice, null, 'no fake discount')
    assert.equal(stored.discountPercent, 0)
  })
  console.log('— Booth settings —')

  const settingsBefore = await prisma.siteSetting.findMany()
  try {
    await test('anyone can read the booth settings', async () => {
      const response = await createClient().raw('/api/site-settings')
      assert.equal(response.status, 200)
      for (const key of ['booth', 'viber', 'announcement']) assert.ok(key in response.json.settings, key)
    })

    await test('only an admin can change them', async () => {
      const body = { booth: '12' }
      assert.equal((await createClient().raw('/api/admin/site-settings', { method: 'PATCH', body })).status, 401)
      const { client: buyer } = await register('BUYER')
      assert.equal((await buyer.raw('/api/admin/site-settings', { method: 'PATCH', body })).status, 403)
    })

    await test('an admin changes the booth number, Viber link and announcement', async () => {
      const admin = await adminClient()
      const viber = 'https://invite.viber.com/?g2=AQBtest'
      const announcement = 'Visit us at Booth #B-12: free phone health check!'
      const saved = await admin.raw('/api/admin/site-settings', {
        method: 'PATCH',
        body: { booth: ' B-12 ', viber, announcement: `  ${announcement} ` },
      })
      assert.equal(saved.status, 200)
      assert.deepEqual(saved.json.settings, { booth: 'B-12', viber, announcement })
      const read = await createClient().raw('/api/site-settings')
      assert.deepEqual(read.json.settings, { booth: 'B-12', viber, announcement })

      const cleared = await admin.raw('/api/admin/site-settings', {
        method: 'PATCH',
        body: { viber: '', announcement: '' },
      })
      assert.equal(cleared.status, 200)
      assert.deepEqual(
        cleared.json.settings,
        { booth: 'B-12', viber: null, announcement: null },
        'empty values clear them',
      )
    })

    await test('bad values are refused', async () => {
      const admin = await adminClient()
      for (const body of [
        {},
        { booth: '' },
        { booth: '<b>7</b>' },
        { booth: '12345678901' },
        { viber: 'https://evil.example/viber' },
        { viber: 'javascript:alert(1)' },
        { announcement: 'x'.repeat(141) },
        { booth: '7', extra: true },
      ]) {
        const response = await admin.raw('/api/admin/site-settings', { method: 'PATCH', body })
        assert.equal(response.status, 422, JSON.stringify(body))
      }
    })
  } finally {
    await prisma.siteSetting.deleteMany()
    if (settingsBefore.length > 0) {
      await prisma.siteSetting.createMany({
        data: settingsBefore.map(({ key, value }) => ({ key, value })),
      })
    }
  }
} finally {
  await prisma.feedback.deleteMany({ where: { id: { in: createdFeedbackIds } } })
  // Listings first, then seller rows; users then cascade to favorites and notifications.
  await prisma.listing.deleteMany({ where: { seller: { userId: { in: createdUserIds } } } })
  await prisma.seller.deleteMany({ where: { userId: { in: createdUserIds } } })
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  await prisma.$disconnect()
  await new Promise((resolve) => server.close(resolve))
}

if (failures.length > 0) {
  console.error(`\n${failures.length} booth test(s) failed.`)
  process.exit(1)
}
console.log('\nBooth tests passed: feedback, price-drop alerts and booth settings work end to end.')
process.exit(0)
