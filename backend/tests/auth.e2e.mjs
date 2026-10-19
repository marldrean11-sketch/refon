import assert from 'node:assert/strict'
import fs from 'node:fs'
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
const { mailOutboxPath } = await import(
  new URL(`../src/services/mail.service.js?auth-e2e=${testRun}`, import.meta.url)
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
let storeSellerId

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

/** Reads the outbox and returns the newest message sent to an address. */
function latestMailTo(email, subjectMatch) {
  if (!fs.existsSync(mailOutboxPath)) {
    return null
  }

  const lines = fs
    .readFileSync(mailOutboxPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((entry) => entry.to === email)

  return lines.filter((entry) => subjectMatch.test(entry.subject)).at(-1) ?? null
}

function tokenFromLink(text, pathname) {
  const match = new RegExp(`${pathname}\\?token=([A-Za-z0-9_-]+)`).exec(text)
  return match ? match[1] : null
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

  // A seller can name their store at sign-up; a too-short name is refused.
  const storeSellerEmail = `store-seller-${suffix}@example.test`
  const shortStoreName = await jsonRequest(`${apiBase}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Store Seller',
      email: storeSellerEmail,
      password,
      role: 'SELLER',
      businessName: 'X',
    }),
  })
  assert.equal(shortStoreName.status, 422)
  const storeSellerRegistration = await jsonRequest(`${apiBase}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Store Seller',
      email: storeSellerEmail,
      password,
      role: 'SELLER',
      businessName: '  JDC Phones  ',
    }),
  })
  assert.equal(storeSellerRegistration.status, 201)
  storeSellerId = (await storeSellerRegistration.json()).user.id
  const storeSellerProfile = await prisma.seller.findUniqueOrThrow({
    where: { userId: storeSellerId },
  })
  assert.equal(storeSellerProfile.businessName, 'JDC Phones')

  // The seller can rename the store later from Store look, but not blank it.
  const storeSellerCookie = cookieFrom(storeSellerRegistration)
  const renamed = await jsonRequest(`${apiBase}/api/sellers/me/storefront`, {
    method: 'PATCH',
    cookie: storeSellerCookie,
    body: JSON.stringify({ businessName: ' JDC Phones Taguig ' }),
  })
  assert.equal(renamed.status, 200)
  const renamedBody = await renamed.json()
  assert.equal(renamedBody.seller.businessName, 'JDC Phones Taguig')
  assert.equal(renamedBody.seller.storefront.businessName, 'JDC Phones Taguig')
  const blanked = await jsonRequest(`${apiBase}/api/sellers/me/storefront`, {
    method: 'PATCH',
    cookie: storeSellerCookie,
    body: JSON.stringify({ businessName: '' }),
  })
  assert.equal(blanked.status, 422)

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

  // --- Email verification ---
  assert.equal(buyerPayload.user.emailVerified, false)
  const verifyMail = latestMailTo(buyerEmail, /verify your refon email/i)
  assert.ok(verifyMail, 'a verification email is written to the outbox')
  const verifyToken = tokenFromLink(verifyMail.text, '/verify-email')
  assert.ok(verifyToken, 'the verification email carries a token link')

  const badVerify = await jsonRequest(`${apiBase}/api/auth/verify-email`, {
    method: 'POST',
    body: JSON.stringify({ token: 'not-a-real-token' }),
  })
  assert.equal(badVerify.status, 400)
  assert.equal((await badVerify.json()).code, 'INVALID_OR_EXPIRED_TOKEN')

  const verifyResult = await jsonRequest(`${apiBase}/api/auth/verify-email`, {
    method: 'POST',
    body: JSON.stringify({ token: verifyToken }),
  })
  assert.equal(verifyResult.status, 200)
  assert.equal((await verifyResult.json()).user.emailVerified, true)

  const meAfterVerify = await jsonRequest(`${apiBase}/api/auth/me`, {
    cookie: buyerCookie,
  })
  assert.equal((await meAfterVerify.json()).user.emailVerified, true)

  const reuseVerify = await jsonRequest(`${apiBase}/api/auth/verify-email`, {
    method: 'POST',
    body: JSON.stringify({ token: verifyToken }),
  })
  assert.equal(reuseVerify.status, 400)

  const resendVerified = await jsonRequest(
    `${apiBase}/api/auth/resend-verification`,
    { method: 'POST', cookie: buyerCookie },
  )
  assert.equal(resendVerified.status, 409)
  assert.equal((await resendVerified.json()).code, 'EMAIL_ALREADY_VERIFIED')

  const resendUnverified = await jsonRequest(
    `${apiBase}/api/auth/resend-verification`,
    { method: 'POST', cookie: sellerCookie },
  )
  assert.equal(resendUnverified.status, 200)
  const resendMail = latestMailTo(sellerEmail, /verify your refon email/i)
  assert.ok(resendMail, 'resend writes a fresh verification email')
  const sellerVerifyToken = tokenFromLink(resendMail.text, '/verify-email')
  assert.ok(sellerVerifyToken)
  assert.notEqual(sellerVerifyToken, verifyToken)

  const anonymousResend = await jsonRequest(
    `${apiBase}/api/auth/resend-verification`,
    { method: 'POST' },
  )
  assert.equal(anonymousResend.status, 401)

  // --- Forgot password ---
  const forgotKnown = await jsonRequest(`${apiBase}/api/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email: buyerEmail }),
  })
  assert.equal(forgotKnown.status, 200)
  const forgotKnownBody = await forgotKnown.json()

  const forgotUnknown = await jsonRequest(`${apiBase}/api/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email: `nobody-${suffix}@example.test` }),
  })
  assert.equal(forgotUnknown.status, 200)
  // Identical body, so the endpoint cannot be used to probe for accounts.
  assert.deepEqual(await forgotUnknown.json(), forgotKnownBody)

  const resetMail = latestMailTo(buyerEmail, /reset your refon password/i)
  assert.ok(resetMail, 'a reset email is written to the outbox')
  const resetToken = tokenFromLink(resetMail.text, '/reset-password')
  assert.ok(resetToken)

  // --- Reset password ---
  const badReset = await jsonRequest(`${apiBase}/api/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ token: 'nope', password: 'AnotherPass123!' }),
  })
  assert.equal(badReset.status, 400)

  const resetResult = await jsonRequest(`${apiBase}/api/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ token: resetToken, password: 'BrandNewPass123!' }),
  })
  assert.equal(resetResult.status, 200)

  const oldPasswordLogin = await jsonRequest(`${apiBase}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: buyerEmail, password }),
  })
  assert.equal(oldPasswordLogin.status, 401)

  const newPasswordLogin = await jsonRequest(`${apiBase}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: buyerEmail, password: 'BrandNewPass123!' }),
  })
  assert.equal(newPasswordLogin.status, 200)
  const preResetCookie = cookieFrom(newPasswordLogin)

  const reuseReset = await jsonRequest(`${apiBase}/api/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ token: resetToken, password: 'ThirdPass123!' }),
  })
  assert.equal(reuseReset.status, 400)

  // A session minted before the reset must be refused on /me.
  const staleSession = await jsonRequest(`${apiBase}/api/auth/me`, {
    cookie: buyerCookie,
  })
  assert.equal(staleSession.status, 401)
  assert.equal((await staleSession.json()).code, 'SESSION_EXPIRED')

  const freshSession = await jsonRequest(`${apiBase}/api/auth/me`, {
    cookie: preResetCookie,
  })
  assert.equal(freshSession.status, 200)

  // Expired reset token.
  const expiredMail = await jsonRequest(`${apiBase}/api/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email: sellerEmail }),
  })
  assert.equal(expiredMail.status, 200)
  const sellerResetToken = tokenFromLink(
    latestMailTo(sellerEmail, /reset your refon password/i).text,
    '/reset-password',
  )
  await prisma.authToken.updateMany({
    where: { userId: sellerId, type: 'PASSWORD_RESET', usedAt: null },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  })
  const expiredReset = await jsonRequest(`${apiBase}/api/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ token: sellerResetToken, password: 'ExpiredPass123!' }),
  })
  assert.equal(expiredReset.status, 400)
  assert.equal((await expiredReset.json()).code, 'INVALID_OR_EXPIRED_TOKEN')

  // --- Account endpoints ---
  const profileUpdate = await jsonRequest(`${apiBase}/api/account/profile`, {
    method: 'PATCH',
    cookie: preResetCookie,
    body: JSON.stringify({ name: 'Renamed Buyer' }),
  })
  assert.equal(profileUpdate.status, 200)
  assert.equal((await profileUpdate.json()).user.name, 'Renamed Buyer')

  const shortName = await jsonRequest(`${apiBase}/api/account/profile`, {
    method: 'PATCH',
    cookie: preResetCookie,
    body: JSON.stringify({ name: 'A' }),
  })
  assert.equal(shortName.status, 422)

  const wrongCurrent = await jsonRequest(`${apiBase}/api/account/change-password`, {
    method: 'POST',
    cookie: preResetCookie,
    body: JSON.stringify({
      currentPassword: 'NotMyPassword1!',
      newPassword: 'Whatever12345!',
    }),
  })
  assert.equal(wrongCurrent.status, 403)
  assert.equal((await wrongCurrent.json()).code, 'CURRENT_PASSWORD_INCORRECT')

  const samePassword = await jsonRequest(`${apiBase}/api/account/change-password`, {
    method: 'POST',
    cookie: preResetCookie,
    body: JSON.stringify({
      currentPassword: 'BrandNewPass123!',
      newPassword: 'BrandNewPass123!',
    }),
  })
  assert.equal(samePassword.status, 422)

  const changeResult = await jsonRequest(`${apiBase}/api/account/change-password`, {
    method: 'POST',
    cookie: preResetCookie,
    body: JSON.stringify({
      currentPassword: 'BrandNewPass123!',
      newPassword: 'ChangedAgain123!',
    }),
  })
  assert.equal(changeResult.status, 200)
  const refreshedCookie = cookieFrom(changeResult)
  assert.ok(refreshedCookie, 'change-password re-issues the auth cookie')

  // The cookie handed back by change-password must keep working.
  const afterChange = await jsonRequest(`${apiBase}/api/auth/me`, {
    cookie: refreshedCookie,
  })
  assert.equal(afterChange.status, 200)
  assert.equal((await afterChange.json()).user.name, 'Renamed Buyer')

  const changedLogin = await jsonRequest(`${apiBase}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: buyerEmail, password: 'ChangedAgain123!' }),
  })
  assert.equal(changedLogin.status, 200)

  const anonymousProfile = await jsonRequest(`${apiBase}/api/account/profile`, {
    method: 'PATCH',
    body: JSON.stringify({ name: 'Nope' }),
  })
  assert.equal(anonymousProfile.status, 401)

  const anonymousChange = await jsonRequest(`${apiBase}/api/account/change-password`, {
    method: 'POST',
    body: JSON.stringify({ currentPassword: 'a', newPassword: 'BrandNewPass123!' }),
  })
  assert.equal(anonymousChange.status, 401)

  // Sellers can use the account endpoints too.
  const sellerProfileUpdate = await jsonRequest(`${apiBase}/api/account/profile`, {
    method: 'PATCH',
    cookie: sellerCookie,
    body: JSON.stringify({ name: 'Renamed Seller' }),
  })
  assert.equal(sellerProfileUpdate.status, 200)

  const logout = await jsonRequest(`${apiBase}/api/auth/logout`, { method: 'POST' })
  assert.equal(logout.status, 204)
  assert.match(logout.headers.get('set-cookie') ?? '', /^refon_token=;/)

  console.log(
    'Auth E2E passed: registration, login, session restore, guards, seller profile, validation, logout, email verification, password reset, account profile and change-password, session invalidation',
  )
} finally {
  const userIds = [buyerId, sellerId, storeSellerId].filter(Boolean)
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
