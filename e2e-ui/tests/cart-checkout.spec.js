import fs from 'node:fs'
import { test, expect } from '@playwright/test'
import { watchErrors, expectNoFatalErrors } from './support.js'
import {
  setListingPriceForTest,
  restoreListing,
  restoreListingStatus,
} from './support-db.js'

/**
 * Phase 6 cart and checkout.
 *
 * Everything goes through the real UI against the real Phase 5 API. A phone added
 * here is genuinely reserved by the database, and what the shopper reads is what the
 * server reported.
 *
 * Purchasing is buyer-only, so every test here runs as a signed-in buyer using the
 * session `globalSetup` saved to `state/buyer.json`. There is no guest cart: a cart
 * belongs to an account, which is why `clearCart` uses `page.request` (the browser's
 * own session) rather than the cookie-less `request` fixture.
 *
 * The states worth testing are the ones a shopper can actually get into: an empty
 * cart, a live countdown, a reservation that has lapsed, a listing that has been
 * taken down, a price that moved, and a checkout that must not submit twice.
 *
 * Listings are chosen from the ids the seed keeps approved. The suite never assumes
 * a particular device is on sale, because an earlier suite may legitimately have
 * marked one SOLD.
 */

const API = process.env.REFON_API ?? 'http://localhost:4000/api'

/** Seeded listings that are approved in the baseline seed. */
const PHONE = {
  iphone13: '40000000-0000-4000-8000-000000000004',
  iphone11: '40000000-0000-4000-8000-000000000005',
  iphoneSe3: '40000000-0000-4000-8000-000000000006',
  galaxyS23: '40000000-0000-4000-8000-000000000007',
  galaxyS21: '40000000-0000-4000-8000-000000000009',
  galaxyA54: '40000000-0000-4000-8000-000000000010',
  galaxyA34: '40000000-0000-4000-8000-000000000011',
  galaxyS8: '40000000-0000-4000-8000-000000000012',
  pixel7: '40000000-0000-4000-8000-000000000014',
  redmiNote9: '40000000-0000-4000-8000-000000000018',
}

/**
 * Every test in this file is a buyer.
 *
 * A cart, a wishlist and a checkout are buyer surfaces, so an anonymous context
 * cannot reach any of them. Running as `buyer` is what the file is testing.
 */
test.use({ storageState: 'state/buyer.json' })

/** Session cookie `globalSetup` already obtained, so the rate limiter is not drained. */
function authCookie(name) {
  const state = JSON.parse(fs.readFileSync(`state/${name}.json`, 'utf8'))
  return state.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
}

/**
 * Empties the cart **for the browser context that owns it**.
 *
 * This deliberately uses `page.request` rather than the `request` fixture. The
 * fixture has no cookie jar at all, so clearing through it would empty a cart nobody
 * is using and leave the buyer's own cart holding a live 15-minute reservation — the
 * next test would then be refused the same device with `LISTING_RESERVED` and the
 * failure would look like an application bug.
 */
async function clearCart(page) {
  const response = await page.request.delete(`${API}/cart`)
  expect(response.status()).toBe(200)
}

/**
 * The add-to-cart control that is actually on screen.
 *
 * The product page renders this action twice — the desktop purchase panel and the
 * mobile bottom bar — with CSS deciding which is displayed. Both exist in the DOM,
 * so a test has to ask for the visible one rather than the first.
 */
function visibleAddToCart(page) {
  return page.locator('[data-testid="add-to-cart"]:visible')
}

/** Adds a listing through the product page and waits for the reservation to exist. */
async function addListing(page, id) {
  await page.goto(`/listings/${id}`)
  await page.waitForLoadState('networkidle')

  const control = visibleAddToCart(page)
  await control.waitFor({ timeout: 20_000 })
  await control.click()
  await expect(control).toHaveAttribute('data-in-cart', 'true', { timeout: 20_000 })

  return control
}

/**
 * Releases whatever the finished test was holding.
 *
 * A cart belongs to an account, and every test in this file shares one buyer. When a
 * test ends its browser context is discarded, but the cart row — and its live
 * 15-minute reservation on a real device — survive, because they are stored against
 * the account rather than the context. The next test would then be refused the same
 * device with `LISTING_RESERVED`. That failure reads as an application bug and is not
 * one, so every test cleans up after itself rather than relying on the one-off
 * database reset at the start of the run.
 */
test.afterEach(async ({ page }) => {
  await page.request.delete(`${API}/cart`).catch(() => {})
})

/** Opens the cart and waits for it to settle on content or the empty state. */
async function openCart(page) {
  await page.goto('/cart')
  await page.waitForLoadState('networkidle')
  await page
    .getByTestId('cart-item')
    .first()
    .or(page.getByRole('heading', { name: /your cart is empty/i }))
    .first()
    .waitFor({ timeout: 20_000 })
}

/** Opens the checkout form, waiting for the cart and delivery options to resolve. */
async function openCheckout(page) {
  await page.goto('/checkout')
  await page.waitForLoadState('networkidle')

  // Either the form or the guard is correct here; the guard means the cart is not
  // checkoutable, which several tests assert rather than work around.
  await page
    .getByTestId('checkout-form')
    .or(page.getByTestId('checkout-guard'))
    .first()
    .waitFor({ timeout: 20_000 })
}

const VALID_DETAILS = {
  fullName: 'Maria Santos',
  email: 'maria.santos@example.test',
  mobile: '0917 123 4567',
  region: 'NCR',
  province: 'Quezon City',
  city: 'Quezon City',
  barangay: 'Bagumbayan',
  street: '12 Katipunan Avenue, Tower B, Unit 4B',
  postalCode: '1100',
}

/** Fills every required checkout field with valid values. */
async function fillCheckoutDetails(page, overrides = {}) {
  const details = { ...VALID_DETAILS, ...overrides }

  await page.locator('#checkout-full-name').fill(details.fullName)
  await page.locator('#checkout-email').fill(details.email)
  await page.locator('#checkout-mobile').fill(details.mobile)
  await page.getByRole('combobox', { name: /region/i }).selectOption(details.region)
  await page.locator('#checkout-province').fill(details.province)
  await page.locator('#checkout-city').fill(details.city)
  await page.locator('#checkout-barangay').fill(details.barangay)
  await page.locator('#checkout-street').fill(details.street)
  await page.locator('#checkout-postal-code').fill(details.postalCode)
}

// --------------------------------------------------------------- empty cart

test.describe('F1 empty cart', () => {
  test('F1 an empty cart explains itself and routes back to the shop', async ({ page, request }) => {
    const all = watchErrors(page)

    await clearCart(page)
    await page.goto('/cart')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /your cart is empty/i })).toBeVisible()
    await expect(page.getByText(/find a refurbished phone/i).first()).toBeVisible()

    const browse = page.getByRole('link', { name: /browse refurbished phones/i }).first()
    await expect(browse).toBeVisible()
    await browse.click()

    await expect.poll(() => new URL(page.url()).pathname).toBe('/phones')

    expectNoFatalErrors(all, 'F1-empty-cart')
  })

  test('F1 the cart and checkout are never indexed', async ({ page }) => {
    for (const path of ['/cart', '/checkout']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      await expect(
        page.locator('meta[name="robots"]'),
        `${path} must be noindex`,
      ).toHaveAttribute('content', /noindex/)
    }
  })
})

// --------------------------------------------------------- add, count, remove

test.describe('F2 add and remove', () => {
  test('F2 adding a phone reserves it and shows a real countdown', async ({ page, request }) => {
    const all = watchErrors(page)
    await clearCart(page)

    await addListing(page, PHONE.iphone13)
    await openCart(page)

    const item = page.getByTestId('cart-item').first()
    await expect(item).toBeVisible()
    await expect(item).toHaveAttribute('data-availability', 'AVAILABLE')

    const countdown = item.getByTestId('reservation-countdown')
    await expect(countdown).toHaveAttribute('data-status', 'ACTIVE')

    // A real 15-minute hold sits just under 900 seconds. A hard-coded 900 or a
    // placeholder would both pass a weaker assertion.
    const seconds = Number(await countdown.getAttribute('data-seconds-remaining'))
    expect(seconds).toBeGreaterThan(60)
    expect(seconds).toBeLessThanOrEqual(900)

    // A quantity stepper would imply more than one of this device exists.
    await expect(item.locator('input[type="number"]')).toHaveCount(0)
    await expect(item).toContainText(/1 device/i)

    // The header badge and the cart agree.
    // The header cart is a button that opens the drawer, labelled "Cart, 1 item".
    await expect(page.getByTestId('navbar-cart')).toHaveAttribute('aria-label', /cart, 1 item\b/i)

    expectNoFatalErrors(all, 'F2-add')
  })

  test('F2 the countdown ticks down instead of sitting still', async ({ page, request }) => {
    await clearCart(page)
    await addListing(page, PHONE.galaxyS21)
    await openCart(page)

    const countdown = page.getByTestId('reservation-countdown').first()
    const first = Number(await countdown.getAttribute('data-seconds-remaining'))

    await page.waitForTimeout(2200)

    const second = Number(await countdown.getAttribute('data-seconds-remaining'))

    expect(second).toBeLessThan(first)
    expect(first - second).toBeGreaterThanOrEqual(1)
  })

  test('F2 a phone already in the cart is not offered twice', async ({ page, request }) => {
    await clearCart(page)
    await addListing(page, PHONE.galaxyA54)
    await openCart(page)

    await expect(page.getByTestId('cart-item')).toHaveCount(1)

    await page.goto(`/listings/${PHONE.galaxyA54}`)
    await page.waitForLoadState('networkidle')

    const control = visibleAddToCart(page)
    await expect(control).toHaveAttribute('data-in-cart', 'true')
    await expect(control).toHaveText(/in your cart/i)

    // Following it lands on the cart rather than dead-ending.
    await control.click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/cart')
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
  })

  test('F2 removing a phone empties the cart', async ({ page, request }) => {
    await clearCart(page)
    await addListing(page, PHONE.redmiNote9)
    await openCart(page)

    await page.getByTestId('cart-item-remove').first().click()

    await expect(
      page.getByRole('heading', { name: /your cart is empty/i }),
    ).toBeVisible({ timeout: 20_000 })
  })

  test('F2 a released device becomes available to another shopper', async ({
    page,
    browser,
  }) => {
    await clearCart(page)

    // Two *different buyer accounts*, because a cart belongs to an account: two
    // contexts sharing one session would share one cart and could not both hold the
    // same device, which is the opposite of what this test is about.
    const first = await browser.newContext({ storageState: 'state/buyer.json' })
    const second = await browser.newContext({ storageState: 'state/buyer2.json' })

    try {
      const firstPage = await first.newPage()
      await firstPage.goto(`/listings/${PHONE.galaxyS8}`)
      await firstPage.waitForLoadState('networkidle')
      await visibleAddToCart(firstPage).click()
      await expect(visibleAddToCart(firstPage)).toHaveAttribute('data-in-cart', 'true', {
        timeout: 20_000,
      })

      // The second shopper is refused, and told why in plain language.
      const secondPage = await second.newPage()
      await secondPage.goto(`/listings/${PHONE.galaxyS8}`)
      await secondPage.waitForLoadState('networkidle')
      await visibleAddToCart(secondPage).click()

      const refusal = secondPage.getByTestId('add-to-cart-error')
      await expect(refusal).toBeVisible({ timeout: 20_000 })
      await expect(refusal).toContainText(/another buyer/i)
      await expect(refusal).not.toContainText(/LISTING_RESERVED/)
      await expect(refusal).not.toContainText(/\b409\b/)

      // Once the first shopper releases it, the second can hold it.
      await firstPage.goto('/cart')
      await firstPage.waitForLoadState('networkidle')
      await firstPage.getByTestId('cart-item-remove').first().click()
      await expect(
        firstPage.getByRole('heading', { name: /your cart is empty/i }),
      ).toBeVisible({ timeout: 20_000 })

      await secondPage.goto(`/listings/${PHONE.galaxyS8}`)
      await secondPage.waitForLoadState('networkidle')
      await visibleAddToCart(secondPage).click()
      await expect(visibleAddToCart(secondPage)).toHaveAttribute(
        'data-in-cart',
        'true',
        { timeout: 20_000 },
      )
    } finally {
      // Both accounts hold their own reservation. The automatic afterEach only
      // knows about the default page, so these are released explicitly or the device
      // stays held against the next test.
      await first.request.delete(`${API}/cart`).catch(() => {})
      await second.request.delete(`${API}/cart`).catch(() => {})
      await first.close()
      await second.close()
      await clearCart(page)
    }
  })
})

// ---------------------------------------------------- expired and unavailable

test.describe('F3 cart states that block checkout', () => {
  test('F3 an unavailable listing is shown, excluded from the total, and blocks checkout', async ({
    page,
    request,
  }) => {
    await clearCart(page)
    await addListing(page, PHONE.iphoneSe3)
    await openCart(page)

    const item = page.getByTestId('cart-item').first()
    await expect(item).toHaveAttribute('data-availability', 'AVAILABLE')

    // Checkout is offered while every line can proceed.
    await expect(page.getByTestId('checkout-blocked')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /proceed to checkout/i })).toBeEnabled()

    // The seller marks their own live device as sold while a shopper still holds it.
    // This is the real API path: an APPROVED listing is deliberately locked from
    // editing and moderation, but a seller can always withdraw a device, and a
    // device that has sold must stop being purchasable for a cart still holding it.
    const markedSold = await request.patch(`${API}/listings/${PHONE.iphoneSe3}/mark-sold`, {
      headers: { Cookie: authCookie('seller') },
    })
    expect(markedSold.status()).toBe(200)

    try {
      await page.reload()
      await page.waitForLoadState('networkidle')

      await expect(item).toHaveAttribute('data-availability', 'UNAVAILABLE', { timeout: 20_000 })

      const unavailable = item.getByTestId('cart-item-unavailable')
      await expect(unavailable).toBeVisible()
      await expect(unavailable).toContainText(/no longer available/i)

      // The countdown is replaced by the reason, not shown alongside it.
      await expect(item.getByTestId('reservation-countdown')).toHaveCount(0)

      // The line stays visible but is no longer counted as buyable, and the
      // summary's device count and subtotal drop to zero.
      await expect(page.getByText(/0 devices reserved/i)).toBeVisible()
      await expect(page.getByText('Subtotal').locator('..')).toContainText('₱0')

      // Checkout is refused with a stated reason rather than offered and then failing.
      await expect(page.getByTestId('checkout-blocked')).toBeVisible()
      await expect(page.getByRole('button', { name: /proceed to checkout/i })).toBeDisabled()

      // And /checkout declines to show a form at all.
      await page.goto('/checkout')
      await page.waitForLoadState('networkidle')

      await expect(page.getByTestId('checkout-guard')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByTestId('checkout-form')).toHaveCount(0)
    } finally {
      // Put the listing back so the next run starts from the seed baseline.
      await restoreListingStatus(PHONE.iphoneSe3)
      await clearCart(page)
    }
  })
})

// ------------------------------------------------------------ price movement

test.describe('F4 price changes', () => {
  test('F4 a price increase is stated with both figures', async ({ page, request }) => {
    await clearCart(page)
    await addListing(page, PHONE.pixel7)
    await openCart(page)

    // No movement yet, so no notice.
    await expect(page.getByTestId('cart-price-warning')).toHaveCount(0)
    await expect(page.getByTestId('price-change')).toHaveCount(0)

    // An APPROVED listing is locked from editing through the API on purpose, so the
    // change is staged directly and the original is restored afterwards.
    const snapshot = await setListingPriceForTest(PHONE.pixel7, 24_999)

    try {
      await page.reload()
      await page.waitForLoadState('networkidle')

      const notice = page.getByTestId('cart-price-warning')
      await expect(notice).toBeVisible({ timeout: 20_000 })
      await expect(notice).toContainText(/price updated/i)

      const change = page.getByTestId('price-change').first()
      await expect(change).toHaveAttribute('data-direction', 'INCREASED')

      // Both figures are shown, so the shopper can see what changed.
      await expect(change).toContainText(/previous price/i)
      await expect(change).toContainText(/current price/i)

      // The line and the total both use the live price, never the snapshot.
      const cart = await (await page.request.get(`${API}/cart`)).json()
      const item = cart.cart.items.find((entry) => entry.listing.id === PHONE.pixel7)

      expect(item.priceChanged).toBe(true)
      expect(item.currentPrice).toBe(24_999)
      expect(item.priceSnapshot).toBe(snapshot.price)
      expect(item.priceDelta).toBe(24_999 - snapshot.price)
      expect(cart.cart.subtotal).toBe(24_999)
    } finally {
      await restoreListing(PHONE.pixel7, snapshot)
      await clearCart(page)
    }
  })

  test('F4 a price decrease is reported as good news, not as a problem', async ({
    page,
    request,
  }) => {
    await clearCart(page)
    await addListing(page, PHONE.galaxyA34)
    await openCart(page)

    const snapshot = await setListingPriceForTest(PHONE.galaxyA34, 9_999)

    try {
      await page.reload()
      await page.waitForLoadState('networkidle')

      const change = page.getByTestId('price-change').first()
      await expect(change).toHaveAttribute('data-direction', 'DECREASED', { timeout: 20_000 })
      await expect(change).toContainText(/good news/i)

      // Checkout stays available: a lower price is not a problem to resolve.
      await expect(page.getByTestId('checkout-blocked')).toHaveCount(0)
      await expect(page.getByRole('button', { name: /proceed to checkout/i })).toBeEnabled()

      const cart = await (await page.request.get(`${API}/cart`)).json()
      expect(cart.cart.items[0].priceDelta).toBe(9_999 - snapshot.price)
      expect(cart.cart.subtotal).toBe(9_999)
    } finally {
      await restoreListing(PHONE.galaxyA34, snapshot)
      await clearCart(page)
    }
  })
})

// ------------------------------------------------------------------ checkout

test.describe('F5 checkout', () => {
  test('F5 checkout shows every section with server-supplied options', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)
    await clearCart(page)
    await addListing(page, PHONE.iphone13)

    await openCheckout(page)

    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible()

    for (const heading of [
      'Customer Information',
      'Shipping Address',
      'Delivery Method',
      'Payment Method',
    ]) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    }

    // Delivery methods come from the server's catalogue rather than the component.
    await expect(page.getByRole('radio', { name: /standard delivery/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /express delivery/i })).toBeVisible()

    for (const method of ['Cash on Delivery', 'GCash', 'Maya', 'Bank Transfer']) {
      await expect(page.getByRole('radio', { name: new RegExp(method, 'i') })).toBeVisible()
    }

    // The demo methods say so, and no credentials are ever collected.
    await expect(page.getByTestId('demo-payment-notice')).toContainText(/no payment is processed/i)
    await expect(page.getByText(/pay seller directly/i).first()).toBeVisible()
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
    await expect(page.locator('input[name*="gcash" i]')).toHaveCount(0)
    await expect(page.locator('input[name*="bank" i]')).toHaveCount(0)

    await expect(page.getByTestId('checkout-estimated-total')).toContainText('₱')

    expectNoFatalErrors(all, 'F5-checkout')
  })

  test('F5 an empty form highlights the first invalid field and submits nothing', async ({
    page,
    request,
  }) => {
    await clearCart(page)
    await addListing(page, PHONE.pixel7)

    await openCheckout(page)
    await page.getByTestId('checkout-review-button').click()

    // Name and email are prefilled from the signed-in buyer's account, so the
    // first empty required field is the mobile number.
    await expect(page.locator('#checkout-full-name')).not.toHaveValue('')
    await expect(page.locator('#checkout-email')).not.toHaveValue('')

    // Per-field messages, not one blanket error.
    await expect(page.getByText('Your mobile number is required.')).toBeVisible()
    await expect(page.getByText('Select a delivery region.')).toBeVisible()

    // The first invalid field takes focus, so the shopper knows where to start.
    await expect(page.locator('#checkout-mobile')).toBeFocused()

    // Nothing was priced, so no review appeared.
    await expect(page.getByTestId('order-review')).toHaveCount(0)
  })

  test('F5 invalid input is named in plain language and clears on edit', async ({
    page,
    request,
  }) => {
    await clearCart(page)
    await addListing(page, PHONE.pixel7)

    await openCheckout(page)

    await page.locator('#checkout-full-name').fill('Maria Santos')
    await page.locator('#checkout-email').fill('not-an-email')
    await page.locator('#checkout-mobile').fill('123')
    await page.getByRole('combobox', { name: /region/i }).selectOption('NCR')
    await page.locator('#checkout-province').fill('Quezon City')
    await page.locator('#checkout-city').fill('Quezon City')
    await page.locator('#checkout-barangay').fill('Bagumbayan')
    await page.locator('#checkout-street').fill('12 Katipunan Avenue')
    await page.locator('#checkout-postal-code').fill('99')

    await page.getByTestId('checkout-review-button').click()

    await expect(page.getByText(/valid Philippine mobile number/i)).toBeVisible()
    await expect(page.getByText(/valid email address/i)).toBeVisible()
    await expect(page.getByText(/4-digit Philippine postal code/i)).toBeVisible()

    // No diagnostic leaks into the shopper's view.
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/VALIDATION_ERROR|422|Prisma|undefined/i)

    // Editing clears that field's error, so progress is visible.
    await page.locator('#checkout-mobile').fill('09171234567')
    await expect(page.getByText(/valid Philippine mobile number/i)).toHaveCount(0)
  })

  test('F5 a valid form produces a review priced by the server', async ({ page, request }) => {
    const all = watchErrors(page)
    await clearCart(page)
    await addListing(page, PHONE.iphone13)

    await openCheckout(page)
    await fillCheckoutDetails(page)
    await page.getByRole('radio', { name: /standard delivery/i }).check()
    await page.getByRole('radio', { name: /cash on delivery/i }).check()

    await page.getByTestId('checkout-review-button').click()

    const review = page.getByTestId('order-review')
    await expect(review).toBeVisible({ timeout: 20_000 })

    // The review reads the buyer's own answers back.
    await expect(review).toContainText('Maria Santos')
    await expect(review).toContainText('09171234567')
    await expect(review).toContainText('Bagumbayan')
    await expect(review).toContainText('Katipunan')
    await expect(review).toContainText('Standard Delivery')
    await expect(review).toContainText('Cash on Delivery')

    // The total is the server's figure and matches the server's arithmetic.
    const quote = await (
      await page.request.post(`${API}/checkout/quote`, {
        data: {
          deliveryMethodId: 'standard',
          paymentMethodId: 'cod',
          details: {
            fullName: 'Maria Santos',
            email: 'maria.santos@example.test',
            mobile: '09171234567',
            region: 'NCR',
            province: 'Quezon City',
            city: 'Quezon City',
            barangay: 'Bagumbayan',
            street: '12 Katipunan Avenue, Tower B, Unit 4B',
            postalCode: '1100',
          },
        },
      })
    ).json()

    const shownTotal = (await page.getByTestId('order-total').innerText()).replace(/\D/g, '')
    const expectedTotal = new Intl.NumberFormat('en-PH')
      .format(quote.quote.total)
      .replace(/\D/g, '')

    expect(shownTotal).toContain(expectedTotal)

    expectNoFatalErrors(all, 'F5-review')
  })

  test('F5 checkout cannot be submitted twice', async ({ page, request }) => {
    await clearCart(page)
    await addListing(page, PHONE.galaxyS21)

    await openCheckout(page)
    await fillCheckoutDetails(page)

    // The submission is held open so the clicks genuinely overlap. Clicking three
    // times in sequence would merely prove the endpoint is fast enough to finish
    // between them, which is not the risk: the risk is one shopper double-tapping
    // while the first request is still in flight.
    let quoteRequests = 0
    let releaseQuote

    const held = new Promise((resolve) => {
      releaseQuote = resolve
    })

    await page.route('**/api/checkout/quote', async (route) => {
      quoteRequests += 1
      await held
      await route.continue()
    })

    const submit = page.getByTestId('checkout-review-button')

    await submit.click()

    // While the first request is outstanding the control must be unusable.
    await expect(submit).toBeDisabled()
    await expect(submit).toContainText(/reviewing your order/i)

    // Two more attempts land on a disabled control and must not be sent.
    await submit.click({ force: true }).catch(() => {})
    await submit.click({ force: true }).catch(() => {})

    releaseQuote()

    await expect(page.getByTestId('order-review')).toBeVisible({ timeout: 20_000 })
    expect(quoteRequests).toBe(1)

    // And only one review is on screen, so the shopper cannot confirm twice.
    await expect(page.getByTestId('order-review')).toHaveCount(1)
    await expect(page.getByTestId('checkout-confirm-button')).toHaveCount(1)
  })

  test('F5 a cart that changed underneath the form is reported in plain language', async ({
    page,
    request,
  }) => {
    await clearCart(page)
    await addListing(page, PHONE.galaxyA54)

    await openCheckout(page)
    await fillCheckoutDetails(page)

    // Empty the cart from another tab while the buyer is filling the form in.
    await page.request.delete(`${API}/cart`)

    await page.getByTestId('checkout-review-button').click()

    // The cart is genuinely empty now, so the page hands the shopper back to a
    // state that explains itself instead of leaving a form for an order that cannot
    // happen.
    const guard = page.getByTestId('checkout-guard')
    await expect(guard).toBeVisible({ timeout: 20_000 })
    await expect(guard).toContainText(/nothing to check out/i)
    await expect(guard).toContainText(/no order to place/i)

    // A way forward, not a dead end.
    await expect(page.getByRole('button', { name: /back to your cart/i })).toBeVisible()

    // No code, status, or internal detail leaks into the shopper's view.
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/CART_EMPTY|\b409\b|Prisma|VALIDATION_ERROR/i)
  })

  test('F5 placing the order creates a real order and empties the cart', async ({
    page,
    request,
  }) => {
    await clearCart(page)
    await addListing(page, PHONE.galaxyS23)

    await openCheckout(page)
    await fillCheckoutDetails(page)
    await page.getByRole('radio', { name: /cash on delivery/i }).check()
    await page.getByTestId('checkout-review-button').click()

    await expect(page.getByTestId('order-review')).toBeVisible({ timeout: 20_000 })

    await page.getByTestId('checkout-confirm-button').click()

    await expect.poll(() => new URL(page.url()).pathname).toBe('/checkout/confirmed')

    // A real order number from the server, not a quote reference.
    const notice = page.getByTestId('order-placed-notice')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText(/order was placed/i)
    const orderNumber = (await notice.innerText()).match(/RF-\d{6}-[0-9A-Z]{6}/)?.[0]
    expect(orderNumber, 'the notice names the order').toBeTruthy()
    await expect(page.getByTestId('confirmation-total')).toContainText('₱')

    // The order is the buyer's, and the cart it came from is now empty.
    const mine = await page.request.get(`${API}/orders/mine`)
    expect(mine.ok()).toBe(true)
    const placed = (await mine.json()).orders.find((order) => order.orderNumber === orderNumber)
    expect(placed?.status).toBe('PLACED')
    const cart = await (await page.request.get(`${API}/cart`)).json()
    expect(cart.cart?.items?.length ?? cart.items?.length ?? 0).toBe(0)

    // Cancelling while still placed puts the phone back on sale, so later tests
    // that use this seeded listing find it available.
    const cancelled = await page.request.patch(`${API}/orders/mine/${orderNumber}/cancel`, {
      data: {},
    })
    expect(cancelled.ok()).toBe(true)
    expect((await cancelled.json()).order.status).toBe('CANCELLED')
  })

  test('F5 the confirmation is unreachable without a quote', async ({ page }) => {
    await page.goto('/checkout/confirmed')
    await page.waitForLoadState('networkidle')

    await expect.poll(() => new URL(page.url()).pathname).toBe('/cart')
  })
})

// ----------------------------------------------------------------- responsive

test.describe('F6 responsive layout', () => {
  for (const width of [375, 390, 430, 768, 1024, 1280, 1440]) {
    test(`F6 the cart has no horizontal overflow at ${width}px`, async ({ page, request }) => {
      await clearCart(page)
      await addListing(page, PHONE.iphone11)
      await openCart(page)

      await page.setViewportSize({ width, height: 900 })

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )

      expect(overflow, `cart must not overflow at ${width}px`).toBeLessThanOrEqual(0)

      await expect(page.getByTestId('cart-item').first()).toBeVisible()
      await expect(page.getByRole('button', { name: /proceed to checkout/i })).toBeVisible()
    })
  }

  for (const width of [375, 768, 1440]) {
    test(`F6 checkout has no horizontal overflow at ${width}px`, async ({ page, request }) => {
      await clearCart(page)
      await addListing(page, PHONE.iphone11)

      await openCheckout(page)
      await page.setViewportSize({ width, height: 1000 })

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )

      expect(overflow, `checkout must not overflow at ${width}px`).toBeLessThanOrEqual(0)
      await expect(page.getByTestId('checkout-review-button')).toBeVisible()
    })
  }

  test('F6 the cart page does not compete with the mobile tab bar', async ({ page, request }) => {
    await clearCart(page)
    await addListing(page, PHONE.galaxyA34)
    await openCart(page)

    await page.setViewportSize({ width: 375, height: 812 })

    // The cart scrolls rather than claiming the bottom edge, so exactly one fixed
    // bottom element owns that strip.
    const fixedBottoms = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((element) => {
          const style = getComputedStyle(element)
          return style.position === 'fixed' && style.bottom === '0px'
        })
        .map((element) => element.getAttribute('aria-label') ?? element.tagName),
    )

    expect(fixedBottoms.length).toBeLessThanOrEqual(1)
  })

  test('F6 the product page action bar stays clear of the mobile tab bar', async ({
    page,
    request,
  }) => {
    await clearCart(page)
    await page.goto(`/listings/${PHONE.iphone13}`)
    await page.waitForLoadState('networkidle')
    await visibleAddToCart(page).waitFor({ timeout: 20_000 })

    await page.setViewportSize({ width: 375, height: 812 })

    const fixedBottoms = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((element) => {
          const style = getComputedStyle(element)
          return style.position === 'fixed' && style.bottom === '0px'
        })
        .map((element) => element.getAttribute('aria-label') ?? element.tagName),
    )

    // The product page's own action bar replaces the tab bar, so still exactly one.
    expect(fixedBottoms.length).toBeLessThanOrEqual(1)
    await expect(visibleAddToCart(page)).toBeVisible()
  })
})

// ---------------------------------------------------------------- navigation

test.describe('F7 navigation', () => {
  test('F7 product to cart to checkout needs no page reload', async ({ page, request }) => {
    const all = watchErrors(page)
    await clearCart(page)

    await addListing(page, PHONE.galaxyS8)

    await visibleAddToCart(page).click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/cart')

    await page.getByRole('button', { name: /proceed to checkout/i }).click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/checkout')

    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible()

    expectNoFatalErrors(all, 'F7-flow')
  })

  test('F7 the header badge reflects an empty cart honestly', async ({ page, request }) => {
    await clearCart(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('navbar-cart')).toHaveAttribute('aria-label', /cart, 0 items/i)
  })
})
