import fs from 'node:fs'
import { test, expect } from '@playwright/test'
import { watchErrors, expectNoFatalErrors, isNoise } from './support.js'
import { LISTINGS, openListing } from './constants.js'

/**
 * Phase 1: purchasing is buyer-only, and a visitor is sent to sign in.
 *
 * The server decides this; the frontend only decides how it feels. These tests cover
 * the four properties a shopper can observe:
 *
 *   - a visitor still *sees* the cart and the Cart and Saved tabs, because hiding them
 *     would leave no discoverable way to find the cart at all;
 *   - clicking one signs them in and remembers where they were, and signing in puts
 *     them back there rather than on a generic dashboard;
 *   - a deferred add-to-cart is replayed once, and only once, after they sign in;
 *   - a seller and an admin see no purchasing affordance at all, and the page makes
 *     **no** refused request while they browse — zero 401s, zero 403s, no console noise.
 *
 * That last one is the reason this spec watches the network rather than only the DOM:
 * a provider that fetches "harmlessly" and swallows the 401 would look identical on
 * screen and be broken in the console.
 */

const API = process.env.REFON_API ?? 'http://localhost:4000/api'

/** Refused cart, wishlist and checkout responses, by path. */
const PURCHASING = /\/api\/(cart|favorites|checkout)(\/|\?|$)/

/**
 * Records every purchasing request the page makes, with its status.
 *
 * Installed before the first navigation so nothing is missed, and tolerant of a page
 * that never issues one — which is the point.
 */
function watchPurchasingRequests(page) {
  const entries = []

  page.on('response', (response) => {
    const url = response.url()

    if (PURCHASING.test(url)) {
      entries.push({ url, status: response.status() })
    }
  })

  return entries
}

function refused(entries) {
  return entries.filter((entry) => entry.status === 401 || entry.status === 403)
}

/**
 * Reads the buyer's own cart through the page, so the request carries the browser's
 * session.
 *
 * Retries rather than reading once: immediately after sign-in the cookie has just been
 * set and the replay may not have landed, so a single read would report a 401 or an
 * empty cart and read as a failure of the thing under test.
 */
async function readCart(page) {
  let last = null

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await page.request.get(`${API}/cart`)
    last = await response.json().catch(() => null)

    if (response.status() === 200 && last?.cart) {
      return last.cart
    }

    await page.waitForTimeout(500)
  }

  throw new Error(`cart never became readable for the signed-in buyer: ${JSON.stringify(last)}`)
}

/** Waits until the buyer's cart holds exactly `count` listings. */
async function waitForCartCount(page, count) {
  await expect
    .poll(async () => (await readCart(page)).itemCount, { timeout: 30_000 })
    .toBe(count)
}

/** Signs in through the form, which is the only way a shopper ever arrives at a buyer. */
async function signIn(page, email, password) {
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 25_000 }).not.toBe('/login')
}

// ------------------------------------------------------------- anonymous

test.describe('P1 visitor sees the cart but must sign in to use it', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('P1-01 the visitor still sees a cart button, and it signs them in rather than opening an empty drawer', async ({
    page,
  }) => {
    const all = watchErrors(page)
    const requests = watchPurchasingRequests(page)

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)

    // Visible, not hidden. Hiding the cart from a shopper who has not signed in yet
    // would leave them with no way to discover that it exists.
    const cartControl = page.getByTestId('navbar-cart')
    await expect(cartControl, 'a visitor still sees a cart control').toBeVisible()

    // And no drawer is opened underneath it: there is nothing to show.
    await expect(page.getByTestId('cart-drawer'), 'no drawer is rendered').toHaveCount(0)

    await cartControl.click()

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
      .toBe('/login')

    // The click was productive: it produced a sign-in page, not a dead end.
    await expect(page.locator('#email')).toBeVisible()

    // Nothing was asked of the server, because a visitor has no cart to read.
    expect(
      refused(requests),
      `a visitor must not provoke refused requests (saw ${JSON.stringify(requests)})`,
    ).toEqual([])

    expectNoFatalErrors(all, 'P1-01')
  })

  test('P1-02 the visitor still sees the Cart and Saved mobile tabs, and they sign them in', async ({
    page,
  }) => {
    const all = watchErrors(page)

    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/browse')
    await page.locator('article').first().waitFor()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)

    const tabs = page.locator('nav[aria-label="Quick navigation"] a')
    const labels = (await tabs.allInnerTexts()).map((text) => text.trim())

    expect(labels.join(' '), 'a visitor still sees a Cart tab').toMatch(/cart/i)
    expect(labels.join(' '), 'and a Saved tab').toMatch(/saved/i)

    // The tabs point at sign-in rather than at a route that would bounce them back
    // here, so the tap is productive.
    const hrefs = await tabs.evaluateAll((links) => links.map((link) => link.getAttribute('href')))
    expect(hrefs, 'no tab points straight at a gated route').not.toContain('/cart')
    expect(hrefs, 'nor at the wishlist').not.toContain('/saved')

    // And clicking one really does sign them in.
    const cartTab = tabs.filter({ hasText: /cart/i }).first()
    await cartTab.click()
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/login')
    await expect(page.locator('#email')).toBeVisible()

    expectNoFatalErrors(all, 'P1-02')
  })

  test('P1-03 a visitor who adds to the cart is sent to sign in and the phone lands in their cart afterwards', async ({
    page,
  }) => {
    const all = watchErrors(page)
    const listing = LISTINGS.galaxyS23

    await openListing(page, listing)

    const addToCart = page.locator('[data-testid="add-to-cart"]:visible').first()
    await addToCart.waitFor({ timeout: 20_000 })
    await addToCart.click()

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/login')

    // Sign in as the buyer `globalSetup` made, and the phone is added for us.
    await signIn(page, readBuyerEmail(), 'BuyerTest123!')

    await waitForCartCount(page, 1)

    const cart = await readCart(page)

    expect(
      cart.items.map((item) => item.listing.id),
      'the deferred add is replayed exactly once after sign-in',
    ).toEqual([listing])

    expect(cart.itemCount, 'and the phone appears once, not twice').toBe(1)

    await page.request.delete(`${API}/cart`)
    expectNoFatalErrors(all, 'P1-03')
  })

  test('P1-04 the deferred intent does not replay twice when the cart is read again', async ({
    page,
  }) => {
    const all = watchErrors(page)
    const listing = LISTINGS.iphone11

    await openListing(page, listing)
    await page.locator('[data-testid="add-to-cart"]:visible').first().click()
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/login')

    await signIn(page, readBuyerEmail(), 'BuyerTest123!')
    await waitForCartCount(page, 1)

    // A reload, a fresh cart read, and a second visit to the listing. If the intent
    // were left in storage the phone would be added again on one of these.
    await page.goto('/cart')
    await page.waitForLoadState('networkidle')
    await page.reload()
    await page.waitForLoadState('networkidle')
    await openListing(page, listing)
    await page.waitForTimeout(1200)

    const cart = await readCart(page)
    const occurrences = cart.items.filter((item) => item.listing.id === listing).length

    expect(occurrences, 'the intent is cleared, so it never replays twice').toBe(1)
    expect(cart.itemCount).toBe(1)

    // The stored intent really is gone, rather than merely harmless this time round.
    expect(
      await page.evaluate(() => sessionStorage.getItem('refon:pending-cart-intent')),
      'nothing is left pending',
    ).toBeNull()

    await page.request.delete(`${API}/cart`)
    expectNoFatalErrors(all, 'P1-04')
  })

  test('P1-05 a signed-out shopper browsing the shop provokes no refused request', async ({
    page,
  }) => {
    const all = watchErrors(page)
    const requests = watchPurchasingRequests(page)

    for (const path of ['/', '/browse', '/phones', `/listings/${LISTINGS.galaxyS8}`]) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
    }

    expect(
      refused(requests),
      `no 401 or 403 while a visitor browses (saw ${JSON.stringify(requests)})`,
    ).toEqual([])

    // The wishlist and the cart are both included in that: neither is fetched.
    expect(
      requests,
      'a visitor makes no cart or wishlist request at all',
    ).toEqual([])

    // And the console is clean. Chromium logs a failed XHR as an error, so this is a
    // real check that nothing was quietly swallowed either.
    const fatal = all.filter((entry) => !isNoise(entry.text))
    expect(
      fatal,
      `a visitor sees no console errors (saw ${JSON.stringify(fatal.map((e) => e.text))})`,
    ).toEqual([])

    expectNoFatalErrors(all, 'P1-05')
  })
})

// --------------------------------------------------- signed-in non-buyers

test.describe('P1 a seller browses without provoking a refusal', () => {
  test.use({ storageState: 'state/seller.json' })

  test('P1-06 a seller sees no cart affordance and makes no purchasing request', async ({ page }) => {
    const all = watchErrors(page)
    const requests = watchPurchasingRequests(page)

    for (const path of ['/', '/browse', `/listings/${LISTINGS.galaxyS8}`]) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
    }

    // The affordance is absent, not disabled: a seller has nothing to sign into and
    // no cart to open, so offering one would be a dead end.
    await expect(page.getByTestId('navbar-cart'), 'no cart control for a seller').toHaveCount(0)
    await expect(page.getByTestId('cart-drawer'), 'and no drawer').toHaveCount(0)

    expect(
      refused(requests),
      `a seller must not provoke refused requests (saw ${JSON.stringify(requests)})`,
    ).toEqual([])
    expect(
      requests,
      'a seller makes no cart or wishlist request at all',
    ).toEqual([])

    expectNoFatalErrors(all, 'P1-06')
  })

  test('P1-07 a seller following /cart by hand is sent to their own workspace, not to sign-in', async ({
    page,
  }) => {
    await page.goto('/cart')
    await page.waitForLoadState('networkidle')
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/seller')

    // Signing in again would make them the same seller, so it must not offer to.
    await expect(page.locator('#email')).toHaveCount(0)
  })
})

test.describe('P1 an admin browses without provoking a refusal', () => {
  test.use({ storageState: 'state/admin.json' })

  test('P1-08 an admin sees no cart affordance and makes no purchasing request', async ({ page }) => {
    const all = watchErrors(page)
    const requests = watchPurchasingRequests(page)

    for (const path of ['/', '/browse', `/listings/${LISTINGS.galaxyS8}`]) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
    }

    await expect(page.getByTestId('navbar-cart'), 'no cart control for an admin').toHaveCount(0)

    expect(
      refused(requests),
      `an admin must not provoke refused requests (saw ${JSON.stringify(requests)})`,
    ).toEqual([])
    expect(
      requests,
      'an admin makes no cart or wishlist request at all',
    ).toEqual([])

    expectNoFatalErrors(all, 'P1-08')
  })
})

/**
 * The buyer account `globalSetup` registered for this run.
 *
 * Read from disk rather than registered again: the auth endpoints are rate limited per
 * IP, and a handful of specs each registering would exhaust that budget and turn later
 * tests into 429s that read as application failures.
 */
function readBuyerEmail() {
  return JSON.parse(fs.readFileSync('state/emails.json', 'utf8')).buyer
}