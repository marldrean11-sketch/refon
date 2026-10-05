import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { watchErrors, expectNoFatalErrors } from './support.js'

const API = 'http://localhost:4000/api'
const BUYER_PASSWORD = 'BuyerTest123!'
const ROTATED_PASSWORD = 'RotatedPass123!'
const RESET_PASSWORD = 'ResetPass123!'

/**
 * The backend has no SMTP relay in this environment, so account emails are appended
 * to backend/tmp/mail-outbox.jsonl. Reading that file is how this suite obtains the
 * real single-use links the product would otherwise email.
 */
const OUTBOX = '../backend/tmp/mail-outbox.jsonl'

async function latestTokenFor(email, pathname) {
  let text = ''

  try {
    text = await readFile(OUTBOX, 'utf8')
  } catch {
    return null
  }

  const entries = text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((entry) => entry.to === email)

  for (const entry of entries.reverse()) {
    const match = new RegExp(`${pathname}\\?token=([A-Za-z0-9_-]+)`).exec(entry.text ?? '')
    if (match) {
      return match[1]
    }
  }

  return null
}

/**
 * One throwaway account, registered once and reused by the change-password,
 * session-invalidation and password-reset scenarios.
 *
 * It has to be a dedicated account: rotating or resetting the password of a seeded or
 * global-setup user would invalidate the stored cookie jars the other specs rely on.
 * It also has to be a single account, because authLimiter allows only 10 register and
 * login calls per 15 minutes per IP for the whole run and the other specs already
 * spend seven of them.
 */
let shared = null

async function sharedAccount(request) {
  shared ??= await registerCookie(request, 'acct')
  return shared
}

/**
 * Registers a throwaway account and returns the raw Set-Cookie value, ready to be
 * handed to context.addCookies so a page can act as that user without spending
 * another authLimiter call on a login.
 */
async function registerCookie(request, label, role = 'BUYER') {
  const email = `e2e-ui-${label}-${Date.now()}@example.test`
  const response = await request.post(`${API}/auth/register`, {
    data: { name: `E2E ${label}`, email, password: BUYER_PASSWORD, role },
  })
  expect(response.status(), await response.text()).toBe(201)

  const setCookie = response.headers()['set-cookie']
  expect(setCookie, 'register sets an auth cookie').toBeTruthy()
  const separator = setCookie.indexOf(';')
  return {
    email,
    cookie: separator === -1 ? setCookie : setCookie.slice(0, separator),
  }
}

async function signInAs(page, cookie) {
  const separator = cookie.indexOf('=')
  await page.context().addCookies([
    {
      name: cookie.slice(0, separator),
      value: cookie.slice(separator + 1),
      domain: 'localhost',
      path: '/',
    },
  ])
}

async function submitForgotPassword(page, email) {
  await page.goto('/forgot-password')
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText('Check your inbox')).toBeVisible()
}

test.describe('E1 · Account security (signed in)', () => {
  test.use({ storageState: 'state/buyer.json' })

  test('E1.1 /account renders the profile, verification and password sections', async ({
    page,
  }) => {
    const all = watchErrors(page)

    await page.goto('/account')
    await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible()
    await expect(page.getByLabel('Display name')).toBeVisible()
    await expect(page.getByLabel('Current password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save profile' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Change password' })).toBeVisible()

    // This buyer registered in global setup and never clicked a verification link.
    await expect(page.getByText('Unverified').first()).toBeVisible()

    expectNoFatalErrors(all, 'E1.1 account page')
  })

  test('E1.2 a signed-in user can reach /forgot-password', async ({ page }) => {
    const all = watchErrors(page)

    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()

    expectNoFatalErrors(all, 'E1.2 signed in forgot password')
  })

  test('E1.3 the Account link is present in the signed-in header', async ({ page }) => {
    const all = watchErrors(page)

    await page.goto('/account')
    await expect(page.locator('nav a[href="/account"]').first()).toBeVisible()

    expectNoFatalErrors(all, 'E1.3 account link')
  })
})

test.describe('E1 · Profile editing', () => {
  test.use({ storageState: 'state/buyer2.json' })

  test('E1.4 a saved profile change survives a reload', async ({ page }) => {
    const all = watchErrors(page)

    await page.goto('/account')
    const nameField = page.getByLabel('Display name')
    await nameField.fill('E2E Renamed Buyer')
    await page.getByRole('button', { name: 'Save profile' }).click()

    await expect(page.getByText('Your profile has been updated.')).toBeVisible()
    await expect(nameField).toHaveValue('E2E Renamed Buyer')

    await page.reload()
    await expect(page.getByLabel('Display name')).toHaveValue('E2E Renamed Buyer')

    expectNoFatalErrors(all, 'E1.4 profile update')
  })

  test('E1.5 a name below the minimum length is refused', async ({ page }) => {
    const all = watchErrors(page)

    await page.goto('/account')
    await page.getByLabel('Display name').fill('A')
    await page.getByRole('button', { name: 'Save profile' }).click()

    await expect(page.getByText('Name must be at least 2 characters.')).toBeVisible()
    await expect(page.getByText('Your profile has been updated.')).toHaveCount(0)

    expectNoFatalErrors(all, 'E1.5 short name')
  })

  test('E1.6 the verify-email banner shows under the header and can be dismissed', async ({
    page,
  }) => {
    const all = watchErrors(page)

    await page.goto('/browse')
    const banner = page.getByTestId('verify-email-banner')
    await expect(banner).toBeVisible()
    await expect(banner.getByText('Confirm your email address')).toBeVisible()

    await banner.getByRole('button', { name: 'Dismiss email verification reminder' }).click()
    await expect(banner).toHaveCount(0)

    // sessionStorage-backed, so the dismissal holds for a reload in the same tab.
    await page.reload()
    await expect(page.getByTestId('verify-email-banner')).toHaveCount(0)

    expectNoFatalErrors(all, 'E1.6 banner dismiss')
  })
})

test.describe('E1 · Admin', () => {
  test.use({ storageState: 'state/admin.json' })

  test('E1.7 an admin can open /account', async ({ page }) => {
    const all = watchErrors(page)

    await page.goto('/account')
    await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save profile' })).toBeVisible()
    // Seeded accounts are already confirmed, so no reminder is expected.
    await expect(page.getByText('Verified').first()).toBeVisible()
    await expect(page.getByTestId('verify-email-banner')).toHaveCount(0)

    expectNoFatalErrors(all, 'E1.7 admin account')
  })
})

test.describe('E1 · Email verification', () => {
  test('E1.8 the emailed link confirms the address while signed out, and cannot be reused', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)
    // Reads the link global setup already triggered by registering this account,
    // so the scenario costs no extra auth call.
    const emails = JSON.parse(await readFile('state/emails.json', 'utf8'))

    const token = await latestTokenFor(emails.sellerApplicant, '/verify-email')
    expect(token, 'registration wrote a verification link to the outbox').toBeTruthy()

    await page.goto(`/verify-email?token=${token}`)
    await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible()

    // The page worked without any session cookie being set.
    const cookies = await page.context().cookies()
    expect(cookies.some((cookie) => cookie.name === 'refon_token')).toBe(false)

    const replay = await request.post(`${API}/auth/verify-email`, { data: { token } })
    expect(replay.status()).toBe(400)
    expect((await replay.json()).code).toBe('INVALID_OR_EXPIRED_TOKEN')

    expectNoFatalErrors(all, 'E1.8 verify email')
  })
})

test.describe('E1 · Password and session', () => {
  test('E1.9 change-password refuses a wrong current password, then rotates and keeps this session', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)
    const { cookie: originalCookie } = await sharedAccount(request)
    await signInAs(page, originalCookie)

    await page.goto('/account')
    await page.getByLabel('Current password').fill('NotMyPassword1!')
    await page.getByLabel('New password', { exact: true }).fill(ROTATED_PASSWORD)
    await page.getByLabel('Confirm new password').fill(ROTATED_PASSWORD)
    await page.getByRole('button', { name: 'Change password' }).click()

    await expect(page.getByText('Your current password is incorrect.')).toBeVisible()

    await page.getByLabel('Current password').fill(BUYER_PASSWORD)
    await page.getByLabel('New password', { exact: true }).fill(ROTATED_PASSWORD)
    await page.getByLabel('Confirm new password').fill(ROTATED_PASSWORD)
    await page.getByRole('button', { name: 'Change password' }).click()

    await expect(page.getByText(/Password changed\./)).toBeVisible()
    await expect(page.getByLabel('Current password')).toHaveValue('')

    // The session that made the change stays signed in, with a refreshed cookie.
    await page.goto('/account')
    await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible()

    const refreshedCookie = await page
      .context()
      .cookies()
      .then((cookies) => cookies.find((cookie) => cookie.name === 'refon_token')?.value)
    expect(refreshedCookie, 'change-password re-issues the auth cookie').toBeTruthy()

    const me = await request.get(`${API}/auth/me`, {
      headers: { Cookie: `refon_token=${refreshedCookie}` },
    })
    expect(me.status(), await me.text()).toBe(200)

    // The cookie minted before the change is refused.
    const stale = await request.get(`${API}/auth/me`, {
      headers: { Cookie: originalCookie },
    })
    expect(stale.status()).toBe(401)
    expect((await stale.json()).code).toBe('SESSION_EXPIRED')

    expectNoFatalErrors(all, 'E1.9 change password')
  })

  test('E1.10 a reset link sets a new password without signing the user in', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)
    const { email } = await sharedAccount(request)

    await submitForgotPassword(page, email)

    const token = await latestTokenFor(email, '/reset-password')
    expect(token, 'a reset link is written to the outbox').toBeTruthy()

    await page.goto(`/reset-password?token=${token}`)
    await page.getByLabel('New password', { exact: true }).fill(RESET_PASSWORD)
    await page.getByLabel('Confirm new password').fill(RESET_PASSWORD)
    await page.getByRole('button', { name: 'Save new password' }).click()

    // Redirects to sign in rather than dropping the user into a session.
    await expect(page).toHaveURL(/\/login/)
    const cookies = await page.context().cookies()
    expect(cookies.some((cookie) => cookie.name === 'refon_token')).toBe(false)

    expectNoFatalErrors(all, 'E1.10 reset password')
  })
})

test.describe('E1 · Password reset edge cases', () => {
  test('E1.11 forgot-password confirms the same way for an unknown address', async ({
    page,
  }) => {
    const all = watchErrors(page)

    await submitForgotPassword(page, 'nobody-here@example.test')

    expectNoFatalErrors(all, 'E1.11 forgot password')
  })

  test('E1.12 a reset link with no token offers to request a new one', async ({ page }) => {
    const all = watchErrors(page)

    await page.goto('/reset-password')
    await expect(page.getByRole('heading', { name: 'This link is incomplete' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible()

    expectNoFatalErrors(all, 'E1.12 reset without token')
  })
})