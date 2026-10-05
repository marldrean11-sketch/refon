import { test, expect } from '@playwright/test'
import { watchErrors, expectNoFatalErrors, authCookie } from './support.js'
import { LISTINGS } from './constants.js'

/**
 * Product detail verification.
 *
 * Every assertion here is written against the live API response rather than
 * against a literal copied into the page, so a test cannot pass while the page
 * shows a stale or fabricated value. Anything the API does not record is asserted
 * as absent, which is the property that matters most on a marketplace page.
 *
 * Price assertions are scoped to the listing's own price block. The related-phones
 * rail below the fold contains other devices with real discounts, so a
 * page-wide match would pick up a neighbour's saving and prove nothing about this
 * phone.
 */

const API = 'http://localhost:4000/api'
const PRODUCT = '/phones/apple-iphone-13-128-gb-midnight'

async function listingFixture(request) {
  const response = await request.get(`${API}/listings/slug/apple-iphone-13-128-gb-midnight`)
  expect(response.status(), 'fixture lookup').toBe(200)
  const body = await response.json()
  return body.listing
}

/** The buyer's purchase panel: price, discount claim, warranty, and actions. */
function purchasePanel(page) {
  return page.locator('div.border-y.border-line.py-6').first()
}

/**
 * Brand marker for listings this spec creates.
 *
 * `globalSetup` deletes every listing carrying this brand before each run, which is
 * how fixtures are cleaned up. Approved listings cannot be deleted through the API,
 * so the reset is the only route that removes them.
 */
const FIXTURE_BRAND = 'ReFon'

/** Creates and approves a throwaway listing for a negative-path test. */
async function createApprovedListing(request, overrides = {}) {
  const sellerCookie = authCookie('seller')
  const adminCookie = authCookie('admin')

  const created = await request.post(`${API}/listings`, {
    headers: { Cookie: sellerCookie },
    data: {
      brand: FIXTURE_BRAND,
      model: 'Test Fixture Phone',
      year: 2021,
      price: 7000,
      batteryPercent: 86,
      storage: '128 GB',
      condition: 'Good',
      conditionGrade: 'B',
      conditionNotes: 'Clean device with light cosmetic wear and no other issues.',
      photos: ['/uploads/seed/phone-front.svg'],
      ...overrides,
    },
  })
  expect(created.status(), 'fixture listing created').toBe(201)
  const listing = (await created.json()).listing

  const approved = await request.patch(`${API}/admin/listings/${listing.id}/approve`, {
    headers: { Cookie: adminCookie },
  })
  expect(approved.status(), 'fixture listing approved').toBe(200)

  return listing
}

/**
 * Removes a throwaway fixture listing.
 *
 * Deliberately not implemented. An APPROVED listing is locked against deletion by
 * design — only pending or rejected work can be removed, so a live listing cannot
 * vanish from under a buyer — and there is no admin route to unlock one either.
 * An earlier version of this spec attempted the delete per test, the request was
 * refused with `LISTING_LOCKED` every time, and three APPROVED fixtures leaked on
 * every run until the inflated catalog broke an unrelated assertion.
 *
 * Fixture listings are instead removed by the Playwright `globalSetup` reset, which
 * already exists to restore the database baseline before each run. One mechanism,
 * at a known point in the lifecycle.
 */

test.describe('D1 product loads by slug and by legacy id', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('D1 loads the product by canonical slug', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(700)

    await expect(page.locator('h1')).toHaveText('iPhone 13')
    expect(page.url()).toContain('/phones/apple-iphone-13-128-gb-midnight')

    await page.screenshot({ path: 'screenshots/D1-product-slug.png' })
    expectNoFatalErrors(all, 'D1-slug')
  })

  test('D2 the legacy id URL resolves the same listing and replaces the address', async ({
    page,
  }) => {
    const all = watchErrors(page)
    await page.goto(`/listings/${LISTINGS.iphone13}`)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(1200)

    console.log('D2_URL', page.url())
    expect(page.url(), 'legacy URL is replaced by the canonical slug').toContain('/phones/')
    await expect(page.locator('h1')).toHaveText('iPhone 13')

    expectNoFatalErrors(all, 'D2-legacy')
  })
})

test.describe('D3 displayed values match the API', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('D3 model, price, battery, grade, and warranty match the API exactly', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)
    const listing = await listingFixture(request)

    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(700)

    const body = await page.locator('main').innerText()
    const peso = (value) =>
      `₱${Number(value).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`

    await expect(page.locator('h1')).toHaveText(listing.model)
    expect(body, 'brand is shown').toContain(listing.brand)
    expect(body, 'storage is shown').toContain(listing.storage)
    expect(body, 'selling price matches the API').toContain(peso(listing.price))
    expect(body, 'battery percentage matches the API').toContain(`${listing.batteryPercent}%`)
    expect(body, 'grade matches the API').toContain(`Grade ${listing.grade}`)
    expect(body, 'grade label matches the API').toContain(listing.gradeLabel)

    console.log(
      'D3_VALUES',
      listing.model,
      listing.price,
      listing.batteryPercent,
      listing.grade,
      listing.warrantyMonths,
    )

    // Warranty chips are uppercased by CSS, so innerText is uppercased too.
    expect(body, 'warranty term matches the API').toContain(
      (
        listing.warrantyMonths >= 12
          ? `${listing.warrantyMonths / 12}-Year Warranty`
          : `${listing.warrantyMonths}-Month Warranty`
      ).toUpperCase(),
    )

    // Storage and RAM must not be swapped or dropped.
    if (listing.ram) {
      expect(body, 'RAM is shown').toContain(listing.ram)
    }

    expectNoFatalErrors(all, 'D3-values')
  })

  test('D4 a discount is only shown when the reference price is genuinely higher', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)
    const listing = await listingFixture(request)

    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(700)

    const panelText = await purchasePanel(page).innerText()

    expect(listing.originalPrice, 'fixture has a genuine reference price').toBeGreaterThan(
      listing.price,
    )
    expect(listing.discountPercent, 'API reports a real saving').toBeGreaterThan(0)

    expect(panelText, 'the reference price is shown struck through').toContain(
      `₱${Number(listing.originalPrice).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`,
    )
    expect(panelText, 'the saving is stated').toMatch(/you save/i)
    expect(panelText, 'the percentage matches the API').toMatch(
      new RegExp(`save\\s*${listing.discountPercent}%`, 'i'),
    )

    // A negative or zero saving must never be rendered.
    expect(panelText).not.toMatch(/save\s*0%/i)
    expect(panelText).not.toMatch(/save\s*-\d/i)

    expectNoFatalErrors(all, 'D4-discount')
  })

  test('D5 a listing with no reference price claims no saving', async ({ page, request }) => {
    const all = watchErrors(page)

    const listing = await createApprovedListing(request, {
      model: 'No Reference Phone',
      price: 5000,
    })

    expect(listing.originalPrice, 'no reference price is stored').toBeNull()
    expect(listing.discountPercent, 'API reports no saving').toBeNull()
    expect(listing.savings, 'API reports no saving amount').toBeNull()

    await page.goto(`/phones/${listing.slug}`)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(700)

    const panelText = await purchasePanel(page).innerText()
    console.log('D5_NO_SAVING', listing.discountPercent, listing.originalPrice)

    expect(panelText, 'the honest fallback is shown').toMatch(/no original price recorded/i)
    expect(panelText, 'no saving is claimed for this device').not.toMatch(/you save/i)
    expect(panelText, 'no percentage badge is rendered').not.toMatch(/save\s*\d+%/i)

    expectNoFatalErrors(all, 'D5-no-saving')

  })
})

test.describe('D6 inspection and device verification', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('D6 all 11 checks are listed and the recorded count is stated', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)
    const listing = await listingFixture(request)

    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(700)

    expect(listing.inspectionTotal, 'the taxonomy has 11 checks').toBe(11)

    const panel = page.getByRole('region', { name: /11-point quality inspection/i })
    const panelText = await panel.innerText()

    for (const label of [
      'Display tested',
      'Touchscreen tested',
      'Camera tested',
      'Speaker tested',
      'Microphone tested',
      'Charging port tested',
      'Battery tested',
      'Wi-Fi tested',
      'Bluetooth tested',
      'Buttons tested',
      'Face ID / Fingerprint tested',
    ]) {
      expect(panelText, `${label} is listed`).toContain(label)
    }

    expect(
      panelText,
      'the recorded count matches the API, not a hard-coded 11',
    ).toContain(`${listing.inspectionChecks.length} of 11 checks recorded`)

    expectNoFatalErrors(all, 'D6-inspection')
  })

  test('D7 an unrecorded inspection is never presented as passed', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)

    // inspectionChecks deliberately omitted: this device has no recorded results.
    const listing = await createApprovedListing(request, {
      model: 'Uninspected Phone',
      conditionGrade: 'C',
      conditionNotes: 'Device sold as-is with no inspection results recorded.',
    })

    expect(listing.inspectionRecorded, 'API reports no inspection record').toBe(false)
    expect(listing.inspectionChecks, 'no checks are stored').toHaveLength(0)

    await page.goto(`/phones/${listing.slug}`)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(700)

    const body = await page.locator('main').innerText()
    const panelText = await page
      .getByRole('region', { name: /11-point quality inspection/i })
      .innerText()

    console.log('D7_UNINSPECTED', listing.inspectionRecorded, listing.inspectionChecks.length)

    expect(panelText, 'the panel says nothing was recorded').toMatch(/not recorded/i)
    expect(panelText, 'no passing claim is made').not.toMatch(/full inspection/i)
    expect(panelText, 'the recorded count is not invented').not.toMatch(/\d+ of 11/)
    expect(body, 'the trust summary reflects it too').toMatch(/not recorded/i)

    expectNoFatalErrors(all, 'D7-uninspected')

  })

  test('D8 IMEI shows only the last four digits, or says it was not verified', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)
    const listing = await listingFixture(request)

    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(700)

    const body = await page.locator('main').innerText()

    expect(listing.imeiVerified, 'fixture is IMEI verified').toBe(true)
    expect(body).toMatch(/IMEI verified/i)
    expect(body, 'only the suffix is shown').toContain(`···${listing.imeiLast4}`)

    // A full IMEI is 15 digits. Anything that long must never appear in the page
    // or the API payload. The threshold is 13 so that UUID segments — the longest
    // run in a listing id is 12 — do not produce a false positive.
    const longDigitRuns = body.match(/\b\d{13,}\b/g)
    console.log('D8_LONG_DIGIT_RUNS', JSON.stringify(longDigitRuns))
    expect(longDigitRuns ?? [], 'no full IMEI is rendered').toEqual([])

    expect(
      JSON.stringify(listing),
      'the API never returns a full IMEI',
    ).not.toMatch(/\b\d{13,}\b/)

    // The stored suffix is four digits and nothing more.
    expect(String(listing.imeiLast4)).toMatch(/^\d{4}$/)

    expectNoFatalErrors(all, 'D8-imei')
  })
})

test.describe('D9 seller information', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('D9 seller card shows real data and never leaks contact details', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)
    const listing = await listingFixture(request)
    const seller = listing.seller

    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(700)

    const body = await page.locator('main').innerText()

    expect(body, 'seller name is shown').toContain(listing.sellerName)
    expect(body, 'verified status is shown').toMatch(/verified marketplace seller/i)

    if (seller.ratingCount > 0) {
      expect(body, 'seller rating average is shown').toContain(
        seller.ratingAverage.toFixed(1),
      )
    } else {
      expect(body, 'a seller with no reviews says so').toMatch(/no seller reviews yet/i)
    }

    const location = [seller.city, seller.region].filter(Boolean).join(', ')
    if (location) {
      expect(body, 'seller location is shown').toContain(location)
    }

    if (seller.tagline) {
      expect(body, 'seller tagline is shown').toContain(seller.tagline)
    }

    // Contact details must never reach the page.
    const apiText = JSON.stringify(listing)
    expect(apiText, 'API omits contactInfo').not.toContain('contactInfo')
    expect(body, 'page shows no seller phone number').not.toMatch(/\+63[\s\d]{8,}/)
    expect(body, 'page shows no seller email address').not.toMatch(
      /[\w.+-]+@[\w-]+\.[\w.]+/,
    )

    expectNoFatalErrors(all, 'D9-seller')
  })

  test('D10 the storefront link resolves rather than dead-ending', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(700)

    const link = page.getByRole('link', { name: /View seller storefront/i }).first()
    await expect(link, 'storefront link exists').toBeVisible()

    await link.click()
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(600)

    expect(page.url(), 'storefront route is reached').toContain('/sellers/')
    console.log('D10_STOREFRONT', page.url())

    expectNoFatalErrors(all, 'D10-storefront')
  })
})

test.describe('D11 reviews', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('D11 published reviews, count, and rating match the API', async ({ page, request }) => {
    const all = watchErrors(page)

    const fixture = await listingFixture(request)
    const reviewsResponse = await request.get(`${API}/listings/${fixture.id}/reviews`)
    expect(reviewsResponse.status(), 'reviews endpoint is public').toBe(200)
    const { reviews, summary } = await reviewsResponse.json()

    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(900)

    const body = await page.locator('main').innerText()

    console.log('D11_REVIEWS', summary.count, summary.average, reviews.length)

    expect(summary.count, 'summary count matches the review list').toBe(reviews.length)
    expect(
      summary.average,
      'the listing aggregate matches the review endpoint',
    ).toBe(fixture.ratingAverage)
    expect(
      fixture.ratingCount,
      'the listing review count matches the review endpoint',
    ).toBe(summary.count)

    for (const review of reviews) {
      const article = page
        .locator('article')
        .filter({ hasText: review.title ?? review.comment.slice(0, 30) })
        .first()

      expect(await article.count(), `review "${review.title}" is listed`).toBeGreaterThan(0)

      // The badge follows the stored flag exactly. A positive review with
      // verifiedPurchase false must not acquire the badge.
      const badges = await article.getByText(/Verified purchase/i).count()
      expect(
        badges,
        `"${review.title}" badge count matches verifiedPurchase=${review.verifiedPurchase}`,
      ).toBe(review.verifiedPurchase ? 1 : 0)
    }

    console.log(
      'D11_REVIEW_BADGES',
      reviews.filter((review) => review.verifiedPurchase).length,
      'verified of',
      reviews.length,
    )

    // No submission path exists in Phase 4.
    expect(
      await page.getByRole('button', { name: /write a review|add a review|submit review/i }).count(),
      'no review submission control is offered',
    ).toBe(0)

    expectNoFatalErrors(all, 'D11-reviews')
  })

  test('D12 a listing with no reviews says so instead of inventing social proof', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)

    const listing = await createApprovedListing(request, {
      model: 'Unreviewed Phone',
      price: 9000,
      conditionNotes: 'Clean device with light frame wear, no reviews yet.',
    })

    await page.goto(`/phones/${listing.slug}`)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(800)

    // `section` + `has` also matches every ancestor section that contains the
    // heading, so the labelled region is addressed directly instead.
    const reviewsSection = page.getByRole('region', { name: 'Reviews', exact: true })
    const reviewsText = await reviewsSection.innerText()
    console.log('D12_RATING', listing.ratingAverage, listing.ratingCount)

    expect(listing.ratingAverage, 'no reviews means a null average').toBeNull()
    expect(listing.ratingCount, 'no reviews means a zero count').toBe(0)
    expect(reviewsText, 'the empty state is explicit').toMatch(/no reviews yet/i)
    expect(reviewsText, 'no 0.0 score is rendered').not.toMatch(/\b0\.0\b/)

    // No review entries exist at all, so no verified-purchase badge can appear.
    // The section's own disclaimer legitimately mentions the phrase, so the
    // assertion targets rendered review items rather than the whole region.
    expect(
      await reviewsSection.locator('article').count(),
      'no review entries are rendered',
    ).toBe(0)
    expect(
      await reviewsSection.locator('li').count(),
      'no review rows are rendered',
    ).toBe(0)

    expectNoFatalErrors(all, 'D12-no-reviews')

  })
})

test.describe('D13 gallery, wishlist, and related products', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('D13 gallery has views, a selected state, and a working lightbox', async ({ page }) => {
    const all = watchErrors(page)

    const failed = []
    page.on('response', (response) => {
      if (response.request().resourceType() === 'image' && response.status() >= 400) {
        failed.push(`${response.status()} ${response.url()}`)
      }
    })

    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(900)

    const region = page.getByRole('region', { name: /gallery, showing/i })
    await expect(region, 'the gallery is a labelled region').toBeVisible()

    const thumbs = page.getByRole('group', { name: 'Choose a gallery view' }).getByRole('button')
    const thumbCount = await thumbs.count()
    console.log('D13_THUMBS', thumbCount)
    expect(thumbCount, 'multiple views are offered').toBeGreaterThan(1)

    // Selection is conveyed with aria-current, since the button's accessible name
    // is the view it switches to rather than its current state.
    const selectedCount = async () =>
      page
        .getByRole('group', { name: 'Choose a gallery view' })
        .locator('button[aria-current="true"]')
        .count()

    expect(await selectedCount(), 'exactly one thumbnail is marked selected').toBe(1)

    // Selecting a different view moves the selection.
    await thumbs.nth(1).click()
    await page.waitForTimeout(500)
    expect(await selectedCount(), 'still exactly one thumbnail is selected').toBe(1)
    expect(
      await thumbs.nth(1).getAttribute('aria-current'),
      'the newly clicked thumbnail is the selected one',
    ).toBe('true')

    // Lightbox opens and closes.
    const zoom = page.getByRole('button', { name: /Expand .* to full screen/i })
    await expect(zoom).toBeVisible()
    await zoom.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog, 'lightbox opens as a modal dialog').toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'screenshots/D13-lightbox.png' })

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog'), 'Escape closes the lightbox').toHaveCount(0)

    console.log('D13_FAILED_IMAGES', JSON.stringify(failed))
    expect(failed, 'no failed image requests').toEqual([])

    expectNoFatalErrors(all, 'D13-gallery')
  })

  test('D14 keyboard navigation moves through the gallery', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(800)

    const region = page.getByRole('region', { name: /gallery, showing/i })
    const before = await region.getAttribute('aria-label')

    await region.focus()
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(600)
    const after = await region.getAttribute('aria-label')

    console.log('D14_KEYBOARD', before, '->', after)
    expect(after, 'arrow keys page the gallery').not.toBe(before)
    expect(after).toMatch(/showing (photo|Front|Back|Screen|Angled)/i)

    expectNoFatalErrors(all, 'D14-keyboard')
  })

  test('D15 an anonymous wishlist click routes to sign-in, then works', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(700)

    const wishlist = page.getByRole('button', { name: /^Save /i }).first()
    await expect(wishlist, 'a wishlist control is present').toBeVisible()

    await wishlist.click()
    await page.waitForTimeout(1200)
    expect(new URL(page.url()).pathname, 'anonymous click goes to login').toBe('/login')

    expectNoFatalErrors(all, 'D15-wishlist-anon')
  })

  test('D16 related listings are real and never include this phone', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)
    const listing = await listingFixture(request)

    const related = await request.get(`${API}/listings/${listing.id}/related`)
    expect(related.status()).toBe(200)
    const relatedBody = await related.json()

    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(1400)

    const rail = await page.locator('h2', { hasText: /Similar phones/i }).count()
    expect(rail, 'the related rail renders a heading').toBe(1)

    const hrefs = await page
      .locator('section', { has: page.getByRole('heading', { name: /Similar phones/i }) })
      .locator('article a[href^="/phones/"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')))

    console.log('D16_RELATED', JSON.stringify(hrefs), 'api', relatedBody.listings.length)

    expect(hrefs.length, 'related phones render').toBeGreaterThan(0)
    expect(
      hrefs,
      'a listing is never related to itself',
    ).not.toContain(`/phones/${listing.slug}`)

    // Every related card must be a real listing that resolves.
    for (const href of hrefs.slice(0, 4)) {
      const slug = href.replace('/phones/', '')
      const check = await request.get(`${API}/listings/slug/${slug}`)
      expect(check.status(), `${slug} is a real listing`).toBe(200)
    }

    expectNoFatalErrors(all, 'D16-related')
  })
})

test.describe('D17 pricing honesty and page structure', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('D17 no fake commerce: no working checkout, no order claims', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(800)

    const body = await page.locator('main').innerText()

    // Nothing may claim an order exists.
    expect(body).not.toMatch(/order (placed|confirmed|complete)/i)
    expect(body).not.toMatch(/payment (successful|confirmed|received)/i)
    expect(body).not.toMatch(/thank you for your (order|purchase)/i)
    expect(body).not.toMatch(/you will receive your phone/i)

    // No live checkout control exists in this phase.
    expect(
      await page.getByRole('button', { name: /buy now|checkout|place order|pay now/i }).count(),
      'no purchase-completing control is rendered',
    ).toBe(0)

    // Cart is named as unavailable rather than presented as working.
    const cartSlot = page.getByText(/cart\s*&\s*checkout/i).first()
    await expect(cartSlot, 'the unavailable cart slot is labelled').toBeVisible()

    expectNoFatalErrors(all, 'D17-no-fake-commerce')
  })

  test('D18 grading explainer describes the whole scale and marks this phone', async ({
    page,
    request,
  }) => {
    const all = watchErrors(page)
    const listing = await listingFixture(request)

    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(700)

    const body = await page.locator('main').innerText()
    expect(body, `this phone is Grade ${listing.grade}`).toContain(
      `This phone is Grade ${listing.grade}`,
    )

    const toggle = page.getByRole('button', { name: /What do grades A, B, and C mean/i })
    await expect(toggle, 'the scale explainer is collapsed by default').toHaveAttribute(
      'aria-expanded',
      'false',
    )

    await toggle.click()
    await page.waitForTimeout(400)

    const scale = page.locator('#grade-scale')
    await expect(scale, 'the scale becomes visible').toBeVisible()
    const scaleText = await scale.innerText()

    // Each tier is named by its letter and its label rather than the string
    // "Grade A", which the markup splits across two elements.
    for (const [grade, label] of [
      ['A', 'Excellent'],
      ['B', 'Very Good'],
      ['C', 'Good'],
    ]) {
      expect(scaleText, `grade ${grade} is described`).toContain(label)
    }

    // The chip is uppercased by CSS, so innerText is uppercased too.
    expect(scaleText, 'this phone is marked in the scale').toMatch(/this phone/i)

    // Grading covers cosmetics only; the checklist covers function.
    expect(scaleText).toMatch(/cosmetics only/i)

    expectNoFatalErrors(all, 'D18-grading')
  })

  test('D19 exactly one H1 and a logical heading order', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(900)

    const headings = await page.evaluate(() =>
      [...document.querySelectorAll('h1,h2,h3,h4')].map((node) => ({
        level: Number(node.tagName.slice(1)),
        text: node.textContent.trim().slice(0, 60),
      })),
    )

    const h1s = headings.filter((entry) => entry.level === 1)
    console.log('D19_H1_COUNT', h1s.length, h1s.map((entry) => entry.text).join(' | '))
    expect(h1s.length, 'exactly one h1').toBe(1)
    expect(h1s[0].text, 'the h1 is the product model').toContain('iPhone 13')

    // No level is skipped going down.
    for (let index = 1; index < headings.length; index += 1) {
      expect(
        headings[index].level - headings[index - 1].level,
        `heading jump before "${headings[index].text}"`,
      ).toBeLessThanOrEqual(1)
    }

    expectNoFatalErrors(all, 'D19-headings')
  })

  test('D20 metadata is per-product with a canonical URL', async ({ page, request }) => {
    const all = watchErrors(page)
    const listing = await listingFixture(request)

    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(1100)

    const title = await page.title()
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')

    console.log('D20_TITLE', title)
    expect(title, 'the title names this product').toContain(listing.model)
    expect(title, 'the title carries the grade').toContain(`Grade ${listing.grade}`)
    expect(description, 'the description names the product').toContain(listing.model)
    expect(description, 'the description states battery health').toContain(
      `${listing.batteryPercent}%`,
    )
    expect(canonical, 'canonical is the slug URL').toBe(
      `https://refon.ph/phones/${listing.slug}`,
    )

    // Structured data must describe the real product.
    const raw = await page.locator('script[data-refon-jsonld]').textContent()
    expect(raw, 'a Product schema is present').toBeTruthy()
    const jsonLd = JSON.parse(raw)

    expect(jsonLd['@type']).toBe('Product')
    expect(jsonLd.name).toContain(listing.model)
    expect(Number(jsonLd.offers.price)).toBe(Number(listing.price))
    expect(jsonLd.offers.priceCurrency).toBe('PHP')
    expect(jsonLd.offers.availability).toBe('https://schema.org/InStock')

    if (listing.ratingAverage != null && listing.ratingCount > 0) {
      expect(jsonLd.aggregateRating.reviewCount, 'aggregateRating is real').toBe(
        listing.ratingCount,
      )
    } else {
      expect(jsonLd.aggregateRating, 'no reviews means no aggregateRating').toBeUndefined()
    }

    // Leaving the page must not leave Product schema behind.
    await page.goto('/phones')
    await page.waitForSelector('article', { timeout: 25_000 })
    await page.waitForTimeout(700)
    expect(
      await page.locator('script[data-refon-jsonld]').count(),
      'JSON-LD is removed off the product page',
    ).toBe(0)

    expectNoFatalErrors(all, 'D20-metadata')
  })
})

test.describe('D21 responsive product page', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const viewport of [
    { name: 'mobile 375x812', width: 375, height: 812 },
    { name: 'tablet 768x1024', width: 768, height: 1024 },
    { name: 'desktop 1440x900', width: 1440, height: 900 },
  ]) {
    test(`D21 ${viewport.name}: no overflow, actions reachable, no duplicate ids`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(PRODUCT)
      await page.waitForSelector('h1', { timeout: 25_000 })
      await page.waitForTimeout(1000)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      console.log('D21_OVERFLOW', viewport.name, overflow)
      expect(overflow, `${viewport.name} has no horizontal scroll`).toBeLessThanOrEqual(0)

      const duplicates = await page.evaluate(() => {
        const seen = new Map()
        for (const node of document.querySelectorAll('[id]')) {
          seen.set(node.id, (seen.get(node.id) ?? 0) + 1)
        }
        return [...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id)
      })
      console.log('D21_DUPLICATE_IDS', JSON.stringify(duplicates))
      expect(duplicates, 'no duplicate element ids').toEqual([])

      // A purchase action is reachable at every width.
      const inquire = page
        .getByRole('button', { name: /^Inquire( about this phone)?$/i })
        .first()
      await expect(inquire, 'the primary action is reachable').toBeVisible()

      // On mobile the sticky bar must not sit on top of the last content row.
      if (viewport.width < 1024) {
        const tabBar = await page
          .getByRole('navigation', { name: 'Quick navigation' })
          .count()
        expect(tabBar, 'the tab bar yields to the product action bar').toBe(0)

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(600)

        const footerLastLine = page.getByText(/Thoughtful moderation/i).first()
        if ((await footerLastLine.count()) > 0) {
          const box = await footerLastLine.boundingBox()
          expect(
            box.y + box.height,
            'the footer clears the sticky bar',
          ).toBeLessThanOrEqual(viewport.height)
        }
      }

      await page.screenshot({ path: `screenshots/D21-product-${viewport.width}.png` })
    })
  }

  test('D22 internal product links resolve', async ({ page }) => {
    const all = watchErrors(page)
    await page.goto(PRODUCT)
    await page.waitForSelector('h1', { timeout: 25_000 })
    await page.waitForTimeout(1200)

    const hrefs = await page
      .locator('main a[href^="/"]')
      .evaluateAll((nodes) =>
        [...new Set(nodes.map((node) => node.getAttribute('href')).filter(Boolean))],
      )

    console.log('D22_LINKS', hrefs.length)
    expect(hrefs.length, 'the page has internal links').toBeGreaterThan(2)

    for (const href of hrefs) {
      // Hash links stay on the page; everything else must resolve.
      if (href.startsWith('#')) {
        continue
      }

      const response = await page.request.get(`http://localhost:5173${href}`)
      expect(
        response.status(),
        `${href} resolves (SPA routes return the shell, so anything else is a dead link)`,
      ).toBeLessThan(400)
    }

    expectNoFatalErrors(all, 'D22-links')
  })
})