import assert from 'node:assert/strict'
import cookieParser from 'cookie-parser'
import express from 'express'

process.env.NODE_ENV = 'test'

const testRun = Date.now()
const { default: app } = await import(
  new URL(`../src/app.js?auth-e2e=${testRun}`, import.meta.url)
)
const { prisma } = await import(
  new URL(`../src/config/prisma.js?auth-e2e=${testRun}`, import.meta.url)
)
const { authenticate, requireAdmin, requireBuyer, requireSeller } = await import(
  new URL(
    `../src/middlewares/auth.middleware.js?auth-e2e=${testRun}`,
    import.meta.url,
  )
)
const { errorHandler } = await import(
  new URL(
    `../src/middlewares/error.middleware.js?auth-e2e=${testRun}`,
    import.meta.url,
  )
)

const guardApp = express()
guardApp.use(cookieParser())
guardApp.get('/test/buyer', authenticate, requireBuyer, (req, res) => {
  res.json({ user: req.user })
})
guardApp.get('/test/seller', authenticate, requireSeller, (req, res) => {
  res.json({ user: req.user })
})
guardApp.get('/test/admin', authenticate, requireAdmin, (req, res) => {
  res.json({ user: req.user })
})
guardApp.use(errorHandler)

const apiServer = app.listen(0, '127.0.0.1')
const guardServer = guardApp.listen(0, '127.0.0.1')
await Promise.all([
  new Promise((resolve) => apiServer.once('listening', resolve)),
  new Promise((resolve) => guardServer.once('listening', resolve)),
])

const apiBase = `http://127.0.0.1:${apiServer.address().port}`
const guardBase = `http://127.0.0.1:${guardServer.address().port}`
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
const buyerEmail = `buyer-${suffix}@example.test`
const sellerEmail = `seller-${suffix}@example.test`
const password = 'RefonPass123!'
let buyerId
let sellerId

function cookieFrom(response) {
  const setCookies = response.headers.getSetCookie?.() ?? []
  return setCookies[0]?.split(';')[0] ?? null
}

async function jsonRequest(url, { cookie, ...options } = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
    ...options.headers,
  }

  return fetch(url, { ...options, headers })
}

try {
  const buyerRegistration = await jsonRequest(`${apiBase}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Buyer',
      email: buyerEmail,
      password,
      role: 'BUYER',
    }),
  })
  assert.equal(buyerRegistration.status, 201)
  const buyerPayload = await buyerRegistration.json()
  buyerId = buyerPayload.user.id
  assert.equal(buyerPayload.user.role, 'BUYER')
  assert.equal(buyerPayload.user.passwordHash, undefined)
  const buyerCookie = cookieFrom(buyerRegistration)
  assert.ok(buyerCookie?.startsWith('refon_token='))

  const storedBuyer = await prisma.user.findUniqueOrThrow({ where: { id: buyerId } })
  assert.notEqual(storedBuyer.passwordHash, password)
  assert.match(storedBuyer.passwordHash, /^\$2[aby]\$/)

  const buyerSession = await jsonRequest(`${apiBase}/api/auth/me`, {
    cookie: buyerCookie,
  })
  assert.equal(buyerSession.status, 200)
  assert.equal((await buyerSession.json()).user.email, buyerEmail)

  assert.equal(
    (await jsonRequest(`${guardBase}/test/buyer`, { cookie: buyerCookie })).status,
    200,
  )
  assert.equal(
    (await jsonRequest(`${guardBase}/test/seller`, { cookie: buyerCookie })).status,
    403,
  )
  assert.equal(
    (await jsonRequest(`${guardBase}/test/admin`, { cookie: buyerCookie })).status,
    403,
  )

  const wrongLogin = await jsonRequest(`${apiBase}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: buyerEmail, password: 'WrongPassword123!' }),
  })
  assert.equal(wrongLogin.status, 401)

  const buyerLogin = await jsonRequest(`${apiBase}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: buyerEmail, password }),
  })
  assert.equal(buyerLogin.status, 200)
  assert.ok(cookieFrom(buyerLogin))

  const sellerRegistration = await jsonRequest(`${apiBase}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Seller',
      email: sellerEmail,
      password,
      role: 'SELLER',
    }),
  })
  assert.equal(sellerRegistration.status, 201)
  const sellerPayload = await sellerRegistration.json()
  sellerId = sellerPayload.user.id
  assert.equal(sellerPayload.user.role, 'SELLER')
  assert.equal(sellerPayload.user.sellerVerificationStatus, 'PENDING')
  const sellerCookie = cookieFrom(sellerRegistration)
  const sellerProfile = await prisma.seller.findUniqueOrThrow({
    where: { userId: sellerId },
  })
  assert.equal(sellerProfile.verificationStatus, 'PENDING')
  assert.equal(sellerProfile.businessName, 'Test Seller')
  assert.equal(sellerProfile.contactInfo, sellerEmail)
  assert.equal(
    (await jsonRequest(`${guardBase}/test/seller`, { cookie: sellerCookie })).status,
    200,
  )
  assert.equal(
    (await jsonRequest(`${guardBase}/test/buyer`, { cookie: sellerCookie })).status,
    403,
  )

  const duplicateRegistration = await jsonRequest(`${apiBase}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Duplicate',
      email: buyerEmail,
      password,
      role: 'BUYER',
    }),
  })
  assert.equal(duplicateRegistration.status, 409)

  const invalidRegistration = await jsonRequest(`${apiBase}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'A',
      email: 'bad',
      password: 'short',
      role: 'ADMIN',
    }),
  })
  assert.equal(invalidRegistration.status, 422)
  const validationPayload = await invalidRegistration.json()
  assert.equal(validationPayload.code, 'VALIDATION_ERROR')
  assert.ok(validationPayload.errors.name)
  assert.ok(validationPayload.errors.email)
  assert.ok(validationPayload.errors.password)
  assert.ok(validationPayload.errors.role)

  const noSession = await jsonRequest(`${apiBase}/api/auth/me`)
  assert.equal(noSession.status, 401)

  const logout = await jsonRequest(`${apiBase}/api/auth/logout`, { method: 'POST' })
  assert.equal(logout.status, 204)
  assert.match(logout.headers.get('set-cookie') ?? '', /^refon_token=;/)

  console.log(
    'Auth E2E passed: registration, login, session restore, guards, seller profile, validation, logout',
  )
} finally {
  const userIds = [buyerId, sellerId].filter(Boolean)
  if (userIds.length > 0) {
    await prisma.seller.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  }
  await Promise.all([
    new Promise((resolve) => apiServer.close(resolve)),
    new Promise((resolve) => guardServer.close(resolve)),
  ])
  await prisma.$disconnect()
}
