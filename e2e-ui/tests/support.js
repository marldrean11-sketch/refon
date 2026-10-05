import { expect } from '@playwright/test'
import fs from 'node:fs'

/**
 * Session cookie for a saved account.
 *
 * `globalSetup` already signs in the seller and administrator once per run and
 * writes the cookie jars to `state/`. Specs that need to call the API as one of
 * those accounts read the cookie from here instead of logging in again.
 *
 * This matters because the auth endpoints are rate limited to 10 requests per 15
 * minutes per IP, and a handful of specs each logging in twice exhausts that
 * budget and turns later tests into 429s that look like application failures.
 */
export function authCookie(name) {
  const state = JSON.parse(fs.readFileSync(`state/${name}.json`, 'utf8'))
  return state.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
}

/**
 * Several scenarios deliberately trigger non-2xx API responses (the anonymous
 * session probe returns 401, permission checks return 403, a duplicate report
 * returns 409, validation returns 422). Chromium logs every failed HTTP response
 * to the console, so these are recorded but not treated as failures. Every other
 * console error and every uncaught page error is fatal.
 */
const EXPECTED_NOISE = [
  /Failed to load resource.*40[139] \(/i,
  /Failed to load resource.*422 \(/i,
]

export function isNoise(text) {
  return EXPECTED_NOISE.some((pattern) => pattern.test(text))
}

export function watchErrors(page) {
  const all = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      all.push({ kind: 'console', text: message.text(), url: page.url(), noise: isNoise(message.text()) })
    }
  })
  page.on('pageerror', (error) => {
    all.push({ kind: 'pageerror', text: error.message, url: page.url(), noise: false })
  })
  return all
}

export function fatalErrors(all) {
  return all.filter((entry) => !entry.noise)
}

export function expectNoFatalErrors(all, step) {
  const fatal = fatalErrors(all)
  if (fatal.length > 0) {
    throw new Error(
      `Browser errors at "${step}":\n${fatal.map((e) => `${e.kind} @ ${e.url}: ${e.text}`).join('\n')}`,
    )
  }
}

export async function registerBuyer(page, all, label) {
  const email = `e2e-ui-${Date.now()}-${label}@example.test`
  await page.goto('/register')
  await page.getByLabel('Full name').fill(`E2E ${label}`)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Create a password').fill('BuyerTest123!')
  await page.getByRole('button', { name: 'Create account' }).click()
  // The app redirects client-side, so poll the path instead of waiting for a load event.
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 25_000 })
    .not.toBe('/register')
  return email
}

export async function login(page, email, password) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 25_000 })
    .not.toBe('/login')
}

/**
 * Matches a heart regardless of whether the listing is currently saved, since the
 * label flips between "Save <name>" and "Remove Save <name>" as the label text is
 * `${saved ? 'Remove ' : ''}Save ${brand} ${model}`.
 */
export function heartLocator(page, name) {
  return page.locator(`button[aria-label$="${name}"]`).first()
}

/** Clicks a heart and reports what actually happened instead of hanging. */
export async function tryClickHeart(page, name, timeout = 4000) {
  const button = heartLocator(page, name)
  const before = page.url()
  let clickError = null
  try {
    await button.click({ timeout })
  } catch (error) {
    clickError = error.message.split('\n')[0]
  }
  await page.waitForTimeout(1200)
  return {
    clicked: clickError === null,
    clickError,
    urlBefore: before,
    urlAfter: page.url(),
  }
}

export async function heartIsTopmost(page, name) {
  // Bring the button into view first: elementFromPoint only reports a hit inside
  // the viewport, and this check is about stacking order, not scroll position.
  await page
    .locator(`button[aria-label$="${name}"]`)
    .first()
    .scrollIntoViewIfNeeded()
    .catch(() => {})

  return page.evaluate((wanted) => {
    const btn = [...document.querySelectorAll('button[aria-label]')].find((b) =>
      (b.getAttribute('aria-label') || '').endsWith(wanted),
    )
    if (!btn) return { found: false }
    const r = btn.getBoundingClientRect()
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    const cs = getComputedStyle(btn)
    const parent = btn.parentElement
    return {
      found: true,
      topmostTag: top?.tagName ?? null,
      topmostLabel: top?.getAttribute?.('aria-label') ?? null,
      heartIsTopmost: btn === top || btn.contains(top),
      position: cs.position,
      zIndex: cs.zIndex,
      parentPosition: getComputedStyle(parent).position,
      parentZIndex: getComputedStyle(parent).zIndex,
    }
  }, name)
}

export async function savedBadge(page) {
  const link = page.locator('a[href="/saved"]').first()
  const text = await link.innerText().catch(() => '')
  const match = text.match(/Saved\s*(\d+)/)
  return match ? Number(match[1]) : 0
}

export function expectVisibleCount(locator, count, message) {
  expect(locator, message).toHaveCount(count)
}

/**
 * Opens the shop page filtered to one listing.
 *
 * The catalog paginates, so a seeded listing is not necessarily on page one.
 * Specs that interact with a specific phone's card search for it rather than
 * assuming it happens to be in the first twelve results.
 */
export async function showListing(page, brandModel) {
  await page.goto(`/phones?search=${encodeURIComponent(brandModel)}`)
  await page.locator('article').first().waitFor()
  await page.waitForTimeout(700)
}
